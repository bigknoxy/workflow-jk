/**
 * Temporal Worker Setup
 * 
 * The worker connects to a Temporal cluster and registers:
 * - Activities: The side-effect functions that can be called from workflows
 * - Workflows: The workflow definitions (bundled separately)
 * 
 * For TypeScript SDK, workflows must be bundled into a separate module.
 * The caller typically provides the path to the compiled workflow bundle.
 */
import type { ActivityDependencies } from "./activities";

/**
 * Worker configuration options
 */
export interface WorkerConfig {
  /** Temporal cluster address */
  temporalAddress: string;
  /** Temporal namespace */
  namespace: string;
  /** Task queue name */
  taskQueue?: string;
  /** Activity dependencies */
  activityDeps: ActivityDependencies;
  /** Path to workflow bundle */
  workflowsPath?: string;
}

/**
 * Create a Temporal worker stub.
 * 
 * In production, this function would:
 * 1. Connect to the Temporal cluster
 * 2. Set activity dependencies
 * 3. Register activities and workflows
 * 4. Return a properly configured Worker
 * 
 * For now, this is a stub that documents the expected API.
 */
export async function createWorker(config: WorkerConfig): Promise<unknown> {
  // Import and set activity dependencies
  const { setActivityDependencies } = await import("./activities");
  setActivityDependencies(config.activityDeps);

  // In production:
  // const connection = await NativeConnection.connect({
  //   address: config.temporalAddress,
  // });
  // const worker = await Worker.create({
  //   connection,
  //   namespace: config.namespace,
  //   taskQueue: config.taskQueue ?? "workflow-jk-tasks",
  //   activities,
  //   workflowsPath: config.workflowsPath,
  // });

  console.log("Worker configured:", {
    temporalAddress: config.temporalAddress,
    namespace: config.namespace,
    taskQueue: config.taskQueue ?? "workflow-jk-tasks",
    workflowsPath: config.workflowsPath,
  });

  return {
    config,
    run: async () => {
      console.log("Worker running...");
    },
    shutdown: async () => {
      console.log("Worker shutting down...");
    },
  };
}

/**
 * Start a worker and run it until shutdown.
 */
export async function startAndRunWorker(config: WorkerConfig): Promise<void> {
  const worker = await createWorker(config);
  if (typeof (worker as { run: () => Promise<void> }).run === "function") {
    await (worker as { run: () => Promise<void> }).run();
  }
}

// Re-export types
export type { ActivityDependencies } from "./activities";