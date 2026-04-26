import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryArtifactStore, InMemoryProjectRepository, InMemoryWorkflowRepository, InMemoryApprovalRepository } from "../in-memory";
import { FakeLLMProvider, FakeRepoProvider, FakeTestRunner, FakeBrowserRunner, FakeNotificationProvider, FakeClock } from "../fake";
import { createProject, createWorkflowRun, createBriefArtifact, createApprovalRecord } from "@workflow-jk/domain";
import { ProjectIntakeRequest, ApprovalDecision, OrganizationId } from "@workflow-jk/contracts";

const ORG_ID = "00000000-0000-0000-0000-000000000000" as OrganizationId;
const PROJECT_ID = "00000000-0000-0000-0000-000000000001" as import("@workflow-jk/contracts").ProjectId;

describe("InMemoryArtifactStore", () => {
  let store: InMemoryArtifactStore;

  beforeEach(() => {
    store = new InMemoryArtifactStore();
  });

  it("saves and retrieves artifacts", async () => {
    const projectId = "00000000-0000-0000-0000-000000000001" as OrganizationId;
    const artifact = createBriefArtifact(projectId, ORG_ID, {
      problemStatement: "Test",
      targetUsers: "U",
      businessValue: "V",
      keyFeatures: ["F"],
      constraints: ["C"],
      assumptions: ["A"],
      outOfScope: ["O"],
    });
    const saved = await store.save(artifact);
    const retrieved = await store.getById(saved.id as OrganizationId, ORG_ID);
    expect(retrieved).toBeTruthy();
    expect(retrieved!.type).toBe("brief");
  });

  it("queries artifacts by project and type", async () => {
    const projectId = "00000000-0000-0000-0000-000000000001" as OrganizationId;
    await store.save(
      createBriefArtifact(projectId, ORG_ID, {
        problemStatement: "Test",
        targetUsers: "U",
        businessValue: "V",
        keyFeatures: ["F"],
        constraints: ["C"],
        assumptions: ["A"],
        outOfScope: ["O"],
      }),
    );
    const results = await store.query({ projectId, type: "brief", organizationId: ORG_ID });
    expect(results).toHaveLength(1);
  });

  it("gets latest version by type", async () => {
    const projectId = "00000000-0000-0000-0000-000000000001" as OrganizationId;
    await store.save(
      createBriefArtifact(
        projectId,
        ORG_ID,
        {
          problemStatement: "V1",
          targetUsers: "U",
          businessValue: "V",
          keyFeatures: ["F"],
          constraints: ["C"],
          assumptions: ["A"],
          outOfScope: ["O"],
        },
        "IntakeAgent",
        1,
      ),
    );
    await store.save(
      createBriefArtifact(
        projectId,
        ORG_ID,
        {
          problemStatement: "V2",
          targetUsers: "U",
          businessValue: "V",
          keyFeatures: ["F"],
          constraints: ["C"],
          assumptions: ["A"],
          outOfScope: ["O"],
        },
        "IntakeAgent",
        2,
      ),
    );
    const latest = await store.getLatestByType(projectId, "brief", ORG_ID);
    expect(latest).toBeTruthy();
    expect(latest!.version).toBe(2);
  });

  it("returns null for non-existent artifact", async () => {
    const result = await store.getById("00000000-0000-0000-0000-000000000999" as OrganizationId, ORG_ID);
    expect(result).toBeNull();
  });

  it("returns empty array for unmatched query", async () => {
    const projectId = "00000000-0000-0000-0000-000000000001" as OrganizationId;
    const results = await store.query({ projectId, type: "nonexistent", organizationId: ORG_ID });
    expect(results).toHaveLength(0);
  });
});

