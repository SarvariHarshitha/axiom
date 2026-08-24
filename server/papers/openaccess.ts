import { fetchOpenAlexByArxivId, fetchSemanticScholarByArxivId } from "./sources.js";

export interface OADetectionResult {
  isOpenAccess: boolean;
  pdfUrl?: string;
  license?: string;
}

/**
 * Resolve open-access status + license, cross-checking OpenAlex/Unpaywall
 * against Semantic Scholar. arXiv papers default to the non-redistributable
 * "arXiv.org perpetual, non-exclusive license" unless the author opted into
 * CC BY / CC BY-SA / CC BY-NC-SA / CC0 (see plan.md Q2).
 */
export async function detectOpenAccess(arxivId: string): Promise<OADetectionResult> {
  const [openAlex, s2] = await Promise.allSettled([
    fetchOpenAlexByArxivId(arxivId),
    fetchSemanticScholarByArxivId(arxivId)
  ]);

  const oa = openAlex.status === "fulfilled" ? openAlex.value : undefined;
  const s2meta = s2.status === "fulfilled" ? s2.value : undefined;

  const isOpenAccess = oa?.isOpenAccess ?? s2meta?.isOpenAccess ?? false;
  const pdfUrl = oa?.oaUrl ?? s2meta?.openAccessPdf?.url;
  const license = oa?.license ?? s2meta?.openAccessPdf?.license;

  return { isOpenAccess, pdfUrl, license };
}

/** Redistribution is only defensible for these licenses; else default to link-out. */
const REDISTRIBUTABLE_LICENSES = ["cc-by", "cc-by-sa", "cc-by-nc-sa", "cc0", "public-domain"];

export function isRedistributable(license: string | undefined): boolean {
  if (!license) return false;
  const normalized = license.toLowerCase().replace(/\s+/g, "-");
  return REDISTRIBUTABLE_LICENSES.some((l) => normalized.includes(l));
}
