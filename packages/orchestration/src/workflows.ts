/**
 * Temporal Workflow Definitions
 * 
 * The workflow is designed to be deterministic - all side effects go through activities.
 * This allows Temporal to replay the workflow from any point.
 * 
 * NOTE: This file uses the @temporalio/workflow API. For production, this needs to be
 * compiled with @temporalio/workflow bundler. For now, we just define the structure.
 */
import {
  ProjectId,
  WorkflowRunId,
  BriefArtifact,
  CritiqueResultArtifact,
  RequirementsArtifact,
  AcceptanceCriteriaArtifact,
  OutOfScopeArtifact,
  NonFunctionalRequirementsArtifact,
  ArchitectureArtifact,
  ImplementationPlanArtifact,
  TaskGraphArtifact,
  TestStrategyArtifact,
  DevExecutionResultArtifact,
  QaReportArtifact,
  AcMatrixArtifact,
  ClarificationResponsePayload,
  ApprovalDecision,
  WorkflowState,
} from "@workflow-jk/contracts";
import { TEMPORAL_TASK_QUEUE, SIGNAL_NAMES } from "@workflow-jk/config";

// Re-export signal names for use in workflows
export { SIGNAL_NAMES };

// Workflow IDs
export const WORKFLOW_IDS = {
  PROJECT_DELIVERY: "project-delivery-workflow",
} as const;

/**
 * Signal for clarification answers from humans
 */
export const SIGNAL_NAME_CLARIFICATION_ANSWERS = SIGNAL_NAMES.CLARIFICATION_ANSWERS;

/**
 * Signal for requirements approval from humans
 */
export const SIGNAL_NAME_REQUIREMENTS_APPROVAL = SIGNAL_NAMES.REQUIREMENTS_APPROVAL;

/**
 * Signal for architecture approval from humans
 */
export const SIGNAL_NAME_ARCHITECTURE_APPROVAL = SIGNAL_NAMES.ARCHITECTURE_APPROVAL;

/**
 * Activity result types for workflow to use
 */
export interface ArchitectureArtifacts {
  architecture: ArchitectureArtifact;
  implementationPlan: ImplementationPlanArtifact;
  taskGraph: TaskGraphArtifact;
  testStrategy: TestStrategyArtifact;
}

export interface QaArtifacts {
  qaReport: QaReportArtifact;
  acMatrix: AcMatrixArtifact;
}

export interface RequirementArtifacts {
  requirements: RequirementsArtifact;
  acceptanceCriteria: AcceptanceCriteriaArtifact;
  outOfScope: OutOfScopeArtifact;
  nonFunctionalRequirements: NonFunctionalRequirementsArtifact;
}

/**
 * Task pack structure for dev agents
 */
export interface TaskPackInput {
  taskId: string;
  title: string;
  description: string;
  acceptanceCriteria: Array<{
    id: string;
    given: string;
    when: string;
    then: string;
  }>;
  context: string;
}

/**
 * Workflow input parameters
 */
export interface ProjectDeliveryWorkflowInput {
  projectId: ProjectId;
  rawIdea: string;
  businessGoal: string;
  constraints: string[];
  assumptions: string[];
}

/**
 * Stub for projectDeliveryWorkflow - actual implementation requires
 * @temporalio/workflow imports that need special bundling.
 * 
 * The actual workflow performs these stages:
 * 1. Intake - Generate brief from raw idea
 * 2. Requirements Critique - Analyze and identify gaps
 * 3. Clarification Loop - Wait for human answers
 * 4. Requirements Finalization - Create formal requirements
 * 5. Requirements Approval - Wait for human approval
 * 6. Architecture - Generate architecture and task graph
 * 7. Architecture Approval - Wait for human approval
 * 8. Dev Execution - Implement tasks iteratively
 * 9. QA - Verify each task
 * 10. Release Decision - Final go/no-go
 */
export async function projectDeliveryWorkflow(_input: ProjectDeliveryWorkflowInput): Promise<void> {
  // This is a stub - the actual implementation requires
  // Temporal workflow API imports that need special bundling
  throw new Error(
    "projectDeliveryWorkflow requires @temporalio/workflow bundling. " +
    "Use the built workflow bundle in production."
  );
}