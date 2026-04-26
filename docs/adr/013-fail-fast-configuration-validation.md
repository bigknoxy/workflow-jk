# ADR 013: Fail-fast Configuration Validation

## Context
Incorrect configuration or malformed input data can lead to unpredictable behavior that is difficult to debug if it propagates deep into the system.

## Decision
Adopt a "fail-fast" approach using strict schema validation:
- Use **Zod** to define schemas for all configuration objects, domain entities, and API contracts.
- Validate data at the system boundaries (e.g., API requests) and at layer boundaries (e.g., between Application and Domain).
- Use `assertValid` to throw descriptive `ContractViolationError` exceptions immediately upon detecting invalid data.

## Consequences
- **Positive:** Catch bugs early in the execution flow.
- **Positive:** Improved documentation via explicit schemas.
- **Negative:** Requires boilerplate for defining and maintaining schemas.

## Status
Accepted
