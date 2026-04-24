/**
 * useOAuthFlow — the three Google-OAuth post-callback handlers,
 * extracted from App.tsx.
 *
 * After a Google OAuth roundtrip lands back on the app, App.tsx
 * inspects the resulting Supabase user and routes it to one of three
 * paths. All three live here:
 *
 *   - `handleOAuthTeacherDetected(email)` — the user already exists
 *     as a teacher. Just close the OAuth UI and let the existing
 *     restoreSession path finish the login.
 *
 *   - `handleOAuthStudentDetected(email)` — the user matches an
 *     existing student_profiles row. Validate approval status, run
 *     the class-switch detection (if the student typed a different
 *     class code on the way in), upsert the users row, hydrate the
 *     student dashboard.
 *
 *   - `handleOAuthNewUser(email, authUid)` — no profile exists yet.
 *     Pop the OAuth class-code modal so the new user can pick their
 *     role + class.
 *
 * Mechanical extraction; no behaviour changes. The class-switch
 * RPC fallback path (when class_lookup_by_code 401s mid-OAuth)
 * stays verbatim.
 */
import { useCallback } from "react";
import {
  supabase,
  mapClass,
  mapAssignment,
  mapProgress,
  mapUserToDb,
  CLASS_COLUMNS,
  PROGRESS_COLUMNS,
  type AppUser,
  type AssignmentData,
  type ProgressData,
} from "../core/supabase";
import type { View } from "../core/views";

interface PendingClassSwitch {
  fromCode: string;
  fromClassName: string | null;
  toCode: string;
  toClassName: string | null;
  supabaseUser: { id: string; email: string | null | undefined };
}

export interface UseOAuthFlowParams {
  // Output state
  setUser: (u: AppUser | null) => void;
  setError: (msg: string | null) => void;
  setLoading: (v: boolean) => void;
  setView: (v: View) => void;
  setIsOAuthCallback: (v: boolean) => void;
  setBadges: React.Dispatch<React.SetStateAction<string[]>>;
  setXp: React.Dispatch<React.SetStateAction<number>>;
  setStreak: React.Dispatch<React.SetStateAction<number>>;
  setStudentAssignments: React.Dispatch<React.SetStateAction<AssignmentData[]>>;
  setStudentProgress: React.Dispatch<React.SetStateAction<ProgressData[]>>;
  setClassNotFoundIntent: (v: string | null) => void;
  setPendingClassSwitch: (v: PendingClassSwitch | null) => void;
  setOauthEmail: (v: string) => void;
  setOauthAuthUid: (v: string) => void;
  setShowOAuthClassCode: (v: boolean) => void;

  // App-level helpers
  showPendingApproval: (info: { name: string; classCode: string; profileId?: string }) => void;
  readIntendedClassCode: () => string | null;
  clearIntendedClassCode: () => void;
}

