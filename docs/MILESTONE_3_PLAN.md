# Milestone 3 Plan: Production Safety and Operational Trust

**Date:** 2026-04-20
**Goal:** Harden the platform for real multi-user, multi-tenant, security-aware operation with stronger authorization, safer real repo execution, deployment readiness, and compliance-grade auditability.

---

## Guiding Principles

- **Security over features** — Every decision optimizes for least privilege, tenant isolation, and auditability
- **Centralized policy** — Authorization logic lives in one testable place; no scattered checks
- **Tenant isolation by default** — Every query, every cache key, every artifact path includes tenant context
- **Preserve existing architecture** — Don't discard M1/M2 patterns; extend them
- **Local-first development** — Fake mode remains fully functional; auth can be bypassed in dev with explicit flag
- **Incremental delivery** — Each workstream produces a verifiable increment

---

## Architecture Overview (M3 Additions)

```
Request → Auth Middleware → Tenant Resolver → Policy Check → Route Handler → Service → Repository (tenant-scoped)
                                       ↓
                              Audit Logger (append-only)
```

### New Packages
- `packages/auth` — Authentication, session management, RBAC policy engine

### New Entities
- `User` (id, email, name, hashedPassword)
- `Organization` (id, name, slug)
- `OrganizationMember` (userId, organizationId, role)
- `Session` (id, userId, organizationId, token, expiresAt)

### New Branded IDs
- `UserId`, `OrganizationId`, `SessionId`, `RoleId`

### RBAC Roles
- `org_admin` — Full org management, user management, all operations
- `reviewer` — Can approve/reject requirements and architecture
- `operator` — Can start workflows, trigger rework, manage execution
- `requester` — Can create projects, submit clarification, view status
- `read_only_auditor` — Can view all data and audit logs, cannot modify

### Authorization Flow
1. `AuthMiddleware` validates session token, attaches `AuthContext { userId, organizationId, role }`
2. `PolicyService.authorize(action, resource, context)` checks role + ownership
3. Service layer receives `AuthContext`, passes to repositories
4. Repositories add `tenantId` filter to all queries
5. All authorization-sensitive actions emit audit log entries

---

## Workstream Dependency Order

```
M3-1 (Auth + RBAC) ────── M3-2 (Tenant isolation)
       │                         │
       ├── M3-6 (Audit deepening) ┤
       │                         │
M3-3 (Execution safety)    M3-4 (Idempotency)
       │                         │
M3-5 (Config/deploy) ───── M3-7 (Security hardening)
       │                         │
M3-8 (Supply chain) ────── M3-9 (UI upgrades)
       │
M3-10 (Docs + ADRs)
       │
M3-Testing (all test categories)
```

---

## M3-1: Authentication and Authorization

### Contracts
- Add `UserId`, `OrganizationId`, `SessionId` branded IDs to `common.ts`
- Add `Organization` Zod schema to new `organization.ts`
- Add `User` Zod schema to new `user.ts` (no password hash in contracts — that stays in auth)
- Add `OrganizationMember` with role enum
- Add `AuthContext` type (userId, organizationId, role)

### Auth Package (`packages/auth`)
- `SessionManager` — create/validate/destroy sessions
- `PasswordHasher` — bcrypt-based hashing (via `bcryptjs`)
- `TokenGenerator` — generate/verify session tokens (HMAC-SHA256, not JWT — simpler, revocable)
- `PolicyService` — centralized authorization:
  - `authorize(action: Action, resource: ResourceType, resourceId: string, context: AuthContext): boolean`
  - Policy rules defined as data (map of role → allowed actions per resource type)
  - Actions: `project:create`, `project:read`, `project:delete`, `workflow:start`, `workflow:resume`, `approval:submit`, `approval:list`, `artifact:read`, `artifact:write`, `audit:read`, `execution:start`, `execution:cancel`, `org:manage`, `user:manage`
