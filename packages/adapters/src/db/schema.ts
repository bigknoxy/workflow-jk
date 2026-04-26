import { pgTable, uuid, varchar, text, timestamp, jsonb, integer, index, primaryKey } from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey(),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: varchar("email").notNull().unique(),
  name: varchar("name").notNull(),
  passwordHash: varchar("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const organizationMembers = pgTable("organization_members", {
  userId: uuid("user_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  role: varchar("role").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  role: varchar("role").notNull(),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const idempotencyKeys = pgTable("idempotency_keys", {
  keyHash: varchar("key_hash").primaryKey(),
  resultJson: jsonb("result_json"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey(),
  organizationId: uuid("organization_id").notNull(),
  title: varchar("title").notNull(),
  rawIdea: text("raw_idea").notNull(),
  businessGoal: text("business_goal").notNull(),
  constraints: jsonb("constraints").notNull().$type<string[]>(),
  assumptions: jsonb("assumptions").notNull().$type<string[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  state: varchar("state").notNull(),
  currentStage: varchar("current_stage").notNull(),
  currentAgent: varchar("current_agent"),
  artifactIds: jsonb("artifact_ids").notNull().$type<string[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const artifacts = pgTable("artifacts", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  workflowRunId: uuid("workflow_run_id").notNull(),
  type: varchar("type").notNull(),
  version: integer("version").notNull().default(1),
  content: jsonb("content").notNull(),
  schemaVersion: varchar("schema_version").notNull(),
  createdBy: varchar("created_by"),
  summary: text("summary"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  projectTypeIdx: index("artifacts_project_type_idx").on(table.projectId, table.type),
  orgIdx: index("artifacts_organization_idx").on(table.organizationId),
}));

export const approvals = pgTable("approvals", {
  id: uuid("id").primaryKey(),
  workflowRunId: uuid("workflow_run_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  artifactType: varchar("artifact_type").notNull(),
  decision: varchar("decision").notNull(),
  reviewer: varchar("reviewer").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  workflowIdx: index("approvals_workflow_idx").on(table.workflowRunId),
}));

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id").notNull(),
  organizationId: uuid("organization_id").notNull(),
  action: varchar("action").notNull(),
  actor: varchar("actor").notNull(),
  resourceType: varchar("resource_type").notNull(),
  resourceId: varchar("resource_id").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>(),
  sessionId: uuid("session_id"),
  clientIp: varchar("client_ip"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  projectIdx: index("audit_logs_project_idx").on(table.projectId),
  orgIdx: index("audit_logs_organization_idx").on(table.organizationId),
}));

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  status: varchar("status").notNull(),
  priority: varchar("priority").notNull(),
  assigneeId: uuid("assignee_id"),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  projectIdx: index("tasks_project_idx").on(table.projectId),
}));