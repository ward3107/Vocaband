/**
 * useSavedTasks — teacher-side "task templates" stored in localStorage.
 *
 * A SavedTask captures the full configuration the teacher built in the
 * SetupWizard (words + game modes + instructions + sentence settings)
 * so they can rebuild the same task in 1 tap instead of clicking through
 * the 3-step wizard again.
 *
 * Why localStorage and not the DB:
 *   1. Templates are intrinsically per-device-per-teacher, no cross-device
 *      sync needed in v1.  Same pattern as `vocaband_saved_groups` (the
 *      existing word-list saver in WordInputStep), keeps the persistence
 *      layer consistent.
 *   2. Avoids a Supabase migration + RLS policy churn for what is
 *      essentially a UX shortcut.  We can promote to DB later when
 *      teachers ask for cross-device sync.
 *
 * Storage key is scoped per uid so two teachers sharing one staffroom
 * laptop don't see each other's templates.
 *
 * Ordering returned to the UI:
 *   1. Pinned first (manual override — keeps a favourite at the top
 *      regardless of usage),
 *   2. Highest `timesUsed` next (templates the teacher actually
 *      reuses bubble up automatically),
 *   3. Most recent `lastUsedAt` (reuse-recency tiebreaker),
 *   4. Most recent `createdAt` (newest brand-new template last).
 */

import { useCallback, useEffect, useState } from 'react';
import type { SentenceDifficulty } from '../constants/game';

export interface SavedTask {
  id: string;
  title: string;
  mode: 'quick-play' | 'assignment';
  wordIds: number[];
  modes: string[];
  timesUsed: number;
  pinned: boolean;
  createdAt: number;
  lastUsedAt: number | null;
  // Assignment-specific snapshots.  Quick-play templates ignore these.
  instructions?: string;
  sentenceDifficulty?: SentenceDifficulty;
  sentences?: string[];
}

export type SavedTaskInput = Omit<
  SavedTask,
  'id' | 'timesUsed' | 'pinned' | 'createdAt' | 'lastUsedAt'
>;

const STORAGE_KEY_PREFIX = 'vocaband_saved_tasks_';

function generateId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `task_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

function readAll(uid: string | undefined): SavedTask[] {
  if (!uid) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + uid);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(uid: string | undefined, tasks: SavedTask[]): void {
  if (!uid) return;
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + uid, JSON.stringify(tasks));
  } catch {
    // localStorage full / blocked / private mode — silent.  Templates
    // are a convenience, not a correctness requirement.
  }
}

function sortTasks(tasks: SavedTask[]): SavedTask[] {
  return [...tasks].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.timesUsed !== b.timesUsed) return b.timesUsed - a.timesUsed;
    const aLast = a.lastUsedAt ?? 0;
    const bLast = b.lastUsedAt ?? 0;
    if (aLast !== bLast) return bLast - aLast;
    return b.createdAt - a.createdAt;
  });
}

export function useSavedTasks(uid: string | undefined) {
  const [tasks, setTasks] = useState<SavedTask[]>(() => sortTasks(readAll(uid)));

  useEffect(() => {
    setTasks(sortTasks(readAll(uid)));
  }, [uid]);

  const persist = useCallback(
    (next: SavedTask[]) => {
      const sorted = sortTasks(next);
      writeAll(uid, sorted);
      setTasks(sorted);
    },
    [uid],
  );

  const save = useCallback(
    (input: SavedTaskInput): SavedTask => {
      const next: SavedTask = {
        ...input,
        id: generateId(),
        timesUsed: 0,
        pinned: false,
        createdAt: Date.now(),
        lastUsedAt: null,
      };
      persist([...readAll(uid), next]);
      return next;
    },
    [uid, persist],
  );

  const remove = useCallback(
    (id: string) => {
      persist(readAll(uid).filter(t => t.id !== id));
    },
    [uid, persist],
  );

  const togglePin = useCallback(
    (id: string) => {
      persist(readAll(uid).map(t => (t.id === id ? { ...t, pinned: !t.pinned } : t)));
    },
    [uid, persist],
  );

  const bumpUse = useCallback(
    (id: string) => {
      persist(
        readAll(uid).map(t =>
          t.id === id
            ? { ...t, timesUsed: t.timesUsed + 1, lastUsedAt: Date.now() }
            : t,
        ),
      );
    },
    [uid, persist],
  );

  return { tasks, save, remove, togglePin, bumpUse };
}
