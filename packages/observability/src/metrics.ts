import { Attributes, UpDownCounter, Histogram, ObservableGauge, Meter } from "@opentelemetry/api";
import { MeterProvider, PushMetricExporter } from "@opentelemetry/sdk-metrics";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";

const ATTR_PROJECT_ID = "workflow.project_id";
const ATTR_WORKFLOW_RUN_ID = "workflow.run_id";
const ATTR_STATE = "workflow.state";
const ATTR_AGENT_NAME = "workflow.agent_name";
const ATTR_MODEL_PROVIDER = "workflow.model_provider";
const ATTR_MODEL_ID = "workflow.model_id";
const ATTR_TOKEN_PROMPT = "workflow.token_prompt";
const ATTR_TOKEN_COMPLETION = "workflow.token_completion";
const ATTR_TOKEN_TOTAL = "workflow.token_total";
const ATTR_SUCCESS = "workflow.success";
const ATTR_DECISION = "workflow.approval_decision";
const ATTR_ARTIFACT_TYPE = "workflow.artifact_type";

export const MetricAttributes = {
  PROJECT_ID: ATTR_PROJECT_ID,
  WORKFLOW_RUN_ID: ATTR_WORKFLOW_RUN_ID,
  STATE: ATTR_STATE,
  AGENT_NAME: ATTR_AGENT_NAME,
  MODEL_PROVIDER: ATTR_MODEL_PROVIDER,
  MODEL_ID: ATTR_MODEL_ID,
  TOKEN_PROMPT: ATTR_TOKEN_PROMPT,
  TOKEN_COMPLETION: ATTR_TOKEN_COMPLETION,
  TOKEN_TOTAL: ATTR_TOKEN_TOTAL,
  SUCCESS: ATTR_SUCCESS,
  DECISION: ATTR_DECISION,
  ARTIFACT_TYPE: ATTR_ARTIFACT_TYPE,
} as const;

export interface WorkflowTraceAttributes {
  projectId: string;
  workflowRunId: string;
  state: string;
}

export interface AgentTraceAttributes {
  agentName: string;
  modelProvider?: string;
  modelId?: string;
  tokenUsage?: { prompt: number; completion: number; total: number };
  success: boolean;
}

export function workflowAttributes(attrs: WorkflowTraceAttributes): Attributes {
  return {
    [ATTR_PROJECT_ID]: attrs.projectId,
    [ATTR_WORKFLOW_RUN_ID]: attrs.workflowRunId,
    [ATTR_STATE]: attrs.state,
  };
}

export function agentAttributes(attrs: AgentTraceAttributes): Attributes {
  const result: Attributes = {
    [ATTR_AGENT_NAME]: attrs.agentName,
    [ATTR_SUCCESS]: attrs.success,
  };
  if (attrs.modelProvider) result[ATTR_MODEL_PROVIDER] = attrs.modelProvider;
  if (attrs.modelId) result[ATTR_MODEL_ID] = attrs.modelId;
  if (attrs.tokenUsage) {
    result[ATTR_TOKEN_PROMPT] = attrs.tokenUsage.prompt;
    result[ATTR_TOKEN_COMPLETION] = attrs.tokenUsage.completion;
    result[ATTR_TOKEN_TOTAL] = attrs.tokenUsage.total;
  }
  return result;
}

export interface WorkflowInstruments {
  workflowStartedTotal: UpDownCounter;
  workflowDuration: Histogram;
  agentInvocationsTotal: UpDownCounter;
  approvalDecisionsTotal: UpDownCounter;
  activeWorkflowsGauge: ObservableGauge;
}

let meter: Meter | undefined;
let instruments: WorkflowInstruments | undefined;
let activeWorkflowCount = 0;
let meterProvider: MeterProvider | undefined;
let prometheusExporter: PrometheusExporter | undefined;

export function getMeter(): Meter {
  if (!meter) {
    meter = meterProvider!.getMeter("workflow-jk", "1.0.0");
  }
  return meter;
}

export function getInstruments(): WorkflowInstruments {
  if (!instruments) {
    const m = getMeter();
    instruments = {
      workflowStartedTotal: m.createUpDownCounter("workflow.started.total", {
        description: "Total number of workflows started",
      }),
      workflowDuration: m.createHistogram("workflow.duration.ms", {
        description: "Workflow execution duration in milliseconds",
      }),
      agentInvocationsTotal: m.createUpDownCounter("workflow.agent.invocations.total", {
        description: "Total number of agent invocations",
      }),
      approvalDecisionsTotal: m.createUpDownCounter("workflow.approval.decisions.total", {
        description: "Total number of approval decisions",
      }),
      activeWorkflowsGauge: m.createObservableGauge("workflow.active.count", {
        description: "Number of currently active workflows",
      }),
    };
    instruments.activeWorkflowsGauge.addCallback((observableResult: { observe: (value: number, attributes?: Attributes) => void }) => {
      observableResult.observe(activeWorkflowCount);
    });
  }
  return instruments;
}

export function incrementActiveWorkflows(): void {
  activeWorkflowCount++;
}

export function decrementActiveWorkflows(): void {
  activeWorkflowCount = Math.max(0, activeWorkflowCount - 1);
}

export function getActiveWorkflowCount(): number {
  return activeWorkflowCount;
}

export function setupMetrics(
  prometheusPort?: number,
  otlpMetricExporter?: PushMetricExporter,
): { meterProvider: MeterProvider; prometheusExporter?: PrometheusExporter } {
  const readers = [];

  if (prometheusPort) {
    prometheusExporter = new PrometheusExporter({ port: prometheusPort });
    readers.push(prometheusExporter);
  }

  meterProvider = new MeterProvider({ readers });
  meter = meterProvider.getMeter("workflow-jk", "1.0.0");

  if (!instruments) {
    getInstruments();
  }

  return { meterProvider, prometheusExporter: prometheusExporter ?? undefined };
}

export async function shutdownMetrics(): Promise<void> {
  if (meterProvider) {
    await meterProvider.shutdown();
    meterProvider = undefined;
    meter = undefined;
    instruments = undefined;
  }
}

export function getPrometheusExporter(): PrometheusExporter | undefined {
  return prometheusExporter;
}