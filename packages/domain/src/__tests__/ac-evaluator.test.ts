import { describe, it, expect } from "vitest";
import { evaluateAcResults, determineReworkTasks, determineReworkScope, TaskGraph } from "../ac-evaluator";

describe("evaluateAcResults", () => {
  it("returns allPassed when everything passes", () => {
    const result = evaluateAcResults(
      {
        overallStatus: "pass",
        acResults: [{ acId: "ac1", status: "pass", evidence: "OK" }],
        defects: [],
        summary: "Pass",
      },
      {
        criteria: [
          { acId: "ac1", requirementId: "r1", description: "Test", status: "pass", evidence: "OK" },
        ],
      },
    );
    expect(result.allPassed).toBe(true);
    expect(result.passedAcIds).toEqual(["ac1"]);
  });

  it("detects failed ACs", () => {
    const result = evaluateAcResults(
      {
        overallStatus: "fail",
        acResults: [{ acId: "ac1", status: "fail", evidence: "Failed" }],
        defects: [],
        summary: "Fail",
      },
      {
        criteria: [
          { acId: "ac1", requirementId: "r1", description: "Test", status: "fail", evidence: "Failed" },
        ],
      },
    );
    expect(result.allPassed).toBe(false);
    expect(result.failedAcIds).toEqual(["ac1"]);
  });

  it("detects not tested ACs", () => {
    const result = evaluateAcResults(
      {
        overallStatus: "partial",
        acResults: [{ acId: "ac1", status: "not_tested", evidence: "Skipped" }],
        defects: [],
        summary: "Partial",
      },
      {
        criteria: [
          { acId: "ac1", requirementId: "r1", description: "Test", status: "not_tested", evidence: "Skipped" },
        ],
      },
    );
    expect(result.allPassed).toBe(false);
    expect(result.notTestedAcIds).toEqual(["ac1"]);
  });

  it("handles mixed results", () => {
    const result = evaluateAcResults(
      {
        overallStatus: "partial",
        acResults: [
          { acId: "ac1", status: "pass", evidence: "OK" },
          { acId: "ac2", status: "fail", evidence: "Failed" },
          { acId: "ac3", status: "not_tested", evidence: "Skipped" },
        ],
        defects: [],
        summary: "Partial",
      },
      {
        criteria: [
          { acId: "ac1", requirementId: "r1", description: "Test 1", status: "pass", evidence: "OK" },
          { acId: "ac2", requirementId: "r2", description: "Test 2", status: "fail", evidence: "Failed" },
          { acId: "ac3", requirementId: "r3", description: "Test 3", status: "not_tested", evidence: "Skipped" },
        ],
      },
    );
    expect(result.allPassed).toBe(false);
    expect(result.passedAcIds).toEqual(["ac1"]);
    expect(result.failedAcIds).toEqual(["ac2"]);
    expect(result.notTestedAcIds).toEqual(["ac3"]);
  });

  it("returns empty arrays when no criteria", () => {
    const result = evaluateAcResults(
      { overallStatus: "pass", acResults: [], defects: [], summary: "Pass" },
      { criteria: [] },
    );
    expect(result.allPassed).toBe(true);
    expect(result.passedAcIds).toEqual([]);
    expect(result.failedAcIds).toEqual([]);
    expect(result.notTestedAcIds).toEqual([]);
  });
});

