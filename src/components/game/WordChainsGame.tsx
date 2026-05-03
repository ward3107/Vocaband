/**
 * WordChainsGame — type a word that starts with the LAST letter of
 * the previous word.  Self-contained game mode with its own state
 * machine; bypasses the per-question orchestration GameActiveView
 * uses for Classic / Listening / etc. because Word Chains is a
 * free-text game where any valid pool word counts.
 *
 * Mechanics:
 *   1. Start with a random word from the pool — last letter highlighted
 *   2. Student types a word.  Validate:
 *        - exists in the assignment word pool (case-insensitive)
 *        - starts with the previous word's last letter
 *        - not used yet this session
 *   3. Accept → speak the new word, become the new "current," score++
 *   4. Reject → flash error, keep the current word, no penalty
 *   5. Skip → suggest a valid pool word as a hint, score doesn't go up
 *   6. End → call onFinish with the chain length as final score
 *
 * No timer in v1 — keeps the mode chill.  Add an optional 60s mode
 * later if teachers / students ask for it.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Send, SkipForward, X } from "lucide-react";
import type { Word } from "../../data/vocabulary";
import { useLanguage } from "../../hooks/useLanguage";
import { type GameThemeColor, getThemeColors } from "./GameShell";

interface WordChainsGameProps {
  gameWords: Word[];
  themeColor: GameThemeColor;
  /** Speak a word (existing useAudio hook injected). */
  speak: (wordId: number, fallbackText?: string) => void;
  /** Called when the student ends the round.  Score = chain length. */
  onFinish: (score: number) => void;
}

interface ChainStep {
  word: Word;
  /** True for the seed word that started the chain (didn't earn a point). */
  isSeed: boolean;
}

