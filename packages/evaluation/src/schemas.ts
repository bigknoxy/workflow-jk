import { z } from "zod";
import { AgentName } from "@workflow-jk/contracts";

export const EvaluationGrade = z.enum(["pass", "fail", "partial"]);
export type EvaluationGrade = z.infer<typeof EvaluationGrade>;

export const EvaluationCase = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  agentName: AgentName,
  input: z.unknown(),
  rubric: z.object({
    requiredFields: z.array(z.string()).describe("Top-level fields that must be present in output"),
    qualityChecks: z.array(z.object({
      description: z.string(),
      check: z.string().describe("Description of what quality looks like for this check"),
      weight: z.number().min(0).max(1).default(1),
    })).default([]),
    schemaConformance: z.boolean().default(true).describe("Whether to validate output against agent output schema"),
  }),
  expectedOutputShape: z.unknown().optional().describe("Partial expected output for structural comparison"),
  tags: z.array(z.string()).default([]),
});

export type EvaluationCase = z.infer<typeof EvaluationCase>;

export const QualityCheckResult = z.object({
  description: z.string(),
  passed: z.boolean(),
  evidence: z.string(),
  weight: z.number(),
});

export type QualityCheckResult = z.infer<typeof QualityCheckResult>;

export const EvaluationResult = z.object({
  caseId: z.string(),
  caseName: z.string(),
  agentName: AgentName,
  grade: EvaluationGrade,
  score: z.number().min(0).max(1),
  requiredFieldsPresent: z.record(z.string(), z.boolean()),
  qualityCheckResults: z.array(QualityCheckResult),
  schemaConformance: z.object({
    passed: z.boolean(),
    errors: z.array(z.string()),
  }),
  output: z.unknown(),
  durationMs: z.number(),
  timestamp: z.string(),
  error: z.string().optional(),
});

export type EvaluationResult = z.infer<typeof EvaluationResult>;

export const EvaluationRunResult = z.object({
  runId: z.string(),
  timestamp: z.string(),
  totalCases: z.number(),
  passed: z.number(),
  failed: z.number(),
  partial: z.number(),
  averageScore: z.number(),
  results: z.array(EvaluationResult),
  summaryByAgent: z.record(z.string(), z.object({
    total: z.number(),
    passed: z.number(),
    averageScore: z.number(),
  })),
});

export type EvaluationRunResult = z.infer<typeof EvaluationRunResult>;