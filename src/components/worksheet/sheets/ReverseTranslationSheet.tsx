/**
 * Reverse Translation worksheet — shows translation (Hebrew/Arabic),
 * students write the English word.  Only meaningful for non-English
 * UI; in English mode the translation column would just echo the
 * English word, so it renders blank and the worksheet becomes a
 * recall prompt the teacher reads aloud.
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
  return '';
}

export function ReverseTranslationSheet({ words, translationLang, answerKey }: ReverseTranslationSheetProps) {
  const translationH = translationLang === 'he' ? 'תרגום' : translationLang === 'ar' ? 'الترجمة' : 'Translation';
  const writeH = answerKey
    ? (translationLang === 'he' ? 'אנגלית' : translationLang === 'ar' ? 'الإنجليزية' : 'English')
    : (translationLang === 'he' ? 'כתבו את המילה באנגלית' : translationLang === 'ar' ? 'اكتب الكلمة بالإنجليزية' : 'Write the English word');
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13pt' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #000' }}>
          <th style={{ textAlign: 'left', padding: '0.4rem', width: '8%' }}>#</th>
          <th style={{ textAlign: 'left', padding: '0.4rem', width: '40%' }}>{translationH}</th>
          <th style={{ textAlign: 'left', padding: '0.4rem', width: '52%' }}>
            {writeH}
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
