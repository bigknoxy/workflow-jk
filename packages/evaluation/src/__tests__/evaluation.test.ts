import { describe, it, expect } from "vitest";
import { EvaluationCase, EvaluationResult, EvaluationRunResult } from "../schemas.js";
import { ArtifactQualityScorer } from "../scorer.js";
import { EvaluationRunner } from "../runner.js";
import { FakeLLMProvider } from "@workflow-jk/adapters";
import { createDeterministicFakeLLM } from "@workflow-jk/testing";
import { intakeCases, criticCases, architectCases, devCases, qaCases, ALL_EVALUATION_CASES } from "../cases/index.js";

describe("EvaluationCase Schema", () => {
  it("validates a complete evaluation case", () => {
    const result = EvaluationCase.safeParse(intakeCases[0]);
    expect(result.success).toBe(true);
  });

  it("validates all intake cases", () => {
    for (const c of intakeCases) {
      const result = EvaluationCase.safeParse(c);
      expect(result.success, `Failed to validate intake case: ${c.id}`).toBe(true);
    }
  });

  it("validates all critic cases", () => {
    for (const c of criticCases) {
      const result = EvaluationCase.safeParse(c);
      expect(result.success, `Failed to validate critic case: ${c.id}`).toBe(true);
    }
  });

  it("validates all architect cases", () => {
    for (const c of architectCases) {
      const result = EvaluationCase.safeParse(c);
      expect(result.success, `Failed to validate architect case: ${c.id}`).toBe(true);
    }
  });

  it("validates all dev cases", () => {
    for (const c of devCases) {
      const result = EvaluationCase.safeParse(c);
      expect(result.success, `Failed to validate dev case: ${c.id}`).toBe(true);
    }
  });

  it("validates all QA cases", () => {
    for (const c of qaCases) {
      const result = EvaluationCase.safeParse(c);
      expect(result.success, `Failed to validate QA case: ${c.id}`).toBe(true);
    }
  });

  it("requires id, name, agentName, input, and rubric", () => {
    const result = EvaluationCase.safeParse({
      name: "test",
      agentName: "IntakeAgent",
      input: {},
      rubric: { requiredFields: [] },
    });
    expect(result.success).toBe(false);
  });
});

