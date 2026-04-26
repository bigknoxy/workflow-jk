# ADR-003: Why Artifact-Driven Context

## Status: Accepted

## Context
Agents need context to make decisions. Naive approaches (full transcript replay, chat history) are expensive and don't scale.

## Decision
All agent communication happens through versioned artifacts, not conversation history. Agents receive only the artifacts, summaries, and policy relevant to their current task.

## Rationale
- **Token efficiency**: Passing a Brief artifact is 200 tokens; passing the entire conversation is 20,000.
- **Determinism**: Same artifact + same agent = same output. Full history introduces nondeterminism.
- **Auditability**: Every artifact is versioned, queryable, and traceable.
- **Composability**: Any agent can consume any artifact without knowing its origin.
- **Testability**: Fakes produce artifacts; real agents produce artifacts; tests validate artifacts.

## Consequences
- Requires explicit artifact schema management
- Agents can't reference "what we discussed earlier" — must be in the artifact
- Artifact schemas need migration strategy as they evolve