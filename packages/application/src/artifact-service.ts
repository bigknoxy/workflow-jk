import {
  ArtifactUnion,
  ArtifactId,
  ArtifactSearchQuery,
  ProjectId,
  OrganizationId,
} from "@workflow-jk/contracts";
import type { ArtifactStore } from "@workflow-jk/adapters";
import { withSpan } from "@workflow-jk/observability";

const TEST_ORG_ID = "00000000-0000-0000-0000-000000000000" as unknown as OrganizationId;

export interface ArtifactServiceDeps {
  artifactStore: ArtifactStore;
}

export class ArtifactService {
  constructor(private deps: ArtifactServiceDeps) {}

  async getArtifact(id: ArtifactId, organizationId: OrganizationId = TEST_ORG_ID): Promise<ArtifactUnion | null> {
    return this.deps.artifactStore.getById(id, organizationId);
  }

  async queryArtifacts(query: ArtifactSearchQuery): Promise<ArtifactUnion[]> {
    return withSpan("service.queryArtifacts", async (span) => {
      span.setAttribute("project.id", query.projectId as string);
      return this.deps.artifactStore.query(query);
    });
  }

  async getLatestArtifact(
    projectId: ProjectId,
    type: string,
    organizationId: OrganizationId = TEST_ORG_ID,
  ): Promise<ArtifactUnion | null> {
    return this.deps.artifactStore.getLatestByType(projectId, type, organizationId);
  }
}