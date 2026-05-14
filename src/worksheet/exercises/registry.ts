/**
 * Exercise registry — single source of truth for which React component
 * renders each exercise type.  Adding a new exercise = drop a file in
 * this folder + register it here.
 *
 * The placeholder ComingSoonExercise is wired to any type without a
 * dedicated component, so the runner can still walk through it
 * (rendering "Coming soon" + Skip) instead of crashing on a missing
 * key.  Replace each pointer with the real component as it ships.
 */
import type { ExerciseComponent, ExerciseType } from "../types";
import { ClozeExercise } from "./ClozeExercise";
import { ComingSoonExercise } from "./ComingSoonExercise";
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
  // Definition match still needs Gemini-generated definitions before
  // it can ship — kept as a placeholder so the type stays selectable
  // in the share dialog without breaking the runner.
  definition_match: ComingSoonExercise,
  synonym_antonym: SynonymAntonymExercise as ExerciseComponent,
  cloze: ClozeExercise as ExerciseComponent,
  sentence_building: SentenceBuildingExercise as ExerciseComponent,
  translation_typing: TranslationTypingExercise as ExerciseComponent,
  word_in_context: WordInContextExercise as ExerciseComponent,
  true_false: TrueFalseExercise as ExerciseComponent,
};
