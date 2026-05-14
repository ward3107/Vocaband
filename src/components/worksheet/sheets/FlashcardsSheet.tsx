/**
 * Flashcards worksheet — two-column layout for cutting into flashcards.
 * Each card has English on front, translation on back.
 */
import type { Word } from '../../../data/vocabulary';

interface FlashcardsSheetProps {
  words: Word[];
  translationLang: 'he' | 'ar' | 'en';
}

function pickTranslation(w: Word, lang: 'he' | 'ar' | 'en'): string {
  if (lang === 'he') return w.hebrew;
  if (lang === 'ar') return w.arabic;
  return w.english;
}

export function FlashcardsSheet({ words, translationLang }: FlashcardsSheetProps) {
  // Pair words for front/back layout
  const pairs = [];
  for (let i = 0; i < words.length; i += 2) {
    pairs.push([words[i], words[i + 1]]);
  }

  return (
    <div style={{ fontSize: '12pt' }}>
      <p style={{ fontSize: '11pt', color: '#666', fontStyle: 'italic', marginBottom: '1rem' }}>
        {translationLang === 'he' ? 'גזרו לאורך הקווים המקווקווים. קפלו כל כרטיס לחצי. אנגלית בצד אחד, תרגום בצד השני.' : translationLang === 'ar' ? 'قصّ على طول الخطوط المنقّطة. اطوِ كل بطاقة من المنتصف. الإنجليزية على الوجه، والترجمة على الخلف.' : 'Cut along the dotted lines. Fold each card in half. English on front, translation on back.'}
      </p>
      {pairs.map((pair, rowIdx) => (
        <div key={rowIdx} style={{ display: 'flex', marginBottom: '1rem', pageBreakInside: 'avoid' }}>
          {pair.map((word, colIdx) => {
            if (!word) return <div key={`empty-${colIdx}`} style={{ flex: 1, marginRight: colIdx === 0 ? '1rem' : 0 }} />;
            return (
              <div
                key={word.id}
                style={{
                  flex: 1,
                  marginRight: colIdx === 0 ? '1rem' : 0,
                  border: '2px dashed #999',
                  borderRadius: '8px',
                  padding: '0.8rem',
                  position: 'relative',
                }}
              >
                <div style={{ fontSize: '16pt', fontWeight: 900, marginBottom: '0.5rem' }}>
                  {word.english}
                </div>
                <div style={{ fontSize: '11pt', color: '#666', marginBottom: '0.3rem' }}>──────────</div>
                <div style={{ fontSize: '14pt' }} dir="auto">
                  {pickTranslation(word, translationLang)}
                </div>
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
