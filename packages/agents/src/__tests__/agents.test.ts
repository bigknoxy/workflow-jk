import { describe, it, expect } from "vitest";
import { createIntakeAgent, createRequirementsCriticAgent, createArchitectAgent, createDevAgent, createQaAgent } from "../index";
import { FakeLLMProvider } from "@workflow-jk/adapters";
import { createDeterministicFakeLLM } from "@workflow-jk/testing";
import { IntakeAgentInput } from "@workflow-jk/contracts";

describe("IntakeAgent with FakeLLM", () => {
  it("produces valid intake output with JSON response", async () => {
    const provider = new FakeLLMProvider();
    // Set JSON response for the agent to parse
    provider.setResponse("brief", {
      unstructured: JSON.stringify({
        problemStatement: "Teams need simple task tracking",
        targetUsers: "Small teams of 5-15 people",
        businessValue: "20% productivity improvement",
        keyFeatures: ["Kanban boards", "Real-time updates"],
        constraints: ["Mobile-first"],
        assumptions: ["5-15 person teams"],
        outOfScope: ["Advanced analytics"],
      }),
      structured: {},
    });
    provider.setDefaultResponse({
      unstructured: JSON.stringify({
        problemStatement: "Default",
        targetUsers: "Default",
        businessValue: "Default",
        keyFeatures: [],
        constraints: [],
        assumptions: [],
        outOfScope: [],
      }),
      structured: {},
    });

    const agent = createIntakeAgent(provider);
    const result = await agent({
      rawIdea: "A task tracker",
      businessGoal: "Productivity",
      constraints: [],
      assumptions: [],
    });

    expect(result.success).toBe(true);
    expect(result.output).toBeTruthy();
    expect((result.output as any)?.problemStatement).toBe("Teams need simple task tracking");
  });
});

describe("RequirementsCriticAgent with FakeLLM", () => {
  it("produces critique successfully", async () => {
    const provider = new FakeLLMProvider();
    // Provide default JSON that will be returned for any prompt
    provider.setDefaultResponse({
      unstructured: JSON.stringify({
        clarificationQuestions: [
          { id: "q1", question: "What SSO provider?", category: "missing_constraint" },
        ],
        identifiedRisks: [
          { id: "r1", description: "Offline sync complexity", severity: "medium", mitigation: "Use CRDTs" },
        ],
        missingConstraints: ["SSO provider"],
        assumptions: [
          { id: "a1", assumption: "WebSocket for real-time", confidence: "medium" },
        ],
        draftAcceptanceCriteria: [
          { id: "ac1", criterion: "Users can create boards", category: "functional" },
        ],
      }),
      structured: {},
    });

    const agent = createRequirementsCriticAgent(provider);
    const result = await agent({
      brief: {
        problemStatement: "P",
        targetUsers: "U",
        businessValue: "V",
        keyFeatures: ["F"],
        constraints: ["C"],
        assumptions: ["A"],
        outOfScope: ["O"],
      },
    });
    expect(result.success).toBe(true);
    expect(result.output).toBeTruthy();
  });
});

describe("ArchitectAgent with FakeLLM", () => {
  it("produces architecture artifacts successfully", async () => {
    const provider = new FakeLLMProvider();
    provider.setDefaultResponse({
      unstructured: JSON.stringify({
        architecture: {
          overview: "React/TypeScript frontend, Node.js backend",
          decisions: [{ id: "ad1", decision: "React frontend", rationale: "Team expertise", alternatives: ["Vue"] }],
          components: [{ name: "API", responsibility: "REST API", dependencies: ["DB"] }],
          dataFlow: "Client → API → DB",
        },
        implementationPlan: {
          phases: [{ name: "Foundation", tasks: ["Setup", "Auth"], estimatedEffort: "3 days" }],
        },
        taskGraph: {
          tasks: [
            { id: "t1", title: "Setup", description: "Project setup", dependencies: [], estimatedEffort: "1 day", phase: "setup" },
            { id: "t2", title: "Core", description: "Core features", dependencies: ["t1"], estimatedEffort: "3 days", phase: "core" },
          ],
        },
        testStrategy: {
          approach: "Test pyramid",
          levels: [{ level: "unit", description: "Unit tests", coverage: "80%" }],
          environments: ["dev", "staging"],
        },
        repoImpactMap: {
          impacts: [{ path: "/src", changeType: "create", description: "New project" }],
        },
      }),
      structured: {},
    });

    const agent = createArchitectAgent(provider);
    const result = await agent({
      requirements: { requirements: [] },
      acceptanceCriteria: { criteria: [] },
      nonFunctionalRequirements: { requirements: [] },
      outOfScope: { items: [] },
    });
    expect(result.success).toBe(true);
    expect(result.output).toBeTruthy();
  });
});

