import type { ChatOptions, LLMProvider } from "./provider.js";
import { LLMError } from "./provider.js";

/**
 * Works with any provider exposing an OpenAI-compatible /v1/chat/completions
 * endpoint: DeepSeek (default), Groq, Together, OpenRouter, Ollama, LM Studio, vLLM.
 */
export class OpenAICompatibleProvider implements LLMProvider {
  name: string;

  constructor(
    private baseUrl: string,
    private model: string,
    private apiKey: string
  ) {
    this.name = `openai_compatible(${model})`;
  }

  async chat(opts: ChatOptions): Promise<string> {
    const url = `${this.baseUrl.replace(/\/$/, "")}/chat/completions`;

    const body: Record<string, unknown> = {
      model: this.model,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user }
      ],
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 4096
    };

    if (opts.json) {
      body.response_format = { type: "json_object" };
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body)
      });
    } catch (err) {
      throw new LLMError(`Network error calling ${this.name}`, this.name, err);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new LLMError(
        `${this.name} returned ${res.status}: ${text.slice(0, 500)}`,
        this.name
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new LLMError(`${this.name} returned no content`, this.name);
    }
    return content;
  }
}
