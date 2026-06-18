/**
 * ArenaCanvas — the Word Hunt Arena map. DOM + CSS transforms on purpose
 * (no PixiJS/Phaser): ~38 nodes max, GPU-composited translate3d, cheapest
 * path on low-end school Android (design §2).
 *
 * Three render paths coexist:
 *   - React renders the NODES (continents background, word tokens, avatar
 *     medallions, off-screen arrows) — these change rarely (word lifecycle,
 *     roster churn).
 *   - One requestAnimationFrame loop moves avatars by writing transforms
 *     through refs, bypassing React entirely on the 60fps path. Remote
 *     avatars ease toward the 10/sec snapshot targets
 *     (current += (target − current) · 0.2); the LOCAL avatar integrates
 *     joystick input immediately (client prediction) so steering feels
 *     instant despite the 10/sec uplink.
 *   - The SAME loop drives the camera: for a student it pans/zooms a single
 *     "world layer" div so the player stays centered and the stylized world
 *     map scrolls beneath them (the bounded world reads as endless because
 *     you only ever see a window of it). The host projector keeps Z=1 and an
 *     identity camera, so it still shows the whole map at once.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { motion } from "motion/react";
import { Lock, Check, Navigation } from "lucide-react";
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
/** Student camera zoom. >1 shows a window of the world (it scrolls as you
 *  move) so the bounded map feels far bigger. Word/avatar chrome is
 *  counter-scaled by 1/zoom (below) so the camera magnifies *space*, not
 *  label size — they stay a constant, readable size on a phone regardless
 *  of zoom. The host projector ignores this (whole-map view). */
const CAMERA_ZOOM = 1.45;
/** On-screen size of word/avatar chrome on the student camera, on top of
 *  the 1/zoom counter-scale. <1 shrinks the bubbles (less screen clutter on
 *  a phone); 1 = same size as the host projector. Single knob for "how big
 *  are the bubbles on the phone". */
const CHROME_SCALE = 0.78;
/** Inset (px) from the viewport edge where an off-screen word's pointer
 *  arrow parks — kept clear of the HUD/joystick. */
const ARROW_EDGE_MARGIN = 26;

/** Fog of war (student only): available words are crystal-clear within
 *  FOG_CLEAR world units of you and fade + blur out to FOG_FAR, so the map
 *  reads as a hunt — you discover words as you roam (the edge arrows still
 *  point the way). Distances are in world units, checked in the RAF loop. */
const FOG_CLEAR = 300;
const FOG_FAR = 560;
const FOG_MIN_OPACITY = 0.28;

/** Terrain zones make navigation part of the challenge. Movement is
 *  client-authoritative (the question still gates the points), so this is
 *  pure client physics in the RAF loop — no protected backend changes.
 *    mountain — impassable; you slide around its edge.
 *    mud      — slows you to MUD_FACTOR while inside.
 *    boost    — speeds you to BOOST_FACTOR ("ocean current") while inside.
 *  Circles in world units; placed to dodge the seeded word spots so every
 *  word stays reachable. (When the world goes server-driven, these get
 *  seeded alongside the words instead of hard-coded.) */
type TerrainKind = "mountain" | "mud" | "boost";
interface TerrainZone { kind: TerrainKind; x: number; y: number; r: number; }
const TERRAIN: TerrainZone[] = [
  { kind: "mountain", x: 180, y: 185, r: 58 },
  { kind: "mountain", x: 740, y: 120, r: 64 },
  { kind: "mud", x: 380, y: 470, r: 70 },
  { kind: "mud", x: 560, y: 505, r: 66 },
  { kind: "boost", x: 430, y: 280, r: 52 },
  { kind: "boost", x: 780, y: 400, r: 52 },
];
const MUD_FACTOR = 0.45;
const BOOST_FACTOR = 1.7;

