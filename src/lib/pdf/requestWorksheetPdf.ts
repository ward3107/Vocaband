// Client helpers: request a server-rendered PDF (/api/pdf) and either get
// the blob or download it. The browser never builds the PDF — rendering
// runs on Cloudflare Browser Rendering (real Chromium) so every device
// gets identical, correctly-shaped output. Replaces html2pdf.js / jsPDF.

import type { WorksheetData } from './worksheetTemplate';
import type { PdfDocData } from './buildPdfHtml';

/** POST the document data and return the rendered PDF bytes. */
export async function fetchPdfBlob(data: PdfDocData): Promise<Blob> {
  const res = await fetch('/api/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`PDF render failed (${res.status})`);
  }
  return res.blob();
}

/** Trigger a browser download of the rendered PDF. */
export async function downloadPdf(data: PdfDocData, filename: string): Promise<void> {
  const blob = await fetchPdfBlob(data);
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Revoke on the next tick so the click's navigation has started.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Back-compat convenience for worksheet callers (HebrewWorksheetView). */
export async function requestWorksheetPdf(
  data: WorksheetData,
  filename = 'vocaband-worksheet.pdf',
): Promise<void> {
  return downloadPdf(data, filename);
}
