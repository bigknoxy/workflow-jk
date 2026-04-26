import { z } from "zod";

export const AppConfig = z.object({
  port: z.coerce.number().default(3001),
  host: z.string().default("0.0.0.0"),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  databaseUrl: z.string().default(""),
  temporalAddress: z.string().default("localhost:7233"),
  temporalNamespace: z.string().default("default"),
  temporalTaskQueue: z.string().default("workflow-jk-tasks"),
  llmProvider: z.enum(["fake", "ollama", "openai-compatible"]).default("fake"),
  ollamaBaseUrl: z.string().default("http://localhost:11434"),
  ollamaModel: z.string().default("llama3.2"),
  openaiBaseUrl: z.string().default("https://api.openai.com/v1"),
  openaiApiKey: z.string().default(""),
  openaiModel: z.string().default("gpt-4o-mini"),
  llmMaxRetries: z.coerce.number().default(3),
  llmTimeoutMs: z.coerce.number().default(60000),
  llmInitialDelayMs: z.coerce.number().default(1000),
  otlpEndpoint: z.string().optional(),
  observabilityEnabled: z.coerce.boolean().default(true),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  webUrl: z.string().default("http://localhost:3000"),
  apiBaseUrl: z.string().default("http://localhost:3001"),
  authEnabled: z.coerce.boolean().default(true),
  sessionSecret: z.string().optional(), // length enforced at runtime when authEnabled=true
  sessionTtlMs: z.coerce.number().default(86400000),
  defaultAdminEmail: z.string().email().default("admin@workflow-jk.local"),
  corsOrigin: z.string().default("http://localhost:3000"),
  rateLimitMax: z.coerce.number().default(100),
  rateLimitAuthMax: z.coerce.number().default(10),
  workflowTimeoutMs: z.coerce.number().default(3_600_000),
  agentTimeoutMs: z.coerce.number().default(120_000),
  idempotencyTtlSeconds: z.coerce.number().default(86_400),
});
export type AppConfig = z.infer<typeof AppConfig>;

export function loadConfig(overrides?: Partial<AppConfig>): AppConfig {
  const envValues: Partial<Record<string, string>> = {};
  const mapping: Record<string, string> = {
    port: "PORT",
    host: "HOST",
    nodeEnv: "NODE_ENV",
    databaseUrl: "DATABASE_URL",
    temporalAddress: "TEMPORAL_ADDRESS",
    temporalNamespace: "TEMPORAL_NAMESPACE",
    temporalTaskQueue: "TEMPORAL_TASK_QUEUE",
    llmProvider: "LLM_PROVIDER",
    ollamaBaseUrl: "OLLAMA_BASE_URL",
    ollamaModel: "OLLAMA_MODEL",
    openaiBaseUrl: "OPENAI_BASE_URL",
    openaiApiKey: "OPENAI_API_KEY",
    openaiModel: "OPENAI_MODEL",
    llmMaxRetries: "LLM_MAX_RETRIES",
    llmTimeoutMs: "LLM_TIMEOUT_MS",
    llmInitialDelayMs: "LLM_INITIAL_DELAY_MS",
    otlpEndpoint: "OTLP_ENDPOINT",
    observabilityEnabled: "OBSERVABILITY_ENABLED",
    logLevel: "LOG_LEVEL",
    webUrl: "WEB_URL",
    apiBaseUrl: "API_BASE_URL",
    authEnabled: "AUTH_ENABLED",
    sessionSecret: "SESSION_SECRET",
    sessionTtlMs: "SESSION_TTL_MS",
    defaultAdminEmail: "DEFAULT_ADMIN_EMAIL",
    corsOrigin: "CORS_ORIGIN",
    rateLimitMax: "RATE_LIMIT_MAX",
    rateLimitAuthMax: "RATE_LIMIT_AUTH_MAX",
    workflowTimeoutMs: "WORKFLOW_TIMEOUT_MS",
    agentTimeoutMs: "AGENT_TIMEOUT_MS",
    idempotencyTtlSeconds: "IDEMPOTENCY_TTL_SECONDS",
  };

  for (const [key, envVar] of Object.entries(mapping)) {
    const value = process.env[envVar];
    if (value !== undefined) {
      envValues[key] = value;
    }
  }

  const parsed = AppConfig.parse({ ...envValues, ...overrides }) as AppConfig;

  if (parsed.authEnabled && !parsed.sessionSecret) {
    throw new Error("SESSION_SECRET env var is required when AUTH_ENABLED=true");
  }

  if (parsed.authEnabled && parsed.sessionSecret && parsed.sessionSecret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }

  if (parsed.llmProvider === "openai-compatible" && !parsed.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is required when LLM_PROVIDER=openai-compatible");
  }

  if (parsed.nodeEnv === "production" && parsed.databaseUrl.includes("postgres:postgres")) {
    throw new Error("Default database credentials not allowed in production");
  }

  if (parsed.nodeEnv === "development" && !parsed.databaseUrl) {
    parsed.databaseUrl = "postgresql://workflow:workflow@localhost:5432/workflow_jk";
    console.warn("[config] Using default dev database URL. Set DATABASE_URL for production.");
  }

  return parsed;
}

// Lazy-loaded singleton to avoid throwing on module import when AUTH_ENABLED=true but no SESSION_SECRET
let _defaultConfig: AppConfig | undefined;
export const clearDefaultConfig = () => {
  _defaultConfig = undefined;
};
const getDefaultConfig = () => {
  if (!_defaultConfig) {
    _defaultConfig = loadConfig();
  }
  return _defaultConfig;
};

export const DEFAULT_CONFIG = new Proxy({} as AppConfig, {
  get(_target, prop) {
    return getDefaultConfig()[prop as keyof AppConfig];
  },
});