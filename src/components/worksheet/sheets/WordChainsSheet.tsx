/**
 * Word Chains worksheet — for every consecutive pair of words in the
 * list, render `[word1] → ___ → [word2]` so the student writes a
 * connecting word that bridges the two.  Covers `words.length - 1`
 * pairs.
 */
import type { Word } from '../../../data/vocabulary';

interface WordChainsSheetProps {
  words: Word[];
  translationLang: 'he' | 'ar' | 'en';
  answerKey?: boolean;
}

export function WordChainsSheet({ words, answerKey }: WordChainsSheetProps) {
  // Need at least two words to form a chain.
  if (words.length < 2) {
    return (
      <p style={{ fontSize: '12pt', fontStyle: 'italic', color: '#666' }}>
        Word Chains needs at least two words.
      </p>
    );
  }

  const pairs: Array<{ a: Word; b: Word }> = [];
  for (let i = 0; i < words.length - 1; i++) {
    pairs.push({ a: words[i], b: words[i + 1] });
  }

  return (
    <div>
      <p style={{ fontSize: '11pt', marginBottom: '0.75rem', fontStyle: 'italic' }}>
        Build the chain — fill in a word that connects each pair.
      </p>
      <ol style={{ fontSize: '13pt', paddingLeft: '1.25rem', margin: 0 }}>
        {pairs.map((pair, idx) => (
          <li key={`pair-${idx}`} style={{ marginBottom: '0.75rem', breakInside: 'avoid' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700 }}>{pair.a.english}</span>
              <span style={{ color: '#888' }}>→</span>
              <span style={{
                display: 'inline-block',
                minWidth: '8rem',
                borderBottom: '1px solid #555',
                fontStyle: answerKey ? 'normal' : 'italic',
                color: answerKey ? '#10b981' : '#aaa',
                fontWeight: answerKey ? 700 : 400,
                textAlign: 'center',
                padding: '0 0.5rem',
              }}>
                {answerKey ? '?' : ''}
              </span>
              <span style={{ color: '#888' }}>→</span>
              <span style={{ fontWeight: 700 }}>{pair.b.english}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
