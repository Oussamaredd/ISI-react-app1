import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import {
  anomalyReports,
  anomalyTypes,
  auditLogs,
  collectionEvents,
  containers,
  type DatabaseClient,
  tourStops,
  tours,
  users,
  zones,
} from 'ecotrack-database';

import { DRIZZLE } from '../database/database.constants.js';

import type { CreateTourDto } from './dto/create-tour.dto.js';
import type { ReportAnomalyDto } from './dto/report-anomaly.dto.js';
import type { UpdateTourDto } from './dto/update-tour.dto.js';
import type { ValidateTourStopDto } from './dto/validate-tour-stop.dto.js';

type TourFilters = {
  search?: string;
  status?: string;
  zoneId?: string;
  limit: number;
  offset: number;
};

@Injectable()
export class ToursRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DatabaseClient) {}

  async list(filters: TourFilters) {
    const where = this.buildWhere(filters);

    const listQuery = this.db
      .select({
        id: tours.id,
        name: tours.name,
        status: tours.status,
        scheduledFor: tours.scheduledFor,
        zoneId: tours.zoneId,
        zoneName: zones.name,
        assignedAgentId: tours.assignedAgentId,
        createdAt: tours.createdAt,
        updatedAt: tours.updatedAt,
      })
      .from(tours)
      .leftJoin(zones, eq(tours.zoneId, zones.id))
      .orderBy(asc(tours.scheduledFor))
      .limit(filters.limit)
      .offset(filters.offset);

    const totalQuery = this.db.select({ value: count() }).from(tours);

    const [items, totalRows] = await Promise.all([
      where ? listQuery.where(where) : listQuery,
      where ? totalQuery.where(where) : totalQuery,
    ]);

    return {
      items,
      total: totalRows[0]?.value ?? items.length,
    };
  }

  async getAgentTour(agentUserId: string) {
    const [tour] = await this.db
      .select({
        id: tours.id,
        name: tours.name,
        status: tours.status,
        scheduledFor: tours.scheduledFor,
        zoneId: tours.zoneId,
        zoneName: zones.name,
      })
      .from(tours)
      .leftJoin(zones, eq(tours.zoneId, zones.id))
      .where(eq(tours.assignedAgentId, agentUserId))
      .orderBy(asc(tours.scheduledFor))
      .limit(1);

    if (!tour) {
      return null;
    }

    const stops = await this.db
      .select({
        id: tourStops.id,
        stopOrder: tourStops.stopOrder,
        status: tourStops.status,
        eta: tourStops.eta,
        completedAt: tourStops.completedAt,
        containerId: containers.id,
        containerCode: containers.code,
        containerLabel: containers.label,
        latitude: containers.latitude,
        longitude: containers.longitude,
      })
      .from(tourStops)
      .innerJoin(containers, eq(tourStops.containerId, containers.id))
      .where(eq(tourStops.tourId, tour.id))
      .orderBy(asc(tourStops.stopOrder));

    return {
      ...tour,
      stops,
      itinerary: stops.map((stop) => ({
        stopId: stop.id,
        order: stop.stopOrder,
        latitude: stop.latitude,
        longitude: stop.longitude,
      })),
    };
  }

  async startTour(tourId: string, actorUserId: string) {
    return this.db.transaction(async (tx) => {
      const [tour] = await tx.select().from(tours).where(eq(tours.id, tourId)).limit(1);
      if (!tour) {
        throw new NotFoundException('Tour not found');
      }

      if (tour.assignedAgentId && tour.assignedAgentId !== actorUserId) {
        throw new ForbiddenException('You are not assigned to this tour');
      }

      const [updatedTour] = await tx
        .update(tours)
        .set({ status: 'in_progress', updatedAt: new Date() })
        .where(eq(tours.id, tourId))
        .returning();

      const [firstPendingStop] = await tx
        .select()
        .from(tourStops)
        .where(and(eq(tourStops.tourId, tourId), eq(tourStops.status, 'pending')))
        .orderBy(asc(tourStops.stopOrder))
        .limit(1);

      if (firstPendingStop) {
        await tx
          .update(tourStops)
          .set({ status: 'active', updatedAt: new Date() })
          .where(eq(tourStops.id, firstPendingStop.id));
      }

      return {
        ...updatedTour,
        firstActiveStopId: firstPendingStop?.id ?? null,
      };
    });
  }

  async validateStop(tourId: string, stopId: string, actorUserId: string, dto: ValidateTourStopDto) {
    return this.db.transaction(async (tx) => {
      const [tour] = await tx.select().from(tours).where(eq(tours.id, tourId)).limit(1);
      if (!tour) {
        throw new NotFoundException('Tour not found');
      }

      if (tour.assignedAgentId && tour.assignedAgentId !== actorUserId) {
        throw new ForbiddenException('You are not assigned to this tour');
      }

      const [stop] = await tx
        .select({
          id: tourStops.id,
          tourId: tourStops.tourId,
          stopOrder: tourStops.stopOrder,
          status: tourStops.status,
          containerId: tourStops.containerId,
          containerCode: containers.code,
        })
        .from(tourStops)
        .innerJoin(containers, eq(tourStops.containerId, containers.id))
        .where(and(eq(tourStops.id, stopId), eq(tourStops.tourId, tourId)))
        .limit(1);

      if (!stop) {
        throw new NotFoundException('Tour stop not found');
      }

      const manualContainerId = dto.containerId;
      const qrCode = dto.qrCode?.trim();

      if (manualContainerId && manualContainerId !== stop.containerId) {
        throw new BadRequestException('Manual container selection does not match this stop.');
      }

      if (qrCode && qrCode !== stop.containerCode) {
        throw new BadRequestException('QR code mismatch. Use manual fallback selection if needed.');
      }

      const [event] = await tx
        .insert(collectionEvents)
        .values({
          tourStopId: stop.id,
          containerId: stop.containerId,
          actorUserId,
          volumeLiters: dto.volumeLiters,
          notes: dto.notes ?? null,
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
          collectedAt: new Date(),
        })
        .returning();

      await tx
        .update(tourStops)
        .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
        .where(eq(tourStops.id, stop.id));

      const [nextPendingStop] = await tx
        .select()
        .from(tourStops)
        .where(
          and(
            eq(tourStops.tourId, tourId),
            eq(tourStops.status, 'pending'),
            sql`${tourStops.stopOrder} > ${stop.stopOrder}`,
          ),
        )
        .orderBy(asc(tourStops.stopOrder))
        .limit(1);

      if (nextPendingStop) {
        await tx
          .update(tourStops)
          .set({ status: 'active', updatedAt: new Date() })
          .where(eq(tourStops.id, nextPendingStop.id));
      } else {
        await tx
          .update(tours)
          .set({ status: 'completed', updatedAt: new Date() })
          .where(eq(tours.id, tourId));
      }

      return {
        event,
        validatedStopId: stop.id,
        nextStopId: nextPendingStop?.id ?? null,
      };
    });
  }

  async listAnomalyTypes() {
    return this.db
      .select()
      .from(anomalyTypes)
      .where(eq(anomalyTypes.isActive, true))
      .orderBy(asc(anomalyTypes.label));
  }

  async reportAnomaly(tourId: string, actorUserId: string, dto: ReportAnomalyDto) {
    return this.db.transaction(async (tx) => {
      const [tour] = await tx.select().from(tours).where(eq(tours.id, tourId)).limit(1);
      if (!tour) {
        throw new NotFoundException('Tour not found');
      }

      if (tour.assignedAgentId && tour.assignedAgentId !== actorUserId) {
        throw new ForbiddenException('You are not assigned to this tour');
      }

      const [anomalyType] = await tx
        .select()
        .from(anomalyTypes)
        .where(eq(anomalyTypes.id, dto.anomalyTypeId))
        .limit(1);

      if (!anomalyType) {
        throw new NotFoundException('Anomaly type not found');
      }

      if (dto.tourStopId) {
        const [stop] = await tx
          .select()
          .from(tourStops)
          .where(and(eq(tourStops.id, dto.tourStopId), eq(tourStops.tourId, tourId)))
          .limit(1);

        if (!stop) {
          throw new BadRequestException('Invalid tour stop for this tour');
        }
      }

      const [createdReport] = await tx
        .insert(anomalyReports)
        .values({
          anomalyTypeId: dto.anomalyTypeId,
          tourId,
          tourStopId: dto.tourStopId ?? null,
          reporterUserId: actorUserId,
          comments: dto.comments ?? null,
          photoUrl: dto.photoUrl ?? null,
          severity: dto.severity ?? 'medium',
          status: 'reported',
          reportedAt: new Date(),
        })
        .returning();

      await tx.insert(auditLogs).values({
        userId: actorUserId,
        action: 'manager_alert_anomaly_reported',
        resourceType: 'anomaly_reports',
        resourceId: createdReport.id,
        oldValues: null,
        newValues: {
          tourId,
          anomalyType: anomalyType.code,
          severity: createdReport.severity,
        },
      });

      return {
        ...createdReport,
        managerAlertTriggered: true,
      };
    });
  }

  async getTourActivity(tourId: string) {
    const [tour] = await this.db.select().from(tours).where(eq(tours.id, tourId)).limit(1);
    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    const [collectionRows, anomalyRows] = await Promise.all([
      this.db
        .select({
          id: collectionEvents.id,
          createdAt: collectionEvents.collectedAt,
          type: sql<string>`'collection_validated'`,
          details: sql`jsonb_build_object(
            'tourStopId', ${collectionEvents.tourStopId},
            'containerId', ${collectionEvents.containerId},
            'volumeLiters', ${collectionEvents.volumeLiters}
          )`,
          actorDisplayName: users.displayName,
        })
        .from(collectionEvents)
        .leftJoin(users, eq(collectionEvents.actorUserId, users.id))
        .leftJoin(tourStops, eq(collectionEvents.tourStopId, tourStops.id))
        .where(eq(tourStops.tourId, tourId)),
      this.db
        .select({
          id: anomalyReports.id,
          createdAt: anomalyReports.reportedAt,
          type: sql<string>`'anomaly_reported'`,
          details: sql`jsonb_build_object(
            'tourStopId', ${anomalyReports.tourStopId},
            'anomalyTypeId', ${anomalyReports.anomalyTypeId},
            'comments', ${anomalyReports.comments},
            'severity', ${anomalyReports.severity}
          )`,
          actorDisplayName: users.displayName,
        })
        .from(anomalyReports)
        .leftJoin(users, eq(anomalyReports.reporterUserId, users.id))
        .where(eq(anomalyReports.tourId, tourId)),
    ]);

    return [...collectionRows, ...anomalyRows].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  }

  async create(dto: CreateTourDto) {
    return this.db.transaction(async (tx) => {
      const [createdTour] = await tx
        .insert(tours)
        .values({
          name: dto.name.trim(),
          status: dto.status?.trim() || 'planned',
          scheduledFor: new Date(dto.scheduledFor),
          zoneId: dto.zoneId ?? null,
          assignedAgentId: dto.assignedAgentId ?? null,
        })
        .returning();

      if (!createdTour) {
        throw new Error('Failed to create tour');
      }

      await tx.insert(tourStops).values(
        dto.stopContainerIds.map((containerId, index) => ({
          tourId: createdTour.id,
          containerId,
          stopOrder: index + 1,
          status: 'pending',
        })),
      );

      const stops = await tx
        .select({
          id: tourStops.id,
          stopOrder: tourStops.stopOrder,
          status: tourStops.status,
          containerId: tourStops.containerId,
          containerCode: containers.code,
          containerLabel: containers.label,
        })
        .from(tourStops)
        .innerJoin(containers, eq(tourStops.containerId, containers.id))
        .where(eq(tourStops.tourId, createdTour.id))
        .orderBy(asc(tourStops.stopOrder));

      return {
        ...createdTour,
        stops,
      };
    });
  }

  async update(id: string, dto: UpdateTourDto) {
    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(tours)
        .set({
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.status !== undefined ? { status: dto.status.trim() } : {}),
          ...(dto.scheduledFor !== undefined ? { scheduledFor: new Date(dto.scheduledFor) } : {}),
          ...(dto.zoneId !== undefined ? { zoneId: dto.zoneId } : {}),
          ...(dto.assignedAgentId !== undefined ? { assignedAgentId: dto.assignedAgentId } : {}),
          updatedAt: new Date(),
        })
        .where(eq(tours.id, id))
        .returning();

      if (!updated) {
        throw new NotFoundException(`Tour ${id} not found`);
      }

      if (Array.isArray(dto.stopContainerIds) && dto.stopContainerIds.length > 0) {
        await tx.delete(tourStops).where(eq(tourStops.tourId, id));
        await tx.insert(tourStops).values(
          dto.stopContainerIds.map((containerId, index) => ({
            tourId: id,
            containerId,
            stopOrder: index + 1,
            status: 'pending',
          })),
        );
      }

      return updated;
    });
  }

  private buildWhere(filters: TourFilters) {
    const conditions = [];

    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(sql`${tours.name} ilike ${pattern}`);
    }

    if (filters.status) {
      conditions.push(eq(tours.status, filters.status));
    }

    if (filters.zoneId) {
      conditions.push(eq(tours.zoneId, filters.zoneId));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}
