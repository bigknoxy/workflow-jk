import { z } from "zod";
import { AgentName } from "./common";
import { 
  BriefArtifact, 
  CritiqueResultArtifact,
  RequirementsArtifact,
  AcceptanceCriteriaArtifact,
  NonFunctionalRequirementsArtifact,
  OutOfScopeArtifact,
  ArchitectureArtifact,
  ImplementationPlanArtifact,
  TaskGraphArtifact,
  TestStrategyArtifact,
  RepoImpactMapArtifact,
  TaskPack,
  DevExecutionResultArtifact,
  QaReportArtifact,
  AcMatrixArtifact,
} from "./artifacts";

export const AgentInvocation = z.object({
  agentName: AgentName,
  input: z.unknown(),
  correlationId: z.string().uuid(),
  modelProvider: z.string().optional(),
  modelId: z.string().optional(),
});
export type AgentInvocation = z.infer<typeof AgentInvocation>;

export const AgentResult = z.object({
  agentName: AgentName,
  success: z.boolean(),
  output: z.unknown(),
  tokenUsage: z.object({
    prompt: z.number(),
    completion: z.number(),
    total: z.number(),
  }).optional(),
  durationMs: z.number(),
  error: z.string().optional(),
  retryCount: z.number().optional(),
});
export type AgentResult = z.infer<typeof AgentResult>;

export const IntakeAgentInput = z.object({
  rawIdea: z.string(),
  businessGoal: z.string(),
  constraints: z.array(z.string()),
  assumptions: z.array(z.string()),
});
export type IntakeAgentInput = z.infer<typeof IntakeAgentInput>;

export const IntakeAgentOutput = BriefArtifact.shape.content;

export const RequirementsCriticAgentInput = z.object({
  brief: BriefArtifact.shape.content,
});
export type RequirementsCriticAgentInput = z.infer<typeof RequirementsCriticAgentInput>;

export const RequirementsCriticAgentOutput = CritiqueResultArtifact.shape.content;

export const ArchitectAgentInput = z.object({
  requirements: RequirementsArtifact.shape.content,
  acceptanceCriteria: AcceptanceCriteriaArtifact.shape.content,
  nonFunctionalRequirements: NonFunctionalRequirementsArtifact.shape.content,
  outOfScope: OutOfScopeArtifact.shape.content,
});
export type ArchitectAgentInput = z.infer<typeof ArchitectAgentInput>;

export const ArchitectAgentOutput = z.object({
  architecture: ArchitectureArtifact.shape.content,
  implementationPlan: ImplementationPlanArtifact.shape.content,
  taskGraph: TaskGraphArtifact.shape.content,
  testStrategy: TestStrategyArtifact.shape.content,
  repoImpactMap: RepoImpactMapArtifact.shape.content,
});
export type ArchitectAgentOutput = z.infer<typeof ArchitectAgentOutput>;

export const DevAgentInput = z.object({
  taskPack: TaskPack,
  context: z.string(),
});
export type DevAgentInput = z.infer<typeof DevAgentInput>;

export const DevAgentOutput = z.object({
  summary: z.string(),
  changes: DevExecutionResultArtifact.shape.content.shape.changes,
  testResults: DevExecutionResultArtifact.shape.content.shape.testResults,
});
export type DevAgentOutput = z.infer<typeof DevAgentOutput>;

export const QaAgentInput = z.object({
  devResult: DevExecutionResultArtifact.shape.content,
  taskPack: z.object({ 
    taskId: z.string(), 
    title: z.string(), 
    acceptanceCriteria: z.array(z.object({ id: z.string(), given: z.string(), when: z.string(), then: z.string() })) 
  }),
  testStrategy: TestStrategyArtifact.shape.content,
});
export type QaAgentInput = z.infer<typeof QaAgentInput>;

export const QaAgentOutput = z.object({
  qaReport: QaReportArtifact.shape.content,
  acMatrix: AcMatrixArtifact.shape.content,
});
export type QaAgentOutput = z.infer<typeof QaAgentOutput>;