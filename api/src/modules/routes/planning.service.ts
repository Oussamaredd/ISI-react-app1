import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';

import { withActiveSpan } from '../../observability/tracing.helpers.js';
import { AuthService } from '../auth/auth.service.js';
import type { RequestWithAuthUser } from '../auth/authorization.types.js';
import {
  TOURS_ROUTE_COORDINATION_PORT,
  type ToursRouteCoordinationPort,
} from '../collections/tours.contract.js';
import { MonitoringService } from '../monitoring/monitoring.service.js';

import type { CreatePlannedTourDto } from './dto/create-planned-tour.dto.js';
import type { GenerateReportDto } from './dto/generate-report.dto.js';
import type { OptimizeTourDto } from './dto/optimize-tour.dto.js';
import type { TriggerEmergencyCollectionDto } from './dto/trigger-emergency-collection.dto.js';
import { PlanningRepository } from './planning.repository.js';

export type PlanningStreamEvent = {
  id: string;
  event: string;
  data: Record<string, unknown>;
};

export type PlanningRealtimeDiagnostics = {
  activeSseConnections: number;
  activeWebSocketConnections: number;
  counters: {
    sseConnected: number;
    sseDisconnected: number;
    wsConnected: number;
    wsDisconnected: number;
    wsAuthFailures: number;
    emittedEvents: number;
  };
  lastEventTimestamp: string | null;
  lastEventName: string | null;
};

type PlanningStreamListener = (event: PlanningStreamEvent) => void;

const REALTIME_EVENT_NAMES = {
  dashboardSnapshot: 'planning.dashboard.snapshot',
  containerCritical: 'planning.container.critical',
  emergencyCreated: 'planning.emergency.created',
  tourUpdated: 'planning.tour.updated',
} as const;

const STREAM_EVENT_BUFFER_SIZE = 200;
const STREAM_SESSION_ALLOWED_ROLES = new Set(['manager', 'admin', 'super_admin']);

@Injectable()
export class PlanningService {
  private readonly logger = new Logger(PlanningService.name);
  private readonly streamListeners = new Set<PlanningStreamListener>();
  private readonly streamEventBuffer: PlanningStreamEvent[] = [];
  private streamEventCounter = 0;
  private realtimeDiagnostics: PlanningRealtimeDiagnostics = {
    activeSseConnections: 0,
    activeWebSocketConnections: 0,
    counters: {
      sseConnected: 0,
      sseDisconnected: 0,
      wsConnected: 0,
      wsDisconnected: 0,
      wsAuthFailures: 0,
      emittedEvents: 0,
    },
    lastEventTimestamp: null,
    lastEventName: null,
  };

  constructor(
    private readonly repository: PlanningRepository,
    private readonly authService: AuthService,
    private readonly monitoringService: MonitoringService,
    @Inject(TOURS_ROUTE_COORDINATION_PORT)
    private readonly toursRouteCoordinator: ToursRouteCoordinationPort,
  ) {
    this.syncRealtimeDiagnostics();
  }

  async listZones() {
    return this.repository.listZones();
  }

  async listAgents() {
    return this.repository.listAgents();
  }

  async optimizeTour(dto: OptimizeTourDto) {
    return withActiveSpan(
      'planning.optimize_tour',
      () => this.repository.optimizeTour(dto),
      {
        attributes: {
          'planning.zone_id': dto.zoneId,
          'planning.manual_container_count': dto.manualContainerIds?.length ?? 0,
          'planning.fill_threshold_percent': dto.fillThresholdPercent,
        },
      },
    );
  }

