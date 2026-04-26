import {
  WorkflowRunId,
  ProjectId,
  OrganizationId,
  WorkflowRun,
  WorkflowState,
  ClarificationResponsePayload,
  ApprovalDecision,
  ApprovalPayload,
  ApprovalRecord,
} from "@workflow-jk/contracts";
import type {
  WorkflowRepository,
  ApprovalRepository,
  Clock,
} from "@workflow-jk/adapters";
import { withSpan } from "@workflow-jk/observability";

const TEST_ORG_ID = "00000000-0000-0000-0000-000000000000" as unknown as OrganizationId;

export interface WorkflowServiceDeps {
  workflowRepository: WorkflowRepository;
  approvalRepository: ApprovalRepository;
  clock: Clock;
  sendSignal: (
    workflowRunId: string,
    signalName: string,
    payload: unknown,
  ) => Promise<void>;
}

export class WorkflowService {
  constructor(private deps: WorkflowServiceDeps) {}

  async getWorkflow(id: WorkflowRunId, organizationId: OrganizationId = TEST_ORG_ID): Promise<WorkflowRun | null> {
    return this.deps.workflowRepository.getById(id, organizationId);
  }

  async getWorkflowByProject(projectId: ProjectId, organizationId: OrganizationId = TEST_ORG_ID): Promise<WorkflowRun | null> {
    return this.deps.workflowRepository.getByProjectId(projectId, organizationId);
  }

  async submitClarificationAnswers(
    workflowRunId: string,
    answers: ClarificationResponsePayload,
  ): Promise<void> {
    return withSpan("service.submitClarificationAnswers", async (span) => {
      span.setAttribute("workflow.runId", workflowRunId);
      await this.deps.sendSignal(workflowRunId, "clarification-answers", answers);
    });
  }

  async submitRequirementsApproval(
    workflowRunId: string,
    decision: ApprovalDecision,
    reviewer: string,
    comments?: string,
  ): Promise<void> {
    return withSpan("service.submitRequirementsApproval", async (span) => {
      span.setAttribute("workflow.runId", workflowRunId);
      await this.deps.sendSignal(workflowRunId, "requirements-approval", {
        decision,
        reviewer,
        comments,
      });
    });
  }

  async submitArchitectureApproval(
    workflowRunId: string,
    decision: ApprovalDecision,
    reviewer: string,
    comments?: string,
  ): Promise<void> {
    return withSpan("service.submitArchitectureApproval", async (span) => {
      span.setAttribute("workflow.runId", workflowRunId);
      await this.deps.sendSignal(workflowRunId, "architecture-approval", {
        decision,
        reviewer,
        comments,
      });
    });
  }

  async getApprovals(workflowRunId: WorkflowRunId): Promise<ApprovalRecord[]> {
    return this.deps.approvalRepository.getByWorkflowId(workflowRunId);
  }
}