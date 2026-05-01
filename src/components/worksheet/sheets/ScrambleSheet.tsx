/**
 * Scramble worksheet — a list of scrambled words with a blank line
 * for the student to write the unscrambled answer.  Optional answer
 * key column for the teacher's reference.
 */
import { useMemo } from 'react';
import type { Word } from '../../../data/vocabulary';
import { scrambleWord } from '../../../utils/scrambleWord';

interface ScrambleSheetProps {
  words: Word[];
  translationLang: 'he' | 'ar' | 'en';
  answerKey?: boolean;
}

function pickTranslation(w: Word, lang: 'he' | 'ar' | 'en'): string {
  if (lang === 'he') return w.hebrew;
  if (lang === 'ar') return w.arabic;
  return w.english;
}

export function ScrambleSheet({ words, translationLang, answerKey }: ScrambleSheetProps) {
  // Memoise scrambling so re-renders don't re-randomise (same shape
  // for the worksheet vs the answer key).
  const scrambled = useMemo(() => words.map(w => scrambleWord(w.english.toUpperCase())), [words]);

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13pt' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #000' }}>
          <th style={{ textAlign: 'left', padding: '0.4rem', width: '8%' }}>#</th>
          <th style={{ textAlign: 'left', padding: '0.4rem', width: '30%' }}>Scrambled</th>
          <th style={{ textAlign: 'left', padding: '0.4rem', width: '30%' }}>Hint</th>
          <th style={{ textAlign: 'left', padding: '0.4rem', width: '32%' }}>
            {answerKey ? 'Answer' : 'Your answer'}
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
            <td style={{ padding: '0.55rem' }} dir="auto">{pickTranslation(w, translationLang)}</td>
            <td style={{ padding: '0.55rem', fontStyle: answerKey ? 'normal' : 'italic' }}>
              {answerKey ? <strong>{w.english.toUpperCase()}</strong> : '_______________________'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
