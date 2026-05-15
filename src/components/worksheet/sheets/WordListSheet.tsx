/**
 * Word list — bilingual reference sheet.  Two columns: English on
 * left, translation on right.  Number column on the far left for
 * easy reference.  No answer key — this is just a study sheet.
 *
 * English UI mode hides the translation column entirely (it would
 * just echo the English word).
 */
import type { Word } from '../../../data/vocabulary';

interface WordListSheetProps {
  words: Word[];
  translationLang: 'he' | 'ar' | 'en';
}

function pickTranslation(w: Word, lang: 'he' | 'ar' | 'en'): string {
  if (lang === 'he') return w.hebrew;
  if (lang === 'ar') return w.arabic;
  return '';
}

export function WordListSheet({ words, translationLang }: WordListSheetProps) {
  const englishH = translationLang === 'he' ? 'אנגלית' : translationLang === 'ar' ? 'الإنجليزية' : 'English';
  const translationH = translationLang === 'he' ? 'תרגום' : translationLang === 'ar' ? 'الترجمة' : '';
  const showTranslation = translationLang !== 'en';
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13pt' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #000' }}>
          <th style={{ textAlign: 'left', padding: '0.4rem', width: '8%' }}>#</th>
          <th style={{ textAlign: 'left', padding: '0.4rem', width: showTranslation ? '46%' : '92%' }}>{englishH}</th>
          {showTranslation && (
            <th style={{ textAlign: 'left', padding: '0.4rem', width: '46%' }}>
              {translationH}
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {words.map((w, idx) => (
          <tr key={w.id} style={{ borderBottom: '1px solid #ddd', pageBreakInside: 'avoid', pageBreakAfter: 'auto' }}>
            <td style={{ padding: '0.5rem' }}>{idx + 1}</td>
            <td style={{ padding: '0.5rem', fontWeight: 600 }}>{w.english}</td>
            {showTranslation && (
              <td style={{ padding: '0.5rem' }} dir="auto">{pickTranslation(w, translationLang)}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