/** Random pick helper. */
function randomPick<T>(pool: readonly T[]): T | null {
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function WordChainsGame({
  gameWords,
  themeColor,
  speak,
  onFinish,
}: WordChainsGameProps) {
  const { language, dir } = useLanguage();
  const theme = getThemeColors(themeColor);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build a fast lookup: lowercase english → Word (for validation).
  const lookup = useMemo(() => {
    const m = new Map<string, Word>();
    for (const w of gameWords) m.set(w.english.toLowerCase(), w);
    return m;
  }, [gameWords]);

  // Seed the chain with a random word from the pool.
  const [chain, setChain] = useState<ChainStep[]>(() => {
    const seed = randomPick(gameWords);
    return seed ? [{ word: seed, isSeed: true }] : [];
  });
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"none" | "wrong" | "correct">("none");
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");

  const currentWord = chain.length > 0 ? chain[chain.length - 1].word : null;
  const usedIds = useMemo(() => new Set(chain.map(s => s.word.id)), [chain]);
  const lastLetter = currentWord ? currentWord.english.slice(-1).toLowerCase() : "";
  // Score = chain length minus the seed word.
  const score = Math.max(0, chain.length - 1);

  // Auto-focus the input on mount + after every accepted word.
  useEffect(() => {
    inputRef.current?.focus();
  }, [chain.length]);

  // Speak the current word when it changes (gives an audio cue for
  // the next-letter prompt).  Skip on the seed word so the student
  // doesn't get bombarded the moment the round opens.
  useEffect(() => {
    if (!currentWord || chain.length <= 1) return;
    speak(currentWord.id, currentWord.english);
  }, [currentWord, chain.length, speak]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const guess = input.trim().toLowerCase();
    if (!guess) return;

    // Validation 1: must start with the required letter.
    if (lastLetter && !guess.startsWith(lastLetter)) {
      setFeedback("wrong");
      setFeedbackMessage(
        language === "he"
          ? `המילה צריכה להתחיל ב-"${lastLetter.toUpperCase()}"`
          : language === "ar"
          ? `يجب أن تبدأ الكلمة بـ "${lastLetter.toUpperCase()}"`
          : `Word must start with "${lastLetter.toUpperCase()}"`,
      );
      flashFeedback();
      return;
    }

    // Validation 2: must exist in the pool.
    const matched = lookup.get(guess);
    if (!matched) {
      setFeedback("wrong");
      setFeedbackMessage(
        language === "he"
          ? "המילה לא נמצאת ברשימה — נסה אחרת"
          : language === "ar"
          ? "الكلمة ليست في القائمة — جرّب أخرى"
          : "Not in your word list — try another",
      );
      flashFeedback();
      return;
    }

    // Validation 3: not used yet this round.
    if (usedIds.has(matched.id)) {
      setFeedback("wrong");
      setFeedbackMessage(
        language === "he"
          ? "כבר השתמשת במילה הזו"
          : language === "ar"
          ? "استخدمتَ هذه الكلمة بالفعل"
          : "You've already used this word",
      );
      flashFeedback();
      return;
    }

    // Accept!
    setChain(prev => [...prev, { word: matched, isSeed: false }]);
    setInput("");
    setFeedback("correct");
    setFeedbackMessage(
      language === "he" ? "מצוין! +1" : language === "ar" ? "ممتاز! +1" : "Nice! +1",
    );
    flashFeedback();
  };

  const flashFeedback = () => {
    window.setTimeout(() => {
      setFeedback("none");
      setFeedbackMessage("");
    }, 1400);
  };

  const handleSkip = () => {
    // Suggest a valid pool word so the student can continue the chain.
    const candidates = gameWords.filter(
      w => !usedIds.has(w.id) && w.english.toLowerCase().startsWith(lastLetter),
    );
    const hint = randomPick(candidates);
    if (hint) {
      setInput(hint.english);
      setFeedback("correct");
      setFeedbackMessage(
        language === "he"
          ? `רמז: ${hint.english}`
          : language === "ar"
          ? `تلميح: ${hint.english}`
          : `Hint: ${hint.english}`,
      );
      flashFeedback();
      inputRef.current?.focus();
    } else {
      setFeedback("wrong");
      setFeedbackMessage(
        language === "he"
          ? "אין יותר מילים ברשימה — נסה לסיים"
          : language === "ar"
          ? "لا توجد كلمات أخرى — حاول الإنهاء"
          : "No more matching words — try to end the round",
      );
      flashFeedback();
    }
  };

  if (!currentWord || gameWords.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-stone-500" dir={dir}>
          {language === "he"
            ? "אין מילים זמינות"
            : language === "ar"
            ? "لا توجد كلمات متاحة"
            : "No words available"}
        </p>
      </div>
    );
  }

  // Split the current word into "head" and the highlighted last letter
  // so the student knows what letter to start their next word with.
  const head = currentWord.english.slice(0, -1);
  const tail = currentWord.english.slice(-1);

  return (
    <div className="flex flex-col items-center px-4 py-6 sm:py-10 w-full" dir="ltr">
      {/* Score chip */}
      <div
        className={`mb-4 px-4 py-2 rounded-full font-black text-sm ${theme.pillBg} ${theme.pillText} shadow-md`}
      >
        🔗 {language === "he" ? "שרשרת" : language === "ar" ? "السلسلة" : "Chain"}: {score}
      </div>

      {/* Big current word with last letter highlighted */}
      <div className="relative mb-2">
        <div className="text-5xl sm:text-7xl font-black tracking-tight text-stone-900 dark:text-stone-100">
          <span>{head}</span>
          <span className={`${theme.pillText}`} style={{ textShadow: "0 0 0 currentColor" }}>
            {tail}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => speak(currentWord.id, currentWord.english)}
        className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-semibold transition"
        aria-label="Replay audio"
      >
        <Volume2 size={14} /> {language === "he" ? "השמע שוב" : language === "ar" ? "أعد التشغيل" : "Replay"}
      </button>

      {/* Hint about what's expected */}
      <p
        className="mt-4 text-center text-sm sm:text-base text-stone-600"
        dir={dir}
      >
        {language === "he"
          ? `הקלד מילה שמתחילה ב-`
          : language === "ar"
          ? `اكتب كلمة تبدأ بـ `
          : `Type a word starting with `}
        <span className={`font-black uppercase ${theme.pillText}`}>{tail}</span>
      </p>

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="mt-5 w-full max-w-md flex items-center gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={
            language === "he"
              ? "המילה הבאה..."
              : language === "ar"
              ? "الكلمة التالية..."
              : "Next word..."
          }
          dir="ltr"
          className="flex-1 px-4 py-3 rounded-xl border-2 border-stone-200 focus:border-stone-400 outline-none text-lg font-bold text-stone-900 bg-white"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className={`px-4 py-3 rounded-xl font-black text-white shadow-md disabled:opacity-50 ${theme.fill}`}
          aria-label="Submit word"
        >
          <Send size={18} />
        </button>
      </form>

      {/* Inline feedback flash */}
      <AnimatePresence>
        {feedback !== "none" && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`mt-3 text-sm font-bold ${
              feedback === "correct" ? "text-emerald-600" : "text-rose-600"
            }`}
            dir={dir}
          >
            {feedbackMessage}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Action row */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSkip}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-bold transition"
        >
          <SkipForward size={16} />
          {language === "he" ? "רמז" : language === "ar" ? "تلميح" : "Hint"}
        </button>
        <button
          type="button"
          onClick={() => onFinish(score)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-bold transition"
        >
          <X size={16} />
          {language === "he" ? "סיים" : language === "ar" ? "إنهاء" : "End round"}
        </button>
      </div>

      {/* Chain history strip */}
      {chain.length > 1 && (
        <div className="mt-8 w-full max-w-2xl">
          <p
            className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2 text-center"
            dir={dir}
          >
            {language === "he" ? "השרשרת שלך" : language === "ar" ? "سلسلتك" : "Your chain"}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {chain.map((step, i) => (
              <span
                key={`${step.word.id}-${i}`}
                className={`px-3 py-1.5 rounded-full text-sm font-bold ${
                  step.isSeed
                    ? "bg-stone-100 text-stone-500"
                    : `${theme.pillBg} ${theme.pillText}`
                }`}
              >
                {step.word.english}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
