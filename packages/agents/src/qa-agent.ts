import { z } from "zod";
import type { LLMProvider } from "@workflow-jk/adapters";
import { QaAgentInput, QaAgentOutput, type AgentName } from "@workflow-jk/contracts";
import type { AgentDefinition } from "./agent-base";
import { createAgent } from "./agent-base";
import { buildQaPrompt, PROMPT_VERSIONS } from "./prompts";
import { getPromptVersion } from "./prompts/registry.js";

const QaAgentOutputSchema = z.object({
  qaReport: z.object({
    overallStatus: z.enum(["pass", "fail", "partial"]),
    acResults: z.array(
      z.object({
        acId: z.string(),
        status: z.enum(["pass", "fail", "not_tested"]),
        evidence: z.string(),
      }),
    ),
    defects: z.array(
      z.object({
        id: z.string(),
        description: z.string(),
        severity: z.enum(["blocker", "critical", "major", "minor"]),
        relatedAcId: z.string().optional(),
      }),
    ),
    summary: z.string(),
  }),
  acMatrix: z.object({
    criteria: z.array(
      z.object({
        acId: z.string(),
        requirementId: z.string(),
        description: z.string(),
        status: z.enum(["pass", "fail", "not_tested", "not_applicable"]),
        evidence: z.string(),
      }),
    ),
  }),
});

// Use the type from contracts, but keep local schema for parsing
export type { QaAgentOutput };

export const qaAgentDefinition: AgentDefinition<QaAgentInput, QaAgentOutput> = {
  name: "QaAgent",
  promptVersion: getPromptVersion("QaAgent"),
  inputSchema: QaAgentInput,
  outputSchema: QaAgentOutputSchema,
  buildPrompt: (input) => buildQaPrompt(input as Parameters<typeof buildQaPrompt>[0]),
  parseResponse: (raw) => {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  },
  policy: {
    temperature: 0.1,
    maxTokens: 3072,
  },
};

export function createQaAgent(provider: LLMProvider) {
  return createAgent(qaAgentDefinition, provider);
}