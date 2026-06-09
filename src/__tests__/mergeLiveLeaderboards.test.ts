import { describe, it, expect } from "vitest";
import { mergeLiveLeaderboards } from "../hooks/useLiveChallengeSocket";
import type { LeaderboardEntry } from "../core/types";

/**
 * mergeLiveLeaderboards is the client side of the Live Challenge cross-VM fix:
 * each Fly machine broadcasts only the students whose sockets landed on it,
 * tagged with a serverId (LEADERBOARD_UPDATE_V2). The teacher keeps the latest
 * snapshot per VM and renders their union (highest effective score per uid).
 * These tests pin the merge rules that keep a split class's podium correct.
 */
const mk = (base: number, current: number): LeaderboardEntry => ({
  name: "x",
  baseScore: base,
  currentGameScore: current,
});

describe("mergeLiveLeaderboards", () => {
  it("unions students that live on different VMs", () => {
    const bySource = new Map<string, Record<string, LeaderboardEntry>>([
      ["vm:a", { alice: mk(0, 30) }],
      ["vm:b", { bob: mk(0, 20) }],
    ]);
    expect(Object.keys(mergeLiveLeaderboards(bySource)).sort()).toEqual(["alice", "bob"]);
  });

  it("keeps the highest effective score when the same uid appears on two VMs", () => {
    // Student opened a second tab on another VM whose snapshot is still 0;
    // the real score (base+current) must win, not the stale 0.
    const bySource = new Map<string, Record<string, LeaderboardEntry>>([
      ["vm:owner", { bob: mk(100, 40) }],
      ["vm:stale", { bob: mk(100, 0) }],
    ]);
    const merged = mergeLiveLeaderboards(bySource);
    expect(Object.keys(merged)).toEqual(["bob"]);
    expect(merged.bob.currentGameScore).toBe(40);
  });

  it("drops a student once their VM stops broadcasting them (leave / empty snapshot)", () => {
    const bySource = new Map<string, Record<string, LeaderboardEntry>>([
      ["vm:a", { alice: mk(0, 30) }],
      ["vm:b", {}], // class emptied on VM-b → its V2 snapshot is now {}
    ]);
    expect(Object.keys(mergeLiveLeaderboards(bySource))).toEqual(["alice"]);
  });

  it("is a no-op shape for the single-VM / single-source case", () => {
    const bySource = new Map<string, Record<string, LeaderboardEntry>>([
      ["vm:only", { alice: mk(0, 30), bob: mk(0, 20) }],
    ]);
    expect(Object.keys(mergeLiveLeaderboards(bySource))).toHaveLength(2);
  });

  it("returns empty when there are no sources", () => {
    expect(mergeLiveLeaderboards(new Map())).toEqual({});
  });
});
