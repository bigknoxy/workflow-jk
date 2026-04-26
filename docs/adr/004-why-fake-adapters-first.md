# ADR-004: Why Fake Adapters First

## Status: Accepted

## Context
The platform needs real LLM integration, git operations, and test execution. But developing against real services is slow, expensive, and flaky.

## Decision
Build all adapters as fake implementations first. Make real implementations pluggable behind the same port interfaces.

## Rationale
- **Deterministic testing**: FakeLLM returns the same output every time. Tests are fast and reliable.
- **Development velocity**: No API key needed, no network required, no rate limits.
- **Contract-first design**: Defines the interface contract before implementation details.
- **Seeded demos**: The entire demo flow runs with zero external dependencies.
- **Gradual replacement**: Replace fakes with real adapters one at a time, with confidence.

## Consequences
- Fake behavior must accurately represent real adapter contracts
- Real adapter integration may reveal edge cases the fakes miss
- Fakes need maintenance as contracts evolve