  async createPlannedTour(dto: CreatePlannedTourDto, actorUserId: string) {
    return withActiveSpan(
      'planning.create_planned_tour',
      async () => {
        const tour = await this.repository.createPlannedTour(dto, actorUserId);
        const tourId = this.readEntityId(tour);
        if (tourId) {
          await this.toursRouteCoordinator.ensureRouteForTour(tourId);
        }

        this.publishStreamEvent(
          REALTIME_EVENT_NAMES.tourUpdated,
          {
            timestamp: new Date().toISOString(),
            tour: {
              id: this.readEntityId(tour),
              status: this.readEntityField(tour, 'status'),
              assignedAgentId:
                this.readEntityField(tour, 'assignedAgentId') ??
                this.readEntityField(tour, 'assigned_agent_id') ??
                dto.assignedAgentId ??
                null,
              zoneId:
                this.readEntityField(tour, 'zoneId') ??
                this.readEntityField(tour, 'zone_id') ??
                dto.zoneId,
            },
          },
          true,
        );

        await this.publishDashboardSnapshotSafely('creating planned tour');

        return tour;
      },
      {
        attributes: {
          'planning.zone_id': dto.zoneId,
          'planning.assigned_agent_id': dto.assignedAgentId ?? 'unassigned',
          'planning.stop_count': dto.orderedContainerIds.length,
          'planning.actor_user_id': actorUserId,
        },
      },
    );
  }

  async getManagerDashboard() {
    return this.repository.getManagerDashboard();
  }

  async listAlerts(filters: { status?: string; severity?: string; limit: number }) {
    return this.repository.listAlerts(filters);
  }

  async acknowledgeAlert(alertId: string, actorUserId: string) {
    return this.repository.acknowledgeAlert(alertId, actorUserId);
  }

  async listNotifications(limit: number) {
    return this.repository.listNotifications(limit);
  }

  async triggerEmergencyCollection(dto: TriggerEmergencyCollectionDto, actorUserId: string) {
    return withActiveSpan(
      'planning.trigger_emergency_collection',
      async () => {
        const emergencyResult = await this.repository.triggerEmergencyCollection(dto, actorUserId);
        const emergencyTourId = this.readEntityId(
          typeof emergencyResult === 'object' && emergencyResult && 'emergencyTour' in emergencyResult
            ? (emergencyResult as { emergencyTour?: unknown }).emergencyTour
            : emergencyResult,
        );

        if (emergencyTourId) {
          await this.toursRouteCoordinator.ensureRouteForTour(emergencyTourId);
        }

        this.publishStreamEvent(
          REALTIME_EVENT_NAMES.emergencyCreated,
          {
            timestamp: new Date().toISOString(),
            emergency: {
              id: this.readEntityId(emergencyResult),
              containerId: dto.containerId,
              reason: dto.reason,
              createdBy: actorUserId,
            },
          },
          true,
        );

        await this.publishDashboardSnapshotSafely('triggering emergency collection');

        return emergencyResult;
      },
      {
        attributes: {
          'planning.container_id': dto.containerId,
          'planning.assigned_agent_id': dto.assignedAgentId ?? 'unassigned',
          'planning.actor_user_id': actorUserId,
        },
      },
    );
  }

  async generateReport(dto: GenerateReportDto, actorUserId: string) {
    return this.repository.generateReport(dto, actorUserId);
  }

  async listReportHistory() {
    return this.repository.listReportHistory();
  }

  async getReportById(reportId: string) {
    return this.repository.getReportById(reportId);
  }

  async regenerateReport(reportId: string, actorUserId: string) {
    return this.repository.regenerateReport(reportId, actorUserId);
  }

