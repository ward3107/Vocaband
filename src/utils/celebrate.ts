/**
 * celebrate() — fires a random celebration from a deep pool of confetti
 * patterns, so students see a different effect each time they nail an
 * answer. Replaces the repetitive single-burst everywhere else in the
 * app. Uses the lazy-loaded canvas-confetti to stay out of the initial
 * bundle.
 *
 * The helper is fire-and-forget: call `celebrate()` on every correct
 * answer without awaiting. Internally it picks one of ~25 named
 * patterns uniformly at random.
 *
 * Optionally pass `intensity`:
 *   - "small"  — subtle spark (good for mid-game streak beats)
 *   - "normal" (default) — the full catalogue
 *   - "big"    — heavier patterns for finishing a mode / personal best
 */

import { loadConfetti } from './lazyLoad';

type ConfettiFn = (opts: Record<string, unknown>) => void;

export type CelebrationIntensity = 'small' | 'normal' | 'big';

// A named pattern — each picks its own configuration and may schedule
// multiple shots. Every pattern receives the lazy-loaded confetti fn.
type Pattern = (fire: ConfettiFn) => void;

// ── Pattern pool ───────────────────────────────────────────────────────────

const classicBurst: Pattern = (fire) => {
  fire({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
};

const widePop: Pattern = (fire) => {
  fire({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
};

const doubleCannons: Pattern = (fire) => {
  fire({ particleCount: 80, spread: 60, angle: 60, origin: { x: 0, y: 0.7 } });
  fire({ particleCount: 80, spread: 60, angle: 120, origin: { x: 1, y: 0.7 } });
};

const fireworks: Pattern = (fire) => {
  const shots = 4;
  for (let i = 0; i < shots; i++) {
    const delay = i * 180;
    setTimeout(() => {
      fire({
        particleCount: 40,
        spread: 360,
        startVelocity: 30,
        origin: { x: 0.2 + Math.random() * 0.6, y: 0.3 + Math.random() * 0.2 },
      });
    }, delay);
  }
};

const rainFromTop: Pattern = (fire) => {
  fire({
    particleCount: 200,
    startVelocity: 10,
    spread: 180,
    ticks: 400,
    gravity: 0.6,
    origin: { x: 0.5, y: -0.1 },
    scalar: 0.8,
  });
};

const starburst: Pattern = (fire) => {
  fire({ particleCount: 60, spread: 360, startVelocity: 40, scalar: 1.2, origin: { y: 0.5 } });
};

const leftRightSequence: Pattern = (fire) => {
  fire({ particleCount: 60, spread: 55, angle: 60, origin: { x: 0, y: 0.6 } });
  setTimeout(() => fire({ particleCount: 60, spread: 55, angle: 120, origin: { x: 1, y: 0.6 } }), 200);
};

const gentleDrift: Pattern = (fire) => {
  fire({ particleCount: 50, spread: 80, startVelocity: 20, gravity: 0.4, ticks: 300, origin: { y: 0.4 } });
};

const pinata: Pattern = (fire) => {
  fire({ particleCount: 120, spread: 360, startVelocity: 25, origin: { y: 0.5 } });
};

const goldRain: Pattern = (fire) => {
  fire({
    particleCount: 120,
    spread: 140,
    colors: ['#FFD700', '#FFC107', '#FFEB3B', '#FFE082', '#FFAB00'],
    origin: { y: 0.5 },
  });
};

const rainbowBurst: Pattern = (fire) => {
  fire({
    particleCount: 140,
    spread: 90,
    colors: ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'],
    origin: { y: 0.55 },
  });
};

const pinkHearts: Pattern = (fire) => {
  fire({
    particleCount: 80,
    spread: 100,
    scalar: 1.4,
    colors: ['#EC4899', '#F472B6', '#F9A8D4', '#FBCFE8', '#FB7185'],
    origin: { y: 0.5 },
    shapes: ['circle'],
  });
};

const starsLTR: Pattern = (fire) => {
  fire({
    particleCount: 80,
    spread: 70,
    startVelocity: 40,
    angle: 60,
    origin: { x: 0.1, y: 0.7 },
    scalar: 1.2,
  });
};

const starsRTL: Pattern = (fire) => {
  fire({
    particleCount: 80,
    spread: 70,
    startVelocity: 40,
    angle: 120,
    origin: { x: 0.9, y: 0.7 },
    scalar: 1.2,
  });
};

const tightZap: Pattern = (fire) => {
  fire({ particleCount: 30, spread: 20, startVelocity: 55, origin: { y: 0.65 } });
};

const zigzag: Pattern = (fire) => {
  fire({ particleCount: 50, spread: 45, angle: 80, origin: { x: 0.2, y: 0.6 } });
  setTimeout(() => fire({ particleCount: 50, spread: 45, angle: 100, origin: { x: 0.8, y: 0.6 } }), 150);
  setTimeout(() => fire({ particleCount: 50, spread: 45, angle: 80, origin: { x: 0.35, y: 0.55 } }), 300);
  setTimeout(() => fire({ particleCount: 50, spread: 45, angle: 100, origin: { x: 0.65, y: 0.55 } }), 450);
};

const heavyRain: Pattern = (fire) => {
  fire({
    particleCount: 180,
    spread: 140,
    startVelocity: 25,
    gravity: 1.2,
    ticks: 200,
    origin: { x: 0.5, y: -0.05 },
    scalar: 0.9,
  });
};

const emeraldWave: Pattern = (fire) => {
  fire({
    particleCount: 100,
    spread: 120,
    colors: ['#10B981', '#34D399', '#6EE7B7', '#059669', '#22D3EE'],
    origin: { y: 0.55 },
  });
};

const crimsonBlast: Pattern = (fire) => {
  fire({
    particleCount: 120,
    spread: 90,
    colors: ['#DC2626', '#EF4444', '#F87171', '#EF4444', '#B91C1C'],
    startVelocity: 45,
    origin: { y: 0.6 },
  });
};

const threeShotSpread: Pattern = (fire) => {
  fire({ particleCount: 80, spread: 60, origin: { x: 0.25, y: 0.6 } });
  setTimeout(() => fire({ particleCount: 80, spread: 60, origin: { x: 0.5, y: 0.55 } }), 200);
  setTimeout(() => fire({ particleCount: 80, spread: 60, origin: { x: 0.75, y: 0.6 } }), 400);
};

const topDownBurst: Pattern = (fire) => {
  fire({ particleCount: 120, spread: 180, gravity: 0.9, origin: { x: 0.5, y: 0.1 } });
};

const sideSweepLeft: Pattern = (fire) => {
  fire({ particleCount: 100, spread: 70, angle: 45, startVelocity: 50, origin: { x: 0, y: 0.5 } });
};

const sideSweepRight: Pattern = (fire) => {
  fire({ particleCount: 100, spread: 70, angle: 135, startVelocity: 50, origin: { x: 1, y: 0.5 } });
};

const slowFloat: Pattern = (fire) => {
  fire({ particleCount: 60, spread: 100, startVelocity: 15, gravity: 0.3, ticks: 400, scalar: 1.5, origin: { y: 0.5 } });
};

const smallSpark: Pattern = (fire) => {
  fire({ particleCount: 20, spread: 30, origin: { y: 0.7 } });
};

// ── Catalogues keyed by intensity ──────────────────────────────────────────

const SMALL_PATTERNS: Pattern[] = [smallSpark, tightZap, gentleDrift];

const NORMAL_PATTERNS: Pattern[] = [
  classicBurst,
  widePop,
  doubleCannons,
  starburst,
  leftRightSequence,
  gentleDrift,
  pinata,
  goldRain,
  rainbowBurst,
  pinkHearts,
  starsLTR,
  starsRTL,
  tightZap,
  emeraldWave,
  crimsonBlast,
  sideSweepLeft,
  sideSweepRight,
  slowFloat,
  zigzag,
];

const BIG_PATTERNS: Pattern[] = [
  fireworks,
  rainFromTop,
  zigzag,
  heavyRain,
  threeShotSpread,
  topDownBurst,
  pinata,
  goldRain,
  rainbowBurst,
];

const pickFrom = <T,>(pool: T[]): T => pool[Math.floor(Math.random() * pool.length)];

/**
 * Fire a random celebration. Returns immediately; confetti plays async.
 */
export const celebrate = (intensity: CelebrationIntensity = 'normal'): void => {
  const pool =
    intensity === 'small' ? SMALL_PATTERNS :
    intensity === 'big' ? BIG_PATTERNS :
    NORMAL_PATTERNS;
  const pattern = pickFrom(pool);
  loadConfetti().then((mod: unknown) => {
    const c = (mod as { default?: ConfettiFn }).default ?? (mod as ConfettiFn);
    pattern(c);
  }).catch(() => {/* confetti optional — ignore load failure */});
};