describe("DevAgent with FakeLLM", () => {
  it("produces dev execution result successfully", async () => {
    const provider = new FakeLLMProvider();
    // Use default response that returns valid JSON for any prompt
    provider.setDefaultResponse({
      unstructured: JSON.stringify({
        taskId: "t1",
        changes: [{ path: "src/index.ts", changeType: "create", description: "Entry point", diff: "+export {}" }],
        summary: "Implemented task",
        testResults: [{ testName: "test1", status: "pass" }],
      }),
      structured: {},
    });

    const agent = createDevAgent(provider);
    const result = await agent({
      taskPack: {
        taskId: "t1",
        title: "Setup",
        description: "Project setup",
        acceptanceCriteria: [{ id: "ac1", given: "G", when: "W", then: "T" }],
        context: "Setup phase",
      },
      context: "Setup phase",
    });
    expect(result.success).toBe(true);
    expect(result.output).toBeTruthy();
  });
});

describe("QaAgent with FakeLLM", () => {
  it("produces QA report successfully", async () => {
    const provider = new FakeLLMProvider();
    provider.setDefaultResponse({
      unstructured: JSON.stringify({
        qaReport: {
          overallStatus: "pass",
          acResults: [{ acId: "ac1", status: "pass", evidence: "Verified" }],
          defects: [],
          summary: "All tests passed",
        },
        acMatrix: {
          criteria: [{ acId: "ac1", requirementId: "req1", description: "Test", status: "pass", evidence: "Verified" }],
        },
      }),
      structured: {},
    });

    const agent = createQaAgent(provider);
    const result = await agent({
      devResult: { taskId: "t1", changes: [], summary: "S", testResults: [] },
      taskPack: { taskId: "t1", title: "Setup", acceptanceCriteria: [] },
      testStrategy: { approach: "Test pyramid", levels: [], environments: [] },
    });
    expect(result.success).toBe(true);
    expect(result.output).toBeTruthy();
  });
});

describe("Agent error handling", () => {
  it("handles invalid input schema", async () => {
    const provider = new FakeLLMProvider();
    provider.setDefaultResponse({
      unstructured: "{}",
      structured: {},
    });

    const agent = createIntakeAgent(provider);
    // Missing required fields - should throw ValidationError
    // Note: Zod validation happens inside the agent
    const result = await agent({
      rawIdea: "", // empty - violates min(1)
      businessGoal: "Goal",
      constraints: [],
      assumptions: [],
    } as any);

    // With invalid input, the agent should fail gracefully
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("handles JSON parse errors", async () => {
    const provider = new FakeLLMProvider();
    // Return invalid JSON
    provider.setResponse("brief", {
      unstructured: "not valid json",
      structured: {},
    });
    provider.setDefaultResponse({
      unstructured: "not valid json",
      structured: {},
    });

    const agent = createIntakeAgent(provider);
    const result = await agent({
      rawIdea: "A task tracker",
      businessGoal: "Productivity",
      constraints: [],
      assumptions: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("Agent timing", () => {
  it("records duration", async () => {
    const provider = new FakeLLMProvider();
    provider.setDefaultResponse({
      unstructured: "{}",
      structured: {},
    });

    const agent = createIntakeAgent(provider);
    const result = await agent({
      rawIdea: "Test idea",
      businessGoal: "Goal",
      constraints: [],
      assumptions: [],
    });

    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});