import type { AgentName } from "@workflow-jk/contracts";
import { PROMPT_V1 } from "./v1.js";

export type PromptVersion = "1.0.0";

interface PromptEntry {
  version: PromptVersion;
  template: string;
}

const registry: Map<string, PromptEntry> = new Map();

function key(agentName: AgentName, version: PromptVersion): string {
  return `${agentName}:${version}`;
}

export function registerPrompt(agentName: AgentName, version: PromptVersion, template: string): void {
  registry.set(key(agentName, version), { version, template });
}

export function getPromptTemplate(agentName: AgentName, version: PromptVersion = "1.0.0"): string {
  const entry = registry.get(key(agentName, version));
  if (!entry) {
    throw new Error(`No prompt template registered for ${agentName} v${version}`);
  }
  return entry.template;
}

export function getPromptVersion(agentName: AgentName): PromptVersion {
  return "1.0.0";
}

export function listRegisteredPrompts(): Array<{ agentName: string; version: string }> {
  return Array.from(registry.keys()).map((k) => {
    const [agentName, version] = k.split(":");
    return { agentName, version };
  });
}

registerPrompt("IntakeAgent", "1.0.0", PROMPT_V1.intake);
registerPrompt("RequirementsCriticAgent", "1.0.0", PROMPT_V1.requirementsCritic);
registerPrompt("ArchitectAgent", "1.0.0", PROMPT_V1.architect);
registerPrompt("DevAgent", "1.0.0", PROMPT_V1.dev);
registerPrompt("QaAgent", "1.0.0", PROMPT_V1.qa);