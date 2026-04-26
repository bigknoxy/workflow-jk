import { z } from "zod";
import { ArtifactId, ProjectId, SchemaVersion, IsoTimestamp, AgentName } from "./common";
import { OrganizationId } from "./auth";

const ArtifactBase = z.object({
  id: ArtifactId,
  projectId: ProjectId,
  organizationId: OrganizationId,
  schemaVersion: SchemaVersion,
  promptVersion: z.string().optional(),
  parentArtifactIds: z.array(ArtifactId).optional(),
  createdAt: IsoTimestamp,
  createdBy: AgentName,
  summary: z.string().max(500),
});

export const BriefArtifact = ArtifactBase.extend({
  type: z.literal("brief"),
  version: z.number().int().positive(),
  content: z.object({
    problemStatement: z.string(),
    targetUsers: z.string(),
    businessValue: z.string(),
    keyFeatures: z.array(z.string()),
    constraints: z.array(z.string()),
    assumptions: z.array(z.string()),
    outOfScope: z.array(z.string()),
  }),
});
export type BriefArtifact = z.infer<typeof BriefArtifact>;

export const CritiqueResultArtifact = ArtifactBase.extend({
  type: z.literal("critique-result"),
  version: z.number().int().positive(),
  content: z.object({
    clarificationQuestions: z.array(z.object({
      id: z.string(),
      question: z.string(),
      context: z.string().optional(),
      category: z.enum(["ambiguity", "missing_constraint", "assumption", "risk"]),
    })),
    identifiedRisks: z.array(z.object({
      id: z.string(),
      description: z.string(),
      severity: z.enum(["low", "medium", "high"]),
      mitigation: z.string().optional(),
    })),
    missingConstraints: z.array(z.string()),
    assumptions: z.array(z.object({
      id: z.string(),
      assumption: z.string(),
      confidence: z.enum(["low", "medium", "high"]),
    })),
    draftAcceptanceCriteria: z.array(z.object({
      id: z.string(),
      criterion: z.string(),
      category: z.string(),
    })),
  }),
});
export type CritiqueResultArtifact = z.infer<typeof CritiqueResultArtifact>;

export const ClarificationResponsePayload = z.object({
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.string().min(1),
  })),
  signalType: z.string().optional(),
});
export type ClarificationResponsePayload = z.infer<typeof ClarificationResponsePayload>;

export const RequirementsArtifact = ArtifactBase.extend({
  type: z.literal("requirements"),
  version: z.number().int().positive(),
  content: z.object({
    requirements: z.array(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      priority: z.enum(["must", "should", "could", "wont"]),
      category: z.string(),
    })),
  }),
});
export type RequirementsArtifact = z.infer<typeof RequirementsArtifact>;

export const AcceptanceCriteriaArtifact = ArtifactBase.extend({
  type: z.literal("acceptance-criteria"),
  version: z.number().int().positive(),
  content: z.object({
    criteria: z.array(z.object({
      id: z.string(),
      requirementId: z.string(),
      given: z.string(),
      when: z.string(),
      then: z.string(),
    })),
  }),
});
export type AcceptanceCriteriaArtifact = z.infer<typeof AcceptanceCriteriaArtifact>;

export const OutOfScopeArtifact = ArtifactBase.extend({
  type: z.literal("out-of-scope"),
  version: z.number().int().positive(),
  content: z.object({
    items: z.array(z.object({
      description: z.string(),
      reason: z.string(),
    })),
  }),
});
export type OutOfScopeArtifact = z.infer<typeof OutOfScopeArtifact>;

export const NonFunctionalRequirementsArtifact = ArtifactBase.extend({
  type: z.literal("non-functional-requirements"),
  version: z.number().int().positive(),
  content: z.object({
    requirements: z.array(z.object({
      id: z.string(),
      category: z.enum(["performance", "security", "scalability", "reliability", "accessibility", "observability"]),
      description: z.string(),
      metric: z.string().optional(),
      target: z.string().optional(),
    })),
  }),
});
export type NonFunctionalRequirementsArtifact = z.infer<typeof NonFunctionalRequirementsArtifact>;

export const ArchitectureArtifact = ArtifactBase.extend({
  type: z.literal("architecture"),
  version: z.number().int().positive(),
  content: z.object({
    overview: z.string(),
    decisions: z.array(z.object({
      id: z.string(),
      decision: z.string(),
      rationale: z.string(),
      alternatives: z.array(z.string()),
    })),
    components: z.array(z.object({
      name: z.string(),
      responsibility: z.string(),
      dependencies: z.array(z.string()),
    })),
    dataFlow: z.string(),
  }),
});
export type ArchitectureArtifact = z.infer<typeof ArchitectureArtifact>;

export const ImplementationPlanArtifact = ArtifactBase.extend({
  type: z.literal("implementation-plan"),
  version: z.number().int().positive(),
  content: z.object({
    phases: z.array(z.object({
      name: z.string(),
      tasks: z.array(z.string()),
      estimatedEffort: z.string(),
    })),
  }),
});
export type ImplementationPlanArtifact = z.infer<typeof ImplementationPlanArtifact>;

