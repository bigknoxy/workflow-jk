import type { EvaluationCase } from "../schemas.js";
import type { RequirementsCriticAgentInput } from "@workflow-jk/contracts";
import { SAMPLE_BRIEF_CONTENT } from "@workflow-jk/testing";

const DETAILED_BRIEF: RequirementsCriticAgentInput["brief"] = {
  problemStatement: "Remote teams lack a real-time collaborative whiteboard that works well on tablets and supports both structured and unstructured ideation",
  targetUsers: "Remote teams of 3-20 people who need visual collaboration during meetings and async brainstorming",
  businessValue: "Reduce remote meeting time by 30% through async visual collaboration and better ideation",
  keyFeatures: ["Infinite canvas", "Drawing tools", "Sticky notes", "Shapes and images", "Real-time cursors", "Slack integration"],
  constraints: ["Must work on tablets", "Budget under $100k", "Slack integration", "50+ concurrent users", "WCAG 2.1 AA"],
  assumptions: ["Teams of 3-20", "Existing Slack workspace", "WebRTC available", "Cloud deployment"],
  outOfScope: ["Video conferencing", "File storage beyond images", "Code collaboration"],
};

export const criticCases: EvaluationCase[] = [
  {
    id: "critic-001",
    name: "Standard brief produces quality critique",
    description: "A well-formed brief should produce a critique with clarification questions, risks, and draft ACs",
    agentName: "RequirementsCriticAgent",
    input: { brief: SAMPLE_BRIEF_CONTENT } satisfies RequirementsCriticAgentInput,
    rubric: {
      requiredFields: ["clarificationQuestions", "identifiedRisks", "missingConstraints", "assumptions", "draftAcceptanceCriteria"],
      qualityChecks: [
        { description: "Clarification questions present", check: "has_clarificationQuestions", weight: 1 },
        { description: "At least 2 clarification questions", check: "min_length_2_clarificationQuestions", weight: 0.8 },
        { description: "Risks identified", check: "has_identifiedRisks", weight: 1 },
        { description: "Draft acceptance criteria present", check: "has_draftAcceptanceCriteria", weight: 1 },
        { description: "Each question has id and category", check: "array_items_have_id_clarificationQuestions", weight: 0.8 },
      ],
      schemaConformance: true,
    },
    tags: ["critic", "smoke"],
  },
  {
    id: "critic-002",
    name: "Detailed brief identifies specific technical gaps",
    description: "A detailed brief with many constraints should produce critique identifying remaining gaps",
    agentName: "RequirementsCriticAgent",
    input: { brief: DETAILED_BRIEF } satisfies RequirementsCriticAgentInput,
    rubric: {
      requiredFields: ["clarificationQuestions", "identifiedRisks", "missingConstraints", "assumptions", "draftAcceptanceCriteria"],
      qualityChecks: [
        { description: "Clarification questions present", check: "has_clarificationQuestions", weight: 1 },
        { description: "Risks identified with severity", check: "has_identifiedRisks", weight: 1 },
        { description: "Draft ACs have multiple items", check: "min_length_2_draftAcceptanceCriteria", weight: 1 },
        { description: "Each risk has id and severity", check: "array_items_have_id_identifiedRisks", weight: 0.8 },
      ],
      schemaConformance: true,
    },
    tags: ["critic", "detailed"],
  },
  {
    id: "critic-003",
    name: "Vague brief surfaces ambiguity questions",
    description: "A vague brief should produce critique that focuses on ambiguity and missing constraints",
    agentName: "RequirementsCriticAgent",
    input: {
      brief: {
        problemStatement: "People need to share files",
        targetUsers: "Users",
        businessValue: "Make sharing easier",
        keyFeatures: ["Upload", "Download"],
        constraints: ["Must be fast"],
        assumptions: [],
        outOfScope: [],
      },
    } satisfies RequirementsCriticAgentInput,
    rubric: {
      requiredFields: ["clarificationQuestions", "identifiedRisks", "missingConstraints", "assumptions", "draftAcceptanceCriteria"],
      qualityChecks: [
        { description: "Questions probe vagueness", check: "min_length_2_clarificationQuestions", weight: 1 },
        { description: "Missing constraints identified", check: "has_missingConstraints", weight: 1 },
        { description: "Draft ACs present", check: "has_draftAcceptanceCriteria", weight: 0.8 },
      ],
      schemaConformance: true,
    },
    tags: ["critic", "edge-case"],
  },
  {
    id: "critic-004",
    name: "Brief with contradictions flags risk",
    description: "A brief with contradictory constraints should identify risks",
    agentName: "RequirementsCriticAgent",
    input: {
      brief: {
        problemStatement: "Need a file sharing system",
        targetUsers: "Enterprise users with high security requirements",
        businessValue: "Secure file sharing reduces data breach risk",
        keyFeatures: ["End-to-end encryption", "Public sharing links", "Admin controls"],
        constraints: ["Must be end-to-end encrypted", "Must have public sharing links", "No user training required", "Zero latency"],
        assumptions: ["All users are technical", "No training needed"],
        outOfScope: ["Email integration", "Version control"],
      },
    } satisfies RequirementsCriticAgentInput,
    rubric: {
      requiredFields: ["clarificationQuestions", "identifiedRisks", "missingConstraints"],
      qualityChecks: [
        { description: "Risks identified", check: "has_identifiedRisks", weight: 1 },
        { description: "Questions address contradictions", check: "min_length_2_clarificationQuestions", weight: 0.8 },
        { description: "Missing constraints noted", check: "has_missingConstraints", weight: 0.8 },
      ],
      schemaConformance: true,
    },
    tags: ["critic", "risk"],
  },
  {
    id: "critic-005",
    name: "Enterprise brief identifies compliance gaps",
    description: "An enterprise brief should flag compliance and governance concerns",
    agentName: "RequirementsCriticAgent",
    input: {
      brief: {
        problemStatement: "Enterprise teams need a document management system with version control and approval workflows",
        targetUsers: "Enterprise teams of 50-500 people in regulated industries",
        businessValue: "Reduce audit preparation time by 60% through automated compliance reporting",
        keyFeatures: ["Document versioning", "Approval workflows", "Compliance dashboards", "Role-based access", "Audit trails"],
        constraints: ["SOC 2 Type II", "GDPR compliance", "10,000+ user scale", "99.99% uptime SLA"],
        assumptions: ["Active Directory available", "AWS hosting", "Java/Spring backend"],
        outOfScope: ["Email notifications", "Mobile app"],
      },
    } satisfies RequirementsCriticAgentInput,
    rubric: {
      requiredFields: ["clarificationQuestions", "identifiedRisks", "missingConstraints", "draftAcceptanceCriteria"],
      qualityChecks: [
        { description: "Risks address enterprise concerns", check: "has_identifiedRisks", weight: 1 },
        { description: "Multiple clarification questions", check: "min_length_2_clarificationQuestions", weight: 1 },
        { description: "Draft ACs are substantive", check: "min_length_2_draftAcceptanceCriteria", weight: 0.8 },
        { description: "Assumptions documented with confidence", check: "array_items_have_id_assumptions", weight: 0.8 },
      ],
      schemaConformance: true,
    },
    tags: ["critic", "enterprise"],
  },
];