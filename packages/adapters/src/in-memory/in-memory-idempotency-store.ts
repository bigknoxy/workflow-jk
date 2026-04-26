import { IdempotencyStore } from "../ports";

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private cache: Map<string, unknown> = new Map();

  async check(key: string): Promise<unknown | null> {
    return this.cache.get(key) ?? null;
  }

  async store(key: string, result: unknown): Promise<void> {
    this.cache.set(key, result);
  }

  clear(): void {
    this.cache.clear();
  }
}