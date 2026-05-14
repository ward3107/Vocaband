import { useEffect, useRef, useState } from 'react';
import type { View } from '../core/views';
import { supabase } from '../core/supabase';
import { useLanguage } from '../hooks/useLanguage';
import { pendingApprovalT } from '../locales/student/pending-approval';

interface PendingApprovalInfo {
  name: string;
  classCode: string;
  profileId?: string;
}

interface PendingApprovalScreenProps {
  pendingApprovalInfo: PendingApprovalInfo;
  setPendingApprovalInfo: (info: PendingApprovalInfo | null) => void;
  handleLoginAsStudent: (profileId: string) => void | Promise<void>;
  setView: React.Dispatch<React.SetStateAction<View>>;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

/**
 * Shown while a newly-signed-up student waits for their teacher to
 * approve them from the teacher dashboard.  Three detection layers
 * run in parallel:
 *
 *   1. Realtime UPDATE subscription on student_profiles — fires the
 *      instant the teacher's UPDATE lands, regardless of whether the
 *      phone's tab is foregrounded.
 *   2. visibilitychange — the moment the student unlocks the phone,
 *      recheck the status so they don't wait for the next poll tick.
 *   3. 3-second poll — final fallback for networks where Realtime
 *      WebSockets are blocked (strict school proxies).
 *
 * Previously lived inline in App.tsx; extracted here both to shrink
 * the orchestrator and because the screen is fully self-contained —
 * only the five props above cross the boundary.
 */
export default function PendingApprovalScreen({
  pendingApprovalInfo,
  setPendingApprovalInfo,
  handleLoginAsStudent,
  setView,
  showToast,
}: PendingApprovalScreenProps) {
  const { language, dir } = useLanguage();
  const t = pendingApprovalT[language];
  const [checking, setChecking] = useState(false);
  const [dots, setDots] = useState('');
  // Capture the parent-supplied callbacks via refs so the realtime
  // subscription effect below doesn't tear down + recreate the
  // channel + 30s poll on every parent render.  A 2026-05-04 audit
  // found the effect's [handleLoginAsStudent, showToast] deps caused
  // a teardown-then-checkStatus-then-resubscribe cycle on every App
  // render.  showToast is now stable thanks to a useCallback in
  // App.tsx, but handleLoginAsStudent still arrives as a fresh ref
  // when it's redefined on each parent render — this ref pattern
  // makes the effect insulated either way.
  const handleLoginAsStudentRef = useRef(handleLoginAsStudent);
  const showToastRef = useRef(showToast);
  useEffect(() => { handleLoginAsStudentRef.current = handleLoginAsStudent; }, [handleLoginAsStudent]);
  useEffect(() => { showToastRef.current = showToast; }, [showToast]);

  // Animated '...' on the heading for a friendlier "we're watching" feel.
  useEffect(() => {
    const id = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 600);
    return () => clearInterval(id);
  }, []);

