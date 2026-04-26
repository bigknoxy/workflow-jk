import crypto from "crypto";
import pg from "pg";
import { IdempotencyStore } from "../ports";

export class PostgresIdempotencyStore implements IdempotencyStore {
  private pool: pg.Pool;
  private ttlSeconds: number;

  constructor({ pool, ttlSeconds = 86400 }: { pool: pg.Pool; ttlSeconds?: number }) {
    this.pool = pool;
    this.ttlSeconds = ttlSeconds;
  }

  async check(key: string): Promise<unknown | null> {
    const keyHash = this.hashKey(key);
    const query = `
      SELECT result_json FROM idempotency_keys 
      WHERE key_hash = $1 AND created_at > NOW() - ($2 || ' seconds')::interval
    `;
    const result = await this.pool.query(query, [keyHash, this.ttlSeconds]);
    if (result.rows.length === 0) return null;
    return result.rows[0].result_json;
  }

  async store(key: string, result: unknown): Promise<void> {
    const keyHash = this.hashKey(key);
    const query = `
      INSERT INTO idempotency_keys (key_hash, result_json, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key_hash) DO UPDATE SET
        result_json = EXCLUDED.result_json,
        created_at = NOW()
    `;
    await this.pool.query(query, [keyHash, JSON.stringify(result)]);
  }

  private hashKey(key: string): string {
    return crypto.createHash("sha256").update(key).digest("hex");
  }
}