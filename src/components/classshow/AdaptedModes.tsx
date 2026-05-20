/**
 * AdaptedModes — projector layouts for the game modes that don't fit
 * the "everyone watches one screen" format directly.  The teacher does
 * the typing/tapping on behalf of the class while students call out
 * the answers verbally.
 *
 * Click-to-reveal: every adapted mode now lets the teacher tap an
 * answer (or any visible target letter / sentence tile) to reveal the
 * solution, matching the click-driven flow students get in the regular
 * game.  Modes without a clickable answer (Spelling, Sentence Builder)
 * still expose a tappable reveal surface.
 *
 *   - SpellingProjector       — teacher types each letter, larger boxes
 *   - ScrambleProjector       — large tiles, uppercase/lowercase toggle
 *   - LetterSoundsProjector   — slow audio, click an option to reveal
 *   - MatchingProjector       — card-grid redesign, click to match/reveal
 *   - MemoryFlipProjector     — collaborative grid flip
 *   - SentenceBuilderProjector— generated sentences from sentence-bank
 *   - SpeedRoundProjector     — bigger word + auto-reveal at countdown
 */
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, RotateCcw, Check, X, Type, CaseLower } from 'lucide-react';
import type { Word } from '../../data/vocabulary';
import { useAudio } from '../../hooks/useAudio';
import { useLanguage } from '../../hooks/useLanguage';
import { classShowStrings } from '../../locales/student/class-show';
import { gameAriasT } from '../../locales/student/game-arias';
import { getSentencesForWord } from '../../data/sentence-bank';

interface BaseProps {
  word: Word;
  revealed: boolean;
  /** Pool used to fetch distractors for matching / multi-choice modes. */
  pool: Word[];
  /** Called when the teacher reveals the answer by tapping the surface. */
  onReveal?: () => void;
}

// ─── Spelling — teacher types one letter at a time ─────────────────

