import { OrganizationRepository } from "../ports";
import { Organization, OrganizationId } from "@workflow-jk/contracts";

export class InMemoryOrganizationRepository implements OrganizationRepository {
  private organizations: Map<string, Organization> = new Map();

  async save(org: Organization): Promise<Organization> {
    this.organizations.set(org.id as unknown as string, org);
    return org;
  }

  async getById(id: OrganizationId): Promise<Organization | null> {
    return this.organizations.get(id as unknown as string) ?? null;
  }

  async getBySlug(slug: string): Promise<Organization | null> {
    for (const org of this.organizations.values()) {
      if (org.slug === slug) {
        return org;
      }
    }
    return null;
  }

  async list(): Promise<Organization[]> {
    return Array.from(this.organizations.values());
  }

  clear(): void {
    this.organizations.clear();
  }
}