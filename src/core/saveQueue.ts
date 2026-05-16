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

// ──────────────────────────────────────────────────────────────────────────
// Depth-change subscription
// ──────────────────────────────────────────────────────────────────────────
// Lets App.tsx render "Saved locally — will sync" / "All progress synced"
// toasts at the right moments without polling the queue.  Listeners receive
// the total depth (both queues summed) every time a write hits localStorage.
// Kept dep-free per this module's contract.

type DepthListener = (depth: number) => void;
const depthListeners: Set<DepthListener> = new Set();

function notifyDepth(): void {
  // Compute lazily once per notify so listeners that re-enter don't
  // pay multiple localStorage reads.
  let depth = -1;
  for (const l of depthListeners) {
    try {
      if (depth < 0) depth = quickPlayQueueLength() + assignmentQueueLength();
      l(depth);
    } catch { /* never let a listener take down a write */ }
  }
}

/** Subscribe to queue depth changes.  Returns an unsubscribe function.
 *  Fires once on subscribe with the current depth so consumers can sync
 *  initial state without an extra read. */
export function subscribeQueueDepth(listener: DepthListener): () => void {
  depthListeners.add(listener);
  try { listener(quickPlayQueueLength() + assignmentQueueLength()); } catch {}
  return () => { depthListeners.delete(listener); };
}

// Generate a unique local id for a queue row.  Not security-sensitive
// — it's just a label so callers can correlate "the row I enqueued"
// with "the row that finished flushing" — but CodeQL's
// `js/insecure-randomness` rule flags any Math.random() in code paths
// that look security-adjacent (alert #31).  Use crypto.randomUUID
// where available (every supported browser since 2022) and fall back
// to crypto.getRandomValues so we never ship a Math.random() call.
function generateLocalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint8Array(4);
    crypto.getRandomValues(buf);
    const hex = Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
    return `${Date.now()}-${hex}`;
  }
  // Last-resort fallback for ancient runtimes that lack the Web Crypto
  // API entirely.  Local-id collision here would just confuse a flush
  // log; never security-relevant.
  return `${Date.now()}-${Date.now().toString(36)}`;
}

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
  notifyDepth();
}

// Append a row to the queue and trigger a flush.  Returns the localId
// so callers can (optionally) track which row they just enqueued.
export function enqueueQuickPlaySave(row: QueuedQuickPlaySave['row']): string {
  const localId = generateLocalId();
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
    // Array of missed word ids (matches the int[] argument the RPC
    // accepts after migration 20260515).  Older queue rows from before
    // that migration carried a single integer; the flusher tolerates
    // both shapes, but new entries are always written as int[].
    p_mistakes: number[] | number;
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
  notifyDepth();
}

export function enqueueAssignmentSave(args: QueuedAssignmentSave['args']): string {
  const localId = generateLocalId();
  const queue = readAssignmentQueue();
  queue.push({ localId, args, attempts: 0, queuedAt: Date.now() });
  writeAssignmentQueue(queue);
  void flushAssignmentQueue();
  return localId;
}

// Coerce one queue row's args to the JSONB shape expected by the batch
// RPC.  Centralised so the batch path and the single-row fallback path
// produce IDENTICAL payloads (only the wrapping differs).
function batchElementFromItem(item: QueuedAssignmentSave): Record<string, unknown> {
  return {
    student_name: item.args.p_student_name,
    student_uid: item.args.p_student_uid,
    assignment_id: item.args.p_assignment_id,
    class_code: item.args.p_class_code,
    score: item.args.p_score,
    mode: item.args.p_mode,
    // Legacy queue rows (pre-2026-05-15 client) carried a single
    // integer for p_mistakes.  Coerce non-arrays to [] so the new
    // RPC's `integer[]` arg doesn't 22023 — same fallback as the
    // single-row path below.
    mistakes: Array.isArray(item.args.p_mistakes)
      ? item.args.p_mistakes
      : (typeof item.args.p_mistakes === 'number' ? [] : []),
    avatar: item.args.p_avatar,
    word_attempts: item.args.p_word_attempts,
  };
}

let flushingAssignment = false;
let batchRpcMissing = false;  // sticky flag once we learn the server doesn't have the batch RPC

export async function flushAssignmentQueue(): Promise<void> {
  if (flushingAssignment) return;
  flushingAssignment = true;
  try {
    let queue = readAssignmentQueue();
    if (queue.length === 0) return;

    // Eligible items = under the retry cap.  We don't drop overcap
    // rows here; they stay in localStorage so a future
    // forceFullRecovery / manual debug can still see them.
    const eligible = queue.filter(it => it.attempts < MAX_ATTEMPTS);
    const overcap  = queue.filter(it => it.attempts >= MAX_ATTEMPTS);
    if (eligible.length === 0) return;

    // ─── BATCH PATH ─────────────────────────────────────────────────
    // If the server has `save_student_progress_batch` (migration
    // 20260518), we can land all eligible rows in ONE RPC round-trip
    // instead of N sequential calls.  In a 30-student classroom that's
    // 1 request instead of 30 per finish-burst.  If the RPC returns
    // a "function does not exist" error (Render hasn't redeployed
    // since the migration), we mark batchRpcMissing=true and fall
    // through to the per-row path so older deployments keep working.
    if (!batchRpcMissing && eligible.length >= 2) {
      try {
        const payload = eligible.map(batchElementFromItem);
        const { error } = await supabase.rpc('save_student_progress_batch', { p_batch: payload });
        if (!error) {
          // All eligible rows landed.  Keep only the overcap leftovers.
          writeAssignmentQueue(overcap);
          return;
        }
        // 42883 = "function … does not exist" — server is on an older
        // build without the batch RPC.  Latch and fall through to the
        // sequential single-row path below; future flushes won't try
        // the batch again until reload.
        if ((error as { code?: string }).code === '42883') {
          batchRpcMissing = true;
        } else {
          // Other batch error: bump attempts on every eligible row
          // and exit; we'll retry on the next flush trigger.
          const bumped = eligible.map(it => ({ ...it, attempts: it.attempts + 1 }));
          writeAssignmentQueue([...bumped, ...overcap]);
          return;
        }
      } catch {
        // Network blip — same posture as a non-42883 error.
        const bumped = eligible.map(it => ({ ...it, attempts: it.attempts + 1 }));
        writeAssignmentQueue([...bumped, ...overcap]);
        return;
      }
    }

    // ─── SEQUENTIAL FALLBACK ────────────────────────────────────────
    // Used when the batch RPC isn't available, or when there's only
    // one item to flush.  Same per-row error handling as before.
    const remaining: QueuedAssignmentSave[] = [...overcap];
    for (const item of eligible) {
      try {
        const args = {
          ...item.args,
          p_mistakes: Array.isArray(item.args.p_mistakes)
            ? item.args.p_mistakes
            : (typeof item.args.p_mistakes === 'number' ? [] : []),
        };
        const { error } = await supabase.rpc('save_student_progress', args);
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
