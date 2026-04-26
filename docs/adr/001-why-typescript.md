# ADR-001: Why TypeScript

## Status: Accepted

## Context
We need a primary language for a multi-agent software delivery platform that requires strong typing, async orchestration, and shared contracts between frontend, backend, and workflow layers.

## Decision
Use TypeScript throughout the entire monorepo.

## Rationale
- **Shared contracts**: Zod schemas compile to runtime validators AND TypeScript types. One source of truth for both API validation and type safety.
- **Temporal SDK**: First-class TypeScript SDK with proper typing for workflows, signals, and queries.
- **Ecosystem**: React/Next.js, Fastify, Vitest, Playwright all have best-in-class TypeScript support.
- **Safety**: Strict mode catches entire classes of bugs at compile time — critical for a workflow engine where invalid state transitions are catastrophic.
- **Monorepo DX**: TypeScript project references enable incremental builds and type checking across packages.

## Consequences
- Slightly more verbose than Python/Go
- Requires build step (but turbo + tsx make this fast)
- Type branding prevents accidental ID misuse