describe("ArtifactQualityScorer", () => {
  const scorer = new ArtifactQualityScorer();

  describe("checkRequiredFields", () => {
    it("reports present fields as true", () => {
      const output = { problemStatement: "test", targetUsers: "users" };
      const result = scorer.checkRequiredFields(output, ["problemStatement", "targetUsers"]);
      expect(result.problemStatement).toBe(true);
      expect(result.targetUsers).toBe(true);
    });

    it("reports missing fields as false", () => {
      const output = { problemStatement: "test" };
      const result = scorer.checkRequiredFields(output, ["problemStatement", "targetUsers"]);
      expect(result.problemStatement).toBe(true);
      expect(result.targetUsers).toBe(false);
    });

    it("handles null output", () => {
      const result = scorer.checkRequiredFields(null, ["problemStatement"]);
      expect(result.problemStatement).toBe(false);
    });

    it("handles nested fields with dot notation", () => {
      const output = { architecture: { overview: "test" } };
      const result = scorer.checkRequiredFields(output, ["architecture.overview"]);
      expect(result["architecture.overview"]).toBe(true);
    });

    it("reports false for missing nested fields", () => {
      const output = { architecture: {} };
      const result = scorer.checkRequiredFields(output, ["architecture.overview"]);
      expect(result["architecture.overview"]).toBe(false);
    });
  });

  describe("checkSchemaConformance", () => {
    it("validates IntakeAgent output against schema", () => {
      const output = {
        problemStatement: "test",
        targetUsers: "users",
        businessValue: "value",
        keyFeatures: ["feature1"],
        constraints: ["constraint1"],
        assumptions: ["assumption1"],
        outOfScope: ["scope1"],
      };
      const result = scorer.checkSchemaConformance(output, "IntakeAgent");
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("reports schema violations", () => {
      const output = {
        problemStatement: "test",
      };
      const result = scorer.checkSchemaConformance(output, "IntakeAgent");
      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("returns error for unknown agent", () => {
      const result = scorer.checkSchemaConformance({}, "UnknownAgent" as any);
      expect(result.passed).toBe(false);
    });
  });

  describe("runQualityChecks", () => {
    it("evaluates has_ checks for arrays", () => {
      const output = { keyFeatures: ["a", "b", "c"] };
      const results = scorer.runQualityChecks(output, [
        { description: "Has key features", check: "has_keyFeatures", weight: 1 },
      ]);
      expect(results[0].passed).toBe(true);
    });

    it("evaluates has_ checks for empty arrays as false", () => {
      const output = { keyFeatures: [] };
      const results = scorer.runQualityChecks(output, [
        { description: "Has key features", check: "has_keyFeatures", weight: 1 },
      ]);
      expect(results[0].passed).toBe(false);
    });

    it("evaluates min_length_ checks", () => {
      const output = { keyFeatures: ["a", "b", "c"] };
      const results = scorer.runQualityChecks(output, [
        { description: "At least 2 features", check: "min_length_2_keyFeatures", weight: 1 },
      ]);
      expect(results[0].passed).toBe(true);
    });

    it("evaluates min_length_ checks that fail", () => {
      const output = { keyFeatures: ["a"] };
      const results = scorer.runQualityChecks(output, [
        { description: "At least 2 features", check: "min_length_2_keyFeatures", weight: 1 },
      ]);
      expect(results[0].passed).toBe(false);
    });

    it("evaluates non_empty_string_ checks", () => {
      const output = { problemStatement: "A real problem" };
      const results = scorer.runQualityChecks(output, [
        { description: "Non-empty problem statement", check: "non_empty_string_problemStatement", weight: 1 },
      ]);
      expect(results[0].passed).toBe(true);
    });

    it("evaluates non_empty_string_ checks that fail", () => {
      const output = { problemStatement: "" };
      const results = scorer.runQualityChecks(output, [
        { description: "Non-empty problem statement", check: "non_empty_string_problemStatement", weight: 1 },
      ]);
      expect(results[0].passed).toBe(false);
    });

    it("evaluates array_items_have_ checks", () => {
      const output = {
        clarificationQuestions: [
          { id: "q1", question: "What?", category: "ambiguity" },
          { id: "q2", question: "How?", category: "risk" },
        ],
      };
      const results = scorer.runQualityChecks(output, [
        { description: "Questions have IDs", check: "array_items_have_id_field_clarificationQuestions", weight: 1 },
      ]);
      expect(results[0].passed).toBe(true);
    });

    it("handles null output in quality checks", () => {
      const results = scorer.runQualityChecks(null, [
        { description: "test", check: "has_anything", weight: 1 },
      ]);
      expect(results[0].passed).toBe(false);
    });

    it("passes custom checks automatically", () => {
      const output = { data: "value" };
      const results = scorer.runQualityChecks(output, [
        { description: "Custom check", check: "custom:verify_something", weight: 1 },
      ]);
      expect(results[0].passed).toBe(true);
    });
  });
});

describe("EvaluationRunner", () => {
  it("runs a single intake case successfully with deterministic fake LLM", async () => {
    const provider = createDeterministicFakeLLM();
    const runner = new EvaluationRunner(provider);
    const result = await runner.runSingle(intakeCases[0]);

    expect(result.caseId).toBe("intake-001");
    expect(result.grade).toBe("pass");
    expect(result.error).toBeUndefined();
  });

  it("detects missing required fields", async () => {
    const provider = createDeterministicFakeLLM();
    const runner = new EvaluationRunner(provider);

    const result = await runner.runSingle({
      id: "test-fields",
      name: "Field check test",
      description: "Test that required field checking works",
      agentName: "IntakeAgent",
      input: { rawIdea: "test", businessGoal: "test", constraints: [], assumptions: [] },
      rubric: {
        requiredFields: ["problemStatement", "targetUsers", "businessValue", "keyFeatures", "constraints", "assumptions", "outOfScope"],
        qualityChecks: [],
        schemaConformance: false,
      },
    });

    // With deterministic fake LLM, IntakeAgent should output valid data
    // that has all required fields present
    expect(result.requiredFieldsPresent.problemStatement).toBe(true);
    expect(result.requiredFieldsPresent.targetUsers).toBe(true);
    expect(result.requiredFieldsPresent.keyFeatures).toBe(true);
  });

  it("handles agent errors gracefully (Zod validation failure)", async () => {
    const provider = new FakeLLMProvider();
    // Set a response that won't match the IntakeAgent expected keyword
    // so the default response {} is returned, which will fail Zod validation
    provider.setDefaultResponse({
      unstructured: "bad response",
      structured: { notAValidField: true },
    });

    const runner = new EvaluationRunner(provider);
    const result = await runner.runSingle({
      id: "test-error",
      name: "Error test",
      description: "Test agent error from validation failure",
      agentName: "IntakeAgent",
      input: { rawIdea: "test", businessGoal: "test", constraints: [], assumptions: [] },
      rubric: { requiredFields: [], qualityChecks: [], schemaConformance: true },
    });

    // When Zod validation fails, the agent returns success: false
    // The runner should grade it as fail
    expect(result.grade).toBe("fail");
  });

  it("handles unknown agent name", async () => {
    const provider = new FakeLLMProvider();
    const runner = new EvaluationRunner(provider);

    const result = await runner.runSingle({
      id: "test-unknown",
      name: "Unknown agent test",
      description: "Test unknown agent",
      agentName: "UnknownAgent" as any,
      input: {},
      rubric: { requiredFields: [], qualityChecks: [], schemaConformance: false },
    });

    expect(result.grade).toBe("fail");
    expect(result.error).toContain("Unknown agent");
  });
});

describe("Evaluation Cases Completeness", () => {
  it("has at least 25 total evaluation cases", () => {
    expect(ALL_EVALUATION_CASES.length).toBeGreaterThanOrEqual(25);
  });

  it("has at least 5 intake cases", () => {
    expect(intakeCases.length).toBeGreaterThanOrEqual(5);
  });

  it("has at least 5 critic cases", () => {
    expect(criticCases.length).toBeGreaterThanOrEqual(5);
  });

  it("has at least 5 architect cases", () => {
    expect(architectCases.length).toBeGreaterThanOrEqual(5);
  });

  it("has at least 5 dev cases", () => {
    expect(devCases.length).toBeGreaterThanOrEqual(5);
  });

  it("has at least 5 QA cases", () => {
    expect(qaCases.length).toBeGreaterThanOrEqual(5);
  });

  it("all cases have unique IDs", () => {
    const ids = ALL_EVALUATION_CASES.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("all cases have valid agent names", () => {
    const validAgents = ["IntakeAgent", "RequirementsCriticAgent", "ArchitectAgent", "DevAgent", "QaAgent"];
    for (const c of ALL_EVALUATION_CASES) {
      expect(validAgents).toContain(c.agentName);
    }
  });
});

describe("EvaluationRunResult Schema", () => {
  it("validates a complete run result", () => {
    const mockResult = {
      runId: "eval-123",
      timestamp: new Date().toISOString(),
      totalCases: 1,
      passed: 1,
      failed: 0,
      partial: 0,
      averageScore: 1,
      results: [{
        caseId: "test-001",
        caseName: "Test",
        agentName: "IntakeAgent",
        grade: "pass",
        score: 1,
        requiredFieldsPresent: {},
        qualityCheckResults: [],
        schemaConformance: { passed: true, errors: [] },
        output: {},
        durationMs: 100,
        timestamp: new Date().toISOString(),
      }],
      summaryByAgent: {
        IntakeAgent: { total: 1, passed: 1, averageScore: 1 },
      },
    };
    const result = EvaluationRunResult.safeParse(mockResult);
    expect(result.success).toBe(true);
  });
});