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
import { installSaveQueueFlusher } from '../core/saveQueue';

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
          // C7 (2026-05-22): retry through the save_student_progress
          // RPC.  Direct INSERT was REVOKEd from `authenticated` so the
          // RPC is the only write path; same param shape as
          // useGameState/useGameFinish use.  The RPC's internal ON
          // CONFLICT upsert means a row that the main path already
          // wrote returns SUCCESS (score gets greatest()'d) instead of
          // the 23505 we used to see — so the dup-key cleanup branch
          // below is now defensive-only.  Foreign-key (23503) violations
          // can still surface from the word_attempts side of the RPC.
          const { error } = await supabase.rpc('save_student_progress', {
            p_student_name: progress.student_name,
            p_student_uid: progress.student_uid,
            p_assignment_id: progress.assignment_id,
            p_class_code: progress.class_code,
            p_score: progress.score,
            p_mode: progress.mode,
            p_mistakes: Array.isArray(progress.mistakes) ? progress.mistakes : [],
            p_avatar: progress.avatar,
          });
          if (!error) {
            localStorage.removeItem(key);
            continue;
          }
          // 23505 was the dup-key signal when this path did direct INSERT;
          // the RPC's upsert means we no longer hit it organically, but
          // the check stays as a belt-and-braces against legacy retry
          // rows + the 23503 foreign-key case.  Without this branch the
          // localStorage entry could never get cleaned up — the same
          // doomed call would re-fire on every page load forever (a slow
          // but real DB-spam pattern caught in the 2026-04-25
          // request-volume audit).
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

  // ─── 3. Install save-queue flusher for the tab lifetime ──────────
  useEffect(() => {
    const uninstall = installSaveQueueFlusher();
    return uninstall;
  }, []);
}
