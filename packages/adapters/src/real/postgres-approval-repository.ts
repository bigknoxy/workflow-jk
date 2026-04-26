import pg from "pg";
import { ApprovalRepository } from "../ports";
import { ApprovalRecord, WorkflowRunId, OrganizationId } from "@workflow-jk/contracts";

export class PostgresApprovalRepository implements ApprovalRepository {
  private pool: pg.Pool;

  constructor({ pool }: { pool: pg.Pool }) {
    this.pool = pool;
  }

  async save(approval: ApprovalRecord): Promise<ApprovalRecord> {
    const query = `
      INSERT INTO approvals (id, workflow_run_id, organization_id, artifact_type, decision, reviewer, comment, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    await this.pool.query(query, [
      approval.id,
      approval.workflowRunId,
      approval.organizationId,
      approval.artifactType,
      approval.decision,
      approval.reviewer,
      approval.comments ?? null,
      approval.createdAt,
    ]);
    return approval;
  }

  async getByWorkflowId(workflowRunId: WorkflowRunId): Promise<ApprovalRecord[]> {
    const query = `SELECT * FROM approvals WHERE workflow_run_id = $1 ORDER BY created_at DESC`;
    const result = await this.pool.query(query, [workflowRunId]);
    return result.rows.map(this.mapRowToApproval);
  }

  async getLatestByType(workflowRunId: WorkflowRunId, artifactType: string): Promise<ApprovalRecord | null> {
    const query = `
      SELECT * FROM approvals 
      WHERE workflow_run_id = $1 AND artifact_type = $2 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const result = await this.pool.query(query, [workflowRunId, artifactType]);
    if (result.rows.length === 0) return null;
    return this.mapRowToApproval(result.rows[0]);
  }

  private mapRowToApproval(row: Record<string, unknown>): ApprovalRecord {
    return {
      id: row.id as string,
      workflowRunId: row.workflow_run_id as WorkflowRunId,
      organizationId: row.organization_id as OrganizationId,
      artifactType: row.artifact_type as string,
      decision: row.decision as "approved" | "rejected" | "changes_requested",
      reviewer: row.reviewer as string,
      comments: row.comment as string | undefined,
      createdAt: row.created_at as string,
    };
  }
}