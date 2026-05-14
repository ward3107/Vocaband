/**
 * Matching worksheet — words on one side, translations on the other.
 * Students draw lines to connect matching pairs.
 */
import { useMemo } from 'react';
import type { Word } from '../../../data/vocabulary';

interface MatchingSheetProps {
  words: Word[];
  translationLang: 'he' | 'ar' | 'en';
  answerKey?: boolean;
}

function pickTranslation(w: Word, lang: 'he' | 'ar' | 'en'): string {
  if (lang === 'he') return w.hebrew;
  if (lang === 'ar') return w.arabic;
  return w.english;
}

export function MatchingSheet({ words, translationLang, answerKey }: MatchingSheetProps) {
  // Shuffle translations independently for the matching exercise
  const { englishWords, translations } = useMemo(() => {
    const english = words.map(w => w.english);
    const trans = words.map(w => ({ word: w.english, translation: pickTranslation(w, translationLang) }));
    // Shuffle translations
    const shuffled = [...trans].sort(() => Math.random() - 0.5);
    return { englishWords: english, translations: shuffled };
  }, [words, translationLang]);

  const drawLines = translationLang === 'he' ? 'משכו קווים כדי לחבר כל מילה באנגלית לתרגום הנכון שלה.' : translationLang === 'ar' ? 'ارسم خطوطًا لربط كل كلمة بالإنجليزية بترجمتها الصحيحة.' : 'Draw lines to connect each English word with its correct translation.';
  return (
    <div style={{ fontSize: '13pt' }}>
      <p style={{ fontSize: '11pt', color: '#666', marginBottom: '1rem' }}>
        {drawLines}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem' }}>
        {/* English column */}
        <div style={{ flex: 1 }}>
          {englishWords.map((word, idx) => (
            <div
              key={idx}
              style={{
                padding: '0.6rem',
                marginBottom: '0.5rem',
                border: '2px solid #000',
                borderRadius: '8px',
                fontWeight: 700,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>{String.fromCharCode(65 + idx)}.</span>
              <span>{word}</span>
            </div>
          ))}
        </div>
        {/* Translation column */}
        <div style={{ flex: 1 }}>
          {translations.map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: '0.6rem',
                marginBottom: '0.5rem',
                border: '2px solid #000',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
              dir="auto"
            >
              <span>{String.fromCharCode(65 + idx)}.</span>
              <span>{item.translation}</span>
              {answerKey && (
                <span style={{ fontSize: '10pt', color: '#666', marginLeft: '0.5rem' }}>
                  ({item.word})
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
