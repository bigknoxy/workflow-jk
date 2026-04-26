export const TEMPORAL_TASK_QUEUE = "workflow-jk-tasks";

export const WORKFLOW_IDS = {
  PROJECT_DELIVERY: "project-delivery-workflow",
} as const;

export const SIGNAL_NAMES = {
  CLARIFICATION_ANSWERS: "clarification-answers",
  REQUIREMENTS_APPROVAL: "requirements-approval",
  ARCHITECTURE_APPROVAL: "architecture-approval",
} as const;

export const ACTIVITY_NAMES = {
  RUN_INTAKE_AGENT: "runIntakeAgent",
  RUN_REQUIREMENTS_CRITIC: "runRequirementsCriticAgent",
  FINALIZE_REQUIREMENTS: "finalizeRequirements",
  RUN_ARCHITECT_AGENT: "runArchitectAgent",
  RUN_DEV_AGENT: "runDevAgent",
  RUN_QA_AGENT: "runQaAgent",
  SAVE_ARTIFACT: "saveArtifact",
  PERSIST_WORKFLOW_STATE: "persistWorkflowState",
  NOTIFY_AWAITING_INPUT: "notifyAwaitingInput",
} as const;

export const RETRY_POLICIES = {
  AGENT_INVOCATION: {
    initialInterval: 5_000,
    backoffCoefficient: 2,
    maximumInterval: 60_000,
    maximumAttempts: 3,
  },
  DATABASE: {
    initialInterval: 1_000,
    backoffCoefficient: 2,
    maximumInterval: 10_000,
    maximumAttempts: 5,
  },
} as const;

export const TIMEOUTS = {
  AGENT_INVOCATION_MS: 120_000,
  CLARIFICATION_WAIT_MS: 86_400_000,
  APPROVAL_WAIT_MS: 86_400_000,
  DEV_EXECUTION_MS: 300_000,
  QA_EXECUTION_MS: 180_000,
} as const;