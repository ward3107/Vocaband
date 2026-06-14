// Client helper: request a server-rendered worksheet PDF and download it.
//
// The browser sends STRUCTURED DATA to /api/pdf; the Cloudflare Worker
// builds the HTML (via worksheetTemplate) and renders it with Cloudflare
// Browser Rendering (real Chromium). The browser never builds the PDF —
// that's the whole point: rendering moves off the user's device so every
// phone/browser gets the identical, correctly-shaped Hebrew/Arabic output.
//
// This replaces the html2pdf.js / jsPDF path for worksheets. Views adopt
// it by swapping their export handler to call requestWorksheetPdf(...).

import type { WorksheetData } from './worksheetTemplate';

export async function requestWorksheetPdf(
  data: WorksheetData,
  filename = 'vocaband-worksheet.pdf',
): Promise<void> {
  const res = await fetch('/api/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`PDF render failed (${res.status})`);
  }
  const blob = await res.blob();
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
