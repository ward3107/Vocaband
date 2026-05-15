/**
 * Fill-in-the-blank worksheet — sentences from each word's stored
 * sentence/example (or AI-generated when available), with the target
 * word replaced by a blank line.  Words without a usable sentence
 * fall back to a generic "Write a sentence using ____" prompt so the
 * row count stays stable.
 *
 * The blanking tolerates light inflection: "hurry" matches "hurries"
 * and "hurried", "swim" matches "swam"/"swimming"/"swims", "child"
 * matches "children".  Without that, an AI-generated sentence that
 * uses an inflected form would print whole with the answer visible.
 *
 * If even the loose matcher fails (irregular form the AI invented),
 * we render the free-write prompt rather than expose the answer.
 */
import type { Word } from '../../../data/vocabulary';

interface FillBlankSheetProps {
  words: Word[];
  answerKey?: boolean;
  /** AI-generated sentences keyed by word ID — overrides word.sentence/example */
  aiSentences?: Record<number, string>;
  translationLang?: 'he' | 'ar' | 'en';
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Common English inflectional suffixes the blanker should tolerate. */
const SUFFIX_PATTERNS = [
  's', 'es', 'ed', 'd', 'ing', 'ies', 'ied', 'er', 'est',
];

function buildInflectionRegex(target: string): RegExp {
  const trimmed = target.trim();
  if (!trimmed) return /(?!.*)/;

  // Multi-word phrases: match exact phrase only (no inflection across
  // phrase boundaries — inflections inside a phrase are rare enough
  // that exposing the answer is the lesser evil than mangling words).
  if (/\s/.test(trimmed)) {
    return new RegExp(`\\b${escapeRegex(trimmed)}\\b`, 'i');
  }

  // Build optional-suffix pattern.  Also strip common stems: "hurry"
  // -> "hurri" for "-ies" / "-ied"; "swim" -> "swimm" for "-ing".  We
  // accept the original stem plus any of the suffixes, and a couple
  // of one-letter-doubled / "y -> i" variants.
  const base = escapeRegex(trimmed);
  const stemY = trimmed.endsWith('y') ? escapeRegex(trimmed.slice(0, -1) + 'i') : null;
  const stemDouble = trimmed.length >= 3 ? escapeRegex(trimmed + trimmed.slice(-1)) : null;

  const stems = [base, stemY, stemDouble].filter(Boolean) as string[];
  const suffixGroup = SUFFIX_PATTERNS.join('|');
  const altGroup = stems.map((s) => `${s}(?:${suffixGroup})?`).join('|');
  return new RegExp(`\\b(?:${altGroup})\\b`, 'i');
}

function blankSentence(sentence: string, target: string): { blanked: string; matched: boolean } {
  const re = buildInflectionRegex(target);
  if (!re.test(sentence)) return { blanked: sentence, matched: false };
  return { blanked: sentence.replace(re, '__________'), matched: true };
}

export function FillBlankSheet({ words, answerKey, aiSentences, translationLang = 'en' }: FillBlankSheetProps) {
  const writeSentenceUsing = translationLang === 'he' ? 'כתבו משפט תוך שימוש ב' : translationLang === 'ar' ? 'اكتب جملة باستخدام' : 'Write a sentence using';
  return (
    <ol style={{ paddingLeft: '1.5rem', fontSize: '13pt', lineHeight: 1.9 }}>
      {words.map(w => {
        const raw = aiSentences?.[w.id] ?? w.sentence ?? w.example;
        if (!raw) {
          return (
            <li key={w.id} style={{ marginBottom: '0.6rem', breakInside: 'avoid' }}>
              {writeSentenceUsing} <strong>{answerKey ? w.english : w.english}</strong>:
              {!answerKey && (
                <div style={{ borderBottom: '1px solid #aaa', height: '1.2em', marginTop: '0.3rem' }} />
              )}
            </li>
          );
        }
        const { blanked, matched } = blankSentence(raw, w.english);
        // If the AI invented an irregular form the matcher missed,
        // don't print the sentence whole (it would show the answer).
        // Fall back to the free-write prompt with the source word.
        if (!matched) {
          return (
            <li key={w.id} style={{ marginBottom: '0.6rem', breakInside: 'avoid' }}>
              {answerKey ? (
                <span><strong>{w.english}</strong> — {raw}</span>
              ) : (
                <>
                  {writeSentenceUsing} <strong>{w.english}</strong>:
                  <div style={{ borderBottom: '1px solid #aaa', height: '1.2em', marginTop: '0.3rem' }} />
                </>
              )}
            </li>
          );
        }
        return (
          <li key={w.id} style={{ marginBottom: '0.6rem', breakInside: 'avoid' }}>
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
