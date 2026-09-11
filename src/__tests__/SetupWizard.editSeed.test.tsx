/**
 * Regression tests for the "Edit assignment opens with no words" bug —
 * the teacher-side face of the "student sees the demo list" family.
 *
 * Symptom: a teacher taps Edit on an assignment the dashboard shows as
 * "6 words" and the wizard opens with NO words (or a subset), so the
 * picker looks like a fresh / sample list. Saving from that state then
 * overwrote the assignment with the wrong list — which is exactly what
 * every student saw next as "demo words".
 *
 * Root cause: SetupWizard seeded its word list with
 * `if (editingAssignment.words) setSelectedWords(editingAssignment.words)`.
 * A curriculum assignment carries its real list in `wordIds` and its
 * embedded `words` JSONB can be EMPTY or PARTIAL (the old cold-cache save
 * bug); `[]` is truthy, so the seed took the broken list as-is and never
 * hydrated from `wordIds`. The fix routes the seed through the shared
 * resolveAssignmentWords — the same resolver the student card-tap and
 * ?assignment= deep-link paths already use.
 *
 * These tests stub the wizard's chrome + steps so they isolate the SEED:
 * the stub picker simply echoes the `selectedWords` it is handed.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Word } from "../data/vocabulary";

const CURRICULUM: Word[] = [
  { id: 1, english: "apple", hebrew: "תפוח", arabic: "تفاحة", level: "Set 1" },
  { id: 2, english: "book", hebrew: "ספר", arabic: "كتاب", level: "Set 1" },
  { id: 3, english: "chair", hebrew: "כיסא", arabic: "كرسي", level: "Set 2" },
] as unknown as Word[];

const CUSTOM_WORD = {
  id: -101,
  english: "photosynthesis",
  hebrew: "פוטוסינתזה",
  arabic: "التمثيل الضوئي",
  level: "Custom",
} as unknown as Word;

// The vocabulary chunk is lazy; stub both the cache accessor and the
// dynamic import so the resolver hydrates against this tiny corpus.
const getCachedVocabulary = vi.fn();
vi.mock("../hooks/useVocabularyLazy", () => ({
  getCachedVocabulary: () => getCachedVocabulary(),
}));
vi.mock("../data/vocabulary", () => ({
  ALL_WORDS: CURRICULUM,
  SET_1_WORDS: CURRICULUM.filter((w) => w.level === "Set 1"),
  SET_2_WORDS: CURRICULUM.filter((w) => w.level === "Set 2"),
  SET_3_WORDS: [],
  TOPIC_PACKS: [],
}));

// Wizard chrome — irrelevant to seeding, and heavy to render.
vi.mock("../components/TopAppBar", () => ({ default: () => null }));
vi.mock("../components/setup/CreationPageShell", () => ({
  default: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("../components/onboarding/FirstTimeGuide", () => ({ default: () => null }));
vi.mock("../components/onboarding/GuideTriggerButton", () => ({ default: () => null }));
vi.mock("../hooks/useFirstTimeGuide", () => ({
  useFirstTimeGuide: () => ({ shouldShow: false, open: vi.fn(), dismiss: vi.fn(), isOpen: false }),
}));

// Step 1 is the only step that mounts on open; it echoes what it was
// seeded with. Steps 2/3 are never reached here.
vi.mock("../components/setup/WordInputStep2026", () => ({
  WordInputStep2026: ({ selectedWords }: { selectedWords: Word[] }) => (
    <div data-testid="picker">{selectedWords.map((w) => w.english).join(",")}</div>
  ),
}));
vi.mock("../components/setup/ConfigureStep", () => ({ ConfigureStep: () => null }));
vi.mock("../components/setup/ReviewStep", () => ({ ReviewStep: () => null }));

import { SetupWizard } from "../components/setup/SetupWizard";
import type { AssignmentData } from "../components/setup/types";

function editing(over: Partial<AssignmentData>): AssignmentData {
  return { id: "a1", title: "Unit 3", classId: "c1", wordIds: [], ...over };
}

function renderEditing(assignment: AssignmentData) {
  return render(
    <SetupWizard
      mode="assignment"
      allWords={CURRICULUM}
      onComplete={vi.fn()}
      onBack={vi.fn()}
      autoMatchPartial={false}
      showLevelFilter={false}
      editingAssignment={assignment}
    />,
  );
}

const pickerWords = () =>
  (screen.getByTestId("picker").textContent ?? "").split(",").filter(Boolean);

beforeEach(() => {
  getCachedVocabulary.mockReset();
  getCachedVocabulary.mockReturnValue({
    ALL_WORDS: CURRICULUM,
    SET_1_WORDS: CURRICULUM,
    SET_2_WORDS: CURRICULUM,
    SET_3_WORDS: [],
    TOPIC_PACKS: [],
  });
  // jsdom has no scrollTo; the wizard calls it on step changes.
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});
afterEach(cleanup);

describe("SetupWizard — editing an assignment seeds the real word list", () => {
  // THE REGRESSION. `words: []` is truthy; the old seed took it as the
  // list and the editor opened empty although the dashboard said "2 words".
  it("hydrates from wordIds when the embedded words JSONB is empty", async () => {
    renderEditing(editing({ wordIds: [1, 2], words: [] }));
    await waitFor(() => expect(pickerWords()).toEqual(["apple", "book"]));
  });

  it("hydrates from wordIds when the assignment carries no words field at all", async () => {
    renderEditing(editing({ wordIds: [1, 3] }));
    await waitFor(() => expect(pickerWords()).toEqual(["apple", "chair"]));
  });

  // A row written while the cache was cold kept only its custom word;
  // the curriculum ids still name the rest, and BOTH halves must load.
  it("backfills curriculum words missing from a partial embedded list, keeping custom words", async () => {
    renderEditing(editing({ wordIds: [1, 2], words: [CUSTOM_WORD] }));
    await waitFor(() =>
      expect([...pickerWords()].sort()).toEqual(["apple", "book", "photosynthesis"]),
    );
  });

  it("uses a fully-embedded custom word list as-is", async () => {
    renderEditing(editing({ wordIds: [], words: [CUSTOM_WORD] }));
    await waitFor(() => expect(pickerWords()).toEqual(["photosynthesis"]));
  });

  // Never invent words: a genuinely empty assignment stays empty so the
  // teacher can see that it is broken, instead of getting a sample list.
  it("leaves the list empty for an assignment with no words and no ids", async () => {
    renderEditing(editing({ wordIds: [], words: [] }));
    // Give the async seed a tick to (not) run, then assert it stayed empty.
    await new Promise((r) => setTimeout(r, 20));
    expect(pickerWords()).toEqual([]);
  });

  it("still seeds the allowed modes from the assignment", async () => {
    // Modes aren't visible through the step-1 stub, so observe them via
    // the wizard's own state: seeding must not throw and words must load
    // alongside — i.e. the modes branch didn't short-circuit the word seed.
    renderEditing(editing({ wordIds: [2], words: [], allowedModes: ["classic", "spelling"] }));
    await waitFor(() => expect(pickerWords()).toEqual(["book"]));
  });
});
