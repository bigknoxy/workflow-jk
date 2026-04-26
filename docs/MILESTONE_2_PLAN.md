# Milestone 2 Plan: End-to-End Workflow + Real Persistence

**Date:** 2026-04-19
**Goal:** Make the system actually work end-to-end with real persistence and a functioning workflow engine.

---

## Guiding Principles

- **Ship working software over completeness** -- Each M2 workstream must produce a runnable, testable increment.
- **Preserve the fake-first architecture** -- Real adapters are added alongside fakes, chosen by config.
- **No breaking contract changes** -- M2 adds fields and implementations, never removes or renames.
- **Test every real thing** -- Each new real adapter gets its own test suite.

---

## M2-1: Real Provider Routing Layer

**Problem:** Agent I/O contracts use `z.unknown()` for Architect, Dev, and QA agents. The container only switches LLM providers -- all other adapters are always fake.

**Scope:**
- Replace `z.unknown()` in `ArchitectAgentInput/Output`, `DevAgentInput/Output`, `QaAgentInput/Output` with concrete Zod schemas referencing artifact content types
- Add `LLMRouter` that wraps `FakeLLMProvider`/`OllamaProvider`/`OpenAICompatibleProvider` with retry, timeout, and fallback logic
- Add `AbortController` timeout on all LLM calls (configurable per-agent)
- Consume `policy.maxRetries` in `createAgent()` -- retry on parse failure and network error
- Add `FakeAgentPort` implementation for testing

**Deliverables:**
- Updated contracts with concrete schemas
- `LLMRouter` adapter with retry + timeout
- Agent retry logic
- Tests for retry, timeout, and routing

---

## M2-2: Real Persistence (PostgreSQL-backed)

**Problem:** All repos are in-memory. Restart loses all data.

**Scope:**
- Add `drizzle-orm` + `pg` dependencies
- Define database schema (tables: projects, workflows, workflow_events, artifacts, approvals)
- Create `db/migrate.ts` that actually runs migrations
- Implement `PostgresProjectRepository`, `PostgresWorkflowRepository`, `PostgresApprovalRepository`, `PostgresArtifactStore`
- Wire real repos into `createContainer()` when `DATABASE_URL` is set
- Add health check endpoint that verifies DB connectivity
- Docker Compose: ensure Postgres is healthy before API starts

**Deliverables:**
- 4 new Postgres adapter implementations
- Migration script
- Integration tests against real Postgres (Docker)
- Updated `createContainer()` with database routing

---

## M2-3: Human Review and Operator UX (Inline Workflow Engine)

**Problem:** The workflow stops after `AwaitingClarification`. There is no mechanism to resume.

**Scope (M2 scope -- inline engine, NOT Temporal):**
- Build an `InlineWorkflowEngine` that replaces the current `runInlineWorkflow` in routes
- The engine maintains a state machine per workflow run and exposes `resume()` methods
- `resume()` takes a workflow run ID + signal payload, advances the state machine, runs the next activity, and persists state
- Implement all 10 workflow stages:
  1. Intake (existing)
  2. Requirements Critique (existing)
  3. Awaiting Clarification → resume with answers → finalize requirements
  4. Requirements Approval → resume with approval → start architecture
  5. Architecture → Awaiting Architecture Approval
  6. Architecture Approval → resume with approval → start dev
  7. Dev Execution (per task in task graph)
  8. QA per task
  9. Rework loop if QA fails
  10. Release decision
- Wire API signals to engine `resume()` calls
- Add `fail` transitions from all states to `Failed`

**NOT in M2 scope:** Temporal workflow (deferred to M3), workflow cancellation, concurrent workflow support.

**Deliverables:**
- `InlineWorkflowEngine` class with `start()` and `resume()` methods
- All 10 stages implemented
- API signals wired to engine
- Integration test: full end-to-end workflow with fake LLM

---

## M2-4: Evaluation and Quality Harness

**Problem:** No systematic way to evaluate LLM output quality or detect regressions.

**Scope:**
- Add `packages/evaluation` with:
  - `EvaluationCase` schema (input, expected output shape, agent name, grading rubric)
  - `EvaluationRunner` that runs agents against cases and captures results
  - `ArtifactQualityScorer` that checks artifact completeness, structure, and schema conformance
- Create 5+ evaluation cases per agent (25+ total)
- Add `bun run eval` script
- Output results as JSON + markdown table

**Deliverables:**
- Evaluation package with runner and scorer
- 25+ evaluation cases
- `bun run eval` command
- Sample evaluation output

