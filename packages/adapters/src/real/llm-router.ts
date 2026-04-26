import { z } from "zod";
import type { LLMProvider } from "../ports";

export interface LLMRouterConfig {
  primary: LLMProvider;
  fallback?: LLMProvider;
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  timeoutMs: number;
}

export const LLMRouterConfigSchema = z.object({
  maxRetries: z.number().int().min(0).default(3),
  initialDelayMs: z.number().int().min(0).default(1000),
  maxDelayMs: z.number().int().min(0).default(30000),
  backoffMultiplier: z.number().min(1).default(2),
  timeoutMs: z.number().int().min(0).default(60000),
});

export type LLMRouterConfigSchema = z.infer<typeof LLMRouterConfigSchema>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetriableError(error: unknown): boolean {
  // Network errors (TypeError with fetch-related message or generic network errors)
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("econn") || msg.includes("timeout") || msg.includes("enot")) {
      return true;
    }
  }
  // HTTP 5xx server errors are retriable
  if (error instanceof Response) {
    return error.status >= 500;
  }
  return false;
}

export class LLMRouter implements LLMProvider {
  readonly name: string;
  private config: LLMRouterConfig;

  constructor(config: LLMRouterConfig) {
    this.name = `llm-router(${config.primary.name})`;
    this.config = config;
  }

  async complete(
    prompt: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string> {
    let lastError: unknown;
    const maxRetries = this.config.maxRetries;
    const initialDelayMs = this.config.initialDelayMs;
    const maxDelayMs = this.config.maxDelayMs;
    const backoffMultiplier = this.config.backoffMultiplier;
    const timeoutMs = this.config.timeoutMs;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.callWithTimeout(
          this.config.primary.complete(prompt, options),
          timeoutMs
        );
      } catch (error) {
        lastError = error;
        const isLastAttempt = attempt === maxRetries;

        if (isRetriableError(error)) {
          if (!isLastAttempt) {
            const delay = Math.min(
              initialDelayMs * Math.pow(backoffMultiplier, attempt),
              maxDelayMs
            );
            const jitter = Math.random() * 100;
            console.log(
              `[LLMRouter] Attempt ${attempt + 1} failed, retrying in ${
                delay + jitter
              }ms...`
            );
            await sleep(delay + jitter);
          }
        } else {
          // Non-retriable error, break immediately
          break;
        }
      }
    }

    // All retries exhausted for primary, try fallback if available
    if (this.config.fallback) {
      console.log(
        `[LLMRouter] Primary provider failed, trying fallback: ${this.config.fallback.name}`
      );
      try {
        return await this.callWithTimeout(
          this.config.fallback.complete(prompt, options),
          timeoutMs
        );
      } catch (fallbackError) {
        console.log(
          `[LLMRouter] Fallback provider also failed: ${fallbackError}`
        );
        throw fallbackError;
      }
    }

    throw lastError;
  }

  async completeStructured<T>(
    prompt: string,
    schema: unknown,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<T> {
    let lastError: unknown;
    const maxRetries = this.config.maxRetries;
    const initialDelayMs = this.config.initialDelayMs;
    const maxDelayMs = this.config.maxDelayMs;
    const backoffMultiplier = this.config.backoffMultiplier;
    const timeoutMs = this.config.timeoutMs;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.callWithTimeout(
          this.config.primary.completeStructured(prompt, schema, options),
          timeoutMs
        );
      } catch (error) {
        lastError = error;
        const isLastAttempt = attempt === maxRetries;

        if (isRetriableError(error)) {
          if (!isLastAttempt) {
            const delay = Math.min(
              initialDelayMs * Math.pow(backoffMultiplier, attempt),
              maxDelayMs
            );
            const jitter = Math.random() * 100;
            console.log(
              `[LLMRouter] Attempt ${attempt + 1} failed (structured), retrying in ${
                delay + jitter
              }ms...`
            );
            await sleep(delay + jitter);
          }
        } else {
          // Non-retriable error, break immediately
          break;
        }
      }
    }

    // All retries exhausted for primary, try fallback if available
    if (this.config.fallback) {
      console.log(
        `[LLMRouter] Primary provider failed (structured), trying fallback: ${this.config.fallback.name}`
      );
      try {
        return await this.callWithTimeout(
          this.config.fallback.completeStructured(prompt, schema, options),
          timeoutMs
        );
      } catch (fallbackError) {
        console.log(
          `[LLMRouter] Fallback provider also failed: ${fallbackError}`
        );
        throw fallbackError;
      }
    }

    throw lastError;
  }

  private async callWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Create a promise that races the original with an abort signal
      const result = await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(new Error(`LLM call timed out after ${timeoutMs}ms`));
          });
        }),
      ]);
      return result;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export function createLLMRouterFromConfig(
  config: LLMRouterConfigSchema,
  primary: LLMProvider,
  fallback?: LLMProvider
): LLMRouter {
  return new LLMRouter({
    primary,
    fallback,
    maxRetries: config.maxRetries,
    initialDelayMs: config.initialDelayMs,
    maxDelayMs: config.maxDelayMs,
    backoffMultiplier: config.backoffMultiplier,
    timeoutMs: config.timeoutMs,
  });
}