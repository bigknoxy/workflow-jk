import { describe, it, expect, vi, beforeEach } from "vitest";
import { LLMRouter, createLLMRouterFromConfig, LLMRouterConfigSchema } from "../real/llm-router";
import type { LLMProvider } from "../ports";

// Mock provider that fails a certain number of times before succeeding
function createFailingProvider(failCount: number, onFail?: () => void): LLMProvider {
  let callCount = 0;
  return {
    name: "failing-provider",
    complete: async () => {
      callCount++;
      if (callCount <= failCount) {
        if (onFail) onFail();
        throw new TypeError("Network error");
      }
      return "success";
    },
    completeStructured: async () => {
      callCount++;
      if (callCount <= failCount) {
        if (onFail) onFail();
        throw new TypeError("Network error");
      }
      return { result: "success" } as any;
    },
  };
}

// Mock provider that always fails
function createAlwaysFailingProvider(): LLMProvider {
  return {
    name: "always-failing",
    complete: async () => {
      throw new TypeError("Network error");
    },
    completeStructured: async () => {
      throw new TypeError("Network error");
    },
  };
}

// Mock provider that delays longer than timeout
function createSlowProvider(delayMs: number): LLMProvider {
  return {
    name: "slow-provider",
    complete: async () => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return "slow success";
    },
    completeStructured: async () => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return { result: "slow success" } as any;
    },
  };
}

// Mock provider that succeeds immediately
function createSucceedingProvider(): LLMProvider {
  return {
    name: "succeeding-provider",
    complete: async () => "success",
    completeStructured: async () => ({ result: "success" }) as any,
  };
}

describe("LLMRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should pass through successful calls without retry", async () => {
    const provider = createSucceedingProvider();
    const router = new LLMRouter({
      primary: provider,
      maxRetries: 3,
      initialDelayMs: 10,
      maxDelayMs: 100,
      backoffMultiplier: 2,
      timeoutMs: 5000,
    });

    const result = await router.complete("test prompt");
    expect(result).toBe("success");
  });

  it("should retry on failure and eventually succeed", async () => {
    const failingProvider = createFailingProvider(2); // Fails twice, then succeeds
    const router = new LLMRouter({
      primary: failingProvider,
      maxRetries: 3,
      initialDelayMs: 10,
      maxDelayMs: 100,
      backoffMultiplier: 2,
      timeoutMs: 5000,
    });

    const result = await router.complete("test prompt");
    expect(result).toBe("success");
  });

  it("should fail after max retries exhausted", async () => {
    const failingProvider = createAlwaysFailingProvider();
    const router = new LLMRouter({
      primary: failingProvider,
      maxRetries: 3,
      initialDelayMs: 10,
      maxDelayMs: 100,
      backoffMultiplier: 2,
      timeoutMs: 5000,
    });

    await expect(router.complete("test prompt")).rejects.toThrow();
  });

  it("should fall back to fallback provider when primary fails", async () => {
    const primary = createAlwaysFailingProvider();
    const fallback = createSucceedingProvider();
    const router = new LLMRouter({
      primary,
      fallback,
      maxRetries: 1,
      initialDelayMs: 10,
      maxDelayMs: 100,
      backoffMultiplier: 2,
      timeoutMs: 5000,
    });

    const result = await router.complete("test prompt");
    expect(result).toBe("success");
  });

  it("should throw if both primary and fallback fail", async () => {
    const primary = createAlwaysFailingProvider();
    const fallback = createAlwaysFailingProvider();
    const router = new LLMRouter({
      primary,
      fallback,
      maxRetries: 1,
      initialDelayMs: 10,
      maxDelayMs: 100,
      backoffMultiplier: 2,
      timeoutMs: 5000,
    });

    await expect(router.complete("test prompt")).rejects.toThrow();
  });

  it("should handle timeout correctly", async () => {
    const slowProvider = createSlowProvider(200); // Takes 200ms
    const router = new LLMRouter({
      primary: slowProvider,
      maxRetries: 0,
      initialDelayMs: 10,
      maxDelayMs: 100,
      backoffMultiplier: 2,
      timeoutMs: 50, // 50ms timeout
    });

    await expect(router.complete("test prompt")).rejects.toThrow("timed out");
  });

  it("should handle structured output with retries", async () => {
    const failingProvider = createFailingProvider(1);
    const router = new LLMRouter({
      primary: failingProvider,
      maxRetries: 3,
      initialDelayMs: 10,
      maxDelayMs: 100,
      backoffMultiplier: 2,
      timeoutMs: 5000,
    });

    const schema = { type: "object", properties: { result: { type: "string" } } };
    const result = await router.completeStructured("test prompt", schema);
    expect(result).toEqual({ result: "success" });
  });

  it("should handle 5xx responses as retriable", async () => {
    const serverErrorProvider: LLMProvider = {
      name: "server-error",
      complete: async () => {
        const response = new Response("Server Error", { status: 503 });
        throw response;
      },
      completeStructured: async () => {
        const response = new Response("Server Error", { status: 503 });
        throw response;
      },
    };

    const fallback = createSucceedingProvider();
    const router = new LLMRouter({
      primary: serverErrorProvider,
      fallback,
      maxRetries: 1,
      initialDelayMs: 10,
      maxDelayMs: 100,
      backoffMultiplier: 2,
      timeoutMs: 5000,
    });

    const result = await router.complete("test prompt");
    expect(result).toBe("success");
  });

  it("should NOT retry on 4xx errors", async () => {
    let callCount = 0;
    const clientErrorProvider: LLMProvider = {
      name: "client-error",
      complete: async () => {
        callCount++;
        const response = new Response("Client Error", { status: 400 });
        throw response;
      },
      completeStructured: async () => {
        callCount++;
        const response = new Response("Client Error", { status: 400 });
        throw response;
      },
    };

    const router = new LLMRouter({
      primary: clientErrorProvider,
      maxRetries: 3,
      initialDelayMs: 10,
      maxDelayMs: 100,
      backoffMultiplier: 2,
      timeoutMs: 5000,
    });

    await expect(router.complete("test prompt")).rejects.toThrow();
    expect(callCount).toBe(1); // Should not retry on 4xx
  });

  describe("createLLMRouterFromConfig", () => {
    it("should create router from config object", () => {
      const primary = createSucceedingProvider();
      const config = LLMRouterConfigSchema.parse({
        maxRetries: 5,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2,
        timeoutMs: 60000,
      });

      const router = createLLMRouterFromConfig(config, primary);

      expect(router).toBeInstanceOf(LLMRouter);
      expect(router.name).toBe("llm-router(succeeding-provider)");
    });

    it("should create router with fallback provider", () => {
      const primary = createAlwaysFailingProvider();
      const fallback = createSucceedingProvider();
      const config = LLMRouterConfigSchema.parse({
        maxRetries: 1,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
        timeoutMs: 5000,
      });

      const router = createLLMRouterFromConfig(config, primary, fallback);
      expect(router).toBeInstanceOf(LLMRouter);
    });
  });
});