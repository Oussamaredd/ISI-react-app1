import {
  ROOT_CONTEXT,
  SpanKind,
  SpanStatusCode,
  context,
  propagation,
  trace,
  type Context,
  type Span,
  type SpanOptions,
} from '@opentelemetry/api';

type PrimitiveSpanAttribute = boolean | number | string;

type TraceCarrier = {
  traceparent?: string | null;
  tracestate?: string | null;
};

const TRACER_NAME = 'ecotrack-api';

const toAttributeMap = (attributes?: Record<string, PrimitiveSpanAttribute | null | undefined>) => {
  if (!attributes) {
    return undefined;
  }

  const normalizedEntries = Object.entries(attributes).filter(
    (entry): entry is [string, PrimitiveSpanAttribute] =>
      typeof entry[1] === 'string' || typeof entry[1] === 'number' || typeof entry[1] === 'boolean',
  );

  return normalizedEntries.length > 0 ? Object.fromEntries(normalizedEntries) : undefined;
};

const formatTraceparent = (traceId: string, spanId: string, traceFlags: number) =>
  `00-${traceId}-${spanId}-${traceFlags.toString(16).padStart(2, '0')}`;

export function getPersistedTraceCarrier(sourceContext: Context = context.active()): Required<TraceCarrier> {
  const activeSpan = trace.getSpan(sourceContext);
  const activeSpanContext = activeSpan?.spanContext();

  if (!activeSpanContext?.traceId || !activeSpanContext.spanId) {
    return {
      traceparent: null,
      tracestate: null,
    };
  }

  return {
    traceparent: formatTraceparent(
      activeSpanContext.traceId,
      activeSpanContext.spanId,
      activeSpanContext.traceFlags,
    ),
    tracestate: activeSpanContext.traceState?.serialize() ?? null,
  };
}

export function extractContextFromTraceCarrier(carrier: TraceCarrier): Context {
  const normalizedCarrier: Record<string, string> = {};

  if (typeof carrier.traceparent === 'string' && carrier.traceparent.trim().length > 0) {
    normalizedCarrier.traceparent = carrier.traceparent.trim();
  }

  if (typeof carrier.tracestate === 'string' && carrier.tracestate.trim().length > 0) {
    normalizedCarrier.tracestate = carrier.tracestate.trim();
  }

  if (Object.keys(normalizedCarrier).length === 0) {
    return context.active();
  }

  return propagation.extract(ROOT_CONTEXT, normalizedCarrier);
}

export async function withActiveSpan<T>(
  name: string,
  callback: (span: Span) => Promise<T> | T,
  options?: {
    attributes?: Record<string, PrimitiveSpanAttribute | null | undefined>;
    kind?: SpanKind;
    parentContext?: Context;
  },
): Promise<T> {
  const tracer = trace.getTracer(TRACER_NAME);
  const spanOptions: SpanOptions = {
    kind: options?.kind ?? SpanKind.INTERNAL,
    attributes: toAttributeMap(options?.attributes),
  };
  const parentContext = options?.parentContext ?? context.active();

  return tracer.startActiveSpan(name, spanOptions, parentContext, async (span) => {
    try {
      const result = await callback(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown span error',
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
