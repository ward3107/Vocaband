/**
 * Sentences context — a runner-scoped lookup that merges any AI
 * sentences minted with the worksheet (settings.sentences) on top of
 * the static FILLBLANK_SENTENCES bank. The four sentence-dependent
 * exercises (FillBlank, SentenceBuilding, Cloze, WordInContext) read
 * through this resolver instead of touching FILLBLANK_SENTENCES
 * directly, so the AI fallback works without prop-drilling through
 * each exercise's config schema.
 */
import { createContext, useContext, useMemo } from "react";
import { FILLBLANK_SENTENCES } from "../data/sentence-bank-fillblank";

type AiSentences = Record<string, string>;

const SentencesContext = createContext<AiSentences>({});

export const SentencesProvider = SentencesContext.Provider;

export interface SentenceResolver {
  get: (wordId: number) => string | undefined;
}

export const useSentenceResolver = (): SentenceResolver => {
  const ai = useContext(SentencesContext);
  // The resolver only needs to be referentially stable when `ai`
  // changes — same-render lookups for many words inside a useMemo
  // would otherwise see a fresh function each render and bust their
  // memoisation key.
  return useMemo<SentenceResolver>(
    () => ({
      get: (wordId) => ai[String(wordId)] ?? FILLBLANK_SENTENCES.get(wordId),
    }),
    [ai],
  );
};
