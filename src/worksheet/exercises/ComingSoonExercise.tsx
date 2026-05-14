/**
 * Placeholder exercise — registered for every type that hasn't shipped
 * its real component yet.  Renders a "Coming soon" card with a Skip
 * button that completes the exercise with a 0/0 score so the worksheet
 * runner can still walk past it.  Replaced one-by-one as each real
 * exercise lands.
 */
import { useLanguage } from "../../hooks/useLanguage";
import type { ExerciseComponent } from "../types";

const LABELS: Record<string, string> = {
  matching: "Matching",
  quiz: "Quiz",
  letter_scramble: "Letter scramble",
  listening_dictation: "Listening dictation",
  fill_blank: "Fill in the blank",
  definition_match: "Definition match",
  synonym_antonym: "Synonyms & antonyms",
  cloze: "Cloze paragraph",
  sentence_building: "Sentence building",
  translation_typing: "Translation typing",
  word_in_context: "Word in context",
  true_false: "True or false",
};

export const ComingSoonExercise: ExerciseComponent = ({ config, onComplete }) => {
  const { isRTL } = useLanguage();
  const label = LABELS[config.type] ?? config.type;
  return (
    <div
      className="bg-white rounded-3xl p-8 sm:p-10 shadow-2xl text-center max-w-md mx-auto"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <p className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-2">
        {label}
      </p>
      <h2 className="text-2xl sm:text-3xl font-black text-stone-900 mb-2">
        Coming soon
      </h2>
      <p className="text-stone-500 mb-6">
        This exercise type isn't ready yet. Skip to keep going through the worksheet.
      </p>
      <button
        type="button"
        onClick={() => onComplete({ score: 0, total: 0, answers: [] })}
        className="px-6 py-3 rounded-xl bg-stone-900 text-white font-bold hover:bg-stone-700 transition-all"
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      >
        Skip
      </button>
    </div>
  );
};

export default ComingSoonExercise;
