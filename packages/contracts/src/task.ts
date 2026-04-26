import { z } from "zod";
import { ProjectId, IsoTimestamp, UserId } from "./common";

export const TaskStatus = z.enum(["pending", "in_progress", "completed", "cancelled"]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const TaskPriority = z.enum(["low", "medium", "high", "critical"]);
export type TaskPriority = z.infer<typeof TaskPriority>;

export const Task = z.object({
  id: z.string().uuid().brand("TaskId"),
  projectId: ProjectId,
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  status: TaskStatus,
  priority: TaskPriority,
  assigneeId: UserId.optional(),
  dueDate: IsoTimestamp.optional(),
  createdAt: IsoTimestamp,
  updatedAt: IsoTimestamp,
});
export type Task = z.infer<typeof Task>;

export const TaskIntakeRequest = z.object({
  projectId: ProjectId,
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  priority: TaskPriority.optional(),
  assigneeId: UserId.optional(),
  dueDate: IsoTimestamp.optional(),
});
export type TaskIntakeRequest = z.infer<typeof TaskIntakeRequest>;
