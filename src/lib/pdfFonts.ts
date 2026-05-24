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

// jsPDF ships TWO text processors that auto-subscribe to every new doc
// instance and mangle our pre-shaped Arabic:
//
//   1. preProcessText  → processArabic (jspdf.es.js ~L10106)
//      Decomposes our Presentation Forms-B back to base U+06xx letters
//      and applies its own shaping algorithm. The result is disconnected
//      base letters in the wrong order (e.g. "من" → "نم").
//
//   2. postProcessText → bidiEngineFunction (jspdf.es.js ~L22733)
//      Runs Unicode bidi reorder on the text. Since fixRtl already
//      reversed each RTL run for jsPDF's LTR write order, this bidi pass
//      un-reverses them — defeating the whole fix.
//
// There's also `utf8EscapeFunction` on postProcessText that handles the
// actual UTF-8 → PDF stream encoding. We MUST keep that one or no
// non-ASCII glyph writes at all.
//
// Strategy: match handlers by function-source substring. Vite/esbuild
// strips function names from jsPDF's bundled module (every fn.name comes
// through as ''), but string literals inside function bodies survive any
// minifier. Each killable handler contains a unique identifier:
//   - processArabic / parseArabic → "arabicSubstitionA" (jsPDF's typo'd
//     lookup-table name; nothing else references it)
//   - bidiEngineFunction         → "doBidiReorder" (the BidiEngine method)
//   - utf8EscapeFunction (KEEP)  → contains "utf8TextFunction"; never
//     matched by killSignatures so it survives.
export function disableJsPdfArabicProcessor(doc: jsPDF): void {
  const events = (doc.internal as unknown as {
    events: {
      getTopics: () => Record<string, Record<string, [(...args: unknown[]) => unknown, boolean]>>;
      unsubscribe: (t: string) => boolean;
    };
  }).events;
  const topics = events.getTopics();
  const killSignatures = ['arabicSubstitionA', 'doBidiReorder'];
  (['preProcessText', 'postProcessText'] as const).forEach((topicName) => {
    const subs = topics[topicName];
    if (!subs) return;
    Object.entries(subs).forEach(([token, entry]) => {
      const fn = entry[0];
      if (typeof fn !== 'function') return;
      const src = fn.toString();
      if (killSignatures.some((s) => src.includes(s))) {
        events.unsubscribe(token);
      }
    });
  });
}

// Detect script in a string so callers can pick the right font.
export const HEBREW_RE = /[֐-׿יִ-ﭏ]/;
export const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

// Match runs of Hebrew / Arabic words — including the ASCII / NBSP
// spaces between adjacent RTL words so multi-word phrases like
// "في الخارج" or "מגוון של" reverse as one unit.  Reversing each word
// in isolation left the first logical word on the LEFT instead of the
// RIGHT under jsPDF's LTR layout, flipping the reading order of the
// phrase.  The run still starts and ends on an RTL char so leading /
// trailing whitespace from surrounding Latin text stays untouched.
// Arabic ranges include the Presentation Forms blocks in case input
// already contains pre-shaped glyphs.  Escape syntax used here to keep
// U+FEFF (BOM) out of the source — it trips eslint's irregular-whitespace.
const HEBREW_RUN_RE = /[֐-׿יִ-ﭏ]+(?:[  ]+[֐-׿יִ-ﭏ]+)*/g;
const ARABIC_RUN_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]+(?:[  ]+[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]+)*/g;

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
