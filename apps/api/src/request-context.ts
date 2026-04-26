import { FastifyRequest } from "fastify";
import { OrganizationId } from "@workflow-jk/contracts";

export interface RequestContext {
  organizationId: OrganizationId;
  actor: string;
  sessionId?: string;
  clientIp?: string;
}

export function extractRequestContext(
  request: FastifyRequest,
  defaultOrgId: OrganizationId,
): RequestContext {
  return {
    organizationId:
      (request.headers["x-organization-id"] as OrganizationId) ?? defaultOrgId,
    actor: (request.headers["x-actor"] as string) ?? "system",
    sessionId: (request.headers["x-session-id"] as string) ?? undefined,
    clientIp: request.ip ?? request.socket.remoteAddress ?? undefined,
  };
}