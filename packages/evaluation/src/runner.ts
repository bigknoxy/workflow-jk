import type { LLMProvider } from "@workflow-jk/adapters";
import {
  createIntakeAgent,
  createRequirementsCriticAgent,
  createArchitectAgent,
  createDevAgent,
  createQaAgent,
} from "@workflow-jk/agents";
import type { AgentName } from "@workflow-jk/contracts";
import type { EvaluationCase, EvaluationResult, EvaluationRunResult } from "./schemas.js";
import { ArtifactQualityScorer } from "./scorer.js";

type AgentResult = import("@workflow-jk/contracts").AgentResult;
type AgentInvoker = (input: unknown) => Promise<AgentResult>;

function wrapAgent<I>(agentFn: (input: I) => Promise<AgentResult>): AgentInvoker {
  return (input: unknown) => agentFn(input as I);
}

const AGENT_FACTORIES: Record<string, (provider: LLMProvider) => AgentInvoker> = {
  IntakeAgent: (provider) => wrapAgent(createIntakeAgent(provider)),
  RequirementsCriticAgent: (provider) => wrapAgent(createRequirementsCriticAgent(provider)),
  ArchitectAgent: (provider) => wrapAgent(createArchitectAgent(provider)),
  DevAgent: (provider) => wrapAgent(createDevAgent(provider)),
  QaAgent: (provider) => wrapAgent(createQaAgent(provider)),
};

export class EvaluationRunner {
  private scorer: ArtifactQualityScorer;

  constructor(private provider: LLMProvider) {
    this.scorer = new ArtifactQualityScorer();
  }

  async runSingle(evalCase: EvaluationCase): Promise<EvaluationResult> {
    const startTimeMs = Date.now();
    const agentFactory = AGENT_FACTORIES[evalCase.agentName];

    if (!agentFactory) {
      return {
        caseId: evalCase.id,
        caseName: evalCase.name,
        agentName: evalCase.agentName,
        grade: "fail",
        score: 0,
        requiredFieldsPresent: {},
        qualityCheckResults: [],
        schemaConformance: { passed: false, errors: [`Unknown agent: ${evalCase.agentName}`] },
        output: null,
        durationMs: Date.now() - startTimeMs,
        timestamp: new Date().toISOString(),
        error: `Unknown agent: ${evalCase.agentName}`,
      };
    }

    try {
      const agent = agentFactory(this.provider);
      const result = await agent(evalCase.input);
      const durationMs = Date.now() - startTimeMs;

      if (!result.success) {
        return {
          caseId: evalCase.id,
          caseName: evalCase.name,
          agentName: evalCase.agentName,
          grade: "fail",
          score: 0,
          requiredFieldsPresent: {},
          qualityCheckResults: [],
          schemaConformance: { passed: false, errors: [result.error ?? "Agent returned failure"] },
          output: null,
          durationMs,
          timestamp: new Date().toISOString(),
          error: result.error,
        };
      }

      const output = result.output;
      const requiredFieldsPresent = this.scorer.checkRequiredFields(output, evalCase.rubric.requiredFields);
      const schemaResult = evalCase.rubric.schemaConformance
        ? this.scorer.checkSchemaConformance(output, evalCase.agentName)
        : { passed: true, errors: [] as string[] };
      const qualityCheckResults = this.scorer.runQualityChecks(output, evalCase.rubric.qualityChecks);

      const allFieldsPresent = Object.values(requiredFieldsPresent).every(Boolean);
      const allChecksPassed = qualityCheckResults.every((r) => r.passed);

      let score = 0;
      if (allFieldsPresent) score += 0.4;
      if (schemaResult.passed) score += 0.3;
      if (allChecksPassed) score += 0.3;

      let grade: "pass" | "fail" | "partial" = "fail";
      if (score >= 0.8) grade = "pass";
      else if (score >= 0.5) grade = "partial";

      return {
        caseId: evalCase.id,
        caseName: evalCase.name,
        agentName: evalCase.agentName,
        grade,
        score,
        requiredFieldsPresent,
        qualityCheckResults,
        schemaConformance: schemaResult,
        output,
        durationMs,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        caseId: evalCase.id,
        caseName: evalCase.name,
        agentName: evalCase.agentName,
        grade: "fail",
        score: 0,
        requiredFieldsPresent: {},
        qualityCheckResults: [],
        schemaConformance: { passed: false, errors: [(err as Error).message] },
        output: null,
        durationMs: Date.now() - startTimeMs,
        timestamp: new Date().toISOString(),
        error: (err as Error).message,
      };
    }
  }

  async runAll(cases: EvaluationCase[]): Promise<EvaluationRunResult> {
    const results: EvaluationResult[] = [];

    for (const evalCase of cases) {
      const result = await this.runSingle(evalCase);
      results.push(result);
    }

    const passed = results.filter((r) => r.grade === "pass").length;
    const failed = results.filter((r) => r.grade === "fail").length;
    const partial = results.filter((r) => r.grade === "partial").length;
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    const summaryByAgent: EvaluationRunResult["summaryByAgent"] = {};
    for (const r of results) {
      if (!summaryByAgent[r.agentName]) {
        summaryByAgent[r.agentName] = { total: 0, passed: 0, averageScore: 0 };
      }
      summaryByAgent[r.agentName].total++;
      if (r.grade === "pass") summaryByAgent[r.agentName].passed++;
      summaryByAgent[r.agentName].averageScore += r.score;
    }
    for (const agent of Object.keys(summaryByAgent)) {
      summaryByAgent[agent].averageScore /= summaryByAgent[agent].total;
    }

    return {
      runId: `eval-${Date.now()}`,
      timestamp: new Date().toISOString(),
      totalCases: cases.length,
      passed,
      failed,
      partial,
      averageScore,
      results,
      summaryByAgent,
    };
  }
}