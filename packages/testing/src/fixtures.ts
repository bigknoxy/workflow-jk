import {
  ProjectIntakeRequest,
  BriefArtifact,
  CritiqueResultArtifact,
  RequirementsArtifact,
  AcceptanceCriteriaArtifact,
  ArchitectureArtifact,
  TaskGraphArtifact,
  TestStrategyArtifact,
  DevExecutionResultArtifact,
  QaReportArtifact,
  AcMatrixArtifact,
  ReleaseDecisionArtifact,
  ClarificationResponsePayload,
  ProjectId,
  WorkflowRunId,
  OrganizationId,
} from "@workflow-jk/contracts";

export const VAGUE_PROJECT_INPUT: ProjectIntakeRequest = {
  title: "Task Tracker",
  rawIdea: "I want to build something that helps teams track their tasks. Maybe like a kanban board but simpler.",
  businessGoal: "Improve team productivity by 20% through better task visibility",
  constraints: ["Must work on mobile", "Budget under $50k"],
  assumptions: ["Team size is 5-15 people", "Using existing auth system"],
};

export const CLARIFIED_PROJECT_INPUT: ProjectIntakeRequest = {
  title: "Team Task Tracker",
  rawIdea: "A streamlined task tracking tool for small teams (5-15 people) with kanban-style boards, real-time collaboration, and mobile-first design. Teams should be able to create boards, add columns, move tasks between columns, and see real-time updates without refreshing.",
  businessGoal: "Improve team productivity by 20% through better task visibility and reduce context switching by providing a single source of truth for task status",
  constraints: ["Must be mobile-first and responsive", "Budget under $50k for MVP", "Must integrate with existing SSO auth", "Must support offline mode", "Data must be encrypted at rest and in transit"],
  assumptions: ["Team size is 5-15 people", "Using existing SSO auth system", "React/TypeScript frontend preferred", "PostgreSQL for persistence"],
};

export const SAMPLE_BRIEF_CONTENT: BriefArtifact["content"] = {
  problemStatement: "Small teams lack a simple, mobile-first task tracking tool that provides real-time visibility into task status without requiring desktop access",
  targetUsers: "Small teams of 5-15 people who need lightweight task tracking with mobile access",
  businessValue: "20% productivity improvement through reduced context switching and better task visibility",
  keyFeatures: [
    "Kanban-style boards with customizable columns",
    "Real-time collaboration and updates",
    "Mobile-first responsive design",
    "Task assignment and due dates",
    "Basic reporting and metrics",
  ],
  constraints: ["Mobile-first design", "Budget under $50k", "SSO integration", "Offline support", "Encryption"],
  assumptions: ["5-15 person teams", "Existing SSO system", "React/TypeScript frontend", "PostgreSQL backend"],
  outOfScope: ["Advanced analytics dashboard", "Time tracking", "Resource allocation", "Gantt charts"],
};

export const SAMPLE_CRITIQUE_CONTENT: CritiqueResultArtifact["content"] = {
  clarificationQuestions: [
    { id: "q1", question: "What SSO provider should be integrated (e.g., Okta, Auth0, Azure AD)?", category: "missing_constraint" as const },
    { id: "q2", question: "What specific data needs to be available offline - full boards or just task lists?", category: "ambiguity" as const },
    { id: "q3", question: "Should real-time updates use WebSocket or Server-Sent Events?", category: "assumption" as const },
  ],
  identifiedRisks: [
    { id: "r1", description: "Offline sync conflicts may be complex to resolve", severity: "medium" as const, mitigation: "Use CRDTs or last-write-wins with conflict notification" },
  ],
  missingConstraints: ["SSO provider specification", "Offline data scope", "Real-time technology choice"],
  assumptions: [
    { id: "a1", assumption: "WebSocket for real-time updates", confidence: "medium" as const },
    { id: "a2", assumption: "Last-write-wins for offline conflict resolution", confidence: "high" as const },
  ],
  draftAcceptanceCriteria: [
    { id: "ac1", criterion: "Users can create and customize kanban boards", category: "functional" },
    { id: "ac2", criterion: "Task updates appear in real-time for all team members", category: "functional" },
    { id: "ac3", criterion: "Mobile users can view and update tasks offline", category: "functional" },
    { id: "ac4", criterion: "SSO login works within 2 seconds", category: "performance" },
  ],
};

export const SAMPLE_CLARIFICATION_ANSWERS: ClarificationResponsePayload = {
  answers: [
    { questionId: "q1", answer: "We use Auth0 for SSO. The integration should support OAuth 2.0 / OIDC." },
    { questionId: "q2", answer: "Offline mode should show task lists and allow status changes. Full board view requires connectivity." },
    { questionId: "q3", answer: "WebSocket for real-time updates, with SSE fallback for restricted networks." },
  ],
};

