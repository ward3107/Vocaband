import { useEffect, useState } from 'react';
import type { View } from '../core/views';
import { supabase } from '../core/supabase';

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
  const [checking, setChecking] = useState(false);
  const [dots, setDots] = useState('');

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
        showToast("You've been approved! Logging in...", 'success');
        void handleLoginAsStudent(row.id);
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
    const pollId = setInterval(checkStatus, 3_000);

    return () => {
      cancelled = true;
      clearInterval(pollId);
      document.removeEventListener('visibilitychange', handleVisibility);
      supabase.removeChannel(channel);
    };
  }, [pendingApprovalInfo.classCode, pendingApprovalInfo.name, handleLoginAsStudent, showToast]);

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
        showToast("You've been approved! Logging in...", 'success');
        void handleLoginAsStudent(data[0].id);
      } else {
        showToast("Not approved yet. Ask your teacher!", 'info');
      }
    } catch {
      showToast('Could not check. Try again.', 'error');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 px-4">
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
          Waiting for approval{dots}
        </h2>
        <p className="text-stone-500 mb-6">
          Your teacher needs to approve <strong>"{pendingApprovalInfo.name}"</strong> in class <strong>{pendingApprovalInfo.classCode}</strong> before you can play.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-left">
          <p className="text-sm font-bold text-amber-800 mb-2">What to do:</p>
          <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
            <li>Tell your teacher you signed up</li>
            <li>They'll approve you from their dashboard</li>
            <li>This screen will update automatically</li>
          </ol>
        </div>

        <button
          onClick={handleManualCheck}
          disabled={checking}
          type="button"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          className="w-full py-4 signature-gradient text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 mb-3"
        >
          {checking ? 'Checking...' : 'Check now'}
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
          Use a different account
        </button>
      </div>
    </div>
  );
}
