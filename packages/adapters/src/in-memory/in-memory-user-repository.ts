import { UserRepository } from "../ports";
import { User, UserId, OrganizationId } from "@workflow-jk/contracts";

export class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();

  async save(user: User): Promise<User> {
    this.users.set(user.id as unknown as string, user);
    return user;
  }

  async getById(id: UserId): Promise<User | null> {
    return this.users.get(id as unknown as string) ?? null;
  }

  async getByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  async list(organizationId: OrganizationId): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (u) => u.organizationId === organizationId
    );
  }

  clear(): void {
    this.users.clear();
  }
}