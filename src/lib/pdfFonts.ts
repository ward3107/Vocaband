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
// `fixRtl` pre-reverses RTL runs so Hebrew reads correctly.  Arabic
// letter shaping is NOT handled — reversed Arabic still reads as
// disconnected glyphs.

import type jsPDF from 'jspdf';

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

// Pre-reverse RTL runs so jsPDF (which writes left-to-right) renders
// Hebrew correctly.  Process word-by-word so mixed strings like
// "Score: 80% (סימו)" keep the Latin part untouched.
const RTL_WORD_RE = /[֐-׿؀-ۿݐ-ݿࢠ-ࣿ]+/g;

export function fixRtl(text: string): string {
  return text.replace(RTL_WORD_RE, run => run.split('').reverse().join(''));
}
