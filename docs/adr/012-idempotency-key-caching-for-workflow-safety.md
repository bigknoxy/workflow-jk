# ADR 012: Idempotency Key Caching for Workflow Safety

## Context
Distributed workflows (using Temporal) or network-unreliable clients may retry operations. Executing the same side-effect-heavy action twice can lead to invalid states or double-charging/double-processing.

## Decision
Implement an `IdempotencyStore`:
- Use a unique `idempotencyKey` provided by the caller or generated for the specific operation.
- Store the hash of the key along with the result of the operation in a dedicated database table (`idempotency_keys`).
- Before executing a guarded operation, check the store. If a result exists and is within the TTL, return it immediately.

## Consequences
- **Positive:** Guarantees at-most-once execution for critical operations.
- **Positive:** Improved system resilience and consistency during retries.
- **Negative:** Requires callers to provide or manage idempotency keys.

## Status
Accepted
