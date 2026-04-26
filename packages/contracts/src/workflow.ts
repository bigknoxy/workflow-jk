import { z } from "zod";
import { WorkflowRunId, ProjectId, WorkflowState, IsoTimestamp, ApprovalDecision, AuditLogId } from "./common";
import { OrganizationId } from "./auth";

export const WorkflowRun = z.object({
  id: WorkflowRunId,
  projectId: ProjectId,
  organizationId: OrganizationId,
  state: WorkflowState,
  currentStage: z.string(),
  createdAt: IsoTimestamp,
  updatedAt: IsoTimestamp,
  completedAt: IsoTimestamp.optional(),
  failureReason: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type WorkflowRun = z.infer<typeof WorkflowRun>;

export const ApprovalPayload = z.object({
  workflowRunId: WorkflowRunId,
  artifactType: z.string(),
  decision: ApprovalDecision,
  reviewer: z.string(),
  comments: z.string().optional(),
});
export type ApprovalPayload = z.infer<typeof ApprovalPayload>;

export const ApprovalRecord = z.object({
  id: z.string().uuid(),
  workflowRunId: WorkflowRunId,
  organizationId: OrganizationId,
  artifactType: z.string(),
  decision: ApprovalDecision,
  reviewer: z.string(),
  comments: z.string().optional(),
  createdAt: IsoTimestamp,
});
export type ApprovalRecord = z.infer<typeof ApprovalRecord>;

export const TransitionResult = z.object({
  previousState: WorkflowState,
  newState: WorkflowState,
  trigger: z.string(),
  timestamp: IsoTimestamp,
  sideEffects: z.array(z.string()),
});
export type TransitionResult = z.infer<typeof TransitionResult>;

export const AuditLog = z.object({
  id: AuditLogId,
  projectId: ProjectId,
  organizationId: OrganizationId,
  action: z.string(),
  actor: z.string(),
  resourceType: z.string(),
  resourceId: z.string(),
  details: z.record(z.unknown()).optional(),
  sessionId: z.string().optional(),
  clientIp: z.string().optional(),
  previousHash: z.string().optional(),
  createdAt: IsoTimestamp,
});
export type AuditLog = z.infer<typeof AuditLog>;

export const WorkflowEvent = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("workflow_started"),
    workflowRunId: WorkflowRunId,
    projectId: ProjectId,
    timestamp: IsoTimestamp,
  }),
  z.object({
    type: z.literal("state_changed"),
    workflowRunId: WorkflowRunId,
    from: WorkflowState,
    to: WorkflowState,
    trigger: z.string(),
    timestamp: IsoTimestamp,
  }),
  z.object({
    type: z.literal("awaiting_input"),
    workflowRunId: WorkflowRunId,
    inputType: z.enum(["clarification", "approval"]),
    timestamp: IsoTimestamp,
  }),
  z.object({
    type: z.literal("workflow_completed"),
    workflowRunId: WorkflowRunId,
    timestamp: IsoTimestamp,
  }),
  z.object({
    type: z.literal("workflow_failed"),
    workflowRunId: WorkflowRunId,
    reason: z.string(),
    timestamp: IsoTimestamp,
  }),
]);
export type WorkflowEvent = z.infer<typeof WorkflowEvent>;