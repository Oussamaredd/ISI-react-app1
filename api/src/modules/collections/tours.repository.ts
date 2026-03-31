import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, sql } from 'drizzle-orm';
import {
  alertEvents,
  anomalyReports,
  anomalyTypes,
  auditLogs,
  collectionEvents,
  containers,
  type DatabaseClient,
  notificationDeliveries,
  notifications,
  tourRoutes,
  tourStops,
  tours,
  users,
  zones,
} from 'ecotrack-database';

import { DRIZZLE } from '../../database/database.constants.js';

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

type LatLngPoint = {
  latitude: number | null;
  longitude: number | null;
};

type RouteGeometryLineString = {
  type: 'LineString';
  coordinates: Array<[number, number]>;
};

const TERMINAL_TOUR_STATUSES = new Set(['completed', 'closed', 'cancelled']);
const EARTH_RADIUS_KM = 6371;
const AVERAGE_ROUTE_SPEED_KMH = 24;
const STOP_SERVICE_DURATION_MINUTES = 4;

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
    const assignedTours = await this.db
      .select({
        id: tours.id,
        name: tours.name,
        status: tours.status,
        scheduledFor: tours.scheduledFor,
        startedAt: tours.startedAt,
        zoneId: tours.zoneId,
        zoneName: zones.name,
        updatedAt: tours.updatedAt,
      })
      .from(tours)
      .leftJoin(zones, eq(tours.zoneId, zones.id))
      .where(eq(tours.assignedAgentId, agentUserId))
      .orderBy(asc(tours.scheduledFor));

    const tour = this.selectActionableTour(assignedTours);

    if (!tour) {
      return null;
    }

    const [stops, storedRoute] = await Promise.all([
      this.getTourRouteStops(tour.id),
      this.getStoredRoute(tour.id),
    ]);

    return {
      ...tour,
      stops,
      storedRoute,
      itinerary: stops.map((stop) => ({
        stopId: stop.id,
        order: stop.stopOrder,
        status: stop.status,
        eta: stop.eta,
        latitude: stop.latitude,
        longitude: stop.longitude,
      })),
      routeSummary: this.buildRouteSummary(tour.scheduledFor, stops),
    };
  }

  async getTourRouteStops(tourId: string) {
    return this.db
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
      .where(eq(tourStops.tourId, tourId))
      .orderBy(asc(tourStops.stopOrder));
  }

  async getStoredRoute(tourId: string) {
    const [storedRoute] = await this.db
      .select({
        id: tourRoutes.id,
        tourId: tourRoutes.tourId,
        geometry: tourRoutes.geometry,
        distanceMeters: tourRoutes.distanceMeters,
        durationMinutes: tourRoutes.durationMinutes,
        source: tourRoutes.source,
        provider: tourRoutes.provider,
        resolvedAt: tourRoutes.resolvedAt,
        createdAt: tourRoutes.createdAt,
        updatedAt: tourRoutes.updatedAt,
      })
      .from(tourRoutes)
      .where(eq(tourRoutes.tourId, tourId))
      .limit(1);

    return storedRoute ?? null;
  }

  async getTourById(tourId: string) {
    const [tour] = await this.db
      .select({
        id: tours.id,
        name: tours.name,
        status: tours.status,
        scheduledFor: tours.scheduledFor,
        zoneId: tours.zoneId,
        assignedAgentId: tours.assignedAgentId,
        createdAt: tours.createdAt,
        updatedAt: tours.updatedAt,
      })
      .from(tours)
      .where(eq(tours.id, tourId))
      .limit(1);

    return tour ?? null;
  }

  async upsertTourRoute(route: {
    tourId: string;
    geometry: RouteGeometryLineString;
    distanceMeters?: number | null;
    durationMinutes?: number | null;
    source: string;
    provider: string;
    resolvedAt: Date;
  }) {
    const [storedRoute] = await this.db
      .insert(tourRoutes)
      .values({
        tourId: route.tourId,
        geometry: route.geometry,
        distanceMeters: route.distanceMeters ?? null,
        durationMinutes: route.durationMinutes ?? null,
        source: route.source,
        provider: route.provider,
        resolvedAt: route.resolvedAt,
      })
      .onConflictDoUpdate({
        target: tourRoutes.tourId,
        set: {
          geometry: route.geometry,
          distanceMeters: route.distanceMeters ?? null,
          durationMinutes: route.durationMinutes ?? null,
          source: route.source,
          provider: route.provider,
          resolvedAt: route.resolvedAt,
          updatedAt: new Date(),
        },
      })
      .returning({
        id: tourRoutes.id,
        tourId: tourRoutes.tourId,
        geometry: tourRoutes.geometry,
        distanceMeters: tourRoutes.distanceMeters,
        durationMinutes: tourRoutes.durationMinutes,
        source: tourRoutes.source,
        provider: tourRoutes.provider,
        resolvedAt: tourRoutes.resolvedAt,
        createdAt: tourRoutes.createdAt,
        updatedAt: tourRoutes.updatedAt,
      });

    return storedRoute ?? null;
  }

  async recordRouteRebuildAuditLog(
    tourId: string,
    actorUserId: string,
    details: {
      source: string;
      provider: string;
      distanceMeters: number | null;
      durationMinutes: number | null;
      resolvedAt: string;
    },
  ) {
    await this.db.insert(auditLogs).values({
      userId: actorUserId,
      action: 'tour_route_rebuilt',
      resourceType: 'tour_routes',
      resourceId: tourId,
      oldValues: null,
      newValues: {
        ...details,
      },
    });
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

      if (this.isTerminalStatus(tour.status)) {
        throw new BadRequestException('Completed tours cannot be restarted.');
      }

      const [activeStop] = await tx
        .select()
        .from(tourStops)
        .where(and(eq(tourStops.tourId, tourId), eq(tourStops.status, 'active')))
        .orderBy(asc(tourStops.stopOrder))
        .limit(1);

      let updatedTour = tour;
      if (tour.status !== 'in_progress') {
        [updatedTour] = await tx
          .update(tours)
          .set({
            status: 'in_progress',
            startedAt: tour.startedAt ?? new Date(),
            updatedAt: new Date(),
          })
          .where(eq(tours.id, tourId))
          .returning();
      }

      const [firstPendingStop] = await tx
        .select()
        .from(tourStops)
        .where(and(eq(tourStops.tourId, tourId), eq(tourStops.status, 'pending')))
        .orderBy(asc(tourStops.stopOrder))
        .limit(1);

      const activeStopId = activeStop?.id ?? firstPendingStop?.id ?? null;

      if (!activeStop && firstPendingStop) {
        await tx
          .update(tourStops)
          .set({ status: 'active', updatedAt: new Date() })
          .where(eq(tourStops.id, firstPendingStop.id));
      }

      if (tour.status !== 'in_progress') {
        await tx.insert(auditLogs).values({
          userId: actorUserId,
          action: 'tour_started',
          resourceType: 'tours',
          resourceId: tourId,
          oldValues: null,
          newValues: {
            firstActiveStopId: activeStopId,
          },
        });
      }

      return {
        ...updatedTour,
        firstActiveStopId: activeStopId,
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

      if (this.isTerminalStatus(tour.status)) {
        throw new BadRequestException('This tour has already been completed.');
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

      if (stop.status === 'completed') {
        const [existingActiveStop] = await tx
          .select()
          .from(tourStops)
          .where(and(eq(tourStops.tourId, tourId), eq(tourStops.status, 'active')))
          .orderBy(asc(tourStops.stopOrder))
          .limit(1);

        return {
          event: null,
          validatedStopId: stop.id,
          nextStopId: existingActiveStop?.id ?? null,
          alreadyValidated: true,
        };
      }

      if (stop.status !== 'active') {
        throw new BadRequestException('Only the active stop can be validated.');
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
          .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
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

      const [createdAlert] = await tx
        .insert(alertEvents)
        .values({
          ruleId: null,
          containerId: null,
          zoneId: tour.zoneId,
          eventType: 'anomaly_reported',
          severity: createdReport.severity,
          triggeredAt: createdReport.reportedAt,
          currentStatus: 'open',
          acknowledgedByUserId: null,
          payloadSnapshot: {
            anomalyReportId: createdReport.id,
            anomalyTypeCode: anomalyType.code,
            tourId,
            tourStopId: createdReport.tourStopId,
          },
        })
        .returning();

      const normalizedSeverity = this.normalizeStatus(createdReport.severity);
      if (normalizedSeverity === 'high' || normalizedSeverity === 'critical') {
        const [createdNotification] = await tx
          .insert(notifications)
          .values({
            eventType: 'anomaly_reported',
            entityType: 'alert_event',
            entityId: createdAlert?.id ?? createdReport.id,
            audienceScope: 'role:manager',
            title: `Anomaly reported on ${tour.name}`,
            body: createdReport.comments ?? anomalyType.label,
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
      }

      return {
        ...createdReport,
        managerAlertTriggered: true,
        alertEventId: createdAlert?.id ?? null,
      };
    });
  }

  async getTourActivity(tourId: string) {
    const [tour] = await this.db.select().from(tours).where(eq(tours.id, tourId)).limit(1);
    if (!tour) {
      throw new NotFoundException('Tour not found');
    }

    const [collectionRows, anomalyRows, auditRows] = await Promise.all([
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
      this.db
        .select({
          id: auditLogs.id,
          createdAt: auditLogs.createdAt,
          type: sql<string>`'tour_started'`,
          details: sql`jsonb_build_object('action', ${auditLogs.action})`,
          actorDisplayName: users.displayName,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(
          and(
            eq(auditLogs.resourceType, 'tours'),
            eq(auditLogs.resourceId, tourId),
            eq(auditLogs.action, 'tour_started'),
          ),
        ),
    ]);

    return [...collectionRows, ...anomalyRows, ...auditRows].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  }

  async getLatestCollectionEventForStop(tourStopId: string) {
    const [event] = await this.db
      .select()
      .from(collectionEvents)
      .where(eq(collectionEvents.tourStopId, tourStopId))
      .orderBy(desc(collectionEvents.collectedAt))
      .limit(1);

    return event ?? null;
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

  private selectActionableTour<
    T extends {
      status: string;
      scheduledFor: Date;
      startedAt?: Date | null;
      updatedAt?: Date | null;
    },
  >(assignedTours: T[]) {
    const nonTerminalTours = assignedTours.filter((tour) => !this.isTerminalStatus(tour.status));
    if (nonTerminalTours.length === 0) {
      return null;
    }

    const activeTours = nonTerminalTours.filter(
      (tour) => this.normalizeStatus(tour.status) === 'in_progress',
    );
    const startedActiveTours = activeTours.filter((tour) => tour.startedAt != null);
    if (startedActiveTours.length > 0) {
      return [...startedActiveTours].sort(
        (left, right) => this.resolveActiveTourSortTime(right) - this.resolveActiveTourSortTime(left),
      )[0];
    }

    const now = Date.now();
    const upcomingTours = nonTerminalTours
      .filter(
        (tour) =>
          this.normalizeStatus(tour.status) !== 'in_progress' &&
          new Date(tour.scheduledFor).getTime() >= now,
      )
      .sort(
        (left, right) =>
          new Date(left.scheduledFor).getTime() - new Date(right.scheduledFor).getTime(),
      );
    if (upcomingTours.length > 0) {
      return upcomingTours[0];
    }

    if (activeTours.length > 0) {
      return [...activeTours].sort(
        (left, right) => this.resolveActiveTourSortTime(right) - this.resolveActiveTourSortTime(left),
      )[0];
    }

    return [...nonTerminalTours].sort(
      (left, right) =>
        new Date(right.scheduledFor).getTime() - new Date(left.scheduledFor).getTime(),
    )[0];
  }

  private resolveActiveTourSortTime(
    tour: Readonly<{
      scheduledFor: Date;
      startedAt?: Date | null;
      updatedAt?: Date | null;
    }>,
  ) {
    return new Date(tour.startedAt ?? tour.updatedAt ?? tour.scheduledFor).getTime();
  }

  private buildRouteSummary(
    scheduledFor: Date,
    stops: Array<{
      status: string;
      stopOrder: number;
      latitude?: string | null;
      longitude?: string | null;
    }>,
  ) {
    const totalStops = stops.length;
    const completedStops = stops.filter((stop) => this.normalizeStatus(stop.status) === 'completed').length;
    const activeStop =
      stops.find((stop) => this.normalizeStatus(stop.status) === 'active') ??
      stops.find((stop) => this.normalizeStatus(stop.status) === 'pending') ??
      null;
    const remainingStops = Math.max(0, totalStops - completedStops);
    const totalDistanceKm = this.computeRouteDistanceKm(stops);

    return {
      totalStops,
      completedStops,
      remainingStops,
      activeStopOrder: activeStop?.stopOrder ?? null,
      completionPercent: totalStops === 0 ? 0 : Math.round((completedStops / totalStops) * 100),
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      estimatedDurationMinutes: Math.round(
        (totalDistanceKm / AVERAGE_ROUTE_SPEED_KMH) * 60 + totalStops * STOP_SERVICE_DURATION_MINUTES,
      ),
      isOverdue: new Date(scheduledFor).getTime() < Date.now(),
    };
  }

  private computeRouteDistanceKm(
    stops: Array<{
      latitude?: string | null;
      longitude?: string | null;
    }>,
  ) {
    if (stops.length <= 1) {
      return 0;
    }

    let total = 0;
    for (let index = 1; index < stops.length; index += 1) {
      total += this.distanceBetweenStops(stops[index - 1], stops[index]);
    }

    return total;
  }

  private distanceBetweenStops(
    fromStop: { latitude?: string | null; longitude?: string | null },
    toStop: { latitude?: string | null; longitude?: string | null },
  ) {
    const from = this.toLatLngPoint(fromStop);
    const to = this.toLatLngPoint(toStop);

    if (
      from.latitude == null ||
      from.longitude == null ||
      to.latitude == null ||
      to.longitude == null
    ) {
      return 0;
    }

    const dLat = this.toRadians(to.latitude - from.latitude);
    const dLng = this.toRadians(to.longitude - from.longitude);
    const lat1 = this.toRadians(from.latitude);
    const lat2 = this.toRadians(to.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_KM * c;
  }

  private toLatLngPoint(stop: { latitude?: string | null; longitude?: string | null }): LatLngPoint {
    const latitude = stop.latitude == null ? null : Number(stop.latitude);
    const longitude = stop.longitude == null ? null : Number(stop.longitude);

    return {
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
    };
  }

  private toRadians(value: number) {
    return (value * Math.PI) / 180;
  }

  private normalizeStatus(status: string | null | undefined) {
    return status?.trim().toLowerCase() ?? '';
  }

  private isTerminalStatus(status: string | null | undefined) {
    return TERMINAL_TOUR_STATUSES.has(this.normalizeStatus(status));
  }
}

