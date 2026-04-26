# Milestone 3 Pre-Implementation Audit

**Date:** 2026-04-20
**Auditor:** AI Agent (Phase 0)
**Status:** COMPLETE

---

## 1. M2 Claim Verification

| M2 Claim | Status | Evidence | Gap |
|----------|--------|----------|-----|
| InlineWorkflowEngine (10 stages) | VERIFIED | `packages/orchestration/src/inline-engine.ts` implements start/resume with all stage transitions, rework loop capped at 3 | None |
| PostgreSQL repos (4) | VERIFIED | PostgresProjectRepository, PostgresWorkflowRepository, PostgresApprovalRepository, PostgresArtifactStore in `packages/adapters/src/real/` | None |
| LLMRouter with retry/timeout | VERIFIED | `packages/adapters/src/real/llm-router.ts` implements exponential backoff, AbortController timeout, fallback provider | None |
| Agent retry logic | VERIFIED | `packages/agents/src/agent-base.ts` consumes `policy.maxRetries`; test in `agent-retry.test.ts` | None |
| FakeAgentPort | VERIFIED | `packages/adapters/src/fake/fake-agent-port.ts` | None |
| Evaluation harness (25+ cases) | VERIFIED | `packages/evaluation/` with 5 agent case files totaling 37 test cases | None |
| Rework loop | VERIFIED | InlineWorkflowEngine handles rework up to 3 iterations | None |
| AC evaluator + rework scope | VERIFIED | `packages/domain/src/ac-evaluator.ts` + `determineReworkScope()` | None |
| Artifact governance (promptVersion, parentArtifactIds) | VERIFIED | `ArtifactBase` in `packages/contracts/src/artifacts.ts` has both optional fields | Tests exist in `artifact-governance.test.ts` |
| PromptRegistry | VERIFIED | `packages/agents/src/prompts/registry.ts` with get, register, list functions | 5 prompts registered for v1.0.0 |
| OTel instruments (5) | VERIFIED | `packages/observability/src/metrics.ts` defines 5 instruments | **PARTIAL**: `workflowDuration` and `agentInvocationsTotal` exist but are never called from routes/activities — only `workflowStartedTotal` and `approvalDecisionsTotal` are used in production code |
| AuditLog entity + repository | VERIFIED | `AuditLog` in contracts, factory in domain, InMemory + Postgres repos | **GAP**: Only `save` and `getByProjectId` methods; no append-only enforcement, no tamper-evident mechanism |
| Audit API endpoint | VERIFIED | `GET /api/projects/:projectId/audit` | No query/filter/pagination |
| Prometheus endpoint | VERIFIED | `GET /api/metrics` returns placeholder text | Real metrics on separate port 9090 via PrometheusExporter |
| ESLint config | VERIFIED | `eslint.config.ts` with flat config | None |
| Error handling middleware | VERIFIED | `app.setErrorHandler()` in server.ts | No 401/403 handling (no auth exists) |
| LoadingSpinner + ErrorState components | VERIFIED | `LoadingSpinner.tsx`, `ErrorState.tsx` with ErrorBoundary | None |
| CORS configuration | VERIFIED | `@fastify/cors` registered | **GAP**: `origin: true` allows ALL origins — not production-safe |
| State machine fail transitions | VERIFIED | Fail transitions from 8 states | None |
| 8 integration tests | VERIFIED | `apps/api/src/__tests__/integration.test.ts` | None |
| README updated | VERIFIED | Architecture overview, features, commands | None |
| ADR-006 | VERIFIED | OTel + Prometheus decision | None |
| ADR-007 | VERIFIED | Artifact prompt governance | None |

### M2 Claims NOT Fully Supported

1. **Observability is incomplete**: ADR-006 and M2-7 claim 5 instruments but only 2 are used in production routes (`workflowStartedTotal`, `approvalDecisionsTotal`). `workflowDuration` is never recorded, `agentInvocationsTotal` is never incremented. Tests verify creation, not usage.

2. **Audit is not append-only**: The `AuditLogRepository` interface allows `save` and `getByProjectId` only — but there is no enforcement that records cannot be updated or deleted at the DB level. No tamper-evident hashing.

3. **CORS is wide open**: `origin: true` allows any origin. M2-8 claimed "CORS configuration to config" but it was never made configurable.

---

## 2. Security Risks

### CRITICAL

| # | Risk | Area | Details |
|---|------|------|---------|
| S1 | **No authentication** | API, Web, Contracts | Zero auth middleware. Every endpoint is publicly accessible. No user identity concept. |
| S2 | **No authorization/RBAC** | Domain, API | No roles, permissions, or policy enforcement. Anyone can approve anything. `reviewer` is a free-text string. |
| S3 | **No multi-tenancy** | Adapters, DB, Contracts | No `tenant_id` on any table. No data isolation. All projects accessible to everyone. |
| S4 | **Approval has no identity verification** | Domain, API | `ApprovalRecord.reviewer` is `z.string()`. Any caller can pass any name. No verification that the reviewer is authorized. |

