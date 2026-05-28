/**
 * CategoryRacePodium — the live, competitive scoreboard for the Category
 * Race host screen. The top 3 stand on gold/silver/bronze pedestals (the
 * leader gets a bouncing crown + glow); everyone else rides a spring-
 * reordered list. Scores count up and a "+N" burst flashes the moment a
 * student earns points, so the room feels every lead change in real time.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Crown } from "lucide-react";

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

const PODIUM = [
  { ring: "ring-amber-300", bar: "from-amber-300 to-yellow-500", medal: "🥇", h: 96, av: "w-[68px] h-[68px] text-4xl" },
  { ring: "ring-slate-300", bar: "from-slate-200 to-slate-400", medal: "🥈", h: 70, av: "w-14 h-14 text-3xl" },
  { ring: "ring-orange-300", bar: "from-orange-300 to-amber-600", medal: "🥉", h: 56, av: "w-14 h-14 text-3xl" },
];

export default function CategoryRacePodium({ entries, emptyText }: CategoryRacePodiumProps) {
  // Detect score increases between renders to fire a "+N" burst + glow.
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
    return <p className="text-sm text-stone-400 font-semibold py-10 text-center">{emptyText}</p>;
  }

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  // Render the top 3 in visual order: 2nd, 1st, 3rd (leader centre + tallest).
  const order = [top3[1], top3[0], top3[2]];

  return (
    <div>
      <div className="flex items-end justify-center gap-2 sm:gap-3 pt-7 pb-1">
        {order.map(e => {
          if (!e) return null;
          const rank = top3.indexOf(e);
          const st = PODIUM[rank];
          const gain = gains.get(e.clientId);
          return (
            <div key={e.clientId} className="flex-1 max-w-[120px] flex flex-col items-center">
              {rank === 0 && (
                <motion.div
                  animate={{ y: [0, -7, 0] }}
                  transition={{ repeat: Infinity, duration: 1.3, ease: "easeInOut" }}
                  className="mb-0.5"
                >
                  <Crown size={26} className="text-amber-400 fill-amber-400 drop-shadow" />
                </motion.div>
              )}
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 460, damping: 18 }}
                className="relative"
              >
                <div
                  className={`relative inline-flex items-center justify-center ${st.av} rounded-full bg-white ring-4 ${st.ring} shadow-lg`}
                  style={rank === 0 ? { boxShadow: "0 0 0 4px rgba(251,191,36,0.25), 0 10px 24px -8px rgba(245,158,11,0.6)" } : undefined}
                >
                  {e.avatar || "🦊"}
                  <span className="absolute -bottom-1 -end-1 text-lg">{st.medal}</span>
                </div>
                <AnimatePresence>
                  {gain && (
                    <motion.span
                      key={gain.id}
                      initial={{ opacity: 0, y: 4, scale: 0.7 }}
                      animate={{ opacity: 1, y: -16, scale: 1 }}
                      exit={{ opacity: 0, y: -26 }}
                      className="absolute -top-1 left-1/2 -translate-x-1/2 text-sm font-black text-emerald-500 whitespace-nowrap"
                    >
                      +{gain.amount} ✨
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
              <div className="mt-1.5 w-full text-center">
                <div className="font-black text-stone-800 text-sm truncate" dir="auto">{e.nickname}</div>
                <div className="font-black text-fuchsia-600 text-lg leading-none"><AnimatedScore value={e.score} /></div>
              </div>
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 22 }}
                style={{ height: st.h, transformOrigin: "bottom" }}
                className={`mt-2 w-full rounded-t-xl bg-gradient-to-b ${st.bar} shadow-inner flex items-start justify-center pt-1.5`}
              >
                <span className="font-black text-white/90 text-xl drop-shadow">{rank + 1}</span>
              </motion.div>
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <ul className="mt-4 space-y-2">
          <AnimatePresence initial={false}>
            {rest.map((e, i) => {
              const gain = gains.get(e.clientId);
              return (
                <motion.li
                  key={e.clientId}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ layout: { type: "spring", stiffness: 500, damping: 32 } }}
                  className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 bg-stone-50"
                  style={gain ? { boxShadow: "0 0 0 2px rgba(16,185,129,0.55)" } : undefined}
                >
                  <span className="w-6 text-center font-black text-stone-400">{i + 4}</span>
                  <span className="text-xl">{e.avatar || "🦊"}</span>
                  <span className="flex-1 min-w-0 font-black text-stone-800 truncate" dir="auto">{e.nickname}</span>
                  <span className="font-black text-fuchsia-600"><AnimatedScore value={e.score} /></span>
                  <AnimatePresence>
                    {gain && (
                      <motion.span
                        key={gain.id}
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute end-10 text-xs font-black text-emerald-500"
                      >
                        +{gain.amount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
