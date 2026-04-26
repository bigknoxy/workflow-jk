import { describe, it, expect } from "vitest";
import { isApproved, isRejected } from "../approval-guards";
import { ApprovalRecord, ApprovalDecision, OrganizationId } from "@workflow-jk/contracts";

const testOrgId = "00000000-0000-0000-0000-000000000000" as unknown as OrganizationId;

const baseApproval: ApprovalRecord = {
  id: "test-id",
  workflowRunId: "00000000-0000-0000-0000-000000000001" as any,
  organizationId: testOrgId,
  artifactType: "requirements",
  decision: "approved" as ApprovalDecision,
  reviewer: "test",
  createdAt: "2025-01-01T00:00:00Z",
};

describe("isApproved", () => {
  it("returns true when latest approval is approved", () => {
    expect(isApproved([baseApproval], "requirements")).toBe(true);
  });

  it("returns false when no approvals exist", () => {
    expect(isApproved([], "requirements")).toBe(false);
  });

  it("returns false when latest approval is rejected", () => {
    expect(isApproved([{ ...baseApproval, decision: "rejected" as ApprovalDecision }], "requirements")).toBe(false);
  });

  it("returns false when latest approval is changes_requested", () => {
    expect(isApproved([{ ...baseApproval, decision: "changes_requested" as ApprovalDecision }], "requirements")).toBe(false);
  });

  it("uses latest approval by timestamp", () => {
    const approvals: ApprovalRecord[] = [
      { ...baseApproval, decision: "rejected" as ApprovalDecision, createdAt: "2025-01-01T00:00:00Z" },
      { ...baseApproval, decision: "approved" as ApprovalDecision, createdAt: "2025-01-02T00:00:00Z" },
    ];
    expect(isApproved(approvals, "requirements")).toBe(true);
  });

  it("filters by artifact type", () => {
    const approvals: ApprovalRecord[] = [
      { ...baseApproval, artifactType: "requirements", decision: "approved" as ApprovalDecision, createdAt: "2025-01-01T00:00:00Z" },
      { ...baseApproval, artifactType: "architecture", decision: "rejected" as ApprovalDecision, createdAt: "2025-01-02T00:00:00Z" },
    ];
    expect(isApproved(approvals, "architecture")).toBe(false);
    expect(isApproved(approvals, "requirements")).toBe(true);
  });

  it("handles multiple approvals for same type", () => {
    const approvals: ApprovalRecord[] = [
      { ...baseApproval, decision: "approved" as ApprovalDecision, createdAt: "2025-01-01T00:00:00Z" },
      { ...baseApproval, decision: "rejected" as ApprovalDecision, createdAt: "2025-01-02T00:00:00Z" },
      { ...baseApproval, decision: "approved" as ApprovalDecision, createdAt: "2025-01-03T00:00:00Z" },
    ];
    expect(isApproved(approvals, "requirements")).toBe(true);
  });
});

describe("isRejected", () => {
  it("returns true when latest is rejected", () => {
    expect(isRejected([{ ...baseApproval, decision: "rejected" as ApprovalDecision }], "requirements")).toBe(true);
  });

  it("returns true when latest is changes_requested", () => {
    expect(isRejected([{ ...baseApproval, decision: "changes_requested" as ApprovalDecision }], "requirements")).toBe(true);
  });

  it("returns false when latest is approved", () => {
    expect(isRejected([baseApproval], "requirements")).toBe(false);
  });

  it("returns false when no approvals exist", () => {
    expect(isRejected([], "requirements")).toBe(false);
  });

  it("uses latest approval by timestamp for rejection", () => {
    const approvals: ApprovalRecord[] = [
      { ...baseApproval, decision: "approved" as ApprovalDecision, createdAt: "2025-01-01T00:00:00Z" },
      { ...baseApproval, decision: "rejected" as ApprovalDecision, createdAt: "2025-01-02T00:00:00Z" },
    ];
    expect(isRejected(approvals, "requirements")).toBe(true);
  });

  it("filters by artifact type", () => {
    const approvals: ApprovalRecord[] = [
      { ...baseApproval, artifactType: "requirements", decision: "rejected" as ApprovalDecision, createdAt: "2025-01-01T00:00:00Z" },
      { ...baseApproval, artifactType: "architecture", decision: "approved" as ApprovalDecision, createdAt: "2025-01-02T00:00:00Z" },
    ];
    expect(isRejected(approvals, "architecture")).toBe(false);
    expect(isRejected(approvals, "requirements")).toBe(true);
  });
});