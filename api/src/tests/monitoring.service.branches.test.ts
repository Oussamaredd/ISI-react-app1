import { describe, expect, it } from 'vitest';

import { MonitoringService } from '../modules/monitoring/monitoring.service.js';

const createMonitoringService = (repositoryOverrides?: {
  getOperationalMetricsSnapshot?: () => Promise<unknown>;
}) => {
  const configService = {
    get: (key: string) => {
      if (key === 'iotIngestion.IOT_BACKPRESSURE_THRESHOLD') {
        return 500;
      }

      if (key === 'iotIngestion.IOT_INGESTION_SHARD_COUNT') {
        return 12;
      }

      if (key === 'iotIngestion.IOT_VALIDATED_CONSUMER_SHARD_COUNT') {
        return 8;
      }

      return undefined;
    },
  };
  const monitoringRepository = {
    getOperationalMetricsSnapshot:
      repositoryOverrides?.getOperationalMetricsSnapshot ??
      (async () => ({
        ingestionByStatus: {
          pending: 1,
          retry: 1,
          processing: 0,
          failed: 0,
          rejected: 0,
          validated: 2,
        },
        deliveryByStatus: {
          pending: 0,
          retry: 0,
          processing: 1,
          failed: 0,
          completed: 4,
        },
        ingestionOldestPendingAgeMs: 2500,
        deliveryOldestPendingAgeMs: 500,
        validatedLastHour: 2,
        completedLastHour: 4,
        connectorExportsByStatus: {
          pending: 0,
          retry: 0,
          processing: 0,
          failed: 1,
          completed: 2,
        },
        connectorOldestPendingAgeMs: 0,
        connectorLagByConnector: [],
        criticalContainers: 3,
        attentionContainers: 7,
        maxContainerFillLevel: 97,
        openAlertsBySeverity: [{ severity: 'critical', count: 2 }],
        ingestionBacklogByShard: [{ shardId: '00', count: 2 }],
        deliveryBacklogByShard: [{ consumerName: 'validated', shardId: '00', count: 1 }],
        deliveryLagByConsumer: [
          {
            consumerName: 'validated',
            backlogTotal: 1,
            oldestPendingAgeMs: 100,
            shardSkew: 0,
            completedLastHour: 4,
            failedCount: 0,
          },
        ],
        recentAuditActions: [{ action: 'settings_updated', count: 3 }],
        citizenReportsByStatus: [{ status: 'submitted', count: 5 }],
        citizenReportsCreatedLastHour: 2,
        toursByStatus: [{ status: 'planned', count: 4 }],
        toursCompletedLastHour: 1,
        challengesByStatus: [{ status: 'active', count: 2 }],
        challengeParticipationsByStatus: [{ status: 'completed', count: 4 }],
        challengeCompletionsLastHour: 1,
        gamificationProfilesTotal: 12,
        gamificationPointsTotal: 840,
      })),
  };
  const cacheService = {
    getMetricsSnapshot: () => ({
      enabled: true,
      invalidationsTotal: 2,
      maxMemoryEntries: 100,
      memoryEntries: 3,
      memoryEvictionsTotal: 0,
      namespaceCount: 2,
      readsByTier: {
        memory: 4,
        redis: 1,
        source: 2,
      },
      redisConnected: true,
      redisErrorsTotal: 0,
      writesByTier: {
        memory: 2,
        redis: 1,
      },
    }),
  };

  return new MonitoringService(
    configService as never,
    monitoringRepository as never,
    cacheService as never,
  );
};

describe('MonitoringService branches', () => {
  it('records sanitized runtime metrics, derived security signals, and service hops', async () => {
    const service = createMonitoringService();

    service.recordFrontendError({
      type: '   ',
      message: '',
      severity: '',
      context: '   ',
      status: 'bad',
      timestamp: 'not-a-date',
    });
    service.recordFrontendMetric({});
    service.recordHttpRequestStart();
    service.recordHttpRequestCompleted({
      method: 'post',
      path: '/login',
      statusCode: 401,
      durationMs: 12,
    });
    service.recordHttpRequestCompleted({
      method: 'get',
      path: '/api/admin/settings',
      statusCode: 400,
      durationMs: -10,
    });
    service.recordHttpRequestCompleted({
      method: 'get',
      path: '/api/alerts',
      statusCode: 429,
      durationMs: 20,
    });
    service.recordHttpRequestCompleted({
      method: 'get',
      path: '/api/metrics',
      statusCode: 500,
      durationMs: 15,
    });
    service.recordServiceHop('planning.repo', 'success', 18);
    service.setRealtimeDiagnostics({
      activeSseConnections: 1,
      activeWebSocketConnections: 2,
      counters: {
        sseConnected: 3,
        sseDisconnected: 1,
        wsConnected: 4,
        wsDisconnected: 2,
        wsAuthFailures: 1,
        emittedEvents: 9,
      },
      lastEventTimestamp: '2026-03-01T10:00:00.000Z',
      lastEventName: 'planning.dashboard.snapshot',
    });

    const metrics = await service.renderPrometheusMetrics();

    expect(metrics).toContain('frontend_errors_by_type_total{type="unknown"} 1');
    expect(metrics).toContain('frontend_metrics_by_type_total{type="web_vital"} 1');
    expect(metrics).toContain('ecotrack_http_requests_in_flight 0');
    expect(metrics).toContain('ecotrack_security_signals_total{signal="auth_unauthorized",severity="warning"} 1');
    expect(metrics).toContain('ecotrack_security_signals_total{signal="login_failure",severity="warning"} 1');
    expect(metrics).toContain('ecotrack_security_signals_total{signal="admin_validation_failed",severity="warning"} 1');
    expect(metrics).toContain('ecotrack_security_signals_total{signal="rate_limited",severity="warning"} 1');
    expect(metrics).toContain('ecotrack_security_signals_total{signal="server_error",severity="critical"} 1');
    expect(metrics).toContain('ecotrack_service_hop_events_total{hop="planning.repo",outcome="success"} 1');
    expect(metrics).toContain('ecotrack_realtime_last_event_name_info{event="planning.dashboard.snapshot"} 1');
    expect(metrics).toContain('ecotrack_observability_snapshot_up 1');
    expect(metrics).toContain('ecotrack_containers_max_fill_percent 97');
  });

  it('falls back gracefully when the repository snapshot is unavailable', async () => {
    const service = createMonitoringService({
      getOperationalMetricsSnapshot: async () => {
        throw new Error('snapshot unavailable');
      },
    });

    const metrics = await service.renderPrometheusMetrics();

    expect(metrics).toContain('ecotrack_observability_snapshot_up 0');
    expect(metrics).not.toContain('ecotrack_event_connector_exports{status=');
  });
});
