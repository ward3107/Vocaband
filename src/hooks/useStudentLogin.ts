/**
 * useStudentLogin — student-account login flow extracted from App.tsx.
 *
 * Two handlers:
 *   - `handleLoginAsStudent(studentId)` — loads a student's full profile
 *     via SECURITY DEFINER RPC (or direct-query fallback) and hands it
 *     to processStudentProfile. Called from two places today:
 *       1. PendingApprovalScreen, once the teacher has approved and the
 *          student's session is still the original signup session.
 *       2. The OAuth approved-student path (handleOAuthStudentDetected).
 *   - `processStudentProfile(profile)` — shared finishing path that
 *     enforces the SECURITY check (live session.uid must match the
 *     profile's auth_uid — see commit history for the impersonation
 *     hole this fixed), creates / updates the users table row, loads
 *     the student's class + assignments, and routes to the dashboard.
 *
 * The legacy `handleNewStudentSignup` (class-code + typed name + anon
 * sign-in) was removed when we moved student login to OAuth-only.
 * Brand-new students now go through `OAuthClassCode` post-redirect.
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

export interface UseStudentLoginParams {
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
  /** App.tsx helper: route to pending-approval screen + persist info. */
  showPendingApproval: (info: { name: string; classCode: string; profileId?: string }) => void;
  /** From useTeacherData: hydrate the student's class assignments. */
  loadAssignmentsForClass: (
    classData: { id: string },
    code: string,
    studentUid: string,
  ) => Promise<void>;
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
    setUser, setError, setLoading, setView,
    setBadges, setXp, setStreak,
    setStudentAssignments, setStudentProgress,
    showPendingApproval,
    loadAssignmentsForClass,
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
    // OAuth-only login (the current flow) ensures session.user.id always
    // equals the profile's auth_uid for non-attacker callers.
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

  // ─── Login by profile id (used by PendingApprovalScreen post-approval
  //     and by handleOAuthStudentDetected). ─────────────────────────
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

  return {
    handleLoginAsStudent,
    processStudentProfile,
  };
}
