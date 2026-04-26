import { LLMProvider } from "../ports";

export interface OllamaConfig {
  baseUrl: string;
  model: string;
}

export class OllamaProvider implements LLMProvider {
  readonly name = "ollama";

  constructor(private config: OllamaConfig) {}

  async complete(prompt: string, options?: { maxTokens?: number; temperature?: number }): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.config.model,
        prompt,
        stream: false,
        options: {
          num_predict: options?.maxTokens,
          temperature: options?.temperature,
        },
      }),
    });
    if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
    const data = await response.json() as { response: string };
    return data.response;
  }

  async completeStructured<T>(prompt: string, _schema: unknown, options?: { maxTokens?: number; temperature?: number }): Promise<T> {
    const response = await this.complete(prompt, options);
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]) as T;
      }
      return JSON.parse(response) as T;
    } catch {
      throw new Error(`Failed to parse Ollama structured response: ${response.substring(0, 200)}`);
    }
  }
}