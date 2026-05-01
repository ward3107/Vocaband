/**
 * AdaptedModes — projector layouts for the 6 game modes that don't
 * fit the "everyone watches one screen" format directly.  The teacher
 * does the typing/dragging on behalf of the class while students call
 * out the answers verbally.
 *
 * All six modes are kept in one file because each one is small (50-90
 * lines) and they share the same shape (a Word + revealed flag, plus
 * mode-specific local state).  Splitting per-file would dilute the
 * codebase without adding clarity.
 *
 *   - SpellingProjector       — teacher types each letter
 *   - ScrambleProjector       — call-and-response with reveal animation
 *   - LetterSoundsProjector   — audio-led, matches a phoneme to one of 4 words
 *   - MatchingProjector       — teacher-led tap-pair (4 pairs)
 *   - MemoryFlipProjector     — collaborative grid flip
 *   - SentenceBuilderProjector— teacher-led drag-tile assembly
 */
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, RotateCcw, Check, X } from 'lucide-react';
import type { Word } from '../../data/vocabulary';
import { useAudio } from '../../hooks/useAudio';
import { useLanguage } from '../../hooks/useLanguage';
import { classShowStrings } from '../../locales/student/class-show';

interface BaseProps {
  word: Word;
  revealed: boolean;
  /** Pool used to fetch distractors for matching / multi-choice modes. */
  pool: Word[];
}

// ─── Spelling — teacher types one letter at a time ─────────────────

export function SpellingProjector({ word, revealed }: Omit<BaseProps, 'pool'>) {
  const { language } = useLanguage();
  const t = classShowStrings[language];
  const audio = useAudio();
  const [typed, setTyped] = useState('');
  const target = word.english.toLowerCase();
  const translation = language === 'he' ? word.hebrew : language === 'ar' ? word.arabic : word.hebrew;

  // Reset typed buffer when the word changes.
  useEffect(() => { setTyped(''); }, [word.id]);

  // Capture letters from the keyboard so the teacher just types — no
  // need to focus an input box on the projector.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Backspace') { setTyped(prev => prev.slice(0, -1)); return; }
      if (e.key === 'Enter') return;
      if (/^[a-zA-Z]$/.test(e.key)) {
        setTyped(prev => prev + e.key.toLowerCase());
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [word.id]);

  // When revealed, fill in the rest.
  const display = revealed ? word.english : typed;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
      <div className="text-center">
        <div className="text-3xl sm:text-5xl font-bold mb-2" style={{ color: 'var(--vb-text-secondary)' }} dir="auto">
          {translation}
        </div>
        <button
          type="button"
          onClick={() => audio.speak(word.id, word.english)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-secondary)' }}
        >
          <Volume2 size={20} />
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-2 sm:gap-4 max-w-5xl">
        {target.split('').map((targetChar, idx) => {
          const typedChar = display[idx];
          const filled = !!typedChar;
          const correct = revealed || (typedChar && typedChar === targetChar);
          return (
            <div
              key={idx}
              className="w-14 h-20 sm:w-20 sm:h-28 rounded-2xl border-4 flex items-center justify-center text-4xl sm:text-6xl font-black uppercase shadow-lg"
              style={{
                backgroundColor: filled ? (correct ? '#10b981' : '#fff') : 'var(--vb-surface)',
                borderColor: filled ? (correct ? '#059669' : '#dc2626') : 'var(--vb-border)',
                color: filled && correct ? '#ffffff' : 'var(--vb-text-primary)',
              }}
            >
              {typedChar ?? ''}
            </div>
          );
        })}
      </div>
      <div className="text-base font-bold" style={{ color: 'var(--vb-text-muted)' }}>
        {t.spellingHint}
      </div>
    </div>
  );
}

// ─── Scramble — letters shown big, reveal animates them into order ─

function scrambleLetters(input: string): string[] {
  const letters = input.split('');
  if (letters.length <= 1) return letters;
  for (let attempt = 0; attempt < 20; attempt++) {
    const shuffled = [...letters];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    if (shuffled.join('') !== input) return shuffled;
  }
  return letters;
}

