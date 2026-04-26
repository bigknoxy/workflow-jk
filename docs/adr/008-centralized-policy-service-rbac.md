# ADR 008: Centralized Policy Service (RBAC)

## Context
The system needs to control access to various resources (projects, workflows, artifacts, etc.) based on user roles within an organization. Distributing this logic across the application would make it hard to maintain and audit.

## Decision
Implement a centralized `PolicyService` in the `@workflow-jk/auth` package. This service uses a declarative mapping of roles to actions (RBAC).
- Roles include: `org_admin`, `reviewer`, `operator`, `requester`, and `read_only_auditor`.
- Actions are scoped to resources (e.g., `project:create`, `workflow:start`).
- All authorization checks must use this service.

## Consequences
- **Positive:** Authorization logic is consolidated, making it easy to audit and update.
- **Positive:** Type-safe roles and actions ensure consistency across the codebase.
- **Negative:** The service becomes a critical point of failure (though easily tested).

## Status
Accepted
