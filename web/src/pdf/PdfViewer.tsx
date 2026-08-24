import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

interface PdfViewerProps {
  paperId: string;
}

/**
 * Renders a PDF cached on our own localhost origin (/api/pdf/:id) onto a
 * canvas. Because PDF.js renders raw bytes rather than framing a remote
 * page, remote X-Frame-Options/frame-ancestors headers never come into play.
 */
export function PdfViewer({ paperId }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>();
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const doc = await pdfjsLib.getDocument(`/api/pdf/${encodeURIComponent(paperId)}`).promise;
        if (cancelled) return;
        setNumPages(doc.numPages);

        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.4 });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        if (!cancelled) setError(String(err));
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [paperId, pageNum]);

  if (error) {
    return <div style={{ color: "#b00" }}>Failed to render cached PDF: {error}</div>;
  }

  return (
    <div>
      <canvas ref={canvasRef} style={{ maxWidth: "100%", border: "1px solid #ddd" }} />
      {numPages > 1 && (
        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
          <button disabled={pageNum <= 1} onClick={() => setPageNum((p) => p - 1)}>
            Prev
          </button>
          <span>
            Page {pageNum} / {numPages}
          </span>
          <button disabled={pageNum >= numPages} onClick={() => setPageNum((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
