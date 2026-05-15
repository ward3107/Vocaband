/**
 * Scramble worksheet — a list of scrambled words with a blank line
 * for the student to write the unscrambled answer.  Letter order
 * comes from the shared `shape` prop so the preview and the print
 * use the same scramble.
 */
import { useMemo } from 'react';
import type { Word } from '../../../data/vocabulary';
import type { ScrambleShape } from '../buildShapes';
import { buildQuestionShapes } from '../buildShapes';

interface ScrambleSheetProps {
  words: Word[];
  translationLang: 'he' | 'ar' | 'en';
  answerKey?: boolean;
  shape?: ScrambleShape;
}

function pickTranslation(w: Word, lang: 'he' | 'ar' | 'en'): string {
  if (lang === 'he') return w.hebrew;
  if (lang === 'ar') return w.arabic;
  return '';
}

export function ScrambleSheet({ words, translationLang, answerKey, shape }: ScrambleSheetProps) {
  const fallback = useMemo(
    () => (shape ? null : buildQuestionShapes(words, translationLang, undefined).scramble),
    [shape, words, translationLang],
  );
  const scrambled = (shape ?? fallback!).scrambled;

  const scrambledH = translationLang === 'he' ? 'מעורבל' : translationLang === 'ar' ? 'مخلوط' : 'Scrambled';
  const hintH = translationLang === 'he' ? 'רמז' : translationLang === 'ar' ? 'تلميح' : 'Hint';
  const answerH = answerKey
    ? (translationLang === 'he' ? 'תשובה' : translationLang === 'ar' ? 'الإجابة' : 'Answer')
    : (translationLang === 'he' ? 'התשובה שלך' : translationLang === 'ar' ? 'إجابتك' : 'Your answer');

  // English mode has no useful hint column — the hint would be the
  // same word as the answer.  Drop the hint header + cell in that case.
  const showHint = translationLang !== 'en';

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13pt' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #000' }}>
          <th style={{ textAlign: 'left', padding: '0.4rem', width: '8%' }}>#</th>
          <th style={{ textAlign: 'left', padding: '0.4rem', width: showHint ? '30%' : '46%' }}>{scrambledH}</th>
          {showHint && (
            <th style={{ textAlign: 'left', padding: '0.4rem', width: '30%' }}>{hintH}</th>
          )}
          <th style={{ textAlign: 'left', padding: '0.4rem', width: showHint ? '32%' : '46%' }}>
            {answerH}
          </th>
        </tr>
      </thead>
      <tbody>
        {words.map((w, idx) => (
          <tr key={w.id} style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '0.55rem' }}>{idx + 1}</td>
            <td style={{ padding: '0.55rem', fontWeight: 700, letterSpacing: '0.1em' }}>
              {scrambled[idx]}
            </td>
            {showHint && (
              <td style={{ padding: '0.55rem' }} dir="auto">{pickTranslation(w, translationLang)}</td>
            )}
            <td style={{ padding: '0.55rem', fontStyle: answerKey ? 'normal' : 'italic' }}>
              {answerKey ? <strong>{w.english.toUpperCase()}</strong> : '_______________________'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
