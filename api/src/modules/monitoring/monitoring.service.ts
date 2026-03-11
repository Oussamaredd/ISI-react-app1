import { Injectable } from '@nestjs/common';

import { HTTP_REQUEST_DURATION_BUCKETS_MS } from './http-metrics.utils.js';

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
const buildBucketKey = (method: string, path: string, bucket: number) =>
  `${method} ${path} ${bucket}`;

@Injectable()
export class MonitoringService {
  private frontendErrorsTotal = 0;
  private frontendMetricsTotal = 0;
  private httpRequestsInFlight = 0;
  private httpRequestsTotal = 0;
  private httpRequestErrorsTotal = 0;
  private readonly frontendErrorsByType = new Map<string, number>();
  private readonly frontendMetricsByType = new Map<string, number>();
  private readonly httpRequestsByRoute = new Map<string, number>();
  private readonly httpRequestErrorsByRoute = new Map<string, number>();
  private readonly httpRequestDurationBuckets = new Map<string, number>();
  private readonly httpRequestDurationCountByRoute = new Map<string, number>();
  private readonly httpRequestDurationSumMsByRoute = new Map<string, number>();
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

  renderPrometheusMetrics(): string {
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

    lines.push('# HELP ecotrack_http_request_duration_ms API request duration histogram in milliseconds.');
    lines.push('# TYPE ecotrack_http_request_duration_ms histogram');

    const histogramRoutes = new Set<string>();
    for (const key of this.httpRequestsByRoute.keys()) {
      const [method, path] = key.split(' ');
      histogramRoutes.add(buildMethodPathKey(method, path));
    }

    for (const routeKey of [...histogramRoutes].sort()) {
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

    return `${lines.join('\n')}\n`;
  }
}
