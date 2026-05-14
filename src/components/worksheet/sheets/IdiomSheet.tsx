/**
 * Idiom worksheet — each row presents the idiom (treated as a phrase)
 * and gives the student a blank line to write its meaning, with the
 * example sentence (when available) printed in italic below as
 * supporting context.
 */
import type { Word } from '../../../data/vocabulary';

interface IdiomSheetProps {
  words: Word[];
  translationLang: 'he' | 'ar' | 'en';
  answerKey?: boolean;
}

function pickTranslation(w: Word, lang: 'he' | 'ar' | 'en'): string {
  if (lang === 'he') return w.hebrew;
  if (lang === 'ar') return w.arabic;
  return w.english;
}

export function IdiomSheet({ words, translationLang, answerKey }: IdiomSheetProps) {
  const readEach = translationLang === 'he' ? 'קראו כל ביטוי וכתבו מה אתם חושבים שהוא אומר.' : translationLang === 'ar' ? 'اقرأ كل تعبير اصطلاحي واكتب ما تعتقد أنه يعنيه.' : 'Read each idiom and write what you think it means.';
  return (
    <div>
      <p style={{ fontSize: '11pt', marginBottom: '0.75rem', fontStyle: 'italic' }}>
        {readEach}
      </p>
      <ol style={{ fontSize: '13pt', paddingLeft: '1.25rem', margin: 0 }}>
        {words.map((w) => {
          const example = w.example ?? w.sentence;
          return (
            <li key={w.id} style={{ marginBottom: '1rem', breakInside: 'avoid' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{w.english}</div>
              <div style={{ borderBottom: '1px solid #888', minHeight: '1.4em', marginBottom: '0.25rem' }}>
                {answerKey ? <em dir="auto">{pickTranslation(w, translationLang)}</em> : ''}
              </div>
              {example && (
                <div style={{ fontSize: '11pt', fontStyle: 'italic', color: '#555' }} dir="auto">
                  e.g. "{example}"
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
