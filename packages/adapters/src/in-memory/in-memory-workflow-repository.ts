import { WorkflowRepository } from "../ports";
import { WorkflowRun, WorkflowRunId, WorkflowState, ProjectId, OrganizationId } from "@workflow-jk/contracts";

export class InMemoryWorkflowRepository implements WorkflowRepository {
  private workflows: Map<string, WorkflowRun> = new Map();

  async save(workflowRun: WorkflowRun): Promise<WorkflowRun> {
    this.workflows.set(workflowRun.id as unknown as string, workflowRun);
    return workflowRun;
  }

  async getById(id: WorkflowRunId, organizationId: OrganizationId): Promise<WorkflowRun | null> {
    const workflow = this.workflows.get(id as unknown as string);
    if (!workflow) return null;
    if (workflow.organizationId !== organizationId) return null;
    return workflow;
  }

  async getByProjectId(projectId: ProjectId, organizationId: OrganizationId): Promise<WorkflowRun | null> {
    for (const workflow of this.workflows.values()) {
      if (workflow.projectId === projectId && workflow.organizationId === organizationId) {
        return workflow;
      }
    }
    return null;
  }

  async updateState(id: WorkflowRunId, organizationId: OrganizationId, state: WorkflowState, currentStage: string): Promise<WorkflowRun> {
    const workflow = this.workflows.get(id as unknown as string);
    if (!workflow) throw new Error(`Workflow not found: ${id}`);
    if (workflow.organizationId !== organizationId) throw new Error(`Workflow not found: ${id}`);
    const updated = {
      ...workflow,
      state,
      currentStage,
      updatedAt: new Date().toISOString() as any,
    };
    this.workflows.set(id as unknown as string, updated);
    return updated;
  }

  clear(): void {
    this.workflows.clear();
  }
}