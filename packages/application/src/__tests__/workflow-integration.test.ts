import { describe, it, expect, beforeEach } from "vitest";
import {
  createFakeContainer,
  AppContainer,
  toActivityDeps,
} from "../container";
import { ProjectService, ProjectServiceDeps } from "../project-service";
import { WorkflowService, WorkflowServiceDeps } from "../workflow-service";
import { ArtifactService } from "../artifact-service";
import {
  runIntakeAgent,
  setActivityDependencies,
} from "@workflow-jk/orchestration";
import {
  ProjectIntakeRequest,
  ProjectId,
  OrganizationId,
} from "@workflow-jk/contracts";
import { FakeLLMProvider } from "@workflow-jk/adapters";

const TEST_ORG_ID = "00000000-0000-0000-0000-000000000001" as unknown as OrganizationId;

describe("Workflow Integration Tests", () => {
  let container: AppContainer;
  let projectService: ProjectService;
  let workflowService: WorkflowService;
  let artifactService: ArtifactService;

  function createTestFakeLLM(): FakeLLMProvider {
    const provider = new FakeLLMProvider();
    
    provider.setResponse("brief", {
      unstructured: JSON.stringify({
        problemStatement: "Teams need simple task tracking",
        targetUsers: "Small teams of 5-15 people",
        businessValue: "20% productivity improvement",
        keyFeatures: ["Kanban boards", "Real-time updates", "Mobile-first design"],
        constraints: ["Mobile-first", "Budget under $50k", "SSO integration"],
        assumptions: ["5-15 person teams", "Existing auth system"],
        outOfScope: ["Advanced analytics", "Time tracking"],
      }),
      structured: {},
    });

    provider.setDefaultResponse({
      unstructured: "{}",
      structured: {},
    });
    
    return provider;
  }

  const validIntakeRequest: ProjectIntakeRequest = {
    title: "Test Project",
    rawIdea: "A task tracker for small teams",
    businessGoal: "Improve productivity by 20%",
    constraints: ["Mobile-first", "Budget under $50k"],
    assumptions: ["5-15 person teams"],
  };

  beforeEach(async () => {
    container = createFakeContainer();
    
    container.llmProvider = createTestFakeLLM();
    
    setActivityDependencies(toActivityDeps(container, TEST_ORG_ID));
    
    const projectServiceDeps: ProjectServiceDeps = {
      projectRepository: container.projectRepository,
      workflowRepository: container.workflowRepository,
      clock: container.clock,
      startWorkflow: async () => "test-run-id",
    };
    
    const workflowServiceDeps: WorkflowServiceDeps = {
      workflowRepository: container.workflowRepository,
      approvalRepository: container.approvalRepository,
      clock: container.clock,
      sendSignal: async () => {},
    };
    
    projectService = new ProjectService(projectServiceDeps);
    workflowService = new WorkflowService(workflowServiceDeps);
    artifactService = new ArtifactService({ artifactStore: container.artifactStore });
  });

  describe("Project Creation", () => {
    it("creates a project with minimal input", async () => {
      const { project } = await projectService.createProject(TEST_ORG_ID, validIntakeRequest);
      
      expect(project).toBeDefined();
      expect(project.id).toBeDefined();
      expect(project.title).toBe("Test Project");
      expect(project.rawIdea).toBe(validIntakeRequest.rawIdea);
      expect(project.businessGoal).toBe(validIntakeRequest.businessGoal);
    });

    it("can retrieve project by id", async () => {
      const { project } = await projectService.createProject(TEST_ORG_ID, validIntakeRequest);
      
      const retrieved = await projectService.getProject(project.id, TEST_ORG_ID);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(project.id);
      expect(retrieved?.title).toBe("Test Project");
    });

    it("returns null for non-existent project", async () => {
      const retrieved = await projectService.getProject("non-existent" as ProjectId, TEST_ORG_ID);
      expect(retrieved).toBeNull();
    });

    it("can list all projects", async () => {
      await projectService.createProject(TEST_ORG_ID, validIntakeRequest);
      await projectService.createProject(TEST_ORG_ID, {
        ...validIntakeRequest,
        title: "Second Project",
        rawIdea: "Another project idea that is long enough",
      });
      
      const projects = await projectService.listProjects(TEST_ORG_ID);
      expect(projects.length).toBe(2);
    });
  });

  describe("Workflow Running - Intake Stage", () => {
    it("runs intake agent to create brief artifact", async () => {
      const { project } = await projectService.createProject(TEST_ORG_ID, validIntakeRequest);
      
      const brief = await runIntakeAgent(
        project.id,
        validIntakeRequest.rawIdea,
        validIntakeRequest.businessGoal,
        validIntakeRequest.constraints,
        validIntakeRequest.assumptions ?? [],
      );
      
      expect(brief).toBeDefined();
      expect(brief.content).toBeDefined();
      const content = brief.content as any;
      expect(content.problemStatement).toBeDefined();
      expect(content.targetUsers).toBeDefined();
    });
  });

  describe("Artifact Persistence", () => {
    it("artifacts can be queried by project and type", async () => {
      const { project } = await projectService.createProject(TEST_ORG_ID, validIntakeRequest);
      
      const brief = await runIntakeAgent(
        project.id,
        validIntakeRequest.rawIdea,
        validIntakeRequest.businessGoal,
        validIntakeRequest.constraints,
        validIntakeRequest.assumptions ?? [],
      );
      
      const artifacts = await artifactService.queryArtifacts({
        projectId: project.id,
        organizationId: TEST_ORG_ID,
        type: "brief",
        latestVersion: true,
      });
      
      expect(artifacts.length).toBe(1);
      expect(artifacts[0].type).toBe("brief");
      expect(artifacts[0].projectId).toBe(project.id);
    });

    it("artifacts can be queried without type filter", async () => {
      const { project } = await projectService.createProject(TEST_ORG_ID, validIntakeRequest);
      
      await runIntakeAgent(
        project.id,
        validIntakeRequest.rawIdea,
        validIntakeRequest.businessGoal,
        validIntakeRequest.constraints,
        validIntakeRequest.assumptions ?? [],
      );
      
      const artifacts = await artifactService.queryArtifacts({
        projectId: project.id,
        organizationId: TEST_ORG_ID,
      });
      
      expect(artifacts.length).toBe(1);
      expect(artifacts[0].type).toBe("brief");
    });

    it("returns empty array when no artifacts exist", async () => {
      const { project } = await projectService.createProject(TEST_ORG_ID, validIntakeRequest);
      
      const artifacts = await artifactService.queryArtifacts({
        projectId: project.id,
        organizationId: TEST_ORG_ID,
        type: "nonexistent",
      });
      
      expect(artifacts.length).toBe(0);
    });
  });

  describe("Full Workflow Integration", () => {
    it("creates project with brief - first stage of workflow", async () => {
      const { project } = await projectService.createProject(TEST_ORG_ID, validIntakeRequest);
      
      const brief = await runIntakeAgent(
        project.id,
        validIntakeRequest.rawIdea,
        validIntakeRequest.businessGoal,
        validIntakeRequest.constraints,
        validIntakeRequest.assumptions ?? [],
      );
      
      expect(brief.content).toBeDefined();
      
      const artifacts = await artifactService.queryArtifacts({
        projectId: project.id,
        organizationId: TEST_ORG_ID,
      });
      
      expect(artifacts.length).toBe(1);
      const foundProjectIds = new Set(artifacts.map((a) => a.projectId));
      expect(foundProjectIds.has(project.id)).toBe(true);
    });
  });
});