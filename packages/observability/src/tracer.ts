import { trace, context, SpanStatusCode, Span, SpanOptions, Attributes } from "@opentelemetry/api";

const TRACER_NAME = "workflow-jk";

export function getTracer(name: string = TRACER_NAME) {
  return trace.getTracer(name, "1.0.0");
}

export function startSpan(name: string, options?: SpanOptions, attributes?: Attributes): Span {
  const tracer = getTracer();
  return tracer.startSpan(name, options, context.active());
}

export function withSpan<T>(name: string, fn: (span: Span) => Promise<T>, attributes?: Attributes): Promise<T> {
  const tracer = getTracer();
  return tracer.startActiveSpan(name, async (span) => {
    if (attributes) {
      span.setAttributes(attributes);
    }
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      span.end();
    }
  });
}

export function recordEvent(span: Span, name: string, attributes?: Attributes): void {
  span.addEvent(name, attributes);
}

export function setSpanError(span: Span, message: string): void {
  span.setStatus({ code: SpanStatusCode.ERROR, message });
}