import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryAuditLogRepository } from "../in-memory/in-memory-audit-log-repository";
import { createAuditLog } from "@workflow-jk/domain";
import { OrganizationId } from "@workflow-jk/contracts";

const testOrgId = "00000000-0000-0000-0000-000000000000" as unknown as OrganizationId;

describe("InMemoryAuditLogRepository", () => {
  let repo: InMemoryAuditLogRepository;

  beforeEach(() => {
    repo = new InMemoryAuditLogRepository();
  });

  it("should save and retrieve audit log entries by project ID", async () => {
    const entry = createAuditLog(
      "project-1" as any,
      testOrgId,
      "project.created",
      "system",
      "project",
      "project-1",
    );
    await repo.save(entry);
    const results = await repo.getByProjectId("project-1" as any, testOrgId);
    expect(results).toHaveLength(1);
    expect(results[0].action).toBe("project.created");
  });

  it("should return empty array for project with no audit logs", async () => {
    const results = await repo.getByProjectId("unknown" as any, testOrgId);
    expect(results).toHaveLength(0);
  });

  it("should return all entries for a project", async () => {
    const entry1 = createAuditLog(
      "project-1" as any,
      testOrgId,
      "first",
      "system",
      "project",
      "r1",
    );
    await repo.save(entry1);
    const entry2 = createAuditLog(
      "project-1" as any,
      testOrgId,
      "second",
      "system",
      "project",
      "r2",
    );
    await repo.save(entry2);
    const results = await repo.getByProjectId("project-1" as any, testOrgId);
    expect(results).toHaveLength(2);
    const actions = results.map((r) => r.action);
    expect(actions).toContain("first");
    expect(actions).toContain("second");
  });

  it("should only return entries for the specified project", async () => {
    await repo.save(
      createAuditLog("p1" as any, testOrgId, "action1", "system", "project", "r1"),
    );
    await repo.save(
      createAuditLog("p2" as any, testOrgId, "action2", "system", "project", "r2"),
    );
    const results = await repo.getByProjectId("p1" as any, testOrgId);
    expect(results).toHaveLength(1);
    expect(results[0].action).toBe("action1");
  });

  it("should clear all entries", async () => {
    await repo.save(
      createAuditLog("p1" as any, testOrgId, "action1", "system", "project", "r1"),
    );
    repo.clear();
    const results = await repo.getByProjectId("p1" as any, testOrgId);
    expect(results).toHaveLength(0);
  });
});