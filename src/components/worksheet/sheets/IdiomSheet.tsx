/**
 * Idiom / Phrase worksheet — each row presents a word or phrase and
 * gives the student a blank line to write its meaning, with the
 * example sentence (when available) printed in italic below as
 * supporting context.
 *
 * The instruction text is word-or-phrase-agnostic ("Read each word /
 * phrase ...") because the base vocabulary doesn't carry an
 * `isPhrase` flag — calling everything an "idiom" would mislabel
 * single-word vocab.
 */
import type { Word } from '../../../data/vocabulary';
import { SheetInstruction } from './SheetInstruction';

interface IdiomSheetProps {
  words: Word[];
  translationLang: 'he' | 'ar' | 'en';
  answerKey?: boolean;
}

function pickTranslation(w: Word, lang: 'he' | 'ar' | 'en'): string {
  if (lang === 'he') return w.hebrew;
  if (lang === 'ar') return w.arabic;
  return '';
}

export function IdiomSheet({ words, translationLang, answerKey }: IdiomSheetProps) {
  return (
    <div>
      <SheetInstruction text="Read each word or phrase and write what it means." />
      <ol style={{ fontSize: '11pt', paddingLeft: '1.2rem', margin: 0 }}>
        {words.map((w) => {
          const example = w.example ?? w.sentence;
          const translation = pickTranslation(w, translationLang);
          return (
            <li key={w.id} style={{ marginBottom: '0.7rem', breakInside: 'avoid' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>{w.english}</div>
              <div style={{ borderBottom: '1px solid #888', minHeight: '1.3em', marginBottom: '0.2rem' }}>
                {answerKey && translation ? <em dir="auto">{translation}</em> : ''}
              </div>
              {example && (
                <div style={{ fontSize: '10pt', fontStyle: 'italic', color: '#555' }} dir="auto">
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
