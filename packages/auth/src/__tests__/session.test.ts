import { describe, it, expect, beforeEach } from "vitest";
import { SessionManager, BcryptStylePasswordHasher, TokenGenerator } from "../session";
import type { Session, SessionId, UserId, OrganizationId } from "@workflow-jk/contracts";

class InMemorySessionStore {
  private sessions: Map<string, Session> = new Map();

  async save(session: Session): Promise<Session> {
    this.sessions.set(session.token, session);
    this.sessions.set(session.id as string, session);
    return session;
  }

  async getByToken(token: string): Promise<Session | null> {
    return this.sessions.get(token) || null;
  }

  async delete(id: SessionId): Promise<void> {
    const session = this.sessions.get(id as string);
    if (session) {
      this.sessions.delete(session.token);
      this.sessions.delete(id as string);
    }
  }

  async deleteByUserId(userId: UserId): Promise<void> {
    for (const [, session] of this.sessions) {
      if (session.userId === userId) {
        this.sessions.delete(session.token);
        this.sessions.delete(session.id as string);
      }
    }
  }
}

describe("BcryptStylePasswordHasher", () => {
  const hasher = new BcryptStylePasswordHasher();

  it("hashes a password", async () => {
    const hash = await hasher.hash("password123");
    expect(hash).toContain("sha256:");
    expect(hash.split(":").length).toBe(3);
  });

  it("verifies correct password", async () => {
    const hash = await hasher.hash("password123");
    const result = await hasher.verify("password123", hash);
    expect(result).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hasher.hash("password123");
    const result = await hasher.verify("wrongpassword", hash);
    expect(result).toBe(false);
  });

  it("rejects malformed hash", async () => {
    const result = await hasher.verify("password123", "not-a-hash");
    expect(result).toBe(false);
  });

  it("produces different hashes for same password", async () => {
    const hash1 = await hasher.hash("password123");
    const hash2 = await hasher.hash("password123");
    expect(hash1).not.toBe(hash2);
  });
});

describe("TokenGenerator", () => {
  const secret = "test-secret-key";
  const generator = new TokenGenerator(secret);

  it("generates a token with two parts", () => {
    const token = generator.generate();
    const parts = token.split(".");
    expect(parts.length).toBe(2);
  });

  it("verifies its own tokens", () => {
    const token = generator.generate();
    expect(generator.verify(token)).toBe(true);
  });

  it("rejects tokens from different secret", () => {
    const otherGenerator = new TokenGenerator("different-secret");
    const token = otherGenerator.generate();
    expect(generator.verify(token)).toBe(false);
  });

  it("rejects malformed tokens", () => {
    expect(generator.verify("malformed")).toBe(false);
    expect(generator.verify("")).toBe(false);
    expect(generator.verify("a.b.c")).toBe(false);
  });
});

describe("SessionManager", () => {
  let store: InMemorySessionStore;
  let manager: SessionManager;
  const userId = "00000000-0000-0000-0000-000000000001" as unknown as UserId;
  const orgId = "00000000-0000-0000-0000-000000000002" as unknown as OrganizationId;
  const tokenGenerator = new TokenGenerator("test-secret");

  beforeEach(() => {
    store = new InMemorySessionStore();
    manager = new SessionManager(store, tokenGenerator);
  });

  it("creates a valid session", async () => {
    const session = await manager.createSession(userId, orgId, "org_admin");
    expect(session.userId).toBe(userId);
    expect(session.organizationId).toBe(orgId);
    expect(session.role).toBe("org_admin");
    expect(session.token).toBeTruthy();
  });

  it("validates a valid session and returns AuthContext", async () => {
    const session = await manager.createSession(userId, orgId, "reviewer");
    const context = await manager.validateSession(session.token);
    expect(context).not.toBeNull();
    expect(context!.userId).toBe(userId);
    expect(context!.organizationId).toBe(orgId);
    expect(context!.role).toBe("reviewer");
    expect(context!.sessionId).toBe(session.id);
  });

  it("rejects invalid token", async () => {
    const context = await manager.validateSession("invalid-token");
    expect(context).toBeNull();
  });

  it("destroys a session", async () => {
    const session = await manager.createSession(userId, orgId, "operator");
    await manager.destroySession(session.id);
    const context = await manager.validateSession(session.token);
    expect(context).toBeNull();
  });

  it("destroys all sessions for a user", async () => {
    const session1 = await manager.createSession(userId, orgId, "org_admin");
    const session2 = await manager.createSession(userId, orgId, "reviewer");
    await manager.destroyAllUserSessions(userId);
    const ctx1 = await manager.validateSession(session1.token);
    const ctx2 = await manager.validateSession(session2.token);
    expect(ctx1).toBeNull();
    expect(ctx2).toBeNull();
  });
});