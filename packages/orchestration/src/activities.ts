/**
 * Temporal Activities - All side effects that the workflow performs go through activities.
 * This ensures deterministic replay since all side effects are recorded by Temporal.
 */
import {
  ProjectId,
  OrganizationId,
  WorkflowRunId,
  ArtifactId,
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
  ArtifactUnion,
  WorkflowState,
  ClarificationResponsePayload,
  ApprovalDecision,
} from "@workflow-jk/contracts";
import type {
  LLMProvider,
  ArtifactStore,
  ProjectRepository,
  WorkflowRepository,
  ApprovalRepository,
  RepoProvider,
  TestRunner,
  BrowserRunner,
  NotificationProvider,
  Clock,
  IdempotencyStore,
} from "@workflow-jk/adapters";
import {
  createIntakeAgent,
  createRequirementsCriticAgent,
  createArchitectAgent,
  createDevAgent,
  createQaAgent,
} from "@workflow-jk/agents";
import {
  createApprovalRecord as createApprovalRecordFn,
  createBriefArtifact as makeBriefArtifact,
  createCritiqueResultArtifact as makeCritiqueResultArtifact,
  createRequirementsArtifact as makeRequirementsArtifact,
  createAcceptanceCriteriaArtifact as makeAcceptanceCriteriaArtifact,
  createOutOfScopeArtifact as makeOutOfScopeArtifact,
  createNonFunctionalRequirementsArtifact as makeNonFunctionalRequirementsArtifact,
  createArchitectureArtifact as makeArchitectureArtifact,
  createImplementationPlanArtifact as makeImplementationPlanArtifact,
  createTaskGraphArtifact as makeTaskGraphArtifact,
  createTestStrategyArtifact as makeTestStrategyArtifact,
  createRepoImpactMapArtifact as makeRepoImpactMapArtifact,
  createDevExecutionResultArtifact as makeDevExecutionResultArtifact,
  createQaReportArtifact as makeQaReportArtifact,
  createAcMatrixArtifact as makeAcMatrixArtifact,
  createReleaseDecisionArtifact as makeReleaseDecisionArtifact,
} from "@workflow-jk/domain";
import { withSpan } from "@workflow-jk/observability";

/**
 * Activity dependencies - set by the worker at startup.
 * These are injected into the activities context.
 */
export interface ActivityDependencies {
  organizationId: OrganizationId;
  llmProvider: LLMProvider;
  artifactStore: ArtifactStore;
  projectRepository: ProjectRepository;
  workflowRepository: WorkflowRepository;
  approvalRepository: ApprovalRepository;
  repoProvider: RepoProvider;
  testRunner: TestRunner;
  browserRunner: BrowserRunner;
  notificationProvider: NotificationProvider;
  clock: Clock;
  idempotencyStore: IdempotencyStore;
}

let deps: ActivityDependencies | undefined;

export function setActivityDependencies(d: ActivityDependencies): void {
  deps = d;
}

export function getActivityDependencies(): ActivityDependencies {
  if (!deps) {
    throw new Error("Activity dependencies not set. Did you call setActivityDependencies()?");
  }
  return deps;
}

// Helper to safely get properties from unknown output
function getProperty<T>(obj: unknown, key: string, fallback: T): T {
  if (typeof obj !== "object" || obj === null) return fallback;
  const value = (obj as Record<string, unknown>)[key];
  if (value === undefined) return fallback;
  return value as T;
}

// ============================================================================
// Intake Agent Activity
// ============================================================================

/**
 * Run the IntakeAgent to generate a project brief from raw requirements.
 */
