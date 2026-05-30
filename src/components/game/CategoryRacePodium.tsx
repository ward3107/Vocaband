/**
 * CategoryRacePodium — race-lane scoreboard for the Category Race host
 * screen. Every student gets a horizontal lane; the fill width scales
 * relative to the leader's score, so the whole class reads as a real
 * race in motion.  The leader's lane carries a trophy at the head.
 *
 * Live behaviour kept from the previous pedestal version:
 *   - count-up tween on score changes (so +10 visibly ticks up)
 *   - "+N" burst float over the lane when a student scores
 *   - spring layout reorder when a student overtakes another
 *
 * RTL note: the lane fill uses block flow + flex `justify-end`, which
 * respects the parent's `dir` so the bar grows right→left in he/ar.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy } from "lucide-react";
import QPAvatar from "../QPAvatar";

export interface PodiumEntry {
  clientId: string;
  nickname: string;
  avatar?: string;
  score: number;
}

interface CategoryRacePodiumProps {
  /** Already sorted by score, descending. */
  entries: PodiumEntry[];
  emptyText: string;
  /** Projector mode — scales every lane, name, and score way up so a
   *  class reading the board from the back of the room can make out
   *  who's who. Defaults off for any compact/preview use. */
  large?: boolean;
  /** Dark theme — flips name/track colours for the dark projector. */
  dark?: boolean;
}

// easeOutCubic count-up so a +10 visibly ticks up instead of snapping.
function AnimatedScore({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 500);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{display}</>;
}

