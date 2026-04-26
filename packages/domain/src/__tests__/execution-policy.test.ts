import { describe, it, expect } from "vitest";
import {
  ExecutionPolicySchema,
  DEFAULT_EXECUTION_POLICY,
  isAgentAllowed,
  isFilePathAllowed,
  isDiffSizeAllowed,
  ExecutionPolicy,
} from "../execution-policy";

describe("execution-policy", () => {
  describe("ExecutionPolicySchema", () => {
    it("parses default values", () => {
      const policy = ExecutionPolicySchema.parse({});
      expect(policy.maxConcurrentWorkflows).toBe(5);
      expect(policy.agentTimeoutMs).toBe(120_000);
      expect(policy.workflowTimeoutMs).toBe(3_600_000);
      expect(policy.maxReworkIterations).toBe(3);
      expect(policy.allowedAgentTypes).toContain("DevAgent");
      expect(policy.maxDiffSizeBytes).toBe(1024 * 1024);
      expect(policy.dryRunMode).toBe(false);
    });

    it("parses custom values", () => {
      const custom: Partial<ExecutionPolicy> = {
        maxConcurrentWorkflows: 10,
        agentTimeoutMs: 60_000,
        maxReworkIterations: 5,
        dryRunMode: true,
      };
      const policy = ExecutionPolicySchema.parse(custom);
      expect(policy.maxConcurrentWorkflows).toBe(10);
      expect(policy.agentTimeoutMs).toBe(60_000);
      expect(policy.maxReworkIterations).toBe(5);
      expect(policy.dryRunMode).toBe(true);
    });

    it("validates agent types array", () => {
      const policy = ExecutionPolicySchema.parse({
        allowedAgentTypes: ["IntakeAgent", "DevAgent"],
      });
      expect(policy.allowedAgentTypes).toEqual(["IntakeAgent", "DevAgent"]);
    });
  });

  describe("DEFAULT_EXECUTION_POLICY", () => {
    it("has all required fields", () => {
      expect(DEFAULT_EXECUTION_POLICY.maxConcurrentWorkflows).toBeGreaterThan(0);
      expect(DEFAULT_EXECUTION_POLICY.agentTimeoutMs).toBeGreaterThan(0);
      expect(DEFAULT_EXECUTION_POLICY.workflowTimeoutMs).toBeGreaterThan(0);
      expect(DEFAULT_EXECUTION_POLICY.maxReworkIterations).toBeGreaterThanOrEqual(1);
      expect(DEFAULT_EXECUTION_POLICY.maxDiffSizeBytes).toBeGreaterThan(0);
      expect(Array.isArray(DEFAULT_EXECUTION_POLICY.allowedAgentTypes)).toBe(true);
      expect(Array.isArray(DEFAULT_EXECUTION_POLICY.allowedFilePathPatterns)).toBe(true);
      expect(Array.isArray(DEFAULT_EXECUTION_POLICY.deniedFilePathPatterns)).toBe(true);
    });
  });

  describe("isAgentAllowed", () => {
    it("returns true for allowed agent", () => {
      expect(isAgentAllowed(DEFAULT_EXECUTION_POLICY, "IntakeAgent")).toBe(true);
      expect(isAgentAllowed(DEFAULT_EXECUTION_POLICY, "DevAgent")).toBe(true);
      expect(isAgentAllowed(DEFAULT_EXECUTION_POLICY, "QaAgent")).toBe(true);
    });

    it("returns false for disallowed agent", () => {
      const restricted = { ...DEFAULT_EXECUTION_POLICY, allowedAgentTypes: ["IntakeAgent"] };
      expect(isAgentAllowed(restricted, "DevAgent")).toBe(false);
      expect(isAgentAllowed(restricted, "UnknownAgent")).toBe(false);
    });
  });

  describe("isFilePathAllowed", () => {
    it("allows source files", () => {
      expect(isFilePathAllowed(DEFAULT_EXECUTION_POLICY, "src/index.ts")).toBe(true);
      expect(isFilePathAllowed(DEFAULT_EXECUTION_POLICY, "src/utils/helper.ts")).toBe(true);
    });

    it("allows test files", () => {
      expect(isFilePathAllowed(DEFAULT_EXECUTION_POLICY, "tests/example.test.ts")).toBe(true);
      expect(isFilePathAllowed(DEFAULT_EXECUTION_POLICY, "__tests__/mock.ts")).toBe(true);
    });

    it("allows documentation", () => {
      expect(isFilePathAllowed(DEFAULT_EXECUTION_POLICY, "README.md")).toBe(true);
      expect(isFilePathAllowed(DEFAULT_EXECUTION_POLICY, "docs/api.md")).toBe(true);
    });

    it("denies .env files", () => {
      expect(isFilePathAllowed(DEFAULT_EXECUTION_POLICY, ".env")).toBe(false);
      expect(isFilePathAllowed(DEFAULT_EXECUTION_POLICY, ".env.local")).toBe(false);
    });

    it("denies git directory", () => {
      expect(isFilePathAllowed(DEFAULT_EXECUTION_POLICY, ".git/config")).toBe(false);
    });

    it("denies node_modules", () => {
      expect(isFilePathAllowed(DEFAULT_EXECUTION_POLICY, "node_modules/package/index.js")).toBe(false);
    });

    it("denies secret files", () => {
      expect(isFilePathAllowed(DEFAULT_EXECUTION_POLICY, "credentials.secret")).toBe(false);
      expect(isFilePathAllowed(DEFAULT_EXECUTION_POLICY, "api.key")).toBe(false);
    });

    it("allows json files", () => {
      expect(isFilePathAllowed(DEFAULT_EXECUTION_POLICY, "package.json")).toBe(true);
    });
  });

  describe("isDiffSizeAllowed", () => {
    it("allows diffs under limit", () => {
      expect(isDiffSizeAllowed(DEFAULT_EXECUTION_POLICY, 1000)).toBe(true);
      expect(isDiffSizeAllowed(DEFAULT_EXECUTION_POLICY, 512 * 1024)).toBe(true);
    });

    it("allows diffs at exactly the limit", () => {
      expect(isDiffSizeAllowed(DEFAULT_EXECUTION_POLICY, 1024 * 1024)).toBe(true);
    });

    it("denies diffs over limit", () => {
      const smallLimit = { ...DEFAULT_EXECUTION_POLICY, maxDiffSizeBytes: 1024 };
      expect(isDiffSizeAllowed(smallLimit, 2048)).toBe(false);
    });
  });
});