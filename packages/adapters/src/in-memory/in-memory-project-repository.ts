import { ProjectRepository } from "../ports";
import { Project, ProjectId, OrganizationId } from "@workflow-jk/contracts";

export class InMemoryProjectRepository implements ProjectRepository {
  private projects: Map<string, Project> = new Map();

  async save(project: Project): Promise<Project> {
    this.projects.set(project.id as unknown as string, project);
    return project;
  }

  async getById(id: ProjectId, organizationId: OrganizationId): Promise<Project | null> {
    const project = this.projects.get(id as unknown as string);
    if (!project) return null;
    if (project.organizationId !== organizationId) return null;
    return project;
  }

  async list(organizationId: OrganizationId): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
      (p) => p.organizationId === organizationId
    );
  }

  clear(): void {
    this.projects.clear();
  }
}