### HIGH

| # | Risk | Area | Details |
|---|------|------|---------|
| S5 | **CORS allows all origins** | API | `@fastify/cors` configured with `origin: true` — any website can make API calls |
| S6 | **No rate limiting** | API | No rate limit on any endpoint. Vulnerable to abuse and DoS. |
| S7 | **Hardcoded DB credentials** | Config, Migrations | `postgresql://workflow:workflow@localhost:5432/workflow_jk` and `postgresql://postgres:postgres@localhost:5432/workflow_jk` in source code |
| S8 | **OpenAI API key defaults to empty** | Config | `openaiApiKey` has `z.string().default("")` — no validation when provider is "openai-compatible" |
| S9 | **No input validation on most endpoints** | API | Only `POST /api/projects` has Fastify schema. Path params are raw strings cast to branded types. No UUID format check. |
| S10 | **No CSRF protection** | Web, API | State-changing POST endpoints have no CSRF tokens. Combined with CORS `origin: true`, this is exploitable. |

### MEDIUM

| # | Risk | Area | Details |
|---|------|------|---------|
| S11 | **actor/reviewer are free-text** | Contracts, Domain | AuditLog.actor and ApprovalRecord.reviewer are unvalidated strings — no user ID reference |
| S12 | **No secrets masking in logs** | Observability | StructuredLogger could leak API keys or connection strings if error objects contain them |
| S13 | **No workflow timeout** | Orchestration | A workflow could wait for human input indefinitely. No max lifetime. |
| S14 | **No concurrent workflow protection** | Orchestration | `InlineWorkflowEngine` uses a `Map` for state. No locking. `resume()` called twice = double processing. |
| S15 | **Module-level global for activity deps** | Orchestration | `let deps: ActivityDependencies` is a singleton — not scoped, not thread-safe |
| S16 | **DEFAULT_CONFIG eagerly evaluated** | Config | Runs at import time, fails if env vars are invalid |
| S17 | **Error handler leaks details** | API | Non-500 non-400 errors pass through `err.name` and `err.message` — may leak internals |

### LOW

| # | Risk | Area | Details |
|---|------|------|---------|
| S18 | **No DB query tracing** | Observability | PostgreSQL queries are not instrumented |
| S19 | **Web uses `any` types** | Web | Heavy `any` usage in client components |
| S20 | **No request ID correlation** | API | Errors logged without request correlation ID |

---

## 3. Authorization Gaps

| Gap | Severity | Current State | Required State |
|-----|----------|---------------|----------------|
| No user identity | CRITICAL | `reviewer: z.string()` | `reviewer: UserId` with session-bound auth |
| No roles | CRITICAL | None | org_admin, reviewer, operator, requester, read_only_auditor |
| No permission checks | CRITICAL | None | Centralized PolicyService enforcing per-resource permissions |
| No API auth middleware | CRITICAL | All endpoints public | Auth middleware on all routes except health |
| No tenant context in auth | CRITICAL | None | Session includes tenant/org membership |
| Approval without role check | HIGH | Any string accepted as reviewer | Must verify caller has reviewer/approver role |
| No operation-level authz | HIGH | None | Sensitive ops (approval, execution, release) require explicit perms |

---

## 4. Tenant Isolation Gaps

| Gap | Severity | Current State | Required State |
|-----|----------|---------------|----------------|
| No tenant/org model | CRITICAL | None | Organization entity with TenantId |
| No tenant_id on any table | CRITICAL | 0 of 5 tables have tenant column | All tables have `tenant_id` FK to organizations |
| No row-level security | CRITICAL | None | PostgreSQL RLS policies or application-enforced tenant filter |
| Repos return all data | CRITICAL | `list()` returns all records | All queries scoped by tenant context |
| Cross-tenant access untested | HIGH | No tests attempt cross-tenant access | Explicit denial tests for each repository |
| Caches not tenant-scoped | MEDIUM | InMemoryProjectRepository etc. store everything | Tenant-filtered lookups |
| Artifact paths/keys not tenant-scoped | MEDIUM | `projectId` only | Include tenant in all lookup keys and storage paths |

---

## 5. Deployment and Secrets Risks

| Risk | Severity | Details |
|------|----------|---------|
| Hardcoded DB creds in source | HIGH | `postgresql://postgres:postgres@...` in config.ts and migrate.ts |
| API key defaults to empty | HIGH | `openaiApiKey: z.string().default("")` — silent failure mode |
| No startup validation of required config | HIGH | If `llmProvider=openai-compatible`, `openaiApiKey` is still optional |
| No .env.example | HIGH | No `.env.example` file exists in the repo |
| No env profiles | MEDIUM | Single `nodeEnv` enum; no dev/test/staging/prod config layers |
| DEFAULT_CONFIG eager eval | MEDIUM | Fails at import time if env vars are invalid |
| No readiness endpoint | MEDIUM | `/api/health` exists but no deep readiness (DB + deps check) |
| No deployment docs | MEDIUM | No guidance for local homelab or cloud/VPS deployment |

