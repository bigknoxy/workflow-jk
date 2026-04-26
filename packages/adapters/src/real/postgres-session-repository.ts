import pg from "pg";
import { SessionRepository } from "../ports";
import { Session, SessionId, UserId } from "@workflow-jk/contracts";

export class PostgresSessionRepository implements SessionRepository {
  private pool: pg.Pool;

  constructor({ pool }: { pool: pg.Pool }) {
    this.pool = pool;
  }

  async save(session: Session): Promise<Session> {
    const query = `
      INSERT INTO sessions (id, user_id, organization_id, role, token, expires_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        token = EXCLUDED.token,
        expires_at = EXCLUDED.expires_at
    `;
    await this.pool.query(query, [
      session.id,
      session.userId,
      session.organizationId,
      session.role,
      session.token,
      session.expiresAt,
      session.createdAt,
    ]);
    return session;
  }

  async getByToken(token: string): Promise<Session | null> {
    const query = `SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()`;
    const result = await this.pool.query(query, [token]);
    if (result.rows.length === 0) return null;
    return this.mapRowToSession(result.rows[0]);
  }

  async delete(id: SessionId): Promise<void> {
    const query = `DELETE FROM sessions WHERE id = $1`;
    await this.pool.query(query, [id]);
  }

  async deleteByUserId(userId: UserId): Promise<void> {
    const query = `DELETE FROM sessions WHERE user_id = $1`;
    await this.pool.query(query, [userId]);
  }

  private mapRowToSession(row: Record<string, unknown>): Session {
    return {
      id: row.id as SessionId,
      userId: row.user_id as UserId,
      organizationId: row.organization_id as string as any,
      role: row.role as "org_admin" | "reviewer" | "operator" | "requester" | "read_only_auditor",
      token: row.token as string,
      expiresAt: row.expires_at as string,
      createdAt: row.created_at as string,
    };
  }
}