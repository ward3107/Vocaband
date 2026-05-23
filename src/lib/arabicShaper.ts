// Arabic contextual shaping for jsPDF exports.
//
// jsPDF writes glyphs left-to-right with no OpenType shaping engine, so
// base Arabic letters (U+0600-U+06FF) render as disconnected isolated
// glyphs.  This module substitutes each base letter with the appropriate
// Presentation Form-B glyph (U+FE70-U+FEFF) based on its position in
// the word — initial, medial, final, or isolated — so the connecting
// strokes line up when rendered.  Caller is still responsible for
// reversing the shaped run for jsPDF's LTR layout.
//
// Scope: covers the standard Arabic alphabet used in Israeli school
// vocabulary (Modern Standard Arabic) plus the four mandatory lam-alef
// ligatures.  Persian/Urdu-specific letters (پ چ ژ گ ٹ etc) pass through
// unchanged and will render as the font's default isolated form.

type JoiningType = 'D' | 'R' | 'U';

interface ArabicLetter {
  joining: JoiningType;
  isolated: number;
  final?: number;
  initial?: number;
  medial?: number;
}

// Base letter → joining class + Presentation Form-B codepoints.
// Source: Unicode ArabicShaping.txt + the Arabic Presentation Forms-B
// block (U+FE70-U+FEFF).
const LETTERS: Record<number, ArabicLetter> = {
  0x0621: { joining: 'U', isolated: 0xFE80 },                                                       // Hamza
  0x0622: { joining: 'R', isolated: 0xFE81, final: 0xFE82 },                                        // Alef-madda
  0x0623: { joining: 'R', isolated: 0xFE83, final: 0xFE84 },                                        // Alef-hamza-above
  0x0624: { joining: 'R', isolated: 0xFE85, final: 0xFE86 },                                        // Waw-hamza
  0x0625: { joining: 'R', isolated: 0xFE87, final: 0xFE88 },                                        // Alef-hamza-below
  0x0626: { joining: 'D', isolated: 0xFE89, final: 0xFE8A, initial: 0xFE8B, medial: 0xFE8C },       // Yeh-hamza
  0x0627: { joining: 'R', isolated: 0xFE8D, final: 0xFE8E },                                        // Alef
  0x0628: { joining: 'D', isolated: 0xFE8F, final: 0xFE90, initial: 0xFE91, medial: 0xFE92 },       // Beh
  0x0629: { joining: 'R', isolated: 0xFE93, final: 0xFE94 },                                        // Teh-marbuta
  0x062A: { joining: 'D', isolated: 0xFE95, final: 0xFE96, initial: 0xFE97, medial: 0xFE98 },       // Teh
  0x062B: { joining: 'D', isolated: 0xFE99, final: 0xFE9A, initial: 0xFE9B, medial: 0xFE9C },       // Theh
  0x062C: { joining: 'D', isolated: 0xFE9D, final: 0xFE9E, initial: 0xFE9F, medial: 0xFEA0 },       // Jeem
  0x062D: { joining: 'D', isolated: 0xFEA1, final: 0xFEA2, initial: 0xFEA3, medial: 0xFEA4 },       // Hah
  0x062E: { joining: 'D', isolated: 0xFEA5, final: 0xFEA6, initial: 0xFEA7, medial: 0xFEA8 },       // Khah
  0x062F: { joining: 'R', isolated: 0xFEA9, final: 0xFEAA },                                        // Dal
  0x0630: { joining: 'R', isolated: 0xFEAB, final: 0xFEAC },                                        // Thal
  0x0631: { joining: 'R', isolated: 0xFEAD, final: 0xFEAE },                                        // Reh
  0x0632: { joining: 'R', isolated: 0xFEAF, final: 0xFEB0 },                                        // Zain
  0x0633: { joining: 'D', isolated: 0xFEB1, final: 0xFEB2, initial: 0xFEB3, medial: 0xFEB4 },       // Seen
  0x0634: { joining: 'D', isolated: 0xFEB5, final: 0xFEB6, initial: 0xFEB7, medial: 0xFEB8 },       // Sheen
  0x0635: { joining: 'D', isolated: 0xFEB9, final: 0xFEBA, initial: 0xFEBB, medial: 0xFEBC },       // Sad
  0x0636: { joining: 'D', isolated: 0xFEBD, final: 0xFEBE, initial: 0xFEBF, medial: 0xFEC0 },       // Dad
  0x0637: { joining: 'D', isolated: 0xFEC1, final: 0xFEC2, initial: 0xFEC3, medial: 0xFEC4 },       // Tah
  0x0638: { joining: 'D', isolated: 0xFEC5, final: 0xFEC6, initial: 0xFEC7, medial: 0xFEC8 },       // Zah
  0x0639: { joining: 'D', isolated: 0xFEC9, final: 0xFECA, initial: 0xFECB, medial: 0xFECC },       // Ain
  0x063A: { joining: 'D', isolated: 0xFECD, final: 0xFECE, initial: 0xFECF, medial: 0xFED0 },       // Ghain
  0x0641: { joining: 'D', isolated: 0xFED1, final: 0xFED2, initial: 0xFED3, medial: 0xFED4 },       // Feh
  0x0642: { joining: 'D', isolated: 0xFED5, final: 0xFED6, initial: 0xFED7, medial: 0xFED8 },       // Qaf
  0x0643: { joining: 'D', isolated: 0xFED9, final: 0xFEDA, initial: 0xFEDB, medial: 0xFEDC },       // Kaf
  0x0644: { joining: 'D', isolated: 0xFEDD, final: 0xFEDE, initial: 0xFEDF, medial: 0xFEE0 },       // Lam
  0x0645: { joining: 'D', isolated: 0xFEE1, final: 0xFEE2, initial: 0xFEE3, medial: 0xFEE4 },       // Meem
  0x0646: { joining: 'D', isolated: 0xFEE5, final: 0xFEE6, initial: 0xFEE7, medial: 0xFEE8 },       // Noon
  0x0647: { joining: 'D', isolated: 0xFEE9, final: 0xFEEA, initial: 0xFEEB, medial: 0xFEEC },       // Heh
  0x0648: { joining: 'R', isolated: 0xFEED, final: 0xFEEE },                                        // Waw
  0x0649: { joining: 'R', isolated: 0xFEEF, final: 0xFEF0 },                                        // Alef-maksura
  0x064A: { joining: 'D', isolated: 0xFEF1, final: 0xFEF2, initial: 0xFEF3, medial: 0xFEF4 },       // Yeh
};

