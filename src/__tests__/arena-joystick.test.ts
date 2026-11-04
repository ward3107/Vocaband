import { describe, expect, it } from "vitest";
import { arenaStickStrength } from "../components/game/ArenaJoystick";

describe("arena joystick response", () => {
  it("ignores accidental movement and gives a controlled walking range", () => {
    expect(arenaStickStrength(0.05)).toBe(0);
    expect(arenaStickStrength(0.5)).toBeGreaterThan(0.2);
    expect(arenaStickStrength(0.5)).toBeLessThan(0.4);
    expect(arenaStickStrength(1)).toBe(1);
    expect(arenaStickStrength(2)).toBe(1);
  });
});
