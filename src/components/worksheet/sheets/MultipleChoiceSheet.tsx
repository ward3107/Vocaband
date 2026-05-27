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
import { SheetInstruction } from './SheetInstruction';

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

  // Prompt is always English ("What is the English word for X?") with
  // the X shown in the worksheet's translation language.  These sheets
  // are hidden when the teacher picks "English only", so a translation
  // is always present.
  const whatIsMeaning = (w: Word) => {
    const target = pickTranslation(w, translationLang);
    return <>What is the English word for <strong dir="auto">{target}</strong>?</>;
  };

  return (
    <div style={{ fontSize: '11pt' }}>
      <SheetInstruction text="Circle the letter of the correct answer." />
      {effective.questions.map((q, qIdx) => {
        const word = words.find((w) => w.id === q.wordId);
        if (!word) return null;
        return (
          <div key={q.wordId} style={{ marginBottom: '0.8rem', paddingBottom: '0.6rem', borderBottom: '1px dashed #ccc', breakInside: 'avoid' }}>
            <div style={{ marginBottom: '0.4rem' }}>
              <span style={{ fontWeight: 900, fontSize: '12pt' }}>{qIdx + 1}.</span>
              <span style={{ marginLeft: '0.5rem' }}>{whatIsMeaning(word)}</span>
            </div>
            <div style={{ marginLeft: '1.5rem' }}>
              {q.options.map((opt, optIdx) => {
                const letter = String.fromCharCode(65 + optIdx);
                const isCorrect = optIdx === q.correctIndex;
                return (
                  <div key={optIdx} style={{ marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
