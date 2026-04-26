import { z, ZodSchema, ZodError } from "zod";
import { AgentName, AgentResult } from "@workflow-jk/contracts";
import type { LLMProvider } from "@workflow-jk/adapters";
import { withSpan, agentAttributes } from "@workflow-jk/observability";

export interface AgentDefinition<I, O> {
  name: AgentName;
  promptVersion?: string;
  inputSchema: ZodSchema<I>;
  outputSchema: ZodSchema<O>;
  buildPrompt: (input: I) => string;
  parseResponse: (raw: string, input: I) => O;
  policy?: {
    maxRetries?: number;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
  };
}

export class AgentParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentParseError";
  }
}

function isJSONParseError(error: unknown): boolean {
  return (
    error instanceof SyntaxError ||
    (error instanceof Error && error.message.includes("JSON"))
  );
}

function isRetriableAgentError(error: unknown): boolean {
  return error instanceof AgentParseError || isJSONParseError(error);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Agent invocation timed out after ${timeoutMs}ms`)), timeoutMs);
    promise.then(
      (result) => { clearTimeout(timer); resolve(result); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

export function createAgent<I, O>(
  definition: AgentDefinition<I, O>,
  provider: LLMProvider,
  options?: { timeoutMs?: number },
): (input: I) => Promise<AgentResult> {
  const timeoutMs = options?.timeoutMs ?? definition.policy?.timeoutMs;
  return async (input: I): Promise<AgentResult> => {
    const validatedInput = definition.inputSchema.parse(input);
    const startTimeMs = Date.now();
    const maxRetries = definition.policy?.maxRetries ?? 0;

    const runAgent = async (): Promise<AgentResult> => {
      return withSpan(`agent.${definition.name}`, async (span) => {
      span.setAttribute("agent.name", definition.name);
      span.setAttribute("agent.provider", provider.name);
      span.setAttribute("agent.prompt_version", definition.promptVersion ?? "unknown");

      let retryCount = 0;
      let lastError: unknown;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const prompt = definition.buildPrompt(validatedInput);
          let rawResponse: string;
          if (timeoutMs) {
            rawResponse = await withTimeout(
              provider.complete(prompt, {
                maxTokens: definition.policy?.maxTokens ?? 4096,
                temperature: definition.policy?.temperature ?? 0.2,
              }),
              timeoutMs,
            );
          } else {
            rawResponse = await provider.complete(prompt, {
              maxTokens: definition.policy?.maxTokens ?? 4096,
              temperature: definition.policy?.temperature ?? 0.2,
            });
          }

          const parsedOutput = definition.parseResponse(rawResponse, validatedInput);
          const validatedOutput = definition.outputSchema.parse(parsedOutput);

          const durationMs = Date.now() - startTimeMs;
          span.setAttributes(
            agentAttributes({
              agentName: definition.name,
              modelProvider: provider.name,
              success: true,
            })
          );

          // Only include retryCount if retries were actually performed
          return {
            agentName: definition.name,
            success: true,
            output: validatedOutput,
            durationMs,
            retryCount: retryCount > 0 ? retryCount : undefined,
          };
        } catch (error) {
          lastError = error;
          const durationMs = Date.now() - startTimeMs;

          // If timeout error, return immediately with failure
          if (error instanceof Error && error.message.includes("timed out")) {
            span.setAttributes(
              agentAttributes({
                agentName: definition.name,
                modelProvider: provider.name,
                success: false,
              })
            );

            return {
              agentName: definition.name,
              success: false,
              output: null,
              durationMs,
              error: error.message,
              retryCount: retryCount > 0 ? retryCount : undefined,
            };
          }

          // If Zod validation error, don't retry - the LLM returned wrong structure
          if (error instanceof ZodError) {
            span.setAttributes(
              agentAttributes({
                agentName: definition.name,
                modelProvider: provider.name,
                success: false,
              })
            );

            return {
              agentName: definition.name,
              success: false,
              output: null,
              durationMs,
              error: error instanceof Error ? error.message : String(error),
              retryCount: retryCount > 0 ? retryCount : undefined,
            };
          }

          // Only retry on parse errors
          if (!isRetriableAgentError(error)) {
            span.setAttributes(
              agentAttributes({
                agentName: definition.name,
                modelProvider: provider.name,
                success: false,
              })
            );

            return {
              agentName: definition.name,
              success: false,
              output: null,
              durationMs,
              error: error instanceof Error ? error.message : String(error),
              retryCount: retryCount > 0 ? retryCount : undefined,
            };
          }

          // This is a retriable error (parse failure)
          // Only increment retry count if we will actually retry (attempt < maxRetries)
          if (attempt < maxRetries) {
            retryCount = attempt + 1;
            console.log(
              `[Agent:${definition.name}] Parse error on attempt ${attempt + 1}, retrying...`
            );
          }
        }
      }

      // All retries exhausted
      const durationMs = Date.now() - startTimeMs;
      span.setAttributes(
        agentAttributes({
          agentName: definition.name,
          modelProvider: provider.name,
          success: false,
        })
      );

      return {
        agentName: definition.name,
        success: false,
        output: null,
        durationMs,
        error: lastError instanceof Error ? lastError.message : String(lastError),
        retryCount: retryCount > 0 ? retryCount : undefined,
      };
    });
    };

    if (timeoutMs) {
      return withTimeout(Promise.resolve(runAgent()), timeoutMs);
    }
    return runAgent();
  };
}