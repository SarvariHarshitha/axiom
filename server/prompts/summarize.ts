export const SUMMARIZE_SYSTEM =
  "You are an expert ML educator. Summarize for a software engineer mastering LLMs.";

export function summarizeUserPrompt(opts: {
  title: string;
  abstract: string;
  text: string;
}): string {
  return `Paper title: ${opts.title}\nAbstract: ${opts.abstract}\nFull text (may be truncated): ${opts.text}
Return JSON:
{ "tldr": string, "key_contributions": string[], "prerequisites": string[],
  "concepts": string[], "intuition": string, "where_it_fits": string }`;
}

export interface PaperSummary {
  tldr: string;
  key_contributions: string[];
  prerequisites: string[];
  concepts: string[];
  intuition: string;
  where_it_fits: string;
}
