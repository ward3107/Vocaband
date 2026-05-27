/**
 * Flashcards worksheet — two-column layout for cutting into flashcards.
 * Each card has English on front, translation on back.  In English UI
 * mode the back side is empty (no translation to show) so the cards
 * serve as plain word cards.
 */
import type { Word } from '../../../data/vocabulary';
import { SheetInstruction } from './SheetInstruction';

interface FlashcardsSheetProps {
  words: Word[];
  translationLang: 'he' | 'ar' | 'en';
}

function pickTranslation(w: Word, lang: 'he' | 'ar' | 'en'): string {
  if (lang === 'he') return w.hebrew;
  if (lang === 'ar') return w.arabic;
  return '';
}

export function FlashcardsSheet({ words, translationLang }: FlashcardsSheetProps) {
  // Pair words for front/back layout
  const pairs = [];
  for (let i = 0; i < words.length; i += 2) {
    pairs.push([words[i], words[i + 1]]);
  }

  return (
    <div style={{ fontSize: '11pt' }}>
      <SheetInstruction text="Cut along the dotted lines. Fold each card in half to study." />
      {pairs.map((pair, rowIdx) => (
        <div key={rowIdx} style={{ display: 'flex', marginBottom: '0.7rem', pageBreakInside: 'avoid' }}>
          {pair.map((word, colIdx) => {
            if (!word) return <div key={`empty-${colIdx}`} style={{ flex: 1, marginRight: colIdx === 0 ? '1rem' : 0 }} />;
            const translation = pickTranslation(word, translationLang);
            return (
              <div
                key={word.id}
                style={{
                  flex: 1,
                  marginRight: colIdx === 0 ? '1rem' : 0,
                  border: '2px dashed #999',
                  borderRadius: '8px',
                  padding: '0.6rem',
                  position: 'relative',
                }}
              >
                <div style={{ fontSize: '14pt', fontWeight: 900, marginBottom: '0.4rem' }}>
                  {word.english}
                </div>
                {translation && (
                  <>
                    <div style={{ fontSize: '11pt', color: '#666', marginBottom: '0.3rem' }}>──────────</div>
                    <div style={{ fontSize: '14pt' }} dir="auto">
                      {translation}
                    </div>
                  </>
                )}
                <div style={{ position: 'absolute', top: '0.3rem', right: '0.5rem', fontSize: '9pt', color: '#999' }}>
                  #{rowIdx * 2 + colIdx + 1}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
