export interface PaperRef {
  id: string; // e.g. 'arXiv:1706.03762'
  title: string;
  abstract: string;
  url: string; // abstract/landing page
  pdfUrl?: string;
  isOpenAccess: boolean;
  license?: string;
  publishedDate?: string; // ISO date
  citationCount?: number;
  influentialCitationCount?: number;
  concepts: string[];
  phase: string;
}