export async function runIntakeAgent(
  projectId: ProjectId,
  rawIdea: string,
  businessGoal: string,
  constraints: string[],
  assumptions: string[],
): Promise<BriefArtifact> {
  return withSpan("activity.runIntakeAgent", async (span) => {
    span.setAttribute("project.id", projectId as string);
    const d = getActivityDependencies();
    const agent = createIntakeAgent(d.llmProvider);
    const result = await agent({ rawIdea, businessGoal, constraints, assumptions });

    if (!result.success || !result.output) {
      throw new Error(`IntakeAgent failed: ${result.error ?? "unknown error"}`);
    }

    // Map agent output to brief content - handle unknown output type
    const output = result.output as Record<string, unknown>;
    const briefContent: BriefArtifact["content"] = {
      problemStatement: getProperty(output, "problemStatement", rawIdea),
      targetUsers: getProperty(output, "targetUsers", "General users"),
      businessValue: getProperty(output, "businessValue", businessGoal),
      keyFeatures: getProperty(output, "keyFeatures", getProperty(output, "features", [] as string[])),
      constraints: getProperty(output, "constraints", constraints),
      assumptions: getProperty(output, "assumptions", assumptions),
      outOfScope: getProperty(output, "outOfScope", [] as string[]),
    };

    const brief = makeBriefArtifact(projectId, d.organizationId, briefContent, "IntakeAgent");
    return d.artifactStore.save(brief) as Promise<BriefArtifact>;
  });
}

// ============================================================================
// Requirements Critic Agent Activity
// ============================================================================

/**
 * Run the RequirementsCriticAgent to analyze and critique the brief.
 */
export async function runRequirementsCriticAgent(
  projectId: ProjectId,
  briefContent: BriefArtifact["content"],
): Promise<CritiqueResultArtifact> {
  return withSpan("activity.runRequirementsCriticAgent", async (span) => {
    span.setAttribute("project.id", projectId as string);
    const d = getActivityDependencies();
    const agent = createRequirementsCriticAgent(d.llmProvider);
    const result = await agent({ brief: briefContent });

    if (!result.success || !result.output) {
      throw new Error(`RequirementsCriticAgent failed: ${result.error ?? "unknown error"}`);
    }

    const output = result.output as Record<string, unknown>;
    const critiqueContent: CritiqueResultArtifact["content"] = {
      clarificationQuestions: getProperty(output, "clarificationQuestions", [] as CritiqueResultArtifact["content"]["clarificationQuestions"]),
      identifiedRisks: getProperty(output, "identifiedRisks", [] as CritiqueResultArtifact["content"]["identifiedRisks"]),
      missingConstraints: getProperty(output, "missingConstraints", [] as string[]),
      assumptions: getProperty(output, "assumptions", [] as CritiqueResultArtifact["content"]["assumptions"]),
      draftAcceptanceCriteria: getProperty(output, "draftAcceptanceCriteria", [] as CritiqueResultArtifact["content"]["draftAcceptanceCriteria"]),
    };

    const artifact = makeCritiqueResultArtifact(projectId, d.organizationId, critiqueContent, "RequirementsCriticAgent");
    return d.artifactStore.save(artifact) as Promise<CritiqueResultArtifact>;
  });
}

// ============================================================================
// Requirements Finalization Activity
// ============================================================================

/**
 * Finalize requirements by processing the brief, critique, and clarification answers.
 */
export function deriveAcceptanceCriterion(
  draftAc: { id: string; criterion: string; category: string },
  requirementId: string,
  answers: ClarificationResponsePayload,
): { id: string; requirementId: string; given: string; when: string; then: string } {
  const criterion = draftAc.criterion;
  const category = draftAc.category;

  let given = "Given the system is operational";
  let when = `When the user performs the action for "${criterion}"`;
  let then = criterion;

  if (category === "performance") {
    given = "Given the system is under normal load";
    when = `When the ${criterion.toLowerCase()} operation is performed`;
    then = `The response meets the performance target for "${criterion}"`;
  } else if (category === "security") {
    given = "Given an authenticated user";
    when = `When accessing "${criterion.toLowerCase()}"`;
    then = `Security requirements for "${criterion}" are enforced`;
  } else if (category === "functional") {
    const matchAnswer = answers.answers.find((a) =>
      criterion.toLowerCase().includes(a.questionId.toLowerCase())
    );
    if (matchAnswer) {
      given = `Given ${matchAnswer.answer}`;
    }
    when = `When the user interacts with the "${criterion.toLowerCase()}" feature`;
    then = `The "${criterion.toLowerCase()}" behaves as specified`;
  } else if (category === "accessibility") {
    given = "Given a user with assistive technology";
    when = `When navigating the "${criterion.toLowerCase()}" interface`;
    then = `Accessibility standards are met for "${criterion}"`;
  }

  return { id: draftAc.id, requirementId, given, when, then };
}

