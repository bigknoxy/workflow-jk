/**
 * Cancellation Tests
 * Tests for workflow abort signal and cancellation.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { InlineWorkflowEngine } from "@workflow-jk/orchestration";
import { ActivityDependencies } from "@workflow-jk/orchestration";
import { createContainer, AppContainer } from "@workflow-jk/application";
import type { AppConfig } from "@workflow-jk/config";
import { ProjectIntakeRequest } from "@workflow-jk/contracts";

const testConfig: AppConfig = {
  port: 3000,
  host: "0.0.0.0",
  llmProvider: "fake",
  databaseUrl: undefined,
  otlpEndpoint: undefined,
  observabilityEnabled: false,
  prometheusPort: 9090,
  openaiBaseUrl: undefined,
  openaiApiKey: undefined,
  openaiModel: undefined,
  ollamaBaseUrl: undefined,
  ollamaModel: undefined,
  llmMaxRetries: 3,
  llmTimeoutMs: 60000,
  llmInitialDelayMs: 1000,
  workflowTimeoutMs: 3600000,
  agentTimeoutMs: 120000,
  idempotencyTtlSeconds: 86400,
};

const TEST_ORG_ID = "00000000-0000-0000-0000-000000000000" as unknown as any;

describe("Cancellation Tests", () => {
  let container: AppContainer;
  let activityDeps: ActivityDependencies;

  const validInput: ProjectIntakeRequest = {
    title: "Cancellation Test",
    rawIdea: "Test project",
    businessGoal: "Test goal",
    constraints: ["test"],
    assumptions: [],
  };

  beforeEach(() => {
    container = createContainer(testConfig);

    container.llmProvider.setDefaultResponse({
      unstructured: JSON.stringify({
        problemStatement: "test",
        targetUsers: "test",
        businessValue: "test",
        keyFeatures: [],
        constraints: [],
        assumptions: [],
        outOfScope: [],
        clarificationQuestions: [],
        identifiedRisks: [],
        missingConstraints: [],
        draftAcceptanceCriteria: [],
      }),
      structured: {},
    });
    container.llmProvider.setResponse("IntakeAgent", {
      unstructured: JSON.stringify({
        problemStatement: "test",
        targetUsers: "test",
        businessValue: "test",
        keyFeatures: [],
        constraints: [],
        assumptions: [],
        outOfScope: [],
      }),
      structured: {},
    });
    container.llmProvider.setResponse("RequirementsCriticAgent", {
      unstructured: JSON.stringify({
        clarificationQuestions: [],
        identifiedRisks: [],
        missingConstraints: [],
        assumptions: [],
        draftAcceptanceCriteria: [],
      }),
      structured: {},
    });

    activityDeps = {
      ...container,
      organizationId: TEST_ORG_ID,
    } as any;
  });

  describe("AbortSignal", () => {
    it("throws when signal is aborted before start", async () => {
      const engine = new InlineWorkflowEngine(
        activityDeps,
        container.workflowRepository,
        container.approvalRepository,
      );

      const abortController = new AbortController();
      abortController.abort();

      await expect(
        engine.start("test-project-id" as any, TEST_ORG_ID, validInput, undefined, abortController.signal),
      ).rejects.toThrow("Workflow cancelled");
    });

    it("throws when signal is aborted during start", async () => {
      const engine = new InlineWorkflowEngine(
        activityDeps,
        container.workflowRepository,
        container.approvalRepository,
      );

      const abortController = new AbortController();

      const startPromise = engine.start(
        "test-project-id" as any,
        TEST_ORG_ID,
        validInput,
        undefined,
        abortController.signal,
      );

      abortController.abort();

      await expect(startPromise).rejects.toThrow("Workflow cancelled");
    });
  });

  describe("cancel() method", () => {
    it("cancels a running workflow", async () => {
      const engine = new InlineWorkflowEngine(
        activityDeps,
        container.workflowRepository,
        container.approvalRepository,
      );

      const projectId = "cancel-test-project" as any;
      const runId = await engine.start(projectId, TEST_ORG_ID, validInput);

      await engine.cancel(runId as any, TEST_ORG_ID);

      const workflow = await container.workflowRepository.getById(runId, TEST_ORG_ID);
      expect(workflow?.state).toBe("Failed");
    });

    it("handles cancel on non-existent workflow", async () => {
      const engine = new InlineWorkflowEngine(
        activityDeps,
        container.workflowRepository,
        container.approvalRepository,
      );

      await expect(
        engine.cancel("non-existent" as any, TEST_ORG_ID),
      ).resolves.toBeUndefined();
    });
  });
});