export const SAMPLE_REQUIREMENTS_CONTENT: RequirementsArtifact["content"] = {
  requirements: [
    { id: "req-1", title: "Kanban Board Management", description: "Users can create, customize, and manage kanban boards with columns", priority: "must" as const, category: "functional" },
    { id: "req-2", title: "Real-time Collaboration", description: "Task updates appear in real-time for all team members via WebSocket", priority: "must" as const, category: "functional" },
    { id: "req-3", title: "Mobile-First Design", description: "The interface must be optimized for mobile devices first", priority: "must" as const, category: "functional" },
    { id: "req-4", title: "SSO Integration", description: "Authentication via Auth0 OAuth 2.0 / OIDC", priority: "must" as const, category: "functional" },
    { id: "req-5", title: "Offline Mode", description: "Mobile users can view task lists and update status offline", priority: "should" as const, category: "functional" },
  ],
};

export const SAMPLE_ACCEPTANCE_CRITERIA_CONTENT: AcceptanceCriteriaArtifact["content"] = {
  criteria: [
    { id: "ac-1", requirementId: "req-1", given: "A user is on the board page", when: "They click 'Add Column'", then: "A new column appears on the board" },
    { id: "ac-2", requirementId: "req-2", given: "Two users are viewing the same board", when: "One user moves a task", then: "The other user sees the change within 2 seconds" },
    { id: "ac-3", requirementId: "req-3", given: "A user opens the app on mobile", when: "They view the board", then: "The layout is optimized for touch interaction" },
    { id: "ac-4", requirementId: "req-4", given: "A user clicks 'Sign In'", when: "They authenticate via Auth0", then: "They are logged in within 2 seconds" },
    { id: "ac-5", requirementId: "req-5", given: "A user is offline", when: "They change a task status", then: "The change is synced when they reconnect" },
  ],
};

export const SAMPLE_ARCHITECTURE_CONTENT: ArchitectureArtifact["content"] = {
  overview: "A React/TypeScript frontend with Node.js/Express backend, PostgreSQL database, and WebSocket server for real-time updates",
  decisions: [
    { id: "ad-1", decision: "Use React with TypeScript for frontend", rationale: "Team expertise and mobile-first requirement", alternatives: ["Vue.js", "Svelte"] },
    { id: "ad-2", decision: "Use WebSocket with SSE fallback", rationale: "Real-time requirement with network resilience", alternatives: ["SSE only", "Polling"] },
    { id: "ad-3", decision: "Use PostgreSQL with JSON columns", rationale: "Structured data with flexible board configurations", alternatives: ["MongoDB", "DynamoDB"] },
  ],
  components: [
    { name: "Web Frontend", responsibility: "React/TypeScript SPA with mobile-first design", dependencies: ["API Gateway", "WebSocket Server"] },
    { name: "API Server", responsibility: "REST API for CRUD operations", dependencies: ["Database", "Auth Service"] },
    { name: "WebSocket Server", responsibility: "Real-time updates with SSE fallback", dependencies: ["Database", "Pub/Sub"] },
    { name: "Auth Service", responsibility: "Auth0 integration and token management", dependencies: ["Auth0"] },
    { name: "Database", responsibility: "PostgreSQL persistence layer", dependencies: [] },
  ],
  dataFlow: "Client → API Gateway → Services → Database. Real-time: Client ←→ WebSocket Server ←→ Pub/Sub ←→ Database",
};

export const SAMPLE_TASK_GRAPH_CONTENT: TaskGraphArtifact["content"] = {
  tasks: [
    { id: "task-1", title: "Project Setup", description: "Initialize monorepo, set up CI/CD, configure linting", dependencies: [], estimatedEffort: "1 day", phase: "setup" },
    { id: "task-2", title: "Auth Integration", description: "Set up Auth0 SSO integration", dependencies: ["task-1"], estimatedEffort: "2 days", phase: "foundation" },
    { id: "task-3", title: "Database Schema", description: "Design and implement PostgreSQL schema", dependencies: ["task-1"], estimatedEffort: "1 day", phase: "foundation" },
    { id: "task-4", title: "REST API", description: "Build CRUD API for boards and tasks", dependencies: ["task-2", "task-3"], estimatedEffort: "3 days", phase: "core" },
    { id: "task-5", title: "WebSocket Server", description: "Implement real-time updates", dependencies: ["task-3"], estimatedEffort: "2 days", phase: "core" },
    { id: "task-6", title: "Frontend Shell", description: "Create React app with routing and layout", dependencies: ["task-1"], estimatedEffort: "2 days", phase: "core" },
    { id: "task-7", title: "Board UI", description: "Build kanban board components", dependencies: ["task-4", "task-5", "task-6"], estimatedEffort: "3 days", phase: "feature" },
    { id: "task-8", title: "Mobile Optimization", description: "Optimize for mobile-first experience", dependencies: ["task-7"], estimatedEffort: "2 days", phase: "polish" },
  ],
};

