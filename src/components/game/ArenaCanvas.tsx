/**
 * ArenaCanvas — the Word Hunt Arena map. DOM + CSS transforms on purpose
 * (no PixiJS/Phaser): ~38 nodes max, GPU-composited translate3d, cheapest
 * path on low-end school Android (design §2).
 *
 * Two render paths coexist:
 *   - React renders the NODES (word tokens, avatar medallions) — these
 *     change rarely (word lifecycle, roster churn).
 *   - One requestAnimationFrame loop moves avatars by writing transforms
 *     through refs, bypassing React entirely on the 60fps path. Remote
 *     avatars ease toward the 10/sec snapshot targets
 *     (current += (target − current) · 0.2); the LOCAL avatar integrates
 *     joystick input immediately (client prediction) so steering feels
 *     instant despite the 10/sec uplink.
 */
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { motion } from "motion/react";
import { Lock, Check } from "lucide-react";
import QPAvatar from "../QPAvatar";
import {
  QP_ARENA_WIDTH,
  QP_ARENA_HEIGHT,
  type QpArenaStatePayload,
  type QpStudentEntry,
} from "../../core/quickPlayProtocol";
import type { ArenaInputVector } from "./ArenaJoystick";

/** Local avatar speed in logical units/sec — tuned so crossing the arena
 *  takes ~4s: fast enough to feel like a chase, slow enough to steer. */
const SELF_SPEED = 250;
/** Easing factor for remote avatars (per frame at 60fps). */
const EASE_K = 0.2;
/** Leave a word's radius by this factor before auto-grab may re-fire. */
const REARM_FACTOR = 1.2;

interface ArenaCanvasProps {
  arena: QpArenaStatePayload;
  /** Live snapshot targets from useQuickPlaySocket — read per frame. */
  positionsRef: RefObject<Map<string, { x: number; y: number }>>;
  /** Names + avatars for everyone on the map (snapshots carry ids only). */
  leaderboard: QpStudentEntry[];
  /** The local player. Omit for the host projector (readOnly). */
  selfClientId?: string;
  /** Joystick/WASD vector — integrated each frame for the local avatar. */
  inputRef?: RefObject<ArenaInputVector>;
  /** The canvas writes the local avatar's position here every frame; the
   *  parent's 10/sec send loop reads it (decoupled from the RAF rate). */
  selfPosRef?: RefObject<{ x: number; y: number }>;
  /** Auto-grab: fired once per approach when the local avatar enters an
   *  available word's grab radius. */
  onGrab?: (wordId: string, x: number, y: number) => void;
  /** Tap-to-grab: word tokens become buttons. The server still referees
   *  range, so tapping a far word answers with the "get closer" denial —
   *  which doubles as the mechanic's teaching moment. */
  onWordTap?: (wordId: string) => void;
  /** Host projector: no joystick, no prediction, no grabbing. */
  readOnly?: boolean;
  /** Buzzer open — freeze movement + sends (battery + focus). */
  isPaused?: boolean;
  /** Fill the parent box instead of locking the 10:7 world aspect.
   *  Portrait phones rendered a 10:7 letterbox at ~39% of the viewport;
   *  filling uses the whole screen at the cost of anisotropic scale —
   *  positions are mapped per-axis (scaleRef.x ≠ scaleRef.y), which the
   *  transform path already supports, and the grab radius is checked in
   *  world units so gameplay is unaffected. */
  fill?: boolean;
  className?: string;
}

