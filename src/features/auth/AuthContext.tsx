import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../../core/supabase";
import type { AppUser } from "../../shared/types";
import * as authService from "../../services/authService";
import * as userService from "../../services/userService";
import * as classService from "../../services/classService";
import * as assignmentService from "../../services/assignmentService";
import * as progressService from "../../services/progressService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Data bundle returned when a session is successfully restored */
export interface RestoredSession {
  user: AppUser;
  /** For students: their assignments and progress (if class found) */
  studentData?: {
    assignments: import("../../shared/types").AssignmentData[];
    progress: import("../../shared/types").ProgressData[];
  };
}

interface AuthContextValue {
  user: AppUser | null;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  /** True while handleStudentLogin owns loading/view */
  manualLoginInProgress: React.MutableRefObject<boolean>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider props
// ---------------------------------------------------------------------------

export interface AuthProviderProps {
  children: React.ReactNode;
  /** URL param value — when present, skip auth redirects (Quick Play student) */
  quickPlaySessionParam: string | null;
  /**
   * Called after a session is restored (teacher or student).
   * App.tsx implements this to set view, load teacher data, etc.
   */
  onSessionRestored: (session: RestoredSession) => void;
  /** Called on SIGNED_OUT */
  onSignedOut: () => void;
  /** Called when initial session has no user and no OAuth callback in progress */
  onNoSession: () => void;
  /** Called when OAuth exchange failed */
  onAuthError: (message: string) => void;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({
  children,
  quickPlaySessionParam,
  onSessionRestored,
  onSignedOut,
  onNoSession,
  onAuthError,
}: AuthProviderProps) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const manualLoginInProgress = useRef(false);
  const restoreInProgress = useRef(false);

  // Keep latest callbacks in refs so the useEffect closure always calls current versions
  const onSessionRestoredRef = useRef(onSessionRestored);
  const onSignedOutRef = useRef(onSignedOut);
  const onNoSessionRef = useRef(onNoSession);
  const onAuthErrorRef = useRef(onAuthError);
  onSessionRestoredRef.current = onSessionRestored;
  onSignedOutRef.current = onSignedOut;
  onNoSessionRef.current = onNoSession;
  onAuthErrorRef.current = onAuthError;

  useEffect(() => {
    // Helper: fetch user profile with retry
    const fetchUserProfile = async (uid: string, retries = 2): Promise<AppUser | null> => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        const profile = await userService.fetchUserProfile(uid);
        if (profile) return profile;
        if (attempt < retries) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
      return null;
    };

    // Restore session from a Supabase user
    const restoreSession = async (supabaseUser: {
      id: string;
      email?: string | null;
      app_metadata?: Record<string, unknown>;
      user_metadata?: Record<string, unknown>;
    }) => {
      if (restoreInProgress.current) return;
      restoreInProgress.current = true;
      try {
        const userData = await fetchUserProfile(supabaseUser.id);

        if (userData) {
          setUser(userData);
          let studentData: RestoredSession["studentData"];

          if (userData.role === "student" && userData.classCode) {
            const classData = await classService.findClassByCode(userData.classCode);
            if (classData) {
              const [assignments, progress] = await Promise.all([
                assignmentService.fetchAssignmentsByClassId(classData.id),
                progressService.fetchProgressByClassCode(userData.classCode, supabaseUser.id),
              ]);
              studentData = { assignments, progress };
            }
          }

          onSessionRestoredRef.current({ user: userData, studentData });
        } else {
          // No user row — try localStorage migration for anonymous students
          let migrated = false;
          try {
            const savedRaw = localStorage.getItem("vocaband_student_login");
            if (savedRaw) {
              const { classCode: savedCode, displayName: savedName, uid: savedUid } = JSON.parse(savedRaw);
              if (savedCode && savedName && savedUid) {
                const existingUser = await userService.fetchUserProfile(savedUid);
                if (existingUser) {
                  await userService.migrateUid(savedUid, supabaseUser.id);
                  const restored = await fetchUserProfile(supabaseUser.id);
                  if (restored) {
                    setUser(restored);
                    let studentData: RestoredSession["studentData"];
                    if (restored.role === "student" && restored.classCode) {
                      const classData = await classService.findClassByCode(restored.classCode);
                      if (classData) {
                        const [assignments, progress] = await Promise.all([
                          assignmentService.fetchAssignmentsByClassId(classData.id),
                          progressService.fetchProgressByClassCode(restored.classCode, supabaseUser.id),
                        ]);
                        studentData = { assignments, progress };
                      }
                    }
                    localStorage.setItem("vocaband_student_login", JSON.stringify({
                      classCode: restored.classCode || savedCode,
                      displayName: restored.displayName || savedName,
                      uid: supabaseUser.id,
                    }));
                    onSessionRestoredRef.current({ user: restored, studentData });
                    migrated = true;
                  }
                }
                if (!migrated) localStorage.removeItem("vocaband_student_login");
              }
            }
          } catch { /* localStorage unavailable */ }

          if (!migrated) {
            // Auto-create teacher for Google sign-ins
            const isGoogleSignIn = supabaseUser.app_metadata?.provider === "google";
            if (isGoogleSignIn) {
              const isAllowed = await authService.isTeacherAllowed(supabaseUser.email ?? "");
              if (!isAllowed) {
                setError("Your account is not authorised as a teacher. Contact your administrator to be added.");
                await authService.signOut();
                return;
              }
              const newUser: AppUser = {
                uid: supabaseUser.id,
                email: supabaseUser.email || "",
                role: "teacher",
                displayName:
                  (supabaseUser.user_metadata?.full_name as string) ||
                  (supabaseUser.user_metadata?.name as string) ||
                  "Teacher",
              };
              try {
                await userService.upsertUser(newUser);
              } catch (err) {
                console.error("Teacher profile upsert failed:", err);
              }
              setUser(newUser);
              onSessionRestoredRef.current({ user: newUser });
            }
          }
        }
      } catch (err) {
        console.error("Session restore error:", err);
      } finally {
        restoreInProgress.current = false;
        setLoading(false);
      }
    };

    // CRITICAL: This callback must NOT be async (Supabase Navigator Lock).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (manualLoginInProgress.current) return;

      if (session?.user) {
        restoreSession(session.user);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        try { localStorage.removeItem("vocaband_student_login"); } catch {}
        onSignedOutRef.current();
        setLoading(false);
      } else if (event === "INITIAL_SESSION") {
        const isOAuthCb =
          window.location.search.includes("code=") ||
          window.location.hash.includes("access_token=");

        const exchangeFailed = sessionStorage.getItem("oauth_exchange_failed");
        if (exchangeFailed) {
          sessionStorage.removeItem("oauth_exchange_failed");
          onAuthErrorRef.current("Sign-in timed out. Please try again.");
          setLoading(false);
        } else if (!isOAuthCb) {
          const savedRaw = localStorage.getItem("vocaband_student_login");
          if (savedRaw) {
            authService.signInAnonymously().catch(() => {
              localStorage.removeItem("vocaband_student_login");
              setLoading(false);
            });
          } else {
            setLoading(false);
            onNoSessionRef.current();
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Safety timeout — stop spinner if onAuthStateChange never fires
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!manualLoginInProgress.current && !restoreInProgress.current) setLoading(false);
    }, 8000);
    return () => clearTimeout(timeout);
  }, []);

  const value: AuthContextValue = {
    user,
    setUser,
    loading,
    setLoading,
    manualLoginInProgress,
    error,
    setError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
