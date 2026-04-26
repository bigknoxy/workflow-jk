import { describe, it, expect } from "vitest";
import { PolicyService, DEFAULT_POLICY_SERVICE } from "../policy";
import type { Action, UserRole } from "@workflow-jk/contracts";

describe("PolicyService", () => {
  const policy = new PolicyService();

  describe("org_admin", () => {
    const role: UserRole = "org_admin";

    it("can create projects", () => {
      expect(policy.authorize("project:create", role)).toBe(true);
    });

    it("can delete projects", () => {
      expect(policy.authorize("project:delete", role)).toBe(true);
    });

    it("can manage org", () => {
      expect(policy.authorize("org:manage", role)).toBe(true);
    });

    it("can manage users", () => {
      expect(policy.authorize("user:manage", role)).toBe(true);
    });

    it("can submit approvals", () => {
      expect(policy.authorize("approval:submit", role)).toBe(true);
    });

    it("can start executions", () => {
      expect(policy.authorize("execution:start", role)).toBe(true);
    });

    it("can cancel executions", () => {
      expect(policy.authorize("execution:cancel", role)).toBe(true);
    });

    it("can read audits", () => {
      expect(policy.authorize("audit:read", role)).toBe(true);
    });
  });

  describe("reviewer", () => {
    const role: UserRole = "reviewer";

    it("can submit approvals", () => {
      expect(policy.authorize("approval:submit", role)).toBe(true);
    });

    it("can read audits", () => {
      expect(policy.authorize("audit:read", role)).toBe(true);
    });

    it("cannot create projects", () => {
      expect(policy.authorize("project:create", role)).toBe(false);
    });

    it("cannot delete projects", () => {
      expect(policy.authorize("project:delete", role)).toBe(false);
    });

    it("cannot start workflows", () => {
      expect(policy.authorize("workflow:start", role)).toBe(false);
    });

    it("cannot start executions", () => {
      expect(policy.authorize("execution:start", role)).toBe(false);
    });

    it("cannot manage org", () => {
      expect(policy.authorize("org:manage", role)).toBe(false);
    });
  });

  describe("operator", () => {
    const role: UserRole = "operator";

    it("can start workflows", () => {
      expect(policy.authorize("workflow:start", role)).toBe(true);
    });

    it("can resume workflows", () => {
      expect(policy.authorize("workflow:resume", role)).toBe(true);
    });

    it("can start executions", () => {
      expect(policy.authorize("execution:start", role)).toBe(true);
    });

    it("can write artifacts", () => {
      expect(policy.authorize("artifact:write", role)).toBe(true);
    });

    it("cannot submit approvals", () => {
      expect(policy.authorize("approval:submit", role)).toBe(false);
    });

    it("cannot create projects", () => {
      expect(policy.authorize("project:create", role)).toBe(false);
    });

    it("cannot manage users", () => {
      expect(policy.authorize("user:manage", role)).toBe(false);
    });
  });

  describe("requester", () => {
    const role: UserRole = "requester";

    it("can create projects", () => {
      expect(policy.authorize("project:create", role)).toBe(true);
    });

    it("can read projects", () => {
      expect(policy.authorize("project:read", role)).toBe(true);
    });

    it("cannot submit approvals", () => {
      expect(policy.authorize("approval:submit", role)).toBe(false);
    });

    it("cannot start workflows", () => {
      expect(policy.authorize("workflow:start", role)).toBe(false);
    });

    it("cannot write artifacts", () => {
      expect(policy.authorize("artifact:write", role)).toBe(false);
    });

    it("cannot start executions", () => {
      expect(policy.authorize("execution:start", role)).toBe(false);
    });

    it("cannot manage org", () => {
      expect(policy.authorize("org:manage", role)).toBe(false);
    });
  });

  describe("read_only_auditor", () => {
    const role: UserRole = "read_only_auditor";

    it("can read audits", () => {
      expect(policy.authorize("audit:read", role)).toBe(true);
    });

    it("can read projects", () => {
      expect(policy.authorize("project:read", role)).toBe(true);
    });

    it("is read-only", () => {
      expect(policy.isReadOnly(role)).toBe(true);
    });

    it("cannot create projects", () => {
      expect(policy.authorize("project:create", role)).toBe(false);
    });

    it("cannot submit approvals", () => {
      expect(policy.authorize("approval:submit", role)).toBe(false);
    });

    it("cannot start workflows", () => {
      expect(policy.authorize("workflow:start", role)).toBe(false);
    });

    it("cannot write artifacts", () => {
      expect(policy.authorize("artifact:write", role)).toBe(false);
    });

    it("cannot delete projects", () => {
      expect(policy.authorize("project:delete", role)).toBe(false);
    });

    it("cannot manage org", () => {
      expect(policy.authorize("org:manage", role)).toBe(false);
    });
  });

  describe("unknown role", () => {
    it("denies all actions", () => {
      expect(policy.authorize("project:read", "unknown_role" as UserRole)).toBe(false);
    });
  });

  describe("getAllowedActions", () => {
    it("returns all actions for org_admin", () => {
      const actions = policy.getAllowedActions("org_admin");
      expect(actions).toContain("project:create");
      expect(actions).toContain("org:manage");
      expect(actions.length).toBeGreaterThan(10);
    });

    it("returns few actions for read_only_auditor", () => {
      const actions = policy.getAllowedActions("read_only_auditor");
      expect(actions).toContain("audit:read");
      expect(actions).toContain("project:read");
      expect(actions).not.toContain("project:create");
    });
  });

  describe("DEFAULT_POLICY_SERVICE", () => {
    it("is an instance of PolicyService", () => {
      expect(DEFAULT_POLICY_SERVICE).toBeInstanceOf(PolicyService);
    });
  });
});