import { LLMProvider } from "../ports";

export interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export class OpenAICompatibleProvider implements LLMProvider {
  readonly name = "openai-compatible";

  constructor(private config: OpenAICompatibleConfig) {}

  async complete(prompt: string, options?: { maxTokens?: number; temperature?: number }): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: options?.maxTokens,
        temperature: options?.temperature,
      }),
    });
    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0].message.content;
  }

  async completeStructured<T>(prompt: string, schema: unknown, options?: { maxTokens?: number; temperature?: number }): Promise<T> {
    const schemaPrompt = `${prompt}\n\nRespond with valid JSON matching this schema:\n${JSON.stringify(schema, null, 2)}`;
    const response = await this.complete(schemaPrompt, { ...options, temperature: 0 });
    try {
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]) as T;
      }
      return JSON.parse(response) as T;
    } catch {
      throw new Error(`Failed to parse structured response: ${response.substring(0, 200)}`);
    }
  }
}