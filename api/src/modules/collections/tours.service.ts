import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { withActiveSpan } from '../../observability/tracing.helpers.js';

import type { CreateTourDto } from './dto/create-tour.dto.js';
import type { ReportAnomalyDto } from './dto/report-anomaly.dto.js';
import type { UpdateTourDto } from './dto/update-tour.dto.js';
import type { ValidateTourStopDto } from './dto/validate-tour-stop.dto.js';
import { RoutingClient } from './routing/routing.client.js';
import type { ToursRouteCoordinationPort } from './tours.contract.js';
import { ToursRepository } from './tours.repository.js';

type TourListFilters = {
  search?: string;
  status?: string;
  zoneId?: string;
  limit: number;
  offset: number;
};

type AgentTourStop = {
  id: string;
  stopOrder: number;
  status: string;
  eta?: string | Date | null;
  completedAt?: string | Date | null;
  containerId: string;
  containerCode: string;
  containerLabel: string;
  latitude?: string | null;
  longitude?: string | null;
};

type GeoJsonLineString = {
  type: 'LineString';
  coordinates: Array<[number, number]>;
};

type RouteGeometrySummary = {
  geometry: GeoJsonLineString;
  distanceKm: number | null;
  durationMinutes: number | null;
  source: 'live' | 'fallback';
  provider: string;
  resolvedAt: string;
};