- `AuthMiddleware` — Fastify plugin that:
  - Extracts session token from `Authorization: Bearer <token>` header
  - Validates session, attaches `AuthContext` to request
  - Returns 401 for invalid/expired sessions
  - Skips auth for health endpoints
  - In `dev` mode with `AUTH_ENABLED=false`, creates a default admin context

### API Changes
- Add `POST /api/auth/login` — email + password → session token
- Add `POST /api/auth/logout` — destroy session
- Add `GET /api/auth/me` — current user info + org + role
- Add `POST /api/auth/register` — org admin invites (or self-register for dev)
- Add auth middleware to all existing routes
- Add 401/403 error handling in error handler

### Service Layer Changes
- All service methods receive `AuthContext` as first parameter
- Services call `PolicyService.authorize()` before performing operations
- Services pass `organizationId` to repository methods

### DB Schema Changes
- `organizations` table (id, name, slug, created_at)
- `users` table (id, email, name, password_hash, created_at)
- `organization_members` table (user_id, organization_id, role, created_at)
- `sessions` table (id, user_id, organization_id, token, expires_at, created_at)

---

## M3-2: Tenant Isolation

### Contracts
- Add `organizationId` to `Project`, `WorkflowRun`, `AuditLog` schemas
- All repository interfaces gain `organizationId` parameter on queries

### DB Schema
- Add `organization_id UUID NOT NULL REFERENCES organizations(id)` to ALL 5 existing tables
- Add composite indexes: `(organization_id, id)` on each table
- Add RLS policy preparation: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` with policy `USING (organization_id = current_setting('app.current_tenant')::uuid)`

### Repository Changes
- All repo `list()`, `getById()`, `query()` methods require `organizationId` parameter
- In-memory repos filter by organizationId
- Postgres repos include `WHERE organization_id = $1` on every query

### Cross-Tenant Tests
- Create two organizations with separate projects
- Attempt to access Org A's project with Org B's auth context
- Verify 403 on read, write, approval, and audit endpoints
- Verify data isolation in repositories directly

---

## M3-3: Safer Repo and Tool Execution

### Execution Policies
- `ExecutionPolicy` Zod schema:
  - `allowedCommands: string[]` (allowlist)
  - `deniedCommands: string[]` (denylist, overrides allowlist)
  - `maxExecutionTimeMs: number`
  - `maxFileSizeBytes: number`
  - `maxFileCount: number`
  - `allowNetworkAccess: boolean`
  - `dryRun: boolean`

### Workspace Isolation
- `WorkspaceManager` interface:
  - `createWorkspace(workflowRunId): Promise<WorkspaceHandle>` — creates isolated directory
  - `executeCommand(handle, command, policy): Promise<ExecutionResult>`
  - `getChangeSet(handle): Promise<ChangeSet>` — list all file changes
  - `rollback(handle): Promise<void>` — revert all changes
  - `cleanup(handle): Promise<void>` — remove workspace directory

### Dry-Run Mode
- When `dryRun: true`, commands are logged but not executed
- Change preview shows what would happen without modifying filesystem

### Execution Budget
- Per-run budget: max commands, max total time, max file writes
- Exceeding budget marks workflow as Failed with budget-exceeded reason

### Audit
- Every tool action logged with: actor, workflowRunId, organizationId, target repo, command, result

---

## M3-4: Idempotency, Retries, and Workflow Safety

### Idempotency Keys
- Approval submissions: dedup key = `(workflowRunId, artifactType, reviewer, decision)`
- Project creation: dedup key = `(organizationId, title, rawIdea hash)`
- Artifact saves: natural idempotency via UUID, but add upsert by `(projectId, type, version)`

### Implementation
- `IdempotencyStore` interface: `check(key): Promise<result | null>`, `store(key, result): Promise<void>`
- `InMemoryIdempotencyStore` and `PostgresIdempotencyStore`
- Add `idempotency_keys` table: `(key_hash, result_json, created_at)`

### Duplicate Approval Handling
- If same reviewer submits same decision on same artifact type within 60s, return existing result
- If different decision, still allow (represents changing mind)

### Signal Handling
- Add `SIGTERM`/`SIGINT` handler that:
  - Stops accepting new requests
  - Drains in-progress requests
  - Persists workflow state
  - Closes DB connections
  - Exits cleanly

### Retry Safety
- LLM calls: already have retry with exponential backoff (LLMRouter)
- DB operations: add retry on connection errors with configurable policy
- External API calls: add retry with idempotency key propagation

---

## M3-5: Secrets, Config, and Deployment Safety

### Config Validation
- Add conditional validation: `openaiApiKey` required when `llmProvider === "openai-compatible"`
- Add `authEnabled` boolean (default `false` in dev, `true` in production)
- Add `sessionSecret` (required when `authEnabled=true`)
- Add `corsOrigin` (string or array, default `http://localhost:3000`)
- Validate `databaseUrl` is non-empty and looks like a PostgreSQL URL
- Remove hardcoded default credentials — require env var

