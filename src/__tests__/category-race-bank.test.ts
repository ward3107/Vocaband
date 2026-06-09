import { describe, it, expect } from "vitest";
import { validateAnswer } from "../data/category-race-bank";

describe("validateAnswer — open answers (every category)", () => {
  it("accepts a valid name that isn't in the seeded bank", () => {
    // "Amy" is a real name starting with A but not one of the seeded
    // {Alex, Anna, Adam} — it must still count, since names can't be
    // enumerated by a finite bank.
    const r = validateAnswer("name", "A", "Amy");
    expect(r.valid).toBe(true);
    expect(r.matchedEn).toBe("Amy");
    expect(r.matchedLanguage).toBe("en");
  });

  it("title-cases a lowercase free-typed name", () => {
    expect(validateAnswer("name", "S", "sophie").matchedEn).toBe("Sophie");
  });

  it("accepts hyphenated / apostrophe names", () => {
    expect(validateAnswer("name", "M", "Mary-Jane").valid).toBe(true);
    expect(validateAnswer("name", "P", "P'tah").valid).toBe(true);
  });

  it("still rejects a name that starts with the wrong letter", () => {
    expect(validateAnswer("name", "B", "Amy").valid).toBe(false);
  });

  it("rejects non-letter input", () => {
    expect(validateAnswer("name", "A", "123").valid).toBe(false);
    expect(validateAnswer("name", "A", "a b").valid).toBe(false);
  });

  it("still maps a seeded name to its canonical spelling", () => {
    const r = validateAnswer("name", "A", "alex");
    expect(r.valid).toBe(true);
    expect(r.matchedEn).toBe("Alex");
  });

  it("accepts a multi-word answer for the rolled letter", () => {
    const r = validateAnswer("food", "I", "ice cream");
    expect(r.valid).toBe(true);
    expect(r.matchedEn).toBe("Ice Cream");
  });

  it("works for letters that have no seeded bank entries", () => {
    // The full alphabet is in the roll pool now; letters with no seeded
    // entries must still be fully winnable via the open path.
    expect(validateAnswer("animal", "D", "dog").valid).toBe(true);
    expect(validateAnswer("food", "Z", "zucchini").valid).toBe(true);
    expect(validateAnswer("color", "G", "green").valid).toBe(true);
  });
});

describe("validateAnswer — every category is open, not a whitelist", () => {
  it("accepts a seeded food answer with its canonical spelling", () => {
    const r = validateAnswer("food", "A", "apple");
    expect(r.valid).toBe(true);
    expect(r.matchedEn).toBe("Apple");
  });

  it("accepts a valid unseeded food answer (no whitelist gating)", () => {
    // "Apricot" isn't in the seeded bank, but it's a real food starting
    // with A — under the open model it must count.
    const r = validateAnswer("food", "A", "apricot");
    expect(r.valid).toBe(true);
    expect(r.matchedEn).toBe("Apricot");
  });

  it("still rejects an answer that starts with the wrong letter", () => {
    expect(validateAnswer("food", "B", "apricot").valid).toBe(false);
  });

  it("accepts the Hebrew translation of a seeded answer", () => {
    const r = validateAnswer("food", "A", "תפוח");
    expect(r.valid).toBe(true);
    expect(r.matchedLanguage).toBe("he");
  });
});
