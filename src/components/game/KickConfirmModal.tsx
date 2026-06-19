/**
 * KickConfirmModal — a small confirmation overlay for removing a student
 * from a live game. Shared by the live-game host screens (Speed Round,
 * Category Race, Word Hunt Arena) so the "remove student" affordance on
 * their rosters always asks first — a misfire on a projected board in front
 * of the class is embarrassing, and the kick can't be undone (the student is
 * disconnected and blocked from rejoining).
 *
 * Self-contained i18n (en/he/ar) so a host view only has to manage the
 * "who's pending removal" state and provide the confirm callback.
 */
import { motion, AnimatePresence } from "motion/react";
import { UserX } from "lucide-react";
import type { Language } from "../../hooks/useLanguage";

const STRINGS = {
  en: {
    title: "Remove student?",
    body: (name: string) => `${name} will be disconnected and can't rejoin this game.`,
    confirm: "Remove",
    cancel: "Cancel",
  },
  he: {
    title: "להסיר תלמיד?",
    body: (name: string) => `${name} ינותק/תנותק ולא יוכל/תוכל להצטרף שוב למשחק.`,
    confirm: "הסר",
    cancel: "ביטול",
  },
  ar: {
    title: "إزالة الطالب؟",
    body: (name: string) => `سيتم فصل ${name} ولن يتمكن من الانضمام مجددًا إلى هذه اللعبة.`,
    confirm: "إزالة",
    cancel: "إلغاء",
  },
} as const;

interface KickConfirmModalProps {
  /** Nickname pending removal, or null to hide the modal. */
  name: string | null;
  language: Language;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function KickConfirmModal({ name, language, onConfirm, onCancel }: KickConfirmModalProps) {
  const tr = STRINGS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];
  return (
    <AnimatePresence>
      {name !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ scale: 0.9, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 12 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
              <UserX size={28} className="text-rose-600" />
            </div>
            <h3 className="text-lg font-black text-stone-800">{tr.title}</h3>
            <p className="mt-1.5 text-sm font-medium text-stone-500">{tr.body(name)}</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                style={{ touchAction: "manipulation" }}
                className="flex-1 rounded-xl bg-stone-100 px-4 py-3 font-black text-stone-700 transition active:scale-[0.98] hover:bg-stone-200"
              >
                {tr.cancel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                style={{ touchAction: "manipulation" }}
                className="flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-3 font-black text-white shadow-lg shadow-rose-500/30 transition active:scale-[0.98]"
              >
                {tr.confirm}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
