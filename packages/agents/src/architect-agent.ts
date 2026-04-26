import { z } from "zod";
import type { LLMProvider } from "@workflow-jk/adapters";
import {
  ArchitectAgentInput,
  ArchitectAgentOutput,
  type AgentName,
} from "@workflow-jk/contracts";
import type { AgentDefinition } from "./agent-base";
import { createAgent } from "./agent-base";
import { buildArchitectPrompt, PROMPT_VERSIONS } from "./prompts";
import { getPromptVersion } from "./prompts/registry.js";

const ArchitectAgentOutputSchema = z.object({
  architecture: z.object({
    overview: z.string(),
    decisions: z.array(
      z.object({
        id: z.string(),
        decision: z.string(),
        rationale: z.string(),
        alternatives: z.array(z.string()),
      }),
    ),
    components: z.array(
      z.object({
        name: z.string(),
        responsibility: z.string(),
        dependencies: z.array(z.string()),
      }),
    ),
    dataFlow: z.string(),
  }),
  implementationPlan: z.object({
    phases: z.array(
      z.object({
        name: z.string(),
        tasks: z.array(z.string()),
        estimatedEffort: z.string(),
      }),
    ),
  }),
  taskGraph: z.object({
    tasks: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        dependencies: z.array(z.string()),
        estimatedEffort: z.string(),
        phase: z.string(),
      }),
    ),
  }),
  testStrategy: z.object({
    approach: z.string(),
    levels: z.array(
      z.object({
        level: z.string(),
        description: z.string(),
        coverage: z.string(),
      }),
    ),
    environments: z.array(z.string()),
  }),
  repoImpactMap: z.object({
    impacts: z.array(
      z.object({
        path: z.string(),
        changeType: z.enum(["create", "modify", "delete"]),
        description: z.string(),
      }),
    ),
  }),
});

// Use the type from contracts, but keep local schema for parsing
export type { ArchitectAgentOutput };

export const architectAgentDefinition: AgentDefinition<
  ArchitectAgentInput,
  ArchitectAgentOutput
> = {
  name: "ArchitectAgent",
  promptVersion: getPromptVersion("ArchitectAgent"),
  inputSchema: ArchitectAgentInput,
  outputSchema: ArchitectAgentOutputSchema,
  buildPrompt: (input) =>
    buildArchitectPrompt(input as Parameters<typeof buildArchitectPrompt>[0]),
  parseResponse: (raw) => {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  },
  policy: {
    temperature: 0.3,
    maxTokens: 4096,
  },
};

export function createArchitectAgent(provider: LLMProvider) {
  return createAgent(architectAgentDefinition, provider);
}