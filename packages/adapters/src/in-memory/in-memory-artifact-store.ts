import { ArtifactStore } from "../ports";
import { ArtifactUnion, ArtifactSearchQuery, ArtifactId, ProjectId, OrganizationId } from "@workflow-jk/contracts";

export class InMemoryArtifactStore implements ArtifactStore {
  private artifacts: Map<string, ArtifactUnion> = new Map();

  async save(artifact: ArtifactUnion): Promise<ArtifactUnion> {
    this.artifacts.set(artifact.id as unknown as string, artifact);
    return artifact;
  }

  async getById(id: ArtifactId, organizationId: OrganizationId): Promise<ArtifactUnion | null> {
    const artifact = this.artifacts.get(id as unknown as string);
    if (!artifact) return null;
    if (artifact.organizationId !== organizationId) return null;
    return artifact;
  }

  async query(query: ArtifactSearchQuery): Promise<ArtifactUnion[]> {
    let results = Array.from(this.artifacts.values());
    if (query.organizationId) {
      results = results.filter((a) => a.organizationId === query.organizationId);
    }
    if (query.projectId) {
      results = results.filter((a) => a.projectId === query.projectId);
    }
    if (query.type) {
      results = results.filter((a) => a.type === query.type);
    }
    if (query.latestVersion) {
      const byType = new Map<string, ArtifactUnion>();
      for (const a of results) {
        const key = `${a.projectId}-${a.type}`;
        const existing = byType.get(key);
        if (!existing || a.version > existing.version) {
          byType.set(key, a);
        }
      }
      results = Array.from(byType.values());
    }
    return results;
  }

  async getLatestByType(projectId: ProjectId, type: string, organizationId: OrganizationId): Promise<ArtifactUnion | null> {
    const artifacts = await this.query({ projectId, type, organizationId, latestVersion: true });
    return artifacts[0] ?? null;
  }

  clear(): void {
    this.artifacts.clear();
  }

  size(): number {
    return this.artifacts.size;
  }
}