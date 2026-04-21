/**
 * useStructure — Phase 1 of the "build something meaningful" system.
 *
 * Each student earns pieces of a persistent creation (garden / city /
 * rocket / castle) by hitting specific LEARNING ACHIEVEMENTS.  Phase 1
 * is intentionally localStorage-only — no schema migration, no RPC,
 * ship fast, validate, then upgrade to DB-backed in Phase 2.
 *
 * Unlock events (Phase 1):
 *   * mastered_5_words   — tracked as "5 high-quality games" (score >=
 *                          80), rough proxy for word mastery; Phase 2
 *                          will wire the real word-mastery ledger.
 *   * perfect_assignment — score === 100 on a single game.
 *   * streak_7           — crossed a new 7-day streak multiple.
 *
 * Caller contract:
 *   * Pass the student's uid so state is per-user.
 *   * Call `reportGameResult(score, streak)` from the finish-game path
 *     AFTER xp + streak have been updated.  Returns the list of newly
 *     unlocked parts (callers can fire celebrate(), show a toast, etc).
 *   * Use `chooseKind(k)` exactly once on first dashboard load (the
 *     picker modal drives this).
 *   * `parts` is the persisted list of earned parts (order = unlock time).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  STRUCTURE_PARTS,
  STRUCTURE_WORDS_PER_EVENT,
  type StructureKind,
  type StructurePart,
  type UnlockEvent,
} from '../constants/game';

const STORAGE_KEY = (uid: string) => `vocaband_structure_${uid}_v1`;

interface PersistedStructure {
  kind: StructureKind | null;
  /** Earned parts in the order they were unlocked. */
  earned: Array<{ key: string; at: string }>;
  /** Per-event counters — one is bumped when the event fires, used to */
  /** map the Nth firing to the Nth part of that event type.           */
  counts: Record<UnlockEvent, number>;
  /** Running count of high-score games since the last mastered_5_words */
  /** unlock fired. When this hits STRUCTURE_WORDS_PER_EVENT we fire.   */
  gamesSinceMasteryEvent: number;
  /** Highest streak the student has ever reached. Used to dedupe the  */
  /** streak_7 event — we fire once per 7-day increment.               */
  highestStreakUnlocked: number;
}

const EMPTY: PersistedStructure = {
  kind: null,
  earned: [],
  counts: { mastered_5_words: 0, perfect_assignment: 0, streak_7: 0 },
  gamesSinceMasteryEvent: 0,
  highestStreakUnlocked: 0,
};

const readPersisted = (uid: string): PersistedStructure => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(uid));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<PersistedStructure>;
    return {
      kind: parsed.kind ?? null,
      earned: parsed.earned ?? [],
      counts: {
        mastered_5_words: parsed.counts?.mastered_5_words ?? 0,
        perfect_assignment: parsed.counts?.perfect_assignment ?? 0,
        streak_7: parsed.counts?.streak_7 ?? 0,
      },
      gamesSinceMasteryEvent: parsed.gamesSinceMasteryEvent ?? 0,
      highestStreakUnlocked: parsed.highestStreakUnlocked ?? 0,
    };
  } catch {
    return EMPTY;
  }
};

const writePersisted = (uid: string, state: PersistedStructure) => {
  try { localStorage.setItem(STORAGE_KEY(uid), JSON.stringify(state)); } catch { /* storage off */ }
};

export interface StructureState {
  /** The metaphor the student picked.  Null = not yet chosen (show picker). */
  kind: StructureKind | null;
  /** All earned parts in order of unlock. */
  earned: Array<{ key: string; at: string }>;
  /** True once kind is set — UI should hide the picker. */
  isReady: boolean;
  /** The list of parts for the chosen metaphor, with earned flag set. */
  slots: Array<{ part: StructurePart; earned: boolean; earnedAt: string | null }>;
  /** The next locked part, with a human hint of what unlocks it. */
  nextLocked: StructurePart | null;
  /** Pick the metaphor permanently (first-run flow). */
  chooseKind: (kind: StructureKind) => void;
  /**
   * Called from the finish-game path AFTER xp/streak are updated.
   * Returns an array of PART KEYS that were newly unlocked this call —
   * caller can celebrate each one, show a toast, etc.
   */
  reportGameResult: (args: { score: number; newStreak: number; prevStreak: number }) => string[];
}

