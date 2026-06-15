// Single entry point for server-side PDF rendering.
//
// The Cloudflare Worker (/api/pdf) calls ONLY this — it returns both the
// print HTML and the page.pdf() options for that document, so each doc type
// controls its own page geometry (a full-bleed certificate must NOT get the
// worksheet's margins/footer). Adding a new doc type = a case here; the
// Worker never changes again.

import { buildWorksheetHtml, type WorksheetData } from './worksheetTemplate';
import { buildCertificateHtml, type CertificateData } from './certificateTemplate';

/** Pre-rendered, self-contained HTML (e.g. the Free Resources generators). */
export interface HtmlDocData {
  kind: 'html';
  html: string;
  orientation?: 'portrait' | 'landscape';
  /** Page margins for flowing (non-.sheet) documents like the Bagrut exam.
   *  Default 0 — the Free Resources .sheet generators size their own pages. */
  margins?: { top: string; right: string; bottom: string; left: string };
}

export type PdfDocData =
  | (WorksheetData & { kind?: 'worksheet' })
  | CertificateData
  | HtmlDocData;

// Subset of puppeteer's PDFOptions we set. Loosely typed so the Worker
// (compiled with only the DOM lib) needs no @cloudflare/puppeteer types.
export interface PdfRenderOptions {
  format?: 'A4';
  landscape?: boolean;
  printBackground?: boolean;
  preferCSSPageSize?: boolean;
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  margin?: { top?: string; right?: string; bottom?: string; left?: string };
}

export interface PdfDocument {
  html: string;
  pdf: PdfRenderOptions;
  /** Render with JavaScript disabled — set for `html` documents (client-
   *  provided HTML) so any embedded <script> can't execute. */
  disableJs?: boolean;
}

const WORKSHEET_FOOTER =
  `<div style="width:100%;font-size:8px;color:#94a3b8;font-family:sans-serif;padding:0 12mm;box-sizing:border-box;display:flex;justify-content:space-between;"><span>vocaband.com</span><span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;

// Note: client-provided `html` documents are rendered with JavaScript
// DISABLED in the Worker (see handlePdf → setJavaScriptEnabled(false)), so
// any embedded <script> / inline handler is neutralised at the engine level.
// That's far more robust than regex HTML sanitisation (which is always
// evadable), so we deliberately do NOT regex-strip the markup here.
export function buildPdfDocument(data: PdfDocData): PdfDocument {
  switch (data.kind) {
    case 'certificate':
      // Full-bleed A4 diploma — honour the template's own @page (margin 0).
      // Worker margins/footer would clip the gold frame + signature row.
      return {
        html: buildCertificateHtml(data),
        pdf: { printBackground: true, preferCSSPageSize: true },
      };

    case 'html': {
      if (typeof data.html !== 'string' || !data.html) {
        throw new Error('html document missing `html`');
      }
      // The generated `.sheet` CSS drives pagination + page size; force every
      // sheet visible (the in-page nav script that would toggle them never
      // runs — JS is disabled), keep margins at 0 so each sheet fills the page.
      return {
        html: `<!doctype html><html><head><meta charset="utf-8"><style>.sheet{display:block!important}</style></head><body style="margin:0">${data.html}</body></html>`,
        pdf: {
          printBackground: true,
          format: 'A4',
          landscape: data.orientation === 'landscape',
          margin: data.margins ?? { top: '0', right: '0', bottom: '0', left: '0' },
        },
        disableJs: true,
      };
    }

    case 'worksheet':
    case undefined:
      return {
        html: buildWorksheetHtml(data as WorksheetData),
        pdf: {
          format: 'A4',
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: '<div></div>',
          footerTemplate: WORKSHEET_FOOTER,
          margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' },
        },
      };

    default:
      throw new Error(
        `Unknown PDF document kind: ${String((data as { kind?: unknown }).kind)}`,
      );
  }
}
