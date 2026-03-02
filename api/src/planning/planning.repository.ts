import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gte, inArray, lte, or, sql } from 'drizzle-orm';
import {
  anomalyReports,
  auditLogs,
  collectionEvents,
  containers,
  type DatabaseClient,
  type ReportExport,
  reportExports,
  roles,
  tourStops,
  tours,
  userRoles,
  users,
  zones,
} from 'ecotrack-database';

import { DRIZZLE } from '../database/database.constants.js';

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

const EARTH_RADIUS_KM = 6371;
const REPORT_KPI_ALLOWLIST = new Set(['tours', 'collections', 'anomalies']);
const MAX_2OPT_PASSES = 20;
const SCHEDULE_CONFLICT_WINDOW_MINUTES = 120;
const TERMINAL_TOUR_STATUSES = new Set(['completed', 'closed', 'cancelled']);
const AVERAGE_ROUTE_SPEED_KMH = 24;
const STOP_SERVICE_DURATION_MINUTES = 4;

const toNumberOrNull = (value: unknown) => {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
      })
      .from(users)
      .leftJoin(userRoles, eq(userRoles.userId, users.id))
      .where(and(eq(userRoles.roleId, agentRole.id), eq(users.isActive, true)));

    return rows;
  }

  async optimizeTour(dto: OptimizeTourDto) {
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

    const heuristicRoute = this.computeHeuristicRoute(selectedCandidates);
    const route = this.refineRouteWithTwoOpt(heuristicRoute);
    const totalDistanceKm = this.computeRouteDistance(route);

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
    };
  }

  async createPlannedTour(dto: CreatePlannedTourDto, actorUserId: string) {
    return this.db.transaction(async (tx) => {
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
      const stopEtas = this.computeStopEtas(orderedContainers, new Date(dto.scheduledFor));

      await tx.insert(tourStops).values(
        dto.orderedContainerIds.map((containerId, index) => ({
          tourId: createdTour.id,
          containerId,
          stopOrder: index + 1,
          status: 'pending',
          eta: stopEtas[index],
        })),
      );

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
    const [ecoSummary, criticalContainers] = await Promise.all([
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
    ]);

    return {
      ecoKpis: {
        containers: ecoSummary[0][0]?.value ?? 0,
        zones: ecoSummary[1][0]?.value ?? 0,
        tours: ecoSummary[2][0]?.value ?? 0,
      },
      criticalContainers,
      thresholds: {
        criticalFillPercent: 80,
      },
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
        tourId: emergencyTour.id,
        containerId: container.id,
        stopOrder: 1,
        status: 'pending',
        eta: emergencyTour.scheduledFor,
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

      return {
        emergencyTour,
        alertTriggered: true,
      };
    });
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

  private computeHeuristicRoute(candidates: Array<Record<string, unknown>>) {
    if (candidates.length <= 2) {
      return candidates;
    }

    const remaining = [...candidates];
    const route: Array<Record<string, unknown>> = [];

    const first = remaining.shift();
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

  private refineRouteWithTwoOpt(route: Array<Record<string, unknown>>) {
    if (route.length < 4) {
      return route;
    }

    const optimized = [...route];
    let didImprove = true;
    let passCount = 0;

    while (didImprove && passCount < MAX_2OPT_PASSES) {
      didImprove = false;
      passCount += 1;

      for (let left = 1; left < optimized.length - 2; left += 1) {
        for (let right = left + 1; right < optimized.length - 1; right += 1) {
          const leftPrev = optimized[left - 1];
          const leftNode = optimized[left];
          const rightNode = optimized[right];
          const rightNext = optimized[right + 1];

          const currentDistance =
            this.distanceBetweenNodes(leftPrev, leftNode) + this.distanceBetweenNodes(rightNode, rightNext);
          const swappedDistance =
            this.distanceBetweenNodes(leftPrev, rightNode) + this.distanceBetweenNodes(leftNode, rightNext);

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

  private computeRouteDistance(route: Array<Record<string, unknown>>) {
    if (route.length <= 1) {
      return 0;
    }

    let total = 0;

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

  private computeStopEtas(route: Array<Record<string, unknown>>, scheduledFor: Date) {
    if (route.length === 0) {
      return [];
    }

    const stopEtas: Date[] = [new Date(scheduledFor)];

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
}