// Lam (U+0644) + alef variant → mandatory ligature.  Without these the
// rendered output looks visibly broken in Arabic typography.
const LAM_ALEF_LIGATURES: Record<number, { isolated: number; final: number }> = {
  0x0622: { isolated: 0xFEF5, final: 0xFEF6 },
  0x0623: { isolated: 0xFEF7, final: 0xFEF8 },
  0x0625: { isolated: 0xFEF9, final: 0xFEFA },
  0x0627: { isolated: 0xFEFB, final: 0xFEFC },
};

// Diacritics (tashkeel) + Quranic marks + tatweel.  All skipped when
// finding the previous/next "real" letter for joining decisions; tatweel
// is rendered as-is since the PF-B connecting strokes line up with it.
function isTransparent(code: number): boolean {
  return (
    (code >= 0x0610 && code <= 0x061A) ||
    (code >= 0x064B && code <= 0x065F) ||
    code === 0x0670 ||
    (code >= 0x06D6 && code <= 0x06ED) ||
    code === 0x0640
  );
}

export function shapeArabic(text: string): string {
  const codes = Array.from(text).map((c) => c.codePointAt(0)!);
  const out: number[] = [];

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];

    if (isTransparent(code)) {
      out.push(code);
      continue;
    }

    const letter = LETTERS[code];
    if (!letter) {
      out.push(code);
      continue;
    }

    // Walk past transparent marks to find the real neighbours.
    let prevIdx = i - 1;
    while (prevIdx >= 0 && isTransparent(codes[prevIdx])) prevIdx--;
    const prev = prevIdx >= 0 ? LETTERS[codes[prevIdx]] : undefined;

    let nextIdx = i + 1;
    while (nextIdx < codes.length && isTransparent(codes[nextIdx])) nextIdx++;
    const nextCode = nextIdx < codes.length ? codes[nextIdx] : undefined;
    const next = nextCode !== undefined ? LETTERS[nextCode] : undefined;

    // Mandatory lam-alef ligature: substitute the pair with one glyph.
    if (code === 0x0644 && nextCode !== undefined && LAM_ALEF_LIGATURES[nextCode]) {
      const lig = LAM_ALEF_LIGATURES[nextCode];
      const prevExtends = prev?.joining === 'D';
      out.push(prevExtends ? lig.final : lig.isolated);
      i = nextIdx; // Consume the alef too.
      continue;
    }

    // Only D letters extend forward to the next letter; both D and R
    // letters accept a connection from the previous letter.
    const joinsPrev = prev?.joining === 'D';
    const joinsNext =
      letter.joining === 'D' &&
      next !== undefined &&
      (next.joining === 'D' || next.joining === 'R');

    let glyph: number;
    if (joinsPrev && joinsNext && letter.medial !== undefined) {
      glyph = letter.medial;
    } else if (joinsNext && letter.initial !== undefined) {
      glyph = letter.initial;
    } else if (joinsPrev && letter.final !== undefined) {
      glyph = letter.final;
    } else {
      glyph = letter.isolated;
    }
    out.push(glyph);
  }

  return String.fromCodePoint(...out);
}
