import {
  Project,
  ProjectId,
  OrganizationId,
  ProjectIntakeRequest,
  WorkflowRun,
  WorkflowRunId,
  WorkflowState,
  ArtifactUnion,
  ArtifactSearchQuery,
  ArtifactId,
  ApprovalRecord,
  ApprovalPayload,
  AgentInvocation,
  AgentResult,
  ClarificationResponsePayload,
  AuditLog,
  Organization,
  User,
  UserId,
  OrganizationMember,
  UserRole,
  Session,
  SessionId,
  Task,
  TaskId,
  TaskIntakeRequest,
  TaskStatus,
  TaskPriority,
} from "@workflow-jk/contracts";

// Re-export for convenience
export { AgentInvocation, AgentResult } from "@workflow-jk/contracts";

export interface LLMProvider {
  readonly name: string;
  complete(prompt: string, options?: { maxTokens?: number; temperature?: number }): Promise<string>;
  completeStructured<T>(prompt: string, schema: unknown, options?: { maxTokens?: number; temperature?: number }): Promise<T>;
}

export interface ArtifactStore {
  save(artifact: ArtifactUnion): Promise<ArtifactUnion>;
  getById(id: ArtifactId, organizationId: OrganizationId): Promise<ArtifactUnion | null>;
  query(query: ArtifactSearchQuery): Promise<ArtifactUnion[]>;
  getLatestByType(projectId: ProjectId, type: string, organizationId: OrganizationId): Promise<ArtifactUnion | null>;
}

export interface ProjectRepository {
  save(project: Project): Promise<Project>;
  getById(id: ProjectId, organizationId: OrganizationId): Promise<Project | null>;
  list(organizationId: OrganizationId): Promise<Project[]>;
}

export interface WorkflowRepository {
  save(workflowRun: WorkflowRun): Promise<WorkflowRun>;
  getById(id: WorkflowRunId, organizationId: OrganizationId): Promise<WorkflowRun | null>;
  getByProjectId(projectId: ProjectId, organizationId: OrganizationId): Promise<WorkflowRun | null>;
  updateState(id: WorkflowRunId, organizationId: OrganizationId, state: WorkflowState, currentStage: string): Promise<WorkflowRun>;
}

export interface ApprovalRepository {
  save(approval: ApprovalRecord): Promise<ApprovalRecord>;
  getByWorkflowId(workflowRunId: WorkflowRunId): Promise<ApprovalRecord[]>;
  getLatestByType(workflowRunId: WorkflowRunId, artifactType: string): Promise<ApprovalRecord | null>;
}

/**
 * RepoProvider - Interface for interacting with a repository (e.g., GitHub, GitLab).
 *
 * All path parameters should be validated to prevent path traversal attacks.
 * Implementations should reject paths starting with "..", absolute paths outside
 * expected directories, or paths matching denied patterns.
 */
export interface RepoProvider {
  createFile(path: string, content: string): Promise<{ path: string; sha: string }>;
  updateFile(path: string, content: string): Promise<{ path: string; sha: string }>;
  deleteFile(path: string): Promise<{ path: string; sha: string }>;
  getFile(path: string): Promise<{ path: string; content: string }>;
  listFiles(prefix?: string): Promise<string[]>;
  createBranch(name: string): Promise<string>;
  createCommit(message: string, files: Array<{ path: string; content: string }>): Promise<{ sha: string }>;
}

export interface TestRunner {
  runTests(testFilter?: string[]): Promise<{
    passed: number;
    failed: number;
    skipped: number;
    results: Array<{ name: string; status: "pass" | "fail" | "skip"; message?: string }>;
  }>;
}

export interface BrowserRunner {
  runCheck(url: string, checks: string[]): Promise<{
    passed: boolean;
    results: Array<{ check: string; passed: boolean; details: string }>;
  }>;
}

export interface NotificationProvider {
  notify(userId: string, type: string, payload: unknown): Promise<void>;
}

export interface Clock {
  now(): Date;
  isoNow(): string;
}

export interface AgentPort {
  invoke(invocation: AgentInvocation): Promise<AgentResult>;
}

export interface AuditLogRepository {
  save(entry: AuditLog): Promise<AuditLog>;
  getByProjectId(projectId: ProjectId, organizationId: OrganizationId): Promise<AuditLog[]>;
  query(organizationId: OrganizationId, filters?: AuditQueryFilters): Promise<AuditLog[]>;
}

export interface AuditQueryFilters {
  action?: string;
  actor?: string;
  resourceType?: string;
  resourceId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface OrganizationRepository {
  save(org: Organization): Promise<Organization>;
  getById(id: OrganizationId): Promise<Organization | null>;
  getBySlug(slug: string): Promise<Organization | null>;
  list(): Promise<Organization[]>;
}

export interface UserRepository {
  save(user: User): Promise<User>;
  getById(id: UserId): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  list(organizationId: OrganizationId): Promise<User[]>;
}

export interface OrganizationMemberRepository {
  save(member: OrganizationMember): Promise<OrganizationMember>;
  getByUserAndOrg(userId: UserId, organizationId: OrganizationId): Promise<OrganizationMember | null>;
  listByOrganization(organizationId: OrganizationId): Promise<OrganizationMember[]>;
}

export interface SessionRepository {
  save(session: Session): Promise<Session>;
  getByToken(token: string): Promise<Session | null>;
  delete(id: SessionId): Promise<void>;
  deleteByUserId(userId: UserId): Promise<void>;
}

export interface IdempotencyStore {
  check(key: string): Promise<unknown | null>;
  store(key: string, result: unknown): Promise<void>;
}

export interface TaskRepository {
  save(task: Task): Promise<Task>;
  getById(id: TaskId): Promise<Task | null>;
  getByProjectId(projectId: TaskId): Promise<Task[]>;
  updateStatus(id: TaskId, status: TaskStatus): Promise<Task | null>;
  updatePriority(id: TaskId, priority: TaskPriority): Promise<Task | null>;
  assignToUser(id: TaskId, userId: UserId): Promise<Task | null>;
}

export interface TaskService {
  createTask(request: TaskIntakeRequest): Promise<Task>;
  getTask(id: TaskId): Promise<Task | null>;
  updateTaskStatus(id: TaskId, status: TaskStatus): Promise<Task | null>;
  updateTaskPriority(id: TaskId, priority: TaskPriority): Promise<Task | null>;
  assignTask(id: TaskId, userId: UserId): Promise<Task | null>;
  listByProject(projectId: string): Promise<Task[]>;
}