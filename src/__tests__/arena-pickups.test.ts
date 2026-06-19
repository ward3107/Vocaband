import { describe, it, expect } from "vitest";
import {
  QP_ARENA_PICKUP_KINDS,
  QP_ARENA_PICKUP_DEFAULTS,
  QP_ARENA_PICKUP_BONUS_POINTS,
  QP_ARENA_SPEED_BOOST_MS,
  QP_ARENA_SPEED_BOOST_MULT,
  QP_ARENA_HURRICANE_STUN_MS,
  QP_ARENA_WIDTH,
  QP_ARENA_HEIGHT,
  QP_ARENA_DEFAULT_GRAB_RADIUS,
  QP_ARENA_DEFAULT_VISIBLE,
  QP_ARENA_MAX_WORDS,
  isValidArenaPickupKind,
} from "../core/quickPlayProtocol";

/**
 * Pins the Word Hunt Arena pickup contract shared by server.ts (scatter +
 * referee) and the client (ArenaCanvas render + effects). These are the
 * cheap invariants that keep the two sides from drifting — the live collect
 * path itself lives behind the socket layer and is exercised in play.
 */
describe("arena pickup contract", () => {
  it("has exactly the four kinds, each with a default spawn count", () => {
    expect([...QP_ARENA_PICKUP_KINDS]).toEqual(["speed", "star", "double", "mud"]);
    for (const kind of QP_ARENA_PICKUP_KINDS) {
      const n = QP_ARENA_PICKUP_DEFAULTS[kind];
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThan(0);
    }
  });

  it("validates kinds and rejects everything else", () => {
    for (const kind of QP_ARENA_PICKUP_KINDS) expect(isValidArenaPickupKind(kind)).toBe(true);
    for (const bad of ["", "fire", "SPEED", 1, null, undefined, {}]) {
      expect(isValidArenaPickupKind(bad)).toBe(false);
    }
  });

  it("keeps the speed boost a speed-up and the hurricane a real stun", () => {
    expect(QP_ARENA_SPEED_BOOST_MULT).toBeGreaterThan(1);
    expect(QP_ARENA_SPEED_BOOST_MS).toBeGreaterThan(0);
    // The hurricane ("mud") is now a COLLECTIBLE that stuns the collector —
    // it's no longer a passive slow-zone, so there's no slow multiplier and
    // the stun window must be a real, non-trivial freeze.
    expect(QP_ARENA_HURRICANE_STUN_MS).toBeGreaterThanOrEqual(1000);
  });

  it("keeps the bonus-star payout positive but modest vs answering a word", () => {
    expect(QP_ARENA_PICKUP_BONUS_POINTS).toBeGreaterThan(0);
    expect(QP_ARENA_PICKUP_BONUS_POINTS).toBeLessThanOrEqual(10);
  });
});

/**
 * Pins the "bigger world, show every word" contract. The whole picked batch
 * is placed on the map at once now (no visible/reserve split), so the default
 * on-map count must cover the full ceiling and the grab radius must stay tight
 * enough that a student visually stands ON a word before it opens.
 */
describe("arena world sizing", () => {
  it("keeps the 10:7 aspect on the enlarged world", () => {
    expect(QP_ARENA_WIDTH).toBe(2800);
    expect(QP_ARENA_HEIGHT).toBe(1960);
    // 10:7 → width / height === 10 / 7.
    expect(QP_ARENA_WIDTH / QP_ARENA_HEIGHT).toBeCloseTo(10 / 7, 5);
  });

  it("shows every word at once (default visible covers the whole batch)", () => {
    // No reserves: the default on-map count is the full ceiling so all picked
    // words are placed at start (the server sets the real count = batch size).
    expect(QP_ARENA_DEFAULT_VISIBLE).toBeGreaterThanOrEqual(QP_ARENA_MAX_WORDS);
  });

  it("uses a walk-onto-the-word grab radius (tight, overlap-only)", () => {
    // Tight enough that the avatar must overlap the token, not merely be near
    // it — well under 100 logical units on the big map.
    expect(QP_ARENA_DEFAULT_GRAB_RADIUS).toBeGreaterThanOrEqual(30);
    expect(QP_ARENA_DEFAULT_GRAB_RADIUS).toBeLessThanOrEqual(70);
  });
});
