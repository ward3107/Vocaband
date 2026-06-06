import { describe, it, expect } from "vitest";
import { advancePetTravel } from "../components/arcade/petTravel";

// Minimal in-memory Storage stand-in so the test never touches the real
// sessionStorage and stays isolated between cases.
function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    key: (i) => Array.from(m.keys())[i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
}

describe("advancePetTravel", () => {
  it("returns from=null on the first visit and records the island", () => {
    const s = fakeStorage();
    expect(advancePetTravel("a1", 2, s)).toEqual({ from: null, to: 2 });
    expect(s.getItem("vb_pet_island_a1")).toBe("2");
  });

  it("returns the previous island as `from` on the next visit", () => {
    const s = fakeStorage();
    advancePetTravel("a1", 2, s);
    expect(advancePetTravel("a1", 4, s)).toEqual({ from: 2, to: 4 });
  });

  it("scopes the memory per assignment", () => {
    const s = fakeStorage();
    advancePetTravel("a1", 2, s);
    expect(advancePetTravel("a2", 5, s)).toEqual({ from: null, to: 5 });
  });
});
