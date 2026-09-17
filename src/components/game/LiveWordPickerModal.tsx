/**
 * LiveWordPickerModal — drops the app's full rich word-input (paste a list,
 * pick from the vocabulary Set 1/2/3, saved lists, topic packs, photo/OCR,
 * AI translate) into the live-game host views (Word Hunt Arena, Speed Round).
 *
 * Those views used to offer only SpeedWordPicker (library type-ahead, one word
 * per tap). Teachers wanted the SAME bulk word-adding as the rest of the app,
 * so this hosts the shared WordPicker (WordInputStep2026) in a roomy modal —
 * the picker is a tall, full-width UI that never fit the narrow setup sidebar.
 *
 * Pure presentation: it forwards every WordPicker prop through and closes on
 * Done / backdrop / Escape. Word selection syncs live via onSelectedWordsChange,
 * so there's nothing to "save" — Done just closes.
 */
import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Check } from "lucide-react";
import WordPicker, { type WordPickerProps } from "../setup/WordPicker";
import { useLanguage, type Language } from "../../hooks/useLanguage";

export const liveWordPickerT: Record<
  Language,
  { title: string; done: string; words: (n: number) => string; edit: string; addFirst: string; need: (n: number) => string }
> = {
  en: {
    title: "Choose words",
    done: "Done",
    words: (n) => `${n} ${n === 1 ? "word" : "words"}`,
    edit: "Add / edit words",
    addFirst: "Add words",
    need: (n) => `Add at least ${n} words to start`,
  },
  he: {
    title: "בחירת מילים",
    done: "סיום",
    words: (n) => `${n} מילים`,
    edit: "הוספה / עריכת מילים",
    addFirst: "הוספת מילים",
    need: (n) => `הוסיפו לפחות ${n} מילים כדי להתחיל`,
  },
  ar: {
    title: "اختيار الكلمات",
    done: "تم",
    words: (n) => `${n} كلمات`,
    edit: "إضافة / تعديل الكلمات",
    addFirst: "إضافة كلمات",
    need: (n) => `أضف ${n} كلمات على الأقل للبدء`,
  },
};

interface LiveWordPickerModalProps extends WordPickerProps {
  open: boolean;
  onClose: () => void;
  /** Minimum words needed to start — drives the footer hint. */
  minWords?: number;
}

export default function LiveWordPickerModal({
  open,
  onClose,
  minWords = 0,
  ...pickerProps
}: LiveWordPickerModalProps) {
  const { language, dir } = useLanguage();
  const t = liveWordPickerT[language] ?? liveWordPickerT.en;
  const count = pickerProps.selectedWords.length;
  const enough = count >= minWords;

  // Escape closes, like any modal dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          dir={dir}
          className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={t.title}
        >
          <motion.div
            className="flex w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-[var(--ios-grouped-bg)] shadow-2xl sm:max-h-[88vh] sm:rounded-3xl"
            style={{ maxHeight: "92dvh" }}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--ios-separator)] px-4 py-3 sm:px-5">
              <h2 className="text-lg font-black text-[color:var(--ios-label)]">{t.title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t.done}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ios-fill-tertiary)] text-[color:var(--ios-label)] transition active:scale-95 hover:bg-[var(--ios-fill-secondary)]"
              >
                <X size={20} />
              </button>
            </div>

            {/* Picker body — scrolls; the picker itself is tall. */}
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
              <WordPicker {...pickerProps} />
            </div>

            {/* Footer — Done + min-words hint. */}
            <div className="flex shrink-0 items-center gap-3 border-t border-[color:var(--ios-separator)] px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-5">
              {!enough && minWords > 0 && (
                <span className="text-xs font-semibold text-[color:var(--ios-label-secondary)]">
                  {t.need(minWords)}
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className="ms-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-600 px-6 py-2.5 font-black text-white shadow-lg shadow-violet-500/30 transition active:scale-[0.98]"
              >
                <Check size={18} />
                {t.done} · {t.words(count)}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
