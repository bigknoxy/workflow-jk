import { QaReportArtifact, AcMatrixArtifact } from "@workflow-jk/contracts";

export interface AcEvaluationResult {
  allPassed: boolean;
  failedAcIds: string[];
  passedAcIds: string[];
  notTestedAcIds: string[];
}

export function evaluateAcResults(
  qaReport: QaReportArtifact["content"],
  acMatrix: AcMatrixArtifact["content"],
): AcEvaluationResult {
  const failedAcIds: string[] = [];
  const passedAcIds: string[] = [];
  const notTestedAcIds: string[] = [];

  for (const criterion of acMatrix.criteria) {
    if (criterion.status === "pass") {
      passedAcIds.push(criterion.acId);
    } else if (criterion.status === "fail") {
      failedAcIds.push(criterion.acId);
    } else if (criterion.status === "not_tested") {
      notTestedAcIds.push(criterion.acId);
    }
  }

  return {
    allPassed: failedAcIds.length === 0 && notTestedAcIds.length === 0,
    failedAcIds,
    passedAcIds,
    notTestedAcIds,
  };
}

export interface TaskGraph {
  tasks: Array<{ id: string; dependencies: string[] }>;
}

export function determineReworkTasks(
  taskGraph: TaskGraph,
  failedTaskIds: string[],
): string[] {
  const reworkTasks = new Set<string>();
  const taskMap = new Map(taskGraph.tasks.map((t) => [t.id, t]));

  function addTransitiveDependencies(taskId: string) {
    if (reworkTasks.has(taskId)) return;
    reworkTasks.add(taskId);

    const task = taskMap.get(taskId);
    if (task) {
      for (const depId of task.dependencies) {
        addTransitiveDependencies(depId);
      }
    }
  }

  for (const taskId of failedTaskIds) {
    addTransitiveDependencies(taskId);
  }

  return Array.from(reworkTasks);
}

export interface ReworkScope {
  reworkTaskIds: string[];
  failedAcIds: string[];
  reasons: Array<{ taskId: string; reason: string; failedAcIds: string[] }>;
}

export function determineReworkScope(
  qaReportContent: QaReportArtifact["content"],
  tasks: Array<{ id: string; title: string; description: string }>,
): ReworkScope {
  const failedAcIds = qaReportContent.acResults
    .filter((r) => r.status === "fail")
    .map((r) => r.acId);

  const acToTaskMap = new Map<string, string>();
  for (const ac of qaReportContent.acResults) {
    const acId = ac.acId;
    const match = acId.match(/^(ac-|ac_?)([^-]+)/);
    if (match) {
      const taskNum = match[2];
      acToTaskMap.set(acId, `task-${taskNum}`);
    }
  }

  for (const defect of qaReportContent.defects) {
    if (defect.relatedAcId) {
      acToTaskMap.set(defect.relatedAcId, defect.relatedAcId.replace(/ac-\d+/, "task-1"));
    }
  }

  const taskToFailedAcs = new Map<string, string[]>();
  for (const acId of failedAcIds) {
    let taskId = acToTaskMap.get(acId);
    if (!taskId) {
      taskId = tasks.length > 0 ? tasks[0].id : "task-1";
    }
    if (!taskToFailedAcs.has(taskId)) {
      taskToFailedAcs.set(taskId, []);
    }
    taskToFailedAcs.get(taskId)!.push(acId);
  }

  if (failedAcIds.length > 0 && taskToFailedAcs.size === 0) {
    const defaultTaskId = tasks.length > 0 ? tasks[0].id : "task-1";
    taskToFailedAcs.set(defaultTaskId, failedAcIds);
  }

  const reworkTaskIds = Array.from(taskToFailedAcs.keys());
  const reasons = reworkTaskIds.map((taskId) => ({
    taskId,
    reason: `QA failed: ${taskToFailedAcs.get(taskId)!.join(", ")}`,
    failedAcIds: taskToFailedAcs.get(taskId)!,
  }));

  return { reworkTaskIds, failedAcIds, reasons };
}