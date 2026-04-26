import { z, ZodSchema } from "zod";
import type { LLMProvider } from "@workflow-jk/adapters";
import type {
  IntakeAgentInput,
  AgentName,
} from "@workflow-jk/contracts";
import type { AgentDefinition } from "./agent-base";
import { createAgent } from "./agent-base";
import { buildIntakePrompt, PROMPT_VERSIONS } from "./prompts";
import { getPromptVersion } from "./prompts/registry.js";

const IntakeAgentOutputSchema = z.object({
  problemStatement: z.string(),
  targetUsers: z.string(),
  businessValue: z.string(),
  keyFeatures: z.array(z.string()),
  constraints: z.array(z.string()),
  assumptions: z.array(z.string()),
  outOfScope: z.array(z.string()),
});

export type IntakeAgentOutput = z.infer<typeof IntakeAgentOutputSchema>;

export const intakeAgentDefinition: AgentDefinition<IntakeAgentInput, IntakeAgentOutput> = {
  name: "IntakeAgent",
  promptVersion: getPromptVersion("IntakeAgent"),
  inputSchema: z.object({
    rawIdea: z.string(),
    businessGoal: z.string(),
    constraints: z.array(z.string()),
    assumptions: z.array(z.string()),
  }),
  outputSchema: IntakeAgentOutputSchema,
  buildPrompt: (input) => buildIntakePrompt(input),
  parseResponse: (raw, _input) => {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  },
  policy: {
    temperature: 0.3,
    maxTokens: 2048,
  },
};

export function createIntakeAgent(provider: LLMProvider) {
  return createAgent(intakeAgentDefinition, provider);
}