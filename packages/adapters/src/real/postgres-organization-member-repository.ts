import pg from "pg";
import { OrganizationMemberRepository } from "../ports";
import { OrganizationMember, UserId, OrganizationId } from "@workflow-jk/contracts";

export class PostgresOrganizationMemberRepository implements OrganizationMemberRepository {
  private pool: pg.Pool;

  constructor({ pool }: { pool: pg.Pool }) {
    this.pool = pool;
  }

  async save(member: OrganizationMember): Promise<OrganizationMember> {
    const query = `
      INSERT INTO organization_members (user_id, organization_id, role, created_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, organization_id) DO UPDATE SET
        role = EXCLUDED.role
    `;
    await this.pool.query(query, [
      member.userId,
      member.organizationId,
      member.role,
      member.createdAt,
    ]);
    return member;
  }

  async getByUserAndOrg(userId: UserId, organizationId: OrganizationId): Promise<OrganizationMember | null> {
    const query = `SELECT * FROM organization_members WHERE user_id = $1 AND organization_id = $2`;
    const result = await this.pool.query(query, [userId, organizationId]);
    if (result.rows.length === 0) return null;
    return this.mapRowToMember(result.rows[0]);
  }

  async listByOrganization(organizationId: OrganizationId): Promise<OrganizationMember[]> {
    const query = `SELECT * FROM organization_members WHERE organization_id = $1 ORDER BY created_at DESC`;
    const result = await this.pool.query(query, [organizationId]);
    return result.rows.map(this.mapRowToMember);
  }

  private mapRowToMember(row: Record<string, unknown>): OrganizationMember {
    return {
      userId: row.user_id as UserId,
      organizationId: row.organization_id as OrganizationId,
      role: row.role as "org_admin" | "reviewer" | "operator" | "requester" | "read_only_auditor",
      createdAt: row.created_at as string,
    };
  }
}