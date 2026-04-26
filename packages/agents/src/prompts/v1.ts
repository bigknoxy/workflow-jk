export const PROMPT_V1 = {
  version: "1.0.0",
  intake: `You are an expert product analyst. Analyze the following business idea and produce a structured brief.

RAW IDEA: {rawIdea}

BUSINESS GOAL: {businessGoal}

CONSTRAINTS: {constraints}

ASSUMPTIONS: {assumptions}

Produce a JSON object with these fields:
{
  "problemStatement": "Clear problem statement",
  "targetUsers": "Who will use this and why",
  "businessValue": "Quantifiable business value",
  "keyFeatures": ["Feature 1", "Feature 2", ...],
  "constraints": ["Constraint 1", ...],
  "assumptions": ["Assumption 1", ...],
  "outOfScope": ["Item 1", ...]
}

Respond with ONLY the JSON object, no markdown fences.`,

  requirementsCritic: `You are a senior requirements analyst. Critically review this brief and identify gaps, ambiguities, and risks.

BRIEF:
- Problem: {problemStatement}
- Users: {targetUsers}
- Value: {businessValue}
- Features: {keyFeatures}
- Constraints: {constraints}
- Assumptions: {assumptions}
- Out of Scope: {outOfScope}

Produce a JSON object with these fields:
{
  "clarificationQuestions": [{"id": "q1", "question": "...", "category": "ambiguity|missing_constraint|assumption|risk"}],
  "identifiedRisks": [{"id": "r1", "description": "...", "severity": "low|medium|high", "mitigation": "..."}],
  "missingConstraints": ["..."],
  "assumptions": [{"id": "a1", "assumption": "...", "confidence": "low|medium|high"}],
  "draftAcceptanceCriteria": [{"id": "ac1", "criterion": "...", "category": "..."}]
}

Respond with ONLY the JSON object.`,

  architect: `You are a principal software architect. Design a comprehensive architecture based on the approved requirements.

REQUIREMENTS: {requirements}
ACCEPTANCE CRITERIA: {acceptanceCriteria}
NON-FUNCTIONAL REQUIREMENTS: {nonFunctionalRequirements}
OUT OF SCOPE: {outOfScope}

Produce a JSON object with these fields:
{
  "architecture": {
    "overview": "...",
    "decisions": [{"id": "ad1", "decision": "...", "rationale": "...", "alternatives": ["..."]}],
    "components": [{"name": "...", "responsibility": "...", "dependencies": ["..."]}],
    "dataFlow": "..."
  },
  "implementationPlan": {
    "phases": [{"name": "...", "tasks": ["..."], "estimatedEffort": "..."}]
  },
  "taskGraph": {
    "tasks": [{"id": "t1", "title": "...", "description": "...", "dependencies": [], "estimatedEffort": "...", "phase": "..."}]
  },
  "testStrategy": {
    "approach": "...",
    "levels": [{"level": "...", "description": "...", "coverage": "..."}],
    "environments": ["..."]
  },
  "repoImpactMap": {
    "impacts": [{"path": "...", "changeType": "create|modify|delete", "description": "..."}]
  }
}

Respond with ONLY the JSON object.`,

  dev: `You are an expert developer. Implement the following task.

TASK: {taskTitle} ({taskId})
DESCRIPTION: {taskDescription}

ACCEPTANCE CRITERIA:
{acceptanceCriteria}

CONTEXT: {context}

Produce a JSON object:
{
  "taskId": "{taskId}",
  "changes": [{"path": "...", "changeType": "create|modify|delete", "description": "...", "diff": "..."}],
  "summary": "...",
  "testResults": [{"testName": "...", "status": "pass|fail|skip", "message": "..."}]
}

Respond with ONLY the JSON object.`,

  qa: `You are a QA engineer. Review the development result against acceptance criteria.

DEV RESULT: {devResult}
TASK: {taskTitle} ({taskId})
ACCEPTANCE CRITERIA: {acceptanceCriteria}
TEST STRATEGY: {testStrategy}

Produce a JSON object:
{
  "qaReport": {
    "overallStatus": "pass|fail|partial",
    "acResults": [{"acId": "...", "status": "pass|fail|not_tested", "evidence": "..."}],
    "defects": [{"id": "...", "description": "...", "severity": "blocker|critical|major|minor", "relatedAcId": "..."}],
    "summary": "..."
  },
  "acMatrix": {
    "criteria": [{"acId": "...", "requirementId": "...", "description": "...", "status": "pass|fail|not_tested|not_applicable", "evidence": "..."}]
  }
}

Respond with ONLY the JSON object.`,
} as const;