export function deriveNonFunctionalRequirements(
  briefContent: BriefArtifact["content"],
  critiqueContent: CritiqueResultArtifact["content"],
): NonFunctionalRequirementsArtifact["content"]["requirements"] {
  const nfrs: NonFunctionalRequirementsArtifact["content"]["requirements"] = [];
  let nfrId = 1;

  const addNfr = (
    category: NonFunctionalRequirementsArtifact["content"]["requirements"][0]["category"],
    description: string,
    metric: string,
    target: string,
  ) => {
    nfrs.push({ id: `nfr-${nfrId++}`, category, description, metric, target });
  };

  const constraintsLower = briefContent.constraints.map((c) => c.toLowerCase());
  if (constraintsLower.some((c) => /mobile|responsive|mobile-first/.test(c))) {
    addNfr("performance", "Mobile page loads under 3 seconds on 3G", "P95 page load", "< 3s on 3G");
  }
  if (constraintsLower.some((c) => /real-?time|websocket|live/.test(c))) {
    addNfr("performance", "Real-time updates propagate within 2 seconds", "Update propagation", "< 2s");
  }
  if (constraintsLower.some((c) => /scal|concurrent|users|10k|1000/.test(c))) {
    addNfr("scalability", "System supports concurrent user target", "Concurrent users", "Per constraint");
  }
  if (constraintsLower.some((c) => /encrypt|security|secure|auth|sso|oauth/.test(c))) {
    addNfr("security", "All data encrypted at rest and in transit", "Encryption coverage", "100%");
  }
  if (constraintsLower.some((c) => /complian|gdpr|soc|hipaa|pci/.test(c))) {
    addNfr("security", "Maintain regulatory compliance", "Compliance audit", "Pass");
  }
  if (constraintsLower.some((c) => /uptime|sla|99\.|availab/.test(c))) {
    addNfr("reliability", "Meet availability SLA target", "Uptime", "Per SLA");
  }
  if (constraintsLower.some((c) => /off?line|sync/.test(c))) {
    addNfr("reliability", "Offline mode with automatic sync on reconnect", "Sync success rate", "> 99%");
  }
  if (constraintsLower.some((c) => /access|wcag|a11y|screen.reader/.test(c))) {
    addNfr("accessibility", "Meet WCAG accessibility standard", "WCAG compliance", "AA minimum");
  }
  if (constraintsLower.some((c) => /observ|monitor|log|trace/.test(c))) {
    addNfr("observability", "Full observability stack with tracing", "Trace coverage", "100% of requests");
  }

  for (const risk of critiqueContent.identifiedRisks) {
    if (risk.severity === "high") {
      const desc = `Mitigate risk: ${risk.description}`;
      addNfr("reliability", desc, "Risk mitigation", risk.mitigation ?? "Documented");
    }
  }

  if (nfrs.length === 0) {
    addNfr("performance", "Response times under 500ms", "P95 latency", "< 500ms");
    addNfr("security", "All data encrypted at rest and in transit", "Encryption coverage", "100%");
  }

  return nfrs;
}