export function useOAuthFlow(params: UseOAuthFlowParams) {
  const {
    setUser, setError, setLoading, setView, setIsOAuthCallback,
    setBadges, setXp, setStreak,
    setStudentAssignments, setStudentProgress,
    setClassNotFoundIntent, setPendingClassSwitch,
    setOauthEmail, setOauthAuthUid, setShowOAuthClassCode,
    showPendingApproval, readIntendedClassCode, clearIntendedClassCode,
  } = params;

  const handleOAuthTeacherDetected = useCallback(async (_email: string) => {
    try {
      // The onAuthStateChange → restoreSession path already handles teacher
      // login (including auto-creating the users row for allowed Google
      // sign-ins).  Just close the OAuth UI and let it finish.
      setIsOAuthCallback(false);
      setLoading(true);
      // If restoreSession already ran and set the view, we're done.
      // If not, the next onAuthStateChange event will trigger it.
    } catch (error) {
      console.error('Teacher detection error:', error);
      setError('Could not load teacher profile.');
    }
  }, [setIsOAuthCallback, setLoading, setError]);

  const handleOAuthStudentDetected = useCallback(async (email: string) => {
    try {
      // Load student profile from student_profiles table
      const { data: studentData, error } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !studentData) {
        setError('Student profile not found. Please sign up again.');
        return;
      }

      if (studentData.status !== 'active' && studentData.status !== 'approved') {
        showPendingApproval({
          name: studentData.display_name || '',
          classCode: studentData.class_code || '',
          profileId: studentData.id,
        });
        return;
      }

      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (!supabaseUser) {
        setError('Just tap your name below to sign back in 👋');
        return;
      }

      // Class-switch detection: same logic as the restoreSession path.
      // If the student entered a class code that differs from their
      // current one and it's a real class, show the switch modal instead
      // of logging them into their existing class.
      const intendedCode = readIntendedClassCode();
      const intendedNorm = intendedCode?.trim().toUpperCase() || null;
      const currentNorm = studentData.class_code?.trim().toUpperCase() || '';
      if (intendedNorm && currentNorm && intendedNorm !== currentNorm) {
        // Same RLS workaround as above — use the SECURITY DEFINER RPC so
        // non-member students can still verify the target class exists.
        const { data: intendedClassRows, error: lookupErr } = await supabase
          .rpc('class_lookup_by_code', { p_code: intendedNorm });
        if (lookupErr) {
          // Surface the real reason instead of the generic "not found"
          // banner. Common causes: migration 20260428 requires auth but
          // auth.uid() was null mid-OAuth; rate limit hit; migration
          // 20260426 never applied so the RPC doesn't exist server-side.
          console.error('[OAuth class switch] RPC failed:', lookupErr);
          setClassNotFoundIntent(`${intendedNorm} (lookup failed: ${lookupErr.message})`);
          clearIntendedClassCode();
        } else if (intendedClassRows && intendedClassRows.length > 0) {
          const { data: currentClassRows } = await supabase
            .from('classes').select('code, name').eq('code', studentData.class_code);
          setIsOAuthCallback(false);
          // Populate in-memory user so dashboard can render as the modal's
          // backdrop rather than flashing landing/loader.
          const switchUser: AppUser = {
            uid: supabaseUser.id,
            email: studentData.email,
            displayName: studentData.display_name || email.split('@')[0],
            role: 'student',
            classCode: studentData.class_code,
            xp: studentData.xp || 0,
            avatar: studentData.avatar,
            createdAt: studentData.created_at,
          };
          setUser(switchUser);
          setPendingClassSwitch({
            fromCode: studentData.class_code,
            fromClassName: currentClassRows?.[0]?.name ?? null,
            toCode: intendedNorm,
            toClassName: intendedClassRows[0].name ?? null,
            supabaseUser: { id: supabaseUser.id, email: supabaseUser.email },
          });
          setView("student-dashboard");
          clearIntendedClassCode();
          return;
        } else if (!lookupErr) {
          // RPC succeeded with zero rows — the class genuinely doesn't
          // exist. Show the standard not-found banner. (Error branch
          // already set its own more informative banner above.)
          setClassNotFoundIntent(intendedNorm);
          clearIntendedClassCode();
        }
      } else if (intendedCode) {
        clearIntendedClassCode();
      }

      // Ensure a users table row exists for this OAuth student (restoreSession needs it)
      const studentUser: AppUser = {
        uid: supabaseUser.id,
        email: studentData.email,
        displayName: studentData.display_name || email.split('@')[0],
        role: 'student',
        classCode: studentData.class_code,
        xp: studentData.xp || 0,
        avatar: studentData.avatar,
        createdAt: studentData.created_at,
      };
      await supabase.from('users').upsert(mapUserToDb(studentUser), { onConflict: 'uid' });

      setUser(studentUser);
      setIsOAuthCallback(false);

      // Load class assignments and progress
      if (studentData.class_code) {
        const { data: classRows } = await supabase
          .from('classes').select(CLASS_COLUMNS).eq('code', studentData.class_code);
        if (classRows && classRows.length > 0) {
          const classData = mapClass(classRows[0]);
          const [assignResult, progressResult] = await Promise.all([
            supabase.rpc('get_assignments_for_class', { p_class_id: classData.id }),
            supabase.from('progress').select(PROGRESS_COLUMNS).eq('class_code', studentData.class_code).eq('student_uid', supabaseUser.id),
          ]);
          setStudentAssignments((assignResult.data ?? []).map(mapAssignment));
          setStudentProgress((progressResult.data ?? []).map(mapProgress));
        }
      }

      setBadges(studentUser.badges || []);
      setXp(studentUser.xp ?? 0);
      setStreak(studentUser.streak ?? 0);
      setView("student-dashboard");
      setLoading(false);
    } catch (error) {
      console.error('Student detection error:', error);
      setError('Could not load student profile.');
    }
  }, [
    setError, setUser, setIsOAuthCallback, setView, setLoading,
    setBadges, setXp, setStreak,
    setStudentAssignments, setStudentProgress,
    setClassNotFoundIntent, setPendingClassSwitch,
    showPendingApproval, readIntendedClassCode, clearIntendedClassCode,
  ]);

  const handleOAuthNewUser = useCallback((email: string, authUid: string) => {
    setOauthEmail(email);
    setOauthAuthUid(authUid);
    setShowOAuthClassCode(true);
    setIsOAuthCallback(false);
    setLoading(false);
  }, [setOauthEmail, setOauthAuthUid, setShowOAuthClassCode, setIsOAuthCallback, setLoading]);

  return {
    handleOAuthTeacherDetected,
    handleOAuthStudentDetected,
    handleOAuthNewUser,
  };
}
