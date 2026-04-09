import { useRef } from "react";
import type React from "react";
import {
  supabase,
  mapUser,
  mapClass,
  mapAssignment,
  mapProgress,
  mapUserToDb,
  type AppUser,
  type ClassData,
  type AssignmentData,
  type ProgressData,
} from "../core/supabase";
import { trackError, trackAutoError } from "../errorTracking";
import { PRIVACY_POLICY_VERSION } from "../config/privacy-config";
import { SOCKET_EVENTS } from "../core/types";

export interface UseAuthParams {
  user: AppUser | null;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  setView: (v: string) => void;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  // Student login state
  existingStudents: Array<{ id: string; displayName: string; xp: number; status: string; avatar?: string }>;
  setExistingStudents: (v: Array<{ id: string; displayName: string; xp: number; status: string; avatar?: string }>) => void;
  studentLoginClassCode: string;
  setStudentLoginClassCode: (v: string) => void;
  studentLoginName: string;
  setStudentLoginName: (v: string) => void;
  studentAvatar: string;
  setStudentAvatar: (v: string) => void;
  setShowNewStudentForm: (v: boolean) => void;
  // OAuth
  setIsOAuthCallback: (v: boolean) => void;
  setOauthEmail: (v: string | null) => void;
  setOauthAuthUid: (v: string | null) => void;
  setShowOAuthClassCode: (v: boolean) => void;
  // Student data
  setStudentAssignments: React.Dispatch<React.SetStateAction<AssignmentData[]>>;
  setStudentProgress: React.Dispatch<React.SetStateAction<ProgressData[]>>;
  setStudentDataLoading: (v: boolean) => void;
  // Gamification
  xp: number;
  setXp: (v: number) => void;
  streak: number;
  setStreak: (v: number) => void;
  badges: string[];
  setBadges: (v: string[]) => void;
  // Consent
  setNeedsConsent: (v: boolean) => void;
  setConsentChecked: (v: boolean) => void;
  // Approve/reject
  setRejectStudentModal: (v: { id: string; displayName: string } | null) => void;
  // External functions needed by handleStudentLogin
  loadPendingStudents: () => void;
  checkConsent: (user: AppUser) => void;
  socket: any;
  loading: boolean;
  // Refs
  manualLoginInProgress: React.MutableRefObject<boolean>;
  restoreInProgress: React.MutableRefObject<boolean>;
}

