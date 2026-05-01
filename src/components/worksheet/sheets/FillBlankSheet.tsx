/**
 * Fill-in-the-blank worksheet — sentences from each word's stored
 * sentence/example, with the target word replaced by a blank line.
 * Words without a usable sentence fall back to a generic
 * "Write a sentence using ____" prompt so the row count stays stable.
 */
import type { Word } from '../../../data/vocabulary';

interface FillBlankSheetProps {
  words: Word[];
  answerKey?: boolean;
}

function blankSentence(sentence: string, target: string): string {
  const re = new RegExp(`\\b${escapeRegex(target)}\\b`, 'i');
  if (!re.test(sentence)) return sentence;
  return sentence.replace(re, '__________');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function FillBlankSheet({ words, answerKey }: FillBlankSheetProps) {
  return (
    <ol style={{ paddingLeft: '1.5rem', fontSize: '13pt', lineHeight: 1.9 }}>
      {words.map(w => {
        const raw = w.sentence ?? w.example;
        if (!raw) {
          return (
            <li key={w.id} style={{ marginBottom: '0.6rem' }}>
              Write a sentence using <strong>{answerKey ? w.english : '__________'}</strong>:
              {!answerKey && (
                <div style={{ borderBottom: '1px solid #aaa', height: '1.2em', marginTop: '0.3rem' }} />
              )}
            </li>
          );
        }
        const blanked = blankSentence(raw, w.english);
        return (
          <li key={w.id} style={{ marginBottom: '0.6rem' }}>
            {answerKey ? (
              <span><strong>{w.english}</strong> — {raw}</span>
            ) : (
              <span>{blanked}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
