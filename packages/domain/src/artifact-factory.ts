import { v4 as uuidv4 } from "uuid";
import {
  ArtifactId, ProjectId, OrganizationId, AgentName, SchemaVersion, IsoTimestamp,
  BriefArtifact,
  CritiqueResultArtifact,
  RequirementsArtifact,
  AcceptanceCriteriaArtifact,
  OutOfScopeArtifact,
  NonFunctionalRequirementsArtifact,
  ArchitectureArtifact,
  ImplementationPlanArtifact,
  TaskGraphArtifact,
  TestStrategyArtifact,
  RepoImpactMapArtifact,
  DevExecutionResultArtifact,
  QaReportArtifact,
  AcMatrixArtifact,
  ReopenTasksArtifact,
  ReleaseDecisionArtifact,
} from "@workflow-jk/contracts";

function baseFields<
  T extends
    | "brief"
    | "critique-result"
    | "requirements"
    | "acceptance-criteria"
    | "out-of-scope"
    | "non-functional-requirements"
    | "architecture"
    | "implementation-plan"
    | "task-graph"
    | "test-strategy"
    | "repo-impact-map"
    | "dev-execution-result"
    | "qa-report"
    | "ac-matrix"
    | "reopen-tasks"
    | "release-decision",
>(
  projectId: ProjectId,
  organizationId: OrganizationId,
  type: T,
  createdBy: AgentName,
  version: number,
) {
  return {
    id: uuidv4() as unknown as ArtifactId,
    projectId,
    organizationId,
    type: type as T,
    schemaVersion: "1.0.0" as SchemaVersion,
    createdAt: new Date().toISOString() as IsoTimestamp,
    createdBy,
    version,
  };
}

export function createBriefArtifact(
  projectId: ProjectId,
  organizationId: OrganizationId,
  content: BriefArtifact["content"],
  createdBy: AgentName = "IntakeAgent",
  version = 1,
): BriefArtifact {
  const bf = baseFields(projectId, organizationId, "brief", createdBy, version);
  return {
    ...bf,
    summary: `Brief v${version}`,
    content,
  };
}

export function createCritiqueResultArtifact(
  projectId: ProjectId,
  organizationId: OrganizationId,
  content: CritiqueResultArtifact["content"],
  createdBy: AgentName = "RequirementsCriticAgent",
  version = 1,
): CritiqueResultArtifact {
  const bf = baseFields(projectId, organizationId, "critique-result", createdBy, version);
  return {
    ...bf,
    summary: `Critique result v${version}`,
    content,
  };
}

export function createRequirementsArtifact(
  projectId: ProjectId,
  organizationId: OrganizationId,
  content: RequirementsArtifact["content"],
  createdBy: AgentName = "RequirementsCriticAgent",
  version = 1,
): RequirementsArtifact {
  const bf = baseFields(projectId, organizationId, "requirements", createdBy, version);
  return {
    ...bf,
    summary: `Requirements v${version}`,
    content,
  };
}

export function createAcceptanceCriteriaArtifact(
  projectId: ProjectId,
  organizationId: OrganizationId,
  content: AcceptanceCriteriaArtifact["content"],
  createdBy: AgentName = "RequirementsCriticAgent",
  version = 1,
): AcceptanceCriteriaArtifact {
  const bf = baseFields(projectId, organizationId, "acceptance-criteria", createdBy, version);
  return {
    ...bf,
    summary: `Acceptance criteria v${version}`,
    content,
  };
}

export function createOutOfScopeArtifact(
  projectId: ProjectId,
  organizationId: OrganizationId,
  content: OutOfScopeArtifact["content"],
  createdBy: AgentName = "RequirementsCriticAgent",
  version = 1,
): OutOfScopeArtifact {
  const bf = baseFields(projectId, organizationId, "out-of-scope", createdBy, version);
  return {
    ...bf,
    summary: `Out of scope v${version}`,
    content,
  };
}

export function createNonFunctionalRequirementsArtifact(
  projectId: ProjectId,
  organizationId: OrganizationId,
  content: NonFunctionalRequirementsArtifact["content"],
  createdBy: AgentName = "RequirementsCriticAgent",
  version = 1,
): NonFunctionalRequirementsArtifact {
  const bf = baseFields(projectId, organizationId, "non-functional-requirements", createdBy, version);
  return {
    ...bf,
    summary: `NFR v${version}`,
    content,
  };
}

