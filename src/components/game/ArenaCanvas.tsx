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
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { motion } from "motion/react";
import { Lock, Check } from "lucide-react";
import QPAvatar from "../QPAvatar";
import {
  QP_ARENA_WIDTH,
  QP_ARENA_HEIGHT,
  QP_ARENA_SPEED_BOOST_MULT,
  QP_ARENA_MUD_SLOW_MULT,
  type QpArenaStatePayload,
  type QpArenaPickup,
  type QpStudentEntry,
} from "../../core/quickPlayProtocol";
import { arenaMapById } from "./arenaMaps";
import type { ArenaInputVector } from "./ArenaJoystick";

/** Local avatar speed in logical units/sec — tuned so crossing the arena
 *  takes ~4s: fast enough to feel like a chase, slow enough to steer.
 *  Scales with QP_ARENA_WIDTH (was 250 at 1000 wide) so the bigger world
 *  still crosses in ~4s. */
const SELF_SPEED = (QP_ARENA_WIDTH / 1000) * 250;
/** Easing factor for remote avatars (per frame at 60fps). */
const EASE_K = 0.2;
/** Leave a word's radius by this factor before auto-grab may re-fire. */
const REARM_FACTOR = 1.2;

/** The consumable medallions' face emoji (mud renders as a patch, not a pill). */
const PICKUP_EMOJI: Record<QpArenaPickup["kind"], string> = {
  speed: "⚡",
  star: "✨",
  double: "✌️",
  mud: "🌀",
};

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
  /** Scattered game elements (Speed Boost / Bonus Star / Double Points / Mud).
   *  Rendered in the same scaled world layer as words, so camera zoom +
   *  counter-scale apply identically. */
  pickups?: QpArenaPickup[];
  /** Auto-collect: fired once per consumable when the local avatar enters its
   *  radius (same discipline as onGrab). Mud is never collected. readOnly
   *  (teacher) never fires this. */
  onPickupCollect?: (pickupId: string, x: number, y: number) => void;
  /** Speed Boost: an epoch-ms timestamp until which the local avatar moves
   *  faster. The parent flips this when the collecting student grabs a ⚡; the
   *  canvas reads it per frame so the boost decays without a re-render. */
  speedBoostUntilRef?: RefObject<number>;
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
  /** Camera zoom. >1 enlarges the world and the view FOLLOWS the local
   *  avatar (the map scrolls as the player moves — "big map" feel). 1 keeps
   *  the whole map in view (the host projector, so the teacher sees everyone).
   *  Only the local player's view follows; readOnly ignores this. */
  zoom?: number;
  className?: string;
}

