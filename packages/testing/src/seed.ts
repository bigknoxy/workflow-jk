import { ProjectIntakeRequest, WorkflowRunId, ProjectId, OrganizationId } from "@workflow-jk/contracts";
import { createContainer, createFakeContainer } from "@workflow-jk/application";
import { createProject } from "@workflow-jk/domain";
import { setActivityDependencies } from "@workflow-jk/orchestration";
import {
  createBriefArtifact,
  createCritiqueResultArtifact,
  createRequirementsArtifact,
  createAcceptanceCriteriaArtifact,
  createArchitectureArtifact,
  createImplementationPlanArtifact,
  createTaskGraphArtifact,
  createTestStrategyArtifact,
  createRepoImpactMapArtifact,
  createDevExecutionResultArtifact,
  createQaReportArtifact,
  createAcMatrixArtifact,
  createReleaseDecisionArtifact,
} from "@workflow-jk/domain";
import {
  FIXTURE_PROJECT_ID,
  FIXTURE_ORGANIZATION_ID,
  VAGUE_PROJECT_INPUT,
  SAMPLE_BRIEF_CONTENT,
  SAMPLE_CRITIQUE_CONTENT,
  SAMPLE_REQUIREMENTS_CONTENT,
  SAMPLE_ACCEPTANCE_CRITERIA_CONTENT,
  SAMPLE_ARCHITECTURE_CONTENT,
  SAMPLE_TASK_GRAPH_CONTENT,
  SAMPLE_TEST_STRATEGY_CONTENT,
  SAMPLE_QA_REPORT_PASS_CONTENT,
  SAMPLE_AC_MATRIX_PASS_CONTENT,
  SAMPLE_RELEASE_DECISION_CONTENT,
} from "./fixtures";

export async function seedDemoData(useFake: boolean = true): Promise<{
  projectId: ProjectId;
  projectInput: ProjectIntakeRequest;
}> {
  const container = useFake ? createFakeContainer() : createContainer({} as any);
  const projectId = FIXTURE_PROJECT_ID;
  const projectInput = VAGUE_PROJECT_INPUT;

  const project = await container.projectRepository.save(createProject(FIXTURE_ORGANIZATION_ID, projectInput));

  const brief = await container.artifactStore.save(
    createBriefArtifact(project.id, FIXTURE_ORGANIZATION_ID, SAMPLE_BRIEF_CONTENT),
  );

  const critique = await container.artifactStore.save(
    createCritiqueResultArtifact(project.id, FIXTURE_ORGANIZATION_ID, SAMPLE_CRITIQUE_CONTENT),
  );

  const requirements = await container.artifactStore.save(
    createRequirementsArtifact(project.id, FIXTURE_ORGANIZATION_ID, SAMPLE_REQUIREMENTS_CONTENT),
  );

  const acceptanceCriteria = await container.artifactStore.save(
    createAcceptanceCriteriaArtifact(project.id, FIXTURE_ORGANIZATION_ID, SAMPLE_ACCEPTANCE_CRITERIA_CONTENT),
  );

  const architecture = await container.artifactStore.save(
    createArchitectureArtifact(project.id, FIXTURE_ORGANIZATION_ID, SAMPLE_ARCHITECTURE_CONTENT),
  );

  const taskGraph = await container.artifactStore.save(
    createTaskGraphArtifact(project.id, FIXTURE_ORGANIZATION_ID, SAMPLE_TASK_GRAPH_CONTENT),
  );

  const testStrategy = await container.artifactStore.save(
    createTestStrategyArtifact(project.id, FIXTURE_ORGANIZATION_ID, SAMPLE_TEST_STRATEGY_CONTENT),
  );

  const qaReport = await container.artifactStore.save(
    createQaReportArtifact(project.id, FIXTURE_ORGANIZATION_ID, SAMPLE_QA_REPORT_PASS_CONTENT),
  );

  const acMatrix = await container.artifactStore.save(
    createAcMatrixArtifact(project.id, FIXTURE_ORGANIZATION_ID, SAMPLE_AC_MATRIX_PASS_CONTENT),
  );

  const releaseDecision = await container.artifactStore.save(
    createReleaseDecisionArtifact(project.id, FIXTURE_ORGANIZATION_ID, SAMPLE_RELEASE_DECISION_CONTENT),
  );

  return { projectId: project.id, projectInput };
}

// CLI entry point
if (typeof require !== "undefined" && require.main === module) {
  seedDemoData(true).then(({ projectId }) => {
    console.log(`Seeded demo data. Project ID: ${projectId}`);
    process.exit(0);
  }).catch((err) => {
    console.error("Failed to seed demo data:", err);
    process.exit(1);
  });
}