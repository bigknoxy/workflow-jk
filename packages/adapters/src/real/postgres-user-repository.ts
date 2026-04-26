import pg from "pg";
import { UserRepository } from "../ports";
import { User, UserId, OrganizationId } from "@workflow-jk/contracts";

const { Pool } = pg;

export class PostgresUserRepository implements UserRepository {
  private pool: pg.Pool;

  constructor({ pool }: { pool: pg.Pool }) {
    this.pool = pool;
  }

  async save(user: User): Promise<User> {
    const query = `
      INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        updated_at = EXCLUDED.updated_at
    `;
    await this.pool.query(query, [
      user.id,
      user.email,
      user.name,
      (user as { passwordHash?: string }).passwordHash ?? "",
      user.createdAt,
      user.updatedAt,
    ]);
    return user;
  }

  async getById(id: UserId): Promise<User | null> {
    const query = `SELECT * FROM users WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToUser(result.rows[0]);
  }

  async getByEmail(email: string): Promise<User | null> {
    const query = `SELECT * FROM users WHERE email = $1`;
    const result = await this.pool.query(query, [email]);
    if (result.rows.length === 0) return null;
    return this.mapRowToUser(result.rows[0]);
  }

  async list(organizationId: OrganizationId): Promise<User[]> {
    const query = `
      SELECT u.* FROM users u
      INNER JOIN organization_members om ON u.id = om.user_id
      WHERE om.organization_id = $1
      ORDER BY u.name ASC
    `;
    const result = await this.pool.query(query, [organizationId]);
    return result.rows.map(this.mapRowToUser);
  }

  private mapRowToUser(row: Record<string, unknown>): User {
    return {
      id: row.id as UserId,
      organizationId: row.organization_id as OrganizationId,
      email: row.email as string,
      name: row.name as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}