import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gte, inArray, or, sql } from 'drizzle-orm';
import {
  anomalyReports,
  auditLogs,
  collectionEvents,
  containers,
  type DatabaseClient,
  reportExports,
  roles,
  tickets,
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

type LatLngPoint = { id: string; latitude: number | null; longitude: number | null };

const EARTH_RADIUS_KM = 6371;

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
    const selectedCandidates =
      manualIds.size > 0
        ? allCandidates.filter((item) => manualIds.has(item.id))
        : [...allCandidates].sort((left, right) => right.fillLevelPercent - left.fillLevelPercent);

    const route = this.computeHeuristicRoute(selectedCandidates);
    const totalDistanceKm = this.computeRouteDistance(route);

    return {
      candidates: selectedCandidates,
      route: route.map((item, index) => ({
        ...item,
        order: index + 1,
      })),
      metrics: {
        totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
        estimatedDurationMinutes: Math.round((totalDistanceKm / 24) * 60 + route.length * 4),
      },
    };
  }

  async createPlannedTour(dto: CreatePlannedTourDto, actorUserId: string) {
    return this.db.transaction(async (tx) => {
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

      await tx.insert(tourStops).values(
        dto.orderedContainerIds.map((containerId, index) => ({
          tourId: createdTour.id,
          containerId,
          stopOrder: index + 1,
          status: 'pending',
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
    const [ticketsTotalRow, ticketsCompletedRow, ecoSummary, criticalContainers] = await Promise.all([
      this.db.select({ value: sql`count(*)`.mapWith(Number) }).from(tickets),
      this.db
        .select({ value: sql`count(*)`.mapWith(Number) })
        .from(tickets)
        .where(inArray(tickets.status, ['completed', 'closed', 'COMPLETED', 'CLOSED'])),
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

    const ticketsTotal = ticketsTotalRow[0]?.value ?? 0;
    const ticketsCompleted = ticketsCompletedRow[0]?.value ?? 0;

    return {
      ticketKpis: {
        total: ticketsTotal,
        completed: ticketsCompleted,
        open: Math.max(ticketsTotal - ticketsCompleted, 0),
      },
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
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    const [tourCountRows, collectionCountRows, anomalyCountRows] = await Promise.all([
      this.db
        .select({ value: sql`count(*)`.mapWith(Number) })
        .from(tours)
        .where(and(gte(tours.scheduledFor, periodStart), sql`${tours.scheduledFor} <= ${periodEnd}`)),
      this.db
        .select({ value: sql`count(*)`.mapWith(Number) })
        .from(collectionEvents)
        .where(
          and(
            gte(collectionEvents.collectedAt, periodStart),
            sql`${collectionEvents.collectedAt} <= ${periodEnd}`,
          ),
        ),
      this.db
        .select({ value: sql`count(*)`.mapWith(Number) })
        .from(anomalyReports)
        .where(and(gte(anomalyReports.reportedAt, periodStart), sql`${anomalyReports.reportedAt} <= ${periodEnd}`)),
    ]);

    const reportPayload = {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      selectedKpis: dto.selectedKpis,
      metrics: {
        tours: tourCountRows[0]?.value ?? 0,
        collections: collectionCountRows[0]?.value ?? 0,
        anomalies: anomalyCountRows[0]?.value ?? 0,
      },
    };

    const fileContent = JSON.stringify(reportPayload, null, 2);

    const [created] = await this.db
      .insert(reportExports)
      .values({
        requestedByUserId: actorUserId,
        periodStart,
        periodEnd,
        selectedKpis: dto.selectedKpis,
        format: dto.format ?? 'pdf',
        status: 'generated',
        sendEmail: dto.sendEmail ?? false,
        emailTo: dto.sendEmail ? (dto.emailTo ?? null) : null,
        fileContent,
      })
      .returning();

    await this.db.insert(auditLogs).values({
      userId: actorUserId,
      action: 'manager_report_generated',
      resourceType: 'report_exports',
      resourceId: created.id,
      oldValues: null,
      newValues: {
        sendEmail: dto.sendEmail ?? false,
        emailTo: dto.emailTo ?? null,
      },
    });

    return created;
  }

  async listReportHistory() {
    return this.db.select().from(reportExports).orderBy(desc(reportExports.createdAt)).limit(50);
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
    const [created] = await this.db
      .insert(reportExports)
      .values({
        requestedByUserId: actorUserId,
        periodStart: source.periodStart,
        periodEnd: source.periodEnd,
        selectedKpis: source.selectedKpis as string[],
        format: source.format,
        status: 'generated',
        sendEmail: source.sendEmail,
        emailTo: source.emailTo,
        fileContent: source.fileContent,
      })
      .returning();

    await this.db.insert(auditLogs).values({
      userId: actorUserId,
      action: 'manager_report_regenerated',
      resourceType: 'report_exports',
      resourceId: created.id,
      oldValues: { sourceReportId: reportId },
      newValues: { regeneratedFrom: reportId },
    });

    return created;
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

  private computeRouteDistance(route: Array<Record<string, unknown>>) {
    if (route.length <= 1) {
      return 0;
    }

    let total = 0;

    for (let index = 1; index < route.length; index += 1) {
      const previous = route[index - 1];
      const current = route[index];

      total += haversineDistanceKm(
        {
          id: String(previous.id),
          latitude: toNumberOrNull(previous.latitude),
          longitude: toNumberOrNull(previous.longitude),
        },
        {
          id: String(current.id),
          latitude: toNumberOrNull(current.latitude),
          longitude: toNumberOrNull(current.longitude),
        },
      );
    }

    return total;
  }
}
