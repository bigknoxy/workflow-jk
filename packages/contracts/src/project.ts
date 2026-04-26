import { z } from "zod";
import { ProjectId, IsoTimestamp } from "./common";
import { OrganizationId } from "./auth";

export const ProjectIntakeRequest = z.object({
  title: z.string().min(1).max(200),
  rawIdea: z.string().min(10).max(10000),
  businessGoal: z.string().min(1).max(2000),
  constraints: z.array(z.string()).max(20),
  assumptions: z.array(z.string()).max(20).optional(),
});
export type ProjectIntakeRequest = z.infer<typeof ProjectIntakeRequest>;

export const Project = z.object({
  id: ProjectId,
  organizationId: OrganizationId,
  title: z.string(),
  rawIdea: z.string(),
  businessGoal: z.string(),
  constraints: z.array(z.string()),
  assumptions: z.array(z.string()),
  createdAt: IsoTimestamp,
  updatedAt: IsoTimestamp,
});
export type Project = z.infer<typeof Project>;