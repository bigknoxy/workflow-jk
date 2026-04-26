import pg from "pg";
import { WorkflowRepository } from "../ports";
import { WorkflowRun, WorkflowRunId, WorkflowState, ProjectId, OrganizationId } from "@workflow-jk/contracts";

export class PostgresWorkflowRepository implements WorkflowRepository {
  private pool: pg.Pool;

  constructor({ pool }: { pool: pg.Pool }) {
    this.pool = pool;
  }

  async save(workflowRun: WorkflowRun): Promise<WorkflowRun> {
    const query = `
      INSERT INTO workflows (id, project_id, organization_id, state, current_stage, current_agent, artifact_ids, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        state = EXCLUDED.state,
        current_stage = EXCLUDED.current_stage,
        current_agent = EXCLUDED.current_agent,
        artifact_ids = EXCLUDED.artifact_ids,
        updated_at = EXCLUDED.updated_at
    `;
    await this.pool.query(query, [
      workflowRun.id,
      workflowRun.projectId,
      workflowRun.organizationId,
      workflowRun.state,
      workflowRun.currentStage,
      workflowRun.metadata?.currentAgent ?? null,
      JSON.stringify(workflowRun.metadata?.artifactIds ?? []),
      workflowRun.createdAt,
      workflowRun.updatedAt,
    ]);
    return workflowRun;
  }

  async getById(id: WorkflowRunId, organizationId: OrganizationId): Promise<WorkflowRun | null> {
    const query = `SELECT * FROM workflows WHERE id = $1 AND organization_id = $2`;
    const result = await this.pool.query(query, [id, organizationId]);
    if (result.rows.length === 0) return null;
    return this.mapRowToWorkflow(result.rows[0]);
  }

  async getByProjectId(projectId: ProjectId, organizationId: OrganizationId): Promise<WorkflowRun | null> {
    const query = `SELECT * FROM workflows WHERE project_id = $1 AND organization_id = $2 LIMIT 1`;
    const result = await this.pool.query(query, [projectId, organizationId]);
    if (result.rows.length === 0) return null;
    return this.mapRowToWorkflow(result.rows[0]);
  }

  async updateState(id: WorkflowRunId, organizationId: OrganizationId, state: WorkflowState, currentStage: string): Promise<WorkflowRun> {
    const query = `
      UPDATE workflows 
      SET state = $3, current_stage = $4, updated_at = NOW()
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [id, organizationId, state, currentStage]);
    if (result.rows.length === 0) {
      throw new Error(`Workflow not found: ${id}`);
    }
    return this.mapRowToWorkflow(result.rows[0]);
  }

  private mapRowToWorkflow(row: Record<string, unknown>): WorkflowRun {
    return {
      id: row.id as WorkflowRunId,
      projectId: row.project_id as ProjectId,
      organizationId: row.organization_id as OrganizationId,
      state: row.state as WorkflowState,
      currentStage: row.current_stage as string,
      createdAt: (row.created_at as string),
      updatedAt: (row.updated_at as string),
      completedAt: row.completed_at as string | undefined,
      failureReason: row.failure_reason as string | undefined,
      metadata: {
        currentAgent: row.current_agent as string | undefined,
        artifactIds: (row.artifact_ids as string[]) ?? [],
      },
    };
  }
}