export function SpellingProjector({ word, revealed, onReveal }: Omit<BaseProps, 'pool'>) {
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
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-10">
      <div className="text-center">
        <div className="text-5xl sm:text-7xl font-bold mb-3" style={{ color: 'var(--vb-text-secondary)' }} dir="auto">
          {translation}
        </div>
        <button
          type="button"
          onClick={() => audio.speak(word.id, word.english)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-secondary)' }}
        >
          <Volume2 size={22} />
        </button>
      </div>
      <button
        type="button"
        onClick={onReveal}
        disabled={revealed}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        className="flex flex-wrap justify-center gap-3 sm:gap-5 max-w-6xl"
      >
        {target.split('').map((targetChar, idx) => {
          const typedChar = display[idx];
          const filled = !!typedChar;
          const correct = revealed || (typedChar && typedChar === targetChar);
          return (
            <div
              key={idx}
              className="w-20 h-28 sm:w-28 sm:h-40 rounded-2xl border-4 flex items-center justify-center text-6xl sm:text-8xl font-black uppercase shadow-xl"
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
      </button>
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

export function ScrambleProjector({ word, revealed, onReveal }: Omit<BaseProps, 'pool'>) {
  const { language } = useLanguage();
  const t = classShowStrings[language];
  const scrambled = useMemo(() => scrambleLetters(word.english), [word.id]);
  // Teachers asked for a way to project the lowercase forms — younger
  // learners haven't fully internalised the uppercase ↔ lowercase
  // mapping yet, so the toggle lets the same word serve both groups.
  const [isUppercase, setIsUppercase] = useState(true);
  const renderedLetters = (revealed ? word.english.split('') : scrambled).map(l =>
    isUppercase ? l.toUpperCase() : l.toLowerCase(),
  );
  const translation = language === 'he' ? word.hebrew : language === 'ar' ? word.arabic : word.hebrew;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-10 py-8">
      <div className="text-center text-5xl sm:text-7xl font-bold" style={{ color: 'var(--vb-text-secondary)' }} dir="auto">
        {translation}
      </div>
      <button
        type="button"
        onClick={onReveal}
        disabled={revealed}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        className="flex flex-wrap justify-center gap-4 sm:gap-6 max-w-6xl"
      >
        {renderedLetters.map((letter, idx) => (
          <motion.div
            key={`${idx}-${letter}-${revealed ? 'r' : 's'}-${isUppercase ? 'u' : 'l'}`}
            initial={{ rotate: -10, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: idx * 0.04 }}
            className="w-24 h-32 sm:w-32 sm:h-44 rounded-2xl flex items-center justify-center text-7xl sm:text-9xl font-black shadow-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white"
          >
            {letter}
          </motion.div>
        ))}
      </button>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsUppercase(v => !v)}
          style={{
            backgroundColor: 'var(--vb-surface)',
            color: 'var(--vb-text-primary)',
            borderColor: 'var(--vb-border)',
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 font-bold text-sm sm:text-base"
        >
          {isUppercase ? <CaseLower size={18} /> : <Type size={18} />}
          {isUppercase ? t.lowercase : t.uppercase}
        </button>
        <div className="text-base font-bold" style={{ color: 'var(--vb-text-muted)' }}>
          {t.scrambleHint}
        </div>
      </div>
    </div>
  );
}

// ─── Letter Sounds — phoneme prompt + 4 word options ──────────────

export function LetterSoundsProjector({ word, pool, revealed, onReveal }: BaseProps) {
  const { language } = useLanguage();
  const t = classShowStrings[language];
  const tAria = gameAriasT[language];
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
        onClick={() => audio.speakSlow(word.id, word.english)}
        className="w-32 h-32 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-2xl hover:scale-105 transition-transform"
        aria-label={tAria.playSound}
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
              className={`flex items-center justify-center px-6 py-8 rounded-2xl border-2 shadow-lg transition-all text-3xl sm:text-5xl font-black ${dim ? 'opacity-30' : ''} ${highlight ? 'scale-[1.03]' : ''} ${!revealed ? 'hover:scale-[1.02]' : ''}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Matching — fresh card-grid design ────────────────────────────────
//
// New design (replaces the old two-column English-on-left / translation-
// on-right grid): every card sits in a single 2×4 grid mixing English
// and translations.  The teacher taps two cards in a row; matching pairs
// flash green, mismatches reset.  Tapping on the surface when not in
// active matching reveals all pairs at once (drives the "reveal" flow).

export function MatchingProjector({
  pool, words, revealed, onReveal,
}: {
  pool: Word[];
  words: Word[]; // exactly 4 words (caller slices)
  revealed: boolean;
  onReveal?: () => void;
}) {
  void pool;
  const { language } = useLanguage();
  const t = classShowStrings[language];

  const translation = (w: Word) => language === 'he' ? w.hebrew : language === 'ar' ? w.arabic : w.hebrew;

  // Build a shuffled list of 8 cards (4 English + 4 translations).  Each
  // card carries the pairId (index into `words`) and a `side` tag so the
  // match check can ensure we pair English↔Translation, not two of the
  // same kind.
  const cards = useMemo(() => {
    const list: Array<{ key: string; pairId: number; text: string; side: 'en' | 'tr' }> = [];
    words.forEach((w, idx) => {
      list.push({ key: `en-${w.id}`, pairId: idx, text: w.english, side: 'en' });
      list.push({ key: `tr-${w.id}`, pairId: idx, text: translation(w), side: 'tr' });
    });
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words.map(w => w.id).join(','), language]);

  const [selected, setSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<[number, number] | null>(null);

  // Snap-to-all-matched on reveal.
  const effectiveMatched = revealed ? new Set(cards.map(c => c.pairId)) : matched;

  const handleTap = (idx: number) => {
    const card = cards[idx];
    if (effectiveMatched.has(card.pairId)) return;
    if (selected === null) {
      setSelected(idx);
      return;
    }
    if (selected === idx) {
      setSelected(null);
      return;
    }
    const first = cards[selected];
    if (first.pairId === card.pairId && first.side !== card.side) {
      setMatched(prev => new Set(prev).add(card.pairId));
      setSelected(null);
    } else {
      // Visual mismatch — flash both cards red, then reset.
      setWrong([selected, idx]);
      setSelected(null);
      window.setTimeout(() => setWrong(null), 600);
    }
  };

  // Hidden tap-anywhere reveal fallback so teachers without all matches
  // can still reveal everything at once.
  const handleSurfaceTap = () => {
    if (!revealed && effectiveMatched.size === 0 && onReveal) onReveal();
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 py-8" onClick={handleSurfaceTap}>
      <div className="text-base font-bold" style={{ color: 'var(--vb-text-muted)' }}>
        {t.matchingHint}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5 w-full max-w-6xl">
        {cards.map((card, idx) => {
          const done = effectiveMatched.has(card.pairId);
          const sel = selected === idx;
          const isWrong = wrong && (wrong[0] === idx || wrong[1] === idx);
          // English cards get the amber tint (matches the student
          // MatchingModeGame's palette); translations get orange.
          const baseGradient = card.side === 'en'
            ? 'from-amber-50 to-amber-100 border-amber-200 text-amber-900'
            : 'from-orange-50 to-rose-50 border-rose-200 text-rose-900';
          return (
            <button
              key={card.key}
              type="button"
              onClick={(e) => { e.stopPropagation(); handleTap(idx); }}
              disabled={done}
              dir="auto"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              className={`relative aspect-[4/3] rounded-2xl border-2 px-3 py-3 flex items-center justify-center text-center font-black shadow-lg transition-all text-2xl sm:text-4xl ${
                done
                  ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white border-emerald-500 scale-[1.02]'
                  : sel
                    ? 'bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white border-fuchsia-600 scale-[1.05] ring-4 ring-fuchsia-200'
                    : isWrong
                      ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white border-rose-600'
                      : `bg-gradient-to-br ${baseGradient}`
              } ${!done ? 'hover:scale-[1.02]' : ''}`}
            >
              {card.text}
            </button>
          );
        })}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              className="aspect-[3/2] rounded-xl border-2 flex items-center justify-center text-xl sm:text-3xl font-black shadow-lg transition-all p-2"
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

// ─── Sentence Builder — generated sentence + tappable tiles ───────────
//
// Pulls from the sentence-bank so every word — including the ~6400
// vocabulary entries that lack a hand-written sentence — gets a
// well-formed prompt instead of falling back to the bland
// "I see a <word>." synthesised in the old build.

export function SentenceBuilderProjector({ word, revealed, onReveal }: Omit<BaseProps, 'pool'>) {
  const { language } = useLanguage();
  const t = classShowStrings[language];

  // Pick a stable sentence per word from the level-2 bank so repeated
  // visits to the same word show the same prompt for the duration of
  // the show.
  const sentence = useMemo(() => {
    const choices = getSentencesForWord(word, 2);
    if (choices.length === 0) return `I see a ${word.english}.`;
    // Prefer a sentence that actually contains the target word so the
    // class hears the connection while the teacher assembles tiles.
    const containsTarget = choices.find(s => new RegExp(`\\b${word.english}\\b`, 'i').test(s));
    return containsTarget ?? choices[0];
  }, [word.id, word.english]);

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
    if (revealed) return;
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

      {/* Target slots — click the row to reveal at once */}
      <button
        type="button"
        onClick={onReveal}
        disabled={revealed}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-5xl"
      >
        {placedSlots.map((slot, idx) => (
          <div
            key={`slot-${idx}`}
            className="min-w-[80px] px-4 py-3 rounded-lg border-2 text-2xl sm:text-3xl font-bold flex items-center justify-center"
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
      </button>

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
                className="px-4 py-3 rounded-lg border-2 text-2xl sm:text-3xl font-bold shadow-md hover:scale-[1.02] transition-transform"
              >
                {s.tok}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {revealed && (
        <div className="flex items-center gap-2 text-2xl sm:text-3xl font-bold" style={{ color: 'var(--vb-accent)' }}>
          <Check size={24} /> {sentence}
        </div>
      )}
      {!revealed && order.length === tokens.length && (
        <div className="text-lg font-bold" style={{ color: 'var(--vb-text-muted)' }}>
          <X size={18} className="inline mr-1" /> {t.tapToReveal}
        </div>
      )}
    </div>
  );
}

// ─── Speed Round — huge word + 3-second countdown ─────────────────

const SPEED_ROUND_DURATION_MS = 3000;

export function SpeedRoundProjector({ word, revealed, onReveal }: Omit<BaseProps, 'pool'>) {
  const { language } = useLanguage();
  const tAria = gameAriasT[language];
  const audio = useAudio();
  const translation = language === 'he' ? word.hebrew : language === 'ar' ? word.arabic : word.hebrew;

  // Track elapsed time for the progress bar.  Resets when the word
  // changes or once `revealed` is set (driver advances on its own).
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
    if (revealed) return;
    const start = Date.now();
    const id = setInterval(() => {
      const e = Date.now() - start;
      setElapsed(e);
      // Auto-reveal once the countdown completes so the teacher
      // doesn't have to chase the Reveal button between every word.
      // The parent's revealed-state flip stops the interval via the
      // dependency array above.
      if (e >= SPEED_ROUND_DURATION_MS) {
        clearInterval(id);
        onReveal?.();
      }
    }, 50);
    return () => clearInterval(id);
  }, [word.id, revealed, onReveal]);

  const pct = Math.min(100, (elapsed / SPEED_ROUND_DURATION_MS) * 100);
  const remaining = Math.max(0, Math.ceil((SPEED_ROUND_DURATION_MS - elapsed) / 1000));

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8 w-full">
      <button
        type="button"
        onClick={() => audio.speak(word.id, word.english)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
        style={{ backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-secondary)' }}
        aria-label={tAria.playAudio}
      >
        <Volume2 size={20} />
      </button>
      <motion.div
        key={word.id}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        className="text-7xl sm:text-9xl md:text-[10rem] font-black tracking-tight text-center"
        style={{ color: 'var(--vb-text-primary)' }}
      >
        {word.english}
      </motion.div>
      {revealed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl sm:text-8xl md:text-9xl font-black"
          style={{ color: 'var(--vb-accent)' }}
          dir="auto"
        >
          {translation}
        </motion.div>
      )}
      {!revealed && (
        <div className="text-8xl sm:text-9xl font-black tabular-nums" style={{ color: 'var(--vb-text-muted)' }}>
          {remaining}
        </div>
      )}
      <div className="w-full max-w-3xl h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--vb-surface-alt)' }}>
        <motion.div
          className="h-full bg-gradient-to-r from-red-400 to-rose-500"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.05, ease: 'linear' }}
        />
      </div>
    </div>
  );
}
