import type {
  LLMProvider,
  ArtifactStore,
  ProjectRepository,
  WorkflowRepository,
  ApprovalRepository,
  AuditLogRepository,
  RepoProvider,
  TestRunner,
  BrowserRunner,
  NotificationProvider,
  Clock,
  OrganizationRepository,
  UserRepository,
  OrganizationMemberRepository,
  SessionRepository,
  IdempotencyStore,
  TaskRepository,
} from "@workflow-jk/adapters";
import {
  FakeLLMProvider,
  FakeRepoProvider,
  FakeTestRunner,
  FakeBrowserRunner,
  FakeNotificationProvider,
  FakeClock,
  SystemClock,
  InMemoryArtifactStore,
  InMemoryProjectRepository,
  InMemoryWorkflowRepository,
  InMemoryApprovalRepository,
  InMemoryAuditLogRepository,
  InMemoryOrganizationRepository,
  InMemoryUserRepository,
  InMemoryOrganizationMemberRepository,
  InMemorySessionRepository,
  InMemoryIdempotencyStore,
  InMemoryTaskRepository,
  OllamaProvider,
  OpenAICompatibleProvider,
  PostgresProjectRepository,
  PostgresWorkflowRepository,
  PostgresApprovalRepository,
  PostgresArtifactStore,
  PostgresAuditLogRepository,
  PostgresOrganizationRepository,
  PostgresUserRepository,
  PostgresOrganizationMemberRepository,
  PostgresSessionRepository,
  PostgresIdempotencyStore,
  PostgresTaskRepository,
} from "@workflow-jk/adapters";
import { LLMRouter } from "@workflow-jk/adapters";
import pg from "pg";
import type { AppConfig } from "@workflow-jk/config";
import type { ActivityDependencies } from "@workflow-jk/orchestration";
import type { OrganizationId } from "@workflow-jk/contracts";

export interface AppContainer {
  llmProvider: LLMProvider;
  artifactStore: ArtifactStore;
  projectRepository: ProjectRepository;
  workflowRepository: WorkflowRepository;
  approvalRepository: ApprovalRepository;
  auditLogRepository: AuditLogRepository;
  repoProvider: RepoProvider;
  testRunner: TestRunner;
  browserRunner: BrowserRunner;
  notificationProvider: NotificationProvider;
  clock: Clock;
  organizationRepository: OrganizationRepository;
  userRepository: UserRepository;
  organizationMemberRepository: OrganizationMemberRepository;
  sessionRepository: SessionRepository;
  idempotencyStore: IdempotencyStore;
  taskRepository: TaskRepository;
  dbPool?: pg.Pool;
}

export function createFakeContainer(): AppContainer {
  return {
    llmProvider: new FakeLLMProvider(),
    artifactStore: new InMemoryArtifactStore(),
    projectRepository: new InMemoryProjectRepository(),
    workflowRepository: new InMemoryWorkflowRepository(),
    approvalRepository: new InMemoryApprovalRepository(),
    auditLogRepository: new InMemoryAuditLogRepository(),
    repoProvider: new FakeRepoProvider(),
    testRunner: new FakeTestRunner(),
    browserRunner: new FakeBrowserRunner(),
    notificationProvider: new FakeNotificationProvider(),
    clock: new FakeClock(),
    organizationRepository: new InMemoryOrganizationRepository(),
    userRepository: new InMemoryUserRepository(),
    organizationMemberRepository: new InMemoryOrganizationMemberRepository(),
    sessionRepository: new InMemorySessionRepository(),
    idempotencyStore: new InMemoryIdempotencyStore(),
    taskRepository: new InMemoryTaskRepository(),
  };
}

export function createContainer(config: AppConfig): AppContainer {
  let llmProvider: LLMProvider;
  const isFake = config.llmProvider === "fake";

  switch (config.llmProvider) {
    case "ollama": {
      const baseProvider = new OllamaProvider({
        baseUrl: config.ollamaBaseUrl,
        model: config.ollamaModel,
      });
      llmProvider = isFake
        ? baseProvider
        : new LLMRouter({
            primary: baseProvider,
            maxRetries: config.llmMaxRetries ?? 3,
            timeoutMs: config.llmTimeoutMs ?? 60000,
            initialDelayMs: config.llmInitialDelayMs ?? 1000,
            maxDelayMs: 30000,
            backoffMultiplier: 2,
          });
      break;
    }
    case "openai-compatible": {
      const baseProvider = new OpenAICompatibleProvider({
        baseUrl: config.openaiBaseUrl,
        apiKey: config.openaiApiKey,
        model: config.openaiModel,
      });
      llmProvider = isFake
        ? baseProvider
        : new LLMRouter({
            primary: baseProvider,
            maxRetries: config.llmMaxRetries ?? 3,
            timeoutMs: config.llmTimeoutMs ?? 60000,
            initialDelayMs: config.llmInitialDelayMs ?? 1000,
            maxDelayMs: 30000,
            backoffMultiplier: 2,
          });
      break;
    }
    case "fake":
    default:
      llmProvider = new FakeLLMProvider();
      break;
  }

  // Use Postgres-backed repositories if databaseUrl is provided
  if (config.databaseUrl) {
    const pool = new pg.Pool({
      connectionString: config.databaseUrl,
    });
    return {
      llmProvider,
      artifactStore: new PostgresArtifactStore({ pool }),
      projectRepository: new PostgresProjectRepository({ pool }),
      workflowRepository: new PostgresWorkflowRepository({ pool }),
      approvalRepository: new PostgresApprovalRepository({ pool }),
      auditLogRepository: new PostgresAuditLogRepository({ pool }),
      repoProvider: new FakeRepoProvider(),
      testRunner: new FakeTestRunner(),
      browserRunner: new FakeBrowserRunner(),
      notificationProvider: new FakeNotificationProvider(),
      clock: new SystemClock(),
      organizationRepository: new PostgresOrganizationRepository({ pool }),
      userRepository: new PostgresUserRepository({ pool }),
      organizationMemberRepository: new PostgresOrganizationMemberRepository({ pool }),
      sessionRepository: new PostgresSessionRepository({ pool }),
      idempotencyStore: new PostgresIdempotencyStore({ pool }),
      taskRepository: new PostgresTaskRepository({ pool }),
      dbPool: pool,
    };
  }

  return {
    llmProvider,
    artifactStore: new InMemoryArtifactStore(),
    projectRepository: new InMemoryProjectRepository(),
    workflowRepository: new InMemoryWorkflowRepository(),
    approvalRepository: new InMemoryApprovalRepository(),
    auditLogRepository: new InMemoryAuditLogRepository(),
    repoProvider: new FakeRepoProvider(),
    testRunner: new FakeTestRunner(),
    browserRunner: new FakeBrowserRunner(),
    notificationProvider: new FakeNotificationProvider(),
    clock: new SystemClock(),
    organizationRepository: new InMemoryOrganizationRepository(),
    userRepository: new InMemoryUserRepository(),
    organizationMemberRepository: new InMemoryOrganizationMemberRepository(),
    sessionRepository: new InMemorySessionRepository(),
    idempotencyStore: new InMemoryIdempotencyStore(),
    taskRepository: new InMemoryTaskRepository(),
  };
}

export function toActivityDeps(container: AppContainer, organizationId: OrganizationId): ActivityDependencies {
  return {
    ...container,
    organizationId,
  };
}