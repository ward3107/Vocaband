/**
 * True/False worksheet — shows an English word with a translation,
 * students mark whether the translation is correct or not.
 */
import { useMemo } from 'react';
import type { Word } from '../../../data/vocabulary';

interface TrueFalseSheetProps {
  words: Word[];
  translationLang: 'he' | 'ar' | 'en';
  answerKey?: boolean;
}

function pickTranslation(w: Word, lang: 'he' | 'ar' | 'en'): string {
  if (lang === 'he') return w.hebrew;
  if (lang === 'ar') return w.arabic;
  return w.english;
}

function pickWrongTranslation(words: Word[], currentIndex: number, lang: 'he' | 'ar' | 'en'): string {
  const otherWords = words.filter((_, idx) => idx !== currentIndex);
  if (otherWords.length === 0) return 'wrong';
  const randomWord = otherWords[Math.floor(Math.random() * otherWords.length)];
  return pickTranslation(randomWord, lang);
}

export function TrueFalseSheet({ words, translationLang, answerKey }: TrueFalseSheetProps) {
  // Generate true/false questions with memoisation
  const questions = useMemo(() => {
    return words.map((w, idx) => {
      // Mix of true and false statements
      const isTrue = idx % 2 === 0;
      const shownTranslation = isTrue ? pickTranslation(w, translationLang) : pickWrongTranslation(words, idx, translationLang);
      return {
        word: w,
        shownTranslation,
        isTrue,
      };
    });
  }, [words, translationLang]);

  return (
    <div style={{ fontSize: '13pt' }}>
      {questions.map((q, idx) => (
        <div key={q.word.id} style={{ marginBottom: '0.8rem', paddingBottom: '0.8rem', borderBottom: '1px solid #eee' }}>
          <span style={{ fontWeight: 900, fontSize: '14pt' }}>{idx + 1}.</span>
          <span style={{ marginLeft: '0.5rem', marginRight: '1rem' }}>
            <strong>{q.word.english}</strong> means <strong dir="auto">{q.shownTranslation}</strong>
          </span>
          <span style={{ display: 'inline-flex', gap: '1rem', marginLeft: '1rem' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <span>☐ True</span>
              {answerKey && q.isTrue && <span style={{ color: '#10b981', fontWeight: 700 }}> ✓</span>}
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <span>☐ False</span>
              {answerKey && !q.isTrue && <span style={{ color: '#10b981', fontWeight: 700 }}> ✓</span>}
            </label>
          </span>
        </div>
      ))}
    </div>
  );
}
