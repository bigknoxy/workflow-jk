import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ProjectId,
  OrganizationId,
} from "@workflow-jk/contracts";
import {
  InMemoryArtifactStore,
  InMemoryWorkflowRepository,
  InMemoryApprovalRepository,
  FakeLLMProvider,
  FakeTestRunner,
  FakeBrowserRunner,
  FakeRepoProvider,
  FakeNotificationProvider,
  SystemClock,
} from "@workflow-jk/adapters";
import { InlineWorkflowEngine } from "../inline-engine";
import { VAGUE_PROJECT_INPUT } from "@workflow-jk/testing";

const testOrgId = "00000000-0000-0000-0000-000000000000" as unknown as OrganizationId;

const { mockRunIntakeAgent, mockRunRequirementsCriticAgent, mockFinalizeRequirements, mockRunArchitectAgent, mockRunDevAgent, mockRecordApproval, mockNotifyAwaitingInput, mockPersistWorkflowState } = vi.hoisted(() => ({
  mockRunIntakeAgent: vi.fn(),
  mockRunRequirementsCriticAgent: vi.fn(),
  mockFinalizeRequirements: vi.fn(),
  mockRunArchitectAgent: vi.fn(),
  mockRunDevAgent: vi.fn(),
  mockRecordApproval: vi.fn(),
  mockNotifyAwaitingInput: vi.fn(),
  mockPersistWorkflowState: vi.fn(),
}));

vi.mock("../activities", () => ({
  runIntakeAgent: mockRunIntakeAgent,
  runRequirementsCriticAgent: mockRunRequirementsCriticAgent,
  finalizeRequirements: mockFinalizeRequirements,
  runArchitectAgent: mockRunArchitectAgent,
  runDevAgent: mockRunDevAgent,
  recordApproval: mockRecordApproval,
  notifyAwaitingInput: mockNotifyAwaitingInput,
  persistWorkflowState: mockPersistWorkflowState,
  setActivityDependencies: vi.fn(),
  getActivityDependencies: vi.fn(),
  createIntakeAgent: vi.fn(),
  createRequirementsCriticAgent: vi.fn(),
  createArchitectAgent: vi.fn(),
  createDevAgent: vi.fn(),
  createQaAgent: vi.fn(),
}));

function makeBrief(projectId: string) {
  return {
    id: "art-brief-1" as any,
    projectId: projectId as any,
    workflowRunId: "wfr-1" as any,
    type: "brief" as const,
    version: 1,
    content: {
      problemStatement: "Teams need task tracking",
      targetUsers: "Small teams",
      businessValue: "20% productivity gain",
      keyFeatures: ["Kanban boards", "Real-time updates"],
      constraints: ["Mobile-first"],
      assumptions: ["5-15 person teams"],
      outOfScope: ["Analytics"],
    },
    organizationId: testOrgId,
    createdAt: new Date().toISOString(),
    createdBy: "IntakeAgent" as any,
    summary: "Task tracker brief",
    schemaVersion: "1.0.0" as any,
  };
}

function makeCritique(projectId: string) {
  return {
    id: "art-critique-1" as any,
    projectId: projectId as any,
    workflowRunId: "wfr-1" as any,
    type: "critique-result" as const,
    version: 1,
    content: {
      clarificationQuestions: [
        { id: "q1", question: "What SSO provider?", category: "missing_constraint" as const },
      ],
      identifiedRisks: [
        { id: "r1", description: "Sync complexity", severity: "medium" as const, mitigation: "Use CRDTs" },
      ],
      missingConstraints: ["SSO provider"],
      assumptions: [
        { id: "a1", assumption: "Team uses SSO", confidence: "medium" as const },
      ],
      draftAcceptanceCriteria: [
        { id: "ac1", criterion: "Users can create tasks", category: "functional" },
      ],
    },
    organizationId: testOrgId,
    createdAt: new Date().toISOString(),
    createdBy: "RequirementsCriticAgent" as any,
    summary: "Critique with 1 question",
    schemaVersion: "1.0.0" as any,
  };
}