export function createArchitectureArtifact(
  projectId: ProjectId,
  organizationId: OrganizationId,
  content: ArchitectureArtifact["content"],
  createdBy: AgentName = "ArchitectAgent",
  version = 1,
): ArchitectureArtifact {
  const bf = baseFields(projectId, organizationId, "architecture", createdBy, version);
  return {
    ...bf,
    summary: `Architecture v${version}`,
    content,
  };
}

export function createImplementationPlanArtifact(
  projectId: ProjectId,
  organizationId: OrganizationId,
  content: ImplementationPlanArtifact["content"],
  createdBy: AgentName = "ArchitectAgent",
  version = 1,
): ImplementationPlanArtifact {
  const bf = baseFields(projectId, organizationId, "implementation-plan", createdBy, version);
  return {
    ...bf,
    summary: `Implementation plan v${version}`,
    content,
  };
}

export function createTaskGraphArtifact(
  projectId: ProjectId,
  organizationId: OrganizationId,
  content: TaskGraphArtifact["content"],
  createdBy: AgentName = "ArchitectAgent",
  version = 1,
): TaskGraphArtifact {
  const bf = baseFields(projectId, organizationId, "task-graph", createdBy, version);
  return {
    ...bf,
    summary: `Task graph v${version}`,
    content,
  };
}

export function createTestStrategyArtifact(
  projectId: ProjectId,
  organizationId: OrganizationId,
  content: TestStrategyArtifact["content"],
  createdBy: AgentName = "ArchitectAgent",
  version = 1,
): TestStrategyArtifact {
  const bf = baseFields(projectId, organizationId, "test-strategy", createdBy, version);
  return {
    ...bf,
    summary: `Test strategy v${version}`,
    content,
  };
}

export function createRepoImpactMapArtifact(
  projectId: ProjectId,
  organizationId: OrganizationId,
  content: RepoImpactMapArtifact["content"],
  createdBy: AgentName = "ArchitectAgent",
  version = 1,
): RepoImpactMapArtifact {
  const bf = baseFields(projectId, organizationId, "repo-impact-map", createdBy, version);
  return {
    ...bf,
    summary: `Repo impact map v${version}`,
    content,
  };
}

export function createDevExecutionResultArtifact(
  projectId: ProjectId,
  organizationId: OrganizationId,
  content: DevExecutionResultArtifact["content"],
  createdBy: AgentName = "DevAgent",
  version = 1,
): DevExecutionResultArtifact {
  const bf = baseFields(projectId, organizationId, "dev-execution-result", createdBy, version);
  return {
    ...bf,
    summary: `Dev result for task ${content.taskId} v${version}`,
    content,
  };
}

export function createQaReportArtifact(
  projectId: ProjectId,
  organizationId: OrganizationId,
  content: QaReportArtifact["content"],
  createdBy: AgentName = "QaAgent",
  version = 1,
): QaReportArtifact {
  const bf = baseFields(projectId, organizationId, "qa-report", createdBy, version);
  return {
    ...bf,
    summary: `QA report v${version}`,
    content,
  };
}

export function createAcMatrixArtifact(
  projectId: ProjectId,
  organizationId: OrganizationId,
  content: AcMatrixArtifact["content"],
  createdBy: AgentName = "QaAgent",
  version = 1,
): AcMatrixArtifact {
  const bf = baseFields(projectId, organizationId, "ac-matrix", createdBy, version);
  return {
    ...bf,
    summary: `AC matrix v${version}`,
    content,
  };
}

export function createReopenTasksArtifact(
  projectId: ProjectId,
  organizationId: OrganizationId,
  content: ReopenTasksArtifact["content"],
  createdBy: AgentName = "QaAgent",
  version = 1,
): ReopenTasksArtifact {
  const bf = baseFields(projectId, organizationId, "reopen-tasks", createdBy, version);
  return {
    ...bf,
    summary: `Reopen tasks v${version}`,
    content,
  };
}

export function createReleaseDecisionArtifact(
  projectId: ProjectId,
  organizationId: OrganizationId,
  content: ReleaseDecisionArtifact["content"],
  createdBy: AgentName = "QaAgent",
  version = 1,
): ReleaseDecisionArtifact {
  const bf = baseFields(projectId, organizationId, "release-decision", createdBy, version);
  return {
    ...bf,
    summary: `Release decision v${version}`,
    content,
  };
}