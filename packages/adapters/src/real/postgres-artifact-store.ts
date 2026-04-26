import pg from "pg";
import { ArtifactStore } from "../ports";
import { ArtifactUnion, ArtifactSearchQuery, ArtifactId, ProjectId, OrganizationId } from "@workflow-jk/contracts";

export class PostgresArtifactStore implements ArtifactStore {
  private pool: pg.Pool;

  constructor({ pool }: { pool: pg.Pool }) {
    this.pool = pool;
  }

  async save(artifact: ArtifactUnion): Promise<ArtifactUnion> {
    const query = `
      INSERT INTO artifacts (id, project_id, organization_id, type, version, content, schema_version, created_by, summary, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        version = EXCLUDED.version,
        content = EXCLUDED.content,
        schema_version = EXCLUDED.schema_version,
        created_by = EXCLUDED.created_by,
        summary = EXCLUDED.summary
    `;
    await this.pool.query(query, [
      artifact.id,
      artifact.projectId,
      artifact.organizationId,
      artifact.type,
      artifact.version,
      JSON.stringify(artifact.content),
      artifact.schemaVersion,
      artifact.createdBy,
      artifact.summary,
      artifact.createdAt,
    ]);
    return artifact;
  }

  async getById(id: ArtifactId, organizationId: OrganizationId): Promise<ArtifactUnion | null> {
    const query = `SELECT * FROM artifacts WHERE id = $1 AND organization_id = $2`;
    const result = await this.pool.query(query, [id, organizationId]);
    if (result.rows.length === 0) return null;
    return this.mapRowToArtifact(result.rows[0]);
  }

  async query(query: ArtifactSearchQuery): Promise<ArtifactUnion[]> {
    let sql = `SELECT * FROM artifacts WHERE project_id = $1 AND organization_id = $2`;
    const params: unknown[] = [query.projectId, query.organizationId];

    if (query.type) {
      params.push(query.type);
      sql += ` AND type = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC`;

    if (query.latestVersion) {
      sql = `
        SELECT * FROM (
          SELECT *, ROW_NUMBER() OVER (PARTITION BY type ORDER BY version DESC) as rn
          FROM artifacts 
          WHERE project_id = $1 AND organization_id = $2
          ${query.type ? ` AND type = $3` : ''}
        ) sub
        WHERE rn = 1
        ORDER BY created_at DESC
      `;
    }

    const result = await this.pool.query(sql, params);
    return result.rows.map(this.mapRowToArtifact);
  }

  async getLatestByType(projectId: ProjectId, type: string, organizationId: OrganizationId): Promise<ArtifactUnion | null> {
    const query = `
      SELECT * FROM artifacts 
      WHERE project_id = $1 AND type = $2 AND organization_id = $3 
      ORDER BY version DESC, created_at DESC 
      LIMIT 1
    `;
    const result = await this.pool.query(query, [projectId, type, organizationId]);
    if (result.rows.length === 0) return null;
    return this.mapRowToArtifact(result.rows[0]);
  }

  private mapRowToArtifact(row: Record<string, unknown>): ArtifactUnion {
    const base = {
      id: row.id as ArtifactId,
      projectId: row.project_id as ProjectId,
      organizationId: row.organization_id as OrganizationId,
      schemaVersion: row.schema_version as string,
      createdAt: row.created_at as string,
      createdBy: row.created_by as string,
      summary: row.summary as string,
      type: row.type as ArtifactUnion["type"],
      version: row.version as number,
      content: row.content as ArtifactUnion["content"],
    };

    return base as ArtifactUnion;
  }
}