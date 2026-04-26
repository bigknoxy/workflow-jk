import { z } from "zod";

export const ArtifactId = z.string().uuid().brand("ArtifactId");
export type ArtifactId = z.infer<typeof ArtifactId>;

export const ProjectId = z.string().uuid().brand("ProjectId");
export type ProjectId = z.infer<typeof ProjectId>;

export const TaskId = z.string().uuid().brand("TaskId");
export type TaskId = z.infer<typeof TaskId>;

export const WorkflowRunId = z.string().uuid().brand("WorkflowRunId");
export type WorkflowRunId = z.infer<typeof WorkflowRunId>;

export const AuditLogId = z.string().uuid().brand("AuditLogId");
export type AuditLogId = z.infer<typeof AuditLogId>;

export const AgentName = z.enum(["IntakeAgent", "RequirementsCriticAgent", "ArchitectAgent", "DevAgent", "QaAgent"]);
export type AgentName = z.infer<typeof AgentName>;

export const WorkflowState = z.enum([
  "Draft",
  "IntakeInProgress",
  "AwaitingClarification",
  "RequirementsReadyForApproval",
  "RequirementsApproved",
  "ArchitectureInProgress",
  "AwaitingArchitectureApproval",
  "ArchitectureApproved",
  "DevInProgress",
  "QaInProgress",
  "ReworkRequired",
  "ReadyForRelease",
  "Completed",
  "Failed",
]);
export type WorkflowState = z.infer<typeof WorkflowState>;

export const IsoTimestamp = z.string().datetime();
export type IsoTimestamp = z.infer<typeof IsoTimestamp>;

export const SchemaVersion = z.string().regex(/^\d+\.\d+\.\d+$/);
export type SchemaVersion = z.infer<typeof SchemaVersion>;

export const ApprovalDecision = z.enum(["approved", "rejected", "changes_requested"]);
export type ApprovalDecision = z.infer<typeof ApprovalDecision>;

export const UserId = z.string().uuid().brand("UserId");
export type UserId = z.infer<typeof UserId>;