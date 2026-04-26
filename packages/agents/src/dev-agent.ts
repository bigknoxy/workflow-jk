import { z } from "zod";
import type { LLMProvider } from "@workflow-jk/adapters";
import { DevAgentInput, DevAgentOutput, type AgentName } from "@workflow-jk/contracts";
import type { AgentDefinition } from "./agent-base";
import { createAgent } from "./agent-base";
import { buildDevPrompt, PROMPT_VERSIONS } from "./prompts";
import { getPromptVersion } from "./prompts/registry.js";

const DevAgentOutputSchema = z.object({
  taskId: z.string(),
  changes: z.array(
    z.object({
      path: z.string(),
      changeType: z.enum(["create", "modify", "delete"]),
      description: z.string(),
      diff: z.string(),
    }),
  ),
  summary: z.string(),
  testResults: z.array(
    z.object({
      testName: z.string(),
      status: z.enum(["pass", "fail", "skip"]),
      message: z.string().optional(),
    }),
  ),
});

// Use the type from contracts, but keep local schema for parsing
export type { DevAgentOutput };

export const devAgentDefinition: AgentDefinition<DevAgentInput, DevAgentOutput> = {
  name: "DevAgent",
  promptVersion: getPromptVersion("DevAgent"),
  inputSchema: DevAgentInput,
  outputSchema: DevAgentOutputSchema,
  buildPrompt: (input) => buildDevPrompt(input as Parameters<typeof buildDevPrompt>[0]),
  parseResponse: (raw) => {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  },
  policy: {
    temperature: 0.2,
    maxTokens: 4096,
  },
};

export function createDevAgent(provider: LLMProvider) {
  return createAgent(devAgentDefinition, provider);
}