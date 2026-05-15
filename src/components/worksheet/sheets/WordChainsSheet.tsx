/**
 * Word Chains worksheet — for every consecutive pair of words in the
 * list, render `[word1] → ___ → [word2]` so the student writes a
 * connecting word that bridges the two.  Covers `words.length - 1`
 * pairs.
 *
 * There's no canonical answer key for this sheet — the student picks
 * any reasonable bridging word — so `answerKey` is intentionally a
 * no-op.  The orchestrator excludes this sheet type from the
 * consolidated answer key table for the same reason.
 */
import type { Word } from '../../../data/vocabulary';

interface WordChainsSheetProps {
  words: Word[];
  translationLang: 'he' | 'ar' | 'en';
}

export function WordChainsSheet({ words, translationLang }: WordChainsSheetProps) {
  const needsTwo = translationLang === 'he' ? 'שרשרת מילים דורשת לפחות שתי מילים.' : translationLang === 'ar' ? 'يحتاج تسلسل الكلمات إلى كلمتين على الأقل.' : 'Word Chains needs at least two words.';
  const buildChain = translationLang === 'he' ? 'בנו את השרשרת — מלאו מילה שמחברת בין כל זוג.' : translationLang === 'ar' ? 'ابنِ التسلسل — املأ كلمة تربط بين كل زوج.' : 'Build the chain — fill in a word that connects each pair.';
  // Need at least two words to form a chain.
  if (words.length < 2) {
    return (
      <p style={{ fontSize: '12pt', fontStyle: 'italic', color: '#666' }}>
        {needsTwo}
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
        {buildChain}
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
                textAlign: 'center',
                padding: '0 0.5rem',
              }} />
              <span style={{ color: '#888' }}>→</span>
              <span style={{ fontWeight: 700 }}>{pair.b.english}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
