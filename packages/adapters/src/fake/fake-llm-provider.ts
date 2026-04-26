import { LLMProvider } from "../ports";

export interface FakeLLMResponse {
  unstructured: string;
  structured: unknown;
}

export class FakeLLMProvider implements LLMProvider {
  readonly name = "fake-llm";
  private responses: Map<string, FakeLLMResponse> = new Map();
  private defaultResponse: FakeLLMResponse = {
    unstructured: "fake response",
    structured: {},
  };
  private callLog: Array<{ prompt: string; timestamp: Date }> = [];

  setResponse(key: string, response: FakeLLMResponse): void {
    this.responses.set(key, response);
  }

  setDefaultResponse(response: FakeLLMResponse): void {
    this.defaultResponse = response;
  }

  async complete(prompt: string, _options?: { maxTokens?: number; temperature?: number }): Promise<string> {
    this.callLog.push({ prompt: prompt.substring(0, 100), timestamp: new Date() });
    for (const [key, response] of this.responses) {
      if (prompt.includes(key)) {
        return response.unstructured;
      }
    }
    return this.defaultResponse.unstructured;
  }

  async completeStructured<T>(prompt: string, _schema: unknown, _options?: { maxTokens?: number; temperature?: number }): Promise<T> {
    this.callLog.push({ prompt: prompt.substring(0, 100), timestamp: new Date() });
    for (const [key, response] of this.responses) {
      if (prompt.includes(key)) {
        return response.structured as T;
      }
    }
    return this.defaultResponse.structured as T;
  }

  getCallLog() { return [...this.callLog]; }
  clearCallLog() { this.callLog = []; }
}