# ADR 009: Tenant Isolation (Organization-scoped Data)

## Context
Workflow-JK is a multi-tenant platform. Multiple organizations use the same infrastructure, but their data must remain strictly isolated.

## Decision
Implement robust tenant isolation at the data and session layers:
- All core entities (Projects, Workflows, Artifacts, Audit Logs, etc.) must include an `organizationId` column.
- Database schemas include indexes on `organizationId` for efficient filtering.
- Repository implementations must always include the `organizationId` in their `WHERE` clauses for both reads and writes.
- Sessions are scoped to a specific User-Organization pair.

## Consequences
- **Positive:** Strong guarantees against cross-tenant data leaks.
- **Positive:** Enables scaling by organization if needed in the future.
- **Negative:** Increased complexity in repository implementations (must always pass `organizationId`).

## Status
Accepted
