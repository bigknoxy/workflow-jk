import { describe, it, expect } from "vitest";
import {
  OrganizationId,
  ProjectIntakeRequest,
  Project,
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
  ArtifactUnion,
  WorkflowRun,
  ApprovalPayload,
  ApprovalRecord,
  ClarificationResponsePayload,
  TaskPack,
  AgentInvocation,
  AgentResult,
} from "../index";

describe("ProjectIntakeRequest", () => {
  it("accepts valid input", () => {
    const result = ProjectIntakeRequest.safeParse({
      title: "Test",
      rawIdea: "A test idea that is long enough to pass validation",
      businessGoal: "Make money",
      constraints: ["Must be fast"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = ProjectIntakeRequest.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects rawIdea too short", () => {
    const result = ProjectIntakeRequest.safeParse({
      title: "Test",
      rawIdea: "short",
      businessGoal: "Goal",
      constraints: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional assumptions", () => {
    const result = ProjectIntakeRequest.safeParse({
      title: "Test",
      rawIdea: "A test idea that is long enough to pass validation",
      businessGoal: "Goal",
      constraints: [],
      assumptions: ["We assume X"],
    });
    expect(result.success).toBe(true);
  });
});

describe("BriefArtifact", () => {
  const validBrief = {
    id: "00000000-0000-0000-0000-000000000001",
    organizationId: "00000000-0000-0000-0000-000000000000" as OrganizationId,
    projectId: "00000000-0000-0000-0000-000000000002",
    schemaVersion: "1.0.0",
    createdAt: "2025-01-01T00:00:00Z",
    createdBy: "IntakeAgent" as const,
    summary: "Test brief",
    type: "brief" as const,
    version: 1,
    content: {
      problemStatement: "Test problem",
      targetUsers: "Test users",
      businessValue: "Test value",
      keyFeatures: ["Feature 1"],
      constraints: ["Constraint 1"],
      assumptions: ["Assumption 1"],
      outOfScope: ["Item 1"],
    },
  };

  it("accepts valid brief", () => {
    expect(BriefArtifact.safeParse(validBrief).success).toBe(true);
  });

  it("rejects missing content fields", () => {
    const result = BriefArtifact.safeParse({ ...validBrief, content: {} });
    expect(result.success).toBe(false);
  });

  it("rejects wrong type", () => {
    const result = BriefArtifact.safeParse({ ...validBrief, type: "wrong" as any });
    expect(result.success).toBe(false);
  });
});

describe("CritiqueResultArtifact", () => {
  const validCritique = {
    id: "00000000-0000-0000-0000-000000000001",
    organizationId: "00000000-0000-0000-0000-000000000000" as OrganizationId,
    projectId: "00000000-0000-0000-0000-000000000002",
    schemaVersion: "1.0.0",
    createdAt: "2025-01-01T00:00:00Z",
    createdBy: "RequirementsCriticAgent" as const,
    summary: "Test critique",
    type: "critique-result" as const,
    version: 1,
    content: {
      clarificationQuestions: [{ id: "q1", question: "Q1?", category: "ambiguity" as const }],
      identifiedRisks: [{ id: "r1", description: "Risk 1", severity: "low" as const }],
      missingConstraints: ["Missing 1"],
      assumptions: [{ id: "a1", assumption: "A1", confidence: "high" as const }],
      draftAcceptanceCriteria: [{ id: "ac1", criterion: "AC1", category: "functional" as const }],
    },
  };

  it("accepts valid critique", () => {
    expect(CritiqueResultArtifact.safeParse(validCritique).success).toBe(true);
  });

  it("rejects invalid severity", () => {
    const result = CritiqueResultArtifact.safeParse({
      ...validCritique,
      content: { ...validCritique.content, identifiedRisks: [{ id: "r1", description: "R", severity: "invalid" as any }] },
    });
    expect(result.success).toBe(false);
  });
});

describe("ArtifactUnion discriminated union", () => {
  it("discriminates by type field", () => {
    const brief = {
      id: "00000000-0000-0000-0000-000000000001",
      organizationId: "00000000-0000-0000-0000-000000000000" as OrganizationId,
      projectId: "00000000-0000-0000-0000-000000000002",
      schemaVersion: "1.0.0",
      createdAt: "2025-01-01T00:00:00Z",
      createdBy: "IntakeAgent" as const,
      summary: "Test",
      type: "brief" as const,
      version: 1,
      content: {
        problemStatement: "P",
        targetUsers: "U",
        businessValue: "V",
        keyFeatures: ["F"],
        constraints: ["C"],
        assumptions: ["A"],
        outOfScope: ["O"],
      },
    };
    expect(ArtifactUnion.safeParse(brief).success).toBe(true);
  });

  it("rejects unknown type", () => {
    const invalid = { type: "unknown", id: "x" };
    expect(ArtifactUnion.safeParse(invalid as any).success).toBe(false);
  });
});

describe("ApprovalPayload", () => {
  it("accepts valid approval", () => {
    const result = ApprovalPayload.safeParse({
      workflowRunId: "00000000-0000-0000-0000-000000000001",
      artifactType: "requirements",
      decision: "approved",
      reviewer: "test-user",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid decision", () => {
    const result = ApprovalPayload.safeParse({
      workflowRunId: "00000000-0000-0000-0000-000000000001",
      artifactType: "requirements",
      decision: "maybe",
      reviewer: "test-user",
    });
    expect(result.success).toBe(false);
  });
});

describe("ClarificationResponsePayload", () => {
  it("accepts valid answers", () => {
    const result = ClarificationResponsePayload.safeParse({
      answers: [{ questionId: "q1", answer: "My answer" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty answer", () => {
    const result = ClarificationResponsePayload.safeParse({
      answers: [{ questionId: "q1", answer: "" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("Remaining artifact schemas", () => {
  const base = {
    id: "00000000-0000-0000-0000-000000000001",
    organizationId: "00000000-0000-0000-0000-000000000000" as OrganizationId,
    projectId: "00000000-0000-0000-0000-000000000002",
    schemaVersion: "1.0.0",
    createdAt: "2025-01-01T00:00:00Z",
    createdBy: "IntakeAgent" as const,
    summary: "Test",
    version: 1,
  };

  it("validates QaReportArtifact", () => {
    const qa = {
      ...base,
      type: "qa-report" as const,
      createdBy: "QaAgent" as const,
      content: {
        overallStatus: "pass" as const,
        acResults: [{ acId: "ac1", status: "pass" as const, evidence: "E" }],
        defects: [],
        summary: "OK",
      },
    };
    expect(QaReportArtifact.safeParse(qa).success).toBe(true);
  });

  it("validates ReleaseDecisionArtifact", () => {
    const rd = {
      ...base,
      type: "release-decision" as const,
      createdBy: "QaAgent" as const,
      content: {
        decision: "release" as const,
        rationale: "All passed",
        qaSummary: "OK",
        outstandingRisks: [],
      },
    };
    expect(ReleaseDecisionArtifact.safeParse(rd).success).toBe(true);
  });

  it("validates ArchitectureArtifact", () => {
    const arch = {
      ...base,
      type: "architecture" as const,
      createdBy: "ArchitectAgent" as const,
      content: {
        overview: "Test arch",
        decisions: [{ id: "d1", decision: "D", rationale: "R", alternatives: ["A"] }],
        components: [{ name: "C", responsibility: "R", dependencies: [] }],
        dataFlow: "F",
      },
    };
    expect(ArchitectureArtifact.safeParse(arch).success).toBe(true);
  });

  it("validates DevExecutionResultArtifact", () => {
    const dev = {
      ...base,
      type: "dev-execution-result" as const,
      createdBy: "DevAgent" as const,
      content: {
        taskId: "t1",
        changes: [{ path: "/src", changeType: "create" as const, description: "D", diff: "d" }],
        summary: "S",
        testResults: [{ testName: "t", status: "pass" as const }],
      },
    };
    expect(DevExecutionResultArtifact.safeParse(dev).success).toBe(true);
  });

  it("validates RequirementsArtifact", () => {
    const req = {
      ...base,
      type: "requirements" as const,
      createdBy: "RequirementsCriticAgent" as const,
      content: {
        requirements: [
          {
            id: "r1",
            title: "Test requirement",
            description: "Description",
            priority: "must" as const,
            category: "functional",
          },
        ],
      },
    };
    expect(RequirementsArtifact.safeParse(req).success).toBe(true);
  });

it("validates AcceptanceCriteriaArtifact", () => {
    const ac = {
      ...base,
      type: "acceptance-criteria" as const,
      createdBy: "RequirementsCriticAgent" as const,
      content: {
        criteria: [
          {
            id: "ac1",
            requirementId: "r1",
            given: "User is logged in",
            when: "They click submit",
            then: "Data is saved",
          },
        ],
      },
    };
    expect(AcceptanceCriteriaArtifact.safeParse(ac).success).toBe(true);
  });

  it("validates OutOfScopeArtifact", () => {
    const oos = {
      ...base,
      type: "out-of-scope" as const,
      createdBy: "RequirementsCriticAgent" as const,
      content: {
        items: [{ description: "Analytics", reason: "Out of budget" }],
      },
    };
    expect(OutOfScopeArtifact.safeParse(oos).success).toBe(true);
  });

  it("validates NonFunctionalRequirementsArtifact", () => {
    const nfr = {
      ...base,
      type: "non-functional-requirements" as const,
      createdBy: "RequirementsCriticAgent" as const,
      content: {
        requirements: [
          {
            id: "nfr1",
            category: "performance" as const,
            description: "Response time under 200ms",
            metric: "p99 latency",
            target: "200ms",
          },
        ],
      },
    };
    expect(NonFunctionalRequirementsArtifact.safeParse(nfr).success).toBe(true);
  });

  it("validates ImplementationPlanArtifact", () => {
    const ip = {
      ...base,
      type: "implementation-plan" as const,
      createdBy: "ArchitectAgent" as const,
      content: {
        phases: [
          {
            name: "Phase 1",
            tasks: ["task1", "task2"],
            estimatedEffort: "3 days",
          },
        ],
      },
    };
    expect(ImplementationPlanArtifact.safeParse(ip).success).toBe(true);
  });

  it("validates TaskGraphArtifact", () => {
    const tg = {
      ...base,
      type: "task-graph" as const,
      createdBy: "ArchitectAgent" as const,
      content: {
        tasks: [
          {
            id: "t1",
            title: "Setup",
            description: "Project setup",
            dependencies: [],
            estimatedEffort: "1 day",
            phase: "setup",
          },
        ],
      },
    };
    expect(TaskGraphArtifact.safeParse(tg).success).toBe(true);
  });

  it("validates TestStrategyArtifact", () => {
    const ts = {
      ...base,
      type: "test-strategy" as const,
      createdBy: "ArchitectAgent" as const,
      content: {
        approach: "Test pyramid",
        levels: [
          {
            level: "unit",
            description: "Unit tests",
            coverage: "80%",
          },
        ],
        environments: ["dev", "staging"],
      },
    };
    expect(TestStrategyArtifact.safeParse(ts).success).toBe(true);
  });

  it("validates RepoImpactMapArtifact", () => {
    const rim = {
      ...base,
      type: "repo-impact-map" as const,
      createdBy: "ArchitectAgent" as const,
      content: {
        impacts: [
          {
            path: "/src/index.ts",
            changeType: "create" as const,
            description: "New file",
          },
        ],
      },
    };
    expect(RepoImpactMapArtifact.safeParse(rim).success).toBe(true);
  });

  it("validates AcMatrixArtifact", () => {
    const acm = {
      ...base,
      type: "ac-matrix" as const,
      createdBy: "QaAgent" as const,
      content: {
        criteria: [
          {
            acId: "ac1",
            requirementId: "r1",
            description: "Test AC",
            status: "pass" as const,
            evidence: "Verified",
          },
        ],
      },
    };
    expect(AcMatrixArtifact.safeParse(acm).success).toBe(true);
  });

  it("validates ReopenTasksArtifact", () => {
    const rt = {
      ...base,
      type: "reopen-tasks" as const,
      createdBy: "QaAgent" as const,
      content: {
        taskIds: ["t1"],
        reasons: [
          {
            taskId: "t1",
            reason: "Test failed",
            failedAcIds: ["ac1"],
          },
        ],
      },
    };
    expect(ReopenTasksArtifact.safeParse(rt).success).toBe(true);
  });
});

describe("WorkflowRun", () => {
  it("validates workflow run", () => {
    const result = WorkflowRun.safeParse({
      id: "00000000-0000-0000-0000-000000000001",
      organizationId: "00000000-0000-0000-0000-000000000000" as OrganizationId,
      projectId: "00000000-0000-0000-0000-000000000002",
      state: "Draft",
      currentStage: "intake",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("validates completed workflow", () => {
    const result = WorkflowRun.safeParse({
      id: "00000000-0000-0000-0000-000000000001",
      organizationId: "00000000-0000-0000-0000-000000000000" as OrganizationId,
      projectId: "00000000-0000-0000-0000-000000000002",
      state: "Completed",
      currentStage: "release",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
      completedAt: "2025-01-02T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("ApprovalRecord", () => {
  it("validates approval record", () => {
    const result = ApprovalRecord.safeParse({
      id: "00000000-0000-0000-0000-000000000001",
      organizationId: "00000000-0000-0000-0000-000000000000" as OrganizationId,
      workflowRunId: "00000000-0000-0000-0000-000000000002",
      artifactType: "requirements",
      decision: "approved",
      reviewer: "test-user",
      createdAt: "2025-01-01T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("TaskPack", () => {
  it("validates task pack", () => {
    const result = TaskPack.safeParse({
      taskId: "t1",
      title: "Setup",
      description: "Project setup",
      acceptanceCriteria: [
        {
          id: "ac1",
          given: "User",
          when: "click",
          then: "saved",
        },
      ],
      context: "setup",
    });
    expect(result.success).toBe(true);
  });
});

describe("AgentInvocation", () => {
  it("validates agent invocation", () => {
    const result = AgentInvocation.safeParse({
      agentName: "IntakeAgent",
      input: {},
      correlationId: "00000000-0000-0000-0000-000000000001",
    });
    expect(result.success).toBe(true);
  });
});

describe("AgentResult", () => {
  it("validates successful agent result", () => {
    const result = AgentResult.safeParse({
      agentName: "IntakeAgent",
      success: true,
      output: {},
      durationMs: 100,
    });
    expect(result.success).toBe(true);
  });

  it("validates failed agent result with error", () => {
    const result = AgentResult.safeParse({
      agentName: "IntakeAgent",
      success: false,
      output: null,
      durationMs: 100,
      error: "Something went wrong",
    });
    expect(result.success).toBe(true);
  });
});