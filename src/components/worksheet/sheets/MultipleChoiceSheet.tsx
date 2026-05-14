/**
 * Multiple Choice worksheet — word with 4 lettered options (A-D).
 * Students circle the correct answer.
 */
import { useMemo } from 'react';
import type { Word } from '../../../data/vocabulary';

interface MultipleChoiceSheetProps {
  words: Word[];
  translationLang: 'he' | 'ar' | 'en';
  answerKey?: boolean;
}

function pickTranslation(w: Word, lang: 'he' | 'ar' | 'en'): string {
  if (lang === 'he') return w.hebrew;
  if (lang === 'ar') return w.arabic;
  return w.english;
}

export function MultipleChoiceSheet({ words, translationLang, answerKey }: MultipleChoiceSheetProps) {
  // Generate 3 distractors for each word (memoised for stability)
  const questions = useMemo(() => {
    return words.map(targetWord => {
      // Pick 3 random distractors from other words
      const distractors = words
        .filter(w => w.id !== targetWord.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(w => w.english);

      const options = [targetWord.english, ...distractors]
        .sort(() => Math.random() - 0.5);

      const correctIndex = options.indexOf(targetWord.english);

      return {
        targetWord,
        options,
        correctIndex,
      };
    });
  }, [words]);

  const whatIsMeaning = (t: string) =>
    translationLang === 'he' ? <>מה המשמעות באנגלית של <strong dir="auto">{t}</strong>?</> :
    translationLang === 'ar' ? <>ما المعنى الإنجليزي لـ <strong dir="auto">{t}</strong>؟</> :
    <>What is the English meaning of <strong dir="auto">{t}</strong>?</>;
  return (
    <div style={{ fontSize: '13pt' }}>
      {questions.map((q, qIdx) => (
        <div key={q.targetWord.id} style={{ marginBottom: '1.2rem', paddingBottom: '1rem', borderBottom: '1px dashed #ccc' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 900, fontSize: '14pt' }}>{qIdx + 1}.</span>
            <span style={{ marginLeft: '0.5rem' }}>
              {whatIsMeaning(pickTranslation(q.targetWord, translationLang))}
            </span>
          </div>
          <div style={{ marginLeft: '1.5rem' }}>
            {q.options.map((opt, optIdx) => {
              const letter = String.fromCharCode(65 + optIdx); // A, B, C, D
              const isCorrect = optIdx === q.correctIndex;
              return (
                <div key={optIdx} style={{ marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, minWidth: '1.5rem' }}>{letter}.</span>
                  <span>
                    {answerKey && isCorrect ? (
                      <strong style={{ textDecoration: 'underline' }}>{opt}</strong>
                    ) : (
                      opt
                    )}
                  </span>
                  {answerKey && isCorrect && <span style={{ color: '#10b981', marginLeft: '0.5rem' }}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
