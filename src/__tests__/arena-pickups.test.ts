import { describe, it, expect } from "vitest";
import {
  QP_ARENA_PICKUP_KINDS,
  QP_ARENA_PICKUP_DEFAULTS,
  QP_ARENA_PICKUP_BONUS_POINTS,
  QP_ARENA_SPEED_BOOST_MS,
  QP_ARENA_SPEED_BOOST_MULT,
  QP_ARENA_MUD_SLOW_MULT,
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

  it("keeps the speed boost a speed-up and mud a slow-down", () => {
    expect(QP_ARENA_SPEED_BOOST_MULT).toBeGreaterThan(1);
    expect(QP_ARENA_MUD_SLOW_MULT).toBeGreaterThan(0);
    expect(QP_ARENA_MUD_SLOW_MULT).toBeLessThan(1);
    expect(QP_ARENA_SPEED_BOOST_MS).toBeGreaterThan(0);
  });

  it("keeps the bonus-star payout positive but modest vs answering a word", () => {
    expect(QP_ARENA_PICKUP_BONUS_POINTS).toBeGreaterThan(0);
    expect(QP_ARENA_PICKUP_BONUS_POINTS).toBeLessThanOrEqual(10);
  });
});
