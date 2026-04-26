import { AuditLogRepository, AuditQueryFilters } from "../ports";
import { AuditLog, ProjectId, OrganizationId } from "@workflow-jk/contracts";

export class InMemoryAuditLogRepository implements AuditLogRepository {
  private entries: AuditLog[] = [];

  async save(entry: AuditLog): Promise<AuditLog> {
    this.entries.push(entry);
    return entry;
  }

  async getByProjectId(projectId: ProjectId, organizationId: OrganizationId): Promise<AuditLog[]> {
    return this.entries
      .filter((e) => e.projectId === projectId && e.organizationId === organizationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async query(organizationId: OrganizationId, filters?: AuditQueryFilters): Promise<AuditLog[]> {
    let results = this.entries.filter((e) => e.organizationId === organizationId);
    if (filters) {
      if (filters.action) {
        results = results.filter((e) => e.action === filters.action);
      }
      if (filters.actor) {
        results = results.filter((e) => e.actor === filters.actor);
      }
      if (filters.resourceType) {
        results = results.filter((e) => e.resourceType === filters.resourceType);
      }
      if (filters.resourceId) {
        results = results.filter((e) => e.resourceId === filters.resourceId);
      }
      if (filters.from) {
        results = results.filter((e) => e.createdAt >= filters.from!);
      }
      if (filters.to) {
        results = results.filter((e) => e.createdAt <= filters.to!);
      }
      if (filters.page !== undefined && filters.pageSize !== undefined) {
        const start = filters.page * filters.pageSize;
        results = results.slice(start, start + filters.pageSize);
      }
    }
    return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  clear(): void {
    this.entries = [];
  }
}