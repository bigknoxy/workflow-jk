import { Task, TaskId, TaskStatus, TaskPriority, UserId } from "@workflow-jk/contracts";
import { TaskRepository } from "../ports";

export class InMemoryTaskRepository implements TaskRepository {
  private tasks: Map<TaskId, Task> = new Map();

  async save(task: Task): Promise<Task> {
    const now = new Date().toISOString() as any;
    const existing = this.tasks.get(task.id);
    if (existing) {
      const updated: Task = {
        ...existing,
        ...task,
        updatedAt: now,
      };
      this.tasks.set(task.id, updated);
      return updated;
    }
    this.tasks.set(task.id, { ...task, updatedAt: now });
    return task;
  }

  async getById(id: TaskId): Promise<Task | null> {
    return this.tasks.get(id) ?? null;
  }

  async getByProjectId(projectId: any): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.projectId === projectId
    );
  }

  async updateStatus(id: TaskId, status: TaskStatus): Promise<Task | null> {
    const task = this.tasks.get(id);
    if (!task) return null;
    const updated: Task = {
      ...task,
      status,
      updatedAt: new Date().toISOString() as any,
    };
    this.tasks.set(id, updated);
    return updated;
  }

  async updatePriority(id: TaskId, priority: TaskPriority): Promise<Task | null> {
    const task = this.tasks.get(id);
    if (!task) return null;
    const updated: Task = {
      ...task,
      priority,
      updatedAt: new Date().toISOString() as any,
    };
    this.tasks.set(id, updated);
    return updated;
  }

  async assignToUser(id: TaskId, userId: UserId): Promise<Task | null> {
    const task = this.tasks.get(id);
    if (!task) return null;
    const updated: Task = {
      ...task,
      assigneeId: userId,
      updatedAt: new Date().toISOString() as any,
    };
    this.tasks.set(id, updated);
    return updated;
  }
}
