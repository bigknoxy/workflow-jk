import { z } from "zod";

export const ExecutionPolicySchema = z.object({
  maxConcurrentWorkflows: z.number().int().positive().default(5),
  agentTimeoutMs: z.number().int().positive().default(120_000),
  workflowTimeoutMs: z.number().int().positive().default(3_600_000),
  maxReworkIterations: z.number().int().min(1).max(10).default(3),
  allowedAgentTypes: z.array(z.string()).default(["IntakeAgent", "RequirementsCriticAgent", "ArchitectAgent", "DevAgent", "QaAgent"]),
  maxDiffSizeBytes: z.number().int().positive().default(1024 * 1024),
  allowedFilePathPatterns: z.array(z.string()).default(["src/**", "tests/**", "docs/**", "__tests__/**", "*.md", "*.json", "*.ts", "*.js"]),
  deniedFilePathPatterns: z.array(z.string()).default(["**/.env*", "**/.git/**", "**/node_modules/**", "*.secret*", "*.key", "*.pem"]),
  dryRunMode: z.boolean().default(false),
  maxTokensPerAgent: z.number().int().positive().default(8192),
});

export type ExecutionPolicy = z.infer<typeof ExecutionPolicySchema>;

export const DEFAULT_EXECUTION_POLICY: ExecutionPolicy = {
  maxConcurrentWorkflows: 5,
  agentTimeoutMs: 120_000,
  workflowTimeoutMs: 3_600_000,
  maxReworkIterations: 3,
  allowedAgentTypes: ["IntakeAgent", "RequirementsCriticAgent", "ArchitectAgent", "DevAgent", "QaAgent"],
  maxDiffSizeBytes: 1024 * 1024,
  allowedFilePathPatterns: ["src/**", "tests/**", "docs/**", "__tests__/**", "*.md", "*.json", "*.ts", "*.js"],
  deniedFilePathPatterns: ["**/.env*", "**/.git/**", "**/node_modules/**", "*.secret*", "*.key", "*.pem"],
  dryRunMode: false,
  maxTokensPerAgent: 8192,
};

function matchGlobPattern(path: string, pattern: string): boolean {
  if (pattern.startsWith("**/")) {
    const inner = pattern.slice(3);
    if (inner.endsWith("/**")) {
      const segment = inner.replace("/**", "");
      return path.includes(segment + "/");
    }
    if (inner.startsWith("*.")) {
      return path.endsWith(inner.slice(1));
    }
    return path.includes(inner);
  }
  if (pattern.startsWith("*.")) {
    return path.endsWith(pattern.slice(1));
  }
  if (pattern.endsWith("/**")) {
    return path.startsWith(pattern.slice(0, -2)) || path.startsWith(pattern.slice(0, -2) + "/");
  }
  if (!pattern.includes("*")) {
    return path === pattern || path.startsWith(pattern + "/");
  }
  return false;
}

export function isAgentAllowed(policy: ExecutionPolicy, agentName: string): boolean {
  return policy.allowedAgentTypes.includes(agentName);
}

export function isFilePathAllowed(policy: ExecutionPolicy, path: string): boolean {
  const normalized = path.replace(/^\/+/, "");
  for (const denied of policy.deniedFilePathPatterns) {
    if (matchGlobPattern(normalized, denied)) return false;
  }
  for (const allowed of policy.allowedFilePathPatterns) {
    if (matchGlobPattern(normalized, allowed)) return true;
  }
  return false;
}

export function isDiffSizeAllowed(policy: ExecutionPolicy, diffSizeBytes: number): boolean {
  return diffSizeBytes <= policy.maxDiffSizeBytes;
}