describe("InMemoryProjectRepository", () => {
  let repo: InMemoryProjectRepository;

  beforeEach(() => {
    repo = new InMemoryProjectRepository();
  });

  it("saves and retrieves projects", async () => {
    const project = createProject(ORG_ID, {
      title: "Test",
      rawIdea: "A test idea that is long enough",
      businessGoal: "Goal",
      constraints: [],
    });
    await repo.save(project);
    const found = await repo.getById(project.id, ORG_ID);
    expect(found).toBeTruthy();
    expect(found!.title).toBe("Test");
  });

  it("returns null for missing project", async () => {
    const found = await repo.getById("00000000-0000-0000-0000-000000000999" as OrganizationId, ORG_ID);
    expect(found).toBeNull();
  });

  it("lists all projects", async () => {
    const project1 = createProject(ORG_ID, {
      title: "Test 1",
      rawIdea: "A test idea that is long enough to be valid",
      businessGoal: "Goal",
      constraints: [],
    });
    const project2 = createProject(ORG_ID, {
      title: "Test 2",
      rawIdea: "Another test idea that is long enough to be valid",
      businessGoal: "Goal",
      constraints: [],
    });
    await repo.save(project1);
    await repo.save(project2);
    const all = await repo.list(ORG_ID);
    expect(all).toHaveLength(2);
  });
});

describe("InMemoryWorkflowRepository", () => {
  let repo: InMemoryWorkflowRepository;

  beforeEach(() => {
    repo = new InMemoryWorkflowRepository();
  });

  it("saves and retrieves workflows", async () => {
    const project = createProject(ORG_ID, {
      title: "T",
      rawIdea: "Idea text that is long enough",
      businessGoal: "G",
      constraints: [],
    });
    const workflow = createWorkflowRun(project.id, ORG_ID);
    await repo.save(workflow);
    const found = await repo.getById(workflow.id, ORG_ID);
    expect(found).toBeTruthy();
    expect(found!.state).toBe("Draft");
  });

  it("updates workflow state", async () => {
    const project = createProject(ORG_ID, {
      title: "T",
      rawIdea: "Idea text that is long enough",
      businessGoal: "G",
      constraints: [],
    });
    const workflow = createWorkflowRun(project.id, ORG_ID);
    await repo.save(workflow);
    const updated = await repo.updateState(workflow.id, ORG_ID, "IntakeInProgress", "intake");
    expect(updated.state).toBe("IntakeInProgress");
    expect(updated.currentStage).toBe("intake");
  });

  it("finds workflow by project ID", async () => {
    const project = createProject(ORG_ID, {
      title: "T",
      rawIdea: "Idea text that is long enough",
      businessGoal: "G",
      constraints: [],
    });
    const workflow = createWorkflowRun(project.id, ORG_ID);
    await repo.save(workflow);
    const found = await repo.getByProjectId(project.id, ORG_ID);
    expect(found).toBeTruthy();
    expect(found!.id).toBe(workflow.id);
  });

  it("throws for non-existent workflow", async () => {
    await expect(
      repo.updateState("00000000-0000-0000-0000-000000000999" as OrganizationId, ORG_ID, "IntakeInProgress", "intake"),
    ).rejects.toThrow("Workflow not found");
  });
});

describe("InMemoryApprovalRepository", () => {
  let repo: InMemoryApprovalRepository;

  beforeEach(() => {
    repo = new InMemoryApprovalRepository();
  });

  it("saves and retrieves approvals", async () => {
    const workflowRunId = "00000000-0000-0000-0000-000000000001" as OrganizationId;
    const approval = createApprovalRecord(workflowRunId, ORG_ID, "requirements", "approved", "test-user");
    await repo.save(approval);
    const found = await repo.getLatestByType(workflowRunId, "requirements");
    expect(found).toBeTruthy();
    expect(found!.decision).toBe("approved");
  });

  it("gets all approvals for workflow", async () => {
    const workflowRunId = "00000000-0000-0000-0000-000000000001" as OrganizationId;
    await repo.save(createApprovalRecord(workflowRunId, ORG_ID, "requirements", "approved", "user1"));
    await repo.save(createApprovalRecord(workflowRunId, ORG_ID, "requirements", "rejected", "user2"));
    const approvals = await repo.getByWorkflowId(workflowRunId);
    expect(approvals).toHaveLength(2);
  });
});

