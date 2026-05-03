/**
 * Listening worksheet — similar to multiple choice but with audio
 * icons. Teacher speaks the word, students choose the correct spelling.
 */
import { useMemo } from 'react';
import { Volume2 } from 'lucide-react';
import type { Word } from '../../../data/vocabulary';

interface ListeningSheetProps {
  words: Word[];
  translationLang: 'he' | 'ar' | 'en';
  answerKey?: boolean;
}

export function ListeningSheet({ words, answerKey }: ListeningSheetProps) {
  // Generate 3 distractors for each word
  const questions = useMemo(() => {
    return words.map(targetWord => {
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

  return (
    <div style={{ fontSize: '13pt' }}>
      <p style={{ fontSize: '11pt', color: '#666', marginBottom: '1rem' }}>
        Your teacher will say a word. Circle the correct spelling.
      </p>
      {questions.map((q, qIdx) => (
        <div key={q.targetWord.id} style={{ marginBottom: '1.2rem', paddingBottom: '1rem', borderBottom: '1px dashed #ccc' }}>
          <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 900, fontSize: '14pt' }}>{qIdx + 1}.</span>
            <Volume2 size={18} style={{ color: '#6366f1' }} />
            <span>Listen and choose the correct word:</span>
          </div>
          <div style={{ marginLeft: '1.5rem' }}>
            {q.options.map((opt, optIdx) => {
              const letter = String.fromCharCode(65 + optIdx);
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
