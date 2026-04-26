import { v4 as uuidv4 } from "uuid";
import {
  Project, ProjectId, OrganizationId, WorkflowRun, WorkflowRunId, WorkflowState,
  ApprovalRecord, ApprovalDecision, IsoTimestamp, ProjectIntakeRequest,
  AuditLog, AuditLogId,
  Organization, User, UserId, OrganizationMember, UserRole, Session, SessionId,
} from "@workflow-jk/contracts";

export function createOrganization(name: string, slug: string): Organization {
  const now = new Date().toISOString() as IsoTimestamp;
  return {
    id: uuidv4() as unknown as OrganizationId,
    name,
    slug,
    createdAt: now,
    updatedAt: now,
  };
}

export function createUser(
  id: UserId,
  email: string,
  name: string,
  organizationId: OrganizationId,
): User {
  const now = new Date().toISOString() as IsoTimestamp;
  return {
    id,
    email,
    name,
    organizationId,
    createdAt: now,
    updatedAt: now,
  };
}

export function createOrganizationMember(
  userId: UserId,
  organizationId: OrganizationId,
  role: UserRole,
): OrganizationMember {
  return {
    userId,
    organizationId,
    role,
    createdAt: new Date().toISOString() as IsoTimestamp,
  };
}

export function createSession(
  userId: UserId,
  organizationId: OrganizationId,
  role: UserRole,
  token: string,
  expiresAt: IsoTimestamp,
): Session {
  const now = new Date().toISOString() as IsoTimestamp;
  return {
    id: uuidv4() as unknown as SessionId,
    userId,
    organizationId,
    role,
    token,
    expiresAt,
    createdAt: now,
  };
}

export function createProject(organizationId: OrganizationId, input: ProjectIntakeRequest): Project {
  const now = new Date().toISOString() as IsoTimestamp;
  return {
    id: uuidv4() as unknown as ProjectId,
    organizationId,
    title: input.title,
    rawIdea: input.rawIdea,
    businessGoal: input.businessGoal,
    constraints: input.constraints,
    assumptions: input.assumptions ?? [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createWorkflowRun(projectId: ProjectId, organizationId: OrganizationId): WorkflowRun {
  const now = new Date().toISOString() as IsoTimestamp;
  return {
    id: uuidv4() as unknown as WorkflowRunId,
    projectId,
    organizationId,
    state: "Draft" as WorkflowState,
    currentStage: "intake",
    createdAt: now,
    updatedAt: now,
  };
}

export function createApprovalRecord(
  workflowRunId: WorkflowRunId,
  organizationId: OrganizationId,
  artifactType: string,
  decision: ApprovalDecision,
  reviewer: string,
  comments?: string,
): ApprovalRecord {
  return {
    id: uuidv4() as unknown as ApprovalRecord["id"],
    workflowRunId,
    organizationId,
    artifactType,
    decision,
    reviewer,
    comments,
    createdAt: new Date().toISOString() as IsoTimestamp,
  };
}

export function createAuditLog(
  projectId: ProjectId,
  organizationId: OrganizationId,
  action: string,
  actor: string,
  resourceType: string,
  resourceId: string,
  details?: Record<string, unknown>,
  sessionId?: string,
  clientIp?: string,
  previousHash?: string,
): AuditLog {
  return {
    id: uuidv4() as unknown as AuditLogId,
    projectId,
    organizationId,
    action,
    actor,
    resourceType,
    resourceId,
    details,
    sessionId,
    clientIp,
    previousHash,
    createdAt: new Date().toISOString() as IsoTimestamp,
  };
}