/**
 * Matching worksheet — words on one side, translations on the other.
 * Students draw lines to connect matching pairs.  Translation-column
 * permutation comes from the shared `shape` prop.
 */
import { useMemo } from 'react';
import type { Word } from '../../../data/vocabulary';
import type { MatchingShape } from '../buildShapes';
import { buildQuestionShapes } from '../buildShapes';

interface MatchingSheetProps {
  words: Word[];
  translationLang: 'he' | 'ar' | 'en';
  answerKey?: boolean;
  shape?: MatchingShape;
}

function pickTranslation(w: Word, lang: 'he' | 'ar' | 'en'): string {
  if (lang === 'he') return w.hebrew;
  if (lang === 'ar') return w.arabic;
  return '';
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function MatchingSheet({ words, translationLang, answerKey, shape }: MatchingSheetProps) {
  const fallback = useMemo(
    () => (shape ? null : buildQuestionShapes(words, translationLang, undefined).matching),
    [shape, words, translationLang],
  );
  const translationOrder = (shape ?? fallback!).translationOrder;

  const drawLines = translationLang === 'he' ? 'משכו קווים כדי לחבר כל מילה באנגלית לתרגום הנכון שלה.' : translationLang === 'ar' ? 'ارسم خطوطًا لربط كل كلمة بالإنجليزية بترجمتها الصحيحة.' : 'Draw lines to connect each English word with its correct translation.';

  return (
    <div style={{ fontSize: '13pt' }}>
      <p style={{ fontSize: '11pt', color: '#666', marginBottom: '1rem' }}>
        {drawLines}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem' }}>
        {/* English column — letters A, B, C ... */}
        <div style={{ flex: 1 }}>
          {words.map((w, idx) => (
            <div
              key={w.id}
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
              <span>{LETTERS[idx]}.</span>
              <span>{w.english}</span>
            </div>
          ))}
        </div>
        {/* Translation column — uses translationOrder to permute */}
        <div style={{ flex: 1 }}>
          {translationOrder.map((srcIdx, displayIdx) => {
            const srcWord = words[srcIdx];
            return (
              <div
                key={`right-${displayIdx}`}
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
                <span>{displayIdx + 1}.</span>
                <span>{pickTranslation(srcWord, translationLang)}</span>
                {answerKey && (
                  <span style={{ fontSize: '10pt', color: '#666', marginLeft: '0.5rem' }}>
                    ({LETTERS[srcIdx]})
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
