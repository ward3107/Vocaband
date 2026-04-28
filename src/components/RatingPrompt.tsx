/**
 * RatingPrompt — first-impression NPS-style rating modal.
 *
 * Fires once per user, gated by trigger logic in the parent.  Stores
 * the response on `users.first_rating` (1-5) + `users.first_rating_at`,
 * or `users.rating_dismissed_at` if the user closes without rating.
 *
 * Two visual variants:
 *   - kind="teacher" — 5-star UI, copy aimed at teachers.
 *   - kind="student" — 5-emoji UI (😡😕😐🙂😍), copy aimed at students.
 *
 * Why one component for both: the storage shape is identical, the
 * trigger conditions differ.  Trying to share emoji↔star UI would
 * have been hostile to both audiences.  Two short JSX branches is
 * the cheaper read.
 *
 * Accessibility: every interactive element has aria-label; the dialog
 * is keyboard-traversable; Esc closes (counts as dismiss).
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, X } from "lucide-react";
import { supabase } from "../core/supabase";
import type { AppUser } from "../core/supabase";

interface RatingPromptProps {
  user: AppUser;
  kind: "teacher" | "student";
  /** Called after a successful submit OR dismiss so the parent
   *  removes the trigger condition.  Local state on the parent is
   *  the parent's job; this component just hides itself. */
  onDone: () => void;
}

const STUDENT_EMOJIS = ["😡", "😕", "😐", "🙂", "😍"];

export default function RatingPrompt({ user, kind, onDone }: RatingPromptProps) {
  const [open, setOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Esc to dismiss.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (rating: number) => {
    if (submitting) return;
    setSubmitting(true);
    // Best-effort write.  If the network fails we still close the
    // modal — re-asking on every load would feel like a bug.  The
    // dismissed_at write below catches that fallback.
    const { error } = await supabase
      .from("users")
      .update({
        first_rating: rating,
        first_rating_at: new Date().toISOString(),
      })
      .eq("uid", user.uid);
    if (error) {
      console.warn("[rating] save failed, falling back to dismissed_at:", error);
      await supabase
        .from("users")
        .update({ rating_dismissed_at: new Date().toISOString() })
        .eq("uid", user.uid);
    }
    setOpen(false);
    setTimeout(onDone, 300);
  };

  const handleDismiss = async () => {
    if (submitting) return;
    await supabase
      .from("users")
      .update({ rating_dismissed_at: new Date().toISOString() })
      .eq("uid", user.uid);
    setOpen(false);
    setTimeout(onDone, 300);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4"
          onClick={handleDismiss}
          role="dialog"
          aria-modal="true"
          aria-labelledby="rating-prompt-title"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8"
          >
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Close"
              className="absolute top-3 right-3 w-9 h-9 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
            >
              <X size={18} />
            </button>

            {kind === "teacher" ? (
              <>
                <div className="text-5xl text-center mb-3" aria-hidden>👩‍🏫</div>
                <h2 id="rating-prompt-title" className="text-xl sm:text-2xl font-black text-stone-900 text-center mb-2">
                  How's Vocaband working for your class?
                </h2>
                <p className="text-sm text-stone-600 text-center mb-6">
                  Quick rating — helps us know what to build next.
                </p>
                <div className="flex justify-center gap-2 sm:gap-3 mb-2" role="group" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleSubmit(n)}
                      disabled={submitting}
                      aria-label={`${n} star${n === 1 ? "" : "s"}`}
                      className="group p-2 sm:p-3 rounded-2xl hover:bg-amber-50 transition-colors disabled:opacity-60"
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
                    >
                      <Star
                        size={36}
                        className="text-amber-400 group-hover:fill-amber-400 group-hover:scale-110 transition-transform"
                      />
                    </button>
                  ))}
                </div>
                <p className="text-xs text-stone-400 text-center">
                  Tap a star · 1 = needs work, 5 = great
                </p>
              </>
            ) : (
              <>
                <div className="text-5xl text-center mb-3" aria-hidden>🎉</div>
                <h2 id="rating-prompt-title" className="text-xl sm:text-2xl font-black text-stone-900 text-center mb-2">
                  How was that game?
                </h2>
                <p className="text-sm text-stone-600 text-center mb-6">
                  Tap a face — your teacher will see the average for the class.
                </p>
                <div className="flex justify-center gap-1 sm:gap-2 mb-2" role="group" aria-label="Rating">
                  {STUDENT_EMOJIS.map((emoji, idx) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSubmit(idx + 1)}
                      disabled={submitting}
                      aria-label={`Rating ${idx + 1} of 5`}
                      className="text-4xl sm:text-5xl p-2 rounded-2xl hover:bg-stone-100 hover:scale-110 active:scale-95 transition-transform disabled:opacity-60"
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
