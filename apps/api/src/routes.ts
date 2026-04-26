import { FastifyInstance } from "fastify";
import { createHash } from "crypto";
import {
  ProjectIntakeRequest,
  ProjectId,
  WorkflowRunId,
  OrganizationId,
  ClarificationResponsePayload,
  ApprovalDecision,
  ArtifactSearchQuery,
  WorkflowRun,
  Project,
  Task,
  TaskId,
  TaskIntakeRequest,
  UserId,
} from "@workflow-jk/contracts";
import {
  ProjectService,
  WorkflowService,
  ArtifactService,
  TaskService,
  AppContainer,
  toActivityDeps,
} from "@workflow-jk/application";
import type { Logger } from "@workflow-jk/observability";
import { getInstruments, MetricAttributes } from "@workflow-jk/observability";
import {
  InlineWorkflowEngine,
  recordApproval,
  setActivityDependencies,
} from "@workflow-jk/orchestration";
import { SIGNAL_NAMES } from "@workflow-jk/config";
import { computeAuditHash, getLastAuditHash, writeAuditLog } from "./audit-middleware";
import { validateUuid } from "./validators";
import { authMiddleware, requireRole, initializeAuthMiddleware } from "./auth-middleware";
import { extractRequestContext } from "./request-context";

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000000" as unknown as OrganizationId;

function deriveIdempotencyKey(...parts: string[]): string {
  const hash = createHash("sha256");
  parts.forEach((p) => hash.update(p));
  return hash.digest("hex");
}

export interface RouteContext {
  projectService: ProjectService;
  workflowService: WorkflowService;
  artifactService: ArtifactService;
  taskService: TaskService;
}

