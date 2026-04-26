/**
 * InlineWorkflowEngine - Synchronous workflow execution engine.
 *
 * This engine runs the full workflow inline without Temporal,
 * handling all 10 stages from intake through release.
 */
import {
  ProjectId,
  ProjectIntakeRequest,
  WorkflowRunId,
  WorkflowState,
  ClarificationResponsePayload,
  ApprovalDecision,
  OrganizationId,
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
} from "@workflow-jk/contracts";
import type {
  WorkflowRepository,
  ApprovalRepository,
  ArtifactStore,
  LLMProvider,
  Clock,
  NotificationProvider,
  IdempotencyStore,
} from "@workflow-jk/adapters";
import { WorkflowStateMachine, TransitionContext, determineReworkScope, ReworkScope, ExecutionPolicy, DEFAULT_EXECUTION_POLICY, isAgentAllowed, isFilePathAllowed, isDiffSizeAllowed } from "@workflow-jk/domain";
import {
  runIntakeAgent,
  runRequirementsCriticAgent,
  finalizeRequirements,
  runArchitectAgent,
  runDevAgent,
  runQaAgent,
  recordApproval,
  notifyAwaitingInput,
  persistWorkflowState,
  ActivityDependencies,
  setActivityDependencies,
} from "./activities";
import { SIGNAL_NAMES } from "@workflow-jk/config";
import { createWorkflowRun } from "@workflow-jk/domain";

const TEST_ORG_ID = "00000000-0000-0000-0000-000000000000" as unknown as OrganizationId;

// Workflow context stored during execution
interface WorkflowContext {
  projectId: ProjectId;
  organizationId: OrganizationId;
  projectInput: ProjectIntakeRequest;
  executionPolicy: ExecutionPolicy;
  brief?: BriefArtifact;
  critique?: CritiqueResultArtifact;
  requirements?: RequirementsArtifact;
  acceptanceCriteria?: AcceptanceCriteriaArtifact;
  outOfScope?: OutOfScopeArtifact;
  nonFunctionalRequirements?: NonFunctionalRequirementsArtifact;
  architecture?: ArchitectureArtifact;
  implementationPlan?: ImplementationPlanArtifact;
  taskGraph?: TaskGraphArtifact;
  testStrategy?: TestStrategyArtifact;
  repoImpactMap?: RepoImpactMapArtifact;
  clarificationAnswers?: ClarificationResponsePayload;
  reworkCount: number;
  reworkTaskIds?: string[];
  lastReworkScope?: ReworkScope;
  taskResults: Map<string, { devPassed: boolean; qaPassed: boolean }>;
  currentTaskIndex: number;
}

/**
 * InlineWorkflowEngine - Runs workflows synchronously without Temporal.
 */
export class InlineWorkflowEngine {
  private stateMachine: WorkflowStateMachine;
  private contextMap: Map<string, WorkflowContext> = new Map();
  private pendingSignals: Map<string, { signalType: string; payload: unknown }> = new Map();
  private activeWorkflowCount = 0;
  private semaphore: Promise<void> = Promise.resolve();
  private resolveSemaphore: (() => void) | null = null;

  constructor(
    private deps: ActivityDependencies,
    private workflowRepository: WorkflowRepository,
    private approvalRepository: ApprovalRepository,
  ) {
    this.stateMachine = new WorkflowStateMachine();
    setActivityDependencies(deps);
  }

