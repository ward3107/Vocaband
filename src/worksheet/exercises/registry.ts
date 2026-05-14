/**
 * Exercise registry — single source of truth for which React component
 * renders each exercise type.  Adding a new exercise = drop a file in
 * this folder + register it here.
 *
 * Every exercise here is real.  The ComingSoonExercise placeholder
 * (./ComingSoonExercise.tsx) is intentionally kept un-imported as a
 * known-good stub for any future ExerciseType that lands in the
 * union before its dedicated component is ready.
 */
import type { ExerciseComponent, ExerciseType } from "../types";
import { ClozeExercise } from "./ClozeExercise";
import { DefinitionMatchExercise } from "./DefinitionMatchExercise";
import { FillBlankExercise } from "./FillBlankExercise";
import { LetterScrambleExercise } from "./LetterScrambleExercise";
import { ListeningDictationExercise } from "./ListeningDictationExercise";
import { MatchingExercise } from "./MatchingExercise";
import { QuizExercise } from "./QuizExercise";
import { SentenceBuildingExercise } from "./SentenceBuildingExercise";
import { SynonymAntonymExercise } from "./SynonymAntonymExercise";
import { TranslationTypingExercise } from "./TranslationTypingExercise";
import { TrueFalseExercise } from "./TrueFalseExercise";
import { WordInContextExercise } from "./WordInContextExercise";

// The map is widened to `ExerciseComponent` because each entry takes a
// narrower variant of the union.  The runner only calls the component
// after a runtime check that config.type === key, so the narrowing is
// safe at the call site.
export const EXERCISE_REGISTRY: Record<ExerciseType, ExerciseComponent> = {
  matching: MatchingExercise as ExerciseComponent,
  quiz: QuizExercise as ExerciseComponent,
  letter_scramble: LetterScrambleExercise as ExerciseComponent,
  listening_dictation: ListeningDictationExercise as ExerciseComponent,
  fill_blank: FillBlankExercise as ExerciseComponent,
  // Definition Match auto-degrades when the definitions bank is
  // empty (it auto-completes with 0/0) — running
  // scripts/generate-word-definitions.ts populates the bank and the
  // exercise turns on without a code change.
  definition_match: DefinitionMatchExercise as ExerciseComponent,
  synonym_antonym: SynonymAntonymExercise as ExerciseComponent,
  cloze: ClozeExercise as ExerciseComponent,
  sentence_building: SentenceBuildingExercise as ExerciseComponent,
  translation_typing: TranslationTypingExercise as ExerciseComponent,
  word_in_context: WordInContextExercise as ExerciseComponent,
  true_false: TrueFalseExercise as ExerciseComponent,
};