export const TaskGraphArtifact = ArtifactBase.extend({
  type: z.literal("task-graph"),
  version: z.number().int().positive(),
  content: z.object({
    tasks: z.array(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      dependencies: z.array(z.string()),
      estimatedEffort: z.string(),
      phase: z.string(),
    })),
  }),
});
export type TaskGraphArtifact = z.infer<typeof TaskGraphArtifact>;

export const TestStrategyArtifact = ArtifactBase.extend({
  type: z.literal("test-strategy"),
  version: z.number().int().positive(),
  content: z.object({
    approach: z.string(),
    levels: z.array(z.object({
      level: z.string(),
      description: z.string(),
      coverage: z.string(),
    })),
    environments: z.array(z.string()),
  }),
});
export type TestStrategyArtifact = z.infer<typeof TestStrategyArtifact>;

export const RepoImpactMapArtifact = ArtifactBase.extend({
  type: z.literal("repo-impact-map"),
  version: z.number().int().positive(),
  content: z.object({
    impacts: z.array(z.object({
      path: z.string(),
      changeType: z.enum(["create", "modify", "delete"]),
      description: z.string(),
    })),
  }),
});
export type RepoImpactMapArtifact = z.infer<typeof RepoImpactMapArtifact>;

export const TaskPack = z.object({
  taskId: z.string(),
  title: z.string(),
  description: z.string(),
  acceptanceCriteria: z.array(z.object({
    id: z.string(),
    given: z.string(),
    when: z.string(),
    then: z.string(),
  })),
  context: z.string(),
});
export type TaskPack = z.infer<typeof TaskPack>;

export const DevExecutionResultArtifact = ArtifactBase.extend({
  type: z.literal("dev-execution-result"),
  version: z.number().int().positive(),
  content: z.object({
    taskId: z.string(),
    changes: z.array(z.object({
      path: z.string(),
      changeType: z.enum(["create", "modify", "delete"]),
      description: z.string(),
      diff: z.string(),
    })),
    summary: z.string(),
    testResults: z.array(z.object({
      testName: z.string(),
      status: z.enum(["pass", "fail", "skip"]),
      message: z.string().optional(),
    })),
  }),
});
export type DevExecutionResultArtifact = z.infer<typeof DevExecutionResultArtifact>;

export const QaReportArtifact = ArtifactBase.extend({
  type: z.literal("qa-report"),
  version: z.number().int().positive(),
  content: z.object({
    overallStatus: z.enum(["pass", "fail", "partial"]),
    acResults: z.array(z.object({
      acId: z.string(),
      status: z.enum(["pass", "fail", "not_tested"]),
      evidence: z.string(),
    })),
    defects: z.array(z.object({
      id: z.string(),
      description: z.string(),
      severity: z.enum(["blocker", "critical", "major", "minor"]),
      relatedAcId: z.string().optional(),
    })),
    summary: z.string(),
  }),
});
export type QaReportArtifact = z.infer<typeof QaReportArtifact>;

export const AcMatrixArtifact = ArtifactBase.extend({
  type: z.literal("ac-matrix"),
  version: z.number().int().positive(),
  content: z.object({
    criteria: z.array(z.object({
      acId: z.string(),
      requirementId: z.string(),
      description: z.string(),
      status: z.enum(["pass", "fail", "not_tested", "not_applicable"]),
      evidence: z.string(),
    })),
  }),
});
export type AcMatrixArtifact = z.infer<typeof AcMatrixArtifact>;

export const ReopenTasksArtifact = ArtifactBase.extend({
  type: z.literal("reopen-tasks"),
  version: z.number().int().positive(),
  content: z.object({
    taskIds: z.array(z.string()),
    reasons: z.array(z.object({
      taskId: z.string(),
      reason: z.string(),
      failedAcIds: z.array(z.string()),
    })),
  }),
});
export type ReopenTasksArtifact = z.infer<typeof ReopenTasksArtifact>;

export const ReleaseDecisionArtifact = ArtifactBase.extend({
  type: z.literal("release-decision"),
  version: z.number().int().positive(),
  content: z.object({
    decision: z.enum(["release", "hold"]),
    rationale: z.string(),
    qaSummary: z.string(),
    outstandingRisks: z.array(z.string()),
  }),
});
export type ReleaseDecisionArtifact = z.infer<typeof ReleaseDecisionArtifact>;

export const ArtifactUnion = z.discriminatedUnion("type", [
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
]);
export type ArtifactUnion = z.infer<typeof ArtifactUnion>;

export const ArtifactSearchQuery = z.object({
  projectId: ProjectId,
  organizationId: OrganizationId,
  type: z.string().optional(),
  latestVersion: z.boolean().optional(),
});
export type ArtifactSearchQuery = z.infer<typeof ArtifactSearchQuery>;