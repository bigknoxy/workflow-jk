# ADR-007: Artifact Prompt Governance

## Status: Accepted

## Context
We need to track which prompt version produced each artifact for:
- Reproducibility: Re-run with same prompt to verify output differences
- Lineage: Trace artifacts back to their source prompts
- Compliance: Audit trail for AI-generated code
- Debugging: Understand context that led to artifact

## Decision
Add `promptVersion` and `parentArtifactIds` fields to ArtifactBase schema, implement PromptRegistry:

### Schema Changes

```typescript
// In contracts/src/artifacts.ts
interface ArtifactBase {
  id: string;
  projectId: ProjectId;
  type: string;
  version: number;
  content: unknown;
  // NEW FIELDS
  promptVersion?: string;         // Hash of prompt used
  parentArtifactIds?: string[];   // Prior artifacts for context
  createdAt: Date;
}
```

### PromptRegistry

```typescript
// In agents/src/prompt-registry.ts
interface PromptRegistry {
  register(prompt: string): string;  // Returns hash
  get(hash: string): Prompt | undefined;
  list(): Prompt[];               // All versions
}
```

### Usage in Agents

```typescript
const registry = new PromptRegistry(...);

// Get prompt for agent
const prompt = registry.getForAgent('intake', context);
const hash = registry.register(prompt);

// Pass to LLM
const result = await llm.complete(prompt);

// Store with governance metadata
await artifactStore.save({
  type: 'brief',
  content: result,
  promptVersion: hash,
  parentArtifactIds: context.previousArtifactIds,
});
```

## Consequences

### Positive
- Full artifact lineage tracking
- Reproducible agent outputs
- Versioned prompt templates
- Clear audit trail

### Negative
- Schema migration required
- Additional storage for prompt history
- More complex agent initialization

### Neutral
- Prompt templates stored separately from artifacts
- Registry can be in-memory or persisted
- Hash function must be consistent (SHA-256 recommended)