/** Speed multiplier at a world point — first mud/boost zone wins. */
function terrainSpeedFactor(x: number, y: number): number {
  for (const z of TERRAIN) {
    if (z.kind === "mountain") continue;
    if (Math.hypot(x - z.x, y - z.y) <= z.r) return z.kind === "mud" ? MUD_FACTOR : BOOST_FACTOR;
  }
  return 1;
}

/** Push a point out to the nearest mountain edge so avatars can't enter
 *  (they slide along the rim instead of sticking). */
function pushOutOfMountains(x: number, y: number): { x: number; y: number } {
  for (const z of TERRAIN) {
    if (z.kind !== "mountain") continue;
    const d = Math.hypot(x - z.x, y - z.y);
    if (d < z.r) {
      if (d < 1e-3) { x = z.x + z.r; }
      else { x = z.x + ((x - z.x) / d) * z.r; y = z.y + ((y - z.y) / d) * z.r; }
    }
  }
  return { x, y };
}

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
   *  available word's grab radius. Also makes word tokens tappable —
   *  tapping a word in range grabs it; tapping a far word sets it as the
   *  run target and the avatar auto-runs there until the grab fires
   *  (kids tap the word, not the joystick — the server's range referee
   *  used to deny those taps outright, which read as "clicking is broken"). */
  onGrab?: (wordId: string, x: number, y: number) => void;
  /** Host projector: no joystick, no prediction, no grabbing, no camera. */
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
  selfClientId, inputRef, selfPosRef, onGrab,
  readOnly = false, isPaused = false, fill = false, className = "",
}: ArenaCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // The single child that holds the map, words and avatars; the RAF loop
  // pans+zooms it as one unit for the student camera (identity for the host).
  const worldRef = useRef<HTMLDivElement | null>(null);
  // Pixels-per-logical-unit, refreshed by the ResizeObserver. A ref (not
  // state) because the RAF loop is the only consumer.
  const scaleRef = useRef({ x: 1, y: 1 });
  // Viewport pixel size — the camera needs it every frame to center the
  // player and to clamp the pan to the world edges.
  const sizeRef = useRef({ w: 1, h: 1 });
  const avatarElsRef = useRef(new Map<string, HTMLDivElement>());
  // Off-screen pointer arrows: the wrapper (parked at the viewport edge) and
  // its chevron (rotated toward the word), updated each frame via refs.
  const arrowElsRef = useRef(new Map<string, HTMLDivElement>());
  const arrowIconElsRef = useRef(new Map<string, HTMLDivElement>());
  // Word token wrappers — the RAF loop dims/blurs them by distance (fog).
  const wordElsRef = useRef(new Map<string, HTMLDivElement>());
  // Smoothed display position per avatar — eased toward the snapshot target.
  const displayRef = useRef(new Map<string, { x: number; y: number }>());
  const selfRef = useRef<{ x: number; y: number } | null>(null);
  // Words the local player already attempted this approach — re-armed only
  // after leaving radius × REARM_FACTOR, so one pass can't spam the referee.
  const attemptedRef = useRef(new Set<string>());
  // Tap-to-run target. State drives the highlight ring (taps are rare);
  // the ref mirror is what the 60fps loop reads.
  const [navTargetId, setNavTargetId] = useState<string | null>(null);
  const navTargetRef = useRef<string | null>(null);
  const setNavTarget = useCallback((id: string | null) => {
    if (navTargetRef.current === id) return;
    navTargetRef.current = id;
    setNavTargetId(id);
  }, []);

  // The student gets a follow-camera; the host projector sees the whole map.
  const cameraOn = !readOnly && !!selfClientId;
  const zoom = cameraOn ? CAMERA_ZOOM : 1;
  // Counter-scale for chrome (word pills, avatars) so the camera zoom grows
  // the visible *space* but not label size — keeps them phone-readable. The
  // extra CHROME_SCALE shrinks the bubbles a touch more on the student view.
  const invZoom = 1 / zoom;
  const chromeScale = cameraOn ? invZoom * CHROME_SCALE : 1;

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

  // Available words drive the off-screen arrows (locked/answered need none).
  const availableWords = useMemo(
    () => arena.words.filter(w => w.state === "available"),
    [arena.words],
  );

  // Hidden tab pauses everything alongside the explicit isPaused prop.
  const [tabHidden, setTabHidden] = useState(false);
  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  const paused = isPaused || tabHidden;
  // Don't resume a stale run after the buzzer closes — the hunt restarts
  // from wherever the player chooses next.
  useEffect(() => { if (paused) setNavTarget(null); }, [paused, setNavTarget]);

  // Track the container's pixel size — transforms are written in pixels,
  // positions live in logical units.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      scaleRef.current = { x: r.width / QP_ARENA_WIDTH, y: r.height / QP_ARENA_HEIGHT };
      sizeRef.current = { w: r.width, h: r.height };
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
        // Resolve a desired unit direction from joystick OR tap-to-run,
        // then move once through the terrain physics (so both input paths
        // get mud/boost/mountain handling identically).
        let dirX = 0, dirY = 0;
        const input = inputRef?.current;
        if (input && (input.dx !== 0 || input.dy !== 0)) {
          setNavTarget(null); // the joystick always overrides a tapped target
          dirX = input.dx; dirY = input.dy;
        } else if (navTargetRef.current) {
          // Tap-to-run: head straight for the tapped word; the auto-grab
          // below fires the moment its radius is entered.
          const target = wordsRef.current.find(w => w.wordId === navTargetRef.current);
          if (!target || target.state !== "available") {
            setNavTarget(null); // grabbed by someone else mid-run — stop
          } else {
            const ddx = target.pos.x - self.x;
            const ddy = target.pos.y - self.y;
            const dist = Math.hypot(ddx, ddy);
            if (dist > 1) { dirX = ddx / dist; dirY = ddy / dist; }
            if (dist <= grabRadiusRef.current) setNavTarget(null);
          }
        }
        if (dirX !== 0 || dirY !== 0) {
          // Mud slows, boost ("ocean current") speeds, mountains block.
          const mult = terrainSpeedFactor(self.x, self.y);
          const nx = Math.max(0, Math.min(QP_ARENA_WIDTH, self.x + dirX * SELF_SPEED * mult * dt));
          const ny = Math.max(0, Math.min(QP_ARENA_HEIGHT, self.y + dirY * SELF_SPEED * mult * dt));
          const resolved = pushOutOfMountains(nx, ny);
          self.x = resolved.x; self.y = resolved.y;
        }
        if (selfPosRef?.current) {
          selfPosRef.current.x = self.x;
          selfPosRef.current.y = self.y;
        }
        const el = avatarElsRef.current.get(selfClientId);
        if (el) el.style.transform = `translate3d(${self.x * scale.x}px, ${self.y * scale.y}px, 0) translate(-50%, -50%) scale(${chromeScale})`;

        // Auto-grab on contact — once per word per approach. The same
        // distance also drives the fog: nearby words are clear, far ones
        // fade + blur so the map plays as a hunt.
        const radius = grabRadiusRef.current;
        for (const w of wordsRef.current) {
          const dist = Math.hypot(self.x - w.pos.x, self.y - w.pos.y);
          if (w.state === "available" && dist <= radius && !attemptedRef.current.has(w.wordId)) {
            attemptedRef.current.add(w.wordId);
            onGrabRef.current?.(w.wordId, self.x, self.y);
          } else if (dist > radius * REARM_FACTOR) {
            attemptedRef.current.delete(w.wordId);
          }

          const wEl = wordElsRef.current.get(w.wordId);
          if (wEl) {
            if (w.state === "available") {
              const t = Math.max(0, Math.min(1, (dist - FOG_CLEAR) / (FOG_FAR - FOG_CLEAR)));
              wEl.style.opacity = String(1 - (1 - FOG_MIN_OPACITY) * t);
              wEl.style.filter = t > 0 ? `blur(${(t * 2.5).toFixed(2)}px)` : "";
            } else {
              // locked/answered keep their own styling — clear any fog.
              wEl.style.opacity = "";
              wEl.style.filter = "";
            }
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
          el.style.transform = `translate3d(${cur.x * scale.x}px, ${cur.y * scale.y}px, 0) translate(-50%, -50%) scale(${chromeScale})`;
        }
      }

      // ─── Camera: pan+zoom the world layer so self stays centered ──────
      // World-layer coords match the container box (words use %, avatars use
      // px·scale inside it), so the camera is one transform on the wrapper:
      // a translate that re-centers on the player, clamped to the world edges
      // so we never pan past the map into blank space.
      const W = sizeRef.current.w, H = sizeRef.current.h;
      const world = worldRef.current;
      if (world) {
        if (cameraOn && selfRef.current) {
          const sx = selfRef.current.x * scale.x;
          const sy = selfRef.current.y * scale.y;
          // tx so (tx + zoom·sx) === W/2, clamped to [W−zoom·W, 0].
          const tx = Math.max(W - zoom * W, Math.min(0, W / 2 - zoom * sx));
          const ty = Math.max(H - zoom * H, Math.min(0, H / 2 - zoom * sy));
          world.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${zoom})`;

          // Off-screen arrows: where does each available word land on screen?
          const cx = W / 2, cy = H / 2;
          const hx = W / 2 - ARROW_EDGE_MARGIN, hy = H / 2 - ARROW_EDGE_MARGIN;
          for (const w of wordsRef.current) {
            const wrap = arrowElsRef.current.get(w.wordId);
            if (!wrap) continue;
            if (w.state !== "available") { wrap.style.opacity = "0"; continue; }
            const screenX = tx + zoom * (w.pos.x * scale.x);
            const screenY = ty + zoom * (w.pos.y * scale.y);
            const onScreen =
              screenX >= ARROW_EDGE_MARGIN && screenX <= W - ARROW_EDGE_MARGIN &&
              screenY >= ARROW_EDGE_MARGIN && screenY <= H - ARROW_EDGE_MARGIN;
            if (onScreen) { wrap.style.opacity = "0"; continue; }
            const dx = screenX - cx, dy = screenY - cy;
            const ang = Math.atan2(dy, dx);
            // Park on the viewport-edge rectangle along the ray to the word.
            const s = Math.min(hx / (Math.abs(dx) || 1e-3), hy / (Math.abs(dy) || 1e-3));
            const ex = cx + dx * s, ey = cy + dy * s;
            wrap.style.opacity = "1";
            wrap.style.transform = `translate3d(${ex}px, ${ey}px, 0) translate(-50%, -50%)`;
            const icon = arrowIconElsRef.current.get(w.wordId);
            // Navigation glyph points up by default → +90° to align with 0rad (east).
            if (icon) icon.style.transform = `rotate(${ang + Math.PI / 2}rad)`;
          }
        } else {
          world.style.transform = "none";
        }
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [paused, readOnly, selfClientId, positionsRef, inputRef, selfPosRef, setNavTarget, cameraOn, zoom, chromeScale]);

  // Tap = grab when in range, otherwise run there (auto-grab on arrival).
  const handleWordTap = useCallback((wordId: string) => {
    const self = selfRef.current;
    const word = wordsRef.current.find(w => w.wordId === wordId);
    if (!word || word.state !== "available") return;
    if (self && Math.hypot(self.x - word.pos.x, self.y - word.pos.y) <= grabRadiusRef.current) {
      attemptedRef.current.add(wordId);
      onGrabRef.current?.(wordId, self.x, self.y);
      return;
    }
    setNavTarget(wordId);
  }, [setNavTarget]);

  return (
    <div
      ref={containerRef}
      dir="ltr" // coordinates are absolute — never mirrored for RTL
      className={`relative w-full ${fill ? "h-full" : ""} overflow-hidden rounded-3xl border border-sky-200/60 shadow-lg shadow-sky-500/20 ${className}`}
      style={{ ...(fill ? {} : { aspectRatio: `${QP_ARENA_WIDTH} / ${QP_ARENA_HEIGHT}` }), touchAction: "none" }}
    >
      {/* World layer — map + words + avatars move together under the camera.
          transform-origin top-left so the camera math (translate + scale from
          0,0) is exact. */}
      <div
        ref={worldRef}
        className="absolute inset-0"
        style={{ transformOrigin: "0 0", willChange: cameraOn ? "transform" : undefined }}
      >
        <WorldMapBackground />

        {/* Terrain zones — mountains block, mud slows, currents boost. Static
            decorative shapes; the RAF physics above reads the same data. */}
        {TERRAIN.map((z, i) => {
          const style = {
            left: `${(z.x / QP_ARENA_WIDTH) * 100}%`,
            top: `${(z.y / QP_ARENA_HEIGHT) * 100}%`,
            width: `${((z.r * 2) / QP_ARENA_WIDTH) * 100}%`,
            height: `${((z.r * 2) / QP_ARENA_HEIGHT) * 100}%`,
            transform: "translate(-50%, -50%)",
          } as const;
          const look =
            z.kind === "mountain" ? "bg-stone-500/30 border-2 border-stone-500/50"
            : z.kind === "mud" ? "bg-amber-800/25 border-2 border-dashed border-amber-700/40"
            : "bg-cyan-300/30 border-2 border-dashed border-cyan-400/60";
          const glyph = z.kind === "mountain" ? "⛰️" : z.kind === "mud" ? "🐌" : "⚡";
          return (
            <div key={`terrain-${i}`} className="absolute z-[5]" style={style}>
              <div className={`flex h-full w-full items-center justify-center rounded-full ${look}`}>
                <span className="text-2xl sm:text-3xl opacity-80 select-none">{glyph}</span>
              </div>
            </div>
          );
        })}

        {/* Word tokens — React-rendered (lifecycle changes are rare). On the
            student side, available tokens are real buttons: kids' first
            instinct is to tap the word, not to know about the invisible
            grab radius — so a tap runs the avatar there. */}
        {arena.words.map((w) => {
          const tappable = !readOnly && !!onGrab && w.state === "available";
          const targeted = w.wordId === navTargetId && w.state === "available";
          const pill = (
            <motion.div
              animate={w.state === "available" ? { y: [0, -5, 0] } : { y: 0 }}
              transition={w.state === "available" ? { repeat: Infinity, duration: 2.2, ease: "easeInOut" } : undefined}
              className={`flex items-center gap-1 px-4 py-2.5 rounded-full font-black text-base sm:text-lg whitespace-nowrap shadow-md transition-opacity ${
                w.state === "available"
                  ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-amber-500/30 ring-2 ring-white/70"
                  : w.state === "locked"
                    ? "bg-stone-400/80 text-white opacity-70"
                    : "bg-emerald-100 text-emerald-600 opacity-40"
              } ${targeted ? "ring-4 ring-fuchsia-400/80" : ""}`}
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
              ref={(el) => {
                if (el) wordElsRef.current.set(w.wordId, el);
                else wordElsRef.current.delete(w.wordId);
              }}
              className="absolute z-10"
              style={{
                left: `${(w.pos.x / QP_ARENA_WIDTH) * 100}%`,
                top: `${(w.pos.y / QP_ARENA_HEIGHT) * 100}%`,
                transform: `translate(-50%, -50%) scale(${chromeScale})`,
              }}
            >
              {tappable ? (
                <button
                  type="button"
                  onClick={() => handleWordTap(w.wordId)}
                  aria-label={w.label}
                  // p-4 + -m-4 grows the hit box well past the visual pill
                  // without shifting layout — a fat fingertip target on the map
                  // (kids kept missing the small pill on phones).
                  className="block p-4 -m-4"
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

      {/* Off-screen word arrows — viewport-space overlay (NOT in the camera
          layer, so they sit at the screen edge). One per available word; the
          RAF loop parks each on the edge nearest its word and rotates the
          chevron toward it. Student camera only. */}
      {cameraOn && availableWords.map((w) => (
        <div
          key={w.wordId}
          ref={(el) => {
            if (el) arrowElsRef.current.set(w.wordId, el);
            else arrowElsRef.current.delete(w.wordId);
          }}
          className="absolute left-0 top-0 z-30 flex flex-col items-center pointer-events-none"
          style={{ opacity: 0, transform: "translate3d(-200px, -200px, 0)", willChange: "transform, opacity" }}
        >
          <div
            ref={(el) => {
              if (el) arrowIconElsRef.current.set(w.wordId, el);
              else arrowIconElsRef.current.delete(w.wordId);
            }}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-white shadow-md shadow-amber-500/40 ring-2 ring-white/80"
          >
            <Navigation size={14} strokeWidth={3} className="fill-white" />
          </div>
          <span className="mt-0.5 max-w-16 truncate px-1.5 rounded-full bg-white/85 text-[8px] font-black text-amber-700 whitespace-nowrap">
            {w.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Tree spots on the map (world units) — [x, y, scale]. */
const MAP_TREES: [number, number, number][] = [
  [175, 300, 1.05], [150, 338, 0.9], [200, 342, 0.95], [173, 378, 0.8],
  [300, 500, 1.0], [332, 522, 1.1], [276, 528, 0.85],
  [770, 345, 0.95], [802, 362, 0.85], [700, 600, 0.8],
];
/** Mountain spots on the map (world units) — [x, y, scale]. */
const MAP_MTNS: [number, number, number][] = [[250, 285, 1.25], [198, 318, 0.85], [712, 585, 0.7]];

/**
 * WorldMapBackground — the illustrated "style A" world map as one static
 * inline SVG: ocean with depth gradient + waves + a boat, landmasses that
 * cast a soft shadow (so they read as raised) with sandy beaches and a
 * shallow-water ring, forests, snow-capped mountains, a river, and a gentle
 * vignette. preserveAspectRatio "none" stretches it to the world box so it
 * lines up 1:1 with word/avatar logical coords. Decorative + static: zero
 * per-frame cost, no external assets (keeps the low-end-Android budget).
 */
function WorldMapBackground() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox={`0 0 ${QP_ARENA_WIDTH} ${QP_ARENA_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="arena-ocean" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7ed0ee" />
          <stop offset="55%" stopColor="#4eb6e6" />
          <stop offset="100%" stopColor="#2f9fd8" />
        </linearGradient>
        <radialGradient id="arena-glow" cx="42%" cy="28%" r="85%">
          <stop offset="0%" stopColor="#bdeaf8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#bdeaf8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="arena-land" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9be88f" />
          <stop offset="100%" stopColor="#5fc269" />
        </linearGradient>
        <radialGradient id="arena-vig" cx="50%" cy="45%" r="78%">
          <stop offset="62%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#0b3a52" stopOpacity="0.22" />
        </radialGradient>
        <filter id="arena-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="11" floodColor="#0a3147" floodOpacity="0.32" />
        </filter>
        <g id="arena-tree">
          <rect x="-3" y="2" width="6" height="13" rx="2" fill="#7a4a22" />
          <circle cx="0" cy="-7" r="14" fill="#2f8f4e" />
          <circle cx="-8" cy="0" r="10" fill="#37a059" />
          <circle cx="8" cy="-1" r="10" fill="#37a059" />
          <circle cx="-3" cy="-10" r="8" fill="#54bd72" />
        </g>
        <g id="arena-mtn">
          <path d="M-46 36 L0 -44 L46 36 Z" fill="#8b94a0" />
          <path d="M0 -44 L18 0 L0 8 L-14 -6 Z" fill="#aeb6c2" />
          <path d="M0 -44 L13 -16 L0 -10 L-10 -22 Z" fill="#f4f8fc" />
          <path d="M-46 36 L0 -44 L-8 36 Z" fill="#717b88" fillOpacity="0.55" />
        </g>
      </defs>

      {/* Ocean + light glow */}
      <rect x="0" y="0" width={QP_ARENA_WIDTH} height={QP_ARENA_HEIGHT} fill="url(#arena-ocean)" />
      <rect x="0" y="0" width={QP_ARENA_WIDTH} height={QP_ARENA_HEIGHT} fill="url(#arena-glow)" />

      {/* Waves */}
      <g stroke="#ffffff" strokeOpacity="0.3" strokeWidth="3" fill="none" strokeLinecap="round">
        {[[120, 110], [560, 130], [620, 470], [150, 560], [880, 520], [470, 250]].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y} q10 -8 20 0 q10 8 20 0`} />
        ))}
      </g>

      {/* Sailboat */}
      <g transform="translate(905,135)">
        <path d="M-16 6 L16 6 L10 16 L-10 16 Z" fill="#b5651d" />
        <rect x="-1" y="-22" width="2" height="28" fill="#6b4423" />
        <path d="M1 -20 L16 2 L1 2 Z" fill="#ffffff" />
      </g>

      {/* Landmasses — shadowed sand (raised look) + shallow ring + grass */}
      <g filter="url(#arena-shadow)">
        <path d="M70 140 C 230 90, 380 150, 400 300 C 440 460, 360 580, 230 600 C 110 610, 50 500, 55 380 C 30 270, 40 190, 70 140 Z" fill="#f6e4b0" />
        <ellipse cx="780" cy="360" rx="150" ry="115" fill="#f6e4b0" />
        <ellipse cx="700" cy="600" rx="110" ry="74" fill="#f6e4b0" />
      </g>
      <g fill="none" stroke="#bfeaf6" strokeWidth="10" strokeOpacity="0.5">
        <path d="M70 140 C 230 90, 380 150, 400 300 C 440 460, 360 580, 230 600 C 110 610, 50 500, 55 380 C 30 270, 40 190, 70 140 Z" />
        <ellipse cx="780" cy="360" rx="150" ry="115" />
        <ellipse cx="700" cy="600" rx="110" ry="74" />
      </g>
      <g fill="url(#arena-land)">
        <path d="M95 165 C 235 120, 365 175, 384 300 C 420 450, 348 558, 232 576 C 124 586, 72 488, 76 380 C 54 280, 66 210, 95 165 Z" />
        <ellipse cx="780" cy="360" rx="124" ry="92" />
        <ellipse cx="700" cy="600" rx="86" ry="54" />
      </g>

      {/* River on the left continent */}
      <path d="M180 170 C 210 290, 150 370, 220 460 C 270 530, 210 585, 250 600" fill="none" stroke="#5bc7ef" strokeWidth="16" strokeLinecap="round" />
      <path d="M180 170 C 210 290, 150 370, 220 460 C 270 530, 210 585, 250 600" fill="none" stroke="#9fe2f6" strokeWidth="6" strokeLinecap="round" strokeOpacity="0.8" />

      {/* Mountains + forests */}
      {MAP_MTNS.map(([x, y, s], i) => (
        <use key={`m${i}`} href="#arena-mtn" transform={`translate(${x},${y}) scale(${s})`} />
      ))}
      {MAP_TREES.map(([x, y, s], i) => (
        <use key={`t${i}`} href="#arena-tree" transform={`translate(${x},${y}) scale(${s})`} />
      ))}

      {/* Gentle vignette for depth */}
      <rect x="0" y="0" width={QP_ARENA_WIDTH} height={QP_ARENA_HEIGHT} fill="url(#arena-vig)" />
    </svg>
  );
}