export function ScrambleProjector({ word, revealed }: Omit<BaseProps, 'pool'>) {
  const { language } = useLanguage();
  const t = classShowStrings[language];
  const scrambled = useMemo(() => scrambleLetters(word.english), [word.id]);
  const display = revealed ? word.english.split('') : scrambled;
  const translation = language === 'he' ? word.hebrew : language === 'ar' ? word.arabic : word.hebrew;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
      <div className="text-center text-2xl sm:text-4xl font-bold" style={{ color: 'var(--vb-text-secondary)' }} dir="auto">
        {translation}
      </div>
      <div className="flex flex-wrap justify-center gap-3 sm:gap-5">
        {display.map((letter, idx) => (
          <motion.div
            key={`${idx}-${letter}-${revealed ? 'r' : 's'}`}
            initial={{ rotate: -10, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: idx * 0.04 }}
            className="w-16 h-24 sm:w-24 sm:h-32 rounded-2xl flex items-center justify-center text-5xl sm:text-7xl font-black uppercase shadow-xl bg-gradient-to-br from-orange-500 to-red-600 text-white"
          >
            {letter}
          </motion.div>
        ))}
      </div>
      <div className="text-base font-bold" style={{ color: 'var(--vb-text-muted)' }}>
        {t.scrambleHint}
      </div>
    </div>
  );
}

// ─── Letter Sounds — phoneme prompt + 4 word options ──────────────

