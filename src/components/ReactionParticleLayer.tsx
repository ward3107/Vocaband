/**
 * ReactionParticleLayer — floating emoji burst for live teacher podiums.
 *
 * A student taps a reaction; the server broadcasts it; this layer floats
 * the emoji up the projector. Shared by the Quick Play monitor and the
 * Live Challenge podium so both flows get the identical Tier-C affordance.
 *
 * Origin: when the sender's avatar is on screen (tagged `data-reaction-uid`)
 * the particle launches from it; otherwise it falls back to a random column
 * at the bottom edge — still readable, just not anchored to a face.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

/** Minimal reaction shape — both live flows carry `clientId` + `serverTs`. */
export interface PodiumReaction {
  clientId: string;
  emoji: string;
  serverTs: number;
}

type ReactionParticle = {
  id: string;
  emoji: string;
  originX: number;
  originY: number;
  /** Slight horizontal drift mid-flight so consecutive particles fan out. */
  drift: number;
};

export default function ReactionParticleLayer({
  lastReaction,
  disabled,
}: {
  lastReaction: PodiumReaction | null;
  disabled?: boolean;
}) {
  const [particles, setParticles] = useState<ReactionParticle[]>([]);
  // Dedupe ring — same (clientId, serverTs) can re-fire on a React
  // strict-mode double-effect or a brief reconnection replay. Bounded so
  // it can't leak memory across a long session.
  const seenRef = useRef<string[]>([]);

  useEffect(() => {
    if (disabled) return;
    if (!lastReaction || !lastReaction.emoji) return;
    const key = `${lastReaction.clientId}:${lastReaction.serverTs}`;
    if (seenRef.current.includes(key)) return;
    seenRef.current.push(key);
    if (seenRef.current.length > 200) seenRef.current.shift();

    // Look up the sender's avatar by data-reaction-uid. document is safe to
    // touch here — this runs inside a useEffect (browser only). When the
    // sender is rendered we get a real origin; otherwise we fall back to a
    // random column at the bottom edge.
    let originX: number;
    let originY: number;
    const el = typeof document !== "undefined"
      ? document.querySelector(`[data-reaction-uid="${CSS.escape(lastReaction.clientId)}"]`) as HTMLElement | null
      : null;
    if (el) {
      const rect = el.getBoundingClientRect();
      originX = rect.left + rect.width / 2;
      originY = rect.top + rect.height / 2;
    } else {
      const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
      const vh = typeof window !== "undefined" ? window.innerHeight : 768;
      originX = vw * (0.05 + Math.random() * 0.9);
      originY = vh - 40;
    }

    const id = `${key}:${Math.random().toString(36).slice(2, 8)}`;
    const drift = (Math.random() - 0.5) * 80;

    setParticles(prev => [...prev, { id, emoji: lastReaction.emoji, originX, originY, drift }].slice(-30));
    const timer = setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, 2400);
    return () => clearTimeout(timer);
  }, [lastReaction, disabled]);

  if (disabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[55] overflow-hidden">
      <AnimatePresence>
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ y: 0, x: 0, opacity: 0, scale: 0.5 }}
            animate={{
              // Float roughly 220px upward — enough to read against the
              // background, short enough that the source avatar stays
              // visually connected to the particle.
              y: -220,
              x: p.drift,
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1.2, 1, 0.85],
              rotate: p.drift > 0 ? 8 : -8,
            }}
            transition={{ duration: 2.4, ease: "easeOut", times: [0, 0.1, 0.85, 1] }}
            className="fixed text-3xl sm:text-4xl 2xl:text-6xl select-none drop-shadow-2xl"
            style={{
              left: `${p.originX}px`,
              top: `${p.originY}px`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {p.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
