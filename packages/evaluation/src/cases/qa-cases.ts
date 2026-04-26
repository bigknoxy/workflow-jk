import type { EvaluationCase } from "../schemas.js";
import type { QaAgentInput } from "@workflow-jk/contracts";
import { SAMPLE_DEV_RESULT_CONTENT, SAMPLE_TEST_STRATEGY_CONTENT } from "@workflow-jk/testing";

const QA_PASS_INPUT: QaAgentInput = {
  devResult: SAMPLE_DEV_RESULT_CONTENT,
  taskPack: {
    taskId: "task-1",
    title: "Project Setup",
    acceptanceCriteria: [
      { id: "ac-1", given: "A developer clones the repo", when: "They run npm install", then: "All dependencies install successfully" },
      { id: "ac-2", given: "The project is set up", when: "They run npm test", then: "Test suite runs and passes" },
    ],
  },
  testStrategy: SAMPLE_TEST_STRATEGY_CONTENT,
};

export const qaCases: EvaluationCase[] = [
  {
    id: "qa-001",
    name: "Passing dev result produces pass report",
    description: "When dev result passes all ACs, QA should produce a passing report",
    agentName: "QaAgent",
    input: QA_PASS_INPUT,
    rubric: {
      requiredFields: ["qaReport", "acMatrix"],
      qualityChecks: [
        { description: "QA report present", check: "has_qaReport", weight: 1 },
        { description: "AC matrix present", check: "has_acMatrix", weight: 1 },
        { description: "QA report has overall status", check: "has_qaReport", weight: 0.8 },
        { description: "AC results present", check: "custom:check_qaReport_acResults", weight: 0.8 },
        { description: "Summary present", check: "custom:check_qaReport_summary", weight: 0.8 },
      ],
      schemaConformance: true,
    },
    tags: ["qa", "smoke"],
  },
  {
    id: "qa-002",
    name: "QA report includes AC results for each criterion",
    description: "QA should produce AC results that map back to each acceptance criterion",
    agentName: "QaAgent",
    input: QA_PASS_INPUT,
    rubric: {
      requiredFields: ["qaReport", "acMatrix"],
      qualityChecks: [
        { description: "QA report has AC results", check: "has_qaReport", weight: 1 },
        { description: "AC matrix has criteria", check: "has_acMatrix", weight: 1 },
      ],
      schemaConformance: true,
    },
    tags: ["qa"],
  },
  {
    id: "qa-003",
    name: "Failed dev result produces fail report with defects",
    description: "When dev result has failing tests, QA should flag defects",
    agentName: "QaAgent",
    input: {
      devResult: {
        taskId: "task-2",
        changes: [
          { path: "src/server.ts", changeType: "create" as const, description: "HTTP server", diff: "+import express from 'express';" },
        ],
        summary: "Partial implementation with failing tests",
        testResults: [
          { testName: "server starts", status: "pass" as const },
          { testName: "health endpoint responds", status: "fail" as const, message: "Expected 200, got 500" },
        ],
      },
      taskPack: {
        taskId: "task-2",
        title: "API Implementation",
        acceptanceCriteria: [
          { id: "ac-api-1", given: "Server running", when: "GET /health", then: "Returns 200 OK" },
          { id: "ac-api-2", given: "Server running", when: "POST /tasks", then: "Returns 201 with created task" },
        ],
      },
      testStrategy: SAMPLE_TEST_STRATEGY_CONTENT,
    } satisfies QaAgentInput,
    rubric: {
      requiredFields: ["qaReport", "acMatrix"],
      qualityChecks: [
        { description: "QA report has AC results", check: "has_qaReport", weight: 1 },
        { description: "AC matrix has criteria", check: "has_acMatrix", weight: 1 },
        { description: "Defects listed when failures", check: "custom:check_qaReport_defects_or_fail_status", weight: 0.8 },
      ],
      schemaConformance: true,
    },
    tags: ["qa", "failure"],
  },
  {
    id: "qa-004",
    name: "QA report severity levels are valid",
    description: "Defects should have valid severity levels (blocker, critical, major, minor)",
    agentName: "QaAgent",
    input: QA_PASS_INPUT,
    rubric: {
      requiredFields: ["qaReport", "acMatrix"],
      qualityChecks: [
        { description: "QA report present", check: "has_qaReport", weight: 1 },
        { description: "AC matrix present", check: "has_acMatrix", weight: 1 },
      ],
      schemaConformance: true,
    },
    tags: ["qa"],
  },
  {
    id: "qa-005",
    name: "Multiple AC criteria mapped to requirements",
    description: "AC matrix should map each AC back to its requirement",
    agentName: "QaAgent",
    input: {
      devResult: {
        taskId: "task-3",
        changes: [
          { path: "src/auth.ts", changeType: "create" as const, description: "Auth module", diff: "+export const authenticate = () => {}" },
        ],
        summary: "Implemented authentication module with SSO integration",
        testResults: [
          { testName: "auth login flow", status: "pass" as const },
          { testName: "token refresh", status: "pass" as const },
        ],
      },
      taskPack: {
        taskId: "task-3",
        title: "SSO Authentication",
        acceptanceCriteria: [
          { id: "ac-auth-1", given: "User clicks Sign In", when: "Auth0 authenticates", then: "User logged in within 2 seconds" },
          { id: "ac-auth-2", given: "Token expires", when: "User makes request", then: "Token is refreshed automatically" },
        ],
      },
      testStrategy: SAMPLE_TEST_STRATEGY_CONTENT,
    } satisfies QaAgentInput,
    rubric: {
      requiredFields: ["qaReport", "acMatrix"],
      qualityChecks: [
        { description: "QA report present", check: "has_qaReport", weight: 1 },
        { description: "AC matrix has criteria mapping", check: "has_acMatrix", weight: 1 },
        { description: "Summary present", check: "custom:check_qaReport_summary", weight: 0.8 },
      ],
      schemaConformance: true,
    },
    tags: ["qa", "auth"],
  },
];