import type { EvaluationCase } from "../schemas.js";
import type { ArchitectAgentInput } from "@workflow-jk/contracts";
import { SAMPLE_REQUIREMENTS_CONTENT, SAMPLE_ACCEPTANCE_CRITERIA_CONTENT } from "@workflow-jk/testing";

const NFR_CONTENT = {
  requirements: [
    { id: "nfr-1", category: "performance" as const, description: "Page loads under 3 seconds", metric: "P95 latency", target: "<3s" },
    { id: "nfr-2", category: "security" as const, description: "All data encrypted at rest and in transit", metric: "Encryption coverage", target: "100%" },
    { id: "nfr-3", category: "reliability" as const, description: "99.9% uptime", metric: "Availability", target: "99.9%" },
  ],
};

const OUT_OF_SCOPE_CONTENT = {
  items: [
    { description: "Advanced analytics dashboard", reason: "Post-MVP" },
    { description: "Time tracking", reason: "Not core to task tracking" },
  ],
};

const ARCHITECT_INPUT: ArchitectAgentInput = {
  requirements: SAMPLE_REQUIREMENTS_CONTENT,
  acceptanceCriteria: SAMPLE_ACCEPTANCE_CRITERIA_CONTENT,
  nonFunctionalRequirements: NFR_CONTENT,
  outOfScope: OUT_OF_SCOPE_CONTENT,
};

export const architectCases: EvaluationCase[] = [
  {
    id: "architect-001",
    name: "Standard requirements produce complete architecture",
    description: "Standard requirements set should produce architecture with all sub-artifacts",
    agentName: "ArchitectAgent",
    input: ARCHITECT_INPUT,
    rubric: {
      requiredFields: ["architecture", "implementationPlan", "taskGraph", "testStrategy", "repoImpactMap"],
      qualityChecks: [
        { description: "Architecture has overview", check: "has_architecture", weight: 1 },
        { description: "Architecture has decisions", check: "custom:check_nested_array_length_architecture_decisions_gte_2", weight: 0.8 },
        { description: "Architecture has components", check: "has_architecture", weight: 0.8 },
        { description: "Task graph has tasks", check: "has_taskGraph", weight: 1 },
        { description: "Test strategy defined", check: "has_testStrategy", weight: 1 },
        { description: "Repo impact map defined", check: "has_repoImpactMap", weight: 0.8 },
      ],
      schemaConformance: true,
    },
    tags: ["architect", "smoke"],
  },
  {
    id: "architect-002",
    name: "Architecture contains data flow description",
    description: "Architecture output should include a data flow description",
    agentName: "ArchitectAgent",
    input: ARCHITECT_INPUT,
    rubric: {
      requiredFields: ["architecture", "implementationPlan", "taskGraph", "testStrategy", "repoImpactMap"],
      qualityChecks: [
        { description: "Architecture overview is substantive", check: "has_architecture", weight: 1 },
        { description: "Data flow described", check: "custom:check_architecture_dataFlow", weight: 0.8 },
        { description: "Implementation phases defined", check: "has_implementationPlan", weight: 1 },
        { description: "Test environments specified", check: "has_testStrategy", weight: 0.8 },
      ],
      schemaConformance: true,
    },
    tags: ["architect"],
  },
  {
    id: "architect-003",
    name: "Architecture decisions include alternatives",
    description: "Each architecture decision should include alternative options considered",
    agentName: "ArchitectAgent",
    input: ARCHITECT_INPUT,
    rubric: {
      requiredFields: ["architecture", "implementationPlan", "taskGraph"],
      qualityChecks: [
        { description: "Architecture decisions present", check: "has_architecture", weight: 1 },
        { description: "Task graph has tasks", check: "has_taskGraph", weight: 1 },
        { description: "Implementation plan defined", check: "has_implementationPlan", weight: 1 },
      ],
      schemaConformance: true,
    },
    tags: ["architect"],
  },
  {
    id: "architect-004",
    name: "Task graph has dependencies",
    description: "Task graph tasks should reference dependencies between each other",
    agentName: "ArchitectAgent",
    input: ARCHITECT_INPUT,
    rubric: {
      requiredFields: ["architecture", "taskGraph", "testStrategy"],
      qualityChecks: [
        { description: "Task graph present", check: "has_taskGraph", weight: 1 },
        { description: "Architecture present", check: "has_architecture", weight: 1 },
        { description: "Repo impact map present", check: "has_repoImpactMap", weight: 0.8 },
      ],
      schemaConformance: true,
    },
    tags: ["architect"],
  },
  {
    id: "architect-005",
    name: "NFR requirements influence architecture",
    description: "Architecture should address non-functional requirements like security and performance",
    agentName: "ArchitectAgent",
    input: {
      requirements: {
        requirements: [
          { id: "req-1", title: "High-Performance API", description: "API must handle 10K requests per second", priority: "must" as const, category: "performance" },
          { id: "req-2", title: "Encryption at Rest", description: "All data must be encrypted at rest", priority: "must" as const, category: "security" },
        ],
      },
      acceptanceCriteria: {
        criteria: [
          { id: "ac-1", requirementId: "req-1", given: "Load test with 10K rps", when: "Requests are sent", then: "P99 latency under 100ms" },
          { id: "ac-2", requirementId: "req-2", given: "Data stored in database", when: "Data is at rest", then: "Data is encrypted with AES-256" },
        ],
      },
      nonFunctionalRequirements: NFR_CONTENT,
      outOfScope: OUT_OF_SCOPE_CONTENT,
    } satisfies ArchitectAgentInput,
    rubric: {
      requiredFields: ["architecture", "implementationPlan", "taskGraph", "testStrategy", "repoImpactMap"],
      qualityChecks: [
        { description: "Architecture addresses NFRs", check: "has_architecture", weight: 1 },
        { description: "All sub-artifacts present", check: "has_taskGraph", weight: 1 },
        { description: "Test strategy covers NFRs", check: "has_testStrategy", weight: 1 },
      ],
      schemaConformance: true,
    },
    tags: ["architect", "nfr"],
  },
];