export async function finalizeRequirements(
  projectId: ProjectId,
  briefContent: BriefArtifact["content"],
  critiqueContent: CritiqueResultArtifact["content"],
  clarificationAnswers: ClarificationResponsePayload,
): Promise<{
  requirements: RequirementsArtifact;
  acceptanceCriteria: AcceptanceCriteriaArtifact;
  outOfScope: OutOfScopeArtifact;
  nonFunctionalRequirements: NonFunctionalRequirementsArtifact;
}> {
    return withSpan("activity.finalizeRequirements", async (span) => {
      span.setAttribute("project.id", projectId as string);
      const d = getActivityDependencies();

      const requirements = makeRequirementsArtifact(projectId, d.organizationId, {
        requirements: briefContent.keyFeatures.map((f, i) => ({
          id: `req-${i + 1}`,
          title: f,
          description: `Feature: ${f}`,
          priority: "should" as const,
          category: "functional",
        })),
      });

      const acceptanceCriteria = makeAcceptanceCriteriaArtifact(projectId, d.organizationId, {
        criteria: critiqueContent.draftAcceptanceCriteria.map((ac, idx) => {
          const reqId = `req-${Math.min(idx + 1, briefContent.keyFeatures.length)}`;
          return deriveAcceptanceCriterion(ac, reqId, clarificationAnswers);
        }),
      });

      const outOfScope = makeOutOfScopeArtifact(projectId, d.organizationId, {
        items: briefContent.outOfScope.map((item) => ({
          description: item,
          reason: "Out of initial scope",
        })),
      });

      const nonFunctionalRequirements = makeNonFunctionalRequirementsArtifact(projectId, d.organizationId, {
        requirements: deriveNonFunctionalRequirements(briefContent, critiqueContent),
      });

    // Save all artifacts in parallel
    const [savedReqs, savedAc, savedOos, savedNfr] = await Promise.all([
      d.artifactStore.save(requirements),
      d.artifactStore.save(acceptanceCriteria),
      d.artifactStore.save(outOfScope),
      d.artifactStore.save(nonFunctionalRequirements),
    ]);

    return {
      requirements: savedReqs as RequirementsArtifact,
      acceptanceCriteria: savedAc as AcceptanceCriteriaArtifact,
      outOfScope: savedOos as OutOfScopeArtifact,
      nonFunctionalRequirements: savedNfr as NonFunctionalRequirementsArtifact,
    };
  });
}

// ============================================================================
// Architect Agent Activity
// ============================================================================

type ArchitectOutput = {
  architecture?: ArchitectureArtifact["content"];
  implementationPlan?: ImplementationPlanArtifact["content"];
  taskGraph?: TaskGraphArtifact["content"];
  testStrategy?: TestStrategyArtifact["content"];
  repoImpactMap?: RepoImpactMapArtifact["content"];
};

/**
 * Run the ArchitectAgent to generate architecture and implementation plan.
 */
