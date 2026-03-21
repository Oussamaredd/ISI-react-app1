import { describe, expect, it } from 'vitest';

import {
  normalizeOtlpEndpoint,
  startTelemetry,
  trimTrailingSlashes,
} from '../observability/tracing.js';

describe('Tracing bootstrap helpers', () => {
  it('removes trailing slashes without changing other characters', () => {
    expect(trimTrailingSlashes('https://otel.internal.example///')).toBe('https://otel.internal.example');
    expect(trimTrailingSlashes('https://otel.internal.example/v1/traces')).toBe(
      'https://otel.internal.example/v1/traces',
    );
  });

  it('normalizes OTLP endpoints to the traces path', () => {
    expect(normalizeOtlpEndpoint(undefined)).toBe('http://localhost:4318/v1/traces');
    expect(normalizeOtlpEndpoint('https://otel.internal.example///')).toBe(
      'https://otel.internal.example/v1/traces',
    );
    expect(normalizeOtlpEndpoint('https://otel.internal.example/v1/traces')).toBe(
      'https://otel.internal.example/v1/traces',
    );
  });
});

describe('Tracing bootstrap', () => {
  it('returns a disabled handle when tracing is not enabled', async () => {
    const handle = await startTelemetry({
      OTEL_TRACING_ENABLED: 'false',
    } as NodeJS.ProcessEnv);

    expect(handle.enabled).toBe(false);
    await expect(handle.shutdown()).resolves.toBeUndefined();
  });
});
