/**
 * Match-up worksheet — two columns with English on the left and
 * shuffled translations on the right.  The student draws a line
 * between matching pairs.  Each row is numbered/lettered for written
 * pairing as a fallback (e.g. "1 — C").
 */
import { useMemo } from 'react';
import type { Word } from '../../../data/vocabulary';

interface MatchUpSheetProps {
  words: Word[];
  translationLang: 'he' | 'ar' | 'en';
  answerKey?: boolean;
}

function pickTranslation(w: Word, lang: 'he' | 'ar' | 'en'): string {
  if (lang === 'he') return w.hebrew;
  if (lang === 'ar') return w.arabic;
  return w.english;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function MatchUpSheet({ words, translationLang, answerKey }: MatchUpSheetProps) {
  const rightOrder = useMemo(() => {
    const indices = words.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [words]);

  // The right column letter for each LEFT-column row's correct match.
  const correctLetterForLeft = (leftIdx: number) => {
    const rightPos = rightOrder.indexOf(leftIdx);
    return LETTERS[rightPos] ?? '?';
  };

  const drawLine = translationLang === 'he' ? 'משכו קו מכל מילה באנגלית לתרגום שלה. (או כתבו את האות המתאימה על הקו.)' : translationLang === 'ar' ? 'ارسم خطًا من كل كلمة بالإنجليزية إلى ترجمتها. (أو اكتب الحرف المطابق على السطر.)' : 'Draw a line from each English word to its translation.  (Or write the matching letter on the line.)';
  return (
    <div>
      <p style={{ fontSize: '11pt', marginBottom: '0.75rem', fontStyle: 'italic' }}>
        {drawLine}
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13pt' }}>
        <tbody>
          {words.map((w, idx) => {
            const rightWordIdx = rightOrder[idx];
            return (
              <tr key={`row-${idx}`} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '0.6rem', width: '5%' }}>{idx + 1}.</td>
                <td style={{ padding: '0.6rem', fontWeight: 600, width: '30%' }}>{w.english}</td>
                <td style={{ padding: '0.6rem', width: '20%' }}>
                  {answerKey
                    ? <strong>→ {correctLetterForLeft(idx)}</strong>
                    : '_____'}
                </td>
                <td style={{ padding: '0.6rem', width: '5%', fontWeight: 700 }}>{LETTERS[idx]}.</td>
                <td style={{ padding: '0.6rem' }} dir="auto">{pickTranslation(words[rightWordIdx], translationLang)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
