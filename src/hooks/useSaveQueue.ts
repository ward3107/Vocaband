/**
 * useSaveQueue — batch-and-flush queue for non-critical Supabase writes.
 *
 * The XP/streak/badge writes that follow each game finish aren't on the
 * critical path of the student's experience — losing one is annoying but
 * not catastrophic, and the next game will catch up. So we don't await
 * them inline. Instead, callers push closures into this queue and the
 * hook flushes them in small batches (Promise.all of up to 10 ops at
 * a time) after a brief debounce.
 *
 * Two callable shapes:
 *   - `queueSaveOperation(fn)` — append a save closure. The first call
 *     after an empty queue starts a 300 ms debounce so a burst of writes
 *     coalesces into one batch.
 *   - `clearQueue()` — drop everything in the queue (called from
 *     cleanupSessionData on logout / session end so we don't fire DB
 *     writes for a user that's already gone).
 *
 * Failures are logged but never bubble — the queue keeps going. Same
 * "silent on failure" posture as the rest of the save-queue layer.
 */
import { useCallback, useEffect, useRef } from "react";

export function useSaveQueue() {
  const queueRef = useRef<Array<() => Promise<void>>>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const processingRef = useRef(false);

  // On unmount, flush whatever's queued. Fire-and-forget — we're
  // tearing down so we can't await, but we still want the writes to
  // hit the network if at all possible.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (queueRef.current.length > 0) {
        Promise.all(
          queueRef.current.map(fn => fn().catch(console.error)),
        ).catch(console.error);
        queueRef.current = [];
      }
    };
  }, []);

  const processSaveQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) return;
    processingRef.current = true;

    // Process up to 10 saves at once — keeps the UI responsive while
    // amortising network round-trips for bursts (e.g. game finish
    // queues XP write + streak write + 1-2 badge writes back-to-back).
    const queue = queueRef.current.splice(0, 10);

    try {
      await Promise.all(
        queue.map(fn => fn().catch(err => console.error('[Save Queue] Item failed:', err))),
      );
    } finally {
      processingRef.current = false;

      // If callers pushed more during the in-flight flush, drain those
      // too — short delay so we don't busy-loop on a hot queue.
      if (queueRef.current.length > 0) {
        timerRef.current = setTimeout(processSaveQueue, 100);
      }
    }
  }, []);

  const queueSaveOperation = useCallback((operation: () => Promise<void>) => {
    queueRef.current.push(operation);

    // Trigger processing after a short delay so multiple back-to-back
    // pushes batch into one flush.
    if (!timerRef.current) {
      timerRef.current = setTimeout(() => {
        processSaveQueue();
        timerRef.current = undefined;
      }, 300);
    }
  }, [processSaveQueue]);

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  // Synchronous probe for the periodic-flush useEffect — it only wants
  // to call processSaveQueue if there's actually pending work.
  const hasPending = useCallback(() => queueRef.current.length > 0 && !processingRef.current, []);

  return { queueSaveOperation, clearQueue, processSaveQueue, hasPending };
}
