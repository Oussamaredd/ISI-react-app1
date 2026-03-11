import { describe, expect, it } from 'vitest';

import {
  TRACEPARENT_HEADER,
  TRACESTATE_HEADER,
  normalizeTraceparent,
  resolveTraceContext,
} from '../common/trace-context.js';

describe('trace context normalization', () => {
  it('accepts valid W3C traceparent headers', () => {
    expect(
      normalizeTraceparent('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'),
    ).toBe('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
  });

  it('rejects malformed or all-zero traceparent headers', () => {
    expect(normalizeTraceparent('00-invalid-00f067aa0ba902b7-01')).toBeUndefined();
    expect(
      normalizeTraceparent('00-00000000000000000000000000000000-00f067aa0ba902b7-01'),
    ).toBeUndefined();
    expect(
      normalizeTraceparent('00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01'),
    ).toBeUndefined();
  });
});

describe('trace context resolution', () => {
  it('prefers request-level trace fields when already resolved', () => {
    const traceContext = resolveTraceContext({
      headers: {},
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
      spanId: '00f067aa0ba902b7',
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      tracestate: 'vendor=stable',
    } as never);

    expect(traceContext).toEqual({
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
      spanId: '00f067aa0ba902b7',
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      tracestate: 'vendor=stable',
    });
  });

  it('extracts trace context from incoming headers', () => {
    const traceContext = resolveTraceContext({
      headers: {
        [TRACEPARENT_HEADER]: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
        [TRACESTATE_HEADER]: 'vendor=stable',
      },
    } as never);

    expect(traceContext).toEqual({
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
      spanId: '00f067aa0ba902b7',
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      tracestate: 'vendor=stable',
    });
  });

  it('generates a new trace context when headers are missing', () => {
    const traceContext = resolveTraceContext({
      headers: {},
    } as never);

    expect(traceContext.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(traceContext.spanId).toMatch(/^[0-9a-f]{16}$/);
    expect(traceContext.traceparent).toMatch(
      /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/,
    );
  });
});