describe("determineReworkTasks", () => {
  it("includes failed task and its dependencies", () => {
    const taskGraph: TaskGraph = {
      tasks: [
        { id: "t1", dependencies: [] },
        { id: "t2", dependencies: ["t1"] },
        { id: "t3", dependencies: ["t1"] },
      ],
    };
    const rework = determineReworkTasks(taskGraph, ["t2"]);
    expect(rework).toContain("t2");
    expect(rework).toContain("t1");
    expect(rework).not.toContain("t3");
  });

  it("handles multiple failed tasks", () => {
    const taskGraph: TaskGraph = {
      tasks: [
        { id: "t1", dependencies: [] },
        { id: "t2", dependencies: ["t1"] },
        { id: "t3", dependencies: ["t2"] },
        { id: "t4", dependencies: [] },
      ],
    };
    const rework = determineReworkTasks(taskGraph, ["t3", "t4"]);
    expect(rework).toContain("t3");
    expect(rework).toContain("t2");
    expect(rework).toContain("t1");
    expect(rework).toContain("t4");
  });

  it("handles transitive dependencies", () => {
    const taskGraph: TaskGraph = {
      tasks: [
        { id: "t1", dependencies: [] },
        { id: "t2", dependencies: ["t1"] },
        { id: "t3", dependencies: ["t2"] },
      ],
    };
    const rework = determineReworkTasks(taskGraph, ["t3"]);
    expect(rework).toContain("t3");
    expect(rework).toContain("t2");
    expect(rework).toContain("t1");
  });

  it("returns empty array when no failures", () => {
    const taskGraph: TaskGraph = {
      tasks: [
        { id: "t1", dependencies: [] },
        { id: "t2", dependencies: ["t1"] },
      ],
    };
    const rework = determineReworkTasks(taskGraph, []);
    expect(rework).toEqual([]);
  });

  it("handles diamond dependency pattern", () => {
    const taskGraph: TaskGraph = {
      tasks: [
        { id: "t1", dependencies: [] },
        { id: "t2", dependencies: ["t1"] },
        { id: "t3", dependencies: ["t1"] },
        { id: "t4", dependencies: ["t2", "t3"] },
      ],
    };
    const rework = determineReworkTasks(taskGraph, ["t4"]);
    expect(rework).toContain("t4");
    expect(rework).toContain("t2");
    expect(rework).toContain("t3");
    expect(rework).toContain("t1");
  });
});

describe("determineReworkScope", () => {
  const tasks = [
    { id: "task-1", title: "Setup", description: "Project setup" },
    { id: "task-2", title: "Core", description: "Core features" },
    { id: "task-3", title: "Polish", description: "Polish features" },
  ];

  it("returns empty rework when all ACs pass", () => {
    const scope = determineReworkScope(
      { overallStatus: "pass", acResults: [{ acId: "ac-1", status: "pass", evidence: "OK" }], defects: [], summary: "Pass" },
      tasks,
    );
    expect(scope.reworkTaskIds).toEqual([]);
    expect(scope.failedAcIds).toEqual([]);
  });

  it("identifies failed ACs and maps to tasks", () => {
    const scope = determineReworkScope(
      {
        overallStatus: "fail",
        acResults: [
          { acId: "ac-1", status: "pass", evidence: "OK" },
          { acId: "ac-2", status: "fail", evidence: "Broken" },
        ],
        defects: [],
        summary: "Fail",
      },
      tasks,
    );
    expect(scope.failedAcIds).toEqual(["ac-2"]);
    expect(scope.reworkTaskIds.length).toBeGreaterThan(0);
    expect(scope.reasons.length).toBeGreaterThan(0);
  });

  it("maps defect-related AC to tasks", () => {
    const scope = determineReworkScope(
      {
        overallStatus: "fail",
        acResults: [
          { acId: "ac-1", status: "fail", evidence: "Timeout" },
        ],
        defects: [
          { id: "def-1", description: "Performance issue", severity: "critical", relatedAcId: "ac-1" },
        ],
        summary: "Fail",
      },
      tasks,
    );
    expect(scope.failedAcIds).toEqual(["ac-1"]);
    expect(scope.reworkTaskIds.length).toBeGreaterThan(0);
  });

  it("defaults to first task when AC-to-task mapping fails", () => {
    const scope = determineReworkScope(
      {
        overallStatus: "fail",
        acResults: [
          { acId: "unknown-ac", status: "fail", evidence: "Failed" },
        ],
        defects: [],
        summary: "Fail",
      },
      tasks,
    );
    expect(scope.reworkTaskIds.length).toBeGreaterThan(0);
    expect(scope.reworkTaskIds).toContain("task-1");
  });
});