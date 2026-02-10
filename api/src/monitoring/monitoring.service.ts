import { Injectable } from '@nestjs/common';

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

@Injectable()
export class MonitoringService {
  private frontendErrorsTotal = 0;
  private frontendMetricsTotal = 0;
  private readonly frontendErrorsByType = new Map<string, number>();
  private readonly frontendMetricsByType = new Map<string, number>();
  private readonly frontendErrors: FrontendErrorEvent[] = [];
  private readonly frontendMetrics: FrontendMetricEvent[] = [];

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
    const lines: string[] = [
      '# HELP frontend_errors_total Total number of frontend errors ingested.',
      '# TYPE frontend_errors_total counter',
      `frontend_errors_total ${this.frontendErrorsTotal}`,
      '# HELP frontend_metrics_total Total number of frontend metrics ingested.',
      '# TYPE frontend_metrics_total counter',
      `frontend_metrics_total ${this.frontendMetricsTotal}`,
      '# HELP frontend_error_buffer_size Number of frontend errors retained in memory.',
      '# TYPE frontend_error_buffer_size gauge',
      `frontend_error_buffer_size ${this.frontendErrors.length}`,
      '# HELP frontend_metric_buffer_size Number of frontend metrics retained in memory.',
      '# TYPE frontend_metric_buffer_size gauge',
      `frontend_metric_buffer_size ${this.frontendMetrics.length}`,
      '# HELP frontend_errors_by_type_total Total frontend errors by type.',
      '# TYPE frontend_errors_by_type_total counter',
    ];

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

    return `${lines.join('\n')}\n`;
  }
}
