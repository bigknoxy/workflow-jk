import type {
  IntakeAgentInput,
  RequirementsCriticAgentInput,
  ArchitectAgentInput,
  DevAgentInput,
  QaAgentInput,
} from "@workflow-jk/contracts";
import { getPromptVersion } from "./prompts/registry.js";
import { sanitizePromptInput } from "./sanitize.js";

export const PROMPT_VERSIONS = {
  INTAKE: getPromptVersion("IntakeAgent"),
  REQUIREMENTS_CRITIC: getPromptVersion("RequirementsCriticAgent"),
  ARCHITECT: getPromptVersion("ArchitectAgent"),
  DEV: getPromptVersion("DevAgent"),
  QA: getPromptVersion("QaAgent"),
} as const;

export function buildIntakePrompt(input: {
  rawIdea: string;
  businessGoal: string;
  constraints: string[];
  assumptions: string[];
}): string {
  const sanitizedRawIdea = sanitizePromptInput(input.rawIdea);
  const sanitizedBusinessGoal = sanitizePromptInput(input.businessGoal);
  const sanitizedConstraints = input.constraints.map(sanitizePromptInput);
  const sanitizedAssumptions = input.assumptions.map(sanitizePromptInput);
  return `You are an expert product analyst. Analyze the following business idea and produce a structured brief.

RAW IDEA: ${sanitizedRawIdea}

BUSINESS GOAL: ${sanitizedBusinessGoal}

CONSTRAINTS: ${sanitizedConstraints.join(", ") || "None specified"}

ASSUMPTIONS: ${sanitizedAssumptions.join(", ") || "None provided"}

Produce a JSON object with these fields:
{
  "problemStatement": "Clear problem statement",
  "targetUsers": "Who will use this and why",
  "businessValue": "Quantifiable business value",
  "keyFeatures": ["Feature 1", "Feature 2", ...],
  "constraints": ["Constraint 1", ...],
  "assumptions": ["Assumption 1", ...],
  "outOfScope": ["Item 1", ...]
}

Respond with ONLY the JSON object, no markdown fences.`;
}

export function buildRequirementsCriticPrompt(input: {
  brief: {
    problemStatement: string;
    targetUsers: string;
    businessValue: string;
    keyFeatures: string[];
    constraints: string[];
    assumptions: string[];
    outOfScope: string[];
  };
}): string {
  const sanitize = (s: string) => sanitizePromptInput(s);
  return `You are a senior requirements analyst. Critically review this brief and identify gaps, ambiguities, and risks.

BRIEF:
- Problem: ${sanitize(input.brief.problemStatement)}
- Users: ${sanitize(input.brief.targetUsers)}
- Value: ${sanitize(input.brief.businessValue)}
- Features: ${input.brief.keyFeatures.map(sanitize).join(", ")}
- Constraints: ${input.brief.constraints.map(sanitize).join(", ")}
- Assumptions: ${input.brief.assumptions.map(sanitize).join(", ")}
- Out of Scope: ${input.brief.outOfScope.map(sanitize).join(", ")}

Produce a JSON object with these fields:
{
  "clarificationQuestions": [{"id": "q1", "question": "...", "category": "ambiguity|missing_constraint|assumption|risk"}],
  "identifiedRisks": [{"id": "r1", "description": "...", "severity": "low|medium|high", "mitigation": "..."}],
  "missingConstraints": ["..."],
  "assumptions": [{"id": "a1", "assumption": "...", "confidence": "low|medium|high"}],
  "draftAcceptanceCriteria": [{"id": "ac1", "criterion": "...", "category": "..."}]
}

Respond with ONLY the JSON object.`;
}

