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
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Clock, Send, Loader2 } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import {
  type CategoryMeta,
  categoryLabel,
  categoryPlaceholder,
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
  onSubmit: () => void;
  submitting?: boolean;
}

const STRINGS = {
  en: { letter: "Your letter", submit: "Submit answers", submitting: "Sending…", of: (a: number, b: number) => `${a} of ${b}`, filled: (n: number, total: number) => `${n}/${total} filled` },
  he: { letter: "האות שלך", submit: "שליחת תשובות", submitting: "שולח…", of: (a: number, b: number) => `${a} מתוך ${b}`, filled: (n: number, total: number) => `${n}/${total} מולאו` },
  ar: { letter: "حرفك", submit: "إرسال الإجابات", submitting: "جارٍ الإرسال…", of: (a: number, b: number) => `${a} من ${b}`, filled: (n: number, total: number) => `${n}/${total} مكتملة` },
} as const;

export default function CategoryRaceFocusCard({
  letter, categories, answers, onChange, index, setIndex,
  secondsLeft, totalSeconds, onSubmit, submitting = false,
}: CategoryRaceFocusCardProps) {
  const { language, dir } = useLanguage();
  const t = STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];
  const inputRef = useRef<HTMLInputElement>(null);

  const safeIndex = Math.max(0, Math.min(index, categories.length - 1));
  const cat = categories[safeIndex];
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === categories.length - 1;
  const filledCount = categories.reduce((n, c) => n + ((answers[c.id] ?? "").trim() ? 1 : 0), 0);
  const lowTime = secondsLeft <= 10;
  const pct = totalSeconds > 0 ? Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100)) : 0;

  // Focus the field whenever the visible category changes so the student
  // can type immediately without tapping.
  useEffect(() => {
    inputRef.current?.focus();
  }, [safeIndex]);

  const goPrev = () => { if (!isFirst) setIndex(safeIndex - 1); };
  const goNext = () => { if (!isLast) setIndex(safeIndex + 1); };

  if (!cat) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gradient-to-br from-fuchsia-50 via-white to-pink-50" dir={dir}>
      {/* Header: letter + countdown */}
      <header className="flex-shrink-0 px-4 pt-[max(14px,env(safe-area-inset-top))] pb-3">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-500">{t.letter}</span>
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white text-2xl font-black shadow-lg shadow-fuchsia-500/30">
                {letter}
              </span>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-sm ${lowTime ? "bg-red-100 text-red-700 animate-pulse" : "bg-stone-100 text-stone-700"}`}>
              <Clock size={15} /> {secondsLeft}s
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-stone-200 overflow-hidden mt-3">
            <div className={`h-full transition-all duration-1000 ease-linear ${lowTime ? "bg-red-500" : "bg-gradient-to-r from-fuchsia-500 to-pink-500"}`} style={{ width: `${pct}%` }} />
          </div>
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