export default function CategoryRacePodium({ entries, emptyText, large = false, dark = false }: CategoryRacePodiumProps) {
  // Detect score increases between renders to fire a "+N" burst.
  const prev = useRef<Map<string, number>>(new Map());
  const gainId = useRef(0);
  const [gains, setGains] = useState<Map<string, { amount: number; id: number }>>(new Map());

  useEffect(() => {
    const next = new Map<string, number>();
    const fresh: Array<{ clientId: string; amount: number; id: number }> = [];
    for (const e of entries) {
      next.set(e.clientId, e.score);
      const before = prev.current.get(e.clientId);
      if (before !== undefined && e.score > before) {
        fresh.push({ clientId: e.clientId, amount: e.score - before, id: ++gainId.current });
      }
    }
    prev.current = next;
    if (!fresh.length) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- diffs score props to fire a "+N" burst; matches existing convention
    setGains(g => {
      const m = new Map(g);
      for (const f of fresh) m.set(f.clientId, { amount: f.amount, id: f.id });
      return m;
    });
    const timers = fresh.map(f =>
      window.setTimeout(() => {
        setGains(g => {
          const cur = g.get(f.clientId);
          if (cur && cur.id === f.id) { const m = new Map(g); m.delete(f.clientId); return m; }
          return g;
        });
      }, 1600),
    );
    return () => timers.forEach(clearTimeout);
  }, [entries]);

  if (entries.length === 0) {
    return (
      <p className={`font-semibold text-center ${dark ? "text-stone-500" : "text-stone-400"} ${large ? "text-2xl py-20" : "text-sm py-10"}`}>
        {emptyText}
      </p>
    );
  }

  // Bars scale relative to the leader, so the front-runner pins at
  // 100% and everyone else reads as "how close am I" against them.
  // When the leader scores, their bar stays full but the field's bars
  // shrink proportionally, which is the right "they pulled ahead"
  // signal.  Math.max(1, …) avoids a 0/0 NaN before anyone has scored.
  const leaderScore = Math.max(1, entries[0]?.score ?? 0);

  return (
    <ul className={`flex flex-col ${large ? "gap-4" : "gap-3"}`}>
      <AnimatePresence initial={false}>
        {entries.map((e, i) => {
          const pct = Math.max(2, Math.min(100, (e.score / leaderScore) * 100));
          const isLeader = i === 0;
          const gain = gains.get(e.clientId);
          return (
            <motion.li
              key={e.clientId}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ layout: { type: "spring", stiffness: 500, damping: 32 } }}
            >
              {/* Lane head — rank chip + avatar + name. Scaled up in
                  projector mode so names read from the back of the room. */}
              <div className={`flex items-center mb-1.5 ${large ? "gap-3" : "gap-2"}`}>
                {/* Top three get medals; everyone else a numbered chip. */}
                {i < 3 ? (
                  <span className={`inline-flex items-center justify-center ${large ? "w-9 h-9 text-3xl" : "w-6 h-6 text-lg"}`} aria-label={`Rank ${i + 1}`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                  </span>
                ) : (
                  <span
                    className={`inline-flex items-center justify-center rounded-full font-black ${dark ? "bg-stone-700 text-stone-200" : "bg-stone-200 text-stone-600"} ${
                      large ? "w-9 h-9 text-lg" : "w-6 h-6 text-xs"
                    }`}
                  >
                    {i + 1}
                  </span>
                )}
                <span className={`flex items-center justify-center ${large ? "text-3xl" : "text-lg"}`}>
                  <QPAvatar value={e.avatar || "🦊"} iconSize={large ? 30 : 18} />
                </span>
                <span
                  className={`font-black truncate min-w-0 flex-1 ${dark ? "text-stone-100" : "text-stone-800"} ${
                    large ? "text-2xl sm:text-3xl" : "text-sm"
                  }`}
                  dir="auto"
                >
                  {e.nickname}
                </span>
              </div>

              {/* Track + fill — the race itself. Trophy sits at the
                  end of the leader's fill so it travels with whoever
                  is in front. */}
              <div
                className={`relative rounded-full overflow-hidden ${dark ? "bg-stone-800" : "bg-stone-100"} ${large ? "h-12" : "h-8"}`}
                style={gain ? { boxShadow: "0 0 0 2px rgba(16,185,129,0.55)" } : undefined}
              >
                <motion.div
                  layout
                  animate={{ width: `${pct}%` }}
                  transition={{ type: "spring", stiffness: 220, damping: 28 }}
                  className={`relative h-full rounded-full flex items-center justify-end text-white font-black shadow-md ${
                    large ? "px-5 text-2xl" : "px-3 text-sm"
                  } ${
                    isLeader
                      ? "bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-500 shadow-fuchsia-500/40"
                      : "bg-gradient-to-r from-fuchsia-400 to-pink-500 shadow-fuchsia-400/30"
                  }`}
                >
                  <span className={`tabular-nums ${large && isLeader ? "me-9" : large ? "me-2" : ""}`}>
                    <AnimatedScore value={e.score} />
                  </span>
                  {/* "+N" burst sits inside the fill so it rides with
                      the bar instead of floating above an empty lane. */}
                  <AnimatePresence>
                    {gain && (
                      <motion.span
                        key={gain.id}
                        initial={{ opacity: 0, y: 4, scale: 0.7 }}
                        animate={{ opacity: 1, y: -14, scale: 1 }}
                        exit={{ opacity: 0, y: -24 }}
                        className={`absolute -top-1 end-2 font-black text-emerald-500 whitespace-nowrap drop-shadow-sm ${large ? "text-base" : "text-xs"}`}
                      >
                        +{gain.amount} ✨
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
                {/* Trophy: anchored to the END of the leader's lane.
                    AnimatePresence handles the hand-off when a new
                    leader takes the front. */}
                <AnimatePresence>
                  {isLeader && (
                    <motion.div
                      key="trophy"
                      initial={{ opacity: 0, scale: 0.6, x: 4 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={{ type: "spring", stiffness: 380, damping: 22 }}
                      className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-white shadow-md ring-2 ring-amber-300 pointer-events-none ${
                        large ? "end-2 w-10 h-10" : "end-1.5 w-7 h-7"
                      }`}
                      aria-hidden
                    >
                      <Trophy size={large ? 20 : 14} className="text-amber-500 fill-amber-400" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
