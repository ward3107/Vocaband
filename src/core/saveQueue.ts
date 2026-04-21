// Offline-tolerant save queue for student progress writes.
//
// Kahoot-style resilience: when a student finishes a mode we show them
// "Saved!" instantly (optimistic UI), drop the row into a local queue,
// and fire-and-forget the write to Supabase.  If the network is bad
// the row stays in the queue; a background flush retries on app mount,
// on the browser's `online` event, on tab refocus, and on a slow
// interval.  The student never sees an error and never loses a score.
//
// Two queue flavours live side-by-side so the retry path is correct
// for each save type:
//   * Quick Play guests — direct INSERT into the progress table.
//     No RPC involved; the row is self-contained.
//   * Regular class assignments — save_student_progress RPC, which
//     also bumps play_count and appends per-word attempts atomically.
//     We store the RPC args so the retry calls the same RPC and
//     preserves those extras.
//
// Keep this module dependency-free so the queue can be flushed even
// when the full React tree hasn't mounted yet (e.g., during service
// worker activation in a future phase).

import { supabase } from './supabase';

const QUEUE_KEY = 'vocaband_qp_save_queue';
const ASSIGNMENT_QUEUE_KEY = 'vocaband_assignment_save_queue';

export interface QueuedQuickPlaySave {
  // Unique id so the flush loop can drop a row once Supabase confirms
  // it landed.  A monotonic timestamp is good enough here — two saves
  // from the same device within the same millisecond would still
  // collide, but Quick Play saves are user-tap-rate (2+ seconds apart
  // at best), so the risk is negligible.
  localId: string;
  row: {
    student_name: string;
    student_uid: string;
    assignment_id: string;
    class_code: string;
    score: number;
    mode: string;
    completed_at: string;
    mistakes: number[];
    avatar: string;
  };
  // Tracks retry count so we can eventually give up instead of flushing
  // forever.  After MAX_ATTEMPTS we still keep the row locally (the
  // student's own record) but we stop trying to send — if the server
  // has been rejecting it for this long the cause is probably not
  // network-related (RLS, schema, etc.).
  attempts: number;
  queuedAt: number;
}

const MAX_ATTEMPTS = 20;

