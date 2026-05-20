/**
 * ClassShowQuestion — the big projected question display.  Renders
 * mode-specific layouts (Classic / Listening / Reverse / Fill-Blank /
 * True-False / Flashcards) at sizes legible from the back of an 8m
 * classroom.  Driven entirely by the parent ClassShowView; no audio
 * autoplay, no auto-advance — the teacher decides the pace.
 *
 * Click-to-reveal: every answer surface is tappable.  The teacher
 * doesn't press a separate "Reveal" button; they tap any visible
 * option (or letter / sentence tile) to flip the screen into the
 * revealed state.
 */
import { motion } from 'motion/react';
import { useMemo } from 'react';
import { Volume2 } from 'lucide-react';
import type { Word } from '../../data/vocabulary';
import type { MultiChoiceQuestion, TrueFalseQuestion } from '../../utils/buildQuestion';
import type { ClassShowMode } from './ClassShowSetup';
import { useLanguage } from '../../hooks/useLanguage';
import { classShowStrings } from '../../locales/student/class-show';
import { gameAriasT } from '../../locales/student/game-arias';
import { useAudio } from '../../hooks/useAudio';
import { getSentencesForWord } from '../../data/sentence-bank';
import {
  SpellingProjector,
  ScrambleProjector,
  LetterSoundsProjector,
  MatchingProjector,
  MemoryFlipProjector,
  SentenceBuilderProjector,
  SpeedRoundProjector,
} from './AdaptedModes';

interface ClassShowQuestionProps {
  mode: ClassShowMode;
  word: Word;
  multiChoice: MultiChoiceQuestion | null;
  trueFalse: TrueFalseQuestion | null;
  revealed: boolean;
  /** Flashcards-only — toggles between front/back. */
  flashcardFlipped: boolean;
  onToggleFlashcard: () => void;
  /** Called when the teacher reveals the answer by tapping the surface. */
  onReveal: () => void;
  /** Batch modes (matching, memory-flip) need a slice of the pool. */
  batch: Word[];
  pool: Word[];
}

const LETTERS = ['A', 'B', 'C', 'D'];

export default function ClassShowQuestion(props: ClassShowQuestionProps) {
  const { language } = useLanguage();
  const t = classShowStrings[language];
  const audio = useAudio();
  const { mode, word, multiChoice, trueFalse, revealed, batch, pool, onReveal } = props;

  const playAudio = () => audio.speak(word.id, word.english);

  // Pillar B — adapted projector modes ─────────────────────────────
  if (mode === 'spelling') return <SpellingProjector word={word} revealed={revealed} onReveal={onReveal} />;
  if (mode === 'scramble') return <ScrambleProjector word={word} revealed={revealed} onReveal={onReveal} />;
  if (mode === 'letter-sounds') return <LetterSoundsProjector word={word} pool={pool} revealed={revealed} onReveal={onReveal} />;
  if (mode === 'matching') return <MatchingProjector pool={pool} words={batch} revealed={revealed} onReveal={onReveal} />;
  if (mode === 'memory-flip') return <MemoryFlipProjector words={batch} revealed={revealed} />;
  if (mode === 'sentence-builder') return <SentenceBuilderProjector word={word} revealed={revealed} onReveal={onReveal} />;
  if (mode === 'speed-round') return <SpeedRoundProjector word={word} revealed={revealed} onReveal={onReveal} />;

  // Flashcards: just show the front (English) → tap → back (translation).
  if (mode === 'flashcards') {
    return (
      <FlashcardsLayout
        word={word}
        flipped={props.flashcardFlipped}
        onFlip={props.onToggleFlashcard}
        onPlayAudio={playAudio}
        flipHint={t.flipCard}
        playHint={t.tapPlayAudio}
      />
    );
  }

  // True/False: word + translation pair, big TRUE/FALSE labels.
  if (mode === 'true-false' && trueFalse) {
    return (
      <TrueFalseLayout
        question={trueFalse}
        revealed={revealed}
        labels={{ true: t.trueLabel, false: t.falseLabel }}
        correctLabel={t.correctAnswer}
        onPlayAudio={playAudio}
        onReveal={onReveal}
      />
    );
  }

  // Fill-blank gets its own layout so we can synthesise a sentence
  // from the sentence-bank when the underlying buildFillBlankQuestion
  // returned null (which happens for almost every word in the compact
  // tuple vocabulary because they don't carry inline sentences).
  if (mode === 'fill-blank') {
    return (
      <FillBlankLayout
        word={word}
        pool={pool}
        revealed={revealed}
        letters={LETTERS}
        correctLabel={t.correctAnswer}
        onPlayAudio={playAudio}
        onReveal={onReveal}
        precomputed={multiChoice}
      />
    );
  }

  if (!multiChoice) {
    return null;
  }

  // Multi-choice: classic / listening / reverse.
  return (
    <MultiChoiceLayout
      mode={mode}
      question={multiChoice}
      revealed={revealed}
      letters={LETTERS}
      correctLabel={t.correctAnswer}
      onPlayAudio={playAudio}
      onReveal={onReveal}
    />
  );
}

