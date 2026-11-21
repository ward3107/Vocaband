import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../core/supabase';
import type { Word } from '../data/vocabulary';
import type { SentenceDifficulty } from '../constants/game';

export interface SavedTask {
  id: string;
  title: string;
  mode: 'quick-play' | 'assignment';
  wordIds: number[];
  words?: Word[];
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

interface TemplateChange {
  token: string;
  op: 'save' | 'pin' | 'use' | 'remove';
  stamp: number;
  task: SavedTask;
}
const inFlight = new Map<string, Promise<void>>();
const changed = 'vocaband-template-change';
function readChanges(uid: string): TemplateChange[] {
  try {
    const value = JSON.parse(localStorage.getItem('vocaband_template_changes_' + uid) ?? '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
function writeChanges(uid: string, changes: TemplateChange[]) {
  try {
    localStorage.setItem('vocaband_template_changes_' + uid, JSON.stringify(changes));
  } catch {
    /* offline storage unavailable */
  }
}
function mergeChange(tasks: SavedTask[], change: TemplateChange): SavedTask[] {
  const other = tasks.filter((t) => t.id !== change.task.id);
  return change.op === 'remove' ? other : [...other, change.task];
}
// The existing local list is imported once per device. Server-side tombstones
// prevent an old offline cache from restoring a template the teacher deleted.
function synchronize(uid: string): Promise<void> {
  const running = inFlight.get(uid);
  if (running) return running;
  let retry = false;
  const run = (async () => {
    let migrate = true;
    try {
      migrate = localStorage.getItem('vocaband_templates_imported_' + uid) !== '1';
    } catch {
      /* optional cache */
    }
    const changes = readChanges(uid);
    const imports = migrate ? readAll(uid).map((task) => ({ task, op: 'save', stamp: 0 })) : [];
    const { data, error } = await supabase.rpc('sync_activity_templates', {
      p_changes: [...imports, ...changes],
    });
    if (error || !Array.isArray(data)) return;
    const sent = new Set(changes.map((c) => c.token));
    const pending = readChanges(uid).filter((c) => !sent.has(c.token));
    writeChanges(uid, pending);
    try {
      localStorage.setItem('vocaband_templates_imported_' + uid, '1');
    } catch {
      /* optional cache */
    }
    writeAll(uid, pending.reduce(mergeChange, data));
    window.dispatchEvent(new CustomEvent(changed, { detail: uid }));
    retry = pending.length > 0;
  })()
    .catch(() => {})
    .finally(() => {
      inFlight.delete(uid);
      if (retry) void synchronize(uid);
    });
  inFlight.set(uid, run);
  return run;
}
export function useSavedTasks(uid: string | undefined) {
  const [tasks, setTasks] = useState<SavedTask[]>(() => sortTasks(readAll(uid)));
  useEffect(() => {
    const refresh = () => setTasks(sortTasks(readAll(uid)));
    const sync = () => {
      if (uid) void synchronize(uid);
    };
    const onChange = (e: Event) => {
      if ((e as CustomEvent).detail === uid) refresh();
    };
    const storage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_PREFIX + uid) refresh();
    };
    refresh();
    sync();
    window.addEventListener(changed, onChange);
    window.addEventListener('online', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('storage', storage);
    return () => {
      window.removeEventListener(changed, onChange);
      window.removeEventListener('online', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('storage', storage);
    };
  }, [uid]);
  const mutate = useCallback(
    (op: TemplateChange['op'], task: SavedTask) => {
      if (!uid) return;
      const change = { op, task, stamp: Date.now(), token: generateId() };
      writeChanges(uid, [...readChanges(uid), change]);
      writeAll(uid, mergeChange(readAll(uid), change));
      setTasks(sortTasks(readAll(uid)));
      window.dispatchEvent(new CustomEvent(changed, { detail: uid }));
      void synchronize(uid);
    },
    [uid]
  );
  const save = useCallback(
    (input: SavedTaskInput) => {
      const task: SavedTask = {
        ...input,
        id: generateId(),
        timesUsed: 0,
        pinned: false,
        createdAt: Date.now(),
        lastUsedAt: null,
      };
      mutate('save', task);
      return task;
    },
    [mutate]
  );
  const remove = useCallback(
    (id: string) => {
      const t = readAll(uid).find((t) => t.id === id);
      if (t) mutate('remove', t);
    },
    [uid, mutate]
  );
  const togglePin = useCallback(
    (id: string) => {
      const t = readAll(uid).find((t) => t.id === id);
      if (t) mutate('pin', { ...t, pinned: !t.pinned });
    },
    [uid, mutate]
  );
  const bumpUse = useCallback(
    (id: string) => {
      const t = readAll(uid).find((t) => t.id === id);
      if (t) mutate('use', { ...t, timesUsed: t.timesUsed + 1, lastUsedAt: Date.now() });
    },
    [uid, mutate]
  );
  return { tasks, save, remove, togglePin, bumpUse };
}
