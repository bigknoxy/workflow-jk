// Tracer
export {
  getTracer,
  startSpan,
  withSpan,
  recordEvent,
  setSpanError,
} from "./tracer";

// Logger
export {
  Logger,
  StructuredLogger,
  createLogger,
} from "./logger";

// Setup
export {
  setupObservability,
  shutdownObservability,
  ObservabilityConfig,
} from "./setup";

// Metrics
export {
  MetricAttributes,
  WorkflowTraceAttributes,
  AgentTraceAttributes,
  workflowAttributes,
  agentAttributes,
  WorkflowInstruments,
  getMeter,
  getInstruments,
  incrementActiveWorkflows,
  decrementActiveWorkflows,
  getActiveWorkflowCount,
  setupMetrics,
  shutdownMetrics,
  getPrometheusExporter,
} from "./metrics";