/**
 * QuickPlayResumeBanner — "Welcome back!" card that appears when a
 * Quick Play guest accidentally closed the tab and reopens
 * vocaband.com without the session URL.
 *
 * Why this exists:
 * QP guests build up score during a session.  If they tap Back, get a
 * call, or accidentally close the tab, they lose the URL with the
 * session param.  Reopening vocaband.com lands them on the public
 * landing page with no path back to their game — they have to ask
 * the teacher for the QR again.  Their 850-pt momentum dies.
 *
 * The fix is local-only: when a student joins a QP session, we
 * persist a small "resume hint" to localStorage with their session
 * code, name, avatar, clientId, score, and joinedAt timestamp.  On
 * any subsequent landing-page mount within 90 minutes, this banner
 * picks up that hint and offers a one-tap "Resume game →" button
 * that re-navigates to /?session=ABC123 — triggering the existing
 * QP join flow which the server's same-nickname re-join logic
 * reattaches to their slot with score preserved.
 *
 * Design constraints (from CLAUDE.md §12):
 *   - clientId persistence is sessionStorage per-tab to prevent
 *     multi-tab collapse.  The resume hint is in localStorage
 *     under a SEPARATE key (vocaband_qp_guest) so it doesn't
 *     contaminate the per-tab sessionStorage clientId.  When the
 *     student taps Resume, the QP flow re-establishes a fresh
 *     sessionStorage clientId for the new tab — server's
 *     same-nickname rule re-attaches them to their previous slot.
 *   - 90-min TTL: stale hints get wiped on read; the banner never
 *     shows for an old session the teacher has surely ended.
 *   - Self-dismissing: tapping "Start over" wipes the hint.
 */
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, X } from "lucide-react";

const STORAGE_KEY = "vocaband_qp_guest";
const TTL_MS = 90 * 60 * 1000; // 90 minutes

interface ResumeHint {
  sessionId?: string;
  sessionCode?: string;
  name?: string;
  avatar?: string;
  /** Most-recent cumulative score at last save.  0 if not yet scored. */
  lastScore?: number;
  /** ms epoch — refreshed on every score update so an active player
   *  doesn't get the banner while still mid-game (the TTL only matters
   *  if they STOP playing for 90 min). */
  joinedAt?: number;
}

function readHint(): ResumeHint | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResumeHint;
    if (!parsed.sessionCode || !parsed.name) return null;
    if (typeof parsed.joinedAt !== "number") return null;
    if (Date.now() - parsed.joinedAt > TTL_MS) {
      // Stale — wipe so we don't keep checking it.
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function relativeMinutes(joinedAt: number): string {
  const diffMin = Math.max(1, Math.round((Date.now() - joinedAt) / 60000));
  if (diffMin < 60) return `${diffMin} min ago`;
  const hours = Math.floor(diffMin / 60);
  return `${hours}h ${diffMin % 60}m ago`;
}

export interface QuickPlayResumeBannerProps {
  /** Hide the banner entirely.  Caller passes true when the student is
   *  already on a QP URL (mid-resume) or actively playing — we don't
   *  want to nag them while they're in the game. */
  suppress?: boolean;
}

export default function QuickPlayResumeBanner({ suppress }: QuickPlayResumeBannerProps) {
  const [hint, setHint] = useState<ResumeHint | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Read on mount + whenever suppress flips off (e.g. student left
  // the game and we now want to show the banner again).
  useEffect(() => {
    if (suppress) return;
    setHint(readHint());
  }, [suppress]);

  const handleResume = useCallback(() => {
    if (!hint?.sessionCode) return;
    // Navigate to the QP URL — App.tsx's URL-param check at line 127
    // picks up the session param and routes to quick-play-student.
    // Full reload is intentional: the existing QP flow expects a
    // fresh page boot (URL param read, socket open, view set).
    window.location.href = `/?session=${encodeURIComponent(hint.sessionCode)}`;
  }, [hint]);

  const handleDismiss = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setHint(null);
    setDismissed(true);
  }, []);

  if (suppress || dismissed || !hint?.sessionCode || !hint?.name) return null;

  const avatar = hint.avatar || "🎮";
  const name = hint.name;
  const score = hint.lastScore ?? 0;
  const ago = hint.joinedAt ? relativeMinutes(hint.joinedAt) : "recently";

  return (
    <AnimatePresence>
      <motion.div
        key="qp-resume-banner"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="fixed top-3 inset-x-3 sm:top-4 sm:left-auto sm:right-4 sm:max-w-md z-[9985]"
        role="alert"
        aria-live="polite"
      >
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-emerald-300 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-2 text-white text-xs font-black uppercase tracking-widest">
            Welcome back!
          </div>
          <div className="p-4 flex items-center gap-3">
            <div className="text-4xl shrink-0">{avatar}</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-stone-900 text-sm truncate">{name}</p>
              <p className="text-xs text-stone-500 mt-0.5">
                {score > 0
                  ? <>You had <strong className="text-emerald-700">{score} points</strong> · {ago}</>
                  : <>Your game started {ago}</>}
              </p>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleResume}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-xs shadow-md active:scale-95 transition-transform"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                <Play size={12} />
                Resume
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss"
                className="inline-flex items-center justify-center gap-1 px-3 py-1 rounded-lg text-[10px] font-semibold text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                <X size={10} />
                Start over
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
