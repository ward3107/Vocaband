/**
 * CategoryRaceFocusCard — the full-screen, one-category-at-a-time answer
 * input for the live Category Race. Big gradient header with the
 * category emoji + name, the rolled letter shown prominently, one large
 * text field, Prev/Next to move between categories, and a shared
 * countdown driven by the server deadline.
 *
 * Purely presentational: the parent owns the answers map, the countdown,
 * and what "submit" does. Reused for every round.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Clock, Send, Loader2, Sparkles, Lightbulb, Infinity as InfinityIcon } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import {
  type CategoryMeta,
  categoryLabel,
  categoryPlaceholder,
  answersFor,
} from "../../data/category-race-bank";

interface CategoryRaceFocusCardProps {
  letter: string;
  categories: ReadonlyArray<CategoryMeta>;
  /** categoryId → typed answer. */
  answers: Record<string, string>;
  onChange: (categoryId: string, value: string) => void;
  /** Index of the category currently shown. */
  index: number;
  setIndex: (i: number) => void;
  secondsLeft: number;
  totalSeconds: number;
  /** Relaxed mode — no countdown, no auto-submit, no half-time nudge. */
  untimed?: boolean;
  /** Called when the student opens a hint for a category — the parent
   *  records it so that cell scores at the reduced (help) rate. */
  onHintUsed?: (categoryId: string) => void;
  onSubmit: () => void;
  submitting?: boolean;
}

const STRINGS = {
  en: { letter: "Your letter", submit: "Submit answers", submitting: "Sending…", of: (a: number, b: number) => `${a} of ${b}`, filled: (n: number, total: number) => `${n}/${total} filled`, nudge: "Trust your gut! 🎯", relaxed: "Answer when ready", needIdeas: "Need ideas?", startsWith: "Starts with", tapToUse: "Tap a word to use it" },
  he: { letter: "האות שלך", submit: "שליחת תשובות", submitting: "שולח…", of: (a: number, b: number) => `${a} מתוך ${b}`, filled: (n: number, total: number) => `${n}/${total} מולאו`, nudge: "סמכו על האינטואיציה! 🎯", relaxed: "ענו כשמוכנים", needIdeas: "צריכים רעיון?", startsWith: "מתחיל ב", tapToUse: "הקישו על מילה כדי להשתמש בה" },
  ar: { letter: "حرفك", submit: "إرسال الإجابات", submitting: "جارٍ الإرسال…", of: (a: number, b: number) => `${a} من ${b}`, filled: (n: number, total: number) => `${n}/${total} مكتملة`, nudge: "ثق بحدسك! 🎯", relaxed: "أجب عند الاستعداد", needIdeas: "تحتاج أفكارًا؟", startsWith: "يبدأ بـ", tapToUse: "اضغط على كلمة لاستخدامها" },
} as const;

