import { env } from "../env.js";
import type { LLMProvider } from "./provider.js";
import { OpenAICompatibleProvider } from "./openai-compatible.js";
import { AnthropicProvider } from "./anthropic.js";
import { GeminiProvider } from "./gemini.js";

/**
 * Factory: builds the active LLMProvider from .env. Default is DeepSeek via
 * the OpenAI-compatible adapter (LLM_PROVIDER=openai_compatible,
 * LLM_BASE_URL=https://api.deepseek.com/v1, LLM_MODEL=deepseek-chat).
 *
 * Switching providers never requires a code change — set LLM_PROVIDER (+
 * matching BASE_URL/MODEL/API_KEY) in .env. See .env.example for presets.
 */
export function createLLMProvider(): LLMProvider {
  switch (env.LLM_PROVIDER) {
    case "anthropic":
      return new AnthropicProvider(env.LLM_MODEL, env.LLM_API_KEY);
    case "gemini":
      return new GeminiProvider(env.LLM_MODEL, env.LLM_API_KEY);
    case "openai_compatible":
    default:
      return new OpenAICompatibleProvider(
        env.LLM_BASE_URL,
        env.LLM_MODEL,
        env.LLM_API_KEY
      );
  }
}

export const llm = createLLMProvider();
export type { LLMProvider, ChatOptions } from "./provider.js";
export { LLMError } from "./provider.js";
