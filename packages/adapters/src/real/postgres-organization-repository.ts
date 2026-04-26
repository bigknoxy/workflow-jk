import pg from "pg";
import { OrganizationRepository } from "../ports";
import { Organization, OrganizationId } from "@workflow-jk/contracts";

const { Pool } = pg;

export class PostgresOrganizationRepository implements OrganizationRepository {
  private pool: pg.Pool;

  constructor({ pool }: { pool: pg.Pool }) {
    this.pool = pool;
  }

  async save(org: Organization): Promise<Organization> {
    const query = `
      INSERT INTO organizations (id, name, slug, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        updated_at = EXCLUDED.updated_at
    `;
    await this.pool.query(query, [
      org.id,
      org.name,
      org.slug,
      org.createdAt,
      org.updatedAt,
    ]);
    return org;
  }

  async getById(id: OrganizationId): Promise<Organization | null> {
    const query = `SELECT * FROM organizations WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToOrganization(result.rows[0]);
  }

  async getBySlug(slug: string): Promise<Organization | null> {
    const query = `SELECT * FROM organizations WHERE slug = $1`;
    const result = await this.pool.query(query, [slug]);
    if (result.rows.length === 0) return null;
    return this.mapRowToOrganization(result.rows[0]);
  }

  async list(): Promise<Organization[]> {
    const query = `SELECT * FROM organizations ORDER BY created_at DESC`;
    const result = await this.pool.query(query);
    return result.rows.map(this.mapRowToOrganization);
  }

  private mapRowToOrganization(row: Record<string, unknown>): Organization {
    return {
      id: row.id as OrganizationId,
      name: row.name as string,
      slug: row.slug as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}