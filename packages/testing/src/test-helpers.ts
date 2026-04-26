import { ArtifactUnion, ArtifactSearchQuery, ProjectId } from "@workflow-jk/contracts";
import { FakeLLMProvider } from "@workflow-jk/adapters";

export function createDeterministicFakeLLM(): FakeLLMProvider {
  const provider = new FakeLLMProvider();

  provider.setResponse("product analyst", {
    unstructured: JSON.stringify({
      problemStatement: "Teams need simple task tracking",
      targetUsers: "Small teams of 5-15 people",
      businessValue: "20% productivity improvement",
      keyFeatures: ["Kanban boards", "Real-time updates", "Mobile-first design"],
      constraints: ["Mobile-first", "Budget under $50k", "SSO integration"],
      assumptions: ["5-15 person teams", "Existing auth system"],
      outOfScope: ["Advanced analytics", "Time tracking"],
    }),
    structured: {
      problemStatement: "Teams need simple task tracking",
      targetUsers: "Small teams of 5-15 people",
      businessValue: "20% productivity improvement",
      keyFeatures: ["Kanban boards", "Real-time updates", "Mobile-first design"],
      constraints: ["Mobile-first", "Budget under $50k", "SSO integration"],
      assumptions: ["5-15 person teams", "Existing auth system"],
      outOfScope: ["Advanced analytics", "Time tracking"],
    },
  });

  provider.setResponse("requirements analyst", {
    unstructured: JSON.stringify({
      clarificationQuestions: [
        { id: "q1", question: "What SSO provider?", category: "missing_constraint" },
        { id: "q2", question: "Offline scope?", category: "ambiguity" },
      ],
      identifiedRisks: [
        { id: "r1", description: "Offline sync complexity", severity: "medium", mitigation: "Use CRDTs" },
      ],
      missingConstraints: ["SSO provider", "Offline data scope"],
      assumptions: [
        { id: "a1", assumption: "WebSocket for real-time", confidence: "medium" },
      ],
      draftAcceptanceCriteria: [
        { id: "ac1", criterion: "Users can create boards", category: "functional" },
      ],
    }),
    structured: {
      clarificationQuestions: [
        { id: "q1", question: "What SSO provider?", category: "missing_constraint" },
        { id: "q2", question: "Offline scope?", category: "ambiguity" },
      ],
      identifiedRisks: [
        { id: "r1", description: "Offline sync complexity", severity: "medium", mitigation: "Use CRDTs" },
      ],
      missingConstraints: ["SSO provider", "Offline data scope"],
      assumptions: [
        { id: "a1", assumption: "WebSocket for real-time", confidence: "medium" },
      ],
      draftAcceptanceCriteria: [
        { id: "ac1", criterion: "Users can create boards", category: "functional" },
      ],
    },
  });

  provider.setResponse("software architect", {
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
    structured: {
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
        impacts: [{ path: "/src", changeType: "create" as const, description: "New project" }],
      },
    },
  });

  provider.setResponse("expert developer", {
    unstructured: JSON.stringify({
      taskId: "t1",
      changes: [{ path: "src/index.ts", changeType: "create", description: "Entry point", diff: "+export {}" }],
      summary: "Implemented task",
      testResults: [{ testName: "test1", status: "pass" }],
    }),
    structured: {
      taskId: "t1",
      changes: [{ path: "src/index.ts", changeType: "create" as const, description: "Entry point", diff: "+export {}" }],
      summary: "Implemented task",
      testResults: [{ testName: "test1", status: "pass" as const }],
    },
  });

  provider.setResponse("QA engineer", {
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
    structured: {
      qaReport: {
        overallStatus: "pass",
        acResults: [{ acId: "ac1", status: "pass", evidence: "Verified" }],
        defects: [],
        summary: "All tests passed",
      },
      acMatrix: {
        criteria: [{ acId: "ac1", requirementId: "req1", description: "Test", status: "pass", evidence: "Verified" }],
      },
    },
  });

  return provider;
}