export async function runArchitectAgent(
  projectId: ProjectId,
  requirements: RequirementsArtifact["content"],
  acceptanceCriteria: AcceptanceCriteriaArtifact["content"],
  nonFunctionalRequirements: NonFunctionalRequirementsArtifact["content"],
  outOfScope: OutOfScopeArtifact["content"],
): Promise<{
  architecture: ArchitectureArtifact;
  implementationPlan: ImplementationPlanArtifact;
  taskGraph: TaskGraphArtifact;
  testStrategy: TestStrategyArtifact;
  repoImpactMap: RepoImpactMapArtifact;
}> {
  return withSpan("activity.runArchitectAgent", async (span) => {
    span.setAttribute("project.id", projectId as string);
    const d = getActivityDependencies();
    const agent = createArchitectAgent(d.llmProvider);

    const result = await agent({
      requirements,
      acceptanceCriteria,
      nonFunctionalRequirements,
      outOfScope,
    });

    if (!result.success || !result.output) {
      throw new Error(`ArchitectAgent failed: ${result.error ?? "unknown error"}`);
    }

    const output = result.output as unknown as ArchitectOutput;

    // Create all architecture artifacts with default values if agent didn't provide them
    const architecture = makeArchitectureArtifact(projectId, d.organizationId, output.architecture ?? {
      overview: "Architecture overview",
      decisions: [],
      components: [],
      dataFlow: "Data flow description",
    });
    const implementationPlan = makeImplementationPlanArtifact(projectId, d.organizationId, output.implementationPlan ?? {
      phases: [],
    });
    const taskGraph = makeTaskGraphArtifact(projectId, d.organizationId, output.taskGraph ?? {
      tasks: [],
    });
    const testStrategy = makeTestStrategyArtifact(projectId, d.organizationId, output.testStrategy ?? {
      approach: "Testing approach",
      levels: [],
      environments: [],
    });
    const repoImpactMap = makeRepoImpactMapArtifact(projectId, d.organizationId, output.repoImpactMap ?? {
      impacts: [],
    });

    // Save all in parallel
    const [savedArch, savedImpl, savedTask, savedTest, savedRepo] = await Promise.all([
      d.artifactStore.save(architecture),
      d.artifactStore.save(implementationPlan),
      d.artifactStore.save(taskGraph),
      d.artifactStore.save(testStrategy),
      d.artifactStore.save(repoImpactMap),
    ]);

    return {
      architecture: savedArch as ArchitectureArtifact,
      implementationPlan: savedImpl as ImplementationPlanArtifact,
      taskGraph: savedTask as TaskGraphArtifact,
      testStrategy: savedTest as TestStrategyArtifact,
      repoImpactMap: savedRepo as RepoImpactMapArtifact,
    };
  });
}

// ============================================================================
// Dev Agent Activity
// ============================================================================

type DevOutput = {
  summary?: string;
  changes?: DevExecutionResultArtifact["content"]["changes"];
  testResults?: DevExecutionResultArtifact["content"]["testResults"];
};

/**
 * Run the DevAgent to implement a single task.
 */
export async function runDevAgent(
  projectId: ProjectId,
  taskPack: {
    taskId: string;
    title: string;
    description: string;
    acceptanceCriteria: Array<{
      id: string;
      given: string;
      when: string;
      then: string;
    }>;
    context: string;
  },
): Promise<DevExecutionResultArtifact> {
  return withSpan("activity.runDevAgent", async (span) => {
    span.setAttribute("project.id", projectId as string);
    span.setAttribute("task.id", taskPack.taskId);
    const d = getActivityDependencies();
    const agent = createDevAgent(d.llmProvider);

    const result = await agent({
      taskPack,
      context: taskPack.context,
    });

    if (!result.success || !result.output) {
      throw new Error(`DevAgent failed: ${result.error ?? "unknown error"}`);
    }

    const output = result.output as unknown as DevOutput;
    const devContent: DevExecutionResultArtifact["content"] = {
      taskId: taskPack.taskId,
      summary: output.summary ?? "Task completed",
      changes: output.changes ?? [],
      testResults: output.testResults ?? [],
    };

    const artifact = makeDevExecutionResultArtifact(projectId, d.organizationId, devContent);
    return d.artifactStore.save(artifact) as Promise<DevExecutionResultArtifact>;
  });
}

// ============================================================================
// QA Agent Activity
// ============================================================================

type QaOutput = {
  qaReport?: QaReportArtifact["content"];
  acMatrix?: AcMatrixArtifact["content"];
};

/**
 * Run the QaAgent to verify task implementation.
 */