  issueStreamSession(authUser: RequestWithAuthUser['authUser']) {
    if (
      !authUser?.id ||
      !this.hasRealtimeRoleAccess(authUser.role, this.readAdditionalRoleNames(authUser))
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.authService.issuePlanningStreamSession(authUser.id);
  }

  issueWebSocketSession(authUser: RequestWithAuthUser['authUser']) {
    if (
      !authUser?.id ||
      !this.hasRealtimeRoleAccess(authUser.role, this.readAdditionalRoleNames(authUser))
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.authService.issuePlanningWebSocketSession(authUser.id);
  }

  hasRealtimeRoleAccess(primaryRole?: string | null, additionalRoles: string[] = []) {
    const roleNames = new Set<string>();

    const normalizedPrimaryRole = primaryRole?.trim().toLowerCase();
    if (normalizedPrimaryRole) {
      roleNames.add(normalizedPrimaryRole);
    }

    for (const roleName of additionalRoles) {
      const normalizedRoleName = roleName?.trim().toLowerCase();
      if (normalizedRoleName) {
        roleNames.add(normalizedRoleName);
      }
    }

    return Array.from(roleNames).some((roleName) => STREAM_SESSION_ALLOWED_ROLES.has(roleName));
  }

  private readAdditionalRoleNames(authUser: RequestWithAuthUser['authUser']) {
    if (!Array.isArray(authUser?.roles)) {
      return [];
    }

    const roleNames: string[] = [];
    for (const role of authUser.roles) {
      if (typeof role?.name === 'string') {
        const normalizedRoleName = role.name.trim();
        if (normalizedRoleName) {
          roleNames.push(normalizedRoleName);
        }
      }
    }

    return roleNames;
  }

  getRealtimeDiagnostics(): PlanningRealtimeDiagnostics {
    return {
      activeSseConnections: this.realtimeDiagnostics.activeSseConnections,
      activeWebSocketConnections: this.realtimeDiagnostics.activeWebSocketConnections,
      counters: {
        ...this.realtimeDiagnostics.counters,
      },
      lastEventTimestamp: this.realtimeDiagnostics.lastEventTimestamp,
      lastEventName: this.realtimeDiagnostics.lastEventName,
    };
  }

  registerSseConnection() {
    this.realtimeDiagnostics.activeSseConnections += 1;
    this.realtimeDiagnostics.counters.sseConnected += 1;
    this.syncRealtimeDiagnostics();
  }

  unregisterSseConnection() {
    this.realtimeDiagnostics.activeSseConnections = Math.max(0, this.realtimeDiagnostics.activeSseConnections - 1);
    this.realtimeDiagnostics.counters.sseDisconnected += 1;
    this.syncRealtimeDiagnostics();
  }

  registerWebSocketConnection() {
    this.realtimeDiagnostics.activeWebSocketConnections += 1;
    this.realtimeDiagnostics.counters.wsConnected += 1;
    this.syncRealtimeDiagnostics();
  }

  unregisterWebSocketConnection() {
    this.realtimeDiagnostics.activeWebSocketConnections = Math.max(
      0,
      this.realtimeDiagnostics.activeWebSocketConnections - 1,
    );
    this.realtimeDiagnostics.counters.wsDisconnected += 1;
    this.syncRealtimeDiagnostics();
  }

  registerWebSocketAuthFailure() {
    this.realtimeDiagnostics.counters.wsAuthFailures += 1;
    this.syncRealtimeDiagnostics();
  }

  recordEmittedEvent(eventName: string) {
    this.realtimeDiagnostics.counters.emittedEvents += 1;
    this.realtimeDiagnostics.lastEventTimestamp = new Date().toISOString();
    this.realtimeDiagnostics.lastEventName = eventName;
    this.syncRealtimeDiagnostics();
  }

  private syncRealtimeDiagnostics() {
    this.monitoringService.setRealtimeDiagnostics(this.getRealtimeDiagnostics());
  }

  subscribeRealtimeEvents(listener: PlanningStreamListener) {
    this.streamListeners.add(listener);
    return () => {
      this.streamListeners.delete(listener);
    };
  }

  getReplayEventsAfter(lastEventId: string) {
    const normalizedEventId = lastEventId.trim();
    if (!normalizedEventId) {
      return [];
    }

    const lastIndex = this.streamEventBuffer.findIndex((event) => event.id === normalizedEventId);
    if (lastIndex < 0) {
      return [];
    }

    return this.streamEventBuffer.slice(lastIndex + 1);
  }

  async getRealtimeDashboardSnapshotEvent(): Promise<PlanningStreamEvent> {
    const dashboard = (await this.repository.getManagerDashboard()) as {
      ecoKpis?: { containers?: number; zones?: number; tours?: number };
      thresholds?: { criticalFillPercent?: number };
      criticalContainers?: unknown[];
      activeAlerts?: { totalOpen?: number };
      telemetryHealth?: { reportingContainers?: number; staleSensors?: number };
    };

    return this.createStreamEvent(REALTIME_EVENT_NAMES.dashboardSnapshot, {
      timestamp: new Date().toISOString(),
      ecoKpis: {
        containers: dashboard?.ecoKpis?.containers ?? 0,
        zones: dashboard?.ecoKpis?.zones ?? 0,
        tours: dashboard?.ecoKpis?.tours ?? 0,
      },
      thresholds: {
        criticalFillPercent: dashboard?.thresholds?.criticalFillPercent ?? 80,
      },
      criticalContainersCount: Array.isArray(dashboard?.criticalContainers)
        ? dashboard.criticalContainers.length
        : 0,
      activeAlertsCount: dashboard?.activeAlerts?.totalOpen ?? 0,
      telemetryHealth: {
        reportingContainers: dashboard?.telemetryHealth?.reportingContainers ?? 0,
        staleSensors: dashboard?.telemetryHealth?.staleSensors ?? 0,
      },
    });
  }

  createKeepaliveEvent(): PlanningStreamEvent {
    return this.createStreamEvent('system.keepalive', {
      timestamp: new Date().toISOString(),
    });
  }

  private async publishDashboardSnapshot() {
    const snapshotEvent = await this.getRealtimeDashboardSnapshotEvent();
    this.broadcastStreamEvent(snapshotEvent);
  }

  private async publishDashboardSnapshotSafely(trigger: string) {
    try {
      await this.publishDashboardSnapshot();
    } catch (error) {
      this.logger.error(
        `Failed to publish planning dashboard snapshot after ${trigger}: ${this.describeError(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private publishStreamEvent(
    eventName: string,
    data: Record<string, unknown>,
    includeCriticalContainerSignal = false,
  ) {
    this.broadcastStreamEvent(this.createStreamEvent(eventName, data));

    if (includeCriticalContainerSignal && typeof data.emergency === 'object' && data.emergency !== null) {
      const emergency = data.emergency as { containerId?: unknown };
      this.broadcastStreamEvent(
        this.createStreamEvent(REALTIME_EVENT_NAMES.containerCritical, {
          timestamp: new Date().toISOString(),
          container: {
            id: typeof emergency.containerId === 'string' ? emergency.containerId : null,
            status: 'critical',
          },
        }),
      );
    }
  }

  private createStreamEvent(event: string, data: Record<string, unknown>): PlanningStreamEvent {
    this.streamEventCounter += 1;
    return {
      id: `${Date.now()}-${this.streamEventCounter}`,
      event,
      data,
    };
  }

  private broadcastStreamEvent(event: PlanningStreamEvent) {
    this.streamEventBuffer.push(event);
    if (this.streamEventBuffer.length > STREAM_EVENT_BUFFER_SIZE) {
      this.streamEventBuffer.splice(0, this.streamEventBuffer.length - STREAM_EVENT_BUFFER_SIZE);
    }

    for (const listener of this.streamListeners) {
      listener(event);
    }
  }

  private readEntityId(entity: unknown) {
    if (!entity || typeof entity !== 'object') {
      return null;
    }

    const value = (entity as Record<string, unknown>).id;
    return typeof value === 'string' ? value : null;
  }

  private readEntityField(entity: unknown, key: string) {
    if (!entity || typeof entity !== 'object') {
      return null;
    }

    const value = (entity as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : null;
  }

  private describeError(error: unknown) {
    if (error instanceof Error && error.message.trim().length > 0) {
      return error.message;
    }

    return 'Unknown error';
  }
}