export function useStructure(uid: string | null | undefined): StructureState {
  const userKey = uid || '__anon__';
  const [state, setState] = useState<PersistedStructure>(() => readPersisted(userKey));

  // Re-sync when uid settles (mirrors useRetention's pattern — first
  // render runs with '__anon__' before auth restores).
  useEffect(() => {
    setState(readPersisted(userKey));
  }, [userKey]);

  const chooseKind = useCallback((kind: StructureKind) => {
    setState(prev => {
      // Don't overwrite an already-chosen metaphor — idempotent.
      if (prev.kind) return prev;
      const next = { ...prev, kind };
      writePersisted(userKey, next);
      return next;
    });
  }, [userKey]);

  const reportGameResult = useCallback((args: { score: number; newStreak: number; prevStreak: number }): string[] => {
    const { score, newStreak, prevStreak } = args;
    const unlockedKeys: string[] = [];

    setState(prev => {
      if (!prev.kind) return prev; // No metaphor chosen yet — ignore.

      const partsForKind = STRUCTURE_PARTS[prev.kind];
      const earnedKeys = new Set(prev.earned.map(e => e.key));
      const newlyEarned: Array<{ key: string; at: string }> = [];
      const now = new Date().toISOString();

      const counts = { ...prev.counts };
      let gamesSinceMastery = prev.gamesSinceMasteryEvent;
      let highestStreak = prev.highestStreakUnlocked;

      // Helper: look up the Nth ordinal part for a given event, mark it
      // earned if not already.
      const tryUnlockOrdinal = (event: UnlockEvent, ordinal: number) => {
        const part = partsForKind.find(p => p.unlockEvent === event && p.unlockOrdinal === ordinal);
        if (!part) return;
        if (earnedKeys.has(part.key)) return;
        newlyEarned.push({ key: part.key, at: now });
        unlockedKeys.push(part.key);
      };

      // EVENT 1 — mastered_5_words: high-quality games (>=80) count up;
      // every STRUCTURE_WORDS_PER_EVENT-th one fires the event.
      if (score >= 80) {
        gamesSinceMastery += 1;
        if (gamesSinceMastery >= STRUCTURE_WORDS_PER_EVENT) {
          gamesSinceMastery = 0;
          counts.mastered_5_words += 1;
          tryUnlockOrdinal('mastered_5_words', counts.mastered_5_words);
        }
      }

      // EVENT 2 — perfect_assignment: score === 100 fires immediately.
      if (score >= 100) {
        counts.perfect_assignment += 1;
        tryUnlockOrdinal('perfect_assignment', counts.perfect_assignment);
      }

      // EVENT 3 — streak_7: fires every time the streak crosses a new
      // multiple of 7 (7, 14, 21, ...).  Guarded by highestStreakUnlocked
      // so re-rendering with the same streak never double-fires.
      const prevMultiple = Math.floor(prevStreak / 7);
      const newMultiple = Math.floor(newStreak / 7);
      if (newMultiple > prevMultiple && newStreak > highestStreak) {
        highestStreak = newStreak;
        // Fire once per new multiple crossed (usually just 1).
        for (let m = prevMultiple + 1; m <= newMultiple; m++) {
          counts.streak_7 += 1;
          tryUnlockOrdinal('streak_7', counts.streak_7);
        }
      }

      if (newlyEarned.length === 0 && gamesSinceMastery === prev.gamesSinceMasteryEvent) {
        return prev; // Nothing changed.
      }

      const next: PersistedStructure = {
        ...prev,
        earned: [...prev.earned, ...newlyEarned],
        counts,
        gamesSinceMasteryEvent: gamesSinceMastery,
        highestStreakUnlocked: highestStreak,
      };
      writePersisted(userKey, next);
      return next;
    });

    return unlockedKeys;
  }, [userKey]);

  const slots = useMemo(() => {
    if (!state.kind) return [];
    const earnedMap = new Map(state.earned.map(e => [e.key, e.at]));
    return STRUCTURE_PARTS[state.kind].map(part => ({
      part,
      earned: earnedMap.has(part.key),
      earnedAt: earnedMap.get(part.key) ?? null,
    }));
  }, [state.kind, state.earned]);

  const nextLocked = useMemo(() => {
    if (!state.kind) return null;
    return STRUCTURE_PARTS[state.kind].find(part => !state.earned.some(e => e.key === part.key)) ?? null;
  }, [state.kind, state.earned]);

  return {
    kind: state.kind,
    earned: state.earned,
    isReady: state.kind !== null,
    slots,
    nextLocked,
    chooseKind,
    reportGameResult,
  };
}