export async function runQaAgent(
  projectId: ProjectId,
  devResultContent: DevExecutionResultArtifact["content"],
  taskPack: {
    taskId: string;
    title: string;
    acceptanceCriteria: Array<{
      id: string;
      given: string;
      when: string;
      then: string;
    }>;
  },
  testStrategyContent: TestStrategyArtifact["content"],
): Promise<{ qaReport: QaReportArtifact; acMatrix: AcMatrixArtifact }> {
  return withSpan("activity.runQaAgent", async (span) => {
    span.setAttribute("project.id", projectId as string);
    span.setAttribute("task.id", taskPack.taskId);
    const d = getActivityDependencies();
    const agent = createQaAgent(d.llmProvider);

    const result = await agent({
      devResult: devResultContent,
      taskPack,
      testStrategy: testStrategyContent,
    });

    if (!result.success || !result.output) {
      throw new Error(`QaAgent failed: ${result.error ?? "unknown error"}`);
    }

    const output = result.output as unknown as QaOutput;

    const qaReport = makeQaReportArtifact(projectId, d.organizationId, output.qaReport ?? {
      overallStatus: "fail",
      acResults: [],
      defects: [],
      summary: "QA report",
    });
    const acMatrix = makeAcMatrixArtifact(projectId, d.organizationId, output.acMatrix ?? {
      criteria: [],
    });

    const [savedQa, savedAc] = await Promise.all([
      d.artifactStore.save(qaReport),
      d.artifactStore.save(acMatrix),
    ]);

    return {
      qaReport: savedQa as QaReportArtifact,
      acMatrix: savedAc as AcMatrixArtifact,
    };
  });
}

// ============================================================================
// Artifact Management Activities
// ============================================================================

/**
 * Save any artifact to the store.
 */
export async function saveArtifact(artifact: ArtifactUnion): Promise<ArtifactUnion> {
  const d = getActivityDependencies();
  return d.artifactStore.save(artifact);
}

/**
 * Get an artifact by ID.
 */
export async function getArtifact(artifactId: ArtifactId): Promise<ArtifactUnion | null> {
  const d = getActivityDependencies();
  return d.artifactStore.getById(artifactId, d.organizationId);
}

// ============================================================================
// Workflow State Activities
// ============================================================================

/**
 * Persist workflow state to the repository.
 */
export async function persistWorkflowState(
  workflowRunId: WorkflowRunId,
  state: WorkflowState,
  currentStage: string,
): Promise<void> {
  const d = getActivityDependencies();
  await d.workflowRepository.updateState(workflowRunId, d.organizationId, state, currentStage);
}

// ============================================================================
// Approval Activities
// ============================================================================

/**
 * Record an approval decision.
 */
export async function recordApproval(
  workflowRunId: WorkflowRunId,
  artifactType: string,
  decision: ApprovalDecision,
  reviewer: string,
  comments?: string,
): Promise<void> {
  const d = getActivityDependencies();
  const record = createApprovalRecordFn(workflowRunId, d.organizationId, artifactType, decision, reviewer, comments);
  await d.approvalRepository.save(record);
}

// ============================================================================
// Notification Activities
// ============================================================================

/**
 * Notify that human input is required.
 */
export async function notifyAwaitingInput(
  projectId: ProjectId,
  workflowRunId: WorkflowRunId,
  inputType: "clarification" | "approval",
): Promise<void> {
  const d = getActivityDependencies();
  await d.notificationProvider.notify("system", inputType, {
    projectId,
    workflowRunId,
    inputType,
  });
}

// ============================================================================
// Release Decision Activity
// ============================================================================

/**
 * Create a release decision artifact.
 */
export async function createReleaseDecisionArtifact(
  projectId: ProjectId,
  decision: "release" | "hold",
  rationale: string,
  qaSummary: string,
  outstandingRisks: string[],
): Promise<ArtifactUnion> {
  const d = getActivityDependencies();
  const artifact = makeReleaseDecisionArtifact(projectId, d.organizationId, {
    decision,
    rationale,
    qaSummary,
    outstandingRisks,
  });
  return d.artifactStore.save(artifact);
}

// Export all activity functions for Temporal to import
export const activityFunctions = {
  runIntakeAgent,
  runRequirementsCriticAgent,
  finalizeRequirements,
  runArchitectAgent,
  runDevAgent,
  runQaAgent,
  saveArtifact,
  getArtifact,
  persistWorkflowState,
  recordApproval,
  notifyAwaitingInput,
  createReleaseDecisionArtifact,
};

export type ActivityFunctions = typeof activityFunctions;