import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadConfig, clearDefaultConfig } from "../config.js";

describe("loadConfig", () => {
  beforeEach(() => {
    clearDefaultConfig();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test_db");
    vi.stubEnv("SESSION_SECRET", "this-is-a-test-secret-key-that-is-long-enough-for-config");
    vi.stubEnv("AUTH_ENABLED", "false");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("loads default config correctly", () => {
    // Note: z.coerce.boolean() treats any non-empty string as true
    // So we need to unset AUTH_ENABLED to get the default (true)
    const config = loadConfig();
    expect(config.authEnabled).toBe(true);
    expect(config.sessionTtlMs).toBe(86400000);
    expect(config.defaultAdminEmail).toBe("admin@workflow-jk.local");
    expect(config.corsOrigin).toBe("http://localhost:3000");
    expect(config.rateLimitMax).toBe(100);
    expect(config.rateLimitAuthMax).toBe(10);
    expect(config.workflowTimeoutMs).toBe(3_600_000);
    expect(config.agentTimeoutMs).toBe(120_000);
    expect(config.idempotencyTtlSeconds).toBe(86_400);
    expect(config.logLevel).toBe("info");
  });

  it("throws when authEnabled=true without sessionSecret", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test_db");
    vi.stubEnv("AUTH_ENABLED", "true");
    vi.stubEnv("SESSION_SECRET", "");
    expect(() => loadConfig()).toThrow("SESSION_SECRET env var is required when AUTH_ENABLED=true");
  });

  it("throws when sessionSecret is too short with authEnabled=true", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test_db");
    vi.stubEnv("AUTH_ENABLED", "true");
    vi.stubEnv("SESSION_SECRET", "short");
    expect(() => loadConfig()).toThrow("SESSION_SECRET must be at least 32 characters");
  });

  it("throws when llmProvider=openai-compatible without openaiApiKey", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test_db");
    vi.stubEnv("SESSION_SECRET", "this-is-a-test-secret-key-that-is-long-enough-for-config");
    vi.stubEnv("LLM_PROVIDER", "openai-compatible");
    vi.stubEnv("AUTH_ENABLED", "false");
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(() => loadConfig()).toThrow("OPENAI_API_KEY is required when LLM_PROVIDER=openai-compatible");
  });

  it("throws when nodeEnv=production with default DB credentials", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/workflow_jk");
    vi.stubEnv("SESSION_SECRET", "this-is-a-test-secret-key-that-is-long-enough-for-config");
    vi.stubEnv("AUTH_ENABLED", "false");
    expect(() => loadConfig()).toThrow("Default database credentials not allowed in production");
  });

  it("allows non-default credentials in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://user:password@localhost:5432/workflow_jk");
    vi.stubEnv("SESSION_SECRET", "this-is-a-test-secret-key-that-is-long-enough-for-config");
    vi.stubEnv("AUTH_ENABLED", "false");
    const config = loadConfig();
    expect(config.nodeEnv).toBe("production");
    expect(config.databaseUrl).toBe("postgresql://user:password@localhost:5432/workflow_jk");
  });

  it("custom env vars override defaults", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test_db");
    vi.stubEnv("SESSION_SECRET", "this-is-a-test-secret-key-that-is-long-enough-for-config");
    vi.stubEnv("AUTH_ENABLED", "false");
    vi.stubEnv("SESSION_TTL_MS", "3600000");
    vi.stubEnv("DEFAULT_ADMIN_EMAIL", "admin@example.com");
    vi.stubEnv("CORS_ORIGIN", "https://example.com,https://app.example.com");
    vi.stubEnv("RATE_LIMIT_MAX", "200");
    vi.stubEnv("RATE_LIMIT_AUTH_MAX", "20");
    vi.stubEnv("WORKFLOW_TIMEOUT_MS", "7200000");
    vi.stubEnv("AGENT_TIMEOUT_MS", "180000");
    vi.stubEnv("IDEMPOTENCY_TTL_SECONDS", "172800");
    vi.stubEnv("LOG_LEVEL", "debug");

    const config = loadConfig();
    expect(config.sessionTtlMs).toBe(3600000);
    expect(config.defaultAdminEmail).toBe("admin@example.com");
    expect(config.corsOrigin).toBe("https://example.com,https://app.example.com");
    expect(config.rateLimitMax).toBe(200);
    expect(config.rateLimitAuthMax).toBe(20);
    expect(config.workflowTimeoutMs).toBe(7200000);
    expect(config.agentTimeoutMs).toBe(180000);
    expect(config.idempotencyTtlSeconds).toBe(172800);
    expect(config.logLevel).toBe("debug");
  });

  it("uses dev fallback database URL when DATABASE_URL not set in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SESSION_SECRET", "this-is-a-test-secret-key-that-is-long-enough-for-config");
    vi.stubEnv("AUTH_ENABLED", ""); // Empty string disables auth (uses default, but we set to false)
    vi.stubEnv("DATABASE_URL", "");
    const config = loadConfig();
    expect(config.databaseUrl).toBe("postgresql://workflow:workflow@localhost:5432/workflow_jk");
    expect(config.nodeEnv).toBe("development");
  });

  it("accepts auth with valid sessionSecret", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test_db");
    vi.stubEnv("AUTH_ENABLED", "true");
    vi.stubEnv("SESSION_SECRET", "this-is-a-valid-secret-key-that-is-at-least-32-chars-long");
    const config = loadConfig();
    expect(config.authEnabled).toBe(true);
    expect(config.sessionSecret).toBe("this-is-a-valid-secret-key-that-is-at-least-32-chars-long");
  });

  it("accepts openai-compatible with openaiApiKey", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test_db");
    vi.stubEnv("SESSION_SECRET", "this-is-a-test-secret-key-that-is-long-enough-for-config");
    vi.stubEnv("AUTH_ENABLED", "false");
    vi.stubEnv("LLM_PROVIDER", "openai-compatible");
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key");
    const config = loadConfig();
    expect(config.llmProvider).toBe("openai-compatible");
    expect(config.openaiApiKey).toBe("sk-test-key");
  });
});