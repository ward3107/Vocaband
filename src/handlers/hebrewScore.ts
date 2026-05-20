/**
 * Persist a Hebrew round's final score to the gradebook + (when the
 * student is in a Quick Play session) push the cumulative round score
 * to the live podium so the teacher's QuickPlayMonitor leaderboard
 * updates in real time.
 *
 * Mirrors what the English flow does via useGameFinish's
 * quickPlaySocketUpdateScore callback — accumulate per-mode into the
 * session-wide cumulative ref so consecutive modes don't regress and
 * the server stops accepting updates.
 *
 * The save_student_progress RPC is reused from the English flow; the
 * Hebrew flow passes empty mistakes + word_attempts arrays — Hebrew
 * progress doesn't track per-question detail yet.  Total > 0 is the
 * caller's invariant (the round-build path early-returns on empty
 * pools), so percentage clamping is defensive.
 */
import { supabase, type AppUser, type AssignmentData } from '../core/supabase';

export type HebrewMode = 'niqqud' | 'shoresh' | 'synonym' | 'listening';

export interface HebrewScoreDeps {
  user: AppUser;
  activeAssignment: AssignmentData;
  quickPlayActiveSession: { id: string } | null;
  qpCumulativeScoreRef: { current: number };
  quickPlaySocketUpdateScore: (cumulativeScore: number) => void;
}

export async function persistHebrewScore(
  mode: HebrewMode,
  score: number,
  total: number,
  deps: HebrewScoreDeps,
): Promise<void> {
  const {
    user,
    activeAssignment,
    quickPlayActiveSession,
    qpCumulativeScoreRef,
    quickPlaySocketUpdateScore,
  } = deps;

  if (quickPlayActiveSession) {
    qpCumulativeScoreRef.current += Math.max(0, score);
    quickPlaySocketUpdateScore(qpCumulativeScoreRef.current);
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const sessionUid = session?.user?.id;
    const studentUid = sessionUid
      ? localStorage.getItem(`vocaband_student_${sessionUid}`) || sessionUid
      : user.uid;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    await supabase.rpc('save_student_progress', {
      p_student_name: user.displayName,
      p_student_uid: studentUid,
      p_assignment_id: activeAssignment.id,
      p_class_code: user.classCode || '',
      p_score: pct,
      p_mode: mode,
      p_mistakes: [],
      p_avatar: user.avatar || '🦊',
      p_word_attempts: [],
    });
  } catch (err) {
    // Silent — same pattern as the English flow.  The student shouldn't
    // see a network error after their score screen.
    console.error('[VocaHebrew] save_student_progress failed:', err);
  }
}