describe("InlineWorkflowEngine", () => {
  let engine: InlineWorkflowEngine;
  let artifactStore: InMemoryArtifactStore;
  let workflowRepository: InMemoryWorkflowRepository;
  let approvalRepository: InMemoryApprovalRepository;

  const testProjectId = "00000000-0000-0000-0000-000000000001" as unknown as ProjectId;

  beforeEach(() => {
    vi.clearAllMocks();

    artifactStore = new InMemoryArtifactStore();
    workflowRepository = new InMemoryWorkflowRepository();
    approvalRepository = new InMemoryApprovalRepository();

    const fakeLLM = new FakeLLMProvider();
    const deps = {
      llmProvider: fakeLLM,
      artifactStore,
      projectRepository: {
        save: vi.fn(),
        getById: vi.fn().mockResolvedValue(null),
        list: vi.fn().mockResolvedValue([]),
      },
      workflowRepository,
      approvalRepository,
      repoProvider: new FakeRepoProvider(),
      testRunner: new FakeTestRunner(),
      browserRunner: new FakeBrowserRunner(),
      notificationProvider: new FakeNotificationProvider(),
      clock: new SystemClock(),
      organizationId: testOrgId,
    };

    engine = new InlineWorkflowEngine(deps, workflowRepository, approvalRepository);
  });

  describe("start()", () => {
    it("starts workflow and stops at AwaitingClarification", async () => {
      const brief = makeBrief(testProjectId);
      const critique = makeCritique(testProjectId);

      mockRunIntakeAgent.mockResolvedValue(brief as any);
      mockRunRequirementsCriticAgent.mockResolvedValue(critique as any);
      mockPersistWorkflowState.mockResolvedValue();

      const runId = await engine.start(testProjectId, testOrgId, VAGUE_PROJECT_INPUT);

      expect(runId).toBeDefined();
      expect(mockRunIntakeAgent).toHaveBeenCalled();
      expect(mockRunRequirementsCriticAgent).toHaveBeenCalled();

      const context = engine.getContext(runId);
      expect(context).toBeDefined();
      expect(context?.projectId).toBe(testProjectId);
      expect(context?.brief).toBeDefined();
      expect(context?.critique).toBeDefined();
    });

    it("stores brief and critique in context", async () => {
      const brief = makeBrief(testProjectId);
      const critique = makeCritique(testProjectId);

      mockRunIntakeAgent.mockResolvedValue(brief as any);
      mockRunRequirementsCriticAgent.mockResolvedValue(critique as any);
      mockPersistWorkflowState.mockResolvedValue();

      const runId = await engine.start(testProjectId, testOrgId, VAGUE_PROJECT_INPUT);

      const context = engine.getContext(runId);
      expect(context?.brief).toEqual(brief);
      expect(context?.critique).toEqual(critique);
    });
  });

  describe("getContext()", () => {
    it("returns context after start", async () => {
      const brief = makeBrief(testProjectId);
      const critique = makeCritique(testProjectId);

      mockRunIntakeAgent.mockResolvedValue(brief as any);
      mockRunRequirementsCriticAgent.mockResolvedValue(critique as any);
      mockPersistWorkflowState.mockResolvedValue();

      const runId = await engine.start(testProjectId, testOrgId, VAGUE_PROJECT_INPUT);

      const context = engine.getContext(runId);
      expect(context).toBeDefined();
      expect(context?.projectId).toBe(testProjectId);
    });
  });

  describe("resume() - clarification answers", () => {
    it("advances from AwaitingClarification to RequirementsReadyForApproval", async () => {
      const brief = makeBrief(testProjectId);
      const critique = makeCritique(testProjectId);

      mockRunIntakeAgent.mockResolvedValue(brief as any);
      mockRunRequirementsCriticAgent.mockResolvedValue(critique as any);
      mockPersistWorkflowState.mockResolvedValue();

      const mockRequirements = {
        requirements: { id: "art-req-1", type: "requirements" },
        acceptanceCriteria: { id: "art-ac-1", type: "acceptance-criteria" },
        outOfScope: { id: "art-oos-1", type: "out-of-scope" },
        nonFunctionalRequirements: { id: "art-nfr-1", type: "non-functional-requirements" },
      };
      mockFinalizeRequirements.mockResolvedValue(mockRequirements as any);

      const runId = await engine.start(testProjectId, testOrgId, VAGUE_PROJECT_INPUT);

      const result = await engine.resume(runId, "clarification-answers", {
        answers: [{ questionId: "q1", answer: "We use Okta" }],
      });

      expect(result).toBeDefined();
      expect(mockFinalizeRequirements).toHaveBeenCalled();
    });
  });

  describe("resume() - requirements approval", () => {
    it("advances from RequirementsReadyForApproval after approval", async () => {
      const brief = makeBrief(testProjectId);
      const critique = makeCritique(testProjectId);

      mockRunIntakeAgent.mockResolvedValue(brief as any);
      mockRunRequirementsCriticAgent.mockResolvedValue(critique as any);
      mockPersistWorkflowState.mockResolvedValue();
      mockRecordApproval.mockResolvedValue();

      const mockRequirements = {
        requirements: { id: "art-req-1", type: "requirements", content: { requirements: [] } },
        acceptanceCriteria: { id: "art-ac-1", type: "acceptance-criteria", content: { criteria: [] } },
        outOfScope: { id: "art-oos-1", type: "out-of-scope", content: { items: [] } },
        nonFunctionalRequirements: { id: "art-nfr-1", type: "non-functional-requirements", content: { requirements: [] } },
      };
      mockFinalizeRequirements.mockResolvedValue(mockRequirements as any);

      const runId = await engine.start(testProjectId, testOrgId, VAGUE_PROJECT_INPUT);

      await engine.resume(runId, "clarification-answers", {
        answers: [{ questionId: "q1", answer: "We use Okta" }],
      });

      const mockArch = {
        architecture: { id: "arch-1", type: "architecture" },
        implementationPlan: { id: "impl-1", type: "implementation-plan" },
        taskGraph: { id: "tg-1", type: "task-graph" },
        testStrategy: { id: "ts-1", type: "test-strategy" },
        repoImpactMap: { id: "rim-1", type: "repo-impact-map" },
      };
      mockRunArchitectAgent.mockResolvedValue(mockArch as any);

      const result = await engine.resume(runId, "requirements-approval", {
        decision: "approved",
        reviewer: "test@test.com",
      });

      expect(mockRunArchitectAgent).toHaveBeenCalled();
    });
  });
});