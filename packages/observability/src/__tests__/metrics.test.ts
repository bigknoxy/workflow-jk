import { describe, it, expect, beforeEach } from "vitest";
import {
  setupMetrics,
  shutdownMetrics,
  getInstruments,
  getActiveWorkflowCount,
  incrementActiveWorkflows,
  decrementActiveWorkflows,
  MetricAttributes,
} from "../metrics";

describe("Metrics instruments", () => {
  beforeEach(async () => {
    await shutdownMetrics();
  });

  it("should create 5 instruments via getInstruments", () => {
    setupMetrics();
    const instruments = getInstruments();
    expect(instruments).toHaveProperty("workflowStartedTotal");
    expect(instruments).toHaveProperty("workflowDuration");
    expect(instruments).toHaveProperty("agentInvocationsTotal");
    expect(instruments).toHaveProperty("approvalDecisionsTotal");
    expect(instruments).toHaveProperty("activeWorkflowsGauge");
  });

  it("should track active workflow count", () => {
    expect(getActiveWorkflowCount()).toBe(0);
    incrementActiveWorkflows();
    expect(getActiveWorkflowCount()).toBe(1);
    incrementActiveWorkflows();
    expect(getActiveWorkflowCount()).toBe(2);
    decrementActiveWorkflows();
    expect(getActiveWorkflowCount()).toBe(1);
  });

  it("should not decrement below zero", () => {
    decrementActiveWorkflows();
    expect(getActiveWorkflowCount()).toBe(0);
  });

  it("should increment workflowStartedTotal counter", () => {
    setupMetrics();
    const instruments = getInstruments();
    expect(() =>
      instruments.workflowStartedTotal.add(1, {
        [MetricAttributes.PROJECT_ID]: "test-project",
      })
    ).not.toThrow();
  });

  it("should record workflowDuration histogram", () => {
    setupMetrics();
    const instruments = getInstruments();
    expect(() =>
      instruments.workflowDuration.record(1500, {
        [MetricAttributes.PROJECT_ID]: "test-project",
      })
    ).not.toThrow();
  });

  it("should increment approvalDecisionsTotal with decision attribute", () => {
    setupMetrics();
    const instruments = getInstruments();
    expect(() =>
      instruments.approvalDecisionsTotal.add(1, {
        [MetricAttributes.DECISION]: "approved",
        [MetricAttributes.ARTIFACT_TYPE]: "requirements",
      })
    ).not.toThrow();
  });

  it("should expose MetricAttributes with new keys", () => {
    expect(MetricAttributes.DECISION).toBe("workflow.approval_decision");
    expect(MetricAttributes.ARTIFACT_TYPE).toBe("workflow.artifact_type");
  });
});