---

## 6. Dangerous Execution Paths

| Path | Severity | Risk |
|------|----------|------|
| DevAgent output contains `diff` strings | HIGH | Currently only applied via FakeRepoProvider (in-memory), but once real RepoProvider exists, arbitrary file mutations could occur |
| No command execution sandbox | HIGH | No container isolation, no filesystem restriction for agent-generated code |
| No execution budget | MEDIUM | No limit on number of tasks, LLM tokens, or execution time per workflow |
| No cancellation | MEDIUM | No way to cancel a running workflow or abort agent execution |
| No dry-run mode | MEDIUM | All operations execute immediately; no preview capability |
| Activity dependencies are module-level globals | MEDIUM | `let deps: ActivityDependencies | undefined` — race conditions possible |
| Rework loop capped at 3 but no total time cap | LOW | 3 rework iterations with unbounded LLM calls per iteration |

---

## 7. Missing Rollback and Idempotency Protections

| Operation | Idempotency | Rollback | Risk |
|-----------|-------------|----------|------|
| Approval submission | DUPLICATE RISK | None | Calling approve twice adds two ApprovalRecords; no dedup key |
| Artifact save | DUPLICATE RISK | None | Same artifact content can be saved multiple times with new UUIDs |
| Project creation | DUPLICATE RISK | None | No dedup on title/content; accidental double-submit creates duplicates |
| Workflow state transitions | PARTIAL | None | State machine rejects invalid transitions, but `resume()` is not idempotent — double-call processes signal twice |
| Notifications | N/A (fake) | N/A | FakeNotificationProvider is a no-op; when real, must prevent duplicate sends |
| LLM calls | NON-DETERMINISTIC | None | Same prompt can yield different results; no caching/dedup |
| DB migrations | IDEMPOTENT | None | `CREATE TABLE IF NOT EXISTS` is safe; no down-migration support |
| Repo mutations | NOT IMPLEMENTED | None | FakeRepoProvider only; no real file mutations yet |

---

## 8. Missing Provenance / Audit Controls

| Control | Status | Gap |
|---------|--------|-----|
| Audit log for all state transitions | PARTIAL | Workflows emit WorkflowEvents but these are NOT persisted to audit_logs |
| Audit log for approvals | NONE | Approval actions are NOT written to audit_logs |
| Audit log for artifact creation | NONE | Artifacts saved without audit trail |
| Audit log for LLM calls | NONE | Agent invocations not audit-logged |
| Audit log for config changes | NONE | No config change tracking |
| Audit tamper evidence | NONE | No hashing, no append-only enforcement at DB level |
| Audit query/filter/pagination | NONE | Only `getByProjectId()` — no time range, action type, actor filtering |

---

## 9. Test Suite Status

| Package | Tests | Status |
|---------|-------|--------|
| contracts | 41 | PASS |
| domain | 55 | PASS |
| adapters | 58 | PASS |
| agents | 28 | PASS |
| orchestration | 21 | PASS |
| application | 9 | PASS |
| observability | 7 | PASS |
| testing | 7 | PASS |
| api | 17 | PASS |
| evaluation | 37 | PASS |
| **TOTAL** | **280** | **ALL PASS** |

### Missing Test Categories for M3
- Authentication flow tests
- Authorization enforcement per role tests
- Cross-tenant access denial tests
- Idempotency / duplicate submission tests
- Execution policy enforcement tests
- Config validation failure tests
- Rate limiting / unauthorized request tests
- Tenant-aware UI tests
- Audit trail generation tests

---

## 10. Build and Lint Status

- **Build**: `npx turbo build` — 12/12 tasks successful (cached)
- **TypeCheck**: Passes via turbo (tsc -b)
- **ESLint**: eslint.config.ts exists but `npx turbo lint` not exercised in this audit
- **Vitest**: 280 tests across 21 test files passing

---

## Summary of Priority Findings

1. **NO AUTHENTICATION EXISTS** — the entire system is publicly accessible with zero identity verification
2. **NO AUTHORIZATION EXISTS** — no roles, no permissions, approval is free-text
3. **NO MULTI-TENANCY** — all data is globally accessible, no tenant isolation
4. **OBSERVABILITY IS PARTIALLY WIRED** — 3 of 5 instruments exist but are never called
5. **AUDIT IS INCOMPLETE** — most significant operations (approvals, artifacts, agent calls) are NOT audit-logged
6. **NO IDEMPOTENCY** — duplicate submissions create duplicate records
7. **EXECUTION IS UNSANDBOXED** — no safety controls for code execution
8. **SECRETS ARE INSECURE** — hardcoded credentials in source, API key defaults to empty
9. **CORS WIDE OPEN** — `origin: true` allows any website to call the API
10. **NO RATE LIMITING** — all endpoints are unthrottled