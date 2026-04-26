import { WorkflowState } from "@workflow-jk/contracts";

export interface Transition {
  from: WorkflowState;
  to: WorkflowState;
  trigger: string;
  guard?: (context: TransitionContext) => boolean;
  sideEffects?: string[];
}

export interface TransitionContext {
  hasRequiredArtifacts: boolean;
  hasApproval: boolean;
  hasClarificationAnswers: boolean;
  qaPassed: boolean;
  hasReworkTasks: boolean;
}

type WorkflowStateType = WorkflowState extends string ? never : never;
// Ensure WorkflowState is used as a union type

const TRANSITIONS: Transition[] = [
  { from: "Draft", to: "IntakeInProgress", trigger: "startIntake" },
  { from: "IntakeInProgress", to: "AwaitingClarification", trigger: "intakeComplete" },
  { from: "AwaitingClarification", to: "RequirementsReadyForApproval", trigger: "clarificationReceived", guard: (ctx) => ctx.hasClarificationAnswers },
  { from: "RequirementsReadyForApproval", to: "RequirementsApproved", trigger: "approveRequirements", guard: (ctx) => ctx.hasApproval },
  { from: "RequirementsReadyForApproval", to: "AwaitingClarification", trigger: "requestChanges" },
  { from: "RequirementsApproved", to: "ArchitectureInProgress", trigger: "startArchitecture" },
  { from: "ArchitectureInProgress", to: "AwaitingArchitectureApproval", trigger: "architectureComplete" },
  { from: "AwaitingArchitectureApproval", to: "ArchitectureApproved", trigger: "approveArchitecture", guard: (ctx) => ctx.hasApproval },
  { from: "AwaitingArchitectureApproval", to: "ArchitectureInProgress", trigger: "requestChanges" },
  { from: "ArchitectureApproved", to: "DevInProgress", trigger: "startDev" },
  { from: "DevInProgress", to: "QaInProgress", trigger: "devComplete" },
  { from: "QaInProgress", to: "ReadyForRelease", trigger: "qaPassed", guard: (ctx) => ctx.qaPassed },
  { from: "QaInProgress", to: "ReworkRequired", trigger: "qaFailed", guard: (ctx) => !ctx.qaPassed },
  { from: "ReworkRequired", to: "DevInProgress", trigger: "startRework" },
  { from: "ReadyForRelease", to: "Completed", trigger: "release" },
  { from: "IntakeInProgress", to: "Failed", trigger: "fail" },
  { from: "ArchitectureInProgress", to: "Failed", trigger: "fail" },
  { from: "DevInProgress", to: "Failed", trigger: "fail" },
  { from: "QaInProgress", to: "Failed", trigger: "fail" },
  // Additional fail transitions for all human wait states
  { from: "AwaitingClarification", to: "Failed", trigger: "fail" },
  { from: "RequirementsReadyForApproval", to: "Failed", trigger: "fail" },
  { from: "AwaitingArchitectureApproval", to: "Failed", trigger: "fail" },
  { from: "ReadyForRelease", to: "Failed", trigger: "fail" },
  { from: "ReworkRequired", to: "Failed", trigger: "fail" },
];

export class WorkflowStateMachine {
  private transitions: Transition[];

  constructor() {
    this.transitions = TRANSITIONS;
  }

  canTransition(currentState: WorkflowState, trigger: string, context: TransitionContext): boolean {
    const transition = this.findTransition(currentState, trigger);
    if (!transition) return false;
    if (transition.guard && !transition.guard(context)) return false;
    return true;
  }

  transition(currentState: WorkflowState, trigger: string, context: TransitionContext): WorkflowState {
    if (!this.canTransition(currentState, trigger, context)) {
      throw new InvalidTransitionError(currentState, trigger);
    }
    const transition = this.findTransition(currentState, trigger)!;
    return transition.to;
  }

  getAvailableTransitions(currentState: WorkflowState): Transition[] {
    return this.transitions.filter((t) => t.from === currentState);
  }

  private findTransition(state: WorkflowState, trigger: string): Transition | undefined {
    return this.transitions.find((t) => t.from === state && t.trigger === trigger);
  }
}

export class InvalidTransitionError extends Error {
  constructor(public readonly currentState: WorkflowState, public readonly trigger: string) {
    super(`Invalid transition: cannot apply '${trigger}' from state '${currentState}'`);
    this.name = "InvalidTransitionError";
  }
}