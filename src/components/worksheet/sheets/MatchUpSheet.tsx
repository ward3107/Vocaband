/**
 * Match-up worksheet — two columns with English on the left and
 * shuffled translations on the right.  The student draws a line
 * between matching pairs.  Each row is numbered/lettered for written
 * pairing as a fallback (e.g. "1 — C").
 *
 * Right-column ordering comes from the shared `shape` prop so preview
 * + print stay in sync.
 */
import { useMemo } from 'react';
import type { Word } from '../../../data/vocabulary';
import type { MatchUpShape } from '../buildShapes';
import { buildQuestionShapes } from '../buildShapes';
import { SheetInstruction } from './SheetInstruction';

interface MatchUpSheetProps {
  words: Word[];
  translationLang: 'he' | 'ar' | 'en';
  answerKey?: boolean;
  shape?: MatchUpShape;
}

function pickTranslation(w: Word, lang: 'he' | 'ar' | 'en'): string {
  if (lang === 'he') return w.hebrew;
  if (lang === 'ar') return w.arabic;
  // English UI mode: translation column would just echo the English
  // word, which makes the exercise meaningless.  Leave it blank so the
  // teacher can fill in their own prompt by hand if needed.
  return '';
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function MatchUpSheet({ words, translationLang, answerKey, shape }: MatchUpSheetProps) {
  const fallback = useMemo(
    () => (shape ? null : buildQuestionShapes(words, translationLang, undefined)['match-up']),
    [shape, words, translationLang],
  );
  const rightOrder = (shape ?? fallback!).rightOrder;

  // The right column letter for each LEFT-column row's correct match.
  const correctLetterForLeft = (leftIdx: number) => {
    const rightPos = rightOrder.indexOf(leftIdx);
    return LETTERS[rightPos] ?? '?';
  };

  return (
    <div>
      <SheetInstruction text="Draw a line from each English word to its translation. Or write the matching letter on the line." />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11pt' }}>
        <tbody>
          {words.map((w, idx) => {
            const rightWordIdx = rightOrder[idx];
            return (
              <tr key={`row-${idx}`} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '0.4rem', width: '5%' }}>{idx + 1}.</td>
                <td style={{ padding: '0.4rem', fontWeight: 600, width: '30%' }}>{w.english}</td>
                <td style={{ padding: '0.4rem', width: '20%' }}>
                  {answerKey
                    ? <strong>→ {correctLetterForLeft(idx)}</strong>
                    : '_____'}
                </td>
                <td style={{ padding: '0.4rem', width: '5%', fontWeight: 700 }}>{LETTERS[idx]}.</td>
                <td style={{ padding: '0.4rem' }} dir="auto">{pickTranslation(words[rightWordIdx], translationLang)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
