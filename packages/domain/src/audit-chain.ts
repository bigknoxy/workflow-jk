import { createHash } from "crypto";
import { AuditLog } from "@workflow-jk/contracts";

export function computeAuditHash(entry: Omit<AuditLog, "previousHash">): string {
  const payload = JSON.stringify({
    id: entry.id,
    projectId: entry.projectId,
    organizationId: entry.organizationId,
    action: entry.action,
    actor: entry.actor,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    details: entry.details ?? undefined,
    sessionId: entry.sessionId ?? undefined,
    clientIp: entry.clientIp ?? undefined,
    createdAt: entry.createdAt,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function chainAuditEntry(
  entry: Omit<AuditLog, "previousHash">,
  previousEntryHash: string | null,
): AuditLog {
  const hash = computeAuditHash(entry);
  return {
    ...entry,
    previousHash: previousEntryHash ?? hash,
  };
}

export function verifyAuditChain(
  entries: AuditLog[],
): { valid: boolean; brokenAtIndex: number | null } {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const prevEntry = entries[i - 1];
    
    const entryWithoutHash: Omit<AuditLog, "previousHash"> = {
      id: entry.id,
      projectId: entry.projectId,
      organizationId: entry.organizationId,
      action: entry.action,
      actor: entry.actor,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      details: entry.details ?? undefined,
      sessionId: entry.sessionId ?? undefined,
      clientIp: entry.clientIp ?? undefined,
      createdAt: entry.createdAt,
    };
    
    const prevEntryWithoutHash = prevEntry
      ? {
          id: prevEntry.id,
          projectId: prevEntry.projectId,
          organizationId: prevEntry.organizationId,
          action: prevEntry.action,
          actor: prevEntry.actor,
          resourceType: prevEntry.resourceType,
          resourceId: prevEntry.resourceId,
          details: prevEntry.details ?? undefined,
          sessionId: prevEntry.sessionId ?? undefined,
          clientIp: prevEntry.clientIp ?? undefined,
          createdAt: prevEntry.createdAt,
        }
      : undefined;
    
    const expectedPrevHash =
      i === 0
        ? computeAuditHash(entryWithoutHash)
        : computeAuditHash(prevEntryWithoutHash!);
    if (entry.previousHash !== expectedPrevHash) {
      return { valid: false, brokenAtIndex: i };
    }
  }
  return { valid: true, brokenAtIndex: null };
}