export default function ArenaCanvas({
  arena, positionsRef, leaderboard,
  selfClientId, inputRef, selfPosRef, onGrab,
  pickups = [], onPickupCollect, speedBoostUntilRef,
  readOnly = false, isPaused = false, fill = false, zoom = 1, className = "",
}: ArenaCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // The scaled/panned "world" layer (background + tokens + avatars). The RAF
  // loop writes its transform each frame to follow the local avatar.
  const worldRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
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
  // Tap-to-run target. State drives the highlight ring (taps are rare);
  // the ref mirror is what the 60fps loop reads.
  const [navTargetId, setNavTargetId] = useState<string | null>(null);
  const navTargetRef = useRef<string | null>(null);
  const setNavTarget = useCallback((id: string | null) => {
    if (navTargetRef.current === id) return;
    navTargetRef.current = id;
    setNavTargetId(id);
  }, []);

  // Mirror render-time data into refs so the RAF loop never closes over
  // stale props (and the effect doesn't restart on every word patch).
  const wordsRef = useRef(arena.words);
  useEffect(() => { wordsRef.current = arena.words; }, [arena.words]);
  const grabRadiusRef = useRef(arena.grabRadius);
  useEffect(() => { grabRadiusRef.current = arena.grabRadius; }, [arena.grabRadius]);
  const onGrabRef = useRef(onGrab);
  useEffect(() => { onGrabRef.current = onGrab; }, [onGrab]);
  // Pickups + their collect callback mirrored into refs so the RAF loop reads
  // the latest without restarting on every pickup churn (same as wordsRef).
  const pickupsRef = useRef(pickups);
  useEffect(() => { pickupsRef.current = pickups; }, [pickups]);
  const onPickupCollectRef = useRef(onPickupCollect);
  useEffect(() => { onPickupCollectRef.current = onPickupCollect; }, [onPickupCollect]);
  // Consumables the local player already collected this approach — re-armed
  // after leaving radius × REARM_FACTOR, exactly like attemptedRef for words.
  const pickupAttemptedRef = useRef(new Set<string>());

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
        // Effective speed = base × (Speed Boost active?) × (over a Mud patch?).
        // Both are pure client effects on the server-synced position; the
        // boost decays via its epoch-ms ref, mud applies while standing on it.
        let speed = SELF_SPEED;
        if (speedBoostUntilRef?.current && speedBoostUntilRef.current > Date.now()) {
          speed *= QP_ARENA_SPEED_BOOST_MULT;
        }
        const mudRadius = grabRadiusRef.current;
        for (const pk of pickupsRef.current) {
          if (pk.kind !== "mud") continue;
          if (Math.hypot(self.x - pk.pos.x, self.y - pk.pos.y) <= mudRadius) { speed *= QP_ARENA_MUD_SLOW_MULT; break; }
        }
        if (input && (input.dx !== 0 || input.dy !== 0)) {
          setNavTarget(null); // the joystick always overrides a tapped target
          self.x = Math.max(0, Math.min(QP_ARENA_WIDTH, self.x + input.dx * speed * dt));
          self.y = Math.max(0, Math.min(QP_ARENA_HEIGHT, self.y + input.dy * speed * dt));
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
            if (dist > 1) {
              const step = Math.min(dist, speed * dt);
              self.x += (ddx / dist) * step;
              self.y += (ddy / dist) * step;
            }
            if (dist <= grabRadiusRef.current) setNavTarget(null);
          }
        }
        if (selfPosRef?.current) {
          selfPosRef.current.x = self.x;
          selfPosRef.current.y = self.y;
        }
        const el = avatarElsRef.current.get(selfClientId);
        // Counter-scale by 1/zoom so the avatar keeps a constant on-screen
        // size while the camera enlarges the map underneath it.
        const ls = zoomRef.current > 1 ? 1 / zoomRef.current : 1;
        if (el) el.style.transform = `translate3d(${self.x * scale.x}px, ${self.y * scale.y}px, 0) translate(-50%, -50%) scale(${ls})`;

        // Camera: enlarge the world by `zoom` and pan so the local avatar
        // stays centred — the map scrolls under the player. Clamped to the
        // world edges so we never reveal blank space past the map.
        const z = zoomRef.current;
        const world = worldRef.current;
        const cont = containerRef.current;
        if (world && cont && z > 1) {
          const cw = cont.clientWidth, ch = cont.clientHeight;
          const sx = self.x * scale.x, sy = self.y * scale.y;
          const tx = Math.min(0, Math.max(cw - z * cw, cw / 2 - z * sx));
          const ty = Math.min(0, Math.max(ch - z * ch, ch / 2 - z * sy));
          world.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${z})`;
        }

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

        // Auto-collect consumables on contact — once per pickup per approach,
        // exactly like auto-grab. Mud is a hazard (handled by the speed factor
        // above), never collected.
        for (const pk of pickupsRef.current) {
          if (pk.kind === "mud") continue;
          const dist = Math.hypot(self.x - pk.pos.x, self.y - pk.pos.y);
          if (dist <= radius && !pickupAttemptedRef.current.has(pk.pickupId)) {
            pickupAttemptedRef.current.add(pk.pickupId);
            onPickupCollectRef.current?.(pk.pickupId, self.x, self.y);
          } else if (dist > radius * REARM_FACTOR) {
            pickupAttemptedRef.current.delete(pk.pickupId);
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
          const ls = zoomRef.current > 1 ? 1 / zoomRef.current : 1;
          el.style.transform = `translate3d(${cur.x * scale.x}px, ${cur.y * scale.y}px, 0) translate(-50%, -50%) scale(${ls})`;
        }
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [paused, readOnly, selfClientId, positionsRef, inputRef, selfPosRef, speedBoostUntilRef, setNavTarget]);

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

  // Teacher-chosen themed background, synced to every client via ARENA_STATE.
  // Painted as an <img> (object-cover) under a soft scrim so the bright
  // illustrations never drown out the word pills + avatars on top.
  const themedMap = arenaMapById(arena.mapId);

  return (
    <div
      ref={containerRef}
      dir="ltr" // coordinates are absolute — never mirrored for RTL
      className={`relative w-full ${fill ? "h-full" : ""} overflow-hidden rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-100 via-violet-50 to-fuchsia-100 shadow-lg shadow-indigo-500/20 ${className}`}
      style={{ ...(fill ? {} : { aspectRatio: `${QP_ARENA_WIDTH} / ${QP_ARENA_HEIGHT}` }), touchAction: "none" }}
    >
      {/* The camera "world" — scaled + panned as one layer by the RAF loop so
          the whole scene (map, tokens, avatars) follows the local player. */}
      <div ref={worldRef} className="absolute inset-0" style={{ transformOrigin: "0 0" }}>
      {themedMap && (
        <>
          <img
            src={themedMap.bg}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
          />
          {/* Scrim: keeps token/avatar contrast readable over any scene. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 z-0 bg-white/25" />
        </>
      )}

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
            // Compact pills so the themed map reads big and roomy ("zoom out"
            // look). The tap target stays fat via the p-4/-m-4 wrapper below.
            // inline-flex + w-max: the orange background must hug the word —
            // a plain flex box shrinks below its text near the map edge, so
            // long words spilled out of the pill ("half-background" look).
            className={`inline-flex w-max items-center gap-1 px-2.5 py-1 rounded-full font-black text-xs sm:text-sm whitespace-nowrap shadow-md transition-opacity ${
              w.state === "available"
                ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-amber-500/30"
                : w.state === "locked"
                  ? "bg-stone-400/80 text-white opacity-70"
                  : "bg-emerald-100 text-emerald-600 opacity-40"
            } ${targeted ? "ring-4 ring-fuchsia-400/80" : ""}`}
            dir="auto"
          >
            {w.state === "locked" && <Lock size={10} strokeWidth={3} />}
            {w.state === "answered" && <Check size={10} strokeWidth={3} />}
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
              // Counter-scale by 1/zoom: the pill keeps a constant on-screen
              // size while the camera enlarges the map under it.
              transform: `translate(-50%, -50%) scale(${zoom > 1 ? 1 / zoom : 1})`,
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

      {/* Scattered game elements — same scaled world layer + counter-scale as
          the word pills. Mud is a translucent brown patch (a hazard, no tap);
          consumables are floating emoji medallions auto-collected on contact. */}
      {pickups.map((pk) => {
        const counterScale = zoom > 1 ? 1 / zoom : 1;
        if (pk.kind === "mud") {
          // A soft brown blob sized to the grab radius (the slow zone), under
          // the tokens so a word on/near it stays readable. Non-interactive.
          const sizePct = (arena.grabRadius * 2 / QP_ARENA_WIDTH) * 100;
          return (
            <div
              key={pk.pickupId}
              aria-hidden
              className="pointer-events-none absolute z-[5] flex items-center justify-center rounded-full"
              style={{
                left: `${(pk.pos.x / QP_ARENA_WIDTH) * 100}%`,
                top: `${(pk.pos.y / QP_ARENA_HEIGHT) * 100}%`,
                width: `${sizePct}%`,
                aspectRatio: "1 / 1",
                transform: `translate(-50%, -50%) scale(${counterScale})`,
                background: "radial-gradient(circle, rgba(120,72,40,0.55) 0%, rgba(120,72,40,0.28) 60%, rgba(120,72,40,0) 100%)",
                filter: "blur(1px)",
              }}
            >
              <span className="text-xl sm:text-2xl opacity-80">{PICKUP_EMOJI.mud}</span>
            </div>
          );
        }
        return (
          <div
            key={pk.pickupId}
            aria-hidden
            className="pointer-events-none absolute z-[15]"
            style={{
              left: `${(pk.pos.x / QP_ARENA_WIDTH) * 100}%`,
              top: `${(pk.pos.y / QP_ARENA_HEIGHT) * 100}%`,
              transform: `translate(-50%, -50%) scale(${counterScale})`,
            }}
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className={`flex items-center justify-center rounded-full w-8 h-8 sm:w-10 sm:h-10 text-base sm:text-xl shadow-md backdrop-blur-sm ${
                pk.kind === "speed"
                  ? "bg-gradient-to-br from-amber-300 to-yellow-500 shadow-amber-500/40"
                  : pk.kind === "star"
                    ? "bg-gradient-to-br from-fuchsia-300 to-pink-500 shadow-pink-500/40"
                    : "bg-gradient-to-br from-emerald-300 to-teal-500 shadow-teal-500/40"
              }`}
            >
              {PICKUP_EMOJI[pk.kind]}
            </motion.div>
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
            {/* Student devices: small avatars so the followed map feels big.
                Teacher projector (readOnly, whole-map view): larger medallions
                so the class can see everyone moving from across the room. */}
            <div
              className={`flex items-center justify-center rounded-full backdrop-blur-sm shadow-md ${
                readOnly
                  ? "w-9 h-9 sm:w-12 sm:h-12 text-lg sm:text-2xl"
                  : "w-6 h-6 sm:w-8 sm:h-8 text-sm sm:text-lg"
              } ${
                isSelf
                  ? "bg-white/80 border-2 border-fuchsia-400 shadow-fuchsia-500/30"
                  : "bg-white/60 border border-white/80"
              }`}
            >
              <QPAvatar value={p.avatar} iconSize={readOnly ? 22 : 13} className="text-indigo-600" />
            </div>
            <span
              className={`mt-0.5 px-1.5 rounded-full bg-white/70 font-black text-stone-600 whitespace-nowrap truncate ${
                readOnly ? "text-[11px] sm:text-sm max-w-24" : "text-[8px] sm:text-[9px] max-w-16"
              }`}
            >
              {p.nickname}
            </span>
          </div>
        );
      })}
      </div>
    </div>
  );
}
