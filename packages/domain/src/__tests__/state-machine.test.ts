import { describe, it, expect } from "vitest";
import { WorkflowStateMachine, InvalidTransitionError } from "../state-machine";

describe("WorkflowStateMachine", () => {
  const machine = new WorkflowStateMachine();

  describe("valid transitions", () => {
    it("transitions Draft -> IntakeInProgress", () => {
      const result = machine.transition("Draft", "startIntake", {
        hasRequiredArtifacts: false,
        hasApproval: false,
        hasClarificationAnswers: false,
        qaPassed: false,
        hasReworkTasks: false,
      });
      expect(result).toBe("IntakeInProgress");
    });

    it("transitions IntakeInProgress -> AwaitingClarification", () => {
      const result = machine.transition("IntakeInProgress", "intakeComplete", {
        hasRequiredArtifacts: false,
        hasApproval: false,
        hasClarificationAnswers: false,
        qaPassed: false,
        hasReworkTasks: false,
      });
      expect(result).toBe("AwaitingClarification");
    });

    it("transitions AwaitingClarification -> RequirementsReadyForApproval with answers", () => {
      const result = machine.transition("AwaitingClarification", "clarificationReceived", {
        hasRequiredArtifacts: false,
        hasApproval: false,
        hasClarificationAnswers: true,
        qaPassed: false,
        hasReworkTasks: false,
      });
      expect(result).toBe("RequirementsReadyForApproval");
    });

    it("transitions RequirementsReadyForApproval -> RequirementsApproved with approval", () => {
      const result = machine.transition("RequirementsReadyForApproval", "approveRequirements", {
        hasRequiredArtifacts: false,
        hasApproval: true,
        hasClarificationAnswers: false,
        qaPassed: false,
        hasReworkTasks: false,
      });
      expect(result).toBe("RequirementsApproved");
    });

    it("transitions QaInProgress -> ReadyForRelease when qaPassed", () => {
      const result = machine.transition("QaInProgress", "qaPassed", {
        hasRequiredArtifacts: false,
        hasApproval: false,
        hasClarificationAnswers: false,
        qaPassed: true,
        hasReworkTasks: false,
      });
      expect(result).toBe("ReadyForRelease");
    });

    it("transitions QaInProgress -> ReworkRequired when !qaPassed", () => {
      const result = machine.transition("QaInProgress", "qaFailed", {
        hasRequiredArtifacts: false,
        hasApproval: false,
        hasClarificationAnswers: false,
        qaPassed: false,
        hasReworkTasks: false,
      });
      expect(result).toBe("ReworkRequired");
    });

    it("transitions ReworkRequired -> DevInProgress", () => {
      const result = machine.transition("ReworkRequired", "startRework", {
        hasRequiredArtifacts: false,
        hasApproval: false,
        hasClarificationAnswers: false,
        qaPassed: false,
        hasReworkTasks: false,
      });
      expect(result).toBe("DevInProgress");
    });

    it("transitions ReadyForRelease -> Completed", () => {
      const result = machine.transition("ReadyForRelease", "release", {
        hasRequiredArtifacts: false,
        hasApproval: false,
        hasClarificationAnswers: false,
        qaPassed: false,
        hasReworkTasks: false,
      });
      expect(result).toBe("Completed");
    });
  });

  describe("guard enforcement", () => {
    it("rejects clarificationReceived without answers", () => {
      expect(
        machine.canTransition("AwaitingClarification", "clarificationReceived", {
          hasRequiredArtifacts: false,
          hasApproval: false,
          hasClarificationAnswers: false,
          qaPassed: false,
          hasReworkTasks: false,
        }),
      ).toBe(false);
    });

    it("rejects approveRequirements without approval", () => {
      expect(
        machine.canTransition("RequirementsReadyForApproval", "approveRequirements", {
          hasRequiredArtifacts: false,
          hasApproval: false,
          hasClarificationAnswers: false,
          qaPassed: false,
          hasReworkTasks: false,
        }),
      ).toBe(false);
    });

    it("rejects approveArchitecture without approval", () => {
      expect(
        machine.canTransition("AwaitingArchitectureApproval", "approveArchitecture", {
          hasRequiredArtifacts: false,
          hasApproval: false,
          hasClarificationAnswers: false,
          qaPassed: false,
          hasReworkTasks: false,
        }),
      ).toBe(false);
    });

    it("rejects qaPassed without qaPassed context", () => {
      expect(
        machine.canTransition("QaInProgress", "qaPassed", {
          hasRequiredArtifacts: false,
          hasApproval: false,
          hasClarificationAnswers: false,
          qaPassed: false,
          hasReworkTasks: false,
        }),
      ).toBe(false);
    });
  });

  describe("invalid transitions", () => {
    it("throws on invalid transition from Draft", () => {
      expect(() =>
        machine.transition("Draft", "approveRequirements", {
          hasRequiredArtifacts: false,
          hasApproval: false,
          hasClarificationAnswers: false,
          qaPassed: false,
          hasReworkTasks: false,
        }),
      ).toThrow(InvalidTransitionError);
    });

    it("throws on transition from Completed", () => {
      expect(() =>
        machine.transition("Completed", "startIntake", {
          hasRequiredArtifacts: false,
          hasApproval: false,
          hasClarificationAnswers: false,
          qaPassed: false,
          hasReworkTasks: false,
        }),
      ).toThrow(InvalidTransitionError);
    });
  });

  describe("available transitions", () => {
    it("lists correct transitions from Draft", () => {
      const transitions = machine.getAvailableTransitions("Draft");
      expect(transitions).toHaveLength(1);
      expect(transitions[0].trigger).toBe("startIntake");
    });

    it("lists multiple transitions from QaInProgress", () => {
      const transitions = machine.getAvailableTransitions("QaInProgress");
      expect(transitions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("additional state transitions", () => {
    it("transitions RequirementsApproved -> ArchitectureInProgress", () => {
      const result = machine.transition("RequirementsApproved", "startArchitecture", {
        hasRequiredArtifacts: false,
        hasApproval: false,
        hasClarificationAnswers: false,
        qaPassed: false,
        hasReworkTasks: false,
      });
      expect(result).toBe("ArchitectureInProgress");
    });

    it("transitions ArchitectureInProgress -> AwaitingArchitectureApproval", () => {
      const result = machine.transition("ArchitectureInProgress", "architectureComplete", {
        hasRequiredArtifacts: false,
        hasApproval: false,
        hasClarificationAnswers: false,
        qaPassed: false,
        hasReworkTasks: false,
      });
      expect(result).toBe("AwaitingArchitectureApproval");
    });

    it("transitions AwaitingArchitectureApproval -> ArchitectureApproved with approval", () => {
      const result = machine.transition("AwaitingArchitectureApproval", "approveArchitecture", {
        hasRequiredArtifacts: false,
        hasApproval: true,
        hasClarificationAnswers: false,
        qaPassed: false,
        hasReworkTasks: false,
      });
      expect(result).toBe("ArchitectureApproved");
    });

    it("transitions ArchitectureApproved -> DevInProgress", () => {
      const result = machine.transition("ArchitectureApproved", "startDev", {
        hasRequiredArtifacts: false,
        hasApproval: false,
        hasClarificationAnswers: false,
        qaPassed: false,
        hasReworkTasks: false,
      });
      expect(result).toBe("DevInProgress");
    });

    it("transitions DevInProgress -> QaInProgress", () => {
      const result = machine.transition("DevInProgress", "devComplete", {
        hasRequiredArtifacts: false,
        hasApproval: false,
        hasClarificationAnswers: false,
        qaPassed: false,
        hasReworkTasks: false,
      });
      expect(result).toBe("QaInProgress");
    });

    it("transitions RequirementsReadyForApproval -> AwaitingClarification on requestChanges", () => {
      const result = machine.transition("RequirementsReadyForApproval", "requestChanges", {
        hasRequiredArtifacts: false,
        hasApproval: false,
        hasClarificationAnswers: false,
        qaPassed: false,
        hasReworkTasks: false,
      });
      expect(result).toBe("AwaitingClarification");
    });

    it("transitions AwaitingArchitectureApproval -> ArchitectureInProgress on requestChanges", () => {
      const result = machine.transition("AwaitingArchitectureApproval", "requestChanges", {
        hasRequiredArtifacts: false,
        hasApproval: false,
        hasClarificationAnswers: false,
        qaPassed: false,
        hasReworkTasks: false,
      });
      expect(result).toBe("ArchitectureInProgress");
    });

    it("can transition to Failed from active states", () => {
      const failFromIntake = machine.canTransition("IntakeInProgress", "fail", {
        hasRequiredArtifacts: false,
        hasApproval: false,
        hasClarificationAnswers: false,
        qaPassed: false,
        hasReworkTasks: false,
      });
      expect(failFromIntake).toBe(true);

      const failFromDev = machine.canTransition("DevInProgress", "fail", {
        hasRequiredArtifacts: false,
        hasApproval: false,
        hasClarificationAnswers: false,
        qaPassed: false,
        hasReworkTasks: false,
      });
      expect(failFromDev).toBe(true);

      const failFromQa = machine.canTransition("QaInProgress", "fail", {
        hasRequiredArtifacts: false,
        hasApproval: false,
        hasClarificationAnswers: false,
        qaPassed: false,
        hasReworkTasks: false,
      });
      expect(failFromQa).toBe(true);
    });
  });
});