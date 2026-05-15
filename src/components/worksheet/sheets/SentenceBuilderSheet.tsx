/**
 * Sentence Builder worksheet — scrambled sentences with word banks.
 * Students unscramble words to build correct sentences.
 *
 * The shared `shape` prop carries either a pre-shuffled sentence or
 * null (when no AI / stored sentence is available).  Null rows fall
 * back to a "Use [word] in a sentence:" prompt instead of the old
 * "The X is on the table" template, which produced gibberish for
 * verbs, adjectives, prepositions and idioms.
 */
import { useMemo } from 'react';
import type { Word } from '../../../data/vocabulary';
import type { SentenceBuilderShape } from '../buildShapes';
import { buildQuestionShapes } from '../buildShapes';

interface SentenceBuilderSheetProps {
  words: Word[];
  translationLang: 'he' | 'ar' | 'en';
  answerKey?: boolean;
  aiSentences?: Record<number, string>;
  shape?: SentenceBuilderShape;
}

function pickTranslation(w: Word, lang: 'he' | 'ar' | 'en'): string {
  if (lang === 'he') return w.hebrew;
  if (lang === 'ar') return w.arabic;
  return '';
}

export function SentenceBuilderSheet({ words, translationLang, answerKey, aiSentences, shape }: SentenceBuilderSheetProps) {
  const fallback = useMemo(
    () => (shape ? null : buildQuestionShapes(words, translationLang, aiSentences)['sentence-builder']),
    [shape, words, translationLang, aiSentences],
  );
  const items = (shape ?? fallback!).items;

  const unscramblePrefix = translationLang === 'he' ? 'סדרו את המילים למשפט על' : translationLang === 'ar' ? 'رتّب الكلمات لتكوين جملة عن' : 'Unscramble the words to make a sentence about';
  const useWordPrompt = translationLang === 'he' ? 'כתבו משפט באמצעות' : translationLang === 'ar' ? 'اكتب جملة باستخدام' : 'Write a sentence using';
  const yourAnswer = translationLang === 'he' ? 'התשובה שלך:' : translationLang === 'ar' ? 'إجابتك:' : 'Your answer:';

  return (
    <div style={{ fontSize: '13pt' }}>
      {items.map((item, idx) => {
        const word = words.find((w) => w.id === item.wordId);
        if (!word) return null;
        const translation = pickTranslation(word, translationLang);
        const labelTarget = translation || word.english;

        // No sentence available — show a free-write prompt instead of
        // a bogus scrambled placeholder.
        if (!item.sentence) {
          return (
            <div key={item.wordId} style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px dashed #ccc', breakInside: 'avoid' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 900, fontSize: '14pt' }}>{idx + 1}.</span>
                <span style={{ marginLeft: '0.5rem', fontWeight: 700 }}>
                  {useWordPrompt} <strong dir="auto">{word.english}</strong>
                  {translation && (
                    <> (<span dir="auto">{translation}</span>)</>
                  )}:
                </span>
              </div>
              <div style={{ marginLeft: '1.5rem', borderBottom: '1px solid #888', height: '1.6em', marginBottom: '0.3rem' }}>
                {answerKey && <em style={{ color: '#999' }}>—</em>}
              </div>
            </div>
          );
        }

        return (
          <div key={item.wordId} style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px dashed #ccc', breakInside: 'avoid' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 900, fontSize: '14pt' }}>{idx + 1}.</span>
              <span style={{ marginLeft: '0.5rem', fontWeight: 700 }}>
                {unscramblePrefix} <strong dir="auto">{labelTarget}</strong>:
              </span>
            </div>
            <div style={{ marginLeft: '1.5rem', padding: '0.6rem', backgroundColor: '#f5f5f5', borderRadius: '8px', marginBottom: '0.5rem' }}>
              <span style={{ letterSpacing: '0.1em' }}>{item.scrambled}</span>
            </div>
            <div style={{ marginLeft: '1.5rem' }}>
              <span style={{ fontWeight: 700 }}>{yourAnswer} </span>
              <span style={{ fontStyle: answerKey ? 'normal' : 'italic' }}>
                {answerKey ? <strong>{item.sentence}</strong> : '______________________________________________'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
