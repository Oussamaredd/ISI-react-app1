import { randomUUID } from 'node:crypto';

import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gte, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm';
import {
  alertEvents,
  anomalyReports,
  auditLogs,
  collectionDomainEvents,
  collectionDomainSnapshots,
  collectionEvents,
  containers,
  type DatabaseClient,
  eventConnectorExports,
  measurementRollups10m,
  measurements,
  notificationDeliveries,
  notifications,
  type ReportExport,
  reportExports,
  roles,
  sensorDevices,
  tourStops,
  tours,
  userRoles,
  users,
  zones,
} from 'ecotrack-database';

import { DRIZZLE } from '../../database/database.constants.js';
import {
  COLLECTIONS_COMMAND_SERVICE_PRODUCER,
  COLLECTIONS_TOUR_SCHEDULED_EVENT,
  INTERNAL_EVENT_SCHEMA_VERSION_V1,
} from '../events/internal-events.catalog.js';

import type { CreatePlannedTourDto } from './dto/create-planned-tour.dto.js';
import type { GenerateReportDto } from './dto/generate-report.dto.js';
import type { OptimizeTourDto } from './dto/optimize-tour.dto.js';
import type { TriggerEmergencyCollectionDto } from './dto/trigger-emergency-collection.dto.js';
import { createReportArtifact } from './report-artifact.utils.js';
import {
  deliverReportByEmail,
  REPORT_STATUS_EMAIL_DELIVERED,
  REPORT_STATUS_EMAIL_DELIVERY_FAILED,
  REPORT_STATUS_GENERATED,
} from './report-delivery.utils.js';

type LatLngPoint = { id: string; latitude: number | null; longitude: number | null };
type ZoneDepotPoint = LatLngPoint & { label: string };

const EARTH_RADIUS_KM = 6371;
const REPORT_KPI_ALLOWLIST = new Set(['tours', 'collections', 'anomalies']);
const MAX_2OPT_PASSES = 20;
const SCHEDULE_CONFLICT_WINDOW_MINUTES = 120;
const TERMINAL_TOUR_STATUSES = new Set(['completed', 'closed', 'cancelled']);
const AVERAGE_ROUTE_SPEED_KMH = 24;
const STOP_SERVICE_DURATION_MINUTES = 4;
const HEATMAP_LOOKBACK_HOURS = 48;

type HeatmapFilters = {
  zoneId?: string | null;
  riskTier?: 'all' | 'low' | 'medium' | 'high';
};

type HeatmapContainerSignal = {
  containerId: string;
  code: string;
  label: string;
  zoneId: string | null;
  zoneName: string | null;
  latitude: number;
  longitude: number;
  fillLevelPercent: number;
  fillLevelDeltaPercent: number;
  sensorHealthScore: number;
  riskScore: number;
  riskTier: 'low' | 'medium' | 'high';
  latestWindowEnd: string | null;
  status: string;
};

