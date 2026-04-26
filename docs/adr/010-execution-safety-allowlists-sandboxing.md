# ADR 010: Execution Safety (Allowlists & Sandboxing)

## Context
Agents in the system have the capability to interact with the file system and external LLM providers. Without constraints, a misbehaving or malicious agent could compromise the system or exceed resource budgets.

## Decision
Introduce an `ExecutionPolicy` and associated guards:
- **File System Allowlists:** Agents are restricted to specific file patterns (e.g., `src/**`, `tests/**`).
- **Denylists:** Explicitly block access to sensitive files (e.g., `.env`, `.git`).
- **Resource Limits:** Enforce timeouts for agents and workflows, and limit the number of tokens per agent call.
- **Agent Type Validation:** Only approved agent classes can be instantiated and executed.

## Consequences
- **Positive:** Reduced risk of data exfiltration or system damage.
- **Positive:** Predictable resource consumption and cost control.
- **Negative:** Policies must be carefully managed to avoid blocking legitimate agent work.

## Status
Accepted
