import type { EvaluationCase } from "../schemas.js";
import type { IntakeAgentInput } from "@workflow-jk/contracts";

export const intakeCases: EvaluationCase[] = [
  {
    id: "intake-001",
    name: "Vague idea produces structured brief",
    description: "A vague single-sentence idea should produce a complete brief with all required fields",
    agentName: "IntakeAgent",
    input: {
      rawIdea: "I want something for tracking stuff",
      businessGoal: "Make teams more organized",
      constraints: ["Must be simple"],
      assumptions: ["Small teams"],
    } satisfies IntakeAgentInput,
    rubric: {
      requiredFields: ["problemStatement", "targetUsers", "businessValue", "keyFeatures", "constraints", "assumptions", "outOfScope"],
      qualityChecks: [
        { description: "Problem statement is substantive", check: "non_empty_string_problemStatement", weight: 1 },
        { description: "Target users is specific", check: "non_empty_string_targetUsers", weight: 1 },
        { description: "Key features has at least 2 items", check: "min_length_2_keyFeatures", weight: 0.8 },
        { description: "Constraints list is non-empty", check: "has_constraints", weight: 0.7 },
        { description: "Out of scope is defined", check: "has_outOfScope", weight: 0.5 },
      ],
      schemaConformance: true,
    },
    tags: ["smoke", "intake"],
  },
  {
    id: "intake-002",
    name: "Well-specified idea produces rich brief",
    description: "A detailed idea with clear goals should produce a rich brief with multiple features and constraints",
    agentName: "IntakeAgent",
    input: {
      rawIdea: "A real-time collaborative whiteboard for remote teams that supports drawing, sticky notes, shapes, and images. Teams should be able to create infinite canvases, invite members, and see each other's cursors in real-time.",
      businessGoal: "Reduce remote meeting time by 30% through async visual collaboration",
      constraints: ["Must work on tablets", "Budget under $100k", "Must integrate with Slack", "Support 50+ concurrent users", "WCAG 2.1 AA compliance"],
      assumptions: ["Teams of 3-20 people", "Using existing Slack workspace", "WebRTC for real-time", "Cloud deployment"],
    } satisfies IntakeAgentInput,
    rubric: {
      requiredFields: ["problemStatement", "targetUsers", "businessValue", "keyFeatures", "constraints", "assumptions", "outOfScope"],
      qualityChecks: [
        { description: "Problem statement is substantive", check: "non_empty_string_problemStatement", weight: 1 },
        { description: "Key features has at least 3 items", check: "min_length_3_keyFeatures", weight: 1 },
        { description: "Constraints preserved or expanded", check: "min_length_3_constraints", weight: 1 },
        { description: "Out of scope has items", check: "min_length_1_outOfScope", weight: 0.8 },
      ],
      schemaConformance: true,
    },
    tags: ["intake", "detailed"],
  },
  {
    id: "intake-003",
    name: "Minimal input still produces valid brief",
    description: "Even with minimal constraints and assumptions, the brief should have all required fields",
    agentName: "IntakeAgent",
    input: {
      rawIdea: "A habit tracking app that sends reminders and shows streaks",
      businessGoal: "Help people build better habits",
      constraints: [],
      assumptions: [],
    } satisfies IntakeAgentInput,
    rubric: {
      requiredFields: ["problemStatement", "targetUsers", "businessValue", "keyFeatures", "constraints", "assumptions", "outOfScope"],
      qualityChecks: [
        { description: "All required fields present", check: "has_problemStatement", weight: 1 },
        { description: "Key features non-empty", check: "has_keyFeatures", weight: 1 },
        { description: "Business value defined", check: "non_empty_string_businessValue", weight: 1 },
      ],
      schemaConformance: true,
    },
    tags: ["intake", "edge-case"],
  },
  {
    id: "intake-004",
    name: "Technical project produces detailed constraints",
    description: "A technical project should produce a brief with technical constraints reflected",
    agentName: "IntakeAgent",
    input: {
      rawIdea: "A CLI tool for managing Kubernetes deployments with rollback support and canary releases",
      businessGoal: "Reduce deployment failures by 80% through safer release automation",
      constraints: ["Must be a CLI tool", "Kubernetes native", "Zero-downtime deployments", "Audit log support", "RBAC integration"],
      assumptions: ["Kubernetes cluster already running", "kubectl installed", "Helm 3 for packaging"],
    } satisfies IntakeAgentInput,
    rubric: {
      requiredFields: ["problemStatement", "targetUsers", "businessValue", "keyFeatures", "constraints", "assumptions"],
      qualityChecks: [
        { description: "Key features reflect technical nature", check: "min_length_3_keyFeatures", weight: 1 },
        { description: "Constraints preserved", check: "min_length_3_constraints", weight: 1 },
        { description: "Target users mentions technical users", check: "has_targetUsers", weight: 0.8 },
      ],
      schemaConformance: true,
    },
    tags: ["intake", "technical"],
  },
  {
    id: "intake-005",
    name: "Enterprise project brief includes scalability concerns",
    description: "An enterprise project idea should produce a brief that addresses scale and compliance",
    agentName: "IntakeAgent",
    input: {
      rawIdea: "An enterprise document management system with version control, approval workflows, and compliance reporting",
      businessGoal: "Reduce document compliance audit time by 60% and eliminate version conflicts",
      constraints: ["SOC 2 Type II compliance", "GDPR data residency", "Must support 10,000+ users", "99.99% uptime SLA", "SSO with SAML 2.0"],
      assumptions: ["Existing Active Directory", "AWS deployment", "Java/Spring backend preferred", "PDF and Office document formats"],
    } satisfies IntakeAgentInput,
    rubric: {
      requiredFields: ["problemStatement", "targetUsers", "businessValue", "keyFeatures", "constraints", "assumptions", "outOfScope"],
      qualityChecks: [
        { description: "Problem statement is substantive", check: "non_empty_string_problemStatement", weight: 1 },
        { description: "Constraints include enterprise concerns", check: "min_length_3_constraints", weight: 1 },
        { description: "Key features comprehensive", check: "min_length_3_keyFeatures", weight: 1 },
        { description: "Out of scope defined", check: "has_outOfScope", weight: 0.8 },
      ],
      schemaConformance: true,
    },
    tags: ["intake", "enterprise"],
  },
  {
    id: "intake-006",
    name: "Consumer app brief captures user experience focus",
    description: "A consumer-facing app idea should produce a brief focused on user experience and engagement",
    agentName: "IntakeAgent",
    input: {
      rawIdea: "A social recipe sharing app where users can share cooking recipes, follow chefs, and create meal plans from shared recipes",
      businessGoal: "Build a community of 100K home cooks sharing 500K recipes within 12 months",
      constraints: ["Must have beautiful food photography", "Mobile-first iOS and Android", "Freemium model", "Under 3 second page loads"],
      assumptions: ["Users have smartphones", "Content moderation needed", "Cloudinary for image hosting", "React Native"],
    } satisfies IntakeAgentInput,
    rubric: {
      requiredFields: ["problemStatement", "targetUsers", "businessValue", "keyFeatures"],
      qualityChecks: [
        { description: "Problem statement is substantive", check: "non_empty_string_problemStatement", weight: 1 },
        { description: "Target users mentions consumers", check: "has_targetUsers", weight: 1 },
        { description: "Key features include social features", check: "min_length_3_keyFeatures", weight: 0.8 },
      ],
      schemaConformance: true,
    },
    tags: ["intake", "consumer"],
  },
];