export default function ArenaCanvas({
  arena, positionsRef, leaderboard,
  selfClientId, inputRef, selfPosRef, onGrab, onWordTap,
  readOnly = false, isPaused = false, fill = false, className = "",
}: ArenaCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Pixels-per-logical-unit, refreshed by the ResizeObserver. A ref (not
  // state) because the RAF loop is the only consumer.
  const scaleRef = useRef({ x: 1, y: 1 });
  const avatarElsRef = useRef(new Map<string, HTMLDivElement>());
  // Smoothed display position per avatar — eased toward the snapshot target.
  const displayRef = useRef(new Map<string, { x: number; y: number }>());
  const selfRef = useRef<{ x: number; y: number } | null>(null);
  // Words the local player already attempted this approach — re-armed only
  // after leaving radius × REARM_FACTOR, so one pass can't spam the referee.
  const attemptedRef = useRef(new Set<string>());

  // Mirror render-time data into refs so the RAF loop never closes over
  // stale props (and the effect doesn't restart on every word patch).
  const wordsRef = useRef(arena.words);
  useEffect(() => { wordsRef.current = arena.words; }, [arena.words]);
  const grabRadiusRef = useRef(arena.grabRadius);
  useEffect(() => { grabRadiusRef.current = arena.grabRadius; }, [arena.grabRadius]);
  const onGrabRef = useRef(onGrab);
  useEffect(() => { onGrabRef.current = onGrab; }, [onGrab]);

  // Roster: leaderboard (live, covers late joiners) unioned with the
  // ARENA_STATE positions (covers the instant before the first broadcast).
  const players = useMemo(() => {
    const byId = new Map<string, { clientId: string; nickname: string; avatar: string }>();
    for (const p of arena.positions) byId.set(p.clientId, { clientId: p.clientId, nickname: p.nickname, avatar: p.avatar });
    for (const e of leaderboard) byId.set(e.clientId, { clientId: e.clientId, nickname: e.nickname, avatar: e.avatar });
    return [...byId.values()];
  }, [arena.positions, leaderboard]);

  // Hidden tab pauses everything alongside the explicit isPaused prop.
  const [tabHidden, setTabHidden] = useState(false);
  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  const paused = isPaused || tabHidden;

  // Track the container's pixel size — transforms are written in pixels,
  // positions live in logical units.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      scaleRef.current = { x: r.width / QP_ARENA_WIDTH, y: r.height / QP_ARENA_HEIGHT };
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ─── The single RAF loop ────────────────────────────────────────────
  useEffect(() => {
    if (paused) return; // effect teardown cancelled the previous loop
    let raf = 0;
    let lastTs = performance.now();

    const frame = (ts: number) => {
      const dt = Math.min(0.1, (ts - lastTs) / 1000); // clamp tab-jank jumps
      lastTs = ts;
      const scale = scaleRef.current;

      // Local avatar — client prediction from the joystick vector.
      if (!readOnly && selfClientId) {
        if (!selfRef.current) {
          const seeded = positionsRef.current?.get(selfClientId);
          selfRef.current = seeded
            ? { ...seeded }
            : { x: QP_ARENA_WIDTH / 2, y: QP_ARENA_HEIGHT / 2 };
        }
        const self = selfRef.current;
        const input = inputRef?.current;
        if (input && (input.dx !== 0 || input.dy !== 0)) {
          self.x = Math.max(0, Math.min(QP_ARENA_WIDTH, self.x + input.dx * SELF_SPEED * dt));
          self.y = Math.max(0, Math.min(QP_ARENA_HEIGHT, self.y + input.dy * SELF_SPEED * dt));
        }
        if (selfPosRef?.current) {
          selfPosRef.current.x = self.x;
          selfPosRef.current.y = self.y;
        }
        const el = avatarElsRef.current.get(selfClientId);
        if (el) el.style.transform = `translate3d(${self.x * scale.x}px, ${self.y * scale.y}px, 0) translate(-50%, -50%)`;

        // Auto-grab on contact — once per word per approach.
        const radius = grabRadiusRef.current;
        for (const w of wordsRef.current) {
          const dist = Math.hypot(self.x - w.pos.x, self.y - w.pos.y);
          if (w.state === "available" && dist <= radius && !attemptedRef.current.has(w.wordId)) {
            attemptedRef.current.add(w.wordId);
            onGrabRef.current?.(w.wordId, self.x, self.y);
          } else if (dist > radius * REARM_FACTOR) {
            attemptedRef.current.delete(w.wordId);
          }
        }
      }

      // Remote avatars — ease toward the latest snapshot target.
      const targets = positionsRef.current;
      if (targets) {
        for (const [clientId, target] of targets) {
          if (clientId === selfClientId) continue; // prediction owns self
          const el = avatarElsRef.current.get(clientId);
          if (!el) continue;
          let cur = displayRef.current.get(clientId);
          if (!cur) { cur = { ...target }; displayRef.current.set(clientId, cur); }
          cur.x += (target.x - cur.x) * EASE_K;
          cur.y += (target.y - cur.y) * EASE_K;
          el.style.transform = `translate3d(${cur.x * scale.x}px, ${cur.y * scale.y}px, 0) translate(-50%, -50%)`;
        }
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [paused, readOnly, selfClientId, positionsRef, inputRef, selfPosRef]);

  return (
    <div
      ref={containerRef}
      dir="ltr" // coordinates are absolute — never mirrored for RTL
      className={`relative w-full ${fill ? "h-full" : ""} overflow-hidden rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-100 via-violet-50 to-fuchsia-100 shadow-lg shadow-indigo-500/20 ${className}`}
      style={{ ...(fill ? {} : { aspectRatio: `${QP_ARENA_WIDTH} / ${QP_ARENA_HEIGHT}` }), touchAction: "none" }}
    >
      {/* Word tokens — React-rendered (lifecycle changes are rare). When the
          parent wires onWordTap, available tokens are real buttons: kids'
          first instinct is to tap the word, not to know about the invisible
          grab radius. */}
      {arena.words.map((w) => {
        const tappable = !readOnly && !!onWordTap && w.state === "available";
        const pill = (
          <motion.div
            animate={w.state === "available" ? { y: [0, -5, 0] } : { y: 0 }}
            transition={w.state === "available" ? { repeat: Infinity, duration: 2.2, ease: "easeInOut" } : undefined}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-black text-xs sm:text-sm whitespace-nowrap shadow-md transition-opacity ${
              w.state === "available"
                ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-amber-500/30"
                : w.state === "locked"
                  ? "bg-stone-400/80 text-white opacity-70"
                  : "bg-emerald-100 text-emerald-600 opacity-40"
            }`}
            dir="auto"
          >
            {w.state === "locked" && <Lock size={12} strokeWidth={3} />}
            {w.state === "answered" && <Check size={12} strokeWidth={3} />}
            {w.label}
          </motion.div>
        );
        return (
          <div
            key={w.wordId}
            className="absolute z-10"
            style={{
              left: `${(w.pos.x / QP_ARENA_WIDTH) * 100}%`,
              top: `${(w.pos.y / QP_ARENA_HEIGHT) * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {tappable ? (
              <button
                type="button"
                onClick={() => onWordTap(w.wordId)}
                aria-label={w.label}
                // p-2 + -m-2 grows the hit box past the visual pill without
                // shifting layout — fingertip-sized targets on the map.
                className="block p-2 -m-2"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                {pill}
              </button>
            ) : (
              pill
            )}
          </div>
        );
      })}

      {/* Avatars — positioned exclusively by the RAF loop via refs. */}
      {players.map((p) => {
        const isSelf = p.clientId === selfClientId;
        return (
          <div
            key={p.clientId}
            ref={(el) => {
              if (el) avatarElsRef.current.set(p.clientId, el);
              else avatarElsRef.current.delete(p.clientId);
            }}
            className="absolute left-0 top-0 z-20 flex flex-col items-center"
            style={{ willChange: "transform", transform: "translate3d(-200px, -200px, 0)" }}
          >
            <div
              className={`flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full backdrop-blur-sm shadow-md text-xl sm:text-2xl ${
                isSelf
                  ? "bg-white/80 border-2 border-fuchsia-400 shadow-fuchsia-500/30"
                  : "bg-white/60 border border-white/80"
              }`}
            >
              <QPAvatar value={p.avatar} iconSize={20} className="text-indigo-600" />
            </div>
            <span className="mt-0.5 px-1.5 rounded-full bg-white/70 text-[9px] sm:text-[10px] font-black text-stone-600 whitespace-nowrap max-w-20 truncate">
              {p.nickname}
            </span>
          </div>
        );
      })}
    </div>
  );
}
