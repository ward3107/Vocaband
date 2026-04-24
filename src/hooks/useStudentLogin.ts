/**
 * useStudentLogin — student-account login flow extracted from App.tsx.
 *
 * Three handlers:
 *   - `handleLoginAsStudent(studentId)` — called when a student taps
 *     their name in the "Is that you?" picker. Loads the full profile
 *     via SECURITY DEFINER RPC (or direct-query fallback) and hands it
 *     to processStudentProfile.
 *   - `handleNewStudentSignup()` — first-time signup: signs in
 *     anonymously to satisfy auth.uid() for the get_or_create RPC,
 *     creates / fetches the student_profiles row, routes to the
 *     pending-approval screen if the teacher hasn't approved yet, or
 *     calls handleLoginAsStudent if already approved.
 *   - `processStudentProfile(profile)` — shared finishing path that
 *     enforces the SECURITY check (live session.uid must match the
 *     profile's auth_uid — see commit history for the impersonation
 *     hole this fixed), creates / updates the users table row, loads
 *     the student's class + assignments, and routes to the dashboard.
 *
 * Mechanical extraction. Behaviour, security checks, error handling,
 * and the manualLoginInProgress guard all preserved.
 */
import { useCallback } from "react";
import {
  supabase,
  mapClass,
  USER_COLUMNS,
  CLASS_COLUMNS,
  type AppUser,
  type AssignmentData,
  type ProgressData,
  type ClassData,
} from "../core/supabase";
import { trackAutoError } from "../errorTracking";
import type { View } from "../core/views";

interface ExistingStudent {
  id: string;
  displayName: string;
  xp: number;
  status: string;
  avatar?: string;
}

export interface UseStudentLoginParams {
  // ─── Form state ────────────────────────────────────────────────────
  studentLoginName: string;
  studentLoginClassCode: string;
  studentAvatar: string;
  setStudentLoginName: (v: string) => void;
  setStudentLoginClassCode: (v: string) => void;
  setStudentAvatar: (v: string) => void;
  setExistingStudents: React.Dispatch<React.SetStateAction<ExistingStudent[]>>;
  setShowNewStudentForm: (v: boolean) => void;

  // ─── Output state ──────────────────────────────────────────────────
  setUser: (u: AppUser | null) => void;
  setError: (msg: string | null) => void;
  setLoading: (v: boolean) => void;
  setView: (v: View) => void;
  setBadges: React.Dispatch<React.SetStateAction<string[]>>;
  setXp: React.Dispatch<React.SetStateAction<number>>;
  setStreak: React.Dispatch<React.SetStateAction<number>>;
  setStudentAssignments: React.Dispatch<React.SetStateAction<AssignmentData[]>>;
  setStudentProgress: React.Dispatch<React.SetStateAction<ProgressData[]>>;

  // ─── Cross-hook collaborators ──────────────────────────────────────
  /** App.tsx ref that gates onAuthStateChange while the manual login
   *  flow runs (signInAnonymously fires SIGNED_IN; without this guard
   *  restoreSession would interfere). */
  manualLoginInProgressRef: React.MutableRefObject<boolean>;
  /** App.tsx helper: route to pending-approval screen + persist info. */
  showPendingApproval: (info: { name: string; classCode: string; profileId?: string }) => void;
  /** From useTeacherData: hydrate the student's class assignments. */
  loadAssignmentsForClass: (
    classData: { id: string },
    code: string,
    studentUid: string,
  ) => Promise<void>;
  setPendingApprovalInfo: (info: { name: string; classCode: string; profileId?: string } | null) => void;
}

interface StudentProfileShape {
  id: string;
  display_name: string;
  email: string;
  class_code: string;
  avatar?: string;
  badges?: string[];
  xp?: number;
  status: string;
  auth_uid?: string;
}

