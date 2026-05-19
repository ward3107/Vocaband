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
import { gameAriasT } from "../../locales/student/game-arias";
import { type GameThemeColor, getThemeColors } from "./GameShell";
import { getCachedVocabulary } from "../../hooks/useVocabularyLazy";

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
  const tAria = gameAriasT[language];
  const theme = getThemeColors(themeColor);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build a fast lookup: lowercase english → Word (for validation).
  const lookup = useMemo(() => {
    const m = new Map<string, Word>();
    for (const w of gameWords) m.set(w.english.toLowerCase(), w);
    return m;
  }, [gameWords]);

  // Real-English-word check — built once from the cached full
  // vocabulary so keyboard mashing ("hfrtuj") gets a clearer rejection
  // than "not in your word list". The vocab chunk has always loaded by
  // the time this game mounts (the chain pool comes from it), so the
  // cached accessor is safe to call synchronously here.
  const dictionarySet = useMemo(() => {
    const cached = getCachedVocabulary();
    if (!cached) return null;
    const s = new Set<string>();
    for (const w of cached.ALL_WORDS) s.add(w.english.toLowerCase());
    return s;
  }, []);

  // Seed the chain with a random word from the pool — but bias toward
  // seeds whose last letter HAS at least one continuation in the same
  // pool. Without this, a round could start with e.g. "good" → kid
  // needs a "d" word → no pool word starts with "d" → every real
  // English guess gets the confusing "not in your word list" message,
  // and the round is dead on arrival. Falls back to a plain random
  // pick when the pool is so constrained that no seed has a follow-up
  // (e.g. teacher uploaded only one word, or letters don't loop).
  const [chain, setChain] = useState<ChainStep[]>(() => {
    const seedablePicks = gameWords.filter(seed => {
      const last = seed.english.slice(-1).toLowerCase();
      return gameWords.some(
        w => w.id !== seed.id && w.english.toLowerCase().startsWith(last),
      );
    });
    const seed = randomPick(seedablePicks.length > 0 ? seedablePicks : gameWords);
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

  // Dead-end detection: are there any unused pool words that start
  // with the required letter? When this is false the kid literally
  // cannot continue — every real-English word they try (even one that
  // starts with the right letter) gets "not in your word list" because
  // the pool just doesn't have a follow-up. Surface a clear end-of-
  // round prompt instead of letting them keep guessing into a trap.
  const noMoreCandidates = useMemo(() => {
    if (!currentWord || !lastLetter) return false;
    return !gameWords.some(
      w => !usedIds.has(w.id) && w.english.toLowerCase().startsWith(lastLetter),
    );
  }, [currentWord, lastLetter, usedIds, gameWords]);

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

    // Validation 0: alphabet-only. Stops keyboard mashing with digits
    // or symbols from making it to the dictionary lookup, which the
    // pool check used to silently absorb with a confusing "not in your
    // word list" message. Allow spaces / apostrophes / hyphens so
    // multi-word entries like "ice cream" or "don't" still validate.
    if (!/^[a-z][a-z\s'-]*$/.test(guess)) {
      setFeedback("wrong");
      setFeedbackMessage(
        language === "he"
          ? "אותיות אנגליות בלבד"
          : language === "ar"
          ? "أحرف إنجليزية فقط"
          : "Use English letters only",
      );
      flashFeedback();
      return;
    }

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
      // Differentiate "real word, just not in your list" from
      // "gibberish, not a real word at all" so the kid knows
      // whether to try a different real word vs. stop mashing keys.
      const isRealEnglishWord = dictionarySet?.has(guess) ?? false;
      setFeedback("wrong");
      setFeedbackMessage(
        isRealEnglishWord
          ? language === "he"
            ? "המילה לא נמצאת ברשימה — נסה אחרת"
            : language === "ar"
            ? "الكلمة ليست في القائمة — جرّب أخرى"
            : "Not in your word list — try another"
          : language === "he"
          ? "זו לא מילה אמיתית — נסה שוב"
          : language === "ar"
          ? "هذه ليست كلمة حقيقية — حاول مرة أخرى"
          : "That's not a real word — try again",
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
        className={`mb-2 px-4 py-2 rounded-full font-black text-sm ${theme.pillBg} ${theme.pillText} shadow-md`}
      >
        🔗 {language === "he" ? "שרשרת" : language === "ar" ? "السلسلة" : "Chain"}: {score}
      </div>

      {/* Pool size chip — telegraphs that the chain is built from the
          teacher's word list, not free English.  Without this students
          guess random words and bounce off the "not in your word list"
          error before they understand the rule. */}
      <div
        className="mb-4 px-3 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-bold"
        dir={dir}
      >
        {language === "he"
          ? `מתוך רשימת הכיתה שלך · ${gameWords.length} מילים`
          : language === "ar"
          ? `من قائمة كلمات صفّك · ${gameWords.length} كلمة`
          : `From your class word list · ${gameWords.length} words`}
      </div>

      {/* "Previous word" — small contextual label so students don't mistake
          the seed word for the question. The actual TASK below is the big
          element on the screen. */}
      <p
        className="text-xs sm:text-sm uppercase tracking-widest font-bold text-stone-400 mb-1"
        dir={dir}
      >
        {language === "he"
          ? "המילה הקודמת"
          : language === "ar"
          ? "الكلمة السابقة"
          : "Previous word"}
      </p>
      <div className="relative mb-1">
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-700 dark:text-stone-300">
          <span>{head}</span>
          <span className={`${theme.pillText}`} style={{ textShadow: "0 0 0 currentColor" }}>
            {tail}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => speak(currentWord.id, currentWord.english)}
        className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-semibold transition"
        aria-label={tAria.replayAudio}
      >
        <Volume2 size={12} /> {language === "he" ? "השמע" : language === "ar" ? "تشغيل" : "Play"}
      </button>

      {/* THE TASK — biggest, most prominent element. Students should never
          have to guess what to do. The target letter is the hero. */}
      <div
        className="mt-6 text-center"
        dir={dir}
      >
        <p className="text-sm sm:text-base text-stone-600 font-semibold mb-2">
          {language === "he"
            ? "התור שלך — הקלד מילה כלשהי שמתחילה ב:"
            : language === "ar"
            ? "دورك — اكتب أي كلمة تبدأ بـ:"
            : "Your turn — type any word that starts with:"}
        </p>
        <div
          className={`inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl ${theme.pillBg} ${theme.pillText} shadow-lg`}
        >
          <span className="text-5xl sm:text-6xl font-black uppercase">{tail}</span>
        </div>
      </div>

      {/* Dead-end banner — the pool has no word starting with the
          required letter, so the kid can't continue no matter what
          real-English word they try. Surface this BEFORE they guess
          into the trap, with a one-tap End round CTA. */}
      {noMoreCandidates && (
        <div
          className="mt-4 w-full max-w-md px-4 py-3 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-900 text-sm font-bold text-center"
          role="status"
          dir={dir}
        >
          {language === "he"
            ? `אין מילים נוספות ברשימה שמתחילות ב-"${tail.toUpperCase()}" — הקש "סיים" כדי לסיים`
            : language === "ar"
            ? `لا توجد كلمات أخرى في القائمة تبدأ بـ "${tail.toUpperCase()}" — اضغط "إنهاء" لإنهاء الجولة`
            : `No more words in your list start with "${tail.toUpperCase()}" — tap End round to finish`}
        </div>
      )}

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
          className="flex-1 px-4 py-3 rounded-lg border-2 border-stone-200 focus:border-stone-400 outline-none text-lg font-bold text-stone-900 bg-white"
        />
        <button
          type="submit"
          disabled={!input.trim() || noMoreCandidates}
          className={`px-4 py-3 rounded-lg font-black text-white shadow-md disabled:opacity-50 ${theme.fill}`}
          aria-label={tAria.submitWord}
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

      {/* Action row — Hint disables on dead-end (no pool word starts
          with the required letter, so there's nothing to hint). End
          round gets emphasised so the kid sees the way out. */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSkip}
          disabled={noMoreCandidates}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <SkipForward size={16} />
          {language === "he" ? "רמז" : language === "ar" ? "تلميح" : "Hint"}
        </button>
        <button
          type="button"
          onClick={() => onFinish(score)}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition ${
            noMoreCandidates
              ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md"
              : "bg-rose-50 hover:bg-rose-100 text-rose-600"
          }`}
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
