/**
 * Regression test for the teacher-shared assignment link.
 *
 * `?assignment=<id>` is how a task is actually handed out — the teacher
 * pastes the link into the class WhatsApp group. That consumer used to do
 *
 *     setAssignmentWords(match.words ?? []);
 *
 * while every other launch path (dashboard card, Next Up card) went
 * through `resolveAssignmentWords`. A curriculum assignment carries its
 * list in `wordIds` and may have no `words` JSONB at all, so the link
 * path handed the game an empty array and it substituted a generic
 * Set-2 sample. Tapping the SAME assignment from the dashboard worked —
 * which is exactly why the bug presented as intermittent.
 *
 * This test pins the resolver contract that both paths now share: for
 * every shape an assignment row can take, a non-empty word list must
 * come back whenever the row names any words at all.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Word } from "../data/vocabulary";
import type { AssignmentData } from "../core/supabase";

const CURRICULUM: Word[] = [
  { id: 11, english: "garden", hebrew: "גינה", arabic: "حديقة", level: "Set 1" },
  { id: 12, english: "window", hebrew: "חלון", arabic: "نافذة", level: "Set 1" },
  { id: 13, english: "river", hebrew: "נהר", arabic: "نهر", level: "Set 2" },
] as unknown as Word[];

const getCachedVocabulary = vi.fn();
vi.mock("../hooks/useVocabularyLazy", () => ({
  getCachedVocabulary: () => getCachedVocabulary(),
}));
vi.mock("../data/vocabulary", () => ({
  ALL_WORDS: CURRICULUM,
  SET_1_WORDS: CURRICULUM,
  SET_2_WORDS: CURRICULUM,
  SET_3_WORDS: [],
  TOPIC_PACKS: [],
}));

import { resolveAssignmentWords } from "../utils/resolveAssignmentWords";

beforeEach(() => {
  getCachedVocabulary.mockReset();
  getCachedVocabulary.mockReturnValue({
    ALL_WORDS: CURRICULUM,
    SET_1_WORDS: CURRICULUM,
    SET_2_WORDS: CURRICULUM,
    SET_3_WORDS: [],
    TOPIC_PACKS: [],
  });
});

/** The row shapes a real `assignments` row actually takes in production. */
const ROW_SHAPES: Array<{ name: string; row: Partial<AssignmentData>; expect: number[] }> = [
  {
    // teacherOnboarding.ts inserts with no `words` column at all.
    name: "curriculum row with no words column (onboarding insert)",
    row: { wordIds: [11, 12] },
    expect: [11, 12],
  },
  {
    // A row whose words JSONB was written empty by the cold-cache bug.
    name: "curriculum row with an empty words array (cold-cache write)",
    row: { wordIds: [11, 13], words: [] },
    expect: [11, 13],
  },
  {
    // The healthy modern shape.
    name: "fully-hydrated row",
    row: { wordIds: [11, 12], words: [CURRICULUM[0], CURRICULUM[1]] },
    expect: [11, 12],
  },
  {
    name: "row with words present but null-ish wordIds",
    row: { words: [CURRICULUM[2]] } as Partial<AssignmentData>,
    expect: [13],
  },
];

describe("assignment deep link (?assignment=<id>) word resolution", () => {
  for (const shape of ROW_SHAPES) {
    it(`resolves a non-empty list for: ${shape.name}`, async () => {
      const words = await resolveAssignmentWords({
        id: "a1",
        classId: "c1",
        title: "Unit 3",
        wordIds: [],
        ...shape.row,
      } as AssignmentData);

      expect(words.length).toBeGreaterThan(0);
      expect(words.map((w) => w.id).sort()).toEqual(shape.expect.sort());
    });
  }

  // The precise expression the deep-link consumer used to use. Kept as an
  // explicit contrast so the difference is visible in the test output.
  it("the old `match.words ?? []` expression returned nothing for two real row shapes", () => {
    const noWordsColumn = { wordIds: [11, 12] } as AssignmentData;
    const emptyWordsColumn = { wordIds: [11, 13], words: [] } as unknown as AssignmentData;

    expect(noWordsColumn.words ?? []).toHaveLength(0);
    expect(emptyWordsColumn.words ?? []).toHaveLength(0);
  });
});