  /**
   * Start a new workflow - runs intake + critique stages synchronously.
   * Returns the workflow run ID after stopping at AwaitingClarification.
   */
  async start(
    projectId: ProjectId,
    organizationId: OrganizationId,
    input: ProjectIntakeRequest,
    executionPolicy: ExecutionPolicy = DEFAULT_EXECUTION_POLICY,
    signal?: AbortSignal,
  ): Promise<string> {
    this.checkAbort(signal);
    signal?.addEventListener("abort", () => this.cancel(projectId as unknown as WorkflowRunId, organizationId));

    // Enforce maxConcurrentWorkflows
    if (this.activeWorkflowCount >= executionPolicy.maxConcurrentWorkflows) {
      throw new Error(`Maximum concurrent workflows (${executionPolicy.maxConcurrentWorkflows}) reached`);
    }

    // Acquire semaphore slot
    this.activeWorkflowCount++;
    let released = false;
    const release = () => { if (!released) { released = true; this.activeWorkflowCount--; } };

    // Create workflow run
    const workflowRun = createWorkflowRun(projectId, organizationId);
    await this.workflowRepository.save(workflowRun);
    const runId = workflowRun.id;

    // Initialize workflow context
    const context: WorkflowContext = {
      projectId,
      organizationId,
      projectInput: input,
      executionPolicy,
      reworkCount: 0,
      taskResults: new Map(),
      currentTaskIndex: 0,
    };
    this.contextMap.set(runId as unknown as string, context);

    try {
      // Transition to IntakeInProgress and run
      const ctx: TransitionContext = {
        hasRequiredArtifacts: false,
        hasApproval: false,
        hasClarificationAnswers: false,
        qaPassed: false,
        hasReworkTasks: false,
      };

      this.checkAbort(signal);
      await this.transition(runId, organizationId, "startIntake", ctx);
      await this.runIntakeStage(runId, projectId, input, executionPolicy, signal);

      // Run requirements critique
      this.checkAbort(signal);
      await this.runCritiqueStage(runId, executionPolicy, signal);

      // Transition to AwaitingClarification and wait for signal
      this.checkAbort(signal);
      await this.transition(runId, organizationId, "intakeComplete", { ...ctx, hasClarificationAnswers: false });
      await this.persistState(runId, "AwaitingClarification", "clarification");
      await notifyAwaitingInput(projectId, runId as unknown as WorkflowRunId, "clarification");

      return runId as unknown as string;
    } finally {
      release();
    }
  }

