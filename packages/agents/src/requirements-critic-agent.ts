import { z } from "zod";
import type { LLMProvider } from "@workflow-jk/adapters";
import type {
  RequirementsCriticAgentInput,
  AgentName,
} from "@workflow-jk/contracts";
import type { AgentDefinition } from "./agent-base";
import { createAgent } from "./agent-base";
import { buildRequirementsCriticPrompt, PROMPT_VERSIONS } from "./prompts";
import { getPromptVersion } from "./prompts/registry.js";

const RequirementsCriticOutputSchema = z.object({
  clarificationQuestions: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      category: z.enum(["ambiguity", "missing_constraint", "assumption", "risk"]),
    }),
  ),
  identifiedRisks: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      severity: z.enum(["low", "medium", "high"]),
      mitigation: z.string().optional(),
    }),
  ),
  missingConstraints: z.array(z.string()),
  assumptions: z.array(
    z.object({
      id: z.string(),
      assumption: z.string(),
      confidence: z.enum(["low", "medium", "high"]),
    }),
  ),
  draftAcceptanceCriteria: z.array(
    z.object({
      id: z.string(),
      criterion: z.string(),
      category: z.string(),
    }),
  ),
});

export type RequirementsCriticAgentOutput = z.infer<
  typeof RequirementsCriticOutputSchema
>;

// Input type for requirements critic - expects the brief structure
export type RequirementsCriticInput = {
  brief: {
    problemStatement: string;
    targetUsers: string;
    businessValue: string;
    keyFeatures: string[];
    constraints: string[];
    assumptions: string[];
    outOfScope: string[];
  };
};

// Input schema matching the brief structure
const RequirementsCriticAgentInputSchema = z.object({
  brief: z.object({
    problemStatement: z.string(),
    targetUsers: z.string(),
    businessValue: z.string(),
    keyFeatures: z.array(z.string()),
    constraints: z.array(z.string()),
    assumptions: z.array(z.string()),
    outOfScope: z.array(z.string()),
  }),
});

export const requirementsCriticAgentDefinition: AgentDefinition<
  RequirementsCriticInput,
  RequirementsCriticAgentOutput
> = {
  name: "RequirementsCriticAgent",
  promptVersion: getPromptVersion("RequirementsCriticAgent"),
  inputSchema: RequirementsCriticAgentInputSchema,
  outputSchema: RequirementsCriticOutputSchema,
  buildPrompt: (input) => buildRequirementsCriticPrompt(input),
  parseResponse: (raw) => {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  },
  policy: {
    temperature: 0.2,
    maxTokens: 3072,
  },
};

export function createRequirementsCriticAgent(provider: LLMProvider) {
  return createAgent(requirementsCriticAgentDefinition, provider);
}