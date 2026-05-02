/**
 * RatingPrompt — first-impression NPS-style rating modal.
 *
 * Two storage modes:
 *
 *  1. AUTHENTICATED (default) — writes to public.users.first_rating
 *     for the calling user.  Used by teachers + signed-in students.
 *     `users.first_rating_at` + `users.rating_dismissed_at` track
 *     the prompt's lifecycle.
 *
 *  2. GUEST (when `guestStorage` prop is supplied) — writes to
 *     public.quick_play_ratings keyed by (session_code, nickname).
 *     Used by Quick Play guests who have NO users row.  Dismissals
 *     are tracked in localStorage so we don't re-prompt the same
 *     guest in the same session.
 *
 * Visual variants:
 *   - kind="teacher" — 5-star UI, copy aimed at teachers.
 *   - kind="student" — 5-emoji UI (😡😕😐🙂😍), copy aimed at students.
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
  /**
   * Optional guest-storage context.  When provided, the rating is
   * written to public.quick_play_ratings instead of public.users.
   * Used for Quick Play guests who have no users row.
   *
   * `dismissedKey` is a localStorage key that's set to '1' when the
   * guest dismisses (so they don't get re-prompted in the same
   * session).  Caller is responsible for checking it BEFORE
   * mounting the prompt.
   */
  guestStorage?: {
    sessionCode: string;
    nickname: string;
    dismissedKey: string;
  };
  /** Called after a successful submit OR dismiss so the parent
   *  removes the trigger condition.  Local state on the parent is
   *  the parent's job; this component just hides itself. */
  onDone: () => void;
}

const STUDENT_EMOJIS = ["😡", "😕", "😐", "🙂", "😍"];

export default function RatingPrompt({ user, kind, guestStorage, onDone }: RatingPromptProps) {
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

    if (guestStorage) {
      // Guest path — write to quick_play_ratings.  Public INSERT
      // policy with active-session check (see migration
      // 20260428150000).  Unique constraint on (session_code,
      // nickname) means a re-rate triggers 23505 — treat as
      // "already rated, dismiss the modal".
      const { error } = await supabase
        .from("quick_play_ratings")
        .insert({
          session_code: guestStorage.sessionCode,
          nickname: guestStorage.nickname,
          rating,
        });
      if (error && error.code !== "23505") {
        console.warn("[rating] guest save failed:", error);
      }
      try { localStorage.setItem(guestStorage.dismissedKey, "1"); } catch { /* ignore */ }
    } else {
      // Authenticated path — write to users.first_rating.
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
    }

    setOpen(false);
    setTimeout(onDone, 300);
  };

  const handleDismiss = async () => {
    if (submitting) return;

    if (guestStorage) {
      // Guest dismiss — localStorage only, no DB write.
      try { localStorage.setItem(guestStorage.dismissedKey, "1"); } catch { /* ignore */ }
    } else {
      // Authenticated dismiss — write rating_dismissed_at.
      await supabase
        .from("users")
        .update({ rating_dismissed_at: new Date().toISOString() })
        .eq("uid", user.uid);
    }

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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
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
            className="relative w-full max-w-md bg-[var(--vb-surface)] rounded-3xl shadow-2xl p-6 sm:p-8"
          >
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Close"
              className="absolute top-3 right-3 w-9 h-9 rounded-full hover:bg-[var(--vb-surface-alt)] flex items-center justify-center text-[var(--vb-text-muted)]"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
            >
              <X size={18} />
            </button>

            {kind === "teacher" ? (
              <>
                <div className="text-5xl text-center mb-3" aria-hidden>👩‍🏫</div>
                <h2 id="rating-prompt-title" className="text-xl sm:text-2xl font-black text-[var(--vb-text-primary)] text-center mb-2">
                  How's Vocaband working for your class?
                </h2>
                <p className="text-sm text-[var(--vb-text-secondary)] text-center mb-6">
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
                <p className="text-xs text-[var(--vb-text-muted)] text-center">
                  Tap a star · 1 = needs work, 5 = great
                </p>
              </>
            ) : (
              <>
                <div className="text-5xl text-center mb-3" aria-hidden>🎉</div>
                <h2 id="rating-prompt-title" className="text-xl sm:text-2xl font-black text-[var(--vb-text-primary)] text-center mb-2">
                  How was that game?
                </h2>
                <p className="text-sm text-[var(--vb-text-secondary)] text-center mb-6">
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
                      className="text-4xl sm:text-5xl p-2 rounded-2xl hover:bg-[var(--vb-surface-alt)] hover:scale-110 active:scale-95 transition-transform disabled:opacity-60"
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
