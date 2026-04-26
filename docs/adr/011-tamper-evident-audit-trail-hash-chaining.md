# ADR 011: Tamper-evident Audit Trail (Hash Chaining)

## Context
For compliance and security auditing, it is essential to ensure that audit logs have not been altered or deleted after the fact.

## Decision
Implement a tamper-evident audit trail using hash chaining:
- Each `AuditLog` entry contains a `previousHash` field.
- The `previousHash` stores the SHA-256 hash of the preceding entry in the log.
- For the first entry, the `previousHash` is the hash of the entry itself.
- A verification utility can traverse the log to ensure the chain remains intact.

## Consequences
- **Positive:** Cryptographically verifiable audit trail.
- **Positive:** High confidence in the integrity of system activity records.
- **Negative:** Slight performance overhead for computing and storing hashes.

## Status
Accepted
