import { createHash, randomBytes, timingSafeEqual } from "crypto";
import type { UserId, OrganizationId, UserRole, Session, SessionId, AuthContext } from "@workflow-jk/contracts";
import { createSession } from "@workflow-jk/domain";

export interface SessionStore {
  save(session: Session): Promise<Session>;
  getByToken(token: string): Promise<Session | null>;
  delete(id: SessionId): Promise<void>;
  deleteByUserId(userId: UserId): Promise<void>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export class BcryptStylePasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const derived = createHash("sha256").update(salt + password).digest("hex");
    return `sha256:${salt}:${derived}`;
  }

  async verify(password: string, hash: string): Promise<boolean> {
    const parts = hash.split(":");
    if (parts.length !== 3 || parts[0] !== "sha256") return false;
    const salt = parts[1];
    const expected = parts[2];
    const derived = createHash("sha256").update(salt + password).digest("hex");
    const a = Buffer.from(derived, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
}

export class TokenGenerator {
  constructor(private secret: string) {}

  generate(): string {
    const random = randomBytes(32).toString("hex");
    const hmac = createHash("sha256").update(random + this.secret).digest("hex");
    return `${random}.${hmac}`;
  }

  verify(token: string): boolean {
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [random, hmac] = parts;
    const expected = createHash("sha256").update(random + this.secret).digest("hex");
    const a = Buffer.from(hmac, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
}

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export class SessionManager {
  constructor(
    private sessionStore: SessionStore,
    private tokenGenerator: TokenGenerator,
  ) {}

  async createSession(
    userId: UserId,
    organizationId: OrganizationId,
    role: UserRole,
  ): Promise<Session> {
    const token = this.tokenGenerator.generate();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString() as any;
    const session = createSession(userId, organizationId, role, token, expiresAt);
    await this.sessionStore.save(session);
    return session;
  }

  async validateSession(token: string): Promise<AuthContext | null> {
    if (!this.tokenGenerator.verify(token)) return null;
    const session = await this.sessionStore.getByToken(token);
    if (!session) return null;
    if (new Date(session.expiresAt) < new Date()) {
      await this.sessionStore.delete(session.id);
      return null;
    }
    return {
      userId: session.userId,
      organizationId: session.organizationId,
      role: session.role,
      sessionId: session.id,
    };
  }

  async destroySession(sessionId: SessionId): Promise<void> {
    await this.sessionStore.delete(sessionId);
  }

  async destroyAllUserSessions(userId: UserId): Promise<void> {
    await this.sessionStore.deleteByUserId(userId);
  }
}