export default function CategoryRaceFocusCard({
  letter, categories, answers, onChange, index, setIndex,
  secondsLeft, totalSeconds, untimed = false, onHintUsed, onSubmit, submitting = false,
}: CategoryRaceFocusCardProps) {
  const [revealedHints, setRevealedHints] = useState<Set<string>>(new Set());
  const { language, dir } = useLanguage();
  const t = STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];
  const inputRef = useRef<HTMLInputElement>(null);

  const safeIndex = Math.max(0, Math.min(index, categories.length - 1));
  const cat = categories[safeIndex];
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === categories.length - 1;
  const filledCount = categories.reduce((n, c) => n + ((answers[c.id] ?? "").trim() ? 1 : 0), 0);
  const lowTime = !untimed && secondsLeft <= 10;
  const pct = totalSeconds > 0 ? Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100)) : 0;
  // "Trust your gut" nudge fires in a short window around half-time to
  // discourage overthinking. Suppressed in relaxed/untimed rounds.
  const half = Math.floor(totalSeconds / 2);
  const showNudge = !untimed && secondsLeft > 0 && secondsLeft <= half && secondsLeft > half - 3;

  // Focus the field whenever the visible category changes so the student
  // can type immediately without tapping.
  useEffect(() => {
    inputRef.current?.focus();
  }, [safeIndex]);

  const goPrev = () => { if (!isFirst) setIndex(safeIndex - 1); };
  const goNext = () => { if (!isLast) setIndex(safeIndex + 1); };

  if (!cat) return null;

  // Help scaffold for weaker students: valid answers for this cell power
  // both the first-letters hint and the tappable suggestions. Opening the
  // hint marks the cell "helped" (reduced points) via onHintUsed.
  const hints = answersFor(cat.id, letter);
  const hintRevealed = revealedHints.has(cat.id);
  const openHint = () => {
    if (revealedHints.has(cat.id)) return;
    setRevealedHints(prev => new Set(prev).add(cat.id));
    onHintUsed?.(cat.id);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gradient-to-br from-fuchsia-50 via-white to-pink-50" dir={dir}>
      {/* Header: letter + countdown */}
      <header className="flex-shrink-0 px-4 pt-[max(14px,env(safe-area-inset-top))] pb-3">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-500">{t.letter}</span>
              <motion.span
                initial={{ scale: 0.3, rotate: -12, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 14 }}
                className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${cat.gradient} text-white text-2xl font-black shadow-lg`}
              >
                {letter}
              </motion.span>
            </div>
            {untimed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-sm bg-indigo-100 text-indigo-700">
                <InfinityIcon size={15} /> {t.relaxed}
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-sm ${lowTime ? "bg-red-100 text-red-700 animate-pulse" : "bg-stone-100 text-stone-700"}`}>
                <Clock size={15} /> {secondsLeft}s
              </span>
            )}
          </div>
          {!untimed && (
            <div className="h-1.5 w-full rounded-full bg-stone-200 overflow-hidden mt-3">
              <div className={`h-full transition-all duration-1000 ease-linear ${lowTime ? "bg-red-500" : `bg-gradient-to-r ${cat.gradient}`}`} style={{ width: `${pct}%` }} />
            </div>
          )}
          <AnimatePresence>
            {showNudge && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-2 flex justify-center"
              >
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-black text-xs">
                  <Sparkles size={13} /> {t.nudge}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* The one big category card */}
      <main className="flex-1 min-h-0 flex items-center justify-center px-4">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, x: dir === "rtl" ? -24 : 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir === "rtl" ? 24 : -24 }}
              transition={{ duration: 0.18 }}
              className="rounded-3xl bg-white shadow-xl shadow-fuchsia-500/10 border border-fuchsia-100 overflow-hidden"
            >
              <div className={`bg-gradient-to-br ${cat.gradient} px-6 py-7 text-center text-white`}>
                <div className="text-5xl mb-1">{cat.emoji}</div>
                <div className="text-2xl font-black tracking-tight">{categoryLabel(cat, language)}</div>
              </div>
              <div className="p-5">
                <input
                  ref={inputRef}
                  type="text"
                  value={answers[cat.id] ?? ""}
                  onChange={e => onChange(cat.id, e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { if (isLast) onSubmit(); else goNext(); } }}
                  placeholder={categoryPlaceholder(cat, language)}
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  dir="auto"
                  className="w-full bg-stone-50 rounded-2xl border-2 border-stone-200 focus:border-fuchsia-400 outline-none px-4 py-4 text-2xl font-bold text-stone-900 placeholder-stone-300 text-center transition"
                />

                {/* Stuck? Hint scaffold — reveals first letters + tappable
                    suggestions. Hidden if the bank has nothing for this cell. */}
                {hints.length > 0 && (
                  <div className="mt-3">
                    {!hintRevealed ? (
                      <button
                        type="button"
                        onClick={openHint}
                        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-black text-xs active:scale-95 transition"
                      >
                        <Lightbulb size={14} /> {t.needIdeas}
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl bg-amber-50 border border-amber-200 p-3"
                      >
                        <div className="text-xs font-bold text-amber-700">
                          {t.startsWith}: <span className="font-black">{hints[0].en.slice(0, Math.min(2, hints[0].en.length))}…</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2" dir="ltr">
                          {hints.slice(0, 3).map(h => (
                            <button
                              key={h.en}
                              type="button"
                              onClick={() => onChange(cat.id, h.en)}
                              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                              className="px-3 py-1.5 rounded-full bg-white border border-amber-300 text-amber-800 font-black text-sm active:scale-95 transition"
                            >
                              {h.en}
                            </button>
                          ))}
                        </div>
                        <div className="text-[10px] font-bold text-amber-500 mt-1.5">{t.tapToUse}</div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer: nav + submit */}
      <footer className="flex-shrink-0 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-2">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-3">
            <button
              type="button"
              onClick={goPrev}
              disabled={isFirst}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-black transition ${isFirst ? "bg-stone-100 text-stone-300" : "bg-white text-fuchsia-600 shadow-md active:scale-95"}`}
              aria-label="Previous"
            >
              {dir === "rtl" ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
            </button>
            <div className="text-center">
              <div className="text-sm font-black text-stone-700">{t.of(safeIndex + 1, categories.length)}</div>
              <div className="text-[11px] font-bold text-stone-400">{t.filled(filledCount, categories.length)}</div>
            </div>
            <button
              type="button"
              onClick={goNext}
              disabled={isLast}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-black transition ${isLast ? "bg-stone-100 text-stone-300" : "bg-white text-fuchsia-600 shadow-md active:scale-95"}`}
              aria-label="Next"
            >
              {dir === "rtl" ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
            </button>
          </div>
          {/* Category dots */}
          <div className="flex items-center justify-center gap-1.5 mb-3">
            {categories.map((c, i) => {
              const done = (answers[c.id] ?? "").trim().length > 0;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  style={{ touchAction: "manipulation" }}
                  className={`h-2.5 rounded-full transition-all ${i === safeIndex ? "w-6 bg-fuchsia-500" : done ? "w-2.5 bg-fuchsia-300" : "w-2.5 bg-stone-200"}`}
                  aria-label={categoryLabel(c, language)}
                />
              );
            })}
          </div>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-base text-white shadow-lg shadow-fuchsia-500/30 bg-gradient-to-r from-fuchsia-500 to-pink-600 active:scale-[0.98] transition disabled:opacity-60"
          >
            {submitting
              ? <><Loader2 size={18} className="animate-spin" /> {t.submitting}</>
              : <><Send size={18} /> {t.submit}</>}
          </button>
        </div>
      </footer>
    </div>
  );
}
