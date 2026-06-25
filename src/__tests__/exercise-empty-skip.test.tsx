/**
 * Regression: every exercise must auto-complete (call onComplete) when it
 * has nothing to render — an empty resolved word list, or no items after
 * filtering against a content bank.
 *
 * The runner (WorksheetRunner) relies on this: it only advances past an
 * exercise once that exercise reports a result. An exercise that renders
 * `null` on an empty list WITHOUT calling onComplete freezes the whole
 * worksheet on a blank screen. That's exactly what QuizExercise did for
 * worksheets whose words didn't resolve client-side (e.g. library/custom
 * word sheets minted before settings.customWords was persisted): earlier
 * exercises auto-skipped, then the runner hit the quiz and stalled.
 */
import { describe, it, expect, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { EXERCISE_REGISTRY } from "../worksheet/exercises/registry";
import { SentencesProvider } from "../worksheet/SentencesContext";
import type { Exercise, ExerciseType } from "../worksheet/types";

const TYPES = Object.keys(EXERCISE_REGISTRY) as ExerciseType[];

describe("exercises auto-complete on an empty word list (never freeze the runner)", () => {
  for (const type of TYPES) {
    it(`${type} calls onComplete with total 0 when given no words`, () => {
      const onComplete = vi.fn();
      const Component = EXERCISE_REGISTRY[type];
      // translation_typing carries a direction; harmless for the others.
      const config = { type, word_ids: [], direction: "en_to_he" } as unknown as Exercise;

      render(
        <SentencesProvider value={{}}>
          <Component
            config={config}
            words={[]}
            targetLang="he"
            onComplete={onComplete}
          />
        </SentencesProvider>,
      );

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith({ score: 0, total: 0, answers: [] });
      cleanup();
    });
  }
});
