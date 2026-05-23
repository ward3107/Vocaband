// Shared loader for the Hebrew + Arabic Noto Sans fonts used across all
// jsPDF exports (Classroom reports, Vocabagrut mock exams, etc).
//
// jsPDF ships only Helvetica which has zero coverage for Hebrew/Arabic —
// without an embedded font, those scripts render as ☐ or are dropped.
// We fetch the TTFs from /fonts/ (vendored under public/fonts/), base64-
// encode them in-browser, and register with jsPDF on first PDF export.
// Result is cached on `window` so subsequent exports in the same tab
// don't re-fetch.
//
// Caveat on RTL: jsPDF renders glyphs left-to-right with no native bidi.
// `fixRtl` reverses RTL runs and, for Arabic, also runs contextual
// shaping (see ./arabicShaper) so letters use the correct positional
// form and the connecting strokes line up.

import type jsPDF from 'jspdf';
import { shapeArabic } from './arabicShaper';

export type Base64Font = { hebrew: string; arabic: string };

declare global {
  interface Window { __vbExportFonts?: Promise<Base64Font>; }
}

export async function loadHebrewArabicFonts(): Promise<Base64Font> {
  if (window.__vbExportFonts) return window.__vbExportFonts;
  const fetchAsBase64 = async (url: string): Promise<string> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Font fetch failed: ${url} → ${res.status}`);
    const buf = await res.arrayBuffer();
    // Convert ArrayBuffer to base64 in chunks so we don't hit the
    // browser's apply() argument-count limit on the 188 KB Arabic file.
    const bytes = new Uint8Array(buf);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(bytes.subarray(i, i + chunkSize)),
      );
    }
    return btoa(binary);
  };
  window.__vbExportFonts = Promise.all([
    fetchAsBase64('/fonts/NotoSansHebrew-Regular.ttf'),
    fetchAsBase64('/fonts/NotoSansArabic-Regular.ttf'),
  ]).then(([hebrew, arabic]) => ({ hebrew, arabic }));
  return window.__vbExportFonts;
}

// Register the loaded fonts on a jsPDF doc.  Names "Hebrew" / "Arabic" are
// arbitrary jsPDF font ids; callers reference them via setFont('Hebrew').
export function registerHebrewArabicFonts(doc: jsPDF, fonts: Base64Font): void {
  doc.addFileToVFS('NotoSansHebrew-Regular.ttf', fonts.hebrew);
  doc.addFont('NotoSansHebrew-Regular.ttf', 'Hebrew', 'normal');
  doc.addFileToVFS('NotoSansArabic-Regular.ttf', fonts.arabic);
  doc.addFont('NotoSansArabic-Regular.ttf', 'Arabic', 'normal');
}

// Detect script in a string so callers can pick the right font.
export const HEBREW_RE = /[\u0590-\u05FF\uFB1D-\uFB4F]/;
export const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

// Match runs of consecutive Hebrew / Arabic characters so the Latin
// portion of mixed strings like "Score: 80% (סימו)" stays untouched.
// Arabic ranges include the Presentation Forms blocks too in case input
// already contains pre-shaped glyphs.  Escape syntax used here to keep
// U+FEFF (BOM) out of the source — it trips eslint's irregular-whitespace.
const HEBREW_RUN_RE = /[\u0590-\u05FF\uFB1D-\uFB4F]+/g;
const ARABIC_RUN_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g;

export function fixRtl(text: string): string {
  // Arabic first: shape base letters into their positional Presentation
  // Form-B glyphs, then reverse so jsPDF's LTR write order produces RTL
  // visual order.  Without shaping the letters render disconnected.
  let result = text.replace(ARABIC_RUN_RE, (run) => {
    const shaped = shapeArabic(run);
    return Array.from(shaped).reverse().join('');
  });
  // Hebrew has no contextual shaping — just reverse each run.  Safe to
  // run after Arabic since shaped Arabic now lives in FE70-FEFF, outside
  // the Hebrew ranges.
  result = result.replace(HEBREW_RUN_RE, (run) => Array.from(run).reverse().join(''));
  return result;
}
