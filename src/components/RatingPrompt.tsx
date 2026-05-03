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
  // Two-step star selection for the teacher variant.  Earlier the
  // stars submitted on click and only the SINGLE hovered star
  // highlighted, so a teacher who tapped the 3rd star (intending
  // "3 stars") got credited for 1 — they had no visual cue showing
  // 1..N filled before submit.  Now: clicking star N fills 1..N
  // cumulatively, the teacher sees their pick, and a Send button
  // confirms.  Hover preview keeps desktop feel; touch users see
  // the selected fill stick after they tap.
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

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
                {/* Cumulative-fill star widget.  The "active" rating is
                    whichever is largest of (a) the star being hovered
                    on desktop or (b) the star already tapped by the
                    teacher.  Every star with index <= active renders
                    as filled amber, the rest as outlined.  This is the
                    standard 5-star pattern teachers already recognise
                    from app-store ratings. */}
                <div
                  className="flex justify-center gap-2 sm:gap-3 mb-4"
                  role="radiogroup"
                  aria-label="Rating, 1 to 5 stars"
                  onMouseLeave={() => setHoveredRating(null)}
                >
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = (hoveredRating ?? selectedRating ?? 0) >= n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setSelectedRating(n)}
                        onMouseEnter={() => setHoveredRating(n)}
                        disabled={submitting}
                        role="radio"
                        aria-checked={selectedRating === n}
                        aria-label={`${n} star${n === 1 ? "" : "s"}`}
                        className="p-2 sm:p-3 rounded-2xl hover:bg-amber-50 transition-colors disabled:opacity-60"
                        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
                      >
                        <Star
                          size={36}
                          className={`transition-transform ${
                            active
                              ? "text-amber-400 fill-amber-400 scale-110"
                              : "text-amber-300"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                {/* Live label — shows what the teacher is about to
                    submit so they don't have to guess what each star
                    count means.  Updates with hover (desktop) and the
                    last tap (mobile). */}
                <p className="text-sm font-bold text-[var(--vb-text-primary)] text-center mb-3 min-h-[1.25rem]">
                  {(() => {
                    const r = hoveredRating ?? selectedRating;
                    if (r == null) return "Tap a star to rate";
                    if (r === 1) return "1 star · Needs work";
                    if (r === 2) return `${r} stars · Could be better`;
                    if (r === 3) return `${r} stars · It's okay`;
                    if (r === 4) return `${r} stars · Pretty good`;
                    return `${r} stars · Love it`;
                  })()}
                </p>
                <button
                  type="button"
                  onClick={() => selectedRating != null && handleSubmit(selectedRating)}
                  disabled={selectedRating == null || submitting}
                  className="w-full py-3 rounded-2xl font-bold bg-amber-400 text-stone-900 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
                >
                  {submitting ? "Sending…" : "Send rating"}
                </button>
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
