/**
 * Sentence Builder worksheet — scrambled sentences with word banks.
 * Students unscramble words to build correct sentences.
 */
import { useMemo } from 'react';
import type { Word } from '../../../data/vocabulary';

interface SentenceBuilderSheetProps {
  words: Word[];
  translationLang: 'he' | 'ar' | 'en';
  answerKey?: boolean;
  aiSentences?: Record<number, string>;
}

function pickTranslation(w: Word, lang: 'he' | 'ar' | 'en'): string {
  if (lang === 'he') return w.hebrew;
  if (lang === 'ar') return w.arabic;
  return w.english;
}

function shuffleString(str: string): string {
  return str.split(' ').sort(() => Math.random() - 0.5).join(' ');
}

export function SentenceBuilderSheet({ words, translationLang, answerKey, aiSentences }: SentenceBuilderSheetProps) {
  // Use AI sentences if available, otherwise generate placeholder sentences
  const sentences = useMemo(() => {
    return words.map(word => {
      const aiSentence = aiSentences?.[word.id];
      const sentence = aiSentence || `The ${word.english} is on the table.`;
      return {
        word,
        sentence,
        translation: pickTranslation(word, translationLang),
      };
    });
  }, [words, translationLang, aiSentences]);

  return (
    <div style={{ fontSize: '13pt' }}>
      {sentences.map((item, idx) => {
        const scrambled = shuffleString(item.sentence);
        return (
          <div key={item.word.id} style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px dashed #ccc' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 900, fontSize: '14pt' }}>{idx + 1}.</span>
              <span style={{ marginLeft: '0.5rem', fontWeight: 700 }}>
                Unscramble the words to make a sentence about <strong dir="auto">{item.translation}</strong>:
              </span>
            </div>
            <div style={{ marginLeft: '1.5rem', padding: '0.6rem', backgroundColor: '#f5f5f5', borderRadius: '8px', marginBottom: '0.5rem' }}>
              <span style={{ letterSpacing: '0.1em' }}>{scrambled}</span>
            </div>
            <div style={{ marginLeft: '1.5rem' }}>
              <span style={{ fontWeight: 700 }}>Your answer: </span>
              <span style={{ fontStyle: answerKey ? 'normal' : 'italic' }}>
                {answerKey ? <strong>{item.sentence}</strong> : '______________________________________________'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