### .env.example
- Create `.env.example` with all env vars documented and commented
- Separate sections: Required, Optional, Development-only

### Environment Profiles
- `development` — auth disabled, fake LLM, in-memory repos, verbose logging
- `test` — auth disabled, fake everything, deterministic clock
- `staging` — auth enabled, real repos, fake or real LLM
- `production` — auth enabled, real everything, restricted logging

### Health/Readiness
- `/api/health` — basic liveness
- `/api/health/ready` — deep check (DB connection, required deps)
- Startup validation: fail fast on missing required config

### Deployment Docs
- Local homelab: Docker Compose with Postgres
- Cloud/VPS: environment variable guide, reverse proxy config

---

## M3-6: Auditability and Compliance-Grade History

### Audit Enhancement
- Auto-audit-log ALL:
  - Authentication events (login, logout, failed login)
  - Authorization events (granted, denied)
  - Approval actions
  - Workflow state transitions
  - Artifact creation
  - Execution actions (command run, file change)
  - Policy/routing/config changes
  - Release decisions

### Audit Schema Enhancement
- Add `organizationId` to audit_logs
- Add `sessionId` to audit_logs
- Add `clientIp` to audit_logs
- Add `previousHash` column for tamper-evident chain (hash of previous audit row + current row content)

### Audit Query API
- `GET /api/audit` — org-wide audit with filters: dateRange, action, actor, resourceType, resourceId
- `GET /api/organizations/:orgId/audit` — org-scoped
- Pagination: `?page=1&pageSize=50`
- Sort: `?sort=createdAt:desc`

### Read-Only Auditor Role
- `read_only_auditor` role can access all audit endpoints
- Cannot modify any data, cannot approve, cannot start workflows

### Artifact/Prompt Governance Extension
- Track policy changes in audit log
- Track routing changes in audit log
- Track prompt version changes in audit log

---

## M3-7: Security Hardening

### Input Validation
- Add Fastify JSON schema validation on ALL endpoints (not just POST /projects)
- Validate UUID format on all path params
- Add `fastify-zod-openapi` or manual Zod validation at route level
- Sanitize string inputs (trim, max length)

### Rate Limiting
- Add `@fastify/rate-limit` plugin
- Global: 100 req/min per IP
- Auth endpoints: 10 req/min per IP (brute force protection)
- Approval endpoints: 20 req/min per user

### HTTP Security
- Add `@fastify/helmet` for security headers (CSP, HSTS, X-Frame-Options, etc.)
- Configure CORS with explicit origin list from config
- Add `X-Request-ID` header
- Add `X-Content-Type-Options: nosniff`

### Error Handling
- Never expose stack traces in production
- Never expose internal error messages for 5xx errors
- Log full error server-side, return generic message client-side
- Add request ID to all error responses