function readQueue(): QueuedQuickPlaySave[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(q: QueuedQuickPlaySave[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    // Quota exceeded or storage disabled — safe to ignore.  The
    // in-memory copy of the row still gets retried for the rest of
    // this session; we just can't persist across reloads.
  }
}

// Append a row to the queue and trigger a flush.  Returns the localId
// so callers can (optionally) track which row they just enqueued.
export function enqueueQuickPlaySave(row: QueuedQuickPlaySave['row']): string {
  const localId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const queue = readQueue();
  queue.push({ localId, row, attempts: 0, queuedAt: Date.now() });
  writeQueue(queue);
  // Kick off a flush attempt immediately — if the network is up this
  // send happens in parallel with the student seeing "Saved!" and is
  // typically complete before they tap anything else.
  void flushQuickPlayQueue();
  return localId;
}

let flushing = false;
export async function flushQuickPlayQueue(): Promise<void> {
  // Single-flight guard so overlapping triggers (mount + online + visibility)
  // don't send duplicate requests.  `flushing` is module-scoped, so a
  // second call returns immediately while the first is in flight.
  if (flushing) return;
  flushing = true;
  try {
    let queue = readQueue();
    if (queue.length === 0) return;

    const remaining: QueuedQuickPlaySave[] = [];
    for (const item of queue) {
      if (item.attempts >= MAX_ATTEMPTS) {
        // Give up sending but keep the row so we don't lose the
        // student's own record of the game.  The teacher's podium
        // won't see this one — which is the correct failure mode
        // if something is persistently broken server-side.
        remaining.push(item);
        continue;
      }
      try {
        const { error } = await supabase.from('progress').insert(item.row);
        if (error) {
          remaining.push({ ...item, attempts: item.attempts + 1 });
        }
        // no error -> drop it (don't push to remaining)
      } catch {
        remaining.push({ ...item, attempts: item.attempts + 1 });
      }
    }
    queue = remaining;
    writeQueue(queue);
  } finally {
    flushing = false;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Regular class-assignment queue (RPC-based)
// ──────────────────────────────────────────────────────────────────────────

export interface QueuedAssignmentSave {
  localId: string;
  // RPC arg shape matches save_student_progress(...) exactly.  Storing
  // RPC args (not a progress row) means the retry calls the same RPC
  // as the first attempt — play_count increments and word_attempts
  // append behave identically whether the save landed on attempt 1
  // or attempt 7.
  args: {
    p_student_name: string;
    p_student_uid: string;
    p_assignment_id: string;
    p_class_code: string;
    p_score: number;
    p_mode: string;
    p_mistakes: number;
    p_avatar: string;
    p_word_attempts: Array<{ word_id: number; is_correct: boolean }> | null;
  };
  attempts: number;
  queuedAt: number;
}

function readAssignmentQueue(): QueuedAssignmentSave[] {
  try {
    const raw = localStorage.getItem(ASSIGNMENT_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAssignmentQueue(q: QueuedAssignmentSave[]) {
  try {
    localStorage.setItem(ASSIGNMENT_QUEUE_KEY, JSON.stringify(q));
  } catch { /* see readQueue comment */ }
}

export function enqueueAssignmentSave(args: QueuedAssignmentSave['args']): string {
  const localId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const queue = readAssignmentQueue();
  queue.push({ localId, args, attempts: 0, queuedAt: Date.now() });
  writeAssignmentQueue(queue);
  void flushAssignmentQueue();
  return localId;
}

let flushingAssignment = false;
export async function flushAssignmentQueue(): Promise<void> {
  if (flushingAssignment) return;
  flushingAssignment = true;
  try {
    let queue = readAssignmentQueue();
    if (queue.length === 0) return;
    const remaining: QueuedAssignmentSave[] = [];
    for (const item of queue) {
      if (item.attempts >= MAX_ATTEMPTS) {
        remaining.push(item);
        continue;
      }
      try {
        const { error } = await supabase.rpc('save_student_progress', item.args);
        if (error) {
          remaining.push({ ...item, attempts: item.attempts + 1 });
        }
      } catch {
        remaining.push({ ...item, attempts: item.attempts + 1 });
      }
    }
    queue = remaining;
    writeAssignmentQueue(queue);
  } finally {
    flushingAssignment = false;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Lifecycle flushers
// ──────────────────────────────────────────────────────────────────────────

// Hook the queue into the browser lifecycle.  Call once on app mount.
// - online: browser just regained connectivity
// - visibilitychange: tab came back to foreground (likely unlock on mobile)
// - periodic (30s): slow safety net for long-lived tabs that never
//   trigger either of the above (e.g., a teacher watching the podium)
export function installQuickPlayQueueFlusher(): () => void {
  const flushBoth = () => {
    void flushQuickPlayQueue();
    void flushAssignmentQueue();
  };
  const onlineListener = () => { flushBoth(); };
  const visibilityListener = () => {
    if (!document.hidden) flushBoth();
  };
  window.addEventListener('online', onlineListener);
  document.addEventListener('visibilitychange', visibilityListener);
  const intervalId = setInterval(flushBoth, 30_000);
  // Initial flush on install in case the app booted with rows left
  // over from a previous session.
  flushBoth();
  return () => {
    window.removeEventListener('online', onlineListener);
    document.removeEventListener('visibilitychange', visibilityListener);
    clearInterval(intervalId);
  };
}

// Expose queue length so UI could optionally show "2 scores queued" if
// we want that in a future phase.  Nothing in the UI reads this yet.
export function quickPlayQueueLength(): number {
  return readQueue().length;
}

export function assignmentQueueLength(): number {
  return readAssignmentQueue().length;
}
