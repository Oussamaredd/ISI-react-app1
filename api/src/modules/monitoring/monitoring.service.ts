import { monitorEventLoopDelay } from 'node:perf_hooks';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CacheService } from '../performance/cache.service.js';

import { HTTP_REQUEST_DURATION_BUCKETS_MS } from './http-metrics.utils.js';
import { MonitoringRepository } from './monitoring.repository.js';

type JsonRecord = Record<string, unknown>;

type FrontendErrorEvent = {
  type: string;
  message: string;
  severity: string;
  context: string | null;
  status: number | null;
  timestamp: string | null;
  receivedAt: string;
};

type FrontendMetricEvent = {
  type: string;
  name: string | null;
  value: number | null;
  rating: string | null;
  timestamp: string | null;
  receivedAt: string;
};

type HttpRequestMetric = {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
};

type SecuritySignalMetric = {
  signal: string;
  severity: 'info' | 'warning' | 'critical';
};

type RealtimeDiagnosticsSnapshot = {
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

const MAX_FRONTEND_ERRORS = 200;
const MAX_FRONTEND_METRICS = 1000;
const UNKNOWN_TYPE = 'unknown';

const isObject = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toObject = (value: unknown): JsonRecord => (isObject(value) ? value : {});

const toTrimmedString = (value: unknown, maxLength = 512): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return undefined;
};

const toIsoTimestamp = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return undefined;
  }

  return parsed.toISOString();
};

const incrementCounter = (counterMap: Map<string, number>, key: string): void => {
  counterMap.set(key, (counterMap.get(key) ?? 0) + 1);
};

const pushWithLimit = <T>(bucket: T[], value: T, maxSize: number): void => {
  bucket.push(value);
  if (bucket.length > maxSize) {
    bucket.shift();
  }
};

const sanitizeLabelValue = (value: string): string =>
  value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n');

const getStatusClass = (statusCode: number): string => {
  const normalized = Number.isFinite(statusCode) ? Math.trunc(statusCode) : 500;
  return `${Math.min(5, Math.max(1, Math.floor(normalized / 100)))}xx`;
};

const buildMethodPathKey = (method: string, path: string) => `${method} ${path}`;
const buildMethodPathStatusKey = (method: string, path: string, statusClass: string) =>
  `${method} ${path} ${statusClass}`;
const buildMethodPathExactStatusKey = (method: string, path: string, statusCode: number) =>
  `${method} ${path} ${statusCode}`;
const buildBucketKey = (method: string, path: string, bucket: number) =>
  `${method} ${path} ${bucket}`;
const buildServiceHopKey = (hop: string, outcome: string) => `${hop} ${outcome}`;
const buildServiceHopBucketKey = (hop: string, bucket: number) => `${hop} ${bucket}`;
const buildSecuritySignalKey = (signal: string, severity: string) => `${signal} ${severity}`;

const deriveSecuritySignals = (metric: HttpRequestMetric): SecuritySignalMetric[] => {
  const path = metric.path;
  const signals: SecuritySignalMetric[] = [];

  if (metric.statusCode === 401) {
    signals.push({ signal: 'auth_unauthorized', severity: 'warning' });
  }

  if (metric.statusCode === 403) {
    signals.push({ signal: 'authorization_denied', severity: 'warning' });
  }

  if (metric.statusCode === 429) {
    signals.push({ signal: 'rate_limited', severity: 'warning' });
  }

  if (metric.statusCode >= 500) {
    signals.push({ signal: 'server_error', severity: 'critical' });
  }

  if (path === '/login' && metric.statusCode >= 400) {
    signals.push({ signal: 'login_failure', severity: 'warning' });
  }

  if (path.startsWith('/api/admin') && metric.statusCode === 400) {
    signals.push({ signal: 'admin_validation_failed', severity: 'warning' });
  }

  return signals;
};

@Injectable()
export class MonitoringService {
  private readonly eventLoopDelayMonitor = monitorEventLoopDelay({ resolution: 20 });
  private frontendErrorsTotal = 0;
  private frontendMetricsTotal = 0;
  private httpRequestsInFlight = 0;
  private httpRequestsTotal = 0;
  private httpRequestErrorsTotal = 0;
  private readonly frontendErrorsByType = new Map<string, number>();
  private readonly frontendMetricsByType = new Map<string, number>();
  private readonly httpRequestsByRoute = new Map<string, number>();
  private readonly httpRequestsByExactStatus = new Map<string, number>();
  private readonly httpRequestErrorsByRoute = new Map<string, number>();
  private readonly httpRequestDurationBuckets = new Map<string, number>();
  private readonly httpRequestDurationCountByRoute = new Map<string, number>();
  private readonly httpRequestDurationSumMsByRoute = new Map<string, number>();
  private readonly serviceHopEvents = new Map<string, number>();
  private readonly serviceHopDurationBuckets = new Map<string, number>();
  private readonly serviceHopDurationCount = new Map<string, number>();
  private readonly serviceHopDurationSumMs = new Map<string, number>();
  private readonly securitySignals = new Map<string, number>();
  private readonly frontendErrors: FrontendErrorEvent[] = [];
  private readonly frontendMetrics: FrontendMetricEvent[] = [];
  private realtimeDiagnostics: RealtimeDiagnosticsSnapshot = {
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
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(MonitoringRepository) private readonly monitoringRepository: MonitoringRepository,
    @Inject(CacheService) private readonly cacheService: CacheService,
  ) {
    this.eventLoopDelayMonitor.enable();
  }

