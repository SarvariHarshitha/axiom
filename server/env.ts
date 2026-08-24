import "dotenv/config";

function str(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${key}`);
  return v;
}

function num(key: string, fallback: number): number {
  const v = process.env[key];
  return v ? Number(v) : fallback;
}

export const env = {
  // LLM
  LLM_PROVIDER: str("LLM_PROVIDER", "openai_compatible") as
    | "openai_compatible"
    | "anthropic"
    | "gemini",
  LLM_BASE_URL: str("LLM_BASE_URL", "https://api.deepseek.com/v1"),
  LLM_MODEL: str("LLM_MODEL", "deepseek-chat"),
  LLM_API_KEY: str("LLM_API_KEY", ""),
  LLM_TEMPERATURE: num("LLM_TEMPERATURE", 0.2),
  LLM_MAX_TOKENS: num("LLM_MAX_TOKENS", 4096),

  // Server
  PORT: num("PORT", 8787),
  HOST: str("HOST", "127.0.0.1"),

  // Scheduling
  APP_TIMEZONE: str("APP_TIMEZONE", "Asia/Kolkata"),
  DAILY_CRON: str("DAILY_CRON", "30 0 * * *"),

  // External APIs
  UNPAYWALL_EMAIL: str("UNPAYWALL_EMAIL", "example@example.com"),
  SEMANTIC_SCHOLAR_API_KEY: str("SEMANTIC_SCHOLAR_API_KEY", ""),

  // Paths
  DB_PATH: str("DB_PATH", "./data/paperforge.db"),
  PDF_CACHE_DIR: str("PDF_CACHE_DIR", "./data/pdf-cache"),
  CANON_PATH: str("CANON_PATH", "./data/canon.json")
};
