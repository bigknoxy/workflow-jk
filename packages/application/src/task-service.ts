import { TaskId, Task, TaskIntakeRequest, TaskStatus, TaskPriority, UserId } from "@workflow-jk/contracts";
import { TaskRepository } from "@workflow-jk/adapters";

export interface TaskServiceDeps {
  taskRepository: TaskRepository;
}

export class TaskService {
  constructor(private deps: TaskServiceDeps) {}

  async createTask(request: TaskIntakeRequest): Promise<Task> {
    const now = new Date().toISOString();
    const task: Task = {
      id: crypto.randomUUID() as TaskId,
      projectId: request.projectId,
      title: request.title,
      description: request.description,
      status: "pending" as TaskStatus,
      priority: request.priority || "medium" as TaskPriority,
      assigneeId: request.assigneeId,
      dueDate: request.dueDate,
      createdAt: now,
      updatedAt: now,
    };
    return this.deps.taskRepository.save(task);
  }

  async getTask(id: TaskId): Promise<Task | null> {
    return this.deps.taskRepository.getById(id);
  }

  async updateTaskStatus(id: TaskId, status: TaskStatus): Promise<Task | null> {
    return this.deps.taskRepository.updateStatus(id, status);
  }

  async updateTaskPriority(id: TaskId, priority: TaskPriority): Promise<Task | null> {
    return this.deps.taskRepository.updatePriority(id, priority);
  }

  async assignTask(id: TaskId, userId: UserId): Promise<Task | null> {
    return this.deps.taskRepository.assignToUser(id, userId);
  }

  async listByProject(projectId: any): Promise<Task[]> {
    return this.deps.taskRepository.getByProjectId(projectId);
  }
}
