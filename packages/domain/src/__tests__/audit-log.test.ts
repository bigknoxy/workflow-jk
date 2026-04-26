import { describe, it, expect } from "vitest";
import { createAuditLog } from "../entities";
import { AuditLog, OrganizationId } from "@workflow-jk/contracts";

const testOrgId = "00000000-0000-0000-0000-000000000000" as unknown as OrganizationId;

describe("createAuditLog", () => {
  it("should create an audit log entry with all required fields", () => {
    const entry = createAuditLog(
      "project-1" as any,
      testOrgId,
      "project.created",
      "IntakeAgent",
      "project",
      "project-1",
    );
    expect(entry.action).toBe("project.created");
    expect(entry.actor).toBe("IntakeAgent");
    expect(entry.resourceType).toBe("project");
    expect(entry.resourceId).toBe("project-1");
    expect(entry.projectId).toBe("project-1");
    expect(entry.createdAt).toBeTruthy();
    expect(entry.id).toBeTruthy();
  });

  it("should include optional details when provided", () => {
    const entry = createAuditLog(
      "project-1" as any,
      testOrgId,
      "approval.decided",
      "reviewer@example.com",
      "approval",
      "approval-1",
      { decision: "approved", artifactType: "requirements" },
    );
    expect(entry.details).toEqual({
      decision: "approved",
      artifactType: "requirements",
    });
  });

  it("should omit details when not provided", () => {
    const entry = createAuditLog(
      "project-1" as any,
      testOrgId,
      "workflow.started",
      "system",
      "workflow",
      "workflow-1",
    );
    expect(entry.details).toBeUndefined();
  });

  it("should generate unique IDs for each entry", () => {
    const entry1 = createAuditLog(
      "p1" as any,
      testOrgId,
      "action1",
      "actor1",
      "type1",
      "r1",
    );
    const entry2 = createAuditLog(
      "p1" as any,
      testOrgId,
      "action2",
      "actor2",
      "type2",
      "r2",
    );
    expect(entry1.id).not.toBe(entry2.id);
  });
});