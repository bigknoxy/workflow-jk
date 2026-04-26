import { describe, it, expect } from "vitest";
import { BriefArtifact, ArchitectureArtifact } from "../artifacts.js";
import { OrganizationId } from "../auth.js";

const BASE_ARTIFACT = {
  id: "00000000-0000-0000-0000-000000000001" as any,
  organizationId: "00000000-0000-0000-0000-000000000000" as OrganizationId,
  projectId: "00000000-0000-0000-0000-000000000002" as any,
  schemaVersion: "1.0.0",
  createdAt: "2025-01-01T00:00:00Z",
  createdBy: "IntakeAgent" as any,
  summary: "Test artifact for M2-6 fields",
};

describe("Artifact M2-6 governance fields", () => {
  it("accepts promptVersion as optional string", () => {
    const result = BriefArtifact.safeParse({
      ...BASE_ARTIFACT,
      type: "brief",
      version: 1,
      content: {
        problemStatement: "p",
        targetUsers: "u",
        businessValue: "v",
        keyFeatures: ["f"],
        constraints: ["c"],
        assumptions: ["a"],
        outOfScope: ["o"],
      },
      promptVersion: "1.0.0",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.promptVersion).toBe("1.0.0");
    }
  });

  it("accepts artifact without promptVersion", () => {
    const result = BriefArtifact.safeParse({
      ...BASE_ARTIFACT,
      type: "brief",
      version: 1,
      content: {
        problemStatement: "p",
        targetUsers: "u",
        businessValue: "v",
        keyFeatures: ["f"],
        constraints: ["c"],
        assumptions: ["a"],
        outOfScope: ["o"],
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.promptVersion).toBeUndefined();
    }
  });

  it("accepts parentArtifactIds as optional array of ArtifactIds", () => {
    const result = ArchitectureArtifact.safeParse({
      ...BASE_ARTIFACT,
      type: "architecture",
      version: 1,
      content: {
        overview: "o",
        decisions: [],
        components: [],
        dataFlow: "d",
      },
      parentArtifactIds: [
        "00000000-0000-0000-0000-000000000010" as any,
        "00000000-0000-0000-0000-000000000020" as any,
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentArtifactIds).toHaveLength(2);
    }
  });

  it("accepts artifact without parentArtifactIds", () => {
    const result = ArchitectureArtifact.safeParse({
      ...BASE_ARTIFACT,
      type: "architecture",
      version: 1,
      content: {
        overview: "o",
        decisions: [],
        components: [],
        dataFlow: "d",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parentArtifactIds).toBeUndefined();
    }
  });

  it("accepts artifact with both governance fields", () => {
    const result = BriefArtifact.safeParse({
      ...BASE_ARTIFACT,
      type: "brief",
      version: 1,
      content: {
        problemStatement: "p",
        targetUsers: "u",
        businessValue: "v",
        keyFeatures: ["f"],
        constraints: ["c"],
        assumptions: ["a"],
        outOfScope: ["o"],
      },
      promptVersion: "1.0.0",
      parentArtifactIds: ["00000000-0000-0000-0000-000000000010" as any],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.promptVersion).toBe("1.0.0");
      expect(result.data.parentArtifactIds).toHaveLength(1);
    }
  });
});