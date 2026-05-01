/**
 * ClassShowView — full-screen teacher-led classroom mode.
 *
 * Designed for classrooms where students DON'T have phones.  The
 * teacher's projected screen IS the entire experience: a giant
 * question, four lettered options, a Reveal button.  Students answer
 * verbally; teacher reveals; everyone sees the green-highlighted
 * correct answer.  No scoring, no per-student tracking, no server
 * round trips — just a beautifully-paced classroom slideshow.
 *
 * Six modes ship in v1: Classic / Listening / Reverse / Fill-Blank /
 * True-False / Flashcards.  The other six (Spelling / Scramble /
 * Letter Sounds / Matching / Memory Flip / Sentence Builder) live in
 * Pillar B and are added in a later commit.
 *
 * State machine:
 *   setup   → teacher picks mode + word source + question count
 *   playing → reveal/skip/next/end loop
 *   finished → "Show complete!" + replay or back-to-dashboard
 */
import { useEffect, useMemo, useState } from 'react';
import { useTeacherTheme } from '../hooks/useTeacherTheme';
import ClassShowSetup, { type ClassShowMode, type ClassShowWordSource, type ClassShowWordPickerWiring } from '../components/classshow/ClassShowSetup';
import ClassShowQuestion from '../components/classshow/ClassShowQuestion';
import ClassShowControls from '../components/classshow/ClassShowControls';
import ClassShowFinale from '../components/classshow/ClassShowFinale';
import {
  buildClassicQuestion,
  buildReverseQuestion,
  buildFillBlankQuestion,
  buildTrueFalseQuestion,
  type TranslationLang,
} from '../utils/buildQuestion';
import { useLanguage } from '../hooks/useLanguage';
import type { AppUser } from '../core/supabase';

interface ClassShowViewProps {
  user: AppUser | null;
  initialSources: ClassShowWordSource[];
  /** Index of the source to pre-select (e.g. the assignment that
   *  launched the show).  Defaults to 0 (the first source). */
  initialSourceIndex?: number;
  onExit: () => void;
  /** Wiring for the embedded WordPicker so teachers can build a
   *  custom word list using paste / OCR / topic packs / saved groups
   *  — the same UX the assignment wizard uses.  Optional: when
   *  omitted, only the pre-built sources are available. */
  pickerWiring?: ClassShowWordPickerWiring;
}

type Phase =
  | { kind: 'setup' }
  | {
      kind: 'playing';
      mode: ClassShowMode;
      source: ClassShowWordSource;
      wordOrder: number[]; // shuffled indices into source.words
      currentIndex: number;
      revealed: boolean;
      flashcardFlipped: boolean;
    }
  | { kind: 'finished'; questionsCovered: number };

function shuffleIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function ClassShowView({ user, initialSources, initialSourceIndex = 0, onExit, pickerWiring }: ClassShowViewProps) {
  // Apply the teacher's chosen dashboard palette so the projector
  // surface keeps the same look + feel as the rest of their UI.
  useTeacherTheme(user?.teacherDashboardTheme);

  const { language } = useLanguage();
  const translationLang: TranslationLang = language === 'he' ? 'he' : language === 'ar' ? 'ar' : 'he';

  const [phase, setPhase] = useState<Phase>({ kind: 'setup' });

  // Build the current question (memoised so distractor randomisation
  // stays stable while the teacher is on the same word).
  const { multiChoice, trueFalse } = useMemo(() => {
    if (phase.kind !== 'playing') return { multiChoice: null, trueFalse: null };
    const word = phase.source.words[phase.wordOrder[phase.currentIndex]];
    if (!word) return { multiChoice: null, trueFalse: null };
    const pool = phase.source.words;
    if (phase.mode === 'classic' || phase.mode === 'listening') {
      return { multiChoice: buildClassicQuestion(word, pool, translationLang), trueFalse: null };
    }
    if (phase.mode === 'reverse') {
      return { multiChoice: buildReverseQuestion(word, pool, translationLang), trueFalse: null };
    }
    if (phase.mode === 'fill-blank') {
      const q = buildFillBlankQuestion(word, pool);
      // Fall back to classic if this word lacks a usable sentence.
      return { multiChoice: q ?? buildClassicQuestion(word, pool, translationLang), trueFalse: null };
    }
    if (phase.mode === 'true-false') {
      return { multiChoice: null, trueFalse: buildTrueFalseQuestion(word, pool, translationLang) };
    }
    // flashcards: no options
    return { multiChoice: null, trueFalse: null };
  }, [phase, translationLang]);

  // Block the back-button while a show is in progress so a stray
  // browser-back doesn't yank the teacher out of the lesson.
  useEffect(() => {
    if (phase.kind !== 'playing') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [phase.kind]);

  if (phase.kind === 'setup') {
    return (
      <ClassShowSetup
        availableSources={initialSources}
        initialSourceIndex={initialSourceIndex}
        pickerWiring={pickerWiring}
        onCancel={onExit}
        onStart={({ mode, source, questionCount }) => {
          const order = shuffleIndices(source.words.length).slice(0, questionCount);
          setPhase({
            kind: 'playing',
            mode,
            source,
            wordOrder: order,
            currentIndex: 0,
            revealed: false,
            flashcardFlipped: false,
          });
        }}
      />
    );
  }

  if (phase.kind === 'finished') {
    return (
      <ClassShowFinale
        questionsCovered={phase.questionsCovered}
        onPlayAnother={() => setPhase({ kind: 'setup' })}
        onBackToDashboard={onExit}
      />
    );
  }

  // playing
  const word = phase.source.words[phase.wordOrder[phase.currentIndex]];
  const isLast = phase.currentIndex >= phase.wordOrder.length - 1;
  // Batch modes (matching, memory-flip) consume multiple words per
  // "question" — slice from the current position into the order.
  const batchSize = phase.mode === 'memory-flip' ? 6 : 4;
  const batch = phase.source.words
    ? phase.wordOrder.slice(phase.currentIndex, phase.currentIndex + batchSize).map(i => phase.source.words[i])
    : [];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--vb-surface-alt)' }}>
      <div className="flex-1 flex">
        {word && (
          <ClassShowQuestion
            mode={phase.mode}
            word={word}
            multiChoice={multiChoice}
            trueFalse={trueFalse}
            revealed={phase.revealed}
            flashcardFlipped={phase.flashcardFlipped}
            onToggleFlashcard={() =>
              setPhase(p => (p.kind === 'playing' ? { ...p, flashcardFlipped: !p.flashcardFlipped } : p))
            }
            batch={batch}
            pool={phase.source.words}
          />
        )}
      </div>
      <ClassShowControls
        revealed={phase.revealed}
        isLast={isLast}
        currentIndex={phase.currentIndex}
        total={phase.wordOrder.length}
        onReveal={() =>
          setPhase(p =>
            p.kind === 'playing'
              ? phase.mode === 'flashcards'
                ? { ...p, flashcardFlipped: true, revealed: true }
                : { ...p, revealed: true }
              : p,
          )
        }
        onSkip={() =>
          setPhase(p => {
            if (p.kind !== 'playing') return p;
            if (p.currentIndex >= p.wordOrder.length - 1) {
              return { kind: 'finished', questionsCovered: p.currentIndex };
            }
            return { ...p, currentIndex: p.currentIndex + 1, revealed: false, flashcardFlipped: false };
          })
        }
        onNext={() =>
          setPhase(p => {
            if (p.kind !== 'playing') return p;
            if (p.currentIndex >= p.wordOrder.length - 1) {
              return { kind: 'finished', questionsCovered: p.currentIndex + 1 };
            }
            return { ...p, currentIndex: p.currentIndex + 1, revealed: false, flashcardFlipped: false };
          })
        }
        onEnd={() =>
          setPhase(p =>
            p.kind === 'playing'
              ? { kind: 'finished', questionsCovered: p.currentIndex + (p.revealed ? 1 : 0) }
              : p,
          )
        }
      />
    </div>
  );
}
