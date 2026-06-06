import { describe, it, expect } from "vitest";
import { mergeLeaderboardSources } from "../hooks/useQuickPlaySocket";
import type { QpStudentEntry } from "../core/quickPlayProtocol";

/**
 * mergeLeaderboardSources is the client side of the Category Race cross-VM
 * fix: each Fly machine broadcasts only the students whose sockets landed on
 * it, tagged with a serverId. The client keeps the latest snapshot per VM and
 * renders their union (max score per clientId). These tests pin the merge
 * rules that keep a split class's podium correct.
 */
const mk = (clientId: string, score: number, lastSeen = 0): QpStudentEntry => ({
  clientId, nickname: clientId, avatar: "🦊", score, lastSeen,
});

describe("mergeLeaderboardSources", () => {
  it("unions students that live on different VMs", () => {
    const bySource = new Map<string, QpStudentEntry[]>([
      ["vm-a", [mk("alice", 30)]],
      ["vm-b", [mk("bob", 20)]],
    ]);
    const merged = mergeLeaderboardSources(bySource);
    expect(merged.map(e => e.clientId).sort()).toEqual(["alice", "bob"]);
  });

  it("keeps the highest score when the same student appears on two VMs (stale score=0 loses)", () => {
    // The round-owner VM scored bob to 40; bob's own VM still broadcasts the
    // pre-round 0. Max score wins, so the podium shows 40, not 0.
    const bySource = new Map<string, QpStudentEntry[]>([
      ["owner-vm", [mk("bob", 40)]],
      ["bobs-vm", [mk("bob", 0)]],
    ]);
    const merged = mergeLeaderboardSources(bySource);
    expect(merged).toHaveLength(1);
    expect(merged[0].score).toBe(40);
  });

  it("breaks score ties by most recently seen", () => {
    const bySource = new Map<string, QpStudentEntry[]>([
      ["vm-a", [mk("alice", 10, 100)]],
      ["vm-b", [mk("alice", 10, 200)]],
    ]);
    const merged = mergeLeaderboardSources(bySource);
    expect(merged[0].lastSeen).toBe(200);
  });

  it("drops a student once their VM stops broadcasting them (kick / leave removal)", () => {
    const bySource = new Map<string, QpStudentEntry[]>([
      ["vm-a", [mk("alice", 30)]],
      ["vm-b", []], // bob was kicked → his VM's next snapshot omits him
    ]);
    const merged = mergeLeaderboardSources(bySource);
    expect(merged.map(e => e.clientId)).toEqual(["alice"]);
  });

  it("is a no-op shape for the single-VM case", () => {
    const bySource = new Map<string, QpStudentEntry[]>([
      ["only-vm", [mk("alice", 30), mk("bob", 20)]],
    ]);
    const merged = mergeLeaderboardSources(bySource);
    expect(merged).toHaveLength(2);
  });
});
