import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { createAgent, AgentParseError } from "../agent-base";
import type { AgentDefinition } from "../agent-base";

// Mock LLMProvider
function createMockProvider(responses: string[]): any {
  let callCount = 0;
  return {
    name: "mock-provider",
    complete: async (prompt: string) => {
      const response = responses[callCount] ?? responses[responses.length - 1];
      callCount++;
      return response;
    },
    completeStructured: async (prompt: string, schema: unknown) => {
      const response = responses[callCount] ?? responses[responses.length - 1];
      callCount++;
      return JSON.parse(response);
    },
    getCallCount: () => callCount,
    reset: () => { callCount = 0; },
  };
}

interface TestInput {
  name: string;
}

interface TestOutput {
  result: string;
}

const testInputSchema = z.object({
  name: z.string(),
});

const testOutputSchema = z.object({
  result: z.string(),
});

const testAgentDefinition: AgentDefinition<TestInput, TestOutput> = {
  name: "test-agent" as any,
  inputSchema: testInputSchema,
  outputSchema: testOutputSchema,
  buildPrompt: (input) => `Process: ${input.name}`,
  parseResponse: (raw) => {
    // Simulate a parse that can fail
    if (raw === "invalid-json") {
      throw new SyntaxError("Unexpected token");
    }
    if (raw === "parse-error") {
      throw new AgentParseError("Failed to parse response");
    }
    return JSON.parse(raw);
  },
};

describe("createAgent - retry logic", () => {
  let mockProvider: any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should succeed without retries when provider returns valid response", async () => {
    mockProvider = createMockProvider(['{"result": "success"}']);
    
    const agent = createAgent(testAgentDefinition, mockProvider);
    const result = await agent({ name: "test" });

    expect(result.success).toBe(true);
    expect(result.output).toEqual({ result: "success" });
    expect(result.retryCount).toBeUndefined();
    expect(mockProvider.getCallCount()).toBe(1);
  });

  it("should retry on parse failure and eventually succeed", async () => {
    // Provider returns: invalid-json first, then valid response
    mockProvider = createMockProvider([
      "invalid-json",
      "invalid-json", 
      '{"result": "success"}'
    ]);
    
    const agent = createAgent(
      { ...testAgentDefinition, policy: { maxRetries: 3 } },
      mockProvider
    );
    
    const result = await agent({ name: "test" });

    expect(result.success).toBe(true);
    expect(result.output).toEqual({ result: "success" });
    expect(result.retryCount).toBe(2); // 2 retries before success
    expect(mockProvider.getCallCount()).toBe(3);
  });

  it("should retry on AgentParseError and eventually succeed", async () => {
    mockProvider = createMockProvider([
      "parse-error",
      "parse-error",
      '{"result": "success"}'
    ]);
    
    const agent = createAgent(
      { ...testAgentDefinition, policy: { maxRetries: 3 } },
      mockProvider
    );
    
    const result = await agent({ name: "test" });

    expect(result.success).toBe(true);
    expect(result.output).toEqual({ result: "success" });
    expect(result.retryCount).toBe(2);
    expect(mockProvider.getCallCount()).toBe(3);
  });

  it("should NOT retry on Zod validation failure (wrong LLM output structure)", async () => {
    // Provider returns JSON that's valid but doesn't match schema
    mockProvider = createMockProvider(['{"wrongField": "value"}']);
    
    const agent = createAgent(
      { ...testAgentDefinition, policy: { maxRetries: 3 } },
      mockProvider
    );
    
    const result = await agent({ name: "test" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("result");
    expect(result.retryCount).toBeUndefined(); // No retry
    expect(mockProvider.getCallCount()).toBe(1);
  });

  it("should fail after max retries exhausted", async () => {
    mockProvider = createMockProvider([
      "invalid-json",
      "invalid-json",
      "invalid-json",
      "invalid-json"
    ]);
    
    const agent = createAgent(
      { ...testAgentDefinition, policy: { maxRetries: 3 } },
      mockProvider
    );
    
    const result = await agent({ name: "test" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unexpected token");
    // With maxRetries=3, we get attempt 0, 1, 2, 3 = 4 total calls
    expect(mockProvider.getCallCount()).toBe(4);
  });

  it("should use default maxRetries of 0 when not specified", async () => {
    mockProvider = createMockProvider(["invalid-json"]);
    
    const agent = createAgent(testAgentDefinition, mockProvider);
    const result = await agent({ name: "test" });

    expect(result.success).toBe(false);
    expect(result.retryCount).toBeUndefined(); // No retry when maxRetries is 0
    expect(mockProvider.getCallCount()).toBe(1);
  });

  it("should record retryCount in result on successful retry", async () => {
    mockProvider = createMockProvider([
      "parse-error",  // First attempt fails
      '{"result": "success"}' // Second attempt succeeds
    ]);
    
    const agent = createAgent(
      { ...testAgentDefinition, policy: { maxRetries: 2 } },
      mockProvider
    );
    
    const result = await agent({ name: "test" });

    expect(result.success).toBe(true);
    expect(result.retryCount).toBe(1);
  });

  it("should not retry on other errors (e.g., network errors from provider)", async () => {
    const errorProvider = {
      name: "error-provider",
      complete: async () => {
        throw new Error("Network error");
      },
      completeStructured: async () => {
        throw new Error("Network error");
      },
    };
    
    const agent = createAgent(
      { ...testAgentDefinition, policy: { maxRetries: 3 } },
      errorProvider
    );
    
    const result = await agent({ name: "test" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Network error");
    expect(result.retryCount).toBeUndefined(); // Should not retry on arbitrary errors
  });
});