const toNumberOrNull = (value: unknown) => {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toIsoTimestampOrNull = (value: unknown) => {
  if (value == null) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  return null;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeRiskTier = (value: number): HeatmapContainerSignal['riskTier'] => {
  if (value >= 75) {
    return 'high';
  }

  if (value >= 50) {
    return 'medium';
  }

  return 'low';
};

const computeRiskScore = (input: {
  fillLevelPercent: number;
  fillLevelDeltaPercent: number;
  sensorHealthScore: number;
  status: string;
}) => {
  const fillLevel = clamp(input.fillLevelPercent, 0, 100);
  const deltaBoost = clamp(Math.max(0, input.fillLevelDeltaPercent) * 1.5, 0, 15);
  const healthPenalty = input.sensorHealthScore >= 60
    ? 0
    : clamp(Math.round((60 - input.sensorHealthScore) / 2), 0, 15);
  const statusBoost = input.status.trim().toLowerCase() === 'attention_required' ? 10 : 0;

  return clamp(Math.round(fillLevel + deltaBoost + healthPenalty + statusBoost), 0, 100);
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const haversineDistanceKm = (from: LatLngPoint, to: LatLngPoint) => {
  if (
    from.latitude == null ||
    from.longitude == null ||
    to.latitude == null ||
    to.longitude == null
  ) {
    return 0;
  }

  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
};

@Injectable()
export class PlanningRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async listZones() {
    return this.db.select().from(zones).orderBy(zones.name);
  }

  async listAgents() {
    const [agentRole] = await this.db.select().from(roles).where(eq(roles.name, 'agent')).limit(1);

    if (!agentRole) {
      return [];
    }

    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        isActive: users.isActive,
        zoneId: users.zoneId,
        zoneName: zones.name,
        zoneCode: zones.code,
      })
      .from(users)
      .leftJoin(userRoles, eq(userRoles.userId, users.id))
      .leftJoin(zones, eq(users.zoneId, zones.id))
      .where(and(eq(userRoles.roleId, agentRole.id), eq(users.isActive, true)));

    return rows;
  }

  async optimizeTour(dto: OptimizeTourDto) {
    const zoneDepot = await this.getZoneDepot(dto.zoneId);
    const allCandidates = await this.db
      .select({
        id: containers.id,
        code: containers.code,
        label: containers.label,
        fillLevelPercent: containers.fillLevelPercent,
        status: containers.status,
        latitude: containers.latitude,
        longitude: containers.longitude,
        zoneId: containers.zoneId,
      })
      .from(containers)
      .where(and(eq(containers.zoneId, dto.zoneId), gte(containers.fillLevelPercent, dto.fillThresholdPercent)));

    if (allCandidates.length === 0) {
      return {
        candidates: [],
        route: [],
        metrics: {
          totalDistanceKm: 0,
          estimatedDurationMinutes: 0,
        },
      };
    }

    const manualIds = new Set(dto.manualContainerIds ?? []);
    const scheduledFor = new Date(dto.scheduledFor);
    const blockedContainerIds = await this.getBlockedContainerIdsForSchedule(dto.zoneId, scheduledFor);
    const deferredForNearbyTours = allCandidates.filter(
      (item) => blockedContainerIds.has(item.id) && !manualIds.has(item.id),
    ).length;
    const eligibleCandidates = allCandidates.filter(
      (item) => !blockedContainerIds.has(item.id) || manualIds.has(item.id),
    );
    const selectedCandidates =
      manualIds.size > 0
        ? eligibleCandidates.filter((item) => manualIds.has(item.id))
        : [...eligibleCandidates].sort((left, right) => right.fillLevelPercent - left.fillLevelPercent);

    const heuristicRoute = this.computeHeuristicRoute(selectedCandidates, zoneDepot);
    const route = this.refineRouteWithTwoOpt(heuristicRoute, zoneDepot);
    const totalDistanceKm = this.computeRouteDistance(route, zoneDepot);

    return {
      candidates: selectedCandidates,
      route: route.map((item, index) => ({
        ...item,
        order: index + 1,
      })),
      metrics: {
        totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
        estimatedDurationMinutes: this.estimateRouteDurationMinutes(totalDistanceKm, route.length),
        deferredForNearbyTours,
      },
      scheduleContext: {
        scheduledFor: scheduledFor.toISOString(),
        conflictWindowMinutes: SCHEDULE_CONFLICT_WINDOW_MINUTES,
      },
      startLocation: zoneDepot
        ? {
            id: zoneDepot.id,
            label: zoneDepot.label,
            latitude: zoneDepot.latitude,
            longitude: zoneDepot.longitude,
          }
        : null,
    };
  }

  async createPlannedTour(dto: CreatePlannedTourDto, actorUserId: string) {
    return this.db.transaction(async (tx) => {
      const zoneDepot = await this.getZoneDepot(dto.zoneId, tx);
      const uniqueOrderedContainerIds = Array.from(new Set(dto.orderedContainerIds));
      if (uniqueOrderedContainerIds.length !== dto.orderedContainerIds.length) {
        throw new BadRequestException('orderedContainerIds must not contain duplicate container IDs');
      }

      const selectedContainers = await tx
        .select({
          id: containers.id,
          zoneId: containers.zoneId,
          latitude: containers.latitude,
          longitude: containers.longitude,
        })
        .from(containers)
        .where(inArray(containers.id, uniqueOrderedContainerIds));

      if (selectedContainers.length !== uniqueOrderedContainerIds.length) {
        throw new BadRequestException('One or more orderedContainerIds were not found');
      }

      const hasCrossZoneContainer = selectedContainers.some((container) => container.zoneId !== dto.zoneId);
      if (hasCrossZoneContainer) {
        throw new BadRequestException('All orderedContainerIds must belong to the selected zone');
      }

      if (dto.assignedAgentId) {
        const [assignedAgent] = await tx
          .select({
            id: users.id,
            zoneId: users.zoneId,
          })
          .from(users)
          .where(eq(users.id, dto.assignedAgentId))
          .limit(1);

        if (!assignedAgent) {
          throw new BadRequestException('Assigned agent was not found');
        }

        if (!assignedAgent.zoneId || assignedAgent.zoneId !== dto.zoneId) {
          throw new BadRequestException('Assigned agent must belong to the selected zone');
        }
      }

      const [createdTour] = await tx
        .insert(tours)
        .values({
          name: dto.name,
          status: 'planned',
          zoneId: dto.zoneId,
          assignedAgentId: dto.assignedAgentId ?? null,
          scheduledFor: new Date(dto.scheduledFor),
        })
        .returning();

      if (!createdTour) {
        throw new Error('Failed to create planned tour');
      }

      const orderedContainers = dto.orderedContainerIds.map((containerId) => {
        const match = selectedContainers.find((container) => container.id === containerId);
        if (!match) {
          throw new BadRequestException('One or more orderedContainerIds were not found');
        }

        return match;
      });
      const stopEtas = this.computeStopEtas(orderedContainers, new Date(dto.scheduledFor), zoneDepot);
      const plannedStops = dto.orderedContainerIds.map((containerId, index) => ({
        id: randomUUID(),
        tourId: createdTour.id,
        containerId,
        stopOrder: index + 1,
        status: 'pending' as const,
        eta: stopEtas[index],
      }));

      await tx.insert(tourStops).values(plannedStops);
      await this.seedScheduledCollectionDomainState(tx, {
        tourId: createdTour.id,
        name: createdTour.name,
        status: 'planned',
        scheduledFor: createdTour.scheduledFor,
        zoneId: createdTour.zoneId,
        assignedAgentId: createdTour.assignedAgentId,
        actorUserId,
        stops: plannedStops.map((stop) => ({
          id: stop.id,
          containerId: stop.containerId,
          stopOrder: stop.stopOrder,
          eta: stop.eta,
        })),
      });

      await tx.insert(auditLogs).values({
        userId: actorUserId,
        action: 'tour_planned',
        resourceType: 'tours',
        resourceId: createdTour.id,
        oldValues: null,
        newValues: {
          assignedAgentId: createdTour.assignedAgentId,
          stopCount: dto.orderedContainerIds.length,
        },
      });

      return createdTour;
    });
  }

  async getManagerDashboard() {
    const telemetryWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [ecoSummary, criticalContainers, openAlertRows, latestAlerts, telemetryStats] = await Promise.all([
      Promise.all([
        this.db.select({ value: sql`count(*)`.mapWith(Number) }).from(containers),
        this.db.select({ value: sql`count(*)`.mapWith(Number) }).from(zones),
        this.db.select({ value: sql`count(*)`.mapWith(Number) }).from(tours),
      ]),
      this.db
        .select({
          id: containers.id,
          code: containers.code,
          label: containers.label,
          fillLevelPercent: containers.fillLevelPercent,
          status: containers.status,
          latitude: containers.latitude,
          longitude: containers.longitude,
          zoneName: zones.name,
        })
        .from(containers)
        .leftJoin(zones, eq(containers.zoneId, zones.id))
        .where(or(gte(containers.fillLevelPercent, 80), eq(containers.status, 'attention_required')))
        .orderBy(desc(containers.fillLevelPercent))
        .limit(20),
      this.db
        .select({
          severity: alertEvents.severity,
          total: sql`count(*)`.mapWith(Number),
        })
        .from(alertEvents)
        .where(or(eq(alertEvents.currentStatus, 'open'), eq(alertEvents.currentStatus, 'acknowledged')))
        .groupBy(alertEvents.severity),
      this.db
        .select({
          id: alertEvents.id,
          eventType: alertEvents.eventType,
          severity: alertEvents.severity,
          currentStatus: alertEvents.currentStatus,
          triggeredAt: alertEvents.triggeredAt,
          containerId: alertEvents.containerId,
          containerCode: containers.code,
          zoneName: zones.name,
        })
        .from(alertEvents)
        .leftJoin(containers, eq(alertEvents.containerId, containers.id))
        .leftJoin(zones, eq(alertEvents.zoneId, zones.id))
        .where(or(eq(alertEvents.currentStatus, 'open'), eq(alertEvents.currentStatus, 'acknowledged')))
        .orderBy(desc(alertEvents.triggeredAt))
        .limit(10),
      Promise.all([
        this.db
          .select({
            value: sql`count(distinct ${measurements.containerId})`.mapWith(Number),
          })
          .from(measurements)
          .where(gte(measurements.measuredAt, telemetryWindowStart)),
        this.db
          .select({
            value: sql`count(*)`.mapWith(Number),
          })
          .from(sensorDevices)
          .where(or(isNull(sensorDevices.lastSeenAt), lt(sensorDevices.lastSeenAt, telemetryWindowStart))),
        this.db
          .select({
            value: sql`max(${measurements.measuredAt})`,
          })
          .from(measurements),
      ]),
    ]);

    const activeAlertsBySeverity = openAlertRows.reduce<Record<string, number>>((acc, row) => {
      const key = row.severity?.trim().toLowerCase() || 'unknown';
      acc[key] = (acc[key] ?? 0) + (row.total ?? 0);
      return acc;
    }, {});

    return {
      ecoKpis: {
        containers: ecoSummary[0][0]?.value ?? 0,
        zones: ecoSummary[1][0]?.value ?? 0,
        tours: ecoSummary[2][0]?.value ?? 0,
      },
      criticalContainers,
      activeAlerts: {
        totalOpen: openAlertRows.reduce((sum, row) => sum + (row.total ?? 0), 0),
        bySeverity: activeAlertsBySeverity,
        latest: latestAlerts,
      },
      telemetryHealth: {
        reportingContainers: telemetryStats[0][0]?.value ?? 0,
        staleSensors: telemetryStats[1][0]?.value ?? 0,
        lastMeasurementAt: toIsoTimestampOrNull(telemetryStats[2][0]?.value),
      },
      thresholds: {
        criticalFillPercent: 80,
      },
    };
  }

  async getManagerHeatmap(filters: HeatmapFilters = {}) {
    const lookbackWindowStart = new Date(Date.now() - HEATMAP_LOOKBACK_HOURS * 60 * 60 * 1000);
    const conditions = [
      or(isNull(measurementRollups10m.windowEnd), gte(measurementRollups10m.windowEnd, lookbackWindowStart)),
    ];

    if (filters.zoneId?.trim()) {
      conditions.push(eq(containers.zoneId, filters.zoneId.trim()));
    }

    const rows = await this.db
      .select({
        containerId: containers.id,
        code: containers.code,
        label: containers.label,
        status: containers.status,
        zoneId: containers.zoneId,
        zoneName: zones.name,
        latitude: containers.latitude,
        longitude: containers.longitude,
        fallbackFillLevelPercent: containers.fillLevelPercent,
        averageFillLevelPercent: measurementRollups10m.averageFillLevelPercent,
        fillLevelDeltaPercent: measurementRollups10m.fillLevelDeltaPercent,
        sensorHealthScore: measurementRollups10m.sensorHealthScore,
        windowEnd: measurementRollups10m.windowEnd,
      })
      .from(containers)
      .leftJoin(zones, eq(containers.zoneId, zones.id))
      .leftJoin(measurementRollups10m, eq(measurementRollups10m.containerId, containers.id))
      .where(and(...conditions))
      .orderBy(desc(measurementRollups10m.windowEnd), desc(containers.updatedAt))
      .limit(2000);

    const latestByContainerId = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (!latestByContainerId.has(row.containerId)) {
        latestByContainerId.set(row.containerId, row);
      }
    }

    const containerSignals = Array.from(latestByContainerId.values())
      .map((row) => {
        const latitude = toNumberOrNull(row.latitude);
        const longitude = toNumberOrNull(row.longitude);
        if (latitude == null || longitude == null) {
          return null;
        }

        const fillLevelPercent =
          toNumberOrNull(row.averageFillLevelPercent) ??
          toNumberOrNull(row.fallbackFillLevelPercent) ??
          0;
        const fillLevelDeltaPercent = toNumberOrNull(row.fillLevelDeltaPercent) ?? 0;
        const sensorHealthScore = clamp(toNumberOrNull(row.sensorHealthScore) ?? 100, 0, 100);
        const riskScore = computeRiskScore({
          fillLevelPercent,
          fillLevelDeltaPercent,
          sensorHealthScore,
          status: row.status ?? 'unknown',
        });
        const riskTier = normalizeRiskTier(riskScore);

        return {
          containerId: row.containerId,
          code: row.code,
          label: row.label,
          zoneId: row.zoneId,
          zoneName: row.zoneName,
          latitude,
          longitude,
          fillLevelPercent,
          fillLevelDeltaPercent,
          sensorHealthScore,
          riskScore,
          riskTier,
          latestWindowEnd: toIsoTimestampOrNull(row.windowEnd),
          status: row.status,
        } satisfies HeatmapContainerSignal;
      })
      .filter((signal): signal is HeatmapContainerSignal => signal != null)
      .filter((signal) => (filters.riskTier && filters.riskTier !== 'all' ? signal.riskTier === filters.riskTier : true))
      .sort((left, right) => right.riskScore - left.riskScore);

    const zoneSummaryMap = new Map<string, {
      zoneId: string;
      zoneName: string;
      containerCount: number;
      riskScoreTotal: number;
      latitudeTotal: number;
      longitudeTotal: number;
      latestWindowEnd: string | null;
      countsByTier: Record<'low' | 'medium' | 'high', number>;
    }>();

    for (const signal of containerSignals) {
      const zoneId = signal.zoneId ?? 'unassigned';
      const zoneName = signal.zoneName ?? 'Unassigned';
      const existing = zoneSummaryMap.get(zoneId) ?? {
        zoneId,
        zoneName,
        containerCount: 0,
        riskScoreTotal: 0,
        latitudeTotal: 0,
        longitudeTotal: 0,
        latestWindowEnd: null,
        countsByTier: {
          low: 0,
          medium: 0,
          high: 0,
        },
      };

      existing.containerCount += 1;
      existing.riskScoreTotal += signal.riskScore;
      existing.latitudeTotal += signal.latitude;
      existing.longitudeTotal += signal.longitude;
      existing.countsByTier[signal.riskTier] += 1;
      existing.latestWindowEnd =
        existing.latestWindowEnd == null ||
        (signal.latestWindowEnd != null && signal.latestWindowEnd > existing.latestWindowEnd)
          ? signal.latestWindowEnd
          : existing.latestWindowEnd;

      zoneSummaryMap.set(zoneId, existing);
    }

    const zoneSummaries = Array.from(zoneSummaryMap.values())
      .map((zone) => {
        const averageRiskScore =
          zone.containerCount > 0 ? Math.round(zone.riskScoreTotal / zone.containerCount) : 0;

        return {
          zoneId: zone.zoneId,
          zoneName: zone.zoneName,
          containerCount: zone.containerCount,
          averageRiskScore,
          riskTier: normalizeRiskTier(averageRiskScore),
          centroid: zone.containerCount > 0
            ? {
                latitude: Number((zone.latitudeTotal / zone.containerCount).toFixed(6)),
                longitude: Number((zone.longitudeTotal / zone.containerCount).toFixed(6)),
              }
            : null,
          latestWindowEnd: zone.latestWindowEnd,
          countsByTier: zone.countsByTier,
        };
      })
      .sort((left, right) => right.averageRiskScore - left.averageRiskScore);

    return {
      generatedAt: new Date().toISOString(),
      filters: {
        zoneId: filters.zoneId ?? null,
        riskTier: filters.riskTier ?? 'all',
      },
      thresholds: {
        lowMax: 49,
        mediumMax: 74,
        highMin: 75,
        criticalFillPercent: 80,
      },
      zoneSummaries,
      containerSignals,
    };
  }

  async triggerEmergencyCollection(dto: TriggerEmergencyCollectionDto, actorUserId: string) {
    return this.db.transaction(async (tx) => {
      const [container] = await tx.select().from(containers).where(eq(containers.id, dto.containerId)).limit(1);
      if (!container) {
        throw new NotFoundException('Container not found');
      }

      await tx
        .update(containers)
        .set({
          status: 'attention_required',
          updatedAt: new Date(),
        })
        .where(eq(containers.id, container.id));

      const [emergencyTour] = await tx
        .insert(tours)
        .values({
          name: `Emergency: ${container.code}`,
          status: 'planned',
          scheduledFor: new Date(),
          zoneId: container.zoneId,
          assignedAgentId: dto.assignedAgentId ?? null,
        })
        .returning();

      if (!emergencyTour) {
        throw new Error('Failed to create emergency tour');
      }

      await tx.insert(tourStops).values({
        id: randomUUID(),
        tourId: emergencyTour.id,
        containerId: container.id,
        stopOrder: 1,
        status: 'pending',
        eta: emergencyTour.scheduledFor,
      });
      const [emergencyStop] = await tx
        .select({
          id: tourStops.id,
          containerId: tourStops.containerId,
          stopOrder: tourStops.stopOrder,
          eta: tourStops.eta,
        })
        .from(tourStops)
        .where(eq(tourStops.tourId, emergencyTour.id))
        .limit(1);
      if (!emergencyStop) {
        throw new Error('Failed to create emergency tour stop');
      }

      await this.seedScheduledCollectionDomainState(tx, {
        tourId: emergencyTour.id,
        name: emergencyTour.name,
        status: 'planned',
        scheduledFor: emergencyTour.scheduledFor,
        zoneId: emergencyTour.zoneId,
        assignedAgentId: emergencyTour.assignedAgentId,
        actorUserId,
        stops: [
          {
            id: emergencyStop.id,
            containerId: emergencyStop.containerId,
            stopOrder: emergencyStop.stopOrder,
            eta: emergencyStop.eta,
          },
        ],
      });

      await tx.insert(auditLogs).values({
        userId: actorUserId,
        action: 'emergency_collection_triggered',
        resourceType: 'tours',
        resourceId: emergencyTour.id,
        oldValues: null,
        newValues: {
          containerId: container.id,
          reason: dto.reason,
          assignedAgentId: dto.assignedAgentId ?? null,
        },
      });

      const [createdAlert] = await tx
        .insert(alertEvents)
        .values({
          ruleId: null,
          containerId: container.id,
          zoneId: container.zoneId,
          eventType: 'emergency_collection',
          severity: 'critical',
          triggeredAt: new Date(),
          currentStatus: 'open',
          acknowledgedByUserId: null,
          payloadSnapshot: {
            containerCode: container.code,
            reason: dto.reason,
            emergencyTourId: emergencyTour.id,
          },
        })
        .returning();

      const [createdNotification] = await tx
        .insert(notifications)
        .values({
          eventType: 'emergency_collection_triggered',
          entityType: 'alert_event',
          entityId: createdAlert?.id ?? emergencyTour.id,
          audienceScope: 'role:manager',
          title: `Emergency collection for ${container.code}`,
          body: dto.reason,
          preferredChannels: ['email'],
          scheduledAt: new Date(),
          status: 'queued',
          createdAt: new Date(),
        })
        .returning();

      if (createdNotification) {
        await tx.insert(notificationDeliveries).values({
          notificationId: createdNotification.id,
          channel: 'email',
          recipientAddress: 'role:manager',
          deliveryStatus: 'pending',
          attemptCount: 0,
          createdAt: new Date(),
        });
      }

      return {
        emergencyTour,
        alertTriggered: true,
        alertEventId: createdAlert?.id ?? null,
      };
    });
  }

  async listAlerts(filters: { status?: string; severity?: string; limit: number }) {
    const conditions = [];
    if (filters.status) {
      conditions.push(eq(alertEvents.currentStatus, filters.status));
    }
    if (filters.severity) {
      conditions.push(eq(alertEvents.severity, filters.severity));
    }

    const safeLimit = Math.max(1, Math.min(filters.limit, 100));
    const query = this.db
      .select({
        id: alertEvents.id,
        ruleId: alertEvents.ruleId,
        containerId: alertEvents.containerId,
        containerCode: containers.code,
        zoneId: alertEvents.zoneId,
        zoneName: zones.name,
        eventType: alertEvents.eventType,
        severity: alertEvents.severity,
        currentStatus: alertEvents.currentStatus,
        triggeredAt: alertEvents.triggeredAt,
        acknowledgedByUserId: alertEvents.acknowledgedByUserId,
        acknowledgedByDisplayName: users.displayName,
        resolvedAt: alertEvents.resolvedAt,
        payloadSnapshot: alertEvents.payloadSnapshot,
      })
      .from(alertEvents)
      .leftJoin(containers, eq(alertEvents.containerId, containers.id))
      .leftJoin(zones, eq(alertEvents.zoneId, zones.id))
      .leftJoin(users, eq(alertEvents.acknowledgedByUserId, users.id))
      .orderBy(desc(alertEvents.triggeredAt))
      .limit(safeLimit);

    return conditions.length > 0 ? query.where(and(...conditions)) : query;
  }

  async acknowledgeAlert(alertId: string, actorUserId: string) {
    const [updatedAlert] = await this.db
      .update(alertEvents)
      .set({
        currentStatus: 'acknowledged',
        acknowledgedByUserId: actorUserId,
      })
      .where(eq(alertEvents.id, alertId))
      .returning();

    if (!updatedAlert) {
      throw new NotFoundException('Alert not found');
    }

    await this.db.insert(auditLogs).values({
      userId: actorUserId,
      action: 'manager_alert_acknowledged',
      resourceType: 'alert_events',
      resourceId: alertId,
      oldValues: null,
      newValues: {
        currentStatus: 'acknowledged',
      },
    });

    return updatedAlert;
  }

  async listNotifications(limit = 50) {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const notificationRows = await this.db
      .select({
        id: notifications.id,
        eventType: notifications.eventType,
        entityType: notifications.entityType,
        entityId: notifications.entityId,
        audienceScope: notifications.audienceScope,
        title: notifications.title,
        body: notifications.body,
        preferredChannels: notifications.preferredChannels,
        scheduledAt: notifications.scheduledAt,
        status: notifications.status,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(safeLimit);

    if (notificationRows.length === 0) {
      return [];
    }

    const notificationIds = notificationRows.map((row) => row.id);
    const deliveryRows = await this.db
      .select({
        id: notificationDeliveries.id,
        notificationId: notificationDeliveries.notificationId,
        channel: notificationDeliveries.channel,
        recipientAddress: notificationDeliveries.recipientAddress,
        providerMessageId: notificationDeliveries.providerMessageId,
        deliveryStatus: notificationDeliveries.deliveryStatus,
        attemptCount: notificationDeliveries.attemptCount,
        lastAttemptAt: notificationDeliveries.lastAttemptAt,
        deliveredAt: notificationDeliveries.deliveredAt,
        errorCode: notificationDeliveries.errorCode,
        createdAt: notificationDeliveries.createdAt,
      })
      .from(notificationDeliveries)
      .where(inArray(notificationDeliveries.notificationId, notificationIds))
      .orderBy(desc(notificationDeliveries.createdAt));

    const deliveriesByNotificationId = new Map<string, typeof deliveryRows>();
    for (const delivery of deliveryRows) {
      const existing = deliveriesByNotificationId.get(delivery.notificationId) ?? [];
      existing.push(delivery);
      deliveriesByNotificationId.set(delivery.notificationId, existing);
    }

    return notificationRows.map((notification) => ({
      ...notification,
      deliveries: deliveriesByNotificationId.get(notification.id) ?? [],
    }));
  }

  async generateReport(dto: GenerateReportDto, actorUserId: string) {
    const { periodStart, periodEnd } = this.normalizeReportPeriod(dto.periodStart, dto.periodEnd);
    const selectedKpis = this.normalizeSelectedKpis(dto.selectedKpis);

    const normalizedEmailTo = this.normalizeRecipientEmail(dto.emailTo);
    if (dto.sendEmail && normalizedEmailTo.length === 0) {
      throw new BadRequestException('emailTo is required when sendEmail is true');
    }

    const reportPayload = await this.buildReportPayload(periodStart, periodEnd, selectedKpis);
    const reportArtifact = createReportArtifact(reportPayload, dto.format);

    const [created] = await this.db
      .insert(reportExports)
      .values({
        requestedByUserId: actorUserId,
        periodStart,
        periodEnd,
        selectedKpis,
        format: reportArtifact.format,
        status: REPORT_STATUS_GENERATED,
        sendEmail: dto.sendEmail ?? false,
        emailTo: dto.sendEmail ? normalizedEmailTo : null,
        fileContent: reportArtifact.encodedContent,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to persist generated report');
    }

    await this.db.insert(auditLogs).values({
      userId: actorUserId,
      action: 'manager_report_generated',
      resourceType: 'report_exports',
      resourceId: created.id,
      oldValues: null,
      newValues: {
        sendEmail: dto.sendEmail ?? false,
        emailTo: dto.sendEmail ? normalizedEmailTo : null,
      },
    });

    return this.finalizeReportDelivery(created, actorUserId);
  }

  async listReportHistory() {
    return this.db.select().from(reportExports).orderBy(desc(reportExports.createdAt)).limit(100);
  }

  async getReportById(reportId: string) {
    const [report] = await this.db.select().from(reportExports).where(eq(reportExports.id, reportId)).limit(1);
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  async regenerateReport(reportId: string, actorUserId: string) {
    const source = await this.getReportById(reportId);
    const selectedKpis = this.normalizeSelectedKpis(source.selectedKpis);
    const reportPayload = await this.buildReportPayload(
      source.periodStart,
      source.periodEnd,
      selectedKpis,
    );
    const reportArtifact = createReportArtifact(reportPayload, source.format);

    const [created] = await this.db
      .insert(reportExports)
      .values({
        requestedByUserId: actorUserId,
        periodStart: source.periodStart,
        periodEnd: source.periodEnd,
        selectedKpis,
        format: reportArtifact.format,
        status: REPORT_STATUS_GENERATED,
        sendEmail: source.sendEmail,
        emailTo: source.emailTo,
        fileContent: reportArtifact.encodedContent,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to regenerate report');
    }

    await this.db.insert(auditLogs).values({
      userId: actorUserId,
      action: 'manager_report_regenerated',
      resourceType: 'report_exports',
      resourceId: created.id,
      oldValues: { sourceReportId: reportId },
      newValues: { regeneratedFrom: reportId },
    });

    return this.finalizeReportDelivery(created, actorUserId);
  }

  private async finalizeReportDelivery(report: ReportExport, actorUserId: string) {
    if (!report.sendEmail || !report.emailTo) {
      return report;
    }

    try {
      const delivery = await deliverReportByEmail(report);
      const updatedReport = await this.updateReportStatus(report.id, REPORT_STATUS_EMAIL_DELIVERED);

      await this.db.insert(auditLogs).values({
        userId: actorUserId,
        action: 'manager_report_email_delivered',
        resourceType: 'report_exports',
        resourceId: report.id,
        oldValues: { status: report.status },
        newValues: {
          status: updatedReport.status,
          deliveryChannel: delivery.channel,
          deliveredAt: delivery.deliveredAt,
          deliveryStatus: delivery.status,
          outboxPath: delivery.outboxPath,
          recipient: delivery.recipient,
        },
      });

      return updatedReport;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown delivery error';
      const updatedReport = await this.updateReportStatus(report.id, REPORT_STATUS_EMAIL_DELIVERY_FAILED);

      await this.db.insert(auditLogs).values({
        userId: actorUserId,
        action: 'manager_report_email_failed',
        resourceType: 'report_exports',
        resourceId: report.id,
        oldValues: { status: report.status },
        newValues: {
          status: updatedReport.status,
          error: errorMessage,
          recipient: report.emailTo,
        },
      });

      return {
        ...updatedReport,
        deliveryError: errorMessage,
      };
    }
  }

  private normalizeReportPeriod(rawPeriodStart: unknown, rawPeriodEnd: unknown) {
    const periodStart = rawPeriodStart instanceof Date ? rawPeriodStart : new Date(String(rawPeriodStart));
    const periodEnd = rawPeriodEnd instanceof Date ? rawPeriodEnd : new Date(String(rawPeriodEnd));

    if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
      throw new BadRequestException('Invalid reporting period');
    }

    if (periodStart.getTime() > periodEnd.getTime()) {
      throw new BadRequestException('periodStart must be before or equal to periodEnd');
    }

    return { periodStart, periodEnd };
  }

  private normalizeSelectedKpis(rawSelectedKpis: unknown) {
    const selectedKpis = Array.isArray(rawSelectedKpis)
      ? rawSelectedKpis
          .map((kpi) => (typeof kpi === 'string' ? kpi.trim().toLowerCase() : ''))
          .filter((kpi): kpi is string => kpi.length > 0)
      : [];

    if (selectedKpis.length === 0) {
      throw new BadRequestException('At least one KPI must be selected');
    }

    const unsupportedKpis = selectedKpis.filter((kpi) => !REPORT_KPI_ALLOWLIST.has(kpi));
    if (unsupportedKpis.length > 0) {
      throw new BadRequestException(`Unsupported KPIs: ${unsupportedKpis.join(', ')}`);
    }

    return selectedKpis;
  }

  private normalizeRecipientEmail(rawEmail: unknown) {
    if (typeof rawEmail !== 'string') {
      return '';
    }

    return rawEmail.trim().toLowerCase();
  }

  private async updateReportStatus(reportId: string, status: string) {
    const [updated] = await this.db
      .update(reportExports)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(reportExports.id, reportId))
      .returning();

    if (!updated) {
      throw new Error('Failed to update report status');
    }

    return updated;
  }

  private async seedScheduledCollectionDomainState(
    tx: Parameters<DatabaseClient['transaction']>[0] extends (arg: infer T) => unknown ? T : never,
    input: {
      tourId: string;
      name: string;
      status: 'planned';
      scheduledFor: Date;
      zoneId: string | null;
      assignedAgentId: string | null;
      actorUserId: string | null;
      stops: Array<{
        id: string;
        containerId: string;
        stopOrder: number;
        eta: Date | null;
      }>;
    },
  ) {
    const eventId = randomUUID();
    const occurredAt = new Date();
    const payload = {
      tourId: input.tourId,
      name: input.name,
      status: input.status,
      scheduledFor: input.scheduledFor.toISOString(),
      zoneId: input.zoneId,
      assignedAgentId: input.assignedAgentId,
      stops: input.stops.map((stop) => ({
        id: stop.id,
        containerId: stop.containerId,
        stopOrder: stop.stopOrder,
        eta: stop.eta ? stop.eta.toISOString() : null,
      })),
      stopCount: input.stops.length,
    };
    const snapshotState = {
      version: 1,
      tourId: input.tourId,
      name: input.name,
      status: input.status,
      scheduledFor: input.scheduledFor.toISOString(),
      zoneId: input.zoneId,
      assignedAgentId: input.assignedAgentId,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      activeStopId: null,
      lastCollectedAt: null,
      stops: input.stops.map((stop) => ({
        id: stop.id,
        containerId: stop.containerId,
        stopOrder: stop.stopOrder,
        status: 'pending',
        eta: stop.eta ? stop.eta.toISOString() : null,
        completedAt: null,
      })),
    };

    await tx
      .insert(collectionDomainEvents)
      .values({
        id: eventId,
        tourId: input.tourId,
        aggregateVersion: 1,
        eventName: COLLECTIONS_TOUR_SCHEDULED_EVENT,
        eventType: 'tour_scheduled',
        actorUserId: input.actorUserId,
        routingKey: input.tourId,
        schemaVersion: INTERNAL_EVENT_SCHEMA_VERSION_V1,
        producerName: COLLECTIONS_COMMAND_SERVICE_PRODUCER,
        producerTransactionId: randomUUID(),
        payload,
        occurredAt,
      })
      .onConflictDoNothing({
        target: [collectionDomainEvents.tourId, collectionDomainEvents.aggregateVersion],
      });

    await tx
      .insert(collectionDomainSnapshots)
      .values({
        id: randomUUID(),
        tourId: input.tourId,
        aggregateVersion: 1,
        state: snapshotState,
      })
      .onConflictDoNothing({
        target: [collectionDomainSnapshots.tourId, collectionDomainSnapshots.aggregateVersion],
      });

    await tx
      .insert(eventConnectorExports)
      .values({
        connectorName: 'archive_files',
        sourceType: 'collection_domain_event',
        sourceRecordId: eventId,
        eventName: COLLECTIONS_TOUR_SCHEDULED_EVENT,
        routingKey: input.tourId,
        schemaVersion: INTERNAL_EVENT_SCHEMA_VERSION_V1,
        payload: {
          sourceType: 'collection_domain_event',
          eventId,
          aggregateVersion: 1,
          occurredAt: occurredAt.toISOString(),
          envelope: {
            eventName: COLLECTIONS_TOUR_SCHEDULED_EVENT,
            routingKey: input.tourId,
            schemaVersion: INTERNAL_EVENT_SCHEMA_VERSION_V1,
            producerName: COLLECTIONS_COMMAND_SERVICE_PRODUCER,
          },
          payload,
        },
      })
      .onConflictDoNothing({
        target: [
          eventConnectorExports.connectorName,
          eventConnectorExports.sourceType,
          eventConnectorExports.sourceRecordId,
        ],
      });
  }

  private async getBlockedContainerIdsForSchedule(zoneId: string, scheduledFor: Date) {
    if (Number.isNaN(scheduledFor.getTime())) {
      return new Set<string>();
    }

    const windowStart = new Date(scheduledFor.getTime() - SCHEDULE_CONFLICT_WINDOW_MINUTES * 60_000);
    const windowEnd = new Date(scheduledFor.getTime() + SCHEDULE_CONFLICT_WINDOW_MINUTES * 60_000);

    const scheduledStops = await this.db
      .select({
        containerId: tourStops.containerId,
        tourStatus: tours.status,
      })
      .from(tourStops)
      .innerJoin(tours, eq(tourStops.tourId, tours.id))
      .where(
        and(
          eq(tours.zoneId, zoneId),
          gte(tours.scheduledFor, windowStart),
          lte(tours.scheduledFor, windowEnd),
        ),
      );

    const blockedContainerIds = new Set<string>();
    for (const scheduledStop of scheduledStops) {
      if (this.isTerminalTourStatus(scheduledStop.tourStatus)) {
        continue;
      }

      blockedContainerIds.add(scheduledStop.containerId);
    }

    return blockedContainerIds;
  }

  private isTerminalTourStatus(status: unknown) {
    if (typeof status !== 'string') {
      return false;
    }

    return TERMINAL_TOUR_STATUSES.has(status.trim().toLowerCase());
  }

  private async buildReportPayload(periodStart: Date, periodEnd: Date, selectedKpis: string[]) {
    const [tourCountRows, collectionCountRows, anomalyCountRows] = await Promise.all([
      this.db
        .select({ value: sql`count(*)`.mapWith(Number) })
        .from(tours)
        .where(and(gte(tours.scheduledFor, periodStart), lte(tours.scheduledFor, periodEnd))),
      this.db
        .select({ value: sql`count(*)`.mapWith(Number) })
        .from(collectionEvents)
        .where(
          and(
            gte(collectionEvents.collectedAt, periodStart),
            lte(collectionEvents.collectedAt, periodEnd),
          ),
        ),
      this.db
        .select({ value: sql`count(*)`.mapWith(Number) })
        .from(anomalyReports)
        .where(and(gte(anomalyReports.reportedAt, periodStart), lte(anomalyReports.reportedAt, periodEnd))),
    ]);

    return {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      selectedKpis,
      metrics: {
        tours: tourCountRows[0]?.value ?? 0,
        collections: collectionCountRows[0]?.value ?? 0,
        anomalies: anomalyCountRows[0]?.value ?? 0,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  private computeHeuristicRoute(
    candidates: Array<Record<string, unknown>>,
    startLocation?: ZoneDepotPoint | null,
  ) {
    if (candidates.length <= 1) {
      return candidates;
    }

    const remaining = [...candidates];
    const route: Array<Record<string, unknown>> = [];

    let firstIndex = 0;
    if (startLocation) {
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let index = 0; index < remaining.length; index += 1) {
        const candidate = remaining[index];
        const distance = haversineDistanceKm(startLocation, {
          id: String(candidate.id),
          latitude: toNumberOrNull(candidate.latitude),
          longitude: toNumberOrNull(candidate.longitude),
        });

        if (distance < bestDistance) {
          bestDistance = distance;
          firstIndex = index;
        }
      }
    }

    const [first] = remaining.splice(firstIndex, 1);
    if (!first) {
      return [];
    }

    route.push(first);

    while (remaining.length > 0) {
      const current = route[route.length - 1];
      const currentPoint: LatLngPoint = {
        id: String(current.id),
        latitude: toNumberOrNull(current.latitude),
        longitude: toNumberOrNull(current.longitude),
      };

      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (let index = 0; index < remaining.length; index += 1) {
        const candidate = remaining[index];
        const distance = haversineDistanceKm(currentPoint, {
          id: String(candidate.id),
          latitude: toNumberOrNull(candidate.latitude),
          longitude: toNumberOrNull(candidate.longitude),
        });

        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      }

      const [next] = remaining.splice(bestIndex, 1);
      if (next) {
        route.push(next);
      }
    }

    return route;
  }

  private refineRouteWithTwoOpt(
    route: Array<Record<string, unknown>>,
    startLocation?: ZoneDepotPoint | null,
  ) {
    if (startLocation == null && route.length < 4) {
      return route;
    }

    if (startLocation != null && route.length < 3) {
      return route;
    }

    const optimized = [...route];
    let didImprove = true;
    let passCount = 0;

    while (didImprove && passCount < MAX_2OPT_PASSES) {
      didImprove = false;
      passCount += 1;

      const leftStartIndex = startLocation == null ? 1 : 0;
      const rightBoundary = startLocation == null ? optimized.length - 1 : optimized.length;

      for (let left = leftStartIndex; left < optimized.length - 1; left += 1) {
        for (let right = left + 1; right < rightBoundary; right += 1) {
          const leftPrev = left === 0 ? startLocation ?? null : this.toLatLngPoint(optimized[left - 1]);
          if (leftPrev == null) {
            continue;
          }
          const leftNode = optimized[left];
          const rightNode = optimized[right];
          const rightNext =
            right + 1 < optimized.length ? this.toLatLngPoint(optimized[right + 1]) : null;

          const currentDistance =
            haversineDistanceKm(leftPrev, this.toLatLngPoint(leftNode)) +
            (rightNext == null
              ? 0
              : haversineDistanceKm(this.toLatLngPoint(rightNode), rightNext));
          const swappedDistance =
            haversineDistanceKm(leftPrev, this.toLatLngPoint(rightNode)) +
            (rightNext == null
              ? 0
              : haversineDistanceKm(this.toLatLngPoint(leftNode), rightNext));

          if (swappedDistance + 0.0001 < currentDistance) {
            const reversed = optimized.slice(left, right + 1).reverse();
            optimized.splice(left, right - left + 1, ...reversed);
            didImprove = true;
          }
        }
      }
    }

    return optimized;
  }

  private distanceBetweenNodes(fromNode: Record<string, unknown>, toNode: Record<string, unknown>) {
    return haversineDistanceKm(this.toLatLngPoint(fromNode), this.toLatLngPoint(toNode));
  }

  private toLatLngPoint(node: Record<string, unknown>): LatLngPoint {
    return {
      id: String(node.id),
      latitude: toNumberOrNull(node.latitude),
      longitude: toNumberOrNull(node.longitude),
    };
  }

  private computeRouteDistance(route: Array<Record<string, unknown>>, startLocation?: ZoneDepotPoint | null) {
    if (route.length === 0) {
      return 0;
    }

    let total = 0;
    if (startLocation) {
      total += haversineDistanceKm(startLocation, this.toLatLngPoint(route[0]));
    }

    for (let index = 1; index < route.length; index += 1) {
      const previous = route[index - 1];
      const current = route[index];

      total += this.distanceBetweenNodes(previous, current);
    }

    return total;
  }

  private estimateRouteDurationMinutes(totalDistanceKm: number, stopCount: number) {
    return Math.round((totalDistanceKm / AVERAGE_ROUTE_SPEED_KMH) * 60 + stopCount * STOP_SERVICE_DURATION_MINUTES);
  }

  private estimateLegTravelMinutes(fromNode: Record<string, unknown>, toNode: Record<string, unknown>) {
    const distanceKm = this.distanceBetweenNodes(fromNode, toNode);
    if (distanceKm <= 0) {
      return 0;
    }

    return Math.max(1, Math.round((distanceKm / AVERAGE_ROUTE_SPEED_KMH) * 60));
  }

  private computeStopEtas(
    route: Array<Record<string, unknown>>,
    scheduledFor: Date,
    startLocation?: ZoneDepotPoint | null,
  ) {
    if (route.length === 0) {
      return [];
    }

    const firstTravelMinutes =
      startLocation == null ? 0 : this.estimateLegTravelMinutes(startLocation, route[0]);
    const stopEtas: Date[] = [new Date(scheduledFor.getTime() + firstTravelMinutes * 60_000)];

    for (let index = 1; index < route.length; index += 1) {
      const previousEta = stopEtas[index - 1];
      const travelMinutes = this.estimateLegTravelMinutes(route[index - 1], route[index]);
      const eta = new Date(
        previousEta.getTime() +
          (STOP_SERVICE_DURATION_MINUTES + travelMinutes) * 60_000,
      );

      stopEtas.push(eta);
    }

    return stopEtas;
  }

  private async getZoneDepot(
    zoneId: string,
    dbClient: Pick<DatabaseClient, 'select'> = this.db,
  ): Promise<ZoneDepotPoint | null> {
    const zonesInScope = await dbClient
      .select({
        id: zones.id,
        label: zones.depotLabel,
        latitude: zones.depotLatitude,
        longitude: zones.depotLongitude,
      })
      .from(zones)
      .where(eq(zones.id, zoneId));

    const [zone] = zonesInScope;

    if (!zone) {
      throw new NotFoundException('Zone not found');
    }

    return {
      id: zone.id,
      label: zone.label,
      latitude: toNumberOrNull(zone.latitude),
      longitude: toNumberOrNull(zone.longitude),
    };
  }
}

