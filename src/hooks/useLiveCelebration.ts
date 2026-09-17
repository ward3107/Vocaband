/**
 * useLiveCelebration — the two "big moments" of a live game, turned into
 * game-show confetti on the teacher's projector:
 *
 *   • useCelebrateOnJoin(count)      — a pop when the waiting room grows
 *                                      (a student joins)
 *   • useCelebrateOnNewLeader(id)    — a burst when a NEW student takes #1
 *
 * Both fire-and-forget via celebrate(), skip the initial mount (so the board
 * doesn't erupt just from first populating), and no-op under useReducedMotion
 * — the app-wide contract for confetti/particle effects. The `enabled` gate
 * lets callers restrict the effect to the projected (presenting) view so the
 * teacher's control-panel preview stays calm.
 *
 * Kept as plain hooks (not baked into the components) so every live game that
 * reuses LobbyRoster / CategoryRacePodium gets the same celebration for free.
 */
import { useEffect, useRef } from "react";
import { celebrate } from "../utils/celebrate";
import { playVictory } from "../utils/raceSfx";
import { useReducedMotion } from "./useReducedMotion";

/**
 * Fire a small confetti pop when `count` grows. A whole class flooding in at
 * once coalesces into a single burst (600 ms window) instead of thirty, and
 * a student dropping never celebrates.
 */
export function useCelebrateOnJoin(count: number, enabled = true): void {
  const reduced = useReducedMotion();
  const prev = useRef<number | null>(null);
  const lastFire = useRef(0);
  useEffect(() => {
    const before = prev.current;
    prev.current = count; // track even when disabled, so toggling on later
    if (before === null || count <= before) return; // skip mount + drops
    if (!enabled || reduced) return;
    const now = Date.now();
    if (now - lastFire.current < 600) return; // coalesce join floods
    lastFire.current = now;
    celebrate("small");
  }, [count, enabled, reduced]);
}

/**
 * Fire a confetti burst + a triumphant victory sting when `leaderId` changes
 * to a new student — the big "we have a new leader!" beat. Only the initial
 * mount is skipped, so the first student to top the board still gets their
 * moment. The sound has its own mute (raceSfx / "vb-race-muted") and is gated
 * on presenting only, not reduced-motion — that governs the visual half.
 */
export function useCelebrateOnNewLeader(leaderId: string | undefined, enabled = true): void {
  const reduced = useReducedMotion();
  const prev = useRef<string | null | undefined>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = leaderId; // track even when disabled
    if (before === null) return; // skip initial mount
    if (!leaderId || leaderId === before) return; // no leader / unchanged
    if (!enabled) return;
    playVictory(); // self-mutes; no-ops until the teacher's start tap unlocks audio
    if (!reduced) celebrate("normal"); // confetti is the visual half
  }, [leaderId, enabled, reduced]);
}
