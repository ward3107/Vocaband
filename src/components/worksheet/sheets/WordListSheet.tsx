/**
 * Word list — bilingual reference sheet.  Two columns: English on
 * left, translation on right.  Number column on the far left for
 * easy reference.  No answer key — this is just a study sheet.
 *
 * English UI mode hides the translation column entirely (it would
 * just echo the English word).
 */
import type { Word } from '../../../data/vocabulary';
import { SheetInstruction } from './SheetInstruction';

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
  const showTranslation = translationLang !== 'en';
  return (
    <div>
      <SheetInstruction text="Study each English word and its meaning." />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11pt' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #000' }}>
            <th style={{ textAlign: 'left', padding: '0.3rem', width: '8%' }}>#</th>
            <th style={{ textAlign: 'left', padding: '0.3rem', width: showTranslation ? '46%' : '92%' }}>English</th>
            {showTranslation && (
              <th style={{ textAlign: 'left', padding: '0.3rem', width: '46%' }}>Translation</th>
            )}
          </tr>
        </thead>
        <tbody>
          {words.map((w, idx) => (
            <tr key={w.id} style={{ borderBottom: '1px solid #ddd', pageBreakInside: 'avoid', pageBreakAfter: 'auto' }}>
              <td style={{ padding: '0.3rem' }}>{idx + 1}</td>
              <td style={{ padding: '0.3rem', fontWeight: 600 }}>{w.english}</td>
              {showTranslation && (
                <td style={{ padding: '0.3rem' }} dir="auto">{pickTranslation(w, translationLang)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
