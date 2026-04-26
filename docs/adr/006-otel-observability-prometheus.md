# ADR-006: OTel Observability with Prometheus

## Status: Accepted

## Context
We need runtime observability for workflow execution to:
- Monitor workflow start/duration/completion rates
- Track agent execution performance
- Measure approval decision patterns
- Expose metrics for Prometheus scraping

## Decision
Use OpenTelemetry SDK with 5 instruments and Prometheus exporter:

### Instruments

1. **workflowStartedTotal** (UpDownCounter): Incremented when workflow starts
2. **workflowDurationMs** (Histogram): Duration from start to completion/failure
3. **activeWorkflows** (ObservableGauge): Current active workflow count
4. **approvalDecisionsTotal** (UpDownCounter): Approval/rejection decisions by artifact type
5. **agentExecutionsTotal** (Counter): Agent executions by agent type and outcome

### Export
- Prometheus exporter on configurable port (default 9090)
- Best-effort instrument calls (fail gracefully if metrics unavailable)
- OTLP endpoint for distributed tracing (optional)

## Implementation

```typescript
// Example usage
const instruments = getInstruments();

// Workflow start
instruments.workflowStartedTotal.add(1, { [MetricAttributes.PROJECT_ID]: projectId });

// Workflow duration (in finally block)
instruments.workflowDurationMs.record(durationMs, { 
  [MetricAttributes.WORKFLOW_STATE]: state 
});

// Active workflows (observable)
instruments.activeWorkflows.observe(activeCount);

// Approval decision
instruments.approvalDecisionsTotal.add(1, {
  [MetricAttributes.DECISION]: decision,  // "approved" | "rejected"
  [MetricAttributes.ARTIFACT_TYPE]: artifactType,
});
```

## Consequences

### Positive
- Real-time metrics on workflow/agent performance
- Prometheus-compatible for standard monitoring stacks
- Separate metrics port (9090) avoids API port conflicts
- Best-effort ensures no runtime failures

### Negative
- Additional dependency (OTel SDK, Prometheus exporter)
- Must configure exporters in production
- Histogram bucket configuration requires tuning