describe("FakeLLMProvider", () => {
  it("returns configured responses", async () => {
    const provider = new FakeLLMProvider();
    provider.setResponse("brief", { unstructured: "brief output", structured: { test: true } });
    const result = await provider.complete("Generate a brief for my idea");
    expect(result).toBe("brief output");
  });

  it("returns default response when no match", async () => {
    const provider = new FakeLLMProvider();
    provider.setDefaultResponse({ unstructured: "default", structured: {} });
    const result = await provider.complete("random prompt");
    expect(result).toBe("default");
  });

  it("returns structured responses", async () => {
    const provider = new FakeLLMProvider();
    provider.setResponse("test", { unstructured: "test", structured: { field: "value" } });
    const result = await provider.completeStructured<{ field: string }>("do test", {});
    expect(result.field).toBe("value");
  });

  it("logs calls", async () => {
    const provider = new FakeLLMProvider();
    provider.setDefaultResponse({ unstructured: "test", structured: {} });
    await provider.complete("some prompt");
    const log = provider.getCallLog();
    expect(log).toHaveLength(1);
    expect(log[0].prompt).toContain("some prompt");
  });
});

describe("FakeClock", () => {
  it("advances time", () => {
    const clock = new FakeClock();
    const before = clock.now().getTime();
    clock.advance(1000);
    const after = clock.now().getTime();
    expect(after - before).toBe(1000);
  });

  it("returns iso timestamp", () => {
    const clock = new FakeClock();
    const iso = clock.isoNow();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("can set specific time", () => {
    const clock = new FakeClock();
    const before = clock.isoNow();
    clock.advance(5000);
    const after = clock.isoNow();
    expect(after).not.toBe(before);
  });
});

describe("FakeRepoProvider", () => {
  it("can create file", async () => {
    const provider = new FakeRepoProvider();
    const result = await provider.createFile("/test.ts", "export const x = 1;");
    expect(result.path).toBe("/test.ts");
    expect(result.sha).toBeTruthy();
  });

  it("can get file", async () => {
    const provider = new FakeRepoProvider();
    await provider.createFile("/test.ts", "export const x = 1;");
    const result = await provider.getFile("/test.ts");
    expect(result.content).toBe("export const x = 1;");
  });

  it("can update file", async () => {
    const provider = new FakeRepoProvider();
    await provider.createFile("/test.ts", "export const x = 1;");
    await provider.updateFile("/test.ts", "export const x = 2;");
    const result = await provider.getFile("/test.ts");
    expect(result.content).toBe("export const x = 2;");
  });

  it("can delete file", async () => {
    const provider = new FakeRepoProvider();
    await provider.createFile("/test.ts", "export const x = 1;");
    await provider.deleteFile("/test.ts");
    await expect(provider.getFile("/test.ts")).rejects.toThrow("not found");
  });

  it("lists files with prefix", async () => {
    const provider = new FakeRepoProvider();
    await provider.createFile("/src/index.ts", "export const x = 1;");
    await provider.createFile("/src/utils.ts", "export const y = 2;");
    const files = await provider.listFiles("/src");
    expect(files).toHaveLength(2);
  });
});

describe("FakeTestRunner", () => {
  it("returns default test results", async () => {
    const runner = new FakeTestRunner();
    const result = await runner.runTests();
    // Default fake returns 1 passing test
    expect(result.passed).toBe(1);
    expect(result.results).toHaveLength(1);
  });

  it("returns configured results", async () => {
    const runner = new FakeTestRunner();
    runner.setDefaultResult({ passed: 5, failed: 2, skipped: 1, results: [] });
    const result = await runner.runTests();
    expect(result.passed).toBe(5);
    expect(result.failed).toBe(2);
    expect(result.skipped).toBe(1);
  });
});

describe("FakeBrowserRunner", () => {
  it("returns check results", async () => {
    const runner = new FakeBrowserRunner();
    const result = await runner.runCheck("https://example.com", ["check1"]);
    expect(result.passed).toBe(true);
    expect(result.results).toHaveLength(1);
  });
});

describe("FakeNotificationProvider", () => {
  it("sends notifications without error", async () => {
    const provider = new FakeNotificationProvider();
    // Should not throw
    await provider.notify("user1", "email", { subject: "Test" });
  });
});