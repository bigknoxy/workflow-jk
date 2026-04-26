import { OrganizationMemberRepository } from "../ports";
import { OrganizationMember, UserId, OrganizationId } from "@workflow-jk/contracts";

export class InMemoryOrganizationMemberRepository implements OrganizationMemberRepository {
  private members: Map<string, OrganizationMember> = new Map();

  async save(member: OrganizationMember): Promise<OrganizationMember> {
    const key = `${member.userId}-${member.organizationId}`;
    this.members.set(key, member);
    return member;
  }

  async getByUserAndOrg(userId: UserId, organizationId: OrganizationId): Promise<OrganizationMember | null> {
    const key = `${userId}-${organizationId}`;
    return this.members.get(key) ?? null;
  }

  async listByOrganization(organizationId: OrganizationId): Promise<OrganizationMember[]> {
    return Array.from(this.members.values()).filter(
      (m) => m.organizationId === organizationId
    );
  }

  clear(): void {
    this.members.clear();
  }
}