export function LetterSoundsProjector({ word, pool, revealed }: BaseProps) {
  const { language } = useLanguage();
  const t = classShowStrings[language];
  const audio = useAudio();

  // 4 options: target word + 3 distractors that start with different
  // letters.  We pick from the pool then shuffle.
  const options = useMemo(() => {
    const targetFirst = word.english[0]?.toLowerCase() ?? '';
    const others = pool
      .filter(w => w.id !== word.id)
      .filter(w => (w.english[0]?.toLowerCase() ?? '') !== targetFirst)
      .map(w => w.english);
    const distractors: string[] = [];
    const seen = new Set<string>();
    for (const e of others) {
      if (distractors.length >= 3) break;
      const k = e[0]?.toLowerCase() ?? '';
      if (seen.has(k)) continue;
      seen.add(k);
      distractors.push(e);
    }
    while (distractors.length < 3) {
      const fallback = pool.find(w => w.id !== word.id && !distractors.includes(w.english));
      if (!fallback) break;
      distractors.push(fallback.english);
    }
    const all = [word.english, ...distractors];
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all;
  }, [word.id, pool]);

  const correctIdx = options.findIndex(o => o === word.english);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
      <button
        type="button"
        onClick={() => audio.speak(word.id, word.english)}
        className="w-32 h-32 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-2xl hover:scale-105 transition-transform"
        aria-label="Play sound"
      >
        <Volume2 size={64} />
      </button>
      <div className="text-base font-bold" style={{ color: 'var(--vb-text-muted)' }}>
        {t.letterSoundsHint}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full max-w-5xl">
        {options.map((opt, idx) => {
          const isCorrect = idx === correctIdx;
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
              className={`flex items-center justify-center px-6 py-8 rounded-3xl border-2 shadow-lg transition-all text-3xl sm:text-5xl font-black ${dim ? 'opacity-30' : ''} ${highlight ? 'scale-[1.03]' : ''}`}
            >
              {opt}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Matching — 4 English on left, 4 shuffled translations on right ──

export interface MatchingProjectorState {
  /** Selected English-side card index (-1 = none). */
  selectedLeft: number;
  /** Pair indexes that have been matched by the teacher. */
  matched: Set<number>;
}

export function MatchingProjector({
  pool, words, revealed, onAllMatched,
}: {
  pool: Word[];
  words: Word[]; // exactly 4 words (caller slices)
  revealed: boolean;
  onAllMatched?: () => void;
}) {
  void pool; // unused — kept for symmetry with other modes
  const { language } = useLanguage();
  const t = classShowStrings[language];

  const translation = (w: Word) => language === 'he' ? w.hebrew : language === 'ar' ? w.arabic : w.hebrew;

  const rightOrder = useMemo(() => {
    const indices = words.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [words]);

  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());

  // Reveal: snap all pairs into matched state.
  const effectiveMatched = revealed ? new Set(words.map((_, i) => i)) : matched;

  useEffect(() => {
    if (matched.size === words.length && onAllMatched) onAllMatched();
  }, [matched, words.length, onAllMatched]);

  const handleRightTap = (rightIdx: number) => {
    if (selectedLeft === null) return;
    const pairWordIdx = rightOrder[rightIdx];
    if (pairWordIdx === selectedLeft) {
      setMatched(prev => {
        const next = new Set(prev);
        next.add(selectedLeft);
        return next;
      });
    }
    setSelectedLeft(null);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
      <div className="text-base font-bold" style={{ color: 'var(--vb-text-muted)' }}>
        {t.matchingHint}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:gap-8 w-full max-w-5xl">
        <div className="flex flex-col gap-3">
          {words.map((w, idx) => {
            const done = effectiveMatched.has(idx);
            const sel = selectedLeft === idx;
            return (
              <button
                key={`l-${w.id}`}
                type="button"
                onClick={() => !done && setSelectedLeft(sel ? null : idx)}
                disabled={done}
                style={{
                  backgroundColor: done ? '#10b981' : sel ? 'var(--vb-accent-soft)' : 'var(--vb-surface)',
                  color: done ? '#ffffff' : 'var(--vb-text-primary)',
                  borderColor: done ? '#059669' : sel ? 'var(--vb-accent)' : 'var(--vb-border)',
                }}
                className={`px-6 py-5 rounded-2xl border-2 text-2xl sm:text-4xl font-black text-left shadow-md transition-all ${done ? 'opacity-80' : 'hover:scale-[1.01]'}`}
              >
                {w.english}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-3">
          {rightOrder.map((wordIdx, rightIdx) => {
            const done = effectiveMatched.has(wordIdx);
            return (
              <button
                key={`r-${wordIdx}`}
                type="button"
                onClick={() => !done && handleRightTap(rightIdx)}
                disabled={done}
                style={{
                  backgroundColor: done ? '#10b981' : 'var(--vb-surface)',
                  color: done ? '#ffffff' : 'var(--vb-text-primary)',
                  borderColor: done ? '#059669' : 'var(--vb-border)',
                }}
                className={`px-6 py-5 rounded-2xl border-2 text-2xl sm:text-4xl font-black text-right shadow-md transition-all ${done ? 'opacity-80' : 'hover:scale-[1.01]'}`}
                dir="auto"
              >
                {translation(words[wordIdx])}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Memory Flip — 4×3 grid, find pairs ─────────────────────────────

export function MemoryFlipProjector({ words, revealed }: { words: Word[]; revealed: boolean }) {
  const { language } = useLanguage();
  const t = classShowStrings[language];

  const translation = (w: Word) => language === 'he' ? w.hebrew : language === 'ar' ? w.arabic : w.hebrew;

  // 6 words → 12 cards (each word appears once on the English side and
  // once on the translation side).
  const cards = useMemo(() => {
    const six = words.slice(0, 6);
    const list: Array<{ id: string; pairId: number; text: string; side: 'en' | 'tr' }> = [];
    six.forEach((w, idx) => {
      list.push({ id: `en-${w.id}`, pairId: idx, text: w.english, side: 'en' });
      list.push({ id: `tr-${w.id}`, pairId: idx, text: translation(w), side: 'tr' });
    });
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }, [words.map(w => w.id).join(',')]);

  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);

  const tap = (idx: number) => {
    if (matched.has(cards[idx].pairId)) return;
    if (flipped.includes(idx)) return;
    if (flipped.length >= 2) return;
    const next = [...flipped, idx];
    setFlipped(next);
    if (next.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = next.map(i => cards[i]);
      if (a.pairId === b.pairId && a.side !== b.side) {
        setTimeout(() => {
          setMatched(prev => {
            const n = new Set(prev);
            n.add(a.pairId);
            return n;
          });
          setFlipped([]);
        }, 700);
      } else {
        setTimeout(() => setFlipped([]), 1500);
      }
    }
  };

  const reset = () => { setFlipped([]); setMatched(new Set()); setMoves(0); };

  // Reveal flips every card.
  const showCardFront = (idx: number) => revealed || flipped.includes(idx) || matched.has(cards[idx].pairId);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
      <div className="flex items-center gap-4">
        <div className="text-base font-bold" style={{ color: 'var(--vb-text-muted)' }}>
          {t.memoryFlipHint}
        </div>
        <div className="text-sm" style={{ color: 'var(--vb-text-muted)' }}>
          · {moves} moves · {matched.size}/6 pairs
        </div>
        <button
          type="button"
          onClick={reset}
          style={{ backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-secondary)' }}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
        >
          <RotateCcw size={14} /> {t.reset}
        </button>
      </div>
      <div className="grid grid-cols-4 gap-3 sm:gap-5 w-full max-w-5xl">
        {cards.map((card, idx) => {
          const isFront = showCardFront(idx);
          const isMatched = matched.has(card.pairId);
          return (
            <button
              key={card.id + '-' + idx}
              type="button"
              onClick={() => tap(idx)}
              style={{
                backgroundColor: isFront ? (isMatched ? '#10b981' : 'var(--vb-surface)') : '#7c3aed',
                color: isFront ? (isMatched ? '#ffffff' : 'var(--vb-text-primary)') : '#ffffff',
                borderColor: isFront ? (isMatched ? '#059669' : 'var(--vb-border)') : '#5b21b6',
              }}
              className="aspect-[3/2] rounded-2xl border-2 flex items-center justify-center text-xl sm:text-3xl font-black shadow-lg transition-all p-2"
              dir="auto"
            >
              {isFront ? card.text : '?'}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sentence Builder — scrambled tiles, teacher taps in order ───

export function SentenceBuilderProjector({ word, revealed }: Omit<BaseProps, 'pool'>) {
  const { language } = useLanguage();
  const t = classShowStrings[language];

  const sentence = word.sentence ?? word.example ?? `I see a ${word.english}.`;
  const tokens = useMemo(() => sentence.split(/\s+/).filter(Boolean), [sentence]);
  const scrambled = useMemo(() => {
    const arr = tokens.map((tok, idx) => ({ tok, originalIdx: idx, key: idx + Math.random().toString(36).slice(2, 6) }));
    if (arr.length <= 1) return arr;
    for (let attempt = 0; attempt < 20; attempt++) {
      const s = [...arr];
      for (let i = s.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [s[i], s[j]] = [s[j], s[i]];
      }
      if (s.some((t, i) => t.originalIdx !== i)) return s;
    }
    return arr;
  }, [tokens]);

  // Order in which tiles have been tapped.  When revealed=true, all
  // tokens snap to their correct slot.
  const [order, setOrder] = useState<number[]>([]);

  useEffect(() => { setOrder([]); }, [word.id]);

  const tap = (scrambledIdx: number) => {
    if (order.includes(scrambledIdx)) return;
    setOrder(prev => [...prev, scrambledIdx]);
  };

  const placedSlots: Array<{ tok: string; correct: boolean } | null> =
    revealed
      ? tokens.map(tok => ({ tok, correct: true }))
      : tokens.map((_, slotIdx) => {
          const sIdx = order[slotIdx];
          if (sIdx === undefined) return null;
          const placed = scrambled[sIdx];
          return { tok: placed.tok, correct: placed.originalIdx === slotIdx };
        });

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
      <div className="text-base font-bold" style={{ color: 'var(--vb-text-muted)' }}>
        {t.sentenceBuilderHint}
      </div>

      {/* Target slots */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-5xl">
        {placedSlots.map((slot, idx) => (
          <div
            key={`slot-${idx}`}
            className="min-w-[80px] px-4 py-3 rounded-xl border-2 text-2xl sm:text-3xl font-bold flex items-center justify-center"
            style={{
              backgroundColor: slot ? (slot.correct ? '#10b981' : '#fff') : 'var(--vb-surface-alt)',
              borderColor: slot ? (slot.correct ? '#059669' : '#dc2626') : 'var(--vb-border)',
              color: slot ? (slot.correct ? '#ffffff' : '#dc2626') : 'var(--vb-text-muted)',
              minHeight: 60,
            }}
          >
            {slot ? slot.tok : '·'}
          </div>
        ))}
      </div>

      {/* Scrambled source tiles */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-5xl">
        <AnimatePresence>
          {scrambled.map((s, idx) => {
            const used = order.includes(idx) || revealed;
            return (
              <motion.button
                key={s.key}
                type="button"
                layout
                onClick={() => tap(idx)}
                disabled={used}
                initial={{ opacity: 1 }}
                animate={{ opacity: used ? 0.25 : 1, scale: used ? 0.95 : 1 }}
                style={{
                  backgroundColor: 'var(--vb-surface)',
                  color: 'var(--vb-text-primary)',
                  borderColor: 'var(--vb-border)',
                }}
                className="px-4 py-3 rounded-xl border-2 text-2xl sm:text-3xl font-bold shadow-md hover:scale-[1.02] transition-transform"
              >
                {s.tok}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {revealed && (
        <div className="flex items-center gap-2 text-2xl font-bold" style={{ color: 'var(--vb-accent)' }}>
          <Check size={24} /> {sentence}
        </div>
      )}
      {!revealed && order.length === tokens.length && (
        <div className="text-lg font-bold" style={{ color: 'var(--vb-text-muted)' }}>
          <X size={18} className="inline mr-1" /> Tap reveal to compare
        </div>
      )}
    </div>
  );
}
