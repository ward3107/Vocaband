/**
 * True/False worksheet — shows an English word with a translation,
 * students mark whether the translation is correct or not.
 *
 * The true/false pattern + distractor translations come from the
 * shared `shape` prop so the preview matches the print.  Pattern is
 * balanced (~half true, ~half false) and shuffled, so students can't
 * shortcut by index parity.  Distractors exclude any other word whose
 * translation equals the correct one.
 */
import { useMemo } from 'react';
import type { Word } from '../../../data/vocabulary';
import type { TrueFalseShape } from '../buildShapes';
import { buildQuestionShapes } from '../buildShapes';
import { SheetInstruction } from './SheetInstruction';

interface TrueFalseSheetProps {
  words: Word[];
  translationLang: 'he' | 'ar' | 'en';
  answerKey?: boolean;
  shape?: TrueFalseShape;
}

export function TrueFalseSheet({ words, translationLang, answerKey, shape }: TrueFalseSheetProps) {
  const fallback = useMemo(
    () => (shape ? null : buildQuestionShapes(words, translationLang, undefined)['true-false']),
    [shape, words, translationLang],
  );
  const effective = shape ?? fallback!;

  const meansWord = 'means';
  const trueLabel = 'True';
  const falseLabel = 'False';

  return (
    <div style={{ fontSize: '11pt' }}>
      <SheetInstruction text="Read each pair. Tick True if the meaning is correct, or False if it is wrong." />
      {effective.questions.map((q, idx) => {
        const word = words.find((w) => w.id === q.wordId);
        if (!word) return null;
        return (
          <div key={q.wordId} style={{ marginBottom: '0.55rem', paddingBottom: '0.55rem', borderBottom: '1px solid #eee', breakInside: 'avoid' }}>
            <span style={{ fontWeight: 900, fontSize: '12pt' }}>{idx + 1}.</span>
            <span style={{ marginLeft: '0.5rem', marginRight: '1rem' }}>
              <strong>{word.english}</strong> {meansWord} <strong dir="auto">{q.shownTranslation}</strong>
            </span>
            <span style={{ display: 'inline-flex', gap: '1rem', marginLeft: '1rem' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>☐ {trueLabel}</span>
                {answerKey && q.isTrue && <span style={{ color: '#10b981', fontWeight: 700 }}> ✓</span>}
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <span>☐ {falseLabel}</span>
                {answerKey && !q.isTrue && <span style={{ color: '#10b981', fontWeight: 700 }}> ✓</span>}
              </label>
            </span>
          </div>
        );
      })}
    </div>
  );
}
