/**
 * useSaveQueueResilience — three background mechanisms that keep
 * score and progress writes landing even when the network is
 * unreliable or the browser was offline when a write was attempted.
 *
 *   1. Periodic flush (every 5 s while logged in + idle).
 *      Processes the in-memory save queue when there's pending
 *      work and the user isn't actively saving.  Keeps queued data
 *      trickling out without overwhelming the DB during gameplay.
 *
 *   2. Retry pending progress writes (once on mount).
 *      Scans localStorage for `vocaband_retry_*` rows left behind
 *      by a previous session that failed to send, then inserts
 *      each into the `progress` table.  Only retries rows owned
 *      by the CURRENT authenticated user (catches the case where
 *      a device was shared between students) — foreign rows are
 *      discarded.  Failures leave the entry in place for the next
 *      load to retry.
 *
 *   3. Install Quick Play queue flusher (once on mount).
 *      Registers the window-level 'online' + visibilitychange +
 *      30 s poll listeners that flush Quick Play score rows
 *      which failed their first send.  Runs for the lifetime of
 *      the tab; the returned uninstaller is called on unmount.
 *
 * All three are write-only — the hook returns nothing.  They
 * operate independently but share the broader "don't lose
 * student progress" responsibility, so bundling them here makes
 * the recovery story easier to reason about.
 */
import { useEffect, useRef } from 'react';
import { supabase, type AppUser } from '../core/supabase';
import { installQuickPlayQueueFlusher } from '../core/saveQueue';

export interface UseSaveQueueResilienceParams {
  user: AppUser | null;
  isSaving: boolean;
  saveQueueHasPending: () => boolean;
  processSaveQueue: () => void | Promise<void>;
}

export function useSaveQueueResilience(
  params: UseSaveQueueResilienceParams,
): void {
  const { user, isSaving, saveQueueHasPending, processSaveQueue } = params;

  // Capture the volatile inputs via refs so the flush interval below
  // is set up ONCE per user-identity change and doesn't rebuild on
  // every save start/end.  Per the 2026-05-04 audit: `isSaving`
  // flips true→false on every saved game, and previously caused the
  // interval to be torn down + recreated each time — meaning the
  // 5s clock kept resetting and the interval rarely actually fired
  // for genuinely-pending queues.  Reading the latest values via
  // refs preserves correctness while making the effect stable.
  const isSavingRef = useRef(isSaving);
  const saveQueueHasPendingRef = useRef(saveQueueHasPending);
  const processSaveQueueRef = useRef(processSaveQueue);
  useEffect(() => { isSavingRef.current = isSaving; }, [isSaving]);
  useEffect(() => { saveQueueHasPendingRef.current = saveQueueHasPending; }, [saveQueueHasPending]);
  useEffect(() => { processSaveQueueRef.current = processSaveQueue; }, [processSaveQueue]);

  // ─── 1. Periodic flush while idle ─────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const flushInterval = setInterval(() => {
      if (!isSavingRef.current && saveQueueHasPendingRef.current()) {
        processSaveQueueRef.current();
      }
    }, 5000);
    return () => clearInterval(flushInterval);
    // Effect deps: ONLY user identity.  See ref-pattern comment above.
  }, [user]);

  // ─── 2. Retry pending progress writes from a previous session ────
  useEffect(() => {
    const retryPending = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const currentUid = session.user.id;
      const keys = Object.keys(localStorage).filter(k => k.startsWith('vocaband_retry_'));
      for (const key of keys) {
        try {
          const progress = JSON.parse(localStorage.getItem(key)!);
          // Only retry records that belong to the current authenticated
          // user (catches shared-device cases where a previous student
          // left rows behind).
          if (progress.student_uid !== currentUid) {
            localStorage.removeItem(key);
            continue;
          }
          const { error } = await supabase.from('progress').insert(progress);
          if (!error) {
            localStorage.removeItem(key);
            continue;
          }
          // The progress table has a UNIQUE constraint on
          // (assignment_id, student_uid, mode, class_code), so retrying a
          // row that the main upsert path already wrote returns a
          // 23505 / "duplicate key" error.  Without this branch the
          // localStorage entry would never get cleaned up — the same
          // doomed INSERT would re-fire on every page load forever
          // (a slow but real DB-spam pattern caught in the 2026-04-25
          // request-volume audit).  Treat dup-key + foreign-key
          // violations as "already handled, drop the retry".
          const sqlState = (error as { code?: string }).code;
          if (sqlState === '23505' || sqlState === '23503') {
            localStorage.removeItem(key);
            continue;
          }
          // Any other error → leave the entry in place so a future
          // load can try again under different circumstances.
        } catch {
          // Still offline or row malformed — will retry on next load.
          // Cap retries at 5 per row so a permanently-broken JSON blob
          // can't drive infinite retries either.
          try {
            const meta = JSON.parse(localStorage.getItem(`${key}__meta`) || '{}');
            const tries = (meta.tries || 0) + 1;
            if (tries >= 5) {
              localStorage.removeItem(key);
              localStorage.removeItem(`${key}__meta`);
            } else {
              localStorage.setItem(`${key}__meta`, JSON.stringify({ tries }));
            }
          } catch { /* localStorage full / private mode — give up gracefully */ }
        }
      }
    };
    retryPending();
  }, []);

  // ─── 3. Install Quick Play queue flusher for the tab lifetime ────
  useEffect(() => {
    const uninstall = installQuickPlayQueueFlusher();
    return uninstall;
  }, []);
}