export const SAMPLE_TEST_STRATEGY_CONTENT: TestStrategyArtifact["content"] = {
  approach: "Test pyramid: unit tests for logic, integration tests for API, E2E tests for critical paths",
  levels: [
    { level: "unit", description: "Unit tests for all domain logic and services", coverage: "80%+" },
    { level: "integration", description: "API integration tests with real database", coverage: "Critical paths" },
    { level: "e2e", description: "End-to-end tests for user flows", coverage: "Happy paths + error scenarios" },
  ],
  environments: ["development", "staging", "production"],
};

export const SAMPLE_DEV_RESULT_CONTENT: DevExecutionResultArtifact["content"] = {
  taskId: "task-1",
  changes: [
    { path: "src/index.ts", changeType: "create" as const, description: "Main entry point", diff: "+export { handler } from './server'" },
    { path: "src/server.ts", changeType: "create" as const, description: "HTTP server setup", diff: "+import express from 'express';" },
    { path: "package.json", changeType: "create" as const, description: "Package configuration", diff: '+{"name": "task-tracker"}' },
  ],
  summary: "Initialized project with Express server, TypeScript config, and test setup",
  testResults: [
    { testName: "server starts", status: "pass" as const },
    { testName: "health endpoint responds", status: "pass" as const },
  ],
};

export const SAMPLE_QA_REPORT_PASS_CONTENT: QaReportArtifact["content"] = {
  overallStatus: "pass",
  acResults: [
    { acId: "ac-1", status: "pass", evidence: "New column creation verified" },
    { acId: "ac-2", status: "pass", evidence: "Real-time sync verified within 2s" },
    { acId: "ac-3", status: "pass", evidence: "Mobile layout verified" },
    { acId: "ac-4", status: "pass", evidence: "Auth0 login within 2s" },
    { acId: "ac-5", status: "pass", evidence: "Offline changes synced" },
  ],
  defects: [],
  summary: "All acceptance criteria passed. No defects found.",
};

export const SAMPLE_QA_REPORT_FAIL_CONTENT: QaReportArtifact["content"] = {
  overallStatus: "fail",
  acResults: [
    { acId: "ac-1", status: "pass", evidence: "New column creation verified" },
    { acId: "ac-2", status: "fail", evidence: "Updates took 5+ seconds, exceeding 2s requirement" },
    { acId: "ac-3", status: "pass", evidence: "Mobile layout verified" },
    { acId: "ac-4", status: "not_tested", evidence: "Auth module not yet integrated" },
    { acId: "ac-5", status: "not_tested", evidence: "Offline mode not yet implemented" },
  ],
  defects: [
    { id: "def-1", description: "Real-time updates exceed 2s latency requirement", severity: "critical" as const, relatedAcId: "ac-2" },
  ],
  summary: "Real-time updates exceed latency requirement. Auth and offline features not yet testable.",
};

export const SAMPLE_AC_MATRIX_PASS_CONTENT: AcMatrixArtifact["content"] = {
  criteria: [
    { acId: "ac-1", requirementId: "req-1", description: "Users can add columns", status: "pass", evidence: "Verified" },
    { acId: "ac-2", requirementId: "req-2", description: "Real-time sync within 2s", status: "pass", evidence: "Verified" },
    { acId: "ac-3", requirementId: "req-3", description: "Mobile-optimized layout", status: "pass", evidence: "Verified" },
    { acId: "ac-4", requirementId: "req-4", description: "SSO login within 2s", status: "pass", evidence: "Verified" },
    { acId: "ac-5", requirementId: "req-5", description: "Offline sync works", status: "pass", evidence: "Verified" },
  ],
};

export const SAMPLE_RELEASE_DECISION_CONTENT: ReleaseDecisionArtifact["content"] = {
  decision: "release",
  rationale: "All acceptance criteria met, no critical defects, QA passed",
  qaSummary: "5/5 AC passed, 0 defects",
  outstandingRisks: [],
};

export const FIXTURE_PROJECT_ID = "00000000-0000-0000-0000-000000000001" as unknown as ProjectId;
export const FIXTURE_WORKFLOW_RUN_ID = "00000000-0000-0000-0000-000000000002" as unknown as WorkflowRunId;
export const FIXTURE_ARTIFACT_ID = "00000000-0000-0000-0000-000000000003" as unknown as import("@workflow-jk/contracts").ArtifactId;
export const FIXTURE_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000000" as unknown as OrganizationId;