type PersistedRouteRecord = {
  id: string;
  tourId: string;
  geometry: GeoJsonLineString;
  distanceMeters: number | null;
  durationMinutes: number | null;
  source: string;
  provider: string;
  resolvedAt: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type AgentTourRecord = {
  id: string;
  name: string;
  status: string;
  scheduledFor: Date;
  zoneId?: string | null;
  zoneName?: string | null;
  updatedAt?: Date;
  stops: AgentTourStop[];
  itinerary: Array<{
    stopId: string;
    order: number;
    status: string;
    eta?: string | Date | null;
    latitude?: string | null;
    longitude?: string | null;
  }>;
  routeSummary: {
    totalStops: number;
    completedStops: number;
    remainingStops: number;
    activeStopOrder?: number | null;
    completionPercent: number;
    totalDistanceKm: number;
    estimatedDurationMinutes: number;
    isOverdue: boolean;
  };
  storedRoute?: PersistedRouteRecord | null;
};

type NormalizedRouteStop = {
  stopOrder: number;
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_KM = 6371;
const AVERAGE_ROUTE_SPEED_KMH = 24;
const STOP_SERVICE_DURATION_MINUTES = 4;
const MAX_ROUTE_ENDPOINT_DRIFT_KM = 0.5;

@Injectable()
export class ToursService implements ToursRouteCoordinationPort {
  constructor(
    private readonly repository: ToursRepository,
    private readonly routingClient: RoutingClient,
  ) {}

  async list(filters: TourListFilters) {
    return this.repository.list(filters);
  }

  async create(dto: CreateTourDto) {
    const createdTour = await this.repository.create(dto);
    const routeGeometry = await this.persistRouteForTour(createdTour.id);

    return routeGeometry
      ? {
          ...createdTour,
          routeGeometry,
        }
      : createdTour;
  }

  async getAgentTour(agentUserId: string) {
    const tour = (await this.repository.getAgentTour(agentUserId)) as AgentTourRecord | null;
    if (!tour) {
      return null;
    }

    if (this.shouldUseStoredRoute(tour.storedRoute ?? null, tour.stops)) {
      const storedRoute = this.mapStoredRoute(tour.storedRoute ?? null);
      if (storedRoute) {
        return this.attachRouteGeometry(tour, storedRoute);
      }
    }

    const persistedRoute = await this.persistRouteForTour(tour.id, tour.stops);
    return persistedRoute ? this.attachRouteGeometry(tour, persistedRoute) : this.stripStoredRoute(tour);
  }

  async startTour(tourId: string, actorUserId: string) {
    return this.repository.startTour(tourId, actorUserId);
  }

  async validateStop(tourId: string, stopId: string, actorUserId: string, dto: ValidateTourStopDto) {
    return withActiveSpan(
      'collections.tour.validate_stop',
      () => this.repository.validateStop(tourId, stopId, actorUserId, dto),
      {
        attributes: {
          'tour.id': tourId,
          'tour.stop_id': stopId,
          'tour.actor_user_id': actorUserId,
          'tour.volume_liters': dto.volumeLiters,
          'tour.has_qr_code': Boolean(dto.qrCode),
        },
      },
    );
  }

  async listAnomalyTypes() {
    return this.repository.listAnomalyTypes();
  }

  async reportAnomaly(tourId: string, actorUserId: string, dto: ReportAnomalyDto) {
    return this.repository.reportAnomaly(tourId, actorUserId, dto);
  }

  async getTourActivity(tourId: string) {
    return this.repository.getTourActivity(tourId);
  }

  async update(id: string, dto: UpdateTourDto) {
    const updatedTour = await this.repository.update(id, dto);

    if (Array.isArray(dto.stopContainerIds) && dto.stopContainerIds.length > 0) {
      await this.persistRouteForTour(id);
    }

    return updatedTour;
  }

  async rebuildRoute(tourId: string, actorUserId: string) {
    return withActiveSpan(
      'collections.tour.rebuild_route',
      async () => {
        const tour = await this.repository.getTourById(tourId);
        if (!tour) {
          throw new NotFoundException('Tour not found');
        }

        const routeGeometry = await this.persistRouteForTour(tourId);
        if (!routeGeometry) {
          throw new BadRequestException(
            'This tour does not have enough mapped stop coordinates to rebuild a route.',
          );
        }

        await this.repository.recordRouteRebuildAuditLog(tourId, actorUserId, {
          source: routeGeometry.source,
          provider: routeGeometry.provider,
          distanceMeters: this.toDistanceMeters(routeGeometry.distanceKm),
          durationMinutes: routeGeometry.durationMinutes,
          resolvedAt: routeGeometry.resolvedAt,
        });

        return {
          tourId,
          routeGeometry,
        };
      },
      {
        attributes: {
          'tour.id': tourId,
          'tour.actor_user_id': actorUserId,
        },
      },
    );
  }

  async ensureRouteForTour(tourId: string) {
    await this.persistRouteForTour(tourId);
  }

  async persistRouteForTour(tourId: string, preloadedStops?: AgentTourStop[]) {
    const stops = preloadedStops ?? ((await this.repository.getTourRouteStops(tourId)) as AgentTourStop[]);
    const resolvedRoute = await this.resolveRouteGeometry(stops);

    if (!resolvedRoute) {
      return null;
    }

    const storedRoute = await this.repository.upsertTourRoute({
      tourId,
      geometry: resolvedRoute.geometry,
      distanceMeters: this.toDistanceMeters(resolvedRoute.distanceKm),
      durationMinutes: resolvedRoute.durationMinutes,
      source: resolvedRoute.source,
      provider: resolvedRoute.provider,
      resolvedAt: new Date(resolvedRoute.resolvedAt),
    });

    return this.mapStoredRoute(storedRoute);
  }

  private stripStoredRoute(tour: AgentTourRecord) {
    const { storedRoute, ...tourWithoutStoredRoute } = tour;
    void storedRoute;
    return tourWithoutStoredRoute;
  }

  private attachRouteGeometry(tour: AgentTourRecord, routeGeometry: RouteGeometrySummary) {
    const tourWithoutStoredRoute = this.stripStoredRoute(tour);

    return {
      ...tourWithoutStoredRoute,
      routeGeometry,
      routeSummary: {
        ...tour.routeSummary,
        totalDistanceKm: routeGeometry.distanceKm ?? tour.routeSummary.totalDistanceKm,
        estimatedDurationMinutes:
          routeGeometry.durationMinutes ?? tour.routeSummary.estimatedDurationMinutes,
      },
    };
  }

  private mapStoredRoute(storedRoute: PersistedRouteRecord | null) {
    if (!storedRoute) {
      return null;
    }

    return {
      geometry: storedRoute.geometry,
      distanceKm: this.toDistanceKm(storedRoute.distanceMeters),
      durationMinutes: storedRoute.durationMinutes ?? null,
      source: storedRoute.source === 'live' ? 'live' : 'fallback',
      provider: storedRoute.provider,
      resolvedAt: new Date(storedRoute.resolvedAt).toISOString(),
    } satisfies RouteGeometrySummary;
  }

  private isStoredRouteUsable(
    storedRoute: PersistedRouteRecord | null,
    stops: AgentTourStop[],
  ) {
    if (!storedRoute) {
      return false;
    }

    const normalizedStops = this.normalizeRouteStops(stops);
    if (normalizedStops.length === 0) {
      return false;
    }

    const coordinates = this.normalizeLineStringCoordinates(storedRoute.geometry);
    if (coordinates.length < 2) {
      return false;
    }

    const firstStop = normalizedStops[0];
    const lastStop = normalizedStops[normalizedStops.length - 1];
    const firstCoordinate = coordinates[0];
    const lastCoordinate = coordinates[coordinates.length - 1];

    return (
      this.isCoordinateNearStop(firstCoordinate, firstStop) &&
      this.isCoordinateNearStop(lastCoordinate, lastStop) &&
      normalizedStops.every((stop) =>
        coordinates.some((coordinate) => this.isCoordinateNearStop(coordinate, stop)),
      )
    );
  }

  private shouldUseStoredRoute(
    storedRoute: PersistedRouteRecord | null,
    stops: AgentTourStop[],
  ) {
    if (!this.isStoredRouteUsable(storedRoute, stops)) {
      return false;
    }

    if (!storedRoute) {
      return false;
    }

    const normalizedSource = storedRoute.source.trim().toLowerCase();
    const normalizedProvider = storedRoute.provider.trim().toLowerCase();

    if (normalizedSource !== 'live' && normalizedProvider === 'seed') {
      return false;
    }

    return true;
  }

  private toDistanceKm(distanceMeters: number | null | undefined) {
    if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters)) {
      return null;
    }

    return Number((distanceMeters / 1000).toFixed(2));
  }

  private toDistanceMeters(distanceKm: number | null | undefined) {
    if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm)) {
      return null;
    }

    return Math.max(0, Math.round(distanceKm * 1000));
  }

  private normalizeRouteStops(stops: AgentTourStop[]): NormalizedRouteStop[] {
    return stops
      .map((stop) => {
        const latitude = stop.latitude == null ? Number.NaN : Number(stop.latitude);
        const longitude = stop.longitude == null ? Number.NaN : Number(stop.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return null;
        }

        return {
          stopOrder: stop.stopOrder,
          latitude,
          longitude,
        } satisfies NormalizedRouteStop;
      })
      .filter((stop): stop is NormalizedRouteStop => stop != null)
      .sort((left, right) => left.stopOrder - right.stopOrder);
  }

  private normalizeLineStringCoordinates(geometry: GeoJsonLineString | null | undefined) {
    if (geometry?.type !== 'LineString' || !Array.isArray(geometry.coordinates)) {
      return [] as Array<[number, number]>;
    }

    return geometry.coordinates.filter(
      (coordinate): coordinate is [number, number] =>
        Array.isArray(coordinate) &&
        coordinate.length >= 2 &&
        Number.isFinite(coordinate[0]) &&
        Number.isFinite(coordinate[1]) &&
        Math.abs(coordinate[0]) <= 180 &&
        Math.abs(coordinate[1]) <= 90,
    );
  }

  private buildFallbackRouteGeometry(stops: NormalizedRouteStop[]): RouteGeometrySummary | null {
    if (stops.length === 0) {
      return null;
    }

    const totalDistanceKm = this.computeFallbackRouteDistanceKm(stops);
    const estimatedDurationMinutes = Math.max(
      STOP_SERVICE_DURATION_MINUTES,
      Math.round(
        (totalDistanceKm / AVERAGE_ROUTE_SPEED_KMH) * 60 + stops.length * STOP_SERVICE_DURATION_MINUTES,
      ),
    );
    const coordinates: Array<[number, number]> =
      stops.length === 1
        ? [
            [stops[0].longitude, stops[0].latitude] as [number, number],
            [stops[0].longitude, stops[0].latitude] as [number, number],
          ]
        : stops.map((stop) => [stop.longitude, stop.latitude] as [number, number]);

    return {
      geometry: {
        type: 'LineString',
        coordinates,
      },
      distanceKm: Number(totalDistanceKm.toFixed(2)),
      durationMinutes: estimatedDurationMinutes,
      source: 'fallback',
      provider: 'internal',
      resolvedAt: new Date().toISOString(),
    };
  }

  private async resolveRouteGeometry(stops: AgentTourStop[]): Promise<RouteGeometrySummary | null> {
    const normalizedStops = this.normalizeRouteStops(stops);
    if (normalizedStops.length === 0) {
      return null;
    }

    if (normalizedStops.length === 1) {
      return this.buildFallbackRouteGeometry(normalizedStops);
    }

    const routeResult = await this.routingClient.fetchRoute(normalizedStops);

    if (routeResult) {
      return routeResult;
    }

    return this.buildFallbackRouteGeometry(normalizedStops);
  }

  private computeFallbackRouteDistanceKm(stops: NormalizedRouteStop[]) {
    if (stops.length <= 1) {
      return 0;
    }

    let totalDistanceKm = 0;
    for (let index = 1; index < stops.length; index += 1) {
      totalDistanceKm += this.distanceBetweenRouteStops(stops[index - 1], stops[index]);
    }

    return totalDistanceKm;
  }

  private distanceBetweenRouteStops(fromStop: NormalizedRouteStop, toStop: NormalizedRouteStop) {
    return this.distanceBetweenCoordinates(fromStop, toStop);
  }

  private isCoordinateNearStop(
    coordinate: [number, number],
    stop: NormalizedRouteStop,
  ) {
    const distanceKm = this.distanceBetweenCoordinates(
      {
        latitude: coordinate[1],
        longitude: coordinate[0],
      },
      stop,
    );

    return distanceKm <= MAX_ROUTE_ENDPOINT_DRIFT_KM;
  }

  private distanceBetweenCoordinates(
    fromPoint: { latitude: number; longitude: number },
    toPoint: { latitude: number; longitude: number },
  ) {
    const dLat = this.toRadians(toPoint.latitude - fromPoint.latitude);
    const dLng = this.toRadians(toPoint.longitude - fromPoint.longitude);
    const lat1 = this.toRadians(fromPoint.latitude);
    const lat2 = this.toRadians(toPoint.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_KM * c;
  }

  private toRadians(value: number) {
    return (value * Math.PI) / 180;
  }
}