export function useStudentLogin(params: UseStudentLoginParams) {
  const {
    studentLoginName, studentLoginClassCode, studentAvatar,
    setStudentLoginName, setStudentLoginClassCode, setStudentAvatar,
    setExistingStudents, setShowNewStudentForm,
    setUser, setError, setLoading, setView,
    setBadges, setXp, setStreak,
    setStudentAssignments, setStudentProgress,
    manualLoginInProgressRef,
    showPendingApproval,
    loadAssignmentsForClass,
    setPendingApprovalInfo,
  } = params;

  // ─── Shared finishing path ──────────────────────────────────────────
  const processStudentProfile = useCallback(async (profile: StudentProfileShape) => {
    // Check approval status — show the waiting screen instead of a generic error
    if (profile.status === 'pending_approval') {
      showPendingApproval({
        name: profile.display_name || '',
        classCode: profile.class_code || '',
        profileId: profile.id,
      });
      setLoading(false);
      return;
    }
    if (profile.status === 'rejected') {
      setError("Your account was not approved. Please contact your teacher.");
      return;
    }

    if (!profile.auth_uid) {
      setError("Student account not fully set up. Please ask your teacher to approve your account.");
      return;
    }

    // SECURITY: The caller's live Supabase session must belong to THIS
    // student's auth_uid. Without this check, anyone who knows a class
    // code could tap a name in the "Is that you?" list and the app
    // would happily create a new users row with that student's
    // display_name/xp/badges — letting them see the victim's dashboard
    // and appear under their name in the class leaderboard.
    //
    // Previous revisions:
    //   * Auto-created a fresh anonymous session on mismatch (shipped
    //     2026-04 and caused the impersonation hole reported on
    //     2026-04-21). REVERTED — never silently create a session
    //     tied to someone else's profile.
    //   * Showed "Just tap your name below to sign back in 👋" with no
    //     recovery path. UX was confusing but at least blocked
    //     impersonation.
    //
    // Current behaviour: if the session is missing or doesn't match,
    // refuse the login and point the student at OAuth / teacher help.
    // Re-authentication for anonymous students who lost their session
    // is an open problem — the only safe paths today are Google
    // sign-in or a teacher-mediated reset.
    const { data: { session: liveSession } } = await supabase.auth.getSession();
    const liveAuthUid = liveSession?.user?.id ?? null;
    if (!liveAuthUid || liveAuthUid !== profile.auth_uid) {
      console.warn('[processStudentProfile] blocked login — session/profile auth_uid mismatch', {
        profileAuthUid: profile.auth_uid,
        sessionAuthUid: liveAuthUid,
      });
      setError(
        "Can't sign you in as this student on this device. " +
        "Try Google sign-in, or ask your teacher to reset your account."
      );
      return;
    }
    const studentUid = liveAuthUid;

    // Create user data with the profile's auth_uid
    const userData: AppUser = {
      uid: studentUid, // Use profile auth_uid directly
      displayName: profile.display_name,
      email: profile.email,
      role: 'student',
      classCode: profile.class_code,
      avatar: profile.avatar || '🦊',
      badges: profile.badges || [],
      xp: profile.xp || 0,
      isGuest: false,
    };

    setUser(userData);

    // Ensure user record exists in users table (for XP/streak tracking)
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select(USER_COLUMNS)
      .eq('uid', studentUid)
      .maybeSingle();

    if (checkError) {
      trackAutoError(checkError, 'Student user record check failed during signup');
    } else if (!existingUser) {
      // Create user record if it doesn't exist
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          uid: studentUid,
          email: profile.email,
          display_name: profile.display_name,
          role: 'student',
          class_code: profile.class_code,
          avatar: profile.avatar || '🦊',
          badges: profile.badges || [],
          xp: profile.xp || 0,
          streak: 0,
        });

      if (insertError) {
        trackAutoError(insertError, 'Failed to create student user record during signup');
      }
    } else {
      // Update existing user record with latest profile data
      const { error: updateError } = await supabase
        .from('users')
        .update({
          avatar: profile.avatar || '🦊',
          badges: profile.badges || [],
          xp: profile.xp || existingUser.xp,
        })
        .eq('uid', studentUid);

      if (updateError) {
        trackAutoError(updateError, 'Failed to update student user record during login');
      }
    }

    // Fetch class data and assignments using RPC to bypass RLS
    const code = profile.class_code;

    // Use RPC to get class data (bypasses RLS)
    const { data: classResult, error: classError } = await supabase
      .rpc('get_class_by_code', { p_class_code: code });

    if (classError) {
      console.error('Class RPC error:', classError);
      // Fallback: try direct query (might fail due to RLS, but worth trying)
      const { data: fallbackClassRows } = await supabase
        .from('classes').select(CLASS_COLUMNS).eq('code', code);

      if (fallbackClassRows && fallbackClassRows.length > 0) {
        await loadAssignmentsForClass(mapClass(fallbackClassRows[0]), code, profile.auth_uid);
      } else {
        setStudentAssignments([]);
        setStudentProgress([]);
      }
    } else if (classResult && classResult.length > 0) {
      const classData: ClassData = mapClass(classResult[0]);
      await loadAssignmentsForClass(classData, code, profile.auth_uid);
    } else {
      console.warn('No class found for code:', code);
      setStudentAssignments([]);
      setStudentProgress([]);
    }

    setBadges(profile.badges || []);
    setXp(profile.xp || 0);
    setStreak(0); // Will fetch from DB later
    setView("student-dashboard");
  }, [
    showPendingApproval, setLoading, setError, setUser, setBadges, setXp, setStreak,
    setView, setStudentAssignments, setStudentProgress, loadAssignmentsForClass,
  ]);

  // ─── Login by tapping a name in the picker ─────────────────────────
  const handleLoginAsStudent = useCallback(async (studentId: string) => {
    // Look up the student's full profile including auth_uid
    try {
      // Use RPC to bypass RLS for login
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('get_student_profile_for_login', { p_student_id: studentId });

      // Handle RPC error (function might not exist yet)
      if (rpcError) {
        const { data: profile, error } = await supabase
          .from('student_profiles')
          .select('*')
          .eq('id', studentId)
          .single();

        if (error) {
          setError("Could not load student profile. Please try again.");
          return;
        }

        if (!profile) {
          setError("Student profile not found. Please ask your teacher to approve your account.");
          return;
        }

        // Process profile from fallback
        await processStudentProfile(profile);
        return;
      }

      // Get first result from RPC
      const profile = rpcResult && rpcResult.length > 0 ? rpcResult[0] : null;

      if (!profile) {
        setError("Student profile not found. Please ask your teacher to approve your account.");
        return;
      }

      // Process profile from RPC
      await processStudentProfile(profile);
    } catch (error) {
      console.error('Error logging in as student:', error);
      setError("Could not log in. Please try again.");
    }
  }, [processStudentProfile, setError]);

  // ─── New-student signup ────────────────────────────────────────────
  const handleNewStudentSignup = useCallback(async () => {
    const trimmedName = studentLoginName.trim().slice(0, 30);
    const trimmedCode = studentLoginClassCode.trim().toUpperCase();

    if (!trimmedName || !trimmedCode) {
      setError("Please enter both class code and your name.");
      return;
    }

    // Guard: prevent onAuthStateChange → restoreSession from interfering
    // while this function owns the login flow.  signInAnonymously() fires
    // SIGNED_IN, and without this guard restoreSession would run (can't
    // find the user row yet) and redirect to landing.
    manualLoginInProgressRef.current = true;

    try {
      // Step 1: Sign in anonymously to ensure auth.uid() is set for the RPC
      const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError || !signInData.session) {
        setError("Could not create account. Please try again.");
        console.error('Sign-in error:', signInError);
        return;
      }

      // Step 2: Use the RPC function which has SECURITY DEFINER to bypass RLS
      const { data: result, error: rpcError } = await supabase
        .rpc('get_or_create_student_profile', {
          p_class_code: trimmedCode,
          p_display_name: trimmedName,
          p_avatar: studentAvatar,
        });

      if (rpcError) throw rpcError;

      if (!result || result.length === 0) {
        throw new Error('Failed to create student profile');
      }

      const profile = result[0].profile;

      if (profile.status === 'approved') {
        // Already approved, just log them in
        handleLoginAsStudent(profile.id);
        return;
      } else if (profile.status === 'pending_approval') {
        // Navigate to a dedicated waiting screen instead of just a toast.
        // The student needs to understand what's happening and what to do next.
        const info = {
          name: trimmedName,
          classCode: trimmedCode,
          profileId: profile.id,
        };
        setPendingApprovalInfo(info);
        setView("student-pending-approval");

        // Persist so the pending screen survives page refresh
        try { sessionStorage.setItem('vocaband_pending_approval', JSON.stringify(info)); } catch {}

        // Clear form
        setStudentLoginName("");
        setStudentLoginClassCode("");
        setStudentAvatar("🦊");
        setExistingStudents([]);
        setShowNewStudentForm(false);
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError("Could not create account. Please try again.");
    } finally {
      manualLoginInProgressRef.current = false;
    }
  }, [
    studentLoginName, studentLoginClassCode, studentAvatar,
    setError, setView, setStudentLoginName, setStudentLoginClassCode,
    setStudentAvatar, setExistingStudents, setShowNewStudentForm,
    setPendingApprovalInfo, handleLoginAsStudent, manualLoginInProgressRef,
  ]);

  return {
    handleLoginAsStudent,
    handleNewStudentSignup,
    processStudentProfile,
  };
}
