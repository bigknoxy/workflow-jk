import { SessionRepository } from "../ports";
import { Session, SessionId, UserId } from "@workflow-jk/contracts";

export class InMemorySessionRepository implements SessionRepository {
  private sessions: Map<string, Session> = new Map();

  async save(session: Session): Promise<Session> {
    this.sessions.set(session.id as unknown as string, session);
    return session;
  }

  async getByToken(token: string): Promise<Session | null> {
    for (const session of this.sessions.values()) {
      if (session.token === token) {
        return session;
      }
    }
    return null;
  }

  async delete(id: SessionId): Promise<void> {
    this.sessions.delete(id as unknown as string);
  }

  async deleteByUserId(userId: UserId): Promise<void> {
    for (const [id, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(id);
      }
    }
  }

  clear(): void {
    this.sessions.clear();
  }
}