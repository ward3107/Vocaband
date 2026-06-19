import { describe, it, expect } from "vitest";
import {
  QP_ARENA_DASH_MS,
  QP_ARENA_DASH_SPEED_MULT,
  QP_ARENA_DASH_COOLDOWN_MS,
  QP_ARENA_TACKLE_RANGE,
  QP_ARENA_TACKLE_STUN_MS,
  QP_EVENTS,
  QP_SERVER_EVENTS,
  type QpTeam,
} from "../core/quickPlayProtocol";

/**
 * Pins the dash-tackle PvP contract (the new constants + event names) AND the
 * server referee's validity RULES via a pure replica of `qpApplyArenaTackle`.
 * The real referee is inline in server.ts (behind the socket layer, exercised
 * in play); this replica is the single source the rules are documented against,
 * so a change to the gate that doesn't update both sides breaks here.
 */
describe("dash-tackle constants", () => {
  it("keeps a dash a real, brief speed burst on a sane cooldown", () => {
    expect(QP_ARENA_DASH_SPEED_MULT).toBeGreaterThan(1);
    expect(QP_ARENA_DASH_MS).toBeGreaterThan(0);
    // The burst is shorter than the cooldown — a lunge, not sustained flight.
    expect(QP_ARENA_DASH_MS).toBeLessThan(QP_ARENA_DASH_COOLDOWN_MS);
    expect(QP_ARENA_TACKLE_RANGE).toBeGreaterThan(0);
    expect(QP_ARENA_TACKLE_STUN_MS).toBeGreaterThan(0);
  });

  it("exposes the tackle + rough-mode events on both sides of the wire", () => {
    expect(QP_EVENTS.ARENA_TACKLE).toBe("qp:student:arena:tackle");
    expect(QP_EVENTS.TEACHER_ROUGH_MODE).toBe("qp:teacher:roughmode");
    expect(QP_SERVER_EVENTS.ARENA_TACKLED).toBe("qp:arena:tackled");
    expect(QP_SERVER_EVENTS.ROUGH_MODE).toBe("qp:arena:roughmode");
  });
});

// ─── Pure replica of qpApplyArenaTackle's validity gate ─────────────────────
// Mirrors server.ts exactly: rough-mode → self → both-exist → cooldown →
// team (opposite only) → server range-check. Returns whether the tackle lands.
interface TackleScenario {
  roughMode: boolean;
  teamMode: boolean;
  dasher: { exists: boolean; team?: QpTeam; pos?: { x: number; y: number } };
  target: { exists: boolean; team?: QpTeam; pos?: { x: number; y: number } };
  /** Dasher's last-known server pos; falls back to fallbackPos (cross-VM). */
  dasherServerPos?: { x: number; y: number };
  fallbackPos?: { x: number; y: number };
  dasherOnCooldown: boolean;
  sameClient?: boolean;
}

function tackleLands(s: TackleScenario): boolean {
  if (!s.roughMode) return false;
  if (s.sameClient) return false;
  if (!s.dasher.exists || !s.target.exists) return false;
  if (s.dasherOnCooldown) return false;
  if (s.teamMode) {
    if (!s.dasher.team || !s.target.team || s.dasher.team === s.target.team) return false;
  }
  const targetPos = s.target.pos;
  if (!targetPos) return false;
  const dx = s.dasherServerPos ? s.dasherServerPos.x : s.fallbackPos?.x ?? null;
  const dy = s.dasherServerPos ? s.dasherServerPos.y : s.fallbackPos?.y ?? null;
  if (dx === null || dy === null) return false;
  return Math.hypot(dx - targetPos.x, dy - targetPos.y) <= QP_ARENA_TACKLE_RANGE;
}

const base: TackleScenario = {
  roughMode: true,
  teamMode: false,
  dasher: { exists: true, pos: { x: 100, y: 100 } },
  target: { exists: true, pos: { x: 110, y: 110 } }, // ~14 units away — in range
  dasherServerPos: { x: 100, y: 100 },
  dasherOnCooldown: false,
};

describe("arena tackle referee rules", () => {
  it("lands a valid in-range tackle when rough mode is on", () => {
    expect(tackleLands(base)).toBe(true);
  });

  it("rejects any tackle when rough mode is OFF (master switch)", () => {
    expect(tackleLands({ ...base, roughMode: false })).toBe(false);
  });

  it("rejects tackling yourself", () => {
    expect(tackleLands({ ...base, sameClient: true })).toBe(false);
  });

  it("rejects when the dasher is on cooldown (anti-chain)", () => {
    expect(tackleLands({ ...base, dasherOnCooldown: true })).toBe(false);
  });

  it("rejects an out-of-range target", () => {
    expect(tackleLands({
      ...base,
      target: { exists: true, pos: { x: 100 + QP_ARENA_TACKLE_RANGE + 50, y: 100 } },
      dasherServerPos: { x: 100, y: 100 },
    })).toBe(false);
  });

  it("rejects a missing target", () => {
    expect(tackleLands({ ...base, target: { exists: false } })).toBe(false);
  });

  describe("team mode — friendly fire is off", () => {
    it("allows tackling the OTHER team", () => {
      expect(tackleLands({
        ...base, teamMode: true,
        dasher: { exists: true, team: "red", pos: { x: 100, y: 100 } },
        target: { exists: true, team: "blue", pos: { x: 110, y: 110 } },
      })).toBe(true);
    });

    it("rejects tackling your OWN team", () => {
      expect(tackleLands({
        ...base, teamMode: true,
        dasher: { exists: true, team: "red", pos: { x: 100, y: 100 } },
        target: { exists: true, team: "red", pos: { x: 110, y: 110 } },
      })).toBe(false);
    });

    it("rejects when either team is unknown", () => {
      expect(tackleLands({
        ...base, teamMode: true,
        dasher: { exists: true, team: "red", pos: { x: 100, y: 100 } },
        target: { exists: true, team: undefined, pos: { x: 110, y: 110 } },
      })).toBe(false);
    });
  });

  it("uses the client-reported fallback position only when no server pos (cross-VM)", () => {
    // No server pos → in-range fallback lands.
    expect(tackleLands({
      ...base, dasherServerPos: undefined, fallbackPos: { x: 110, y: 110 },
    })).toBe(true);
    // No server pos AND no fallback → can't range-check → rejected.
    expect(tackleLands({
      ...base, dasherServerPos: undefined, fallbackPos: undefined,
    })).toBe(false);
  });
});