// ─── Flashcards ──────────────────────────────────────────────────────

function FlashcardsLayout({
  word, flipped, onFlip, onPlayAudio, flipHint, playHint,
}: {
  word: Word;
  flipped: boolean;
  onFlip: () => void;
  onPlayAudio: () => void;
  flipHint: string;
  playHint: string;
}) {
  const { language } = useLanguage();
  const translation = language === 'he' ? word.hebrew : language === 'ar' ? word.arabic : word.hebrew;
  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <button
        type="button"
        onClick={onFlip}
        style={{ touchAction: 'manipulation' }}
        className="relative w-full max-w-4xl aspect-[5/3] rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-purple-800 shadow-2xl flex items-center justify-center text-white"
      >
        <motion.div
          key={flipped ? 'back' : 'front'}
          initial={{ opacity: 0, rotateY: -10 }}
          animate={{ opacity: 1, rotateY: 0 }}
          transition={{ duration: 0.25 }}
          className="text-center px-8"
        >
          {!flipped ? (
            <>
              <div className="text-7xl sm:text-9xl font-black tracking-tight">{word.english}</div>
              <div className="mt-6 text-xl sm:text-2xl opacity-80">{flipHint}</div>
            </>
          ) : (
            <div className="text-6xl sm:text-8xl font-black" dir="auto">{translation}</div>
          )}
        </motion.div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onPlayAudio(); }}
          className="absolute bottom-6 right-6 w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
          aria-label={playHint}
          title={playHint}
        >
          <Volume2 size={28} />
        </button>
      </button>
    </div>
  );
}

// ─── True / False ────────────────────────────────────────────────────

function TrueFalseLayout({
  question, revealed, labels, correctLabel, onPlayAudio, onReveal,
}: {
  question: TrueFalseQuestion;
  revealed: boolean;
  labels: { true: string; false: string };
  correctLabel: string;
  onPlayAudio: () => void;
  onReveal: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-10">
      <div className="text-center">
        <div className="text-6xl sm:text-8xl font-black tracking-tight" style={{ color: 'var(--vb-text-primary)' }}>
          {question.prompt}
        </div>
        <div className="mt-4 text-3xl sm:text-5xl" style={{ color: 'var(--vb-text-secondary)' }} dir="auto">
          = {question.shownTranslation}
        </div>
        <button
          type="button"
          onClick={onPlayAudio}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-secondary)' }}
        >
          <Volume2 size={20} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-8 w-full max-w-3xl">
        <RevealableCard
          label={labels.true}
          isCorrect={question.isTrue}
          revealed={revealed}
          tone="emerald"
          onReveal={onReveal}
        />
        <RevealableCard
          label={labels.false}
          isCorrect={!question.isTrue}
          revealed={revealed}
          tone="rose"
          onReveal={onReveal}
        />
      </div>
      {revealed && (
        <div className="text-2xl font-bold" style={{ color: 'var(--vb-text-secondary)' }}>
          {correctLabel} <span style={{ color: 'var(--vb-accent)' }}>{question.isTrue ? labels.true : labels.false}</span>
        </div>
      )}
    </div>
  );
}