  // Approval detection: Realtime + visibility + 3s poll (see JSDoc above).
  useEffect(() => {
    let cancelled = false;

    const applyApprovedRow = (row: { id: string; auth_uid: string | null; status: string } | null | undefined) => {
      if (cancelled) return;
      if (row && row.status === 'approved') {
        try { sessionStorage.removeItem('vocaband_pending_approval'); } catch {}
        showToastRef.current(t.approvedLoggingIn, 'success');
        void handleLoginAsStudentRef.current(row.id);
      }
    };

    const checkStatus = async () => {
      try {
        const { data } = await supabase
          .from('student_profiles')
          .select('status, id, auth_uid')
          .eq('class_code', pendingApprovalInfo.classCode)
          .eq('display_name', pendingApprovalInfo.name)
          .order('joined_at', { ascending: false })
          .limit(1);
        applyApprovedRow(data?.[0]);
      } catch { /* silent retry */ }
    };

    const channel = supabase
      .channel(`pending-approval-${pendingApprovalInfo.classCode}-${pendingApprovalInfo.name}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'student_profiles',
          filter: `class_code=eq.${pendingApprovalInfo.classCode}`,
        },
        (payload) => {
          const row = payload.new as { id: string; auth_uid: string | null; status: string; display_name: string } | undefined;
          if (row && row.display_name === pendingApprovalInfo.name) {
            applyApprovedRow(row);
          }
        }
      )
      .subscribe();

    const handleVisibility = () => {
      if (!document.hidden) checkStatus();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    checkStatus();
    // Slow poll, capped lifetime.
    //
    // Old: setInterval(checkStatus, 3_000) — every 3 seconds.  A
    // student who sat on this screen for one class period
    // contributed 1,200 SELECTs to student_profiles.  In the
    // 2026-04-25 audit the cumulative count from a few stuck tabs
    // was the dominant DB write source.
    //
    // The Realtime subscription above (subscribe() at line 95) is
    // the primary signal; this poll is only a fallback for when
    // Realtime drops.  30s is plenty.  The 30-minute cap stops a
    // tab forgotten on a teacher's desk from polling all night —
    // students still on the page can hit "Check now" manually.
    const POLL_MS = 30_000;
    const MAX_LIFETIME_MS = 30 * 60 * 1000;
    const startedAt = Date.now();
    const pollId: ReturnType<typeof setInterval> = setInterval(() => {
      if (Date.now() - startedAt > MAX_LIFETIME_MS) {
        clearInterval(pollId);
        return;
      }
      checkStatus();
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(pollId);
      document.removeEventListener('visibilitychange', handleVisibility);
      supabase.removeChannel(channel);
    };
    // Effect deps: ONLY the primitives we genuinely depend on (the
    // class code + display name).  showToast and handleLoginAsStudent
    // come in via refs above, so a fresh reference from the parent
    // doesn't tear down the channel + 30s poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingApprovalInfo.classCode, pendingApprovalInfo.name]);

  const handleManualCheck = async () => {
    setChecking(true);
    try {
      const { data } = await supabase
        .from('student_profiles')
        .select('status, id, auth_uid')
        .eq('class_code', pendingApprovalInfo.classCode)
        .eq('display_name', pendingApprovalInfo.name)
        .order('joined_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && data[0].status === 'approved') {
        try { sessionStorage.removeItem('vocaband_pending_approval'); } catch {}
        showToast(t.approvedLoggingIn, 'success');
        void handleLoginAsStudent(data[0].id);
      } else {
        showToast(t.notApprovedYet, 'info');
      }
    } catch {
      showToast(t.couldNotCheck, 'error');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div dir={dir} className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
        <div className="text-6xl mb-4">
          <span className="inline-block animate-bounce">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
        </div>
        <h2 className="text-2xl font-black text-stone-800 mb-2">
          {t.waitingForApproval}{dots}
        </h2>
        <p className="text-stone-500 mb-6">
          {t.bodyLead} <strong>"{pendingApprovalInfo.name}"</strong> {t.inClass(pendingApprovalInfo.classCode)} {t.beforeYouCanPlay}
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-left">
          <p className="text-sm font-bold text-amber-800 mb-2">{t.whatToDoLabel}</p>
          <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
            <li>{t.step1}</li>
            <li>{t.step2}</li>
            <li>{t.step3}</li>
          </ol>
        </div>

        <button
          onClick={handleManualCheck}
          disabled={checking}
          type="button"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          className="w-full py-4 signature-gradient text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 mb-3"
        >
          {checking ? t.checking : t.checkNow}
        </button>

        <button
          onClick={() => {
            setPendingApprovalInfo(null);
            try { sessionStorage.removeItem('vocaband_pending_approval'); } catch {}
            setView('student-account-login');
          }}
          type="button"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          className="text-stone-400 text-sm hover:text-stone-600 transition-colors"
        >
          {t.useDifferentAccount}
        </button>
      </div>
    </div>
  );
}
