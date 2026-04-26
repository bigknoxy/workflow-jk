import type { EvaluationCase } from "../schemas.js";
import type { DevAgentInput } from "@workflow-jk/contracts";
import { TaskPack } from "@workflow-jk/contracts";

const STANDARD_TASK_PACK: DevAgentInput = {
  taskPack: {
    taskId: "task-1",
    title: "Project Setup",
    description: "Initialize the project with TypeScript, ESLint, and test framework. Set up monorepo structure with packages for contracts, domain, and adapters.",
    acceptanceCriteria: [
      { id: "ac-setup-1", given: "A developer clones the repo", when: "They run npm install", then: "All dependencies install successfully" },
      { id: "ac-setup-2", given: "The project is set up", when: "They run npm test", then: "Test suite runs and passes" },
      { id: "ac-setup-3", given: "The project is set up", when: "They run npm run build", then: "All packages compile without errors" },
    ],
    context: "Greenfield project. Using TypeScript monorepo with Turborepo. Testing with Vitest.",
  } satisfies TaskPack,
  context: "This is the first task. The project uses TypeScript with a monorepo structure. Packages: contracts, domain, adapters, agents, orchestration, application.",
};

export const devCases: EvaluationCase[] = [
  {
    id: "dev-001",
    name: "Standard task produces execution result",
    description: "A well-defined task should produce a dev execution result with changes and test results",
    agentName: "DevAgent",
    input: STANDARD_TASK_PACK,
    rubric: {
      requiredFields: ["summary", "changes", "testResults"],
      qualityChecks: [
        { description: "Summary is non-empty", check: "non_empty_string_summary", weight: 1 },
        { description: "Changes array is non-empty", check: "has_changes", weight: 1 },
        { description: "Test results present", check: "has_testResults", weight: 1 },
        { description: "At least one change listed", check: "min_length_1_changes", weight: 1 },
        { description: "Test results include pass/fail status", check: "has_testResults", weight: 0.8 },
      ],
      schemaConformance: true,
    },
    tags: ["dev", "smoke"],
  },
  {
    id: "dev-002",
    name: "Dev result includes file paths",
    description: "Each change should have a meaningful file path",
    agentName: "DevAgent",
    input: STANDARD_TASK_PACK,
    rubric: {
      requiredFields: ["summary", "changes", "testResults"],
      qualityChecks: [
        { description: "Changes array present", check: "has_changes", weight: 1 },
        { description: "Summary present", check: "non_empty_string_summary", weight: 1 },
        { description: "Test results present", check: "has_testResults", weight: 1 },
      ],
      schemaConformance: true,
    },
    tags: ["dev"],
  },
  {
    id: "dev-003",
    name: "API endpoint task produces structured changes",
    description: "An API-focused task should produce changes with clear descriptions",
    agentName: "DevAgent",
    input: {
      taskPack: {
        taskId: "task-api-1",
        title: "REST API Endpoints",
        description: "Implement CRUD REST API endpoints for task resource. Include validation, error handling, and OpenAPI spec.",
        acceptanceCriteria: [
          { id: "ac-api-1", given: "Server is running", when: "POST /tasks with valid data", then: "Returns 201 with created task" },
          { id: "ac-api-2", given: "Task exists", when: "GET /tasks/:id", then: "Returns 200 with task data" },
          { id: "ac-api-3", given: "No task with given id", when: "GET /tasks/invalid", then: "Returns 404" },
        ],
        context: "Using Express.js or Fastify. Zod for validation. PostgreSQL for persistence.",
      },
      context: "Building REST API for task management. Fastify server with Zod validation.",
    } satisfies DevAgentInput,
    rubric: {
      requiredFields: ["summary", "changes", "testResults"],
      qualityChecks: [
        { description: "Summary describes API changes", check: "has_summary", weight: 1 },
        { description: "Changes include file paths", check: "has_changes", weight: 1 },
        { description: "Test results present", check: "has_testResults", weight: 1 },
        { description: "Multiple changes listed", check: "min_length_2_changes", weight: 0.8 },
      ],
      schemaConformance: true,
    },
    tags: ["dev", "api"],
  },
  {
    id: "dev-004",
    name: "Database task includes schema changes",
    description: "A database-related task should produce meaningful change descriptions",
    agentName: "DevAgent",
    input: {
      taskPack: {
        taskId: "task-db-1",
        title: "Database Schema Setup",
        description: "Design and implement PostgreSQL schema for tasks, projects, and users tables with proper indexes and foreign keys.",
        acceptanceCriteria: [
          { id: "ac-db-1", given: "Database is set up", when: "Migration is run", then: "All tables are created with correct schema" },
          { id: "ac-db-2", given: "Tables exist", when: "Foreign key constraint is tested", then: "Constraint is enforced" },
        ],
        context: "Using Drizzle ORM with PostgreSQL. UUID primary keys. Timestamps on all tables.",
      },
      context: "Setting up database layer with Drizzle ORM and PostgreSQL for task management.",
    } satisfies DevAgentInput,
    rubric: {
      requiredFields: ["summary", "changes", "testResults"],
      qualityChecks: [
        { description: "Summary is non-empty", check: "non_empty_string_summary", weight: 1 },
        { description: "Changes are listed", check: "has_changes", weight: 1 },
        { description: "Test results exist", check: "has_testResults", weight: 1 },
      ],
      schemaConformance: true,
    },
    tags: ["dev", "database"],
  },
  {
    id: "dev-005",
    name: "Frontend task produces component changes",
    description: "A frontend task should produce component-related changes",
    agentName: "DevAgent",
    input: {
      taskPack: {
        taskId: "task-ui-1",
        title: "Task Board UI",
        description: "Build kanban-style task board component with drag-and-drop columns. Include task cards, column headers, and add-task button.",
        acceptanceCriteria: [
          { id: "ac-ui-1", given: "Board is rendered", when: "User sees the board", then: "Columns are displayed in kanban layout" },
          { id: "ac-ui-2", given: "User clicks add task", when: "Modal appears", then: "User can input task details" },
        ],
        context: "React with TypeScript. CSS modules for styling. @dnd-kit for drag and drop.",
      },
      context: "Building frontend with React and TypeScript. Mobile-first responsive design.",
    } satisfies DevAgentInput,
    rubric: {
      requiredFields: ["summary", "changes", "testResults"],
      qualityChecks: [
        { description: "Summary present", check: "non_empty_string_summary", weight: 1 },
        { description: "Changes listed", check: "has_changes", weight: 1 },
        { description: "Test results present", check: "has_testResults", weight: 1 },
      ],
      schemaConformance: true,
    },
    tags: ["dev", "frontend"],
  },
];