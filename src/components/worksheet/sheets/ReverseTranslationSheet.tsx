/**
 * Reverse Translation worksheet — shows translation (Hebrew/Arabic),
 * students write the English word.
 */
import type { Word } from '../../../data/vocabulary';

interface ReverseTranslationSheetProps {
  words: Word[];
  translationLang: 'he' | 'ar' | 'en';
  answerKey?: boolean;
}

function pickTranslation(w: Word, lang: 'he' | 'ar' | 'en'): string {
  if (lang === 'he') return w.hebrew;
  if (lang === 'ar') return w.arabic;
  return w.english;
}

export function ReverseTranslationSheet({ words, translationLang, answerKey }: ReverseTranslationSheetProps) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13pt' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #000' }}>
          <th style={{ textAlign: 'left', padding: '0.4rem', width: '8%' }}>#</th>
          <th style={{ textAlign: 'left', padding: '0.4rem', width: '40%' }}>Translation</th>
          <th style={{ textAlign: 'left', padding: '0.4rem', width: '52%' }}>
            {answerKey ? 'English' : 'Write the English word'}
          </th>
        </tr>
      </thead>
      <tbody>
        {words.map((w, idx) => (
          <tr key={w.id} style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '0.55rem' }}>{idx + 1}</td>
            <td style={{ padding: '0.55rem' }} dir="auto">
              <strong>{pickTranslation(w, translationLang)}</strong>
            </td>
            <td style={{ padding: '0.55rem', fontStyle: answerKey ? 'normal' : 'italic' }}>
              {answerKey ? <strong>{w.english}</strong> : '_______________________'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
