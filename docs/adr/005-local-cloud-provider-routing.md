# ADR-005: Local/Cloud Provider Routing

## Status: Accepted

## Context
Developers may want to use local models (Ollama) for privacy and cost, while production uses cloud models (OpenAI, Anthropic).

## Decision
Implement an LLMProvider port with multiple adapter implementations, selected via `LLM_PROVIDER` environment variable.

## Rationale
- **Port/adapter pattern**: LLMProvider is a port; OllamaProvider and OpenAICompatibleProvider are adapters.
- **Environment-driven routing**: `LLM_PROVIDER=fake|ollama|openai-compatible` selects the adapter.
- **Cost control**: Local development with Ollama is free; cloud models for production quality.
- **Privacy**: Sensitive projects can use local models without data leaving the machine.

## Evolution Path
- M1: FakeLLMProvider (deterministic), OllamaProvider stub, OpenAICompatibleProvider stub
- M2: Full OllamaProvider with model selection, streaming support
- M2: OpenAI-compatible with structured output support (response_format)
- M3: Multi-model routing (different agents → different models based on capability)
- M3: A/B testing framework for model comparison