/**
 * Multiple Choice worksheet — word with 4 lettered options (A-D).
 * Students circle the correct answer.
 *
 * Question shape (options + correct index) is supplied by the
 * orchestrator via the `shape` prop so the preview and the print share
 * the same dice roll.  Falls back to a local roll when rendered
 * standalone (e.g. tests).
 */
import { useMemo } from 'react';
import type { Word } from '../../../data/vocabulary';
import type { MultipleChoiceShape } from '../buildShapes';
import { buildQuestionShapes } from '../buildShapes';

interface MultipleChoiceSheetProps {
  words: Word[];
  translationLang: 'he' | 'ar' | 'en';
  answerKey?: boolean;
  shape?: MultipleChoiceShape;
}

function pickTranslation(w: Word, lang: 'he' | 'ar' | 'en'): string {
  if (lang === 'he') return w.hebrew;
  if (lang === 'ar') return w.arabic;
  return lang === 'en' ? w.english : w.english;
}

export function MultipleChoiceSheet({ words, translationLang, answerKey, shape }: MultipleChoiceSheetProps) {
  const fallback = useMemo(
    () => (shape ? null : buildQuestionShapes(words, translationLang, undefined)['multiple-choice']),
    [shape, words, translationLang],
  );
  const effective = shape ?? fallback!;

  // In English mode there's no translation to ask about — the prompt
  // would just show the answer word.  Render a definition-style prompt
  // ("Choose the word for: ___") with the target hidden, leaving the
  // teacher to read the definition out loud.  When no definition is
  // available the sheet remains usable as a recall check with the
  // translation column blank.
  const whatIsMeaning = (w: Word) => {
    const target = pickTranslation(w, translationLang);
    if (translationLang === 'he') return <>מה המשמעות באנגלית של <strong dir="auto">{target}</strong>?</>;
    if (translationLang === 'ar') return <>ما المعنى الإنجليزي لـ <strong dir="auto">{target}</strong>؟</>;
    // English: definition prompt if available, otherwise a generic
    // "Pick the word that fits" with the teacher filling in context.
    return <>Choose the correct word:</>;
  };

  return (
    <div style={{ fontSize: '13pt' }}>
      {effective.questions.map((q, qIdx) => {
        const word = words.find((w) => w.id === q.wordId);
        if (!word) return null;
        return (
          <div key={q.wordId} style={{ marginBottom: '1.2rem', paddingBottom: '1rem', borderBottom: '1px dashed #ccc', breakInside: 'avoid' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 900, fontSize: '14pt' }}>{qIdx + 1}.</span>
              <span style={{ marginLeft: '0.5rem' }}>{whatIsMeaning(word)}</span>
            </div>
            <div style={{ marginLeft: '1.5rem' }}>
              {q.options.map((opt, optIdx) => {
                const letter = String.fromCharCode(65 + optIdx);
                const isCorrect = optIdx === q.correctIndex;
                return (
                  <div key={optIdx} style={{ marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, minWidth: '1.5rem' }}>{letter}.</span>
                    <span>
                      {answerKey && isCorrect ? (
                        <strong style={{ textDecoration: 'underline' }}>{opt}</strong>
                      ) : (
                        opt
                      )}
                    </span>
                    {answerKey && isCorrect && <span style={{ color: '#10b981', marginLeft: '0.5rem' }}>✓</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
