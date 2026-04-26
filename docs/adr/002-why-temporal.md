# ADR-002: Why Temporal

## Status: Accepted

## Context
We need a durable workflow engine that supports long-running processes, human-in-the-loop pauses, retries, and replay-based testing.

## Decision
Use Temporal with the TypeScript SDK for workflow orchestration.

## Rationale
- **Durable execution**: Workflow state survives process crashes. Critical for multi-hour/multi-day delivery cycles.
- **Signals**: Native support for human-in-the-loop patterns (clarification answers, approvals) without polling.
- **Deterministic replay**: Temporal replays workflow history to reconstruct state, enabling reliable testing.
- **Visibility**: Temporal UI provides built-in observability for workflow state.
- **TypeScript SDK**: First-class support with proper typing.

## Consequences
- Requires Temporal server infrastructure (Docker Compose for local dev)
- Workflow code must be deterministic (no random, no network calls in workflow)
- Learning curve for Temporal's execution model
- Milestone 1 uses inline workflow runner as a stepping stone; real Temporal integration in M2