  /**
   * Resume a workflow with a signal.
   * Processes clarification answers, approvals, etc.
   */
  async resume(
    workflowRunId: WorkflowRunId,
    signalType: string,
    payload: unknown,
    signal?: AbortSignal,
  ): Promise<string> {
    this.checkAbort(signal);

    const runIdStr = workflowRunId as unknown as string;
    const context = this.contextMap.get(runIdStr);
    if (!context) {
      throw new Error(`Workflow context not found: ${runIdStr}`);
    }

    signal?.addEventListener("abort", () => this.cancel(workflowRunId, context.organizationId));

    const workflow = await this.workflowRepository.getById(workflowRunId, context.organizationId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowRunId}`);
    }

    const currentState = workflow.state;

    this.checkAbort(signal);

    // Route based on current state and signal type
    switch (currentState) {
      case "AwaitingClarification":
        if (signalType === SIGNAL_NAMES.CLARIFICATION_ANSWERS) {
          this.checkAbort(signal);
          return this.handleClarificationAnswers(runIdStr, payload as ClarificationResponsePayload, signal);
        }
        break;

      case "RequirementsReadyForApproval":
        if (signalType === SIGNAL_NAMES.REQUIREMENTS_APPROVAL) {
          this.checkAbort(signal);
          const approvalPayload = payload as { decision: ApprovalDecision; reviewer?: string; comments?: string };
          return this.handleRequirementsApproval(runIdStr, approvalPayload.decision, signal);
        }
        break;

      case "AwaitingArchitectureApproval":
        if (signalType === SIGNAL_NAMES.ARCHITECTURE_APPROVAL) {
          this.checkAbort(signal);
          const approvalPayload = payload as { decision: ApprovalDecision; reviewer?: string; comments?: string };
          return this.handleArchitectureApproval(runIdStr, approvalPayload.decision, signal);
        }
        break;

      case "ReadyForRelease":
        // Release decision signal would go here in future
        return runIdStr;

      case "ReworkRequired":
        // Resume from rework
        if (signalType === "start-rework") {
          this.checkAbort(signal);
          return this.handleStartRework(runIdStr, signal);
        }
        break;
    }

    throw new Error(`Invalid signal ${signalType} for state ${currentState}`);
  }

  /**
   * Handle clarification answers - finalize requirements and transition to approval.
   */
  private async handleClarificationAnswers(
    runIdStr: string,
    answers: ClarificationResponsePayload,
    signal?: AbortSignal,
  ): Promise<string> {
    const context = this.contextMap.get(runIdStr)!;
    const workflow = await this.workflowRepository.getById(runIdStr as unknown as WorkflowRunId, context.organizationId);
    if (!workflow) throw new Error(`Workflow not found: ${runIdStr}`);

    // Store clarification answers
    context.clarificationAnswers = answers;

    // Transition via clarificationReceived
    let ctx: TransitionContext = {
      hasRequiredArtifacts: false,
      hasApproval: false,
      hasClarificationAnswers: true,
      qaPassed: false,
      hasReworkTasks: false,
    };

    // Check if we can transition
    if (!this.stateMachine.canTransition(workflow.state, "clarificationReceived", ctx)) {
      throw new Error(`Cannot transition from ${workflow.state} with clarificationReceived`);
    }

    // Finalize requirements artifacts
    this.checkAbort(signal);
    const finalized = await finalizeRequirements(
      context.projectId,
      context.brief!.content as any,
      context.critique!.content as any,
      answers,
    );
    context.requirements = finalized.requirements;
    context.acceptanceCriteria = finalized.acceptanceCriteria;
    context.outOfScope = finalized.outOfScope;
    context.nonFunctionalRequirements = finalized.nonFunctionalRequirements;

    // Transition to RequirementsReadyForApproval
    this.checkAbort(signal);
    await this.transition(runIdStr as unknown as WorkflowRunId, context.organizationId, "clarificationReceived", ctx);
    await this.persistState(runIdStr as unknown as WorkflowRunId, "RequirementsReadyForApproval", "requirements-finalized");
    await notifyAwaitingInput(context.projectId, runIdStr as unknown as WorkflowRunId, "approval");

    return runIdStr;
  }

  /**
   * Handle requirements approval - either proceed to architecture or request changes.
   */
  private async handleRequirementsApproval(
    runIdStr: string,
    decision: ApprovalDecision,
    signal?: AbortSignal,
  ): Promise<string> {
    const context = this.contextMap.get(runIdStr)!;
    const workflow = await this.workflowRepository.getById(runIdStr as unknown as WorkflowRunId, context.organizationId);
    if (!workflow) throw new Error(`Workflow not found: ${runIdStr}`);

    // Record approval
    await recordApproval(
      runIdStr as unknown as WorkflowRunId,
      "requirements",
      decision,
      "reviewer",
    );

    if (decision === "approved") {
      const ctx: TransitionContext = {
        hasRequiredArtifacts: true,
        hasApproval: true,
        hasClarificationAnswers: true,
        qaPassed: false,
        hasReworkTasks: false,
      };
      this.checkAbort(signal);
      await this.transition(runIdStr as unknown as WorkflowRunId, context.organizationId, "approveRequirements", ctx);
      await this.persistState(runIdStr as unknown as WorkflowRunId, "RequirementsApproved", "requirements-approved");

      // Transition to ArchitectureInProgress before running
      this.checkAbort(signal);
      await this.transition(runIdStr as unknown as WorkflowRunId, context.organizationId, "startArchitecture", ctx);
      await this.persistState(runIdStr as unknown as WorkflowRunId, "ArchitectureInProgress", "architecture-in-progress");

      // Run architect agent
      await this.runArchitectureStage(runIdStr, context.executionPolicy, signal);

      // Transition to AwaitingArchitectureApproval after completion
      this.checkAbort(signal);
      await this.transition(runIdStr as unknown as WorkflowRunId, context.organizationId, "architectureComplete", {
        hasRequiredArtifacts: true,
        hasApproval: false,
        hasClarificationAnswers: true,
        qaPassed: false,
        hasReworkTasks: false,
      });
      await this.persistState(runIdStr as unknown as WorkflowRunId, "AwaitingArchitectureApproval", "architecture-approved");
      await notifyAwaitingInput(context.projectId, runIdStr as unknown as WorkflowRunId, "approval");
    } else {
      // Changes requested - go back to awaiting clarification
      this.checkAbort(signal);
      await this.transition(runIdStr as unknown as WorkflowRunId, context.organizationId, "requestChanges", {
        hasRequiredArtifacts: true,
        hasApproval: false,
        hasClarificationAnswers: true,
        qaPassed: false,
        hasReworkTasks: false,
      });
      await this.persistState(runIdStr as unknown as WorkflowRunId, "AwaitingClarification", "clarification");
      await notifyAwaitingInput(context.projectId, runIdStr as unknown as WorkflowRunId, "clarification");
    }

    return runIdStr;
  }

  /**
   * Handle architecture approval - either proceed to dev or request changes.
   */
  private async handleArchitectureApproval(
    runIdStr: string,
    decision: ApprovalDecision,
    signal?: AbortSignal,
  ): Promise<string> {
    const context = this.contextMap.get(runIdStr)!;
    const workflow = await this.workflowRepository.getById(runIdStr as unknown as WorkflowRunId, context.organizationId);
    if (!workflow) throw new Error(`Workflow not found: ${runIdStr}`);

    // Record approval
    await recordApproval(
      runIdStr as unknown as WorkflowRunId,
      "architecture",
      decision,
      "reviewer",
    );

    if (decision === "approved") {
      // Transition to ArchitectureApproved
      const ctx: TransitionContext = {
        hasRequiredArtifacts: true,
        hasApproval: true,
        hasClarificationAnswers: true,
        qaPassed: false,
        hasReworkTasks: false,
      };
      this.checkAbort(signal);
      await this.transition(runIdStr as unknown as WorkflowRunId, context.organizationId, "approveArchitecture", ctx);
      await this.persistState(runIdStr as unknown as WorkflowRunId, "ArchitectureApproved", "architecture-approved");

      // Start dev execution
      this.checkAbort(signal);
      await this.transition(runIdStr as unknown as WorkflowRunId, context.organizationId, "startDev", ctx);
      await this.persistState(runIdStr as unknown as WorkflowRunId, "DevInProgress", "dev-execution");

      // Run dev and QA for all tasks
      await this.runDevAndQAStages(runIdStr, context.executionPolicy, signal);
    } else {
      // Changes requested - go back to architecture
      this.checkAbort(signal);
      await this.transition(runIdStr as unknown as WorkflowRunId, context.organizationId, "requestChanges", {
        hasRequiredArtifacts: true,
        hasApproval: false,
        hasClarificationAnswers: true,
        qaPassed: false,
        hasReworkTasks: false,
      });
      await this.persistState(runIdStr as unknown as WorkflowRunId, "ArchitectureInProgress", "architecture-in-progress");

      // Re-run architect
      await this.runArchitectureStage(runIdStr, context.executionPolicy, signal);

      // Back to awaiting approval
      this.checkAbort(signal);
      await this.transition(runIdStr as unknown as WorkflowRunId, context.organizationId, "architectureComplete", {
        hasRequiredArtifacts: true,
        hasApproval: false,
        hasClarificationAnswers: true,
        qaPassed: false,
        hasReworkTasks: false,
      });
      await this.persistState(runIdStr as unknown as WorkflowRunId, "AwaitingArchitectureApproval", "architecture-approved");
      await notifyAwaitingInput(context.projectId, runIdStr as unknown as WorkflowRunId, "approval");
    }

    return runIdStr;
  }

  /**
   * Handle start rework - resume dev execution after rework loop.
   */
  private async handleStartRework(runIdStr: string, signal?: AbortSignal): Promise<string> {
    const context = this.contextMap.get(runIdStr)!;
    const workflow = await this.workflowRepository.getById(runIdStr as unknown as WorkflowRunId, context.organizationId);
    if (!workflow) throw new Error(`Workflow not found: ${runIdStr}`);

    context.reworkCount++;

    if (context.reworkCount >= 3) {
      await this.transition(runIdStr as unknown as WorkflowRunId, context.organizationId, "fail", {
        hasRequiredArtifacts: false,
        hasApproval: false,
        hasClarificationAnswers: false,
        qaPassed: false,
        hasReworkTasks: false,
      });
      await this.persistState(runIdStr as unknown as WorkflowRunId, "Failed", "max-rework");
      return runIdStr;
    }

    const reworkTaskIds = context.lastReworkScope?.reworkTaskIds;
    context.reworkTaskIds = reworkTaskIds;

    this.checkAbort(signal);
    await this.transition(runIdStr as unknown as WorkflowRunId, context.organizationId, "startRework", {
      hasRequiredArtifacts: true,
      hasApproval: true,
      hasClarificationAnswers: true,
      qaPassed: false,
      hasReworkTasks: true,
    });
    await this.persistState(runIdStr as unknown as WorkflowRunId, "DevInProgress", "dev-execution-rework");

    await this.runDevAndQAStages(runIdStr, context.executionPolicy, signal);

    return runIdStr;
  }

  /**
   * Run the intake stage.
   */
  private async runIntakeStage(
    runId: WorkflowRunId,
    projectId: ProjectId,
    input: ProjectIntakeRequest,
    policy: ExecutionPolicy,
    signal?: AbortSignal,
  ): Promise<void> {
    if (!isAgentAllowed(policy, "IntakeAgent")) {
      throw new Error("Agent type 'IntakeAgent' not allowed by execution policy");
    }

    const runIdStr = runId as unknown as string;
    const context = this.contextMap.get(runIdStr)!;

    // Run intake agent
    this.checkAbort(signal);
    const brief = await runIntakeAgent(
      projectId,
      input.rawIdea,
      input.businessGoal,
      input.constraints,
      input.assumptions ?? [],
    );
    context.brief = brief;

    this.checkAbort(signal);
    await this.persistState(runId, "IntakeInProgress", "intake-complete");
  }

  /**
   * Run the requirements critique stage.
   */
  private async runCritiqueStage(runId: WorkflowRunId, policy: ExecutionPolicy, signal?: AbortSignal): Promise<void> {
    if (!isAgentAllowed(policy, "RequirementsCriticAgent")) {
      throw new Error("Agent type 'RequirementsCriticAgent' not allowed by execution policy");
    }

    const runIdStr = runId as unknown as string;
    const context = this.contextMap.get(runIdStr)!;

    // Run requirements critic agent
    this.checkAbort(signal);
    const critique = await runRequirementsCriticAgent(
      context.projectId,
      context.brief!.content as any,
    );
    context.critique = critique;

    this.checkAbort(signal);
    await this.persistState(runId, "IntakeInProgress", "requirements-critique");
  }

  /**
   * Run the architecture stage.
   */
  private async runArchitectureStage(runIdStr: string, policy: ExecutionPolicy, signal?: AbortSignal): Promise<void> {
    if (!isAgentAllowed(policy, "ArchitectAgent")) {
      throw new Error("Agent type 'ArchitectAgent' not allowed by execution policy");
    }

    const context = this.contextMap.get(runIdStr)!;

    this.checkAbort(signal);
    const artifacts = await runArchitectAgent(
      context.projectId,
      context.requirements!.content as any,
      context.acceptanceCriteria!.content as any,
      context.nonFunctionalRequirements!.content as any,
      context.outOfScope!.content as any,
    );
    context.architecture = artifacts.architecture;
    context.implementationPlan = artifacts.implementationPlan;
    context.taskGraph = artifacts.taskGraph;
    context.testStrategy = artifacts.testStrategy;
    context.repoImpactMap = artifacts.repoImpactMap;
  }

  /**
   * Run dev and QA stages for all tasks in the task graph.
   */
  private async runDevAndQAStages(runIdStr: string, policy: ExecutionPolicy, signal?: AbortSignal): Promise<void> {
    if (!isAgentAllowed(policy, "DevAgent")) {
      throw new Error("Agent type 'DevAgent' not allowed by execution policy");
    }
    if (!isAgentAllowed(policy, "QaAgent")) {
      throw new Error("Agent type 'QaAgent' not allowed by execution policy");
    }

    const context = this.contextMap.get(runIdStr)!;
    const taskGraph = context.taskGraph!;
    const tasks = taskGraph.content.tasks || [];
    const tasksToRun = context.reworkTaskIds?.length
      ? tasks.filter((t) => context.reworkTaskIds!.includes(t.id))
      : tasks;

    this.checkAbort(signal);
    await this.transition(runIdStr as unknown as WorkflowRunId, context.organizationId, "devComplete", {
      hasRequiredArtifacts: true,
      hasApproval: true,
      hasClarificationAnswers: true,
      qaPassed: false,
      hasReworkTasks: false,
    });
    await this.persistState(runIdStr as unknown as WorkflowRunId, "QaInProgress", "qa-execution");

    let allPassed = true;
    const taskResults: Map<string, { devPassed: boolean; qaPassed: boolean }> = new Map();

    for (const task of tasksToRun) {
      this.checkAbort(signal);
      const taskPack = {
        taskId: task.id,
        title: task.title,
        description: task.description,
        acceptanceCriteria: context.acceptanceCriteria?.content.criteria
          ?.filter((ac) => ac.requirementId === task.id || ac.id.startsWith(`ac-${task.id}`))
          ?.map((ac) => ({ id: ac.id, given: ac.given, when: ac.when, then: ac.then })) ?? [],
        context: `Task: ${task.title}. ${task.description}`,
      };

      const devResult = await runDevAgent(context.projectId, taskPack);

      // Validate file paths in DevAgent output
      const devContent = devResult.content as any;
      if (devContent.changes) {
        for (const change of devContent.changes) {
          if (!isFilePathAllowed(policy, change.path)) {
            console.warn(`[InlineWorkflowEngine] Path denied by policy: ${change.path}`);
            change.path = "";
            change.diff = "";
          }
        }
      }

      this.checkAbort(signal);
      const qaResult = await runQaAgent(
        context.projectId,
        devResult.content as any,
        taskPack,
        context.testStrategy!.content as any,
      );

      const qaPassed = qaResult.qaReport.content.overallStatus === "pass";
      taskResults.set(task.id, { devPassed: true, qaPassed });

      if (!qaPassed) {
        allPassed = false;
        const reworkScope = determineReworkScope(
          qaResult.qaReport.content,
          tasks,
        );
        context.lastReworkScope = reworkScope;
      }
    }

    context.taskResults = taskResults;

    const ctx: TransitionContext = {
      hasRequiredArtifacts: true,
      hasApproval: true,
      hasClarificationAnswers: true,
      qaPassed: allPassed,
      hasReworkTasks: !allPassed,
    };

    this.checkAbort(signal);
    if (allPassed) {
      context.reworkTaskIds = undefined;
      await this.transition(runIdStr as unknown as WorkflowRunId, context.organizationId, "qaPassed", ctx);
      await this.persistState(runIdStr as unknown as WorkflowRunId, "ReadyForRelease", "release");
      await notifyAwaitingInput(context.projectId, runIdStr as unknown as WorkflowRunId, "approval");
    } else {
      await this.transition(runIdStr as unknown as WorkflowRunId, context.organizationId, "qaFailed", ctx);
      await this.persistState(runIdStr as unknown as WorkflowRunId, "ReworkRequired", "rework-required");
    }
  }

  /**
   * Transition the workflow state.
   */
  private async transition(
    workflowRunId: WorkflowRunId,
    organizationId: OrganizationId,
    trigger: string,
    context: TransitionContext,
  ): Promise<void> {
    const workflow = await this.workflowRepository.getById(workflowRunId, organizationId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowRunId}`);
    }

    try {
      const newState = this.stateMachine.transition(workflow.state, trigger, context);
      await this.workflowRepository.updateState(workflowRunId, this.deps.organizationId, newState, trigger);
    } catch (error) {
      if (error instanceof Error && error.name === "InvalidTransitionError") {
        // For fail transitions, we might not have the guard satisfied
        // Try direct transition
        throw error;
      }
      throw error;
    }
  }

  /**
   * Persist workflow state.
   */
  private async persistState(
    workflowRunId: WorkflowRunId,
    state: WorkflowState,
    currentStage: string,
  ): Promise<void> {
    await this.workflowRepository.updateState(workflowRunId, this.deps.organizationId, state, currentStage);
  }

  /**
   /**
    * Get the current workflow context (for testing).
    */
  getContext(runId: string): WorkflowContext | undefined {
    return this.contextMap.get(runId);
  }

  /**
   * Get pending signals (for testing).
   */
  getPendingSignal(runId: string): { signalType: string; payload: unknown } | undefined {
    return this.pendingSignals.get(runId);
  }

  /**
   * Check abort signal and throw if aborted.
   */
  private checkAbort(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw new Error("Workflow cancelled");
    }
  }

  /**
   * Cancel a running workflow.
   */
  async cancel(workflowRunId: WorkflowRunId, organizationId: OrganizationId): Promise<void> {
    const runIdStr = workflowRunId as unknown as string;
    const context = this.contextMap.get(runIdStr);
    if (!context) {
      const workflow = await this.workflowRepository.getById(workflowRunId, organizationId);
      if (!workflow || workflow.state === "Failed" || workflow.state === "Completed") {
        return;
      }
      await this.workflowRepository.updateState(workflowRunId, organizationId, "Failed", "cancelled");
      return;
    }

    await this.transition(runIdStr as unknown as WorkflowRunId, organizationId, "fail", {
      hasRequiredArtifacts: false,
      hasApproval: false,
      hasClarificationAnswers: false,
      qaPassed: false,
      hasReworkTasks: false,
    });
    await this.persistState(runIdStr as unknown as WorkflowRunId, "Failed", "cancelled");
  }
}