import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoutingClient } from '../modules/collections/routing/routing.client.js';
import { ToursService } from '../modules/collections/tours.service.js';

describe('ToursService route geometry enrichment', () => {
  const repositoryMock = {
    getAgentTour: vi.fn(),
    getTourRouteStops: vi.fn(),
    getTourById: vi.fn(),
    recordRouteRebuildAuditLog: vi.fn(),
    upsertTourRoute: vi.fn(),
  };

  const createRoutingClientMock = () => ({
    fetchRoute: vi.fn(),
    getCircuitState: vi.fn().mockReturnValue('closed'),
    getMetrics: vi.fn().mockReturnValue({
      state: 'closed',
      failures: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      consecutiveSuccesses: 0,
    }),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMock.getTourById.mockResolvedValue(null);
    repositoryMock.upsertTourRoute.mockImplementation(async (route: any) => ({
      id: 'route-1',
      tourId: route.tourId,
      geometry: route.geometry,
      distanceMeters: route.distanceMeters ?? null,
      durationMinutes: route.durationMinutes ?? null,
      source: route.source,
      provider: route.provider,
      resolvedAt: route.resolvedAt,
      createdAt: route.resolvedAt,
      updatedAt: route.resolvedAt,
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createService = (routingClientMock: ReturnType<typeof createRoutingClientMock>) => {
    return new ToursService(
      {} as any,
      {
        getAgentTour: repositoryMock.getAgentTour,
        getTourById: repositoryMock.getTourById,
        getTourRouteStops: repositoryMock.getTourRouteStops,
      } as any,
      repositoryMock as any,
      routingClientMock as unknown as RoutingClient,
    );
  };

  it('returns API-owned road geometry and overrides route metrics when routing succeeds', async () => {
    repositoryMock.getAgentTour.mockResolvedValue({
      id: 'tour-1',
      name: 'Downtown Morning Round',
      status: 'planned',
      scheduledFor: new Date('2026-03-02T09:00:00.000Z'),
      zoneName: 'Downtown',
      stops: [
        {
          id: 'stop-1',
          stopOrder: 1,
          status: 'active',
          containerId: 'container-1',
          containerCode: 'CTR-1001',
          containerLabel: 'Main Square',
          latitude: '48.8566',
          longitude: '2.3522',
        },
        {
          id: 'stop-2',
          stopOrder: 2,
          status: 'pending',
          containerId: 'container-2',
          containerCode: 'CTR-1002',
          containerLabel: 'Library Avenue',
          latitude: '48.8589',
          longitude: '2.3540',
        },
      ],
      itinerary: [],
      routeSummary: {
        totalStops: 2,
        completedStops: 0,
        remainingStops: 2,
        activeStopOrder: 1,
        completionPercent: 0,
        totalDistanceKm: 0.4,
        estimatedDurationMinutes: 6,
        isOverdue: false,
      },
      storedRoute: null,
    });
    const routingClientMock = createRoutingClientMock();
    routingClientMock.fetchRoute.mockResolvedValue({
      geometry: {
        type: 'LineString',
        coordinates: [
          [2.3522, 48.8566],
          [2.3531, 48.8573],
          [2.354, 48.8589],
        ],
      },
      distanceKm: 0.78,
      durationMinutes: 5,
      source: 'live',
      provider: 'router.example.test',
      resolvedAt: '2026-03-02T09:00:00.000Z',
    });

    const service = createService(routingClientMock);
    const result = await service.getAgentTour('agent-1');

    expect(routingClientMock.fetchRoute).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        routeGeometry: expect.objectContaining({
          geometry: {
            type: 'LineString',
            coordinates: [
              [2.3522, 48.8566],
              [2.3531, 48.8573],
              [2.354, 48.8589],
            ],
          },
          distanceKm: 0.78,
          durationMinutes: 5,
          source: 'live',
          provider: 'router.example.test',
        }),
        routeSummary: expect.objectContaining({
          totalDistanceKm: 0.78,
          estimatedDurationMinutes: 5,
        }),
      }),
    );
  });

  it('prepends the zone depot when resolving persisted route geometry', async () => {
    repositoryMock.getAgentTour.mockResolvedValue({
      id: 'tour-1',
      name: 'Downtown Morning Round',
      status: 'planned',
      scheduledFor: new Date('2026-03-02T09:00:00.000Z'),
      zoneId: 'zone-1',
      zoneName: 'Downtown',
      depot: {
        label: 'Downtown Depot',
        latitude: '48.8558',
        longitude: '2.3514',
      },
      stops: [
        {
          id: 'stop-1',
          stopOrder: 1,
          status: 'active',
          containerId: 'container-1',
          containerCode: 'CTR-1001',
          containerLabel: 'Main Square',
          latitude: '48.8566',
          longitude: '2.3522',
        },
        {
          id: 'stop-2',
          stopOrder: 2,
          status: 'pending',
          containerId: 'container-2',
          containerCode: 'CTR-1002',
          containerLabel: 'Library Avenue',
          latitude: '48.8589',
          longitude: '2.3540',
        },
      ],
      itinerary: [],
      routeSummary: {
        totalStops: 2,
        completedStops: 0,
        remainingStops: 2,
        activeStopOrder: 1,
        completionPercent: 0,
        totalDistanceKm: 0.4,
        estimatedDurationMinutes: 6,
        isOverdue: false,
      },
      storedRoute: null,
    });
    repositoryMock.getTourById.mockResolvedValue({
      id: 'tour-1',
      depot: {
        label: 'Downtown Depot',
        latitude: '48.8558',
        longitude: '2.3514',
      },
    });
    const routingClientMock = createRoutingClientMock();
    routingClientMock.fetchRoute.mockResolvedValue({
      geometry: {
        type: 'LineString',
        coordinates: [
          [2.3514, 48.8558],
          [2.3522, 48.8566],
          [2.354, 48.8589],
        ],
      },
      distanceKm: 0.88,
      durationMinutes: 6,
      source: 'live',
      provider: 'router.example.test',
      resolvedAt: '2026-03-02T09:00:00.000Z',
    });

    const service = createService(routingClientMock);
    const result = await service.getAgentTour('agent-1');

    expect(routingClientMock.fetchRoute).toHaveBeenCalledWith([
      { latitude: 48.8558, longitude: 2.3514 },
      { stopOrder: 1, latitude: 48.8566, longitude: 2.3522 },
      { stopOrder: 2, latitude: 48.8589, longitude: 2.354 },
    ]);
    expect(result).toEqual(
      expect.objectContaining({
        routeGeometry: expect.objectContaining({
          geometry: {
            type: 'LineString',
            coordinates: [
              [2.3514, 48.8558],
              [2.3522, 48.8566],
              [2.354, 48.8589],
            ],
          },
          distanceKm: 0.88,
          durationMinutes: 6,
        }),
      }),
    );
  });

  it('falls back to a straight LineString when routing fails', async () => {
    repositoryMock.getAgentTour.mockResolvedValue({
      id: 'tour-1',
      name: 'Downtown Morning Round',
      status: 'planned',
      scheduledFor: new Date('2026-03-02T09:00:00.000Z'),
      zoneName: 'Downtown',
      stops: [
        {
          id: 'stop-1',
          stopOrder: 1,
          status: 'active',
          containerId: 'container-1',
          containerCode: 'CTR-1001',
          containerLabel: 'Main Square',
          latitude: '48.8566',
          longitude: '2.3522',
        },
        {
          id: 'stop-2',
          stopOrder: 2,
          status: 'pending',
          containerId: 'container-2',
          containerCode: 'CTR-1002',
          containerLabel: 'Library Avenue',
          latitude: '48.8589',
          longitude: '2.3540',
        },
      ],
      itinerary: [],
      routeSummary: {
        totalStops: 2,
        completedStops: 0,
        remainingStops: 2,
        activeStopOrder: 1,
        completionPercent: 0,
        totalDistanceKm: 0.4,
        estimatedDurationMinutes: 6,
        isOverdue: false,
      },
      storedRoute: null,
    });

    const routingClientMock = createRoutingClientMock();
    routingClientMock.fetchRoute.mockResolvedValue(null);

    const service = createService(routingClientMock);
    const result = await service.getAgentTour('agent-1');
    const fallbackRoute = (result as any)?.routeGeometry;

    expect(routingClientMock.fetchRoute).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        routeGeometry: expect.objectContaining({
          geometry: {
            type: 'LineString',
            coordinates: [
              [2.3522, 48.8566],
              [2.354, 48.8589],
            ],
          },
          source: 'fallback',
          provider: 'internal',
        }),
      }),
    );
    expect(fallbackRoute.distanceKm).toBeGreaterThan(0);
    expect(fallbackRoute.durationMinutes).toBeGreaterThan(0);
    expect((result as any)?.routeSummary).toEqual(
      expect.objectContaining({
        totalDistanceKm: fallbackRoute.distanceKm,
        estimatedDurationMinutes: fallbackRoute.durationMinutes,
      }),
    );
  });

  it('returns null when fallback geometry has no depot or mapped stops', () => {
    const service = createService(createRoutingClientMock());

    expect((service as any).buildFallbackRouteGeometry([], null)).toBeNull();
  });

  it('returns null when a route cannot normalize any stop coordinates', async () => {
    repositoryMock.getTourById.mockResolvedValue(null);
    const routingClientMock = createRoutingClientMock();
    const service = createService(routingClientMock);

    const result = await service.persistRouteForTour('tour-1', [
      {
        id: 'stop-1',
        stopOrder: 1,
        status: 'pending',
        containerId: 'container-1',
        containerCode: 'CTR-1001',
        containerLabel: 'Main Square',
        latitude: null,
        longitude: null,
      },
    ]);

    expect(result).toBeNull();
    expect(routingClientMock.fetchRoute).not.toHaveBeenCalled();
    expect(repositoryMock.upsertTourRoute).not.toHaveBeenCalled();
  });

  it('persists a zero-distance fallback route when only one mapped stop is available', async () => {
    repositoryMock.getTourById.mockResolvedValue(null);
    const routingClientMock = createRoutingClientMock();
    const service = createService(routingClientMock);

    const result = await service.persistRouteForTour('tour-1', [
      {
        id: 'stop-1',
        stopOrder: 1,
        status: 'pending',
        containerId: 'container-1',
        containerCode: 'CTR-1001',
        containerLabel: 'Main Square',
        latitude: '48.8566',
        longitude: '2.3522',
      },
    ]);

    expect(routingClientMock.fetchRoute).not.toHaveBeenCalled();
    expect(repositoryMock.upsertTourRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        tourId: 'tour-1',
        distanceMeters: 0,
        durationMinutes: 4,
        source: 'fallback',
        provider: 'internal',
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        geometry: {
          type: 'LineString',
          coordinates: [
            [2.3522, 48.8566],
            [2.3522, 48.8566],
          ],
        },
        distanceKm: 0,
        durationMinutes: 4,
        source: 'fallback',
        provider: 'internal',
      }),
    );
  });

  it('uses the stored route without calling the routing provider when persistence already exists', async () => {
    repositoryMock.getAgentTour.mockResolvedValue({
      id: 'tour-1',
      name: 'Downtown Morning Round',
      status: 'planned',
      scheduledFor: new Date('2026-03-02T09:00:00.000Z'),
      zoneName: 'Downtown',
      stops: [
        {
          id: 'stop-1',
          stopOrder: 1,
          status: 'active',
          containerId: 'container-1',
          containerCode: 'CTR-1001',
          containerLabel: 'Main Square',
          latitude: '48.8566',
          longitude: '2.3522',
        },
        {
          id: 'stop-2',
          stopOrder: 2,
          status: 'pending',
          containerId: 'container-2',
          containerCode: 'CTR-1002',
          containerLabel: 'Library Avenue',
          latitude: '48.8589',
          longitude: '2.3540',
        },
      ],
      itinerary: [],
      routeSummary: {
        totalStops: 2,
        completedStops: 0,
        remainingStops: 2,
        activeStopOrder: 1,
        completionPercent: 0,
        totalDistanceKm: 0.4,
        estimatedDurationMinutes: 6,
        isOverdue: false,
      },
      storedRoute: {
        id: 'route-1',
        tourId: 'tour-1',
        geometry: {
          type: 'LineString',
          coordinates: [
            [2.3522, 48.8566],
            [2.3531, 48.8573],
            [2.354, 48.8589],
          ],
        },
        distanceMeters: 780,
        durationMinutes: 5,
        source: 'live',
        provider: 'router.example.test',
        resolvedAt: '2026-03-02T09:00:00.000Z',
        createdAt: '2026-03-02T09:00:00.000Z',
        updatedAt: '2026-03-02T09:00:00.000Z',
      },
    });

    const routingClientMock = createRoutingClientMock();

    const service = createService(routingClientMock);
    const result = await service.getAgentTour('agent-1');

    expect(routingClientMock.fetchRoute).not.toHaveBeenCalled();
    expect(repositoryMock.upsertTourRoute).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        routeGeometry: expect.objectContaining({
          distanceKm: 0.78,
          durationMinutes: 5,
          source: 'live',
          provider: 'router.example.test',
        }),
      }),
    );
  });

  it('refreshes a seeded fallback route on agent read when live routing is available', async () => {
    repositoryMock.getAgentTour.mockResolvedValue({
      id: 'tour-1',
      name: 'Downtown Morning Round',
      status: 'planned',
      scheduledFor: new Date('2026-03-02T09:00:00.000Z'),
      zoneName: 'Downtown',
      stops: [
        {
          id: 'stop-1',
          stopOrder: 1,
          status: 'active',
          containerId: 'container-1',
          containerCode: 'CTR-1001',
          containerLabel: 'Main Square',
          latitude: '48.8566',
          longitude: '2.3522',
        },
        {
          id: 'stop-2',
          stopOrder: 2,
          status: 'pending',
          containerId: 'container-2',
          containerCode: 'CTR-1002',
          containerLabel: 'Library Avenue',
          latitude: '48.8589',
          longitude: '2.3540',
        },
      ],
      itinerary: [],
      routeSummary: {
        totalStops: 2,
        completedStops: 0,
        remainingStops: 2,
        activeStopOrder: 1,
        completionPercent: 0,
        totalDistanceKm: 0.4,
        estimatedDurationMinutes: 6,
        isOverdue: false,
      },
      storedRoute: {
        id: 'route-1',
        tourId: 'tour-1',
        geometry: {
          type: 'LineString',
          coordinates: [
            [2.3522, 48.8566],
            [2.354, 48.8589],
          ],
        },
        distanceMeters: 400,
        durationMinutes: 6,
        source: 'fallback',
        provider: 'seed',
        resolvedAt: '2026-03-02T09:00:00.000Z',
        createdAt: '2026-03-02T09:00:00.000Z',
        updatedAt: '2026-03-02T09:00:00.000Z',
      },
    });
    const routingClientMock = createRoutingClientMock();
    routingClientMock.fetchRoute.mockResolvedValue({
      geometry: {
        type: 'LineString',
        coordinates: [
          [2.3522, 48.8566],
          [2.3531, 48.8573],
          [2.354, 48.8589],
        ],
      },
      distanceKm: 0.78,
      durationMinutes: 5,
      source: 'live',
      provider: 'router.example.test',
      resolvedAt: '2026-03-02T09:00:00.000Z',
    });

    const service = createService(routingClientMock);
    const result = await service.getAgentTour('agent-1');

    expect(routingClientMock.fetchRoute).toHaveBeenCalledTimes(1);
    // Regression lock: seeded fallback geometry must be overwritten with a live route as soon as routing succeeds.
    expect(repositoryMock.upsertTourRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        tourId: 'tour-1',
        source: 'live',
        provider: 'router.example.test',
        distanceMeters: 780,
        durationMinutes: 5,
        geometry: {
          type: 'LineString',
          coordinates: [
            [2.3522, 48.8566],
            [2.3531, 48.8573],
            [2.354, 48.8589],
          ],
        },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        routeGeometry: expect.objectContaining({
          source: 'live',
          provider: 'router.example.test',
          distanceKm: 0.78,
        }),
      }),
    );
  });

  it('rebuilds stale persisted geometry when the stored route no longer matches the stop coordinates', async () => {
    repositoryMock.getAgentTour.mockResolvedValue({
      id: 'tour-1',
      name: 'Downtown Morning Round',
      status: 'planned',
      scheduledFor: new Date('2026-03-02T09:00:00.000Z'),
      zoneName: 'Downtown',
      stops: [
        {
          id: 'stop-1',
          stopOrder: 1,
          status: 'active',
          containerId: 'container-1',
          containerCode: 'CTR-1001',
          containerLabel: 'Main Square',
          latitude: '48.8566',
          longitude: '2.3522',
        },
        {
          id: 'stop-2',
          stopOrder: 2,
          status: 'pending',
          containerId: 'container-2',
          containerCode: 'CTR-1002',
          containerLabel: 'Library Avenue',
          latitude: '48.8589',
          longitude: '2.3540',
        },
      ],
      itinerary: [],
      routeSummary: {
        totalStops: 2,
        completedStops: 0,
        remainingStops: 2,
        activeStopOrder: 1,
        completionPercent: 0,
        totalDistanceKm: 0.4,
        estimatedDurationMinutes: 6,
        isOverdue: false,
      },
      storedRoute: {
        id: 'route-1',
        tourId: 'tour-1',
        geometry: {
          type: 'LineString',
          coordinates: [
            [10.1815, 36.8065],
            [10.1892, 36.8151],
          ],
        },
        distanceMeters: 1400,
        durationMinutes: 8,
        source: 'live',
        provider: 'router.example.test',
        resolvedAt: '2026-03-02T09:00:00.000Z',
        createdAt: '2026-03-02T09:00:00.000Z',
        updatedAt: '2026-03-02T09:00:00.000Z',
      },
    });
    const routingClientMock = createRoutingClientMock();
    routingClientMock.fetchRoute.mockResolvedValue({
      geometry: {
        type: 'LineString',
        coordinates: [
          [2.3522, 48.8566],
          [2.3531, 48.8573],
          [2.354, 48.8589],
        ],
      },
      distanceKm: 0.78,
      durationMinutes: 5,
      source: 'live',
      provider: 'router.example.test',
      resolvedAt: '2026-03-02T09:00:00.000Z',
    });

    const service = createService(routingClientMock);
    const result = await service.getAgentTour('agent-1');

    expect(routingClientMock.fetchRoute).toHaveBeenCalledTimes(1);
    // Regression lock: stale persisted geometry must be replaced, not merely ignored in the response.
    expect(repositoryMock.upsertTourRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        tourId: 'tour-1',
        source: 'live',
        provider: 'router.example.test',
        distanceMeters: 780,
        durationMinutes: 5,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        routeGeometry: expect.objectContaining({
          geometry: {
            type: 'LineString',
            coordinates: [
              [2.3522, 48.8566],
              [2.3531, 48.8573],
              [2.354, 48.8589],
            ],
          },
          distanceKm: 0.78,
          durationMinutes: 5,
          source: 'live',
        }),
      }),
    );
  });

  it('rebuilds persisted geometry when a middle stop is no longer represented in the stored path', async () => {
    repositoryMock.getAgentTour.mockResolvedValue({
      id: 'tour-1',
      name: 'Downtown Morning Round',
      status: 'planned',
      scheduledFor: new Date('2026-03-02T09:00:00.000Z'),
      zoneName: 'Downtown',
      stops: [
        {
          id: 'stop-1',
          stopOrder: 1,
          status: 'active',
          containerId: 'container-1',
          containerCode: 'CTR-1001',
          containerLabel: 'Main Square',
          latitude: '48.8566',
          longitude: '2.3522',
        },
        {
          id: 'stop-2',
          stopOrder: 2,
          status: 'pending',
          containerId: 'container-2',
          containerCode: 'CTR-1002',
          containerLabel: 'Library Avenue',
          latitude: '48.8692',
          longitude: '2.3715',
        },
        {
          id: 'stop-3',
          stopOrder: 3,
          status: 'pending',
          containerId: 'container-3',
          containerCode: 'CTR-1003',
          containerLabel: 'Canal District',
          latitude: '48.8614',
          longitude: '2.3590',
        },
      ],
      itinerary: [],
      routeSummary: {
        totalStops: 3,
        completedStops: 0,
        remainingStops: 3,
        activeStopOrder: 1,
        completionPercent: 0,
        totalDistanceKm: 0.9,
        estimatedDurationMinutes: 9,
        isOverdue: false,
      },
      storedRoute: {
        id: 'route-1',
        tourId: 'tour-1',
        geometry: {
          type: 'LineString',
          coordinates: [
            [2.3522, 48.8566],
            [2.3524, 48.8568],
            [2.359, 48.8614],
          ],
        },
        distanceMeters: 900,
        durationMinutes: 9,
        source: 'live',
        provider: 'router.example.test',
        resolvedAt: '2026-03-02T09:00:00.000Z',
        createdAt: '2026-03-02T09:00:00.000Z',
        updatedAt: '2026-03-02T09:00:00.000Z',
      },
    });
    const routingClientMock = createRoutingClientMock();
    routingClientMock.fetchRoute.mockResolvedValue({
      geometry: {
        type: 'LineString',
        coordinates: [
          [2.3522, 48.8566],
          [2.3531, 48.8573],
          [2.3715, 48.8692],
          [2.3565, 48.8602],
          [2.359, 48.8614],
        ],
      },
      distanceKm: 1.04,
      durationMinutes: 7,
      source: 'live',
      provider: 'router.example.test',
      resolvedAt: '2026-03-02T09:00:00.000Z',
    });

    const service = createService(routingClientMock);
    const result = await service.getAgentTour('agent-1');

    expect(routingClientMock.fetchRoute).toHaveBeenCalledTimes(1);
    // Regression lock: every stop must remain represented in the stored geometry, not only the endpoints.
    expect(repositoryMock.upsertTourRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        tourId: 'tour-1',
        source: 'live',
        provider: 'router.example.test',
        distanceMeters: 1040,
        durationMinutes: 7,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        routeGeometry: expect.objectContaining({
          distanceKm: 1.04,
          durationMinutes: 7,
          source: 'live',
        }),
      }),
    );
  });

  it('rebuilds a persisted route and records an audit log', async () => {
    repositoryMock.getTourById.mockResolvedValue({
      id: 'tour-1',
      name: 'Downtown Morning Round',
    });
    repositoryMock.getTourRouteStops.mockResolvedValue([
      {
        id: 'stop-1',
        stopOrder: 1,
        status: 'active',
        containerId: 'container-1',
        containerCode: 'CTR-1001',
        containerLabel: 'Main Square',
        latitude: '48.8566',
        longitude: '2.3522',
      },
      {
        id: 'stop-2',
        stopOrder: 2,
        status: 'pending',
        containerId: 'container-2',
        containerCode: 'CTR-1002',
        containerLabel: 'Library Avenue',
        latitude: '48.8589',
        longitude: '2.3540',
      },
    ]);
    const routingClientMock = createRoutingClientMock();
    routingClientMock.fetchRoute.mockResolvedValue({
      geometry: {
        type: 'LineString',
        coordinates: [
          [2.3522, 48.8566],
          [2.3531, 48.8573],
          [2.354, 48.8589],
        ],
      },
      distanceKm: 0.78,
      durationMinutes: 5,
      source: 'live',
      provider: 'router.example.test',
      resolvedAt: '2026-03-02T09:00:00.000Z',
    });

    const service = createService(routingClientMock);
    const result = await service.rebuildRoute('tour-1', 'manager-1');

    expect(repositoryMock.recordRouteRebuildAuditLog).toHaveBeenCalledWith(
      'tour-1',
      'manager-1',
      expect.objectContaining({
        source: 'live',
        provider: 'router.example.test',
        distanceMeters: 780,
        durationMinutes: 5,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        tourId: 'tour-1',
        routeGeometry: expect.objectContaining({
          source: 'live',
          provider: 'router.example.test',
        }),
      }),
    );
  });
});

