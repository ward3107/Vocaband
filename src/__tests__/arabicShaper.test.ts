import { describe, it, expect } from 'vitest';
import { shapeArabic } from '../lib/arabicShaper';
import { fixRtl } from '../lib/pdfFonts';

// Helper: build a string from a list of Unicode codepoints.  Tests stay
// readable when comparing against specific Presentation Form-B glyphs.
const cp = (...codes: number[]): string => String.fromCodePoint(...codes);

describe('shapeArabic', () => {
  it('returns empty string for empty input', () => {
    expect(shapeArabic('')).toBe('');
  });

  it('leaves Latin / digits / punctuation untouched', () => {
    expect(shapeArabic('Hello 123 ()!')).toBe('Hello 123 ()!');
  });

  it('isolates a single letter with no neighbours', () => {
    // ك (Kaf) standalone → Kaf isolated form (U+FED9).
    expect(shapeArabic('ك')).toBe(cp(0xFED9));
  });

  it('shapes a 3-letter all-D word as Initial-Medial-Final', () => {
    // كتب (kataba/wrote): K(D)-T(D)-B(D).
    expect(shapeArabic('كتب')).toBe(cp(0xFEDB, 0xFE98, 0xFE90));
  });

  it('breaks the connection chain at R letters', () => {
    // كتاب (kitab/book): K(D)-T(D)-A(R)-B(D).  Alef terminates the run
    // so B falls back to Isolated form.
    expect(shapeArabic('كتاب')).toBe(cp(0xFEDB, 0xFE98, 0xFE8E, 0xFE8F));
  });

  it('shapes Allah (الله) with two adjacent Lams', () => {
    // A(R)-isolated, L(D)-initial, L(D)-medial, H(D)-final.
    expect(shapeArabic('الله')).toBe(cp(0xFE8D, 0xFEDF, 0xFEE0, 0xFEEA));
  });

  it('forms the isolated lam-alef ligature for word-initial لا', () => {
    expect(shapeArabic('لا')).toBe(cp(0xFEFB));
  });

  it('forms the final lam-alef ligature after a joining letter', () => {
    // علا : Ain(D, initial) + lam-alef (final ligature).
    expect(shapeArabic('علا')).toBe(cp(0xFECB, 0xFEFC));
  });

  it('preserves diacritics while shaping the underlying letters', () => {
    // كَتَبَ : same letter joining as كتب, with three fathas (U+064E).
    expect(shapeArabic('كَتَبَ')).toBe(
      cp(0xFEDB, 0x064E, 0xFE98, 0x064E, 0xFE90, 0x064E),
    );
  });

  it('treats Hamza (U+0621) as always isolated', () => {
    expect(shapeArabic('ء')).toBe(cp(0xFE80));
  });

  it('keeps consecutive R-only letters in their isolated forms', () => {
    // ادر : Alef(R)-Dal(R)-Reh(R).  None of them can extend forward so
    // Dal stays Isolated despite having a previous letter.
    expect(shapeArabic('ادر')).toBe(cp(0xFE8D, 0xFEA9, 0xFEAD));
  });

  it('shapes مدرسة (school) with the chain broken at Dal and Reh', () => {
    // M(D)-D(R)-R(R)-S(D)-TehMarbuta(R).
    expect(shapeArabic('مدرسة')).toBe(cp(0xFEE3, 0xFEAA, 0xFEAD, 0xFEB3, 0xFE94));
  });

  it('passes through letters outside the supported alphabet', () => {
    // Persian Peh (U+067E) isn't in our table — should round-trip as-is.
    expect(shapeArabic('پ')).toBe('پ');
  });
});

describe('fixRtl', () => {
  it('reverses multi-word Arabic phrases as a whole unit', () => {
    // "في الخارج" (abroad) — the first logical word must end up on the
    // RIGHT of the rendered LTR string so the visual RTL reading order
    // matches the source.  Verify by checking the boundary glyphs: the
    // shaped jeem of "الخارج" (last logical word) leads, the shaped feh
    // of "في" (first logical word) trails.  Without the multi-word
    // regex these would be reversed, producing wrong reading order.
    const out = fixRtl('في الخارج');
    // Leading char is the isolated jeem (U+FE9D) — last letter of word 2.
    expect(out.codePointAt(0)).toBe(0xFE9D);
    // Trailing char is the initial feh (U+FED3) — first letter of word 1.
    expect(out.codePointAt(out.length - 1)).toBe(0xFED3);
    // Embedded space survives at the original word boundary, now between
    // the two reversed words.
    expect(out).toContain(' ');
  });

  it('reverses multi-word Hebrew phrases as a whole unit', () => {
    // "שלום עולם" (hello world).  Logical first word "שלום" must end up
    // on the right of the LTR output, second word "עולם" on the left.
    expect(fixRtl('שלום עולם')).toBe('םלוע םולש');
  });

  it('preserves Latin context around a multi-word RTL phrase', () => {
    // The greedy RTL run consumes the inter-word space but stops at the
    // ASCII letters — so "Hello" stays put.
    expect(fixRtl('Hello שלום עולם')).toBe('Hello םלוע םולש');
  });

  it('leaves single-word RTL behaviour unchanged', () => {
    // Sanity check that the broadened regex still works the same way
    // for the common single-word case.
    expect(fixRtl('שלום')).toBe('םולש');
  });
});