export function useAuth(params: UseAuthParams) {
  const {
    user, setUser, setView, setLoading, setError, showToast,
    existingStudents, setExistingStudents,
    studentLoginClassCode, setStudentLoginClassCode,
    studentLoginName, setStudentLoginName,
    studentAvatar, setStudentAvatar, setShowNewStudentForm,
    setIsOAuthCallback, setOauthEmail, setOauthAuthUid, setShowOAuthClassCode,
    setStudentAssignments, setStudentProgress, setStudentDataLoading,
    setXp, setStreak, setBadges,
    setNeedsConsent, setConsentChecked,
    setRejectStudentModal,
    loadPendingStudents, checkConsent, socket, loading,
    manualLoginInProgress,
  } = params;

  const loginAttemptsRef = useRef<number[]>([]);

  const createGuestUser = (name: string, prefix: string = 'guest', avatar: string = '\uD83E\uDD8A'): AppUser => {
    // Mobile-compatible UUID generation (crypto.randomUUID() not supported on some mobile browsers)
    const generateUUID = (): string => {
      // Prefer native crypto.randomUUID when available
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
      }

      // Fallback: generate a UUID-like string using crypto.getRandomValues if available
      if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);

        // Set version (4) and variant bits to match UUID v4 layout
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;

        const toHex = (b: number) => b.toString(16).padStart(2, "0");
        const hex = Array.from(bytes, toHex).join("");

        return [
          hex.substring(0, 8),
          hex.substring(8, 12),
          hex.substring(12, 16),
          hex.substring(16, 20),
          hex.substring(20)
        ].join("-");
      }

      // Last-resort fallback: use timestamp plus a monotonically increasing counter.
      // This avoids Math.random but does not provide strong unpredictability.
      const now = Date.now().toString(36);
      if (!(generateUUID as any)._counter) {
        (generateUUID as any)._counter = 0;
      }
      (generateUUID as any)._counter = ((generateUUID as any)._counter + 1) | 0;
      const counter = ((generateUUID as any)._counter as number).toString(36);
      return `${now}-${counter}`;
    };

    return {
      uid: `${prefix}-${generateUUID()}`,
      displayName: name.trim().slice(0, 30),
      email: undefined,
      role: "guest",
      isGuest: true,
      avatar,
      xp: 0,
      classCode: undefined,
      createdAt: new Date().toISOString()
    };
  };

  const recordConsent = async () => {
    localStorage.setItem('vocaband_consent_version', PRIVACY_POLICY_VERSION);
    // Also persist to the consent_log DB table for compliance/audit trail
    if (user?.uid) {
      try {
        await supabase.from('consent_log').insert({
          uid: user.uid,
          policy_version: PRIVACY_POLICY_VERSION,
          terms_version: PRIVACY_POLICY_VERSION,
          action: 'accept',
        });
      } catch (error) {
        trackError('Could not persist consent to database', 'database', 'low', { uid: user?.uid });
      }
    }
    setNeedsConsent(false);
    setConsentChecked(false);
  };

  const loadStudentsInClass = async (classCode: string) => {
    const trimmedCode = classCode.trim().toUpperCase();
    if (!trimmedCode) return;


    try {
      // Use the new RPC function that bypasses RLS
      const { data, error } = await supabase
        .rpc('list_students_in_class', {
          p_class_code: trimmedCode
        });


      if (error) {
        console.error('RPC error:', error);
        // Fallback to direct query if RPC doesn't exist yet
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('student_profiles')
          .select('id, display_name, xp, status, avatar')
          .eq('class_code', trimmedCode)
          .eq('status', 'approved')
          .order('display_name', { ascending: true });


        if (fallbackError) {
          if (fallbackError.code === '42P01') {
            setExistingStudents([]);
            return;
          }
          throw fallbackError;
        }

        const mappedStudents = (fallbackData || []).map(s => ({
          id: s.id,
          displayName: s.display_name,
          xp: s.xp || 0,
          status: s.status,
          avatar: s.avatar || '🦊'
        }));

        setExistingStudents(mappedStudents);
        return;
      }

      // Map RPC results
      const mappedStudents = (data || []).map((s: any) => ({
        id: s.id,
        displayName: s.display_name,
        xp: s.xp || 0,
        status: s.status,
        avatar: s.avatar || '🦊'
      }));

      setExistingStudents(mappedStudents);
    } catch (error) {
      console.error('Error loading students:', error);
      setError("Could not load students. Please check the class code.");
      setExistingStudents([]);
    }
  };

  const handleLoginAsStudent = async (studentId: string) => {
    const student = existingStudents.find(s => s.id === studentId);
    if (!student) return;


    // Look up the student's full profile including auth_uid
    try {
      // Use RPC to bypass RLS for login
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('get_student_profile_for_login', {
          p_student_id: studentId
        });


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
  };

  const processStudentProfile = async (profile: any) => {

    // Check approval status
    if (profile.status === 'pending_approval') {
      setError("Your account is pending approval from your teacher. Please check back later!");
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

    // For students with approved accounts (from teacher approval workflow):
    // We use their profile.auth_uid directly without creating a Supabase auth session.
    // The save_student_progress RPC bypasses RLS, so we don't need a valid session.
    const studentUid = profile.auth_uid;

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
      isGuest: false
    };


    setUser(userData);

    // Ensure user record exists in users table (for XP/streak tracking)
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
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
      } else {
      }
    } else {
      // Update existing user record with latest profile data
      const { error: updateError } = await supabase
        .from('users')
        .update({
          avatar: profile.avatar || '🦊',
          badges: profile.badges || [],
          xp: profile.xp || existingUser.xp
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
      .rpc('get_class_by_code', {
        p_class_code: code
      });


    if (classError) {
      console.error('Class RPC error:', classError);
      // Fallback: try direct query (might fail due to RLS, but worth trying)
      const { data: fallbackClassRows } = await supabase
        .from('classes').select('*').eq('code', code);

      if (fallbackClassRows && fallbackClassRows.length > 0) {
        await loadAssignmentsForClass(mapClass(fallbackClassRows[0]), code, profile.auth_uid);
      } else {
        setStudentAssignments([]);
        setStudentProgress([]);
      }
    } else if (classResult && classResult.length > 0) {
      const classData = mapClass(classResult[0]);
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
  };

  const loadAssignmentsForClass = async (classData: any, code: string, studentUid: string) => {

    // Use RPC to bypass RLS for assignments
    const { data: assignResult, error: assignError } = await supabase
      .rpc('get_assignments_for_class', {
        p_class_id: classData.id
      });

    // Progress still uses direct query (should work for student's own progress)
    const { data: progressResult } = await supabase
      .from('progress').select('*').eq('class_code', code).eq('student_uid', studentUid);


    if (assignError) {
      console.error('Assignments RPC error:', assignError);
      // Fallback to direct query
      const { data: fallbackData } = await supabase
        .from('assignments').select('*').eq('class_id', classData.id);
      setStudentAssignments((fallbackData ?? []).map(mapAssignment));
    } else {
      setStudentAssignments((assignResult ?? []).map(mapAssignment));
    }

    setStudentProgress((progressResult ?? []).map(mapProgress));
  };

  const handleNewStudentSignup = async () => {
    const trimmedName = studentLoginName.trim().slice(0, 30);
    const trimmedCode = studentLoginClassCode.trim().toUpperCase();

    if (!trimmedName || !trimmedCode) {
      setError("Please enter both class code and your name.");
      return;
    }

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
          p_avatar: studentAvatar
        });


      if (rpcError) throw rpcError;

      if (!result || result.length === 0) {
        throw new Error('Failed to create student profile');
      }

      const profile = result[0].profile;
      const isNew = result[0].is_new;


      if (profile.status === 'approved') {
        // Already approved, just log them in
        handleLoginAsStudent(profile.id);
        return;
      } else if (profile.status === 'pending_approval') {
        const message = isNew
          ? `Account created! Tell your teacher to approve "${trimmedName}" in class ${trimmedCode}. Once approved, you can log in and start earning XP!`
          : `Your account is pending approval. Please ask your teacher to approve it!`;


        // Clear form if new account
        if (isNew) {
          setStudentLoginName("");
          setStudentLoginClassCode("");
          setStudentAvatar("🦊");
          setExistingStudents([]);
          setShowNewStudentForm(false);
        }

        showToast(message, "success");
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError("Could not create account. Please try again.");
    }
  };

  const handleOAuthTeacherDetected = async (_email: string) => {
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
  };

  const handleOAuthStudentDetected = async (email: string) => {
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
        setError('Your account is pending approval. Please ask your teacher to approve it.');
        return;
      }

      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (!supabaseUser) {
        setError('Session expired. Please sign in again.');
        return;
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
          .from('classes').select('*').eq('code', studentData.class_code);
        if (classRows && classRows.length > 0) {
          const classData = mapClass(classRows[0]);
          const [assignResult, progressResult] = await Promise.all([
            supabase.from('assignments').select('*').eq('class_id', classData.id),
            supabase.from('progress').select('*').eq('class_code', studentData.class_code).eq('student_uid', supabaseUser.id),
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
  };

  const handleOAuthNewUser = (email: string, authUid: string) => {
    setOauthEmail(email);
    setOauthAuthUid(authUid);
    setShowOAuthClassCode(true);
    setIsOAuthCallback(false);
    setLoading(false);
  };

  const handleApproveStudent = async (studentId: string, displayName: string) => {
    try {
      // Call the approve_student function
      const { error } = await supabase.rpc('approve_student', {
        p_profile_id: studentId
      });


      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      // Refresh the list
      await loadPendingStudents();

      // Show success
      showToast(`Approved ${displayName}! They can now log in and start learning.`, "success");
    } catch (error) {
      console.error('Error approving student:', error);
      showToast("Could not approve student. Please try again.", "error");
    }
  };

  const handleRejectStudent = async (studentId: string, displayName: string) => {
    setRejectStudentModal({ id: studentId, displayName });
  };

  const confirmRejectStudent = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('student_profiles')
        .update({ status: 'rejected' })
        .eq('id', studentId);

      if (error) throw error;

      // Refresh the list
      await loadPendingStudents();
    } catch (error) {
      console.error('Error rejecting student:', error);
      showToast("Could not reject student. Please try again.", "error");
    }
  };

  const handleStudentLogin = async (code: string, name: string) => {
    if (loading) return;
    const trimmedName = name.trim().slice(0, 30);
    const trimmedCode = code.trim().slice(0, 20);
    if (!trimmedName || !trimmedCode) { setError("Please enter both code and name."); return; }

    // Client-side rate limit: max 5 attempts per 60 seconds
    const now = Date.now();
    loginAttemptsRef.current = loginAttemptsRef.current.filter(t => now - t < 60_000);
    if (loginAttemptsRef.current.length >= 5) {
      setError("Too many login attempts. Please wait a minute and try again.");
      return;
    }
    loginAttemptsRef.current.push(now);
    manualLoginInProgress.current = true;
    setLoading(true);
    setError(null);

    // Safety: if the whole login takes longer than 20 seconds on a slow
    // mobile network, stop the spinner and show an error.
    const loginTimeout = setTimeout(() => {
      if (manualLoginInProgress.current) {
        manualLoginInProgress.current = false;
        setLoading(false);
        setError("Login is taking too long. Please check your connection and try again.");
      }
    }, 20000);

    try {
      // Step 1: Sign in anonymously — reuse existing anonymous session if present.
      // signInAnonymously() acquires the Supabase auth lock, so we avoid
      // calling getSession() first (that would acquire the lock twice).
      const { data, error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError || !data.session) {
        setError("Login failed: " + (signInError?.message ?? "Could not create session"));
        return;
      }
      const session = data.session;
      const studentUid = session.user.id;

      // Step 2: Look up class + existing user profile in parallel
      // OPTIMIZATION: Check cache first to avoid database query
      let classData: ClassData | undefined;
      const cacheKey = `vocaband_class_${trimmedCode}`;

      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data, cached: cacheTime } = JSON.parse(cached);
          // Use cache if less than 5 minutes old
          if (Date.now() - cacheTime < 5 * 60 * 1000) {
            classData = data;
          }
        }
      } catch { /* ignore cache errors */ }

      const classResult = classData ? null : await supabase.from('classes').select('*').eq('code', trimmedCode);
      if (classResult?.error) throw classResult.error;

      if (classResult?.data && classResult.data.length > 0) {
        classData = mapClass(classResult.data[0]);
        // Update cache with fresh data
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            data: classData,
            cached: Date.now(),
          }));
        } catch { /* ignore */ }
      }

      if (!classData) {
        setError("Invalid Class Code!");
        return;
      }

      const [userResult] = await Promise.all([
        supabase.from('users').select('*').eq('uid', studentUid).maybeSingle(),
      ]);

      // Cache class info in localStorage for faster future logins
      try {
        localStorage.setItem(`vocaband_class_${trimmedCode}`, JSON.stringify({
          data: classData,
          cached: Date.now(),
        }));
      } catch { /* ignore */ }

      // Step 2.5: Check if student is approved (for student_profiles workflow)
      // OPTIMIZATION: Check both formats in parallel instead of sequentially
      const studentUniqueIdNew = trimmedCode.toLowerCase() + trimmedName.toLowerCase() + ':' + studentUid;
      const studentUniqueIdLegacy = trimmedCode.toLowerCase() + trimmedName.toLowerCase();

      // Check both new and legacy formats in parallel - much faster!
      const [newFormatResult, legacyFormatResult] = await Promise.all([
        supabase.from('student_profiles').select('status').eq('unique_id', studentUniqueIdNew).maybeSingle(),
        supabase.from('student_profiles').select('status').eq('unique_id', studentUniqueIdLegacy).maybeSingle(),
      ]);

      // Use new format result if found, otherwise fall back to legacy
      const studentProfile = newFormatResult.data || legacyFormatResult.data;
      const profileError = newFormatResult.error || legacyFormatResult.error;

      if (profileError) {
        console.error('Error checking student approval:', profileError);
      } else if (studentProfile) {
        if (studentProfile.status === 'pending_approval') {
          setError("Your account is pending approval from your teacher. Please check back later!");
          return;
        }
        if (studentProfile.status === 'rejected') {
          setError("Your account was not approved. Please contact your teacher.");
          return;
        }
      }

      // Step 3: Upsert student profile (must happen before fetching assignments — RLS needs class membership)
      let userData: AppUser;
      if (userResult.data) {
        userData = { ...mapUser(userResult.data), classCode: trimmedCode, role: "student", displayName: trimmedName };
        const { error: updateErr } = await supabase
          .from('users').update({ class_code: trimmedCode, role: "student", display_name: trimmedName }).eq('uid', studentUid);
        if (updateErr) throw updateErr;
      } else {
        userData = {
          uid: studentUid,
          role: "student",
          displayName: trimmedName,
          classCode: trimmedCode,
          avatar: studentAvatar,
          badges: [],
        };
        const { error: insertErr } = await supabase.from('users').insert(mapUserToDb(userData));
        if (insertErr) throw insertErr;
      }

      // OPTIMISTIC UI: Set user and show dashboard IMMEDIATELY
      // This makes the login feel instant while data loads in background
      setUser(userData);
      setBadges(userData.badges || []);
      setXp(userData.xp ?? 0);
      setStreak(userData.streak ?? 0);
      setView("student-dashboard");
      setLoading(false); // Hide the loading spinner immediately

      // Join Live Challenge immediately (doesn't need to wait for data)
      if (socket) {
        socket.emit(SOCKET_EVENTS.JOIN_CHALLENGE, {
          classCode: trimmedCode, name: trimmedName, uid: studentUid,
        });
      }

      // Check consent early (before background data load)
      checkConsent(userData);

      // BACKGROUND: Fetch assignments + progress after UI is visible
      // This makes the login feel much faster!
      setStudentDataLoading(true);
      Promise.all([
        supabase.from('assignments').select('*').eq('class_id', classData.id),
        supabase.from('progress').select('*').eq('class_code', trimmedCode).eq('student_uid', studentUid),
      ]).then(([assignResult, progressResult]) => {
        if (assignResult.error) {
          console.error('Error loading assignments:', assignResult.error);
        } else {
          setStudentAssignments((assignResult.data ?? []).map(mapAssignment));
        }

        if (progressResult.error) {
          console.error('Error loading progress:', progressResult.error);
        } else {
          setStudentProgress((progressResult.data ?? []).map(mapProgress));
        }

        setStudentDataLoading(false);
      }).catch((error) => {
        console.error('Background data load error:', error);
        setStudentDataLoading(false);
      });

      // Persist student credentials so we can auto-restore on page refresh
      // (anonymous Supabase sessions don't reliably survive mobile/PWA restarts)
      try {
        localStorage.setItem('vocaband_student_login', JSON.stringify({
          classCode: trimmedCode,
          displayName: trimmedName,
          uid: studentUid,
        }));
      } catch { /* localStorage unavailable — non-critical */ }
    } catch (error) {
      trackAutoError(error, 'Student login failed');
      const errorMsg = error && typeof error === 'object' && 'message' in error
        ? (String((error as { message: unknown }).message).includes('fetch') || String((error as { message: unknown }).message).includes('network')
          ? "Network error. Please check your connection."
          : "Could not log in. Please try again.")
        : "Could not log in. Please try again.";
      setError(errorMsg);
    } finally {
      clearTimeout(loginTimeout);
      manualLoginInProgress.current = false;
      setLoading(false);
      setStudentDataLoading(false);
    }
  };



  return {
    createGuestUser,
    recordConsent,
    loadStudentsInClass,
    handleLoginAsStudent,
    handleNewStudentSignup,
    handleOAuthTeacherDetected,
    handleOAuthStudentDetected,
    handleOAuthNewUser,
    handleApproveStudent,
    handleRejectStudent,
    confirmRejectStudent,
    handleStudentLogin,
  };
}
