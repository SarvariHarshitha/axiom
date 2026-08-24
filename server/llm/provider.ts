export interface ChatOptions {
  system: string;
  user: string;
  json?: boolean; // request strict JSON
  maxTokens?: number;
  temperature?: number;
}

export interface LLMProvider {
  name: string;
  chat(opts: ChatOptions): Promise<string>; // raw text (JSON string when json=true)
}

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "LLMError";
  }
}
