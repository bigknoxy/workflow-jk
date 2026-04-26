import { z } from "zod";
import { UserId } from "./common";

export const OrganizationId = z.string().uuid().brand("OrganizationId");
export type OrganizationId = z.infer<typeof OrganizationId>;

export const SessionId = z.string().uuid().brand("SessionId");
export type SessionId = z.infer<typeof SessionId>;

export const UserRole = z.enum(["org_admin", "reviewer", "operator", "requester", "read_only_auditor"]);
export type UserRole = z.infer<typeof UserRole>;

export const Organization = z.object({
  id: OrganizationId,
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Organization = z.infer<typeof Organization>;

export const User = z.object({
  id: UserId,
  organizationId: OrganizationId,
  email: z.string().email(),
  name: z.string().min(1).max(100),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type User = z.infer<typeof User>;

export const OrganizationMember = z.object({
  userId: UserId,
  organizationId: OrganizationId,
  role: UserRole,
  createdAt: z.string().datetime(),
});
export type OrganizationMember = z.infer<typeof OrganizationMember>;

export const Session = z.object({
  id: SessionId,
  userId: UserId,
  organizationId: OrganizationId,
  role: UserRole,
  token: z.string().min(1),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type Session = z.infer<typeof Session>;

export const AuthContext = z.object({
  userId: UserId,
  organizationId: OrganizationId,
  role: UserRole,
  sessionId: SessionId,
});
export type AuthContext = z.infer<typeof AuthContext>;

export const Action = z.enum([
  "project:create",
  "project:read",
  "project:delete",
  "workflow:start",
  "workflow:resume",
  "workflow:read",
  "approval:submit",
  "approval:read",
  "artifact:read",
  "artifact:write",
  "audit:read",
  "execution:start",
  "execution:cancel",
  "org:manage",
  "user:manage",
  "auth:login",
  "auth:logout",
]);
export type Action = z.infer<typeof Action>;

export const ResourceType = z.enum([
  "project",
  "workflow",
  "approval",
  "artifact",
  "audit_log",
  "organization",
  "user",
  "execution",
]);
export type ResourceType = z.infer<typeof ResourceType>;

export const LoginRequest = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const LoginResponse = z.object({
  token: z.string(),
  user: User,
  organization: Organization,
  role: UserRole,
  expiresAt: z.string().datetime(),
});
export type LoginResponse = z.infer<typeof LoginResponse>;

export const RegisterRequest = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(128),
  organizationName: z.string().min(1).max(100),
  organizationSlug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
});
export type RegisterRequest = z.infer<typeof RegisterRequest>;