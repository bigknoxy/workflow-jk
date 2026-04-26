import pg from "pg";
import { TaskRepository } from "../ports";
import { Task, TaskId, UserId } from "@workflow-jk/contracts";

const { Pool } = pg;

export class PostgresTaskRepository implements TaskRepository {
  private pool: pg.Pool;

  constructor({ pool }: { pool: pg.Pool }) {
    this.pool = pool;
  }

  async save(task: Task): Promise<Task> {
    const query = `
      INSERT INTO tasks (id, project_id, title, description, status, priority, assignee_id, due_date, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        assignee_id = EXCLUDED.assignee_id,
        due_date = EXCLUDED.due_date,
        updated_at = EXCLUDED.updated_at
    `;
    await this.pool.query(query, [
      task.id,
      task.projectId,
      task.title,
      task.description || null,
      task.status,
      task.priority,
      task.assigneeId || null,
      task.dueDate || null,
      task.createdAt,
      task.updatedAt,
    ]);
    return task;
  }

  async getById(id: TaskId): Promise<Task | null> {
    const query = `SELECT * FROM tasks WHERE id = $1`;
    const result = await this.pool.query(query, [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToTask(result.rows[0]);
  }

  async getByProjectId(projectId: TaskId): Promise<Task[]> {
    const query = `SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at DESC`;
    const result = await this.pool.query(query, [projectId]);
    return result.rows.map(this.mapRowToTask);
  }

  async updateStatus(id: TaskId, status: string): Promise<Task> {
    const task = await this.getById(id);
    if (!task) throw new Error(`Task ${id} not found`);
    const query = `UPDATE tasks SET status = $1, updated_at = $2 WHERE id = $3`;
    await this.pool.query(query, [status, new Date().toISOString(), id]);
    return { ...task, status: status as any, updatedAt: new Date().toISOString() };
  }

  async updatePriority(id: TaskId, priority: string): Promise<Task> {
    const task = await this.getById(id);
    if (!task) throw new Error(`Task ${id} not found`);
    const query = `UPDATE tasks SET priority = $1, updated_at = $2 WHERE id = $3`;
    await this.pool.query(query, [priority, new Date().toISOString(), id]);
    return { ...task, priority: priority as any, updatedAt: new Date().toISOString() };
  }

  async assignToUser(id: TaskId, userId: UserId): Promise<Task> {
    const task = await this.getById(id);
    if (!task) throw new Error(`Task ${id} not found`);
    const query = `UPDATE tasks SET assignee_id = $1, updated_at = $2 WHERE id = $3`;
    await this.pool.query(query, [userId, new Date().toISOString(), id]);
    return { ...task, assigneeId: userId, updatedAt: new Date().toISOString() };
  }

  private mapRowToTask(row: Record<string, unknown>): Task {
    return {
      id: row.id as TaskId,
      projectId: row.project_id as any,
      title: row.title as string,
      description: row.description as string | undefined,
      status: (row.status as string) as any,
      priority: (row.priority as string) as any,
      assigneeId: row.assignee_id as UserId | undefined,
      dueDate: (row.due_date as string | null) as any,
      createdAt: (row.created_at as string),
      updatedAt: (row.updated_at as string),
    };
  }
}
