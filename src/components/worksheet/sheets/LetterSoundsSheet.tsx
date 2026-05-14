/**
 * Letter Sounds worksheet — shows word with letter-by-letter breakdown
 * and phonetic hints. Students practice spelling and pronunciation.
 */
import type { Word } from '../../../data/vocabulary';

interface LetterSoundsSheetProps {
  words: Word[];
  translationLang: 'he' | 'ar' | 'en';
  answerKey?: boolean;
}

function pickTranslation(w: Word, lang: 'he' | 'ar' | 'en'): string {
  if (lang === 'he') return w.hebrew;
  if (lang === 'ar') return w.arabic;
  return w.english;
}

export function LetterSoundsSheet({ words, translationLang, answerKey }: LetterSoundsSheetProps) {
  const wordH = translationLang === 'he' ? 'מילה' : translationLang === 'ar' ? 'الكلمة' : 'Word';
  const letterByLetterH = translationLang === 'he' ? 'אות אחר אות' : translationLang === 'ar' ? 'حرفًا حرفًا' : 'Letter by letter';
  const hintH = translationLang === 'he' ? 'רמז' : translationLang === 'ar' ? 'تلميح' : 'Hint';
  const writeItH = answerKey
    ? (translationLang === 'he' ? 'כתבו אותה' : translationLang === 'ar' ? 'اكتبها' : 'Write it')
    : (translationLang === 'he' ? 'תורכם' : translationLang === 'ar' ? 'دورك' : 'Your turn');
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13pt' }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #000' }}>
          <th style={{ textAlign: 'left', padding: '0.4rem', width: '8%' }}>#</th>
          <th style={{ textAlign: 'left', padding: '0.4rem', width: '20%' }}>{wordH}</th>
          <th style={{ textAlign: 'left', padding: '0.4rem', width: '25%' }}>{letterByLetterH}</th>
          <th style={{ textAlign: 'left', padding: '0.4rem', width: '22%' }}>{hintH}</th>
          <th style={{ textAlign: 'left', padding: '0.4rem', width: '25%' }}>
            {writeItH}
          </th>
        </tr>
      </thead>
      <tbody>
        {words.map((w, idx) => (
          <tr key={w.id} style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '0.55rem' }}>{idx + 1}</td>
            <td style={{ padding: '0.55rem', fontWeight: 700 }}>{w.english}</td>
            <td style={{ padding: '0.55rem', letterSpacing: '0.15em', fontFamily: 'monospace' }}>
              {w.english.split('').join(' - ')}
            </td>
            <td style={{ padding: '0.55rem' }} dir="auto">{pickTranslation(w, translationLang)}</td>
            <td style={{ padding: '0.55rem', fontStyle: answerKey ? 'normal' : 'italic' }}>
              {answerKey ? <strong>{w.english}</strong> : '_______________________'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
