import type { ChatOptions, LLMProvider } from "./provider.js";
import { LLMError } from "./provider.js";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/** Native Google Gemini adapter (Gemini Developer API, generateContent). */
export class GeminiProvider implements LLMProvider {
  name: string;

  constructor(
    private model: string,
    private apiKey: string
  ) {
    this.name = `gemini(${model})`;
  }

  async chat(opts: ChatOptions): Promise<string> {
    const url = `${GEMINI_API_BASE}/${this.model}:generateContent?key=${this.apiKey}`;

    const body: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: "user", parts: [{ text: opts.user }] }],
      generationConfig: {
        temperature: opts.temperature ?? 0.2,
        maxOutputTokens: opts.maxTokens ?? 4096,
        ...(opts.json ? { responseMimeType: "application/json" } : {})
      }
    };

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new LLMError(`${this.name} returned no text content`, this.name);
    }
    return text;
  }
}