function RevealableCard({ label, isCorrect, revealed, tone, onReveal }: {
  label: string;
  isCorrect: boolean;
  revealed: boolean;
  tone: 'emerald' | 'rose';
  onReveal: () => void;
}) {
  const baseGradient = tone === 'emerald' ? 'from-emerald-500 to-teal-600' : 'from-rose-500 to-pink-600';
  const dim = revealed && !isCorrect;
  const ring = revealed && isCorrect ? 'ring-4 ring-amber-300 scale-105' : '';
  return (
    <button
      type="button"
      onClick={onReveal}
      disabled={revealed}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      className={`bg-gradient-to-br ${baseGradient} text-white rounded-2xl py-12 sm:py-16 text-center font-black text-5xl sm:text-7xl shadow-xl transition-all ${ring} ${dim ? 'opacity-30' : ''} ${!revealed ? 'hover:scale-[1.02] active:scale-[0.98]' : ''}`}
    >
      {label}
    </button>
  );
}

// ─── Multi-choice (Classic / Listening / Reverse) ───────────────────

function MultiChoiceLayout({
  mode, question, revealed, letters, correctLabel, onPlayAudio, onReveal,
}: {
  mode: ClassShowMode;
  question: MultiChoiceQuestion;
  revealed: boolean;
  letters: string[];
  correctLabel: string;
  onPlayAudio: () => void;
  onReveal: () => void;
}) {
  const { language } = useLanguage();
  const tAria = gameAriasT[language];
  const isListening = mode === 'listening';
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
      {/* Prompt */}
      <div className="text-center max-w-5xl">
        {isListening ? (
          <button
            type="button"
            onClick={onPlayAudio}
            className="w-32 h-32 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-sky-500 to-cyan-600 text-white flex items-center justify-center shadow-2xl hover:scale-105 transition-transform"
            aria-label={tAria.playAudio}
          >
            <Volume2 size={64} />
          </button>
        ) : (
          <div className="flex items-center gap-4 justify-center">
            <span
              className="text-7xl sm:text-9xl font-black tracking-tight"
              style={{ color: 'var(--vb-text-primary)' }}
              dir="auto"
            >
              {question.prompt}
            </span>
            <button
              type="button"
              onClick={onPlayAudio}
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-secondary)' }}
              aria-label={tAria.playAudio}
            >
              <Volume2 size={28} />
            </button>
          </div>
        )}
      </div>

      {/* Options — each tile is a button that reveals on click */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full max-w-5xl">
        {question.options.map((opt, idx) => {
          const isCorrect = idx === question.correctIndex;
          const dim = revealed && !isCorrect;
          const highlight = revealed && isCorrect;
          return (
            <button
              key={`${opt}-${idx}`}
              type="button"
              onClick={onReveal}
              disabled={revealed}
              style={{
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                backgroundColor: highlight ? '#10b981' : 'var(--vb-surface)',
                color: highlight ? '#ffffff' : 'var(--vb-text-primary)',
                borderColor: highlight ? '#059669' : 'var(--vb-border)',
              }}
              className={`flex items-center gap-4 px-6 py-6 sm:py-8 rounded-2xl border-2 shadow-lg transition-all ${dim ? 'opacity-30' : ''} ${highlight ? 'scale-[1.03] ring-4 ring-emerald-200' : ''} ${!revealed ? 'hover:scale-[1.02] active:scale-[0.98]' : ''}`}
            >
              <span
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-black shrink-0"
                style={{
                  backgroundColor: highlight ? 'rgba(255,255,255,0.2)' : 'var(--vb-accent-soft)',
                  color: highlight ? '#ffffff' : 'var(--vb-accent)',
                }}
              >
                {letters[idx]}
              </span>
              <span className="text-3xl sm:text-5xl font-black" dir="auto">{opt}</span>
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="text-2xl font-bold" style={{ color: 'var(--vb-text-secondary)' }}>
          {correctLabel}{' '}
          <span style={{ color: 'var(--vb-accent)' }} dir="auto">
            {question.options[question.correctIndex]}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Fill in the blank — with generated-sentence fallback ────────────

function FillBlankLayout({
  word, pool, revealed, letters, correctLabel, onPlayAudio, onReveal, precomputed,
}: {
  word: Word;
  pool: Word[];
  revealed: boolean;
  letters: string[];
  correctLabel: string;
  onPlayAudio: () => void;
  onReveal: () => void;
  /** When buildFillBlankQuestion did produce a question (the word has
   *  an inline sentence), reuse it — keeps the distractors stable. */
  precomputed: MultiChoiceQuestion | null;
}) {
  // Synthesise a prompt + distractors when there's no precomputed
  // question.  Stable per word.id so re-renders for revealed=true don't
  // shuffle the distractors out from under the green highlight.
  const question = useMemo<MultiChoiceQuestion | null>(() => {
    if (precomputed) return precomputed;
    const candidateSentences = getSentencesForWord(word, 2);
    const withTarget = candidateSentences.find(s =>
      new RegExp(`\\b${escapeRegex(word.english)}\\b`, 'i').test(s),
    );
    const sentence = withTarget ?? candidateSentences[0] ?? `I see a ${word.english}.`;
    const re = new RegExp(`\\b${escapeRegex(word.english)}\\b`, 'i');
    const blanked = re.test(sentence) ? sentence.replace(re, '_____') : `${sentence} _____`;
    // 3 distractors from the pool.
    const others = pool
      .filter(w => w.id !== word.id)
      .map(w => w.english)
      .filter(e => e !== word.english);
    const seen = new Set<string>();
    const distractors: string[] = [];
    for (const e of others) {
      if (distractors.length >= 3) break;
      if (seen.has(e)) continue;
      seen.add(e);
      distractors.push(e);
    }
    const all = [word.english, ...distractors];
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return {
      word,
      prompt: blanked,
      options: all,
      correctIndex: all.indexOf(word.english),
    };
  }, [word, pool, precomputed]);

  if (!question) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
      <div className="text-center max-w-5xl">
        <p
          className="text-4xl sm:text-6xl font-bold leading-tight"
          style={{ color: 'var(--vb-text-primary)' }}
          dir="auto"
        >
          {question.prompt}
        </p>
        <button
          type="button"
          onClick={onPlayAudio}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-secondary)' }}
        >
          <Volume2 size={22} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full max-w-5xl">
        {question.options.map((opt, idx) => {
          const isCorrect = idx === question.correctIndex;
          const dim = revealed && !isCorrect;
          const highlight = revealed && isCorrect;
          return (
            <button
              key={`${opt}-${idx}`}
              type="button"
              onClick={onReveal}
              disabled={revealed}
              style={{
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                backgroundColor: highlight ? '#10b981' : 'var(--vb-surface)',
                color: highlight ? '#ffffff' : 'var(--vb-text-primary)',
                borderColor: highlight ? '#059669' : 'var(--vb-border)',
              }}
              className={`flex items-center gap-4 px-6 py-6 sm:py-8 rounded-2xl border-2 shadow-lg transition-all ${dim ? 'opacity-30' : ''} ${highlight ? 'scale-[1.03] ring-4 ring-emerald-200' : ''} ${!revealed ? 'hover:scale-[1.02] active:scale-[0.98]' : ''}`}
            >
              <span
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-black shrink-0"
                style={{
                  backgroundColor: highlight ? 'rgba(255,255,255,0.2)' : 'var(--vb-accent-soft)',
                  color: highlight ? '#ffffff' : 'var(--vb-accent)',
                }}
              >
                {letters[idx]}
              </span>
              <span className="text-3xl sm:text-5xl font-black" dir="auto">{opt}</span>
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="text-2xl font-bold" style={{ color: 'var(--vb-text-secondary)' }}>
          {correctLabel}{' '}
          <span style={{ color: 'var(--vb-accent)' }} dir="auto">
            {question.options[question.correctIndex]}
          </span>
        </div>
      )}
    </div>
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
