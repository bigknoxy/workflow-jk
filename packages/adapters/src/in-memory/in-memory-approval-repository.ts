import { ApprovalRepository } from "../ports";
import { ApprovalRecord, WorkflowRunId } from "@workflow-jk/contracts";

export class InMemoryApprovalRepository implements ApprovalRepository {
  private approvals: Map<string, ApprovalRecord> = new Map();

  async save(approval: ApprovalRecord): Promise<ApprovalRecord> {
    this.approvals.set(approval.id, approval);
    return approval;
  }

  async getByWorkflowId(workflowRunId: WorkflowRunId): Promise<ApprovalRecord[]> {
    return Array.from(this.approvals.values()).filter(
      (a) => a.workflowRunId === workflowRunId,
    );
  }

  async getLatestByType(workflowRunId: WorkflowRunId, artifactType: string): Promise<ApprovalRecord | null> {
    const records = await this.getByWorkflowId(workflowRunId);
    const filtered = records
      .filter((a) => a.artifactType === artifactType)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return filtered[0] ?? null;
  }

  clear(): void {
    this.approvals.clear();
  }
}