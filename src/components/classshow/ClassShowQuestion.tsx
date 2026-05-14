/**
 * ClassShowQuestion — the big projected question display.  Renders
 * mode-specific layouts (Classic / Listening / Reverse / Fill-Blank /
 * True-False / Flashcards) at sizes legible from the back of an 8m
 * classroom.  Driven entirely by the parent ClassShowView; no audio
 * autoplay, no auto-advance — the teacher decides the pace.
 */
import { motion } from 'motion/react';
import { Volume2 } from 'lucide-react';
import type { Word } from '../../data/vocabulary';
import type { MultiChoiceQuestion, TrueFalseQuestion } from '../../utils/buildQuestion';
import type { ClassShowMode } from './ClassShowSetup';
import { useLanguage } from '../../hooks/useLanguage';
import { classShowStrings } from '../../locales/student/class-show';
import { gameAriasT } from '../../locales/student/game-arias';
import { useAudio } from '../../hooks/useAudio';
import {
  SpellingProjector,
  ScrambleProjector,
  LetterSoundsProjector,
  MatchingProjector,
  MemoryFlipProjector,
  SentenceBuilderProjector,
  SpeedRoundProjector,
  IdiomProjector,
  WordChainsProjector,
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
  /** Batch modes (matching, memory-flip) need a slice of the pool. */
  batch: Word[];
  pool: Word[];
}

const LETTERS = ['A', 'B', 'C', 'D'];

export default function ClassShowQuestion(props: ClassShowQuestionProps) {
  const { language } = useLanguage();
  const t = classShowStrings[language];
  const tAria = gameAriasT[language];
  const audio = useAudio();
  const { mode, word, multiChoice, trueFalse, revealed, batch, pool } = props;

  const playAudio = () => audio.speak(word.id, word.english);

  // Pillar B — adapted projector modes ─────────────────────────────
  if (mode === 'spelling') return <SpellingProjector word={word} revealed={revealed} />;
  if (mode === 'scramble') return <ScrambleProjector word={word} revealed={revealed} />;
  if (mode === 'letter-sounds') return <LetterSoundsProjector word={word} pool={pool} revealed={revealed} />;
  if (mode === 'matching') return <MatchingProjector pool={pool} words={batch} revealed={revealed} />;
  if (mode === 'memory-flip') return <MemoryFlipProjector words={batch} revealed={revealed} />;
  if (mode === 'sentence-builder') return <SentenceBuilderProjector word={word} revealed={revealed} />;
  if (mode === 'speed-round') return <SpeedRoundProjector word={word} revealed={revealed} />;
  if (mode === 'idiom') return <IdiomProjector word={word} revealed={revealed} />;
  if (mode === 'word-chains') return <WordChainsProjector word={word} pool={pool} revealed={revealed} />;

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
      />
    );
  }

  if (!multiChoice) {
    return null;
  }

  // Multi-choice: classic / listening / reverse / fill-blank.
  return (
    <MultiChoiceLayout
      mode={mode}
      question={multiChoice}
      revealed={revealed}
      letters={LETTERS}
      correctLabel={t.correctAnswer}
      onPlayAudio={playAudio}
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
        className="relative w-full max-w-4xl aspect-[5/3] rounded-[40px] bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-2xl flex items-center justify-center text-white"
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
  question, revealed, labels, correctLabel, onPlayAudio,
}: {
  question: TrueFalseQuestion;
  revealed: boolean;
  labels: { true: string; false: string };
  correctLabel: string;
  onPlayAudio: () => void;
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
        />
        <RevealableCard
          label={labels.false}
          isCorrect={!question.isTrue}
          revealed={revealed}
          tone="rose"
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

function RevealableCard({ label, isCorrect, revealed, tone }: {
  label: string;
  isCorrect: boolean;
  revealed: boolean;
  tone: 'emerald' | 'rose';
}) {
  const baseGradient = tone === 'emerald' ? 'from-emerald-500 to-teal-600' : 'from-rose-500 to-pink-600';
  const dim = revealed && !isCorrect;
  const ring = revealed && isCorrect ? 'ring-4 ring-amber-300 scale-105' : '';
  return (
    <div
      className={`bg-gradient-to-br ${baseGradient} text-white rounded-3xl py-12 sm:py-16 text-center font-black text-5xl sm:text-7xl shadow-xl transition-all ${ring} ${dim ? 'opacity-30' : ''}`}
    >
      {label}
    </div>
  );
}

// ─── Multi-choice (Classic / Listening / Reverse / Fill-blank) ──────

function MultiChoiceLayout({
  mode, question, revealed, letters, correctLabel, onPlayAudio,
}: {
  mode: ClassShowMode;
  question: MultiChoiceQuestion;
  revealed: boolean;
  letters: string[];
  correctLabel: string;
  onPlayAudio: () => void;
}) {
  const { language } = useLanguage();
  const tAria = gameAriasT[language];
  const isListening = mode === 'listening';
  const isFillBlank = mode === 'fill-blank';
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
        ) : isFillBlank ? (
          <p
            className="text-4xl sm:text-6xl font-bold leading-tight"
            style={{ color: 'var(--vb-text-primary)' }}
            dir="auto"
          >
            {question.prompt}
          </p>
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

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full max-w-5xl">
        {question.options.map((opt, idx) => {
          const isCorrect = idx === question.correctIndex;
          const dim = revealed && !isCorrect;
          const highlight = revealed && isCorrect;
          return (
            <div
              key={`${opt}-${idx}`}
              style={{
                backgroundColor: highlight ? '#10b981' : 'var(--vb-surface)',
                color: highlight ? '#ffffff' : 'var(--vb-text-primary)',
                borderColor: highlight ? '#059669' : 'var(--vb-border)',
              }}
              className={`flex items-center gap-4 px-6 py-6 sm:py-8 rounded-3xl border-2 shadow-lg transition-all ${dim ? 'opacity-30' : ''} ${highlight ? 'scale-[1.03] ring-4 ring-emerald-200' : ''}`}
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
            </div>
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
