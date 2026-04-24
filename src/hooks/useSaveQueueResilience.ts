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
import { useEffect } from 'react';
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

  // ─── 1. Periodic flush while idle ─────────────────────────────────
  useEffect(() => {
    const flushInterval = setInterval(() => {
      if (user && !isSaving && saveQueueHasPending()) {
        processSaveQueue();
      }
    }, 5000);
    return () => clearInterval(flushInterval);
  }, [isSaving, user, saveQueueHasPending, processSaveQueue]);

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
          if (!error) localStorage.removeItem(key);
        } catch {
          // Still offline — will retry on next load.
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
