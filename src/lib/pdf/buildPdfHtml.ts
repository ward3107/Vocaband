// Single entry point for server-side PDF rendering.
//
// The Cloudflare Worker (/api/pdf) calls ONLY this — it dispatches by
// `data.kind` to the right template. Adding a new document type means
// adding a case here and a template module; the Worker never changes again.

import { buildWorksheetHtml, type WorksheetData } from './worksheetTemplate';
import { buildCertificateHtml, type CertificateData } from './certificateTemplate';

export type PdfDocData =
  | (WorksheetData & { kind?: 'worksheet' })
  | CertificateData;

/**
 * Build the print HTML for a PDF document. Throws on unknown/invalid kinds
 * so the Worker can turn that into a 400 rather than rendering garbage.
 */
export function buildPdfHtml(data: PdfDocData): string {
  switch (data.kind) {
    case 'certificate':
      return buildCertificateHtml(data);
    case 'worksheet':
    case undefined:
      return buildWorksheetHtml(data as WorksheetData);
    default:
      throw new Error(`Unknown PDF document kind: ${String((data as { kind?: unknown }).kind)}`);
  }
}