export function buildArchitectPrompt(input: {
  requirements: unknown;
  acceptanceCriteria: unknown;
  nonFunctionalRequirements: unknown;
  outOfScope: unknown;
}): string {
  return `You are a principal software architect. Design a comprehensive architecture based on the approved requirements.

REQUIREMENTS: ${JSON.stringify(input.requirements)}
ACCEPTANCE CRITERIA: ${JSON.stringify(input.acceptanceCriteria)}
NON-FUNCTIONAL REQUIREMENTS: ${JSON.stringify(input.nonFunctionalRequirements)}
OUT OF SCOPE: ${JSON.stringify(input.outOfScope)}

Produce a JSON object with these fields:
{
  "architecture": {
    "overview": "...",
    "decisions": [{"id": "ad1", "decision": "...", "rationale": "...", "alternatives": ["..."]}],
    "components": [{"name": "...", "responsibility": "...", "dependencies": ["..."]}],
    "dataFlow": "..."
  },
  "implementationPlan": {
    "phases": [{"name": "...", "tasks": ["..."], "estimatedEffort": "..."}]
  },
  "taskGraph": {
    "tasks": [{"id": "t1", "title": "...", "description": "...", "dependencies": [], "estimatedEffort": "...", "phase": "..."}]
  },
  "testStrategy": {
    "approach": "...",
    "levels": [{"level": "...", "description": "...", "coverage": "..."}],
    "environments": ["..."]
  },
  "repoImpactMap": {
    "impacts": [{"path": "...", "changeType": "create|modify|delete", "description": "..."}]
  }
}

Respond with ONLY the JSON object.`;
}

export function buildDevPrompt(input: {
  taskPack: {
    taskId: string;
    title: string;
    description: string;
    acceptanceCriteria: Array<{
      id: string;
      given: string;
      when: string;
      then: string;
    }>;
    context: string;
  };
}): string {
  const sanitize = (s: string) => sanitizePromptInput(s);
  return `You are an expert developer. Implement the following task.

TASK: ${sanitize(input.taskPack.title)} (${input.taskPack.taskId})
DESCRIPTION: ${sanitize(input.taskPack.description)}

ACCEPTANCE CRITERIA:
${input.taskPack.acceptanceCriteria.map(
  (ac) => `- [${ac.id}] Given ${sanitize(ac.given)}, When ${sanitize(ac.when)}, Then ${sanitize(ac.then)}`
).join("\n")}

CONTEXT: ${sanitize(input.taskPack.context)}

Produce a JSON object:
{
  "taskId": "${input.taskPack.taskId}",
  "changes": [{"path": "...", "changeType": "create|modify|delete", "description": "...", "diff": "..."}],
  "summary": "...",
  "testResults": [{"testName": "...", "status": "pass|fail|skip", "message": "..."}]
}

Respond with ONLY the JSON object.`;
}

export function buildQaPrompt(input: {
  devResult: unknown;
  taskPack: {
    taskId: string;
    title: string;
    acceptanceCriteria: Array<{
      id: string;
      given: string;
      when: string;
      then: string;
    }>;
  };
  testStrategy: unknown;
}): string {
  return `You are a QA engineer. Review the development result against acceptance criteria.

DEV RESULT: ${JSON.stringify(input.devResult)}
TASK: ${input.taskPack.title} (${input.taskPack.taskId})
ACCEPTANCE CRITERIA: ${JSON.stringify(input.taskPack.acceptanceCriteria)}
TEST STRATEGY: ${JSON.stringify(input.testStrategy)}

Produce a JSON object:
{
  "qaReport": {
    "overallStatus": "pass|fail|partial",
    "acResults": [{"acId": "...", "status": "pass|fail|not_tested", "evidence": "..."}],
    "defects": [{"id": "...", "description": "...", "severity": "blocker|critical|major|minor", "relatedAcId": "..."}],
    "summary": "..."
  },
  "acMatrix": {
    "criteria": [{"acId": "...", "requirementId": "...", "description": "...", "status": "pass|fail|not_tested|not_applicable", "evidence": "..."}]
  }
}

Respond with ONLY the JSON object.`;
}