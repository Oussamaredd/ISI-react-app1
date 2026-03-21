import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

type TracingBootstrapHandle = {
  enabled: boolean;
  shutdown: () => Promise<void>;
};

const DISABLED_HANDLE: TracingBootstrapHandle = {
  enabled: false,
  shutdown: async () => undefined,
};

const DEFAULT_SERVICE_NAME = 'ecotrack-api';
const DEFAULT_EXPORTER_URL = 'http://localhost:4318/v1/traces';
const DEFAULT_SAMPLING_RATIO = 1;

const parseBoolean = (value: string | undefined) => value?.trim().toLowerCase() === 'true';

export const trimTrailingSlashes = (value: string) => {
  let endIndex = value.length;

  while (endIndex > 0 && value.charCodeAt(endIndex - 1) === 47) {
    endIndex -= 1;
  }

  return endIndex === value.length ? value : value.slice(0, endIndex);
};

const parseSamplingRatio = (value: string | undefined) => {
  if (!value) {
    return DEFAULT_SAMPLING_RATIO;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : DEFAULT_SAMPLING_RATIO;
};

export const normalizeOtlpEndpoint = (value: string | undefined) => {
  const normalized = value?.trim();
  if (!normalized) {
    return DEFAULT_EXPORTER_URL;
  }

  return normalized.endsWith('/v1/traces') ? normalized : `${trimTrailingSlashes(normalized)}/v1/traces`;
};

export async function startTelemetry(
  env: NodeJS.ProcessEnv = process.env,
): Promise<TracingBootstrapHandle> {
  if (!parseBoolean(env.OTEL_TRACING_ENABLED)) {
    return DISABLED_HANDLE;
  }

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: env.OTEL_SERVICE_NAME?.trim() || DEFAULT_SERVICE_NAME,
    }),
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(parseSamplingRatio(env.OTEL_TRACES_SAMPLER_RATIO)),
    }),
    traceExporter: new OTLPTraceExporter({
      url: normalizeOtlpEndpoint(env.OTEL_EXPORTER_OTLP_ENDPOINT),
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
      }),
    ],
  });

  sdk.start();

  return {
    enabled: true,
    shutdown: async () => {
      await sdk.shutdown().catch(() => undefined);
    },
  };
}