### Dependency Scanning
- Add `bun audit` to CI pipeline
- Document `npm audit` alternative

---

## M3-8: Supply Chain and Build Integrity

### SBOM
- Add `sbom` script that generates SBOM via `cyclonedx-bom` or equivalent
- Store SBOM as build artifact

### Dependency Review
- Add `bun audit` check to CI
- Document known-good dependency versions

### CI Improvements
- Enforce build + test + lint + typecheck as CI gates
- Add dependency review step
- Document supply chain maturity gaps and roadmap

---

## M3-9: UI Upgrades for Secure Operations

### Auth UI
- Login page (`/login`)
- Logout button in nav
- Session-aware API calls (include Bearer token)
- Protected routes: redirect to login if unauthenticated

### Role-Aware Navigation
- Show/hide menu items based on role
- Disable approval buttons for non-reviewer roles
- Show operator controls only for operator+ roles

### Tenant-Aware Views
- Show organization name in header
- Filter all data by current organization

### Audit UI
- Audit log page with filters, pagination, timestamp display
- Read-only view suitable for auditor review

### Security UX
- Confirmation dialogs for destructive actions
- Clear role indicators on approval forms
- Session expiry warning

---

## M3-10: Documentation and ADRs

### ADRs Required
- ADR-008: Authentication and session strategy (HMAC tokens vs JWT)
- ADR-009: RBAC / authorization architecture (PolicyService)
- ADR-010: Tenant isolation strategy (application-level + RLS prep)
- ADR-011: Execution safety model (policies, workspaces, allowlists)
- ADR-012: Idempotency strategy (dedup keys, idempotency store)
- ADR-013: Supply chain / CI integrity approach

### Documentation Updates
- README: add M3 capabilities, auth setup, deployment guide
- .env.example: all variables
- Deployment guide: local homelab + cloud/VPS

---

## Testing Requirements

### New Test Files
1. `packages/auth/src/__tests__/auth.test.ts` — authentication flows
2. `packages/auth/src/__tests__/policy.test.ts` — authorization per role
3. `packages/auth/src/__tests__/tenant-isolation.test.ts` — cross-tenant denial
4. `apps/api/src/__tests__/audit-trail.test.ts` — audit trail generation
5. `apps/api/src/__tests__/idempotency.test.ts` — duplicate submission handling
6. `packages/orchestration/src/__tests__/execution-policy.test.ts` — execution policy enforcement
7. `packages/config/src/__tests__/config-validation.test.ts` — startup validation
8. `apps/api/src/__tests__/security.test.ts` — unauthorized request handling
9. `apps/web/src/__tests__/tenant-ui.test.ts` — tenant-aware UI (basic)
10. Various regression tests for discovered security edge cases

### Test Principles
- All existing 280 tests must continue to pass
- Fake mode must work (auth bypassed)
- Replay safety preserved
- Eval harness still works

---

## Definition of Done

Milestone 3 is complete when:
- [ ] Auth is in place (login, sessions, Bearer tokens)
- [ ] RBAC is enforced (5 roles, PolicyService, all API routes protected)
- [ ] Tenant isolation is enforced and tested (all data tenant-scoped, cross-tenant denial)
- [ ] Execution safety controls are in place (policies, workspaces, allowlists, dry-run, budget)
- [ ] Idempotency protections are documented and implemented for approvals, artifacts, workflows
- [ ] Auditability is materially stronger (auto-audit, tamper-evident chain, query API, auditor role)
- [ ] Deployment/config safety is improved (no hardcoded creds, .env.example, startup validation, profiles)
- [ ] CI/security posture is improved (rate limiting, helmet, input validation, dependency scanning)
- [ ] UI reflects secure multi-user operation (login, role-aware, tenant-aware, audit browsing)
- [ ] All 280+ existing tests + new M3 tests pass
- [ ] 6 ADRs + updated README + deployment docs