---

## M2-5: Stronger Dev/QA Execution Model

**Problem:** Dev and QA agents produce output but there's no loop for rework, no AC verification pipeline, and `finalizeRequirements` hardcodes NFRs and placeholder ACs.

**Scope:**
- Fix `finalizeRequirements` to derive NFRs from project input and critique
- Fix `finalizeRequirements` to generate real Given/When/Then from critique draft ACs
- Add `determineReworkScope()` in domain that maps failed ACs back to tasks
- Add `ReworkLoop` in the inline workflow engine that:
  - Runs QA on each task
  - If QA fails, marks tasks for rework
  - Re-runs dev on rework tasks
  - Re-runs QA on rework tasks
  - Caps at 3 rework iterations, then marks as `Failed`
- Wire rework loop into the inline workflow engine

**Deliverables:**
- Fixed `finalizeRequirements` with real AC/NFR generation
- `determineReworkScope()` domain function
- Rework loop in engine
- Tests for rework scenarios

---

## M2-6: Artifact and Prompt Governance

**Problem:** Agent prompts are strings in code with no versioning. Artifacts have no lineage tracking.

**Scope:**
- Add `promptVersion` field to each artifact (currently `schemaVersion` exists, add `promptVersion`)
- Add `parentArtifactIds` field to artifacts for lineage tracking
- Extract prompt templates to `packages/agents/src/prompts/` as separate versioned files
- Add prompt registry that maps `(agentName, promptVersion) → prompt template`
- Log prompt version in OTel spans

**Deliverables:**
- Updated artifact schemas with `promptVersion` and `parentArtifactIds`
- Extracted prompt templates
- Prompt registry
- Updated agents to use registry

---

## M2-7: Observability and Auditability Deepening

**Problem:** Metrics are attribute-only. No actual instruments. No audit log.

**Scope:**
- Add real OpenTelemetry instruments to `metrics.ts`:
  - `workflow_duration_ms` (Histogram)
  - `agent_invocation_count` (Counter)
  - `agent_duration_ms` (Histogram)
  - `artifact_created_count` (Counter by type)
  - `approval_decision_count` (Counter by decision type)
- Add `AuditLog` to domain:
  - Immutable append-only log of all state transitions, approvals, and agent invocations
  - Stored in `PostgresAuditLogRepository`
- Add `/api/projects/:id/audit` endpoint returning audit log
- Add OTel metrics export to Prometheus endpoint

**Deliverables:**
- 5 real OTel instruments
- AuditLog domain entity + repository
- Audit API endpoint
- Prometheus metrics endpoint

---

## M2-8: Production Hardening Basics

**Problem:** Various M1 shortcuts that would block production use.

**Scope:**
- Remove compiled `.js` files from `src/` directories (add `dist/` to `.gitignore`)
- Delete `package-lock.json` (use bun only)
- Add ESLint config (flat config with typescript-eslint)
- Remove `next-env.d.ts` from tracking, add to `.gitignore`
- Add error handling middleware to API (Fastify error handler, 404 handler)
- Add loading/error states to UI components
- Add CORS configuration to config
- Fix `DEFAULT_CONFIG` eager evaluation (lazy init)
- Add `fail` transitions to all state machine states

**Deliverables:**
- Clean gitignore
- ESLint config
- Error handling in API
- Loading/error UI states
- State machine fail transitions

---

## M2 Final: Test Pass and Documentation

**Scope:**
- Run full test suite against all new code
- Add integration tests for PostgreSQL adapters
- Add end-to-end test for full workflow (all 10 stages)
- Update README with M2 capabilities
- Add ADR-006 for inline workflow engine decision
- Add ADR-007 for PostgreSQL persistence decision
- Update turbo.json outputs
- Verify `bun run build`, `bun run typecheck`, `bun run test` all pass clean

---

## Dependency Order

```
M2-1 (Provider routing) ──┐
                           ├── M2-3 (Inline workflow engine) ── M2-5 (Rework loop)
M2-2 (PostgreSQL) ────────┘                    │
                                               ├── M2-6 (Prompt governance)
M2-4 (Eval harness) ──────────────────────────┘
                                               │
                               M2-7 (Observability) ── M2-8 (Hardening)
                                               │
                                          M2-Final (Tests + docs)
```

M2-1 and M2-2 can be done in parallel. M2-3 depends on both. M2-4 through M2-7 can be done in parallel after M2-3. M2-8 can start any time. M2-Final is last.