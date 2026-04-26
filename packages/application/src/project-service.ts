import {
  Project,
  ProjectId,
  OrganizationId,
  ProjectIntakeRequest,
  WorkflowRunId,
  WorkflowState,
  IsoTimestamp,
} from "@workflow-jk/contracts";
import type {
  ProjectRepository,
  WorkflowRepository,
  Clock,
} from "@workflow-jk/adapters";
import { createProject, createWorkflowRun } from "@workflow-jk/domain";
import { withSpan } from "@workflow-jk/observability";
import { TEMPORAL_TASK_QUEUE } from "@workflow-jk/config";

const TEST_ORG_ID = "00000000-0000-0000-0000-000000000000" as unknown as OrganizationId;

export interface ProjectServiceDeps {
  projectRepository: ProjectRepository;
  workflowRepository: WorkflowRepository;
  clock: Clock;
  startWorkflow: (projectId: ProjectId, organizationId: OrganizationId, input: ProjectIntakeRequest) => Promise<string>;
}

export class ProjectService {
  constructor(private deps: ProjectServiceDeps) {}

  async createProject(
    organizationId: OrganizationId,
    input: ProjectIntakeRequest,
  ): Promise<{ project: Project; workflowRunId: string }> {
    return withSpan("service.createProject", async (span) => {
      const project = createProject(organizationId, input);
      const savedProject = await this.deps.projectRepository.save(project);
      span.setAttribute("project.id", project.id as string);

      const workflowRun = createWorkflowRun(project.id, organizationId);
      const savedWorkflow = await this.deps.workflowRepository.save(workflowRun);

      const workflowId = await this.deps.startWorkflow(project.id, organizationId, input);

      return { project: savedProject, workflowRunId: workflowId };
    });
  }

  async getProject(id: ProjectId, organizationId: OrganizationId = TEST_ORG_ID): Promise<Project | null> {
    return this.deps.projectRepository.getById(id, organizationId);
  }

  async listProjects(organizationId: OrganizationId = TEST_ORG_ID): Promise<Project[]> {
    return this.deps.projectRepository.list(organizationId);
  }
}