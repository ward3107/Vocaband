import { describe, it, expect } from "vitest";
import { validateAnswer } from "../data/category-race-bank";

describe("validateAnswer — open 'name' category", () => {
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
});

describe("validateAnswer — closed categories are unchanged", () => {
  it("accepts a seeded food answer", () => {
    expect(validateAnswer("food", "A", "apple").valid).toBe(true);
  });

  it("rejects a plausible but unseeded food answer", () => {
    // "Apricot" isn't seeded under food/A — closed categories stay a
    // whitelist, so this should not get the open-category free pass.
    expect(validateAnswer("food", "A", "apricot").valid).toBe(false);
  });

  it("still grants spelling grace on a near-miss", () => {
    expect(validateAnswer("food", "A", "aple").valid).toBe(true); // Apple
  });

  it("accepts the Hebrew translation of a seeded answer", () => {
    const r = validateAnswer("food", "A", "תפוח");
    expect(r.valid).toBe(true);
    expect(r.matchedLanguage).toBe("he");
  });
});
