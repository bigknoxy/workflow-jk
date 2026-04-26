import pg from "pg";
import { ProjectRepository } from "../ports";
import { Project, ProjectId, OrganizationId } from "@workflow-jk/contracts";

const { Pool } = pg;

export class PostgresProjectRepository implements ProjectRepository {
  private pool: pg.Pool;

  constructor({ pool }: { pool: pg.Pool }) {
    this.pool = pool;
  }

  async save(project: Project): Promise<Project> {
    const query = `
      INSERT INTO projects (id, organization_id, title, raw_idea, business_goal, constraints, assumptions, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        raw_idea = EXCLUDED.raw_idea,
        business_goal = EXCLUDED.business_goal,
        constraints = EXCLUDED.constraints,
        assumptions = EXCLUDED.assumptions,
        updated_at = EXCLUDED.updated_at
    `;
    await this.pool.query(query, [
      project.id,
      project.organizationId,
      project.title,
      project.rawIdea,
      project.businessGoal,
      JSON.stringify(project.constraints),
      JSON.stringify(project.assumptions),
      project.createdAt,
      project.updatedAt,
    ]);
    return project;
  }

  async getById(id: ProjectId, organizationId: OrganizationId): Promise<Project | null> {
    const query = `SELECT * FROM projects WHERE id = $1 AND organization_id = $2`;
    const result = await this.pool.query(query, [id, organizationId]);
    if (result.rows.length === 0) return null;
    return this.mapRowToProject(result.rows[0]);
  }

  async list(organizationId: OrganizationId): Promise<Project[]> {
    const query = `SELECT * FROM projects WHERE organization_id = $1 ORDER BY created_at DESC`;
    const result = await this.pool.query(query, [organizationId]);
    return result.rows.map(this.mapRowToProject);
  }

  private mapRowToProject(row: Record<string, unknown>): Project {
    return {
      id: row.id as ProjectId,
      organizationId: row.organization_id as OrganizationId,
      title: row.title as string,
      rawIdea: row.raw_idea as string,
      businessGoal: row.business_goal as string,
      constraints: (row.constraints as string[]),
      assumptions: (row.assumptions as string[]),
      createdAt: (row.created_at as string),
      updatedAt: (row.updated_at as string),
    };
  }
}