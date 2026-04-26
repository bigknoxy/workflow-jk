import { trace, context } from "@opentelemetry/api";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  traceId?: string;
  spanId?: string;
  attributes?: Record<string, unknown>;
}

export interface Logger {
  debug(message: string, attributes?: Record<string, unknown>): void;
  info(message: string, attributes?: Record<string, unknown>): void;
  warn(message: string, attributes?: Record<string, unknown>): void;
  error(message: string, attributes?: Record<string, unknown>, error?: Error): void;
}

function getTraceContext(): { traceId?: string; spanId?: string } {
  const span = trace.getSpan(context.active());
  if (!span) return {};
  const spanContext = span.spanContext();
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
  };
}

export class StructuredLogger implements Logger {
  constructor(private context?: Record<string, unknown>) {}

  private log(level: LogLevel, message: string, attributes?: Record<string, unknown>, error?: Error): void {
    const traceCtx = getTraceContext();
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...traceCtx,
      attributes: { ...this.context, ...attributes, ...(error ? { error: error.message, stack: error.stack } : {}) },
    };
    const output = JSON.stringify(entry);
    switch (level) {
      case "debug": console.debug(output); break;
      case "info": console.info(output); break;
      case "warn": console.warn(output); break;
      case "error": console.error(output); break;
    }
  }

  debug(message: string, attributes?: Record<string, unknown>): void {
    this.log("debug", message, attributes);
  }

  info(message: string, attributes?: Record<string, unknown>): void {
    this.log("info", message, attributes);
  }

  warn(message: string, attributes?: Record<string, unknown>): void {
    this.log("warn", message, attributes);
  }

  error(message: string, attributes?: Record<string, unknown>, error?: Error): void {
    this.log("error", message, attributes, error);
  }

  child(context: Record<string, unknown>): Logger {
    return new StructuredLogger({ ...this.context, ...context });
  }
}

export function createLogger(context?: Record<string, unknown>): Logger {
  return new StructuredLogger(context);
}