/**
 * QpReactionBar — Tier C floating emoji bar for Quick Play students.
 *
 * Pinned to the bottom of the screen during gameplay so kids can react
 * (👏 🔥 ⭐ ❤️ 😂 👍) without interrupting their turn. The server
 * already validates against QP_REACTION_EMOJIS and rate-limits per
 * clientId, so this component just passes the tap through.
 *
 * Local cooldown adds a half-second per-button "✓ sent" affordance so
 * a student isn't left wondering whether their tap landed; doesn't
 * gate sending, just tweaks the visual.
 */
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { QP_REACTION_EMOJIS, QP_REACTION_MIN_INTERVAL_MS } from "../core/quickPlayProtocol";
import { useLanguage } from "../hooks/useLanguage";
import { gameAriasT } from "../locales/student/game-arias";

interface QpReactionBarProps {
  sendReaction: (emoji: string) => void;
}

export default function QpReactionBar({ sendReaction }: QpReactionBarProps) {
  const { language } = useLanguage();
  const tAria = gameAriasT[language];
  // Per-button "just sent" badge — clears after a short pulse so the
  // student sees their tap register without us blocking subsequent taps.
  const [recentlySent, setRecentlySent] = useState<string | null>(null);
  const recentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Client-side throttle that matches the server floor. Stops double-taps
  // from racing the network — server would drop them anyway, but feeling
  // the cooldown on the device is less confusing than silent drops.
  const lastSentRef = useRef<number>(0);

  const handleTap = (emoji: string) => {
    const now = Date.now();
    if (now - lastSentRef.current < QP_REACTION_MIN_INTERVAL_MS) return;
    lastSentRef.current = now;

    sendReaction(emoji);

    setRecentlySent(emoji);
    if (recentTimerRef.current) clearTimeout(recentTimerRef.current);
    recentTimerRef.current = setTimeout(() => setRecentlySent(null), 700);
  };

  return (
    <div
      className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
      aria-label={tAria.sendReactionBar}
    >
      <div className="pointer-events-auto bg-black/60 backdrop-blur-md rounded-full shadow-2xl px-2 py-1.5 sm:px-3 sm:py-2 flex items-center gap-1 sm:gap-1.5 border border-white/10">
        {QP_REACTION_EMOJIS.map((emoji) => {
          const isRecent = recentlySent === emoji;
          return (
            <motion.button
              key={emoji}
              type="button"
              onClick={() => handleTap(emoji)}
              whileTap={{ scale: 0.85 }}
              whileHover={{ scale: 1.1 }}
              className="relative w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center text-2xl sm:text-3xl rounded-full hover:bg-white/10 transition-colors"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as any }}
              aria-label={tAria.sendReactionEmoji(emoji)}
            >
              <span>{emoji}</span>
              <AnimatePresence>
                {isRecent && (
                  <motion.span
                    key="sent-ring"
                    initial={{ scale: 0.4, opacity: 0.8 }}
                    animate={{ scale: 1.4, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 rounded-full ring-2 ring-emerald-400 pointer-events-none"
                  />
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
