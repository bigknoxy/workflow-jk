import { AuditLog, ProjectId, OrganizationId } from "@workflow-jk/contracts";
import { createAuditLog } from "@workflow-jk/domain";
import type { AuditLogRepository } from "@workflow-jk/adapters";
import { chainAuditEntry, computeAuditHash } from "@workflow-jk/domain";

export { computeAuditHash, chainAuditEntry };

export async function writeAuditLog(
  repo: AuditLogRepository,
  entry: {
    projectId: ProjectId;
    organizationId: OrganizationId;
    action: string;
    actor: string;
    resourceType: string;
    resourceId: string;
    details?: Record<string, unknown>;
    sessionId?: string;
    clientIp?: string;
  },
  previousHash: string | null,
): Promise<AuditLog> {
  const rawEntry = createAuditLog(
    entry.projectId,
    entry.organizationId,
    entry.action,
    entry.actor,
    entry.resourceType,
    entry.resourceId,
    entry.details,
    entry.sessionId,
    entry.clientIp,
  );
  const chainedEntry = chainAuditEntry(rawEntry, previousHash);
  return repo.save(chainedEntry);
}

export async function getLastAuditHash(
  repo: AuditLogRepository,
  projectId: ProjectId,
  organizationId: OrganizationId,
): Promise<string | null> {
  const logs = await repo.getByProjectId(projectId, organizationId);
  if (logs.length === 0) return null;
  return computeAuditHash(logs[logs.length - 1]);
}