export function registerRoutes(
  app: FastifyInstance,
  container: AppContainer,
  logger: Logger,
): void {
  const organizationId = DEFAULT_ORG_ID;

  initializeAuthMiddleware(container.sessionRepository);
  setActivityDependencies(toActivityDeps(container, organizationId));

  const activityDeps = toActivityDeps(container, organizationId);
  const engine = new InlineWorkflowEngine(
    activityDeps,
    container.workflowRepository,
    container.approvalRepository,
  );

  const projectService = new ProjectService({
    projectRepository: container.projectRepository,
    workflowRepository: container.workflowRepository,
    clock: container.clock,
    startWorkflow: async (projectId, organizationId, input) => {
      return engine.start(projectId, organizationId, input);
    },
  });

  const workflowService = new WorkflowService({
    workflowRepository: container.workflowRepository,
    approvalRepository: container.approvalRepository,
    clock: container.clock,
    sendSignal: async (workflowRunId, signalName, payload) => {
      logger.info("Processing signal", { workflowRunId, signalName, payload });
      await engine.resume(workflowRunId as WorkflowRunId, signalName, payload);
    },
  });

  const artifactService = new ArtifactService({
    artifactStore: container.artifactStore,
  });

  const taskService = new TaskService({
    taskRepository: container.taskRepository,
  });

  app.get("/api/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  app.get("/api/health/db", async () => {
    if (!container.dbPool) {
      return { status: "ok", message: "Using in-memory storage" };
    }
    try {
      await container.dbPool.query("SELECT 1");
      return { status: "ok" };
    } catch (error) {
      logger.error("Database health check failed", undefined, error instanceof Error ? error : undefined);
      return { 
        status: "error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  });

  app.post<{ Body: ProjectIntakeRequest }>(
    "/api/projects",
    {
      preHandler: [authMiddleware, requireRole("project:create", "workflow:start")],
      schema: {
        body: {
          type: "object",
          required: ["title", "rawIdea", "businessGoal", "constraints"],
          properties: {
            title: { type: "string" },
            rawIdea: { type: "string" },
            businessGoal: { type: "string" },
            constraints: { type: "array", items: { type: "string" } },
            assumptions: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const idempotencyKey = request.headers["x-idempotency-key"] as string | undefined
          ?? deriveIdempotencyKey(organizationId as unknown as string, request.body.title);

        const cached = await container.idempotencyStore.check(idempotencyKey);
        if (cached) {
          return reply.code(200).send(cached);
        }

        const result = await projectService.createProject(organizationId, request.body);
        try {
          const instruments = getInstruments();
          instruments.workflowStartedTotal.add(1, {
            [MetricAttributes.PROJECT_ID]: result.project.id as string,
          });
        } catch { /* metrics are best-effort */ }

        // Extract request context for audit logging
        const ctx = extractRequestContext(request, organizationId);

        try {
          const previousHash = await getLastAuditHash(
            container.auditLogRepository,
            result.project.id,
            organizationId,
          );
          await writeAuditLog(
            container.auditLogRepository,
            {
              projectId: result.project.id,
              organizationId,
              action: "project.create",
              actor: ctx.actor,
              resourceType: "project",
              resourceId: result.project.id as string,
              details: { title: request.body.title },
              sessionId: ctx.sessionId,
              clientIp: ctx.clientIp,
            },
            previousHash,
          );
        } catch { /* audit logging is best-effort */ }

        await container.idempotencyStore.store(idempotencyKey, result);
        return reply.code(201).send(result);
      } catch (error) {
        logger.error(
          "Failed to create project",
          undefined,
          error instanceof Error ? error : undefined,
        );
        return reply.code(500).send({ error: "Failed to create project" });
      }
    },
  );

  app.get(
    "/api/projects",
    {
      preHandler: [authMiddleware, requireRole("project:read")],
    },
    async () => {
      return projectService.listProjects(organizationId);
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/projects/:id",
    {
      preHandler: [validateUuid("id"), authMiddleware, requireRole("project:read")],
    },
    async (request, reply) => {
      const project = await projectService.getProject(
        request.params.id as unknown as ProjectId,
        organizationId,
      );
      if (!project) return reply.code(404).send({ error: "Project not found" });
      return project;
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/workflows/:id",
    {
      preHandler: [validateUuid("id"), authMiddleware, requireRole("workflow:read")],
    },
    async (request, reply) => {
      const workflow = await workflowService.getWorkflow(
        request.params.id as unknown as WorkflowRunId,
        organizationId,
      );
      if (!workflow) return reply.code(404).send({ error: "Workflow not found" });
      return workflow;
    },
  );

  app.get<{ Params: { projectId: string } }>(
    "/api/projects/:projectId/workflow",
    {
      preHandler: [validateUuid("projectId"), authMiddleware, requireRole("workflow:read")],
    },
    async (request, reply) => {
      const workflow = await workflowService.getWorkflowByProject(
        request.params.projectId as unknown as ProjectId,
        organizationId,
      );
      if (!workflow) return reply.code(404).send({ error: "Workflow not found" });
      return workflow;
    },
  );

  app.get<{ Params: { projectId: string } }>(
    "/api/projects/:projectId/clarification-questions",
    {
      preHandler: [validateUuid("projectId"), authMiddleware, requireRole("artifact:read")],
    },
    async (request) => {
      const artifacts = await artifactService.queryArtifacts({
        projectId: request.params.projectId as unknown as ProjectId,
        organizationId,
        type: "critique-result",
        latestVersion: true,
      });
      if (artifacts.length === 0) return { questions: [] };
      const critique = artifacts[0];
      return { questions: (critique.content as any).clarificationQuestions };
    },
  );

  app.post<{ Params: { projectId: string }; Body: ClarificationResponsePayload }>(
    "/api/projects/:projectId/clarification-answers",
    {
      preHandler: [validateUuid("projectId"), authMiddleware, requireRole("workflow:resume")],
    },
    async (request, reply) => {
      const projectId = request.params.projectId;
      const signalType = request.body.signalType ?? "clarification";
      const idempotencyKey = request.headers["x-idempotency-key"] as string | undefined
        ?? deriveIdempotencyKey(projectId, signalType);

      const cached = await container.idempotencyStore.check(idempotencyKey);
      if (cached) {
        return reply.code(200).send(cached);
      }

      const workflow = await workflowService.getWorkflowByProject(
        projectId as unknown as ProjectId,
        organizationId,
      );
      if (!workflow) return reply.code(404).send({ error: "Workflow not found" });
      await workflowService.submitClarificationAnswers(
        workflow.id as unknown as string,
        request.body,
      );
      const result = { status: "submitted" };

      // Extract request context for audit logging
      const ctx = extractRequestContext(request, organizationId);

      try {
        const previousHash = await getLastAuditHash(
          container.auditLogRepository,
          projectId as unknown as ProjectId,
          organizationId,
        );
        await writeAuditLog(
          container.auditLogRepository,
          {
            projectId: projectId as unknown as ProjectId,
            organizationId,
            action: "workflow.clarification",
            actor: ctx.actor,
            resourceType: "workflow",
            resourceId: workflow.id as string,
            details: { signalType },
            sessionId: ctx.sessionId,
            clientIp: ctx.clientIp,
          },
          previousHash,
        );
      } catch { /* audit logging is best-effort */ }

      await container.idempotencyStore.store(idempotencyKey, result);
      return result;
    },
  );

  app.post<{
    Params: { projectId: string };
    Body: { decision: ApprovalDecision; reviewer: string; comments?: string };
  }>(
    "/api/projects/:projectId/approve/requirements",
    {
      preHandler: [validateUuid("projectId"), authMiddleware, requireRole("approval:submit")],
    },
    async (request, reply) => {
    const projectId = request.params.projectId;
    const reviewer = request.body.reviewer;
    const idempotencyKey = deriveIdempotencyKey(projectId, "requirements-approval", reviewer);

    const cached = await container.idempotencyStore.check(idempotencyKey);
    if (cached) {
      return reply.code(200).send(cached);
    }

    const workflow = await workflowService.getWorkflowByProject(
      projectId as unknown as ProjectId,
      organizationId,
    );
    if (!workflow) return reply.code(404).send({ error: "Workflow not found" });
    await workflowService.submitRequirementsApproval(
      workflow.id as unknown as string,
      request.body.decision,
      request.body.reviewer,
      request.body.comments,
    );
    await recordApproval(
      workflow.id,
      "requirements",
      request.body.decision,
      request.body.reviewer,
      request.body.comments,
    );
    try {
      const instruments = getInstruments();
      instruments.approvalDecisionsTotal.add(1, {
        [MetricAttributes.DECISION]: request.body.decision,
        [MetricAttributes.ARTIFACT_TYPE]: "requirements",
      });
    } catch { /* metrics are best-effort */ }

    // Extract request context for audit logging
    const ctx = extractRequestContext(request, organizationId);

    try {
      const previousHash = await getLastAuditHash(
        container.auditLogRepository,
        projectId as unknown as ProjectId,
        organizationId,
      );
      await writeAuditLog(
        container.auditLogRepository,
        {
          projectId: projectId as unknown as ProjectId,
          organizationId,
          action: "approval.requirements",
          actor: ctx.actor,
          resourceType: "approval",
          resourceId: workflow.id as string,
          details: { decision: request.body.decision, comments: request.body.comments },
          sessionId: ctx.sessionId,
          clientIp: ctx.clientIp,
        },
        previousHash,
      );
    } catch { /* audit logging is best-effort */ }

    const result = { status: "recorded" };
    await container.idempotencyStore.store(idempotencyKey, result);
    return result;
  });

  app.post<{
    Params: { projectId: string };
    Body: { decision: ApprovalDecision; reviewer: string; comments?: string };
  }>(
    "/api/projects/:projectId/approve/architecture",
    {
      preHandler: [validateUuid("projectId"), authMiddleware, requireRole("approval:submit")],
    },
    async (request, reply) => {
    const projectId = request.params.projectId;
    const reviewer = request.body.reviewer;
    const idempotencyKey = deriveIdempotencyKey(projectId, "architecture-approval", reviewer);

    const cached = await container.idempotencyStore.check(idempotencyKey);
    if (cached) {
      return reply.code(200).send(cached);
    }

    const workflow = await workflowService.getWorkflowByProject(
      projectId as unknown as ProjectId,
      organizationId,
    );
    if (!workflow) return reply.code(404).send({ error: "Workflow not found" });
    await workflowService.submitArchitectureApproval(
      workflow.id as unknown as string,
      request.body.decision,
      request.body.reviewer,
      request.body.comments,
    );
    await recordApproval(
      workflow.id,
      "architecture",
      request.body.decision,
      request.body.reviewer,
      request.body.comments,
    );
    try {
      const instruments = getInstruments();
      instruments.approvalDecisionsTotal.add(1, {
        [MetricAttributes.DECISION]: request.body.decision,
        [MetricAttributes.ARTIFACT_TYPE]: "architecture",
      });
    } catch { /* metrics are best-effort */ }

    // Extract request context for audit logging
    const ctx = extractRequestContext(request, organizationId);

    try {
      const previousHash = await getLastAuditHash(
        container.auditLogRepository,
        projectId as unknown as ProjectId,
        organizationId,
      );
      await writeAuditLog(
        container.auditLogRepository,
        {
          projectId: projectId as unknown as ProjectId,
          organizationId,
          action: "approval.architecture",
          actor: ctx.actor,
          resourceType: "approval",
          resourceId: workflow.id as string,
          details: { decision: request.body.decision, comments: request.body.comments },
          sessionId: ctx.sessionId,
          clientIp: ctx.clientIp,
        },
        previousHash,
      );
    } catch { /* audit logging is best-effort */ }

    const result = { status: "recorded" };
    await container.idempotencyStore.store(idempotencyKey, result);
    return result;
  });

  app.get<{
    Params: { projectId: string };
    Querystring: { type?: string };
  }>(
    "/api/projects/:projectId/artifacts",
    {
      preHandler: [validateUuid("projectId"), authMiddleware, requireRole("artifact:read")],
    },
    async (request) => {
    const query: ArtifactSearchQuery = {
      projectId: request.params.projectId as unknown as ProjectId,
      organizationId,
      type: request.query.type,
      latestVersion: true,
    };
    return artifactService.queryArtifacts(query);
  });

  app.get<{ Params: { projectId: string; type: string } }>(
    "/api/projects/:projectId/artifacts/:type",
    {
      preHandler: [validateUuid("projectId"), authMiddleware, requireRole("artifact:read")],
    },
    async (request, reply) => {
      const artifact = await artifactService.getLatestArtifact(
        request.params.projectId as unknown as ProjectId,
        request.params.type,
        organizationId,
      );
      if (!artifact) return reply.code(404).send({ error: "Artifact not found" });
      return artifact;
    },
  );

  app.get<{ Params: { projectId: string } }>(
    "/api/projects/:projectId/audit",
    {
      preHandler: [validateUuid("projectId"), authMiddleware, requireRole("audit:read")],
    },
    async (request, reply) => {
      const auditLogs = await container.auditLogRepository.getByProjectId(
        request.params.projectId as unknown as ProjectId,
        organizationId,
      );
      return auditLogs;
    },
  );

  app.get<{
    Querystring: {
      organizationId?: string;
      action?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    };
  }>(
    "/api/audit",
    {
      preHandler: [authMiddleware, requireRole("audit:read")],
    },
    async (request, reply) => {
      const orgId = (request.query.organizationId as OrganizationId) ?? organizationId;
      const filters = {
        action: request.query.action,
        from: request.query.from,
        to: request.query.to,
        page: request.query.page,
        pageSize: request.query.pageSize,
      };
      const auditLogs = await container.auditLogRepository.query(
        orgId,
        Object.keys(filters).length > 0 ? filters : undefined,
      );
      return reply.code(200).send({ auditLogs });
    },
  );

  app.get("/api/metrics", async (_request, reply) => {
    reply.type("text/plain");
    return "# Metrics available via Prometheus exporter on configured port\n";
  });

  app.post<{ Body: TaskIntakeRequest }>(
    "/api/tasks",
    {
      preHandler: [authMiddleware, requireRole("project:create")], // Simplified mapping for tasks
      schema: {
        body: {
          type: "object",
          required: ["projectId", "title"],
          properties: {
            projectId: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
            assigneeId: { type: "string" },
            dueDate: { type: "string", format: "date-time" },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const idempotencyKey = request.headers["x-idempotency-key"] as string | undefined
          ?? deriveIdempotencyKey(organizationId as unknown as string, request.body.title);

        const cached = await container.idempotencyStore.check(idempotencyKey);
        if (cached) {
          return reply.code(200).send(cached);
        }

        const result = await taskService.createTask({
          projectId: request.body.projectId as unknown as ProjectId,
          title: request.body.title,
          description: request.body.description,
          priority: request.body.priority as any,
          assigneeId: request.body.assigneeId as unknown as UserId,
          dueDate: request.body.dueDate as any,
        });

        // Extract request context for audit logging
        const ctx = extractRequestContext(request, organizationId);

        try {
          const previousHash = await getLastAuditHash(
            container.auditLogRepository,
            result.projectId,
            organizationId,
          );
          await writeAuditLog(
            container.auditLogRepository,
            {
              projectId: result.projectId,
              organizationId,
              action: "task.create",
              actor: ctx.actor,
              resourceType: "task",
              resourceId: result.id as string,
              details: { title: request.body.title },
              sessionId: ctx.sessionId,
              clientIp: ctx.clientIp,
            },
            previousHash,
          );
        } catch { /* audit logging is best-effort */ }

        await container.idempotencyStore.store(idempotencyKey, result);
        return reply.code(201).send(result);
      } catch (error) {
        logger.error(
          "Failed to create task",
          undefined,
          error instanceof Error ? error : undefined,
        );
        return reply.code(500).send({ error: "Failed to create task" });
      }
    },
  );

  app.get(
    "/api/tasks",
    {
      preHandler: [authMiddleware, requireRole("project:read")],
    },
    async () => {
      const allTasks: Task[] = [];
      const projects = await projectService.listProjects(organizationId);
      for (const project of projects) {
        const tasks = await taskService.listByProject(project.id as unknown as string);
        allTasks.push(...tasks);
      }
      return allTasks;
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/tasks/:id",
    {
      preHandler: [validateUuid("id"), authMiddleware, requireRole("project:read")],
    },
    async (request, reply) => {
      const task = await taskService.getTask(request.params.id as unknown as TaskId);
      if (!task) return reply.code(404).send({ error: "Task not found" });
      return task;
    },
  );

   app.put<{ Params: { id: string }; Body: { status?: string; priority?: string; assigneeId?: string | UserId } }>(
     "/api/tasks/:id",
     {
       preHandler: [validateUuid("id"), authMiddleware, requireRole("project:create")],
     },
     async (request, reply) => {
       const task = await taskService.getTask(request.params.id as unknown as TaskId);
       if (!task) return reply.code(404).send({ error: "Task not found" });

       let updated: Task = task;
       let taskChanged = false;
       const changes: Record<string, unknown> = {};

       if (request.body.status) {
         const newTask = await taskService.updateTaskStatus(updated.id, request.body.status as any);
         if (newTask) {
           updated = newTask;
           taskChanged = true;
           changes.status = request.body.status;
         }
       }
       if (request.body.priority) {
         const newTask = await taskService.updateTaskPriority(updated.id, request.body.priority as any);
         if (newTask) {
           updated = newTask;
           taskChanged = true;
           changes.priority = request.body.priority;
         }
       }
       if (request.body.assigneeId) {
         const newTask = await taskService.assignTask(updated.id, request.body.assigneeId as unknown as UserId);
         if (newTask) {
           updated = newTask;
           taskChanged = true;
           changes.assigneeId = request.body.assigneeId as string;
         }
       }

       // Extract request context for audit logging
       const ctx = extractRequestContext(request, organizationId);

       // Audit task state changes
       if (taskChanged) {
         try {
           const previousHash = await getLastAuditHash(
             container.auditLogRepository,
             updated.projectId,
             organizationId,
           );
           await writeAuditLog(
             container.auditLogRepository,
             {
               projectId: updated.projectId,
               organizationId,
               action: "task.update",
               actor: ctx.actor,
               resourceType: "task",
               resourceId: updated.id as string,
               details: { changes },
               sessionId: ctx.sessionId,
               clientIp: ctx.clientIp,
             },
             previousHash,
           );
         } catch { /* audit logging is best-effort */ }
       }

       return updated;
     },
   );

  app.get<{ Params: { projectId: string } }>(
    "/api/projects/:projectId/tasks",
    {
      preHandler: [validateUuid("projectId"), authMiddleware, requireRole("project:read")],
    },
    async (request, reply) => {
      const tasks = await taskService.listByProject(request.params.projectId);
      return tasks;
    },
  );
}