import pg from "pg";
import { AuditLogRepository, AuditQueryFilters } from "../ports";
import { AuditLog, AuditLogId, ProjectId, OrganizationId } from "@workflow-jk/contracts";

export class PostgresAuditLogRepository implements AuditLogRepository {
  private pool: pg.Pool;

  constructor({ pool }: { pool: pg.Pool }) {
    this.pool = pool;
  }

  async save(entry: AuditLog): Promise<AuditLog> {
    const query = `
      INSERT INTO audit_logs (id, project_id, organization_id, action, actor, resource_type, resource_id, details, session_id, client_ip, previous_hash, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;
    await this.pool.query(query, [
      entry.id,
      entry.projectId,
      entry.organizationId,
      entry.action,
      entry.actor,
      entry.resourceType,
      entry.resourceId,
      entry.details ? JSON.stringify(entry.details) : null,
      entry.sessionId ?? null,
      entry.clientIp ?? null,
      entry.previousHash ?? null,
      entry.createdAt,
    ]);
    return entry;
  }

  async getByProjectId(projectId: ProjectId, organizationId: OrganizationId): Promise<AuditLog[]> {
    const query = `SELECT * FROM audit_logs WHERE project_id = $1 AND organization_id = $2 ORDER BY created_at ASC`;
    const result = await this.pool.query(query, [projectId, organizationId]);
    return result.rows.map(this.mapRowToAuditLog);
  }

  async query(organizationId: OrganizationId, filters?: AuditQueryFilters): Promise<AuditLog[]> {
    let sql = `SELECT * FROM audit_logs WHERE organization_id = $1`;
    const params: unknown[] = [organizationId];

    if (filters?.action) {
      params.push(filters.action);
      sql += ` AND action = $${params.length}`;
    }

    if (filters?.actor) {
      params.push(filters.actor);
      sql += ` AND actor = $${params.length}`;
    }

    if (filters?.resourceType) {
      params.push(filters.resourceType);
      sql += ` AND resource_type = $${params.length}`;
    }

    if (filters?.resourceId) {
      params.push(filters.resourceId);
      sql += ` AND resource_id = $${params.length}`;
    }

    if (filters?.from) {
      params.push(filters.from);
      sql += ` AND created_at >= $${params.length}`;
    }

    if (filters?.to) {
      params.push(filters.to);
      sql += ` AND created_at <= $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC`;

    if (filters?.pageSize) {
      sql += ` LIMIT ${filters.pageSize}`;
      if (filters?.page) {
        sql += ` OFFSET ${filters.page * filters.pageSize}`;
      }
    }

    const result = await this.pool.query(sql, params);
    return result.rows.map(this.mapRowToAuditLog);
  }

  private mapRowToAuditLog(row: Record<string, unknown>): AuditLog {
    return {
      id: row.id as unknown as AuditLogId,
      projectId: row.project_id as unknown as ProjectId,
      organizationId: row.organization_id as OrganizationId,
      action: row.action as string,
      actor: row.actor as string,
      resourceType: row.resource_type as string,
      resourceId: row.resource_id as string,
      details: row.details ? (typeof row.details === "string" ? JSON.parse(row.details) : row.details) as Record<string, unknown> : undefined,
      sessionId: row.session_id as string | undefined,
      clientIp: row.client_ip as string | undefined,
      previousHash: row.previous_hash as string | undefined,
      createdAt: row.created_at as string,
    };
  }
}