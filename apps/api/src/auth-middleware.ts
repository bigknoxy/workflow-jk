import { FastifyRequest, FastifyReply } from "fastify";
import type { Action, UserRole } from "@workflow-jk/contracts";
import { PolicyService } from "@workflow-jk/auth";
import { loadConfig, clearDefaultConfig } from "@workflow-jk/config";
import { OrganizationId } from "@workflow-jk/contracts";
import { extractRequestContext } from "./request-context.js";
import { SessionRepository } from "@workflow-jk/adapters";

// Lazy config loading to avoid issues during module import in test environments
let _config: any = null;
let _policy: any = null;
let _sessionRepo: SessionRepository | null = null;

function getConfig() {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

function getPolicy() {
  if (!_policy) {
    _policy = new PolicyService();
  }
  return _policy;
}

// Export a function to initialize config (useful for tests to override defaults)
export function initializeAuthMiddleware(sessionRepo?: SessionRepository) {
  getConfig();
  getPolicy();
  if (sessionRepo) {
    _sessionRepo = sessionRepo;
  }
}

// Export a function to reset (useful for tests)
export function resetAuthMiddleware() {
  _config = null;
  _policy = null;
  _sessionRepo = null;
  clearDefaultConfig();
}

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000000" as OrganizationId;

/**
 * Auth middleware - validates authorization header.
 * When authEnabled=false (dev mode), allows all requests.
 */
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const config = getConfig();
  if (!config.authEnabled) {
    return; // auth disabled in dev mode
  }

  const authHeader = request.headers["authorization"] as string;
  if (!authHeader) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Missing authorization header",
    });
  }

  // Support both "Bearer <token>" and just "<token>"
  const sessionToken = authHeader.startsWith("Bearer ") 
    ? authHeader.substring(7) 
    : authHeader;

  if (!_sessionRepo) {
    request.log.warn("Session repository not initialized, failing auth");
    return reply.status(500).send({
      error: "Internal Server Error",
      message: "Authentication system not fully initialized",
    });
  }

  const session = await _sessionRepo.getByToken(sessionToken);
  if (!session) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Invalid or expired session token",
    });
  }

  // Verify session expiration
  const now = new Date();
  if (new Date(session.expiresAt) < now) {
    await _sessionRepo.delete(session.id);
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Session token has expired",
    });
  }

  // Inject session info into request for downstream use
  (request as any).session = session;

  const context = extractRequestContext(request, session.organizationId);
  request.log.info({ 
    actor: session.userId, 
    orgId: session.organizationId,
    role: session.role,
    ip: context.clientIp 
  }, "Authenticated request");
}

/**
 * Role-based authorization middleware.
 * Authorizes the session role for the given actions.
 */
export function requireRole(...allowedActions: Action[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const config = getConfig();
    if (!config.authEnabled) {
      return; // auth disabled
    }

    const session = (request as any).session;
    const role = (request.headers["x-role"] as string) || (session?.role as string);
    
    if (!role) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Missing role",
      });
    }

    const policy = getPolicy();
    for (const action of allowedActions) {
      if (!policy.authorize(action, role as UserRole)) {
        return reply.status(403).send({
          error: "Forbidden",
          message: `Role '${role}' cannot perform '${action}'`,
        });
      }
    }
  };
}
