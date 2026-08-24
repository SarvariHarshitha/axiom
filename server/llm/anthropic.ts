import type { ChatOptions, LLMProvider } from "./provider.js";
import { LLMError } from "./provider.js";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

/**
 * Native Anthropic Messages API adapter. Requires an API key (LLM_API_KEY) —
 * NOT a Claude Pro/Max subscription/OAuth token. See plan.md Q1: the Consumer
 * Terms prohibit automated/unattended use of a subscription session, and as of
 * Feb 19, 2026 the Agent SDK requires API-key auth anyway.
 */
export class AnthropicProvider implements LLMProvider {
  name: string;

  constructor(
    private model: string,
    private apiKey: string
  ) {
    this.name = `anthropic(${model})`;
  }

  async chat(opts: ChatOptions): Promise<string> {
    const system = opts.json
      ? `${opts.system}\n\nRespond with ONLY valid JSON, no prose, no markdown fences.`
      : opts.system;

    let res: Response;
    try {
      res = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": ANTHROPIC_VERSION
        },
        body: JSON.stringify({
          model: this.model,
          system,
          messages: [{ role: "user", content: opts.user }],
          max_tokens: opts.maxTokens ?? 4096,
          temperature: opts.temperature ?? 0.2
        })
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
      content?: { type: string; text?: string }[];
    };
    const textBlock = data.content?.find((b) => b.type === "text");
    if (!textBlock?.text) {
      throw new LLMError(`${this.name} returned no text content`, this.name);
    }
    return textBlock.text;
  }
}
