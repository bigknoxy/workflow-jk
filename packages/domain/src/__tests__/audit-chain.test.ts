import { describe, it, expect } from "vitest";
import { v4 as uuidv4 } from "uuid";
import { ProjectId, OrganizationId } from "@workflow-jk/contracts";
import {
  computeAuditHash,
  chainAuditEntry,
  verifyAuditChain,
} from "../audit-chain";
import { createAuditLog } from "../entities";

describe("audit-chain", () => {
  const organizationId = uuidv4() as unknown as OrganizationId;
  const projectId = uuidv4() as unknown as ProjectId;

  it("computeAuditHash returns consistent SHA-256 hash", () => {
    const entry = createAuditLog(
      projectId,
      organizationId,
      "project.create",
      "system",
      "project",
      projectId as string,
    );
    const hash1 = computeAuditHash(entry);
    const hash2 = computeAuditHash(entry);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it("chainAuditEntry with genesis entry (previousHash = self hash)", () => {
    const entry = createAuditLog(
      projectId,
      organizationId,
      "project.create",
      "system",
      "project",
      projectId as string,
    );
    const chained = chainAuditEntry(entry, null);
    expect(chained.previousHash).toBeDefined();
    expect(chained.previousHash).toBe(computeAuditHash(entry));
  });

  it("chainAuditEntry with previous hash", () => {
    const entry1 = createAuditLog(
      projectId,
      organizationId,
      "project.create",
      "system",
      "project",
      projectId as string,
    );
    const chained1 = chainAuditEntry(entry1, null);
    const entry2 = createAuditLog(
      projectId,
      organizationId,
      "workflow.clarification",
      "user1",
      "workflow",
      "workflow-1",
    );
    const chained2 = chainAuditEntry(entry2, computeAuditHash(entry1));
    expect(chained2.previousHash).toBe(computeAuditHash(entry1));
  });

  it("verifyAuditChain with valid chain", () => {
    const entry1 = createAuditLog(
      projectId,
      organizationId,
      "project.create",
      "system",
      "project",
      projectId as string,
    );
    const chained1 = chainAuditEntry(entry1, null);
    const entry2 = createAuditLog(
      projectId,
      organizationId,
      "workflow.clarification",
      "user1",
      "workflow",
      "workflow-1",
    );
    const chained2 = chainAuditEntry(entry2, chained1.previousHash!);
    const result = verifyAuditChain([chained1, chained2]);
    expect(result.valid).toBe(true);
    expect(result.brokenAtIndex).toBeNull();
  });

  it("verifyAuditChain detects broken chain (entry points to wrong previous)", () => {
    const entry1 = createAuditLog(
      projectId,
      organizationId,
      "project.create",
      "system",
      "project",
      projectId as string,
    );
    const chained1 = chainAuditEntry(entry1, null);
    const entry2 = createAuditLog(
      projectId,
      organizationId,
      "workflow.clarification",
      "user1",
      "workflow",
      "workflow-1",
    );
    const chained2 = chainAuditEntry(entry2, chained1.previousHash!);
    chained2.previousHash = "invalid-hash-that-doesnt-match";
    const result = verifyAuditChain([chained1, chained2]);
    expect(result.valid).toBe(false);
    expect(result.brokenAtIndex).toBe(1);
  });

  it("verifyAuditChain detects genesis mismatch", () => {
    const entry1 = createAuditLog(
      projectId,
      organizationId,
      "project.create",
      "system",
      "project",
      projectId as string,
    );
    const chained1 = chainAuditEntry(entry1, null);
    chained1.previousHash = "wrong-genesis-hash";
    const result = verifyAuditChain([chained1]);
    expect(result.valid).toBe(false);
    expect(result.brokenAtIndex).toBe(0);
  });
});