  setRealtimeDiagnostics(snapshot: RealtimeDiagnosticsSnapshot) {
    this.realtimeDiagnostics = {
      activeSseConnections: snapshot.activeSseConnections,
      activeWebSocketConnections: snapshot.activeWebSocketConnections,
      counters: {
        ...snapshot.counters,
      },
      lastEventTimestamp: snapshot.lastEventTimestamp,
      lastEventName: snapshot.lastEventName,
    };
  }

  recordHttpRequestStart() {
    this.httpRequestsInFlight += 1;
  }

  recordHttpRequestCompleted(metric: HttpRequestMetric) {
    this.httpRequestsInFlight = Math.max(0, this.httpRequestsInFlight - 1);

    const method = metric.method.toUpperCase();
    const path = metric.path;
    const statusClass = getStatusClass(metric.statusCode);
    const durationMs = Number.isFinite(metric.durationMs) && metric.durationMs >= 0 ? metric.durationMs : 0;

    this.httpRequestsTotal += 1;

    incrementCounter(this.httpRequestDurationCountByRoute, buildMethodPathKey(method, path));
    this.httpRequestDurationSumMsByRoute.set(
      buildMethodPathKey(method, path),
      (this.httpRequestDurationSumMsByRoute.get(buildMethodPathKey(method, path)) ?? 0) + durationMs,
    );
    incrementCounter(this.httpRequestsByRoute, buildMethodPathStatusKey(method, path, statusClass));
    incrementCounter(this.httpRequestsByExactStatus, buildMethodPathExactStatusKey(method, path, metric.statusCode));

    if (metric.statusCode >= 400) {
      this.httpRequestErrorsTotal += 1;
      incrementCounter(
        this.httpRequestErrorsByRoute,
        buildMethodPathStatusKey(method, path, statusClass),
      );
    }

    for (const bucket of HTTP_REQUEST_DURATION_BUCKETS_MS) {
      if (durationMs <= bucket) {
        incrementCounter(this.httpRequestDurationBuckets, buildBucketKey(method, path, bucket));
      }
    }

    for (const signal of deriveSecuritySignals(metric)) {
      this.recordSecuritySignal(signal.signal, signal.severity);
    }
  }

  recordServiceHop(hop: string, outcome: string, durationMs: number) {
    const normalizedDurationMs =
      Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : 0;
    incrementCounter(this.serviceHopEvents, buildServiceHopKey(hop, outcome));
    incrementCounter(this.serviceHopDurationCount, hop);
    this.serviceHopDurationSumMs.set(
      hop,
      (this.serviceHopDurationSumMs.get(hop) ?? 0) + normalizedDurationMs,
    );

    for (const bucket of HTTP_REQUEST_DURATION_BUCKETS_MS) {
      if (normalizedDurationMs <= bucket) {
        incrementCounter(this.serviceHopDurationBuckets, buildServiceHopBucketKey(hop, bucket));
      }
    }
  }

  recordSecuritySignal(signal: string, severity: SecuritySignalMetric['severity']) {
    incrementCounter(this.securitySignals, buildSecuritySignalKey(signal, severity));
  }

  recordFrontendError(payload: unknown): number {
    const data = toObject(payload);
    const type = toTrimmedString(data.type, 64) ?? UNKNOWN_TYPE;
    const message = toTrimmedString(data.message, 2048) ?? 'Unknown frontend error';
    const severity = toTrimmedString(data.severity, 32) ?? 'medium';
    const context = toTrimmedString(data.context, 256) ?? null;
    const status = toNumber(data.status) ?? null;
    const timestamp = toIsoTimestamp(data.timestamp) ?? null;

    const event: FrontendErrorEvent = {
      type,
      message,
      severity,
      context,
      status,
      timestamp,
      receivedAt: new Date().toISOString(),
    };

    this.frontendErrorsTotal += 1;
    incrementCounter(this.frontendErrorsByType, type);
    pushWithLimit(this.frontendErrors, event, MAX_FRONTEND_ERRORS);

    return this.frontendErrorsTotal;
  }

  recordFrontendMetric(payload: unknown): number {
    const data = toObject(payload);
    const type = toTrimmedString(data.type, 64) ?? 'web_vital';
    const name = toTrimmedString(data.name, 128) ?? null;
    const value = toNumber(data.value) ?? null;
    const rating = toTrimmedString(data.rating, 64) ?? null;
    const timestamp = toIsoTimestamp(data.timestamp) ?? null;

    const event: FrontendMetricEvent = {
      type,
      name,
      value,
      rating,
      timestamp,
      receivedAt: new Date().toISOString(),
    };

    this.frontendMetricsTotal += 1;
    incrementCounter(this.frontendMetricsByType, type);
    pushWithLimit(this.frontendMetrics, event, MAX_FRONTEND_METRICS);

    return this.frontendMetricsTotal;
  }

  async renderPrometheusMetrics(): Promise<string> {
    const cacheMetrics = this.cacheService.getMetricsSnapshot();
    const eventLoopMeanMs = Number((this.eventLoopDelayMonitor.mean / 1_000_000).toFixed(3));
    const eventLoopMaxMs = Number((this.eventLoopDelayMonitor.max / 1_000_000).toFixed(3));
    const eventLoopP95Ms = Number((this.eventLoopDelayMonitor.percentile(95) / 1_000_000).toFixed(3));
    const eventLoopP99Ms = Number((this.eventLoopDelayMonitor.percentile(99) / 1_000_000).toFixed(3));
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const lines: string[] = [
      '# HELP frontend_errors_total Total number of frontend errors ingested.',
      '# TYPE frontend_errors_total counter',
      `frontend_errors_total ${this.frontendErrorsTotal}`,
      '# HELP frontend_metrics_total Total number of frontend metrics ingested.',
      '# TYPE frontend_metrics_total counter',
      `frontend_metrics_total ${this.frontendMetricsTotal}`,
      '# HELP ecotrack_http_requests_in_flight Number of in-flight API requests currently being processed.',
      '# TYPE ecotrack_http_requests_in_flight gauge',
      `ecotrack_http_requests_in_flight ${this.httpRequestsInFlight}`,
      '# HELP ecotrack_http_requests_total Total number of completed API requests grouped by method, normalized path, and status class.',
      '# TYPE ecotrack_http_requests_total counter',
    ];

    for (const [key, count] of [...this.httpRequestsByRoute.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      const [method, path, statusClass] = key.split(' ');
      lines.push(
        `ecotrack_http_requests_total{method="${sanitizeLabelValue(method)}",path="${sanitizeLabelValue(path)}",status_class="${sanitizeLabelValue(statusClass)}"} ${count}`,
      );
    }

    lines.push('# HELP ecotrack_http_request_errors_total Total number of API requests that completed with a 4xx or 5xx status.');
    lines.push('# TYPE ecotrack_http_request_errors_total counter');

    for (const [key, count] of [...this.httpRequestErrorsByRoute.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      const [method, path, statusClass] = key.split(' ');
      lines.push(
        `ecotrack_http_request_errors_total{method="${sanitizeLabelValue(method)}",path="${sanitizeLabelValue(path)}",status_class="${sanitizeLabelValue(statusClass)}"} ${count}`,
      );
    }

    lines.push('# HELP ecotrack_http_request_status_total Total number of API requests grouped by exact status code.');
    lines.push('# TYPE ecotrack_http_request_status_total counter');

    for (const [key, count] of [...this.httpRequestsByExactStatus.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      const [method, path, statusCode] = key.split(' ');
      lines.push(
        `ecotrack_http_request_status_total{method="${sanitizeLabelValue(method)}",path="${sanitizeLabelValue(path)}",status_code="${sanitizeLabelValue(statusCode)}"} ${count}`,
      );
    }

    lines.push('# HELP ecotrack_http_request_duration_ms API request duration histogram in milliseconds.');
    lines.push('# TYPE ecotrack_http_request_duration_ms histogram');

    const histogramRoutes = new Set<string>();
    for (const key of this.httpRequestsByRoute.keys()) {
      const [method, path] = key.split(' ');
      histogramRoutes.add(buildMethodPathKey(method, path));
    }

    for (const routeKey of [...histogramRoutes].sort((left, right) => left.localeCompare(right))) {
      const [method, path] = routeKey.split(' ');
      for (const bucket of HTTP_REQUEST_DURATION_BUCKETS_MS) {
        const bucketCount = this.httpRequestDurationBuckets.get(
          buildBucketKey(method, path, bucket),
        ) ?? 0;
        lines.push(
          `ecotrack_http_request_duration_ms_bucket{method="${sanitizeLabelValue(method)}",path="${sanitizeLabelValue(path)}",le="${bucket}"} ${bucketCount}`,
        );
      }

      const routeRequestCount = [...this.httpRequestsByRoute.entries()]
        .filter(([key]) => key.startsWith(routeKey))
        .reduce((total, [, count]) => total + count, 0);

      lines.push(
        `ecotrack_http_request_duration_ms_bucket{method="${sanitizeLabelValue(method)}",path="${sanitizeLabelValue(path)}",le="+Inf"} ${routeRequestCount}`,
      );

      lines.push(
        `ecotrack_http_request_duration_ms_sum{method="${sanitizeLabelValue(method)}",path="${sanitizeLabelValue(path)}"} ${(
          this.httpRequestDurationSumMsByRoute.get(routeKey) ?? 0
        ).toFixed(3)}`,
      );
      lines.push(
        `ecotrack_http_request_duration_ms_count{method="${sanitizeLabelValue(method)}",path="${sanitizeLabelValue(path)}"} ${this.httpRequestDurationCountByRoute.get(routeKey) ?? 0}`,
      );
    }
    lines.push('# HELP ecotrack_process_uptime_seconds Current API process uptime in seconds.');
    lines.push('# TYPE ecotrack_process_uptime_seconds gauge');
    lines.push(`ecotrack_process_uptime_seconds ${process.uptime().toFixed(3)}`);
    lines.push('# HELP ecotrack_process_resident_memory_bytes Resident set size for the API process.');
    lines.push('# TYPE ecotrack_process_resident_memory_bytes gauge');
    lines.push(`ecotrack_process_resident_memory_bytes ${memoryUsage.rss}`);
    lines.push('# HELP ecotrack_process_heap_used_bytes Heap used by the API process.');
    lines.push('# TYPE ecotrack_process_heap_used_bytes gauge');
    lines.push(`ecotrack_process_heap_used_bytes ${memoryUsage.heapUsed}`);
    lines.push('# HELP ecotrack_process_heap_total_bytes Heap reserved by the API process.');
    lines.push('# TYPE ecotrack_process_heap_total_bytes gauge');
    lines.push(`ecotrack_process_heap_total_bytes ${memoryUsage.heapTotal}`);
    lines.push('# HELP ecotrack_process_cpu_user_seconds_total CPU user time consumed by the API process.');
    lines.push('# TYPE ecotrack_process_cpu_user_seconds_total counter');
    lines.push(`ecotrack_process_cpu_user_seconds_total ${(cpuUsage.user / 1_000_000).toFixed(6)}`);
    lines.push('# HELP ecotrack_process_cpu_system_seconds_total CPU system time consumed by the API process.');
    lines.push('# TYPE ecotrack_process_cpu_system_seconds_total counter');
    lines.push(`ecotrack_process_cpu_system_seconds_total ${(cpuUsage.system / 1_000_000).toFixed(6)}`);
    lines.push('# HELP ecotrack_event_loop_delay_ms Event loop delay statistics in milliseconds.');
    lines.push('# TYPE ecotrack_event_loop_delay_ms gauge');
    lines.push(`ecotrack_event_loop_delay_ms{quantile="mean"} ${Number.isFinite(eventLoopMeanMs) ? eventLoopMeanMs : 0}`);
    lines.push(`ecotrack_event_loop_delay_ms{quantile="p95"} ${Number.isFinite(eventLoopP95Ms) ? eventLoopP95Ms : 0}`);
    lines.push(`ecotrack_event_loop_delay_ms{quantile="p99"} ${Number.isFinite(eventLoopP99Ms) ? eventLoopP99Ms : 0}`);
    lines.push(`ecotrack_event_loop_delay_ms{quantile="max"} ${Number.isFinite(eventLoopMaxMs) ? eventLoopMaxMs : 0}`);
    lines.push('# HELP ecotrack_cache_reads_total Cache reads grouped by source tier.');
    lines.push('# TYPE ecotrack_cache_reads_total counter');
    lines.push(`ecotrack_cache_reads_total{tier="memory"} ${cacheMetrics.readsByTier.memory}`);
    lines.push(`ecotrack_cache_reads_total{tier="redis"} ${cacheMetrics.readsByTier.redis}`);
    lines.push(`ecotrack_cache_reads_total{tier="source"} ${cacheMetrics.readsByTier.source}`);
    lines.push('# HELP ecotrack_cache_writes_total Cache writes grouped by storage tier.');
    lines.push('# TYPE ecotrack_cache_writes_total counter');
    lines.push(`ecotrack_cache_writes_total{tier="memory"} ${cacheMetrics.writesByTier.memory}`);
    lines.push(`ecotrack_cache_writes_total{tier="redis"} ${cacheMetrics.writesByTier.redis}`);
    lines.push('# HELP ecotrack_cache_invalidations_total Total namespace invalidations issued by the API.');
    lines.push('# TYPE ecotrack_cache_invalidations_total counter');
    lines.push(`ecotrack_cache_invalidations_total ${cacheMetrics.invalidationsTotal}`);
    lines.push('# HELP ecotrack_cache_memory_entries Current number of active in-memory cache entries.');
    lines.push('# TYPE ecotrack_cache_memory_entries gauge');
    lines.push(`ecotrack_cache_memory_entries ${cacheMetrics.memoryEntries}`);
    lines.push('# HELP ecotrack_cache_memory_evictions_total Total in-memory cache evictions.');
    lines.push('# TYPE ecotrack_cache_memory_evictions_total counter');
    lines.push(`ecotrack_cache_memory_evictions_total ${cacheMetrics.memoryEvictionsTotal}`);
    lines.push('# HELP ecotrack_cache_backend_up Cache backend availability by tier.');
    lines.push('# TYPE ecotrack_cache_backend_up gauge');
    lines.push(`ecotrack_cache_backend_up{backend="memory"} ${cacheMetrics.enabled ? 1 : 0}`);
    lines.push(`ecotrack_cache_backend_up{backend="redis"} ${cacheMetrics.redisConnected ? 1 : 0}`);
    lines.push('# HELP ecotrack_cache_backend_errors_total Cache backend errors grouped by tier.');
    lines.push('# TYPE ecotrack_cache_backend_errors_total counter');
    lines.push(`ecotrack_cache_backend_errors_total{backend="redis"} ${cacheMetrics.redisErrorsTotal}`);
    lines.push('# HELP frontend_error_buffer_size Number of frontend errors retained in memory.');
    lines.push('# TYPE frontend_error_buffer_size gauge');
    lines.push(`frontend_error_buffer_size ${this.frontendErrors.length}`);
    lines.push('# HELP frontend_metric_buffer_size Number of frontend metrics retained in memory.');
    lines.push('# TYPE frontend_metric_buffer_size gauge');
    lines.push(`frontend_metric_buffer_size ${this.frontendMetrics.length}`);
    lines.push('# HELP frontend_errors_by_type_total Total frontend errors by type.');
    lines.push('# TYPE frontend_errors_by_type_total counter');

    for (const [type, count] of [...this.frontendErrorsByType.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      lines.push(`frontend_errors_by_type_total{type="${sanitizeLabelValue(type)}"} ${count}`);
    }

    lines.push('# HELP frontend_metrics_by_type_total Total frontend metrics by type.');
    lines.push('# TYPE frontend_metrics_by_type_total counter');

    for (const [type, count] of [...this.frontendMetricsByType.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      lines.push(`frontend_metrics_by_type_total{type="${sanitizeLabelValue(type)}"} ${count}`);
    }

    lines.push('# HELP ecotrack_service_hop_events_total Total logical service-hop events across the IoT pipeline.');
    lines.push('# TYPE ecotrack_service_hop_events_total counter');
    for (const [key, count] of [...this.serviceHopEvents.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      const [hop, outcome] = key.split(' ');
      lines.push(
        `ecotrack_service_hop_events_total{hop="${sanitizeLabelValue(hop)}",outcome="${sanitizeLabelValue(outcome)}"} ${count}`,
      );
    }

    lines.push('# HELP ecotrack_service_hop_duration_ms Logical service-hop duration histogram in milliseconds.');
    lines.push('# TYPE ecotrack_service_hop_duration_ms histogram');
    for (const hop of [...this.serviceHopDurationCount.keys()].sort((left, right) => left.localeCompare(right))) {
      for (const bucket of HTTP_REQUEST_DURATION_BUCKETS_MS) {
        const bucketCount =
          this.serviceHopDurationBuckets.get(buildServiceHopBucketKey(hop, bucket)) ?? 0;
        lines.push(
          `ecotrack_service_hop_duration_ms_bucket{hop="${sanitizeLabelValue(hop)}",le="${bucket}"} ${bucketCount}`,
        );
      }
      lines.push(
        `ecotrack_service_hop_duration_ms_bucket{hop="${sanitizeLabelValue(hop)}",le="+Inf"} ${this.serviceHopDurationCount.get(hop) ?? 0}`,
      );
      lines.push(
        `ecotrack_service_hop_duration_ms_sum{hop="${sanitizeLabelValue(hop)}"} ${(
          this.serviceHopDurationSumMs.get(hop) ?? 0
        ).toFixed(3)}`,
      );
      lines.push(
        `ecotrack_service_hop_duration_ms_count{hop="${sanitizeLabelValue(hop)}"} ${this.serviceHopDurationCount.get(hop) ?? 0}`,
      );
    }

    lines.push('# HELP ecotrack_security_signals_total Derived security-relevant runtime signals.');
    lines.push('# TYPE ecotrack_security_signals_total counter');
    for (const [key, count] of [...this.securitySignals.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      const separatorIndex = key.lastIndexOf(' ');
      const signal = separatorIndex >= 0 ? key.slice(0, separatorIndex) : key;
      const severity = separatorIndex >= 0 ? key.slice(separatorIndex + 1) : 'info';
      lines.push(
        `ecotrack_security_signals_total{signal="${sanitizeLabelValue(signal)}",severity="${sanitizeLabelValue(severity)}"} ${count}`,
      );
    }

    lines.push('# HELP ecotrack_realtime_active_connections Active realtime connections by transport.');
    lines.push('# TYPE ecotrack_realtime_active_connections gauge');
    lines.push(`ecotrack_realtime_active_connections{transport="sse"} ${this.realtimeDiagnostics.activeSseConnections}`);
    lines.push(
      `ecotrack_realtime_active_connections{transport="ws"} ${this.realtimeDiagnostics.activeWebSocketConnections}`,
    );

    lines.push('# HELP ecotrack_realtime_connection_events_total Realtime connection lifecycle events.');
    lines.push('# TYPE ecotrack_realtime_connection_events_total counter');
    lines.push(
      `ecotrack_realtime_connection_events_total{transport="sse",action="connected"} ${this.realtimeDiagnostics.counters.sseConnected}`,
    );
    lines.push(
      `ecotrack_realtime_connection_events_total{transport="sse",action="disconnected"} ${this.realtimeDiagnostics.counters.sseDisconnected}`,
    );
    lines.push(
      `ecotrack_realtime_connection_events_total{transport="ws",action="connected"} ${this.realtimeDiagnostics.counters.wsConnected}`,
    );
    lines.push(
      `ecotrack_realtime_connection_events_total{transport="ws",action="disconnected"} ${this.realtimeDiagnostics.counters.wsDisconnected}`,
    );
    lines.push(
      `ecotrack_realtime_connection_events_total{transport="ws",action="auth_failure"} ${this.realtimeDiagnostics.counters.wsAuthFailures}`,
    );

    lines.push('# HELP ecotrack_realtime_emitted_events_total Total realtime events emitted by API transport layer.');
    lines.push('# TYPE ecotrack_realtime_emitted_events_total counter');
    lines.push(`ecotrack_realtime_emitted_events_total ${this.realtimeDiagnostics.counters.emittedEvents}`);

    lines.push('# HELP ecotrack_realtime_last_event_timestamp_seconds Unix timestamp of last emitted realtime event.');
    lines.push('# TYPE ecotrack_realtime_last_event_timestamp_seconds gauge');
    const lastEventEpochSeconds = this.realtimeDiagnostics.lastEventTimestamp
      ? Math.floor(new Date(this.realtimeDiagnostics.lastEventTimestamp).valueOf() / 1000)
      : 0;
    lines.push(`ecotrack_realtime_last_event_timestamp_seconds ${lastEventEpochSeconds}`);

    if (this.realtimeDiagnostics.lastEventName) {
      lines.push('# HELP ecotrack_realtime_last_event_name_info Label-only metric for latest realtime event name.');
      lines.push('# TYPE ecotrack_realtime_last_event_name_info gauge');
      lines.push(
        `ecotrack_realtime_last_event_name_info{event="${sanitizeLabelValue(this.realtimeDiagnostics.lastEventName)}"} 1`,
      );
    }

    const ingestionShardCount = this.configService.get<number>('iotIngestion.IOT_INGESTION_SHARD_COUNT') ?? 1;
    const validatedShardCount =
      this.configService.get<number>('iotIngestion.IOT_VALIDATED_CONSUMER_SHARD_COUNT') ?? 1;
    const backpressureThreshold =
      this.configService.get<number>('iotIngestion.IOT_BACKPRESSURE_THRESHOLD') ?? 100000;

    lines.push('# HELP ecotrack_iot_virtual_partitions Configured virtual partition count by pipeline.');
    lines.push('# TYPE ecotrack_iot_virtual_partitions gauge');
    lines.push(`ecotrack_iot_virtual_partitions{pipeline="ingestion"} ${ingestionShardCount}`);
    lines.push(`ecotrack_iot_virtual_partitions{pipeline="validated_consumer"} ${validatedShardCount}`);

    try {
      const snapshot = await this.monitoringRepository.getOperationalMetricsSnapshot();
      const ingestionBacklog =
        snapshot.ingestionByStatus.pending +
        snapshot.ingestionByStatus.retry +
        snapshot.ingestionByStatus.processing;
      const deliveryBacklog =
        snapshot.deliveryByStatus.pending +
        snapshot.deliveryByStatus.retry +
        snapshot.deliveryByStatus.processing;
      const connectorBacklog =
        snapshot.connectorExportsByStatus.pending +
        snapshot.connectorExportsByStatus.retry +
        snapshot.connectorExportsByStatus.processing;

      lines.push('# HELP ecotrack_observability_snapshot_up Whether DB-backed observability metrics were collected.');
      lines.push('# TYPE ecotrack_observability_snapshot_up gauge');
      lines.push('ecotrack_observability_snapshot_up 1');

      lines.push('# HELP ecotrack_iot_ingestion_events Gauge of staged ingestion events by status.');
      lines.push('# TYPE ecotrack_iot_ingestion_events gauge');
      for (const [status, count] of Object.entries(snapshot.ingestionByStatus).sort(([left], [right]) =>
        left.localeCompare(right),
      )) {
        lines.push(`ecotrack_iot_ingestion_events{status="${sanitizeLabelValue(status)}"} ${count}`);
      }

      lines.push('# HELP ecotrack_iot_validated_delivery_events Gauge of validated-event deliveries by status.');
      lines.push('# TYPE ecotrack_iot_validated_delivery_events gauge');
      for (const [status, count] of Object.entries(snapshot.deliveryByStatus).sort(([left], [right]) =>
        left.localeCompare(right),
      )) {
        lines.push(
          `ecotrack_iot_validated_delivery_events{status="${sanitizeLabelValue(status)}"} ${count}`,
        );
      }

      lines.push('# HELP ecotrack_iot_ingestion_backlog_total Total staged-event backlog in pending, retry, or processing state.');
      lines.push('# TYPE ecotrack_iot_ingestion_backlog_total gauge');
      lines.push(`ecotrack_iot_ingestion_backlog_total ${ingestionBacklog}`);

      lines.push('# HELP ecotrack_iot_validated_delivery_backlog_total Total validated-delivery backlog in pending, retry, or processing state.');
      lines.push('# TYPE ecotrack_iot_validated_delivery_backlog_total gauge');
      lines.push(`ecotrack_iot_validated_delivery_backlog_total ${deliveryBacklog}`);

      lines.push('# HELP ecotrack_iot_ingestion_oldest_pending_age_ms Oldest runnable staged-event age in milliseconds.');
      lines.push('# TYPE ecotrack_iot_ingestion_oldest_pending_age_ms gauge');
      lines.push(`ecotrack_iot_ingestion_oldest_pending_age_ms ${snapshot.ingestionOldestPendingAgeMs ?? 0}`);

      lines.push('# HELP ecotrack_iot_validated_delivery_oldest_pending_age_ms Oldest runnable validated-delivery age in milliseconds.');
      lines.push('# TYPE ecotrack_iot_validated_delivery_oldest_pending_age_ms gauge');
      lines.push(
        `ecotrack_iot_validated_delivery_oldest_pending_age_ms ${snapshot.deliveryOldestPendingAgeMs ?? 0}`,
      );

      lines.push('# HELP ecotrack_iot_ingestion_processed_last_hour Total staged ingestion events validated in the last hour.');
      lines.push('# TYPE ecotrack_iot_ingestion_processed_last_hour gauge');
      lines.push(`ecotrack_iot_ingestion_processed_last_hour ${snapshot.validatedLastHour}`);

      lines.push('# HELP ecotrack_iot_validated_delivery_processed_last_hour Total validated deliveries completed in the last hour.');
      lines.push('# TYPE ecotrack_iot_validated_delivery_processed_last_hour gauge');
      lines.push(`ecotrack_iot_validated_delivery_processed_last_hour ${snapshot.completedLastHour}`);

      lines.push('# HELP ecotrack_event_connector_exports Gauge of internal event-connector exports by status.');
      lines.push('# TYPE ecotrack_event_connector_exports gauge');
      for (const [status, count] of Object.entries(snapshot.connectorExportsByStatus).sort(([left], [right]) =>
        left.localeCompare(right),
      )) {
        lines.push(`ecotrack_event_connector_exports{status="${sanitizeLabelValue(status)}"} ${count}`);
      }

      lines.push('# HELP ecotrack_event_connector_backlog_total Total event-connector exports in pending, retry, or processing state.');
      lines.push('# TYPE ecotrack_event_connector_backlog_total gauge');
      lines.push(`ecotrack_event_connector_backlog_total ${connectorBacklog}`);

      lines.push('# HELP ecotrack_event_connector_oldest_pending_age_ms Oldest runnable event-connector export age in milliseconds.');
      lines.push('# TYPE ecotrack_event_connector_oldest_pending_age_ms gauge');
      lines.push(
        `ecotrack_event_connector_oldest_pending_age_ms ${snapshot.connectorOldestPendingAgeMs ?? 0}`,
      );

      lines.push('# HELP ecotrack_iot_backpressure_active Indicates whether ingestion backlog crossed the configured threshold.');
      lines.push('# TYPE ecotrack_iot_backpressure_active gauge');
      lines.push(`ecotrack_iot_backpressure_active ${ingestionBacklog >= backpressureThreshold ? 1 : 0}`);

      lines.push('# HELP ecotrack_iot_ingestion_shard_backlog Total runnable staged events grouped by shard.');
      lines.push('# TYPE ecotrack_iot_ingestion_shard_backlog gauge');
      for (const shard of snapshot.ingestionBacklogByShard) {
        lines.push(`ecotrack_iot_ingestion_shard_backlog{shard="${shard.shardId}"} ${shard.count}`);
      }

      lines.push('# HELP ecotrack_iot_validated_delivery_shard_backlog Total runnable deliveries grouped by shard.');
      lines.push('# TYPE ecotrack_iot_validated_delivery_shard_backlog gauge');
      for (const shard of snapshot.deliveryBacklogByShard) {
        lines.push(
          `ecotrack_iot_validated_delivery_shard_backlog{consumer="${sanitizeLabelValue(shard.consumerName)}",shard="${shard.shardId}"} ${shard.count}`,
        );
      }

      lines.push('# HELP ecotrack_containers_fill_total Total containers grouped by operational fill status.');
      lines.push('# TYPE ecotrack_containers_fill_total gauge');
      lines.push(`ecotrack_containers_fill_total{status="critical"} ${snapshot.criticalContainers}`);
      lines.push(`ecotrack_containers_fill_total{status="attention_required"} ${snapshot.attentionContainers}`);

      lines.push('# HELP ecotrack_citizen_reports_total Total citizen reports grouped by status.');
      lines.push('# TYPE ecotrack_citizen_reports_total gauge');
      for (const report of snapshot.citizenReportsByStatus) {
        lines.push(
          `ecotrack_citizen_reports_total{status="${sanitizeLabelValue(report.status)}"} ${report.count}`,
        );
      }

      lines.push('# HELP ecotrack_citizen_reports_created_last_hour Total citizen reports created in the last hour.');
      lines.push('# TYPE ecotrack_citizen_reports_created_last_hour gauge');
      lines.push(`ecotrack_citizen_reports_created_last_hour ${snapshot.citizenReportsCreatedLastHour}`);

      lines.push('# HELP ecotrack_tours_total Total tours grouped by status.');
      lines.push('# TYPE ecotrack_tours_total gauge');
      for (const tour of snapshot.toursByStatus) {
        lines.push(
          `ecotrack_tours_total{status="${sanitizeLabelValue(tour.status)}"} ${tour.count}`,
        );
      }

      lines.push('# HELP ecotrack_tours_completed_last_hour Total tours completed in the last hour.');
      lines.push('# TYPE ecotrack_tours_completed_last_hour gauge');
      lines.push(`ecotrack_tours_completed_last_hour ${snapshot.toursCompletedLastHour}`);

      lines.push('# HELP ecotrack_challenges_total Total citizen challenges grouped by status.');
      lines.push('# TYPE ecotrack_challenges_total gauge');
      for (const challenge of snapshot.challengesByStatus) {
        lines.push(
          `ecotrack_challenges_total{status="${sanitizeLabelValue(challenge.status)}"} ${challenge.count}`,
        );
      }

      lines.push('# HELP ecotrack_challenge_participations_total Total challenge participations grouped by status.');
      lines.push('# TYPE ecotrack_challenge_participations_total gauge');
      for (const participation of snapshot.challengeParticipationsByStatus) {
        lines.push(
          `ecotrack_challenge_participations_total{status="${sanitizeLabelValue(participation.status)}"} ${participation.count}`,
        );
      }

      lines.push('# HELP ecotrack_challenge_completions_last_hour Total completed challenge participations in the last hour.');
      lines.push('# TYPE ecotrack_challenge_completions_last_hour gauge');
      lines.push(`ecotrack_challenge_completions_last_hour ${snapshot.challengeCompletionsLastHour}`);

      lines.push('# HELP ecotrack_gamification_profiles_total Total gamification profiles.');
      lines.push('# TYPE ecotrack_gamification_profiles_total gauge');
      lines.push(`ecotrack_gamification_profiles_total ${snapshot.gamificationProfilesTotal}`);

      lines.push('# HELP ecotrack_gamification_points_total Current total citizen gamification points.');
      lines.push('# TYPE ecotrack_gamification_points_total gauge');
      lines.push(`ecotrack_gamification_points_total ${snapshot.gamificationPointsTotal}`);

      lines.push('# HELP ecotrack_containers_max_fill_percent Maximum observed container fill percentage.');
      lines.push('# TYPE ecotrack_containers_max_fill_percent gauge');
      lines.push(`ecotrack_containers_max_fill_percent ${snapshot.maxContainerFillLevel}`);

      lines.push('# HELP ecotrack_alert_events_open_total Total open alert events grouped by severity.');
      lines.push('# TYPE ecotrack_alert_events_open_total gauge');
      for (const alert of snapshot.openAlertsBySeverity) {
        lines.push(
          `ecotrack_alert_events_open_total{severity="${sanitizeLabelValue(alert.severity)}"} ${alert.count}`,
        );
      }

      lines.push('# HELP ecotrack_internal_consumer_lag_messages Total internal validated-delivery backlog per consumer.');
      lines.push('# TYPE ecotrack_internal_consumer_lag_messages gauge');
      lines.push('# HELP ecotrack_internal_consumer_lag_oldest_pending_age_ms Oldest pending internal-delivery age per consumer.');
      lines.push('# TYPE ecotrack_internal_consumer_lag_oldest_pending_age_ms gauge');
      lines.push('# HELP ecotrack_internal_consumer_lag_shard_skew Internal backlog skew between the busiest and least busy consumer shards.');
      lines.push('# TYPE ecotrack_internal_consumer_lag_shard_skew gauge');
      lines.push('# HELP ecotrack_internal_consumer_completed_last_hour Total completed internal deliveries in the last hour by consumer.');
      lines.push('# TYPE ecotrack_internal_consumer_completed_last_hour gauge');
      lines.push('# HELP ecotrack_internal_consumer_failures_total Total failed internal deliveries by consumer.');
      lines.push('# TYPE ecotrack_internal_consumer_failures_total gauge');
      for (const consumer of snapshot.deliveryLagByConsumer) {
        lines.push(
          `ecotrack_internal_consumer_lag_messages{consumer="${sanitizeLabelValue(consumer.consumerName)}"} ${consumer.backlogTotal}`,
        );
        lines.push(
          `ecotrack_internal_consumer_lag_oldest_pending_age_ms{consumer="${sanitizeLabelValue(consumer.consumerName)}"} ${consumer.oldestPendingAgeMs ?? 0}`,
        );
        lines.push(
          `ecotrack_internal_consumer_lag_shard_skew{consumer="${sanitizeLabelValue(consumer.consumerName)}"} ${consumer.shardSkew}`,
        );
        lines.push(
          `ecotrack_internal_consumer_completed_last_hour{consumer="${sanitizeLabelValue(consumer.consumerName)}"} ${consumer.completedLastHour}`,
        );
        lines.push(
          `ecotrack_internal_consumer_failures_total{consumer="${sanitizeLabelValue(consumer.consumerName)}"} ${consumer.failedCount}`,
        );
      }

      lines.push('# HELP ecotrack_event_connector_lag_messages Total event-connector backlog per connector.');
      lines.push('# TYPE ecotrack_event_connector_lag_messages gauge');
      lines.push('# HELP ecotrack_event_connector_completed_last_hour Total completed event-connector exports in the last hour by connector.');
      lines.push('# TYPE ecotrack_event_connector_completed_last_hour gauge');
      lines.push('# HELP ecotrack_event_connector_failures_total Total failed event-connector exports by connector.');
      lines.push('# TYPE ecotrack_event_connector_failures_total gauge');
      lines.push('# HELP ecotrack_event_connector_lag_oldest_pending_age_ms Oldest pending event-connector export age per connector.');
      lines.push('# TYPE ecotrack_event_connector_lag_oldest_pending_age_ms gauge');
      for (const connector of snapshot.connectorLagByConnector) {
        lines.push(
          `ecotrack_event_connector_lag_messages{connector="${sanitizeLabelValue(connector.connectorName)}"} ${connector.backlogTotal}`,
        );
        lines.push(
          `ecotrack_event_connector_completed_last_hour{connector="${sanitizeLabelValue(connector.connectorName)}"} ${connector.completedLastHour}`,
        );
        lines.push(
          `ecotrack_event_connector_failures_total{connector="${sanitizeLabelValue(connector.connectorName)}"} ${connector.failedCount}`,
        );
        lines.push(
          `ecotrack_event_connector_lag_oldest_pending_age_ms{connector="${sanitizeLabelValue(connector.connectorName)}"} ${connector.oldestPendingAgeMs ?? 0}`,
        );
      }

      lines.push('# HELP ecotrack_admin_audit_actions_last_hour Total admin audit actions grouped by action in the last hour.');
      lines.push('# TYPE ecotrack_admin_audit_actions_last_hour gauge');
      for (const auditAction of snapshot.recentAuditActions) {
        lines.push(
          `ecotrack_admin_audit_actions_last_hour{action="${sanitizeLabelValue(auditAction.action)}"} ${auditAction.count}`,
        );
      }
    } catch {
      lines.push('# HELP ecotrack_observability_snapshot_up Whether DB-backed observability metrics were collected.');
      lines.push('# TYPE ecotrack_observability_snapshot_up gauge');
      lines.push('ecotrack_observability_snapshot_up 0');
    }

    return `${lines.join('\n')}\n`;
  }
}
