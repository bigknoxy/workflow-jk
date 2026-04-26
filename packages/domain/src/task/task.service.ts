import { TaskId, Task, TaskIntakeRequest, TaskStatus, TaskPriority, UserId } from "@workflow-jk/contracts";

export interface TaskService {
  createTask(request: TaskIntakeRequest): Promise<Task>;
  getTask(id: TaskId): Promise<Task | null>;
  updateTaskStatus(id: TaskId, status: TaskStatus): Promise<Task | null>;
  updateTaskPriority(id: TaskId, priority: TaskPriority): Promise<Task | null>;
  assignTask(id: TaskId, userId: UserId): Promise<Task | null>;
  listByProject(projectId: string): Promise<Task[]>;
}
