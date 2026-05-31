/**
 * Auth restore + onAuthStateChange wiring — pulled out of App.tsx so
 * the 800-line orchestrator can stay readable.  The body is moved
 * verbatim, only the closure deps from App's render scope are
 * passed in via the deps bag instead of being captured directly.
 *
 * Behaviour preserved exactly:
 *   - one `useEffect` with `[]` deps runs once on mount
 *   - inside, `restoreSession` + `onAuthStateChange` + safety timeout
 *   - INITIAL_SESSION / SIGNED_OUT branches retain all their cleanup
 *     order (audio kill, socket disconnect, history.replaceState, etc.)
 *
 * The pile of setters in the deps interface mirrors the App-scope
 * setters used inside the effect.  If you add a new setter usage in
 * the effect body, add it here too — and add it in App.tsx's hook
 * call.  TypeScript will flag missing entries.
 */
import { useEffect, useRef } from 'react';
import type React from 'react';
import {
  supabase,
  isSupabaseConfigured,
  hasTeacherAccess,
  hasManagerAccess,
  mapClass,
  mapAssignment,
  mapProgress,
  mapUserToDb,
  fetchUserProfile,
  USER_COLUMNS,
  CLASS_COLUMNS,
  PROGRESS_COLUMNS,
  type AppUser,
  type ClassData,
  type AssignmentData,
  type ProgressData,
} from '../core/supabase';
import { bootstrapStudentSession } from '../core/bootstrap';
import { freshTrialEndsAt } from '../core/plan';
import { clearAllReadCache } from '../core/readCache';
import { getCachedVocabulary } from './useVocabularyLazy';
import {
  readIntendedClassCode,
  clearIntendedClassCode,
  readIntendedRole,
  clearIntendedRole,
} from '../utils/oauthIntent';
import { disconnectQuickPlaySocket } from './useQuickPlaySocket';
import type { Word } from '../data/vocabulary';
import type { View } from '../core/views';

type Dispatch<T> = React.Dispatch<React.SetStateAction<T>>;
type Ref<T> = React.MutableRefObject<T>;

export interface UseAuthRestoreDeps {
  // Refs
  restoreInProgress: Ref<boolean>;
  restoreRetried: Ref<boolean>;
  manualLoginInProgress: Ref<boolean>;
  fromShareLinkRef: Ref<boolean>;
  currentViewRef: Ref<View>;
  lastUserRoleRef: Ref<string | null>;
  qpCumulativeScoreRef: Ref<number>;

  // App-mount snapshot
  quickPlaySessionParam: string | null;

  // Sibling-hook helpers
  cleanupSessionData: () => void;
  showPendingApproval: (info: { name: string; classCode: string; profileId?: string }) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  appToasts: {
    couldNotRestoreSession: string;
    signInFailed: string;
    signInTakingTooLong: string;
  };
  checkConsent: (user: AppUser) => void;
  fetchTeacherData: (uid: string) => Promise<ClassData[]>;
  fetchTeacherAssignments: (classIds: string[]) => void;
  stopAllAudio: () => void;
  shouldPreserveView: (role: string, currentView: View) => boolean;

  // Setters
  setLoading: Dispatch<boolean>;
  setError: Dispatch<string | null>;
  setLandingTab: Dispatch<'student' | 'teacher'>;
  setView: Dispatch<View>;
  setUser: Dispatch<AppUser | null>;
  setBadges: Dispatch<string[]>;
  setXp: Dispatch<number>;
  setStreak: Dispatch<number>;
  setClasses: Dispatch<ClassData[]>;
  setStudentAssignments: Dispatch<AssignmentData[]>;
  setStudentProgress: Dispatch<ProgressData[]>;
  setActiveAssignment: Dispatch<AssignmentData | null>;
  setAssignmentWords: Dispatch<Word[]>;
  setQuickPlayActiveSession: Dispatch<{
    id: string;
    sessionCode: string;
    wordIds: number[];
    words: Word[];
    allowedModes?: string[];
    aiSentences?: string[];
  } | null>;
  setQuickPlaySessionCode: Dispatch<string | null>;
  setQuickPlayKicked: Dispatch<boolean>;
  setQuickPlaySessionEnded: Dispatch<boolean>;
  setClassNotFoundIntent: Dispatch<string | null>;
  setPendingClassSwitch: Dispatch<{
    fromCode: string;
    fromClassName: string | null;
    toCode: string;
    toClassName: string | null;
    supabaseUser: { id: string; email?: string | null };
  } | null>;
  setPendingApprovalInfo: Dispatch<{ name: string; classCode: string; profileId?: string } | null>;
  setOauthAuthUid: Dispatch<string | null>;
  setOauthEmail: Dispatch<string | null>;
  setShowOAuthClassCode: Dispatch<boolean>;
  setCurrentIndex: Dispatch<number>;
  setScore: Dispatch<number>;
  setMistakes: Dispatch<number[]>;
  setIsFinished: Dispatch<boolean>;
  setFeedback: Dispatch<'correct' | 'wrong' | 'show-answer' | null>;
  setSpellingInput: Dispatch<string>;
  setMatchedIds: Dispatch<number[]>;
  setSelectedMatch: Dispatch<{ id: number; type: 'english' | 'arabic' } | null>;
  setIsFlipped: Dispatch<boolean>;
  setRevealedLetters: Dispatch<number>;
  setSentenceIndex: Dispatch<number>;
  setAvailableWords: Dispatch<string[]>;
  setBuiltSentence: Dispatch<string[]>;
  setSentenceFeedback: Dispatch<'correct' | 'wrong' | null>;
  setHiddenOptions: Dispatch<number[]>;
  setWordAttemptBatch: Dispatch<Array<{ word_id: number; is_correct: boolean }>>;
  setShowModeSelection: Dispatch<boolean>;
}

export function useAuthRestore(deps: UseAuthRestoreDeps): void {
  // Destructure once at the top so the effect body reads like the
  // original App.tsx code path.  Refs / setters are stable identities
  // from React's perspective, so the empty deps array is correct.
  const {
    restoreInProgress, restoreRetried, manualLoginInProgress,
    fromShareLinkRef, currentViewRef, lastUserRoleRef, qpCumulativeScoreRef,
    quickPlaySessionParam,
    cleanupSessionData, showPendingApproval, showToast, appToasts,
    checkConsent, fetchTeacherData, fetchTeacherAssignments, stopAllAudio,
    shouldPreserveView,
    setLoading, setError, setLandingTab, setView, setUser,
    setBadges, setXp, setStreak,
    setClasses, setStudentAssignments, setStudentProgress,
    setActiveAssignment, setAssignmentWords,
    setQuickPlayActiveSession, setQuickPlaySessionCode,
    setQuickPlayKicked, setQuickPlaySessionEnded,
    setClassNotFoundIntent, setPendingClassSwitch, setPendingApprovalInfo,
    setOauthAuthUid, setOauthEmail, setShowOAuthClassCode,
    setCurrentIndex, setScore, setMistakes, setIsFinished, setFeedback,
    setSpellingInput, setMatchedIds, setSelectedMatch, setIsFlipped,
    setRevealedLetters, setSentenceIndex, setAvailableWords,
    setBuiltSentence, setSentenceFeedback, setHiddenOptions,
    setWordAttemptBatch, setShowModeSelection,
  } = deps;

  // The uid we've already fully restored. Used to skip the heavy restore
  // on TOKEN_REFRESHED / USER_UPDATED events (which fire on tab refocus
  // and the periodic token refresh) so returning to a tab doesn't refetch
  // data + reset whatever view the user had open.
  const restoredUidRef = useRef<string | null>(null);

  useEffect(() => {
    // If Supabase isn't configured, skip auth entirely and show the landing page.
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // PKCE code exchange happens in main.tsx (outside React lifecycle)
    // to avoid StrictMode double-mount races.  By the time this effect
    // runs, the exchange is already in-flight or completed.
    //
    // fetchUserProfile (single-retry user-row lookup) lives in
    // core/supabase.ts alongside USER_COLUMNS + mapUser.

    // Restore session from a Supabase user.  Called OUTSIDE the auth lock
    // (fire-and-forget from the non-async onAuthStateChange callback).
    // Uses currentViewRef to read the latest view and preserve navigation.
    const restoreSession = async (
      supabaseUser: { id: string; email?: string | null; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }
    ) => {
      if (restoreInProgress.current) return;
      // QR-scan Live Play: if the URL carries `?session=…` the user
      // scanned a teacher's Quick Play QR and the initial-view setter
      // already routed them to "quick-play-student".  Skip auth restore.
      if (quickPlaySessionParam) return;
      restoreInProgress.current = true;
      // Remember who we're restoring so refocus token-refreshes can skip
      // the re-restore. Set at the start (not on success) because a failed
      // restore retries via its own setTimeout below, not via this event.
      restoredUidRef.current = supabaseUser.id;

      try {
        // For anonymous students: RLS blocks SELECT on users table
        // (is_anonymous IS FALSE). Instead of querying the DB, restore
        // directly from localStorage which was saved on login.
        const supabaseUserAny = supabaseUser as unknown as {
          id: string;
          is_anonymous?: boolean;
          app_metadata?: { provider?: string };
        };
        const isAnonymous = !!supabaseUserAny.is_anonymous || supabaseUserAny.app_metadata?.provider === 'anonymous';
        // Speculatively fetch teacher-owned classes in parallel with the
        // users row. For teachers this halves login latency.
        const speculativeClassesPromise: Promise<ClassData[]> = isAnonymous
          ? Promise.resolve([] as ClassData[])
          : Promise.resolve(
              supabase
                .from('classes')
                .select(CLASS_COLUMNS)
                .eq('teacher_uid', supabaseUser.id)
                .then(r => (r.data ?? []).map(mapClass))
            ).catch(() => [] as ClassData[]);
        let userData = await fetchUserProfile(supabaseUser.id);

        if (!userData && isAnonymous) {
          try {
            const savedRaw = localStorage.getItem('vocaband_student_login');
            if (savedRaw) {
              const saved = JSON.parse(savedRaw);
              if (saved.classCode && saved.displayName) {
                userData = {
                  uid: supabaseUser.id,
                  displayName: saved.displayName,
                  email: supabaseUser.email || '',
                  role: 'student' as const,
                  classCode: saved.classCode,
                  avatar: saved.avatar || '🦊',
                  badges: [],
                  xp: 0,
                  streak: 0,
                };
                localStorage.setItem('vocaband_student_login', JSON.stringify({
                  ...saved,
                  uid: supabaseUser.id,
                }));
              }
            }
          } catch { /* localStorage unavailable */ }
        }

        if (userData) {
          // OAuth role-intent enforcement.
          const intended = readIntendedRole();
          if (intended?.role === 'teacher' && intended.fresh && userData.role === 'student') {
            clearIntendedRole();
            setError(
              `This Google account (${userData.email ?? 'unknown'}) is registered as a student, not a teacher. ` +
              `Sign in from the student page instead, or use a different Google account for teacher access.`
            );
            await supabase.auth.signOut().catch(() => {});
            setLoading(false);
            return;
          }
          if (intended) clearIntendedRole();

          setUser(userData);
          checkConsent(userData);
          if (hasTeacherAccess(userData)) {
            let fetchedClasses = await speculativeClassesPromise;
            if (fetchedClasses.length === 0) {
              fetchedClasses = await fetchTeacherData(supabaseUser.id).catch(() => [] as Awaited<ReturnType<typeof fetchTeacherData>>);
            } else {
              setClasses(fetchedClasses);
            }
            fetchTeacherAssignments(fetchedClasses.map(c => c.id));
            const skipRestore = sessionStorage.getItem('vocaband_skip_restore');
            if (skipRestore) {
              sessionStorage.removeItem('vocaband_skip_restore');
              try { localStorage.removeItem('vocaband_quick_play_session'); } catch {}
              if (!shouldPreserveView("teacher", currentViewRef.current)) {
                setView("teacher-dashboard");
              }
            } else {
              try {
                const savedSession = localStorage.getItem('vocaband_quick_play_session');
                if (savedSession) {
                  const parsed = JSON.parse(savedSession);
                  const { data: sessionData } = await supabase
                    .from('quick_play_sessions')
                    .select('id, session_code, word_ids, allowed_modes, is_active')
                    .eq('id', parsed.id)
                    .eq('is_active', true)
                    .maybeSingle();
                  if (sessionData) {
                    let vocabMod = getCachedVocabulary();
                    if (!vocabMod) {
                      const m = await import('../data/vocabulary');
                      vocabMod = {
                        ALL_WORDS: m.ALL_WORDS, SET_1_WORDS: m.SET_1_WORDS,
                        SET_2_WORDS: m.SET_2_WORDS, SET_3_WORDS: m.SET_3_WORDS,
                        TOPIC_PACKS: m.TOPIC_PACKS,
                      };
                    }
                    const dbWords = vocabMod!.ALL_WORDS.filter(w => (sessionData.word_ids || []).includes(w.id));
                    const restoredAllowedModes =
                      (sessionData as { allowed_modes?: string[] }).allowed_modes
                      || parsed.allowedModes
                      || undefined;
                    setQuickPlayActiveSession({
                      id: sessionData.id,
                      sessionCode: sessionData.session_code,
                      wordIds: sessionData.word_ids || [],
                      words: parsed.words?.length ? parsed.words : dbWords,
                      allowedModes: restoredAllowedModes,
                    });
                    setQuickPlaySessionCode(sessionData.session_code);
                    setView("quick-play-teacher-monitor");
                  } else {
                    localStorage.removeItem('vocaband_quick_play_session');
                    if (!shouldPreserveView("teacher", currentViewRef.current)) {
                      setView("teacher-dashboard");
                    }
                  }
                } else {
                  if (!shouldPreserveView("teacher", currentViewRef.current)) {
                    setView("teacher-dashboard");
                  }
                }
              } catch {
                if (!shouldPreserveView("teacher", currentViewRef.current)) {
                  setView("teacher-dashboard");
                }
              }
            }
          } else if (hasManagerAccess(userData)) {
            // School manager (principal) — read-only oversight dashboard.
            // No teacher data load: their data comes from the school-scoped
            // manager_* RPCs inside ManagerConsoleView.
            if (!shouldPreserveView("teacher", currentViewRef.current)) {
              setView("manager-dashboard");
            }
          } else if (userData.role === "student" && userData.classCode) {
            const code = userData.classCode;

            const intendedCode = readIntendedClassCode();
            const intendedNorm = intendedCode?.trim().toUpperCase() || null;
            const currentNorm = code?.trim().toUpperCase() || '';
            if (intendedNorm && intendedNorm !== currentNorm) {
              const { data: intendedClassRows, error: lookupErr } = await supabase
                .rpc('class_lookup_by_code', { p_code: intendedNorm });
              if (lookupErr) {
                console.error('[restoreSession class switch] RPC failed:', lookupErr);
                setClassNotFoundIntent(`${intendedNorm} (lookup failed: ${lookupErr.message})`);
                clearIntendedClassCode();
              } else if (intendedClassRows && intendedClassRows.length > 0) {
                const { data: currentClassRows } = await supabase
                  .from('classes').select('code, name').eq('code', code);
                setUser(userData);
                checkConsent(userData);
                setPendingClassSwitch({
                  fromCode: code,
                  fromClassName: currentClassRows?.[0]?.name ?? null,
                  toCode: intendedNorm,
                  toClassName: intendedClassRows[0].name ?? null,
                  supabaseUser: { id: supabaseUser.id, email: supabaseUser.email },
                });
                setView("student-dashboard");
                clearIntendedClassCode();
                return;
              } else {
                setClassNotFoundIntent(intendedNorm);
                clearIntendedClassCode();
              }
            } else if (intendedCode) {
              clearIntendedClassCode();
            }

            // Try the bootstrap RPC first — one round trip for class +
            // assignments + progress instead of three. Falls back to the
            // legacy parallel-queries block on any RPC failure so a server
            // regression can't lock students out of the dashboard.
            // See supabase/migrations/20260517105307_bootstrap_student_session.sql
            const boot = await bootstrapStudentSession({ classCode: code }).catch(() => null);
            if (boot?.status === 'ok') {
              setStudentAssignments(boot.assignments);
              setStudentProgress(boot.progress);
            } else {
              const { data: classRows } = await supabase
                .from('classes').select(CLASS_COLUMNS).eq('code', code);
              if (classRows && classRows.length > 0) {
                const classData = mapClass(classRows[0]);
                const [assignResult, progressResult] = await Promise.all([
                  supabase.rpc('get_assignments_for_class', { p_class_id: classData.id }),
                  supabase.from('progress').select(PROGRESS_COLUMNS).eq('class_code', code).eq('student_uid', supabaseUser.id),
                ]);
                setStudentAssignments((assignResult.data ?? []).map(mapAssignment));
                setStudentProgress((progressResult.data ?? []).map(mapProgress));
              }
            }
            setBadges(userData.badges || []);
            setXp(userData.xp ?? 0);
            setStreak(userData.streak ?? 0);
            if (!shouldPreserveView("student", currentViewRef.current)) {
              setView("student-dashboard");
            }
          } else {
            // Broken users row — most commonly an OAuth student whose
            // previous sign-in didn't complete class-code entry.
            //
            // The bootstrap RPC handles the entire mint-from-profile +
            // dashboard-load flow server-side in one round trip (the
            // legacy block below does 4 sequential queries worst case).
            // Falls back to the legacy path on RPC failure so a server
            // regression can't lock students out.
            const boot = await bootstrapStudentSession().catch(() => null);
            if (boot?.status === 'ok' && boot.user) {
              setUser(boot.user);
              setStudentAssignments(boot.assignments);
              setStudentProgress(boot.progress);
              if (!shouldPreserveView("student", currentViewRef.current)) {
                setView("student-dashboard");
              }
              return;
            }
            if (boot?.status === 'pending-approval' && boot.pendingProfile) {
              showPendingApproval({
                name:      boot.pendingProfile.displayName,
                classCode: boot.pendingProfile.classCode,
                profileId: boot.pendingProfile.id,
              });
              return;
            }
            if (boot?.status === 'needs-class-code') {
              setOauthEmail(supabaseUser.email || "");
              setOauthAuthUid(supabaseUser.id);
              setShowOAuthClassCode(true);
              setView("student-account-login");
              return;
            }

            const { data: studentProfile } = await supabase
              .from('student_profiles')
              .select('id, email, status, display_name, class_code, xp, avatar')
              .eq('email', supabaseUser.email ?? "")
              .maybeSingle();
            if (studentProfile && (studentProfile.status === 'active' || studentProfile.status === 'approved')) {
              const studentUser: AppUser = {
                uid: supabaseUser.id,
                email: studentProfile.email,
                displayName: studentProfile.display_name || (supabaseUser.user_metadata?.full_name as string) || "Student",
                role: "student",
                classCode: studentProfile.class_code,
                xp: studentProfile.xp || 0,
                avatar: studentProfile.avatar,
              };
              await supabase.from('users').upsert(mapUserToDb(studentUser), { onConflict: 'uid' });
              setUser(studentUser);
              if (studentProfile.class_code) {
                const { data: classRows } = await supabase
                  .from('classes').select(CLASS_COLUMNS).eq('code', studentProfile.class_code);
                if (classRows && classRows.length > 0) {
                  const classData = mapClass(classRows[0]);
                  const [assignResult, progressResult] = await Promise.all([
                    supabase.rpc('get_assignments_for_class', { p_class_id: classData.id }),
                    supabase.from('progress').select(PROGRESS_COLUMNS).eq('class_code', studentProfile.class_code).eq('student_uid', supabaseUser.id),
                  ]);
                  setStudentAssignments((assignResult.data ?? []).map(mapAssignment));
                  setStudentProgress((progressResult.data ?? []).map(mapProgress));
                }
              }
              if (!shouldPreserveView("student", currentViewRef.current)) {
                setView("student-dashboard");
              }
              return;
            }
            if (studentProfile && studentProfile.status === 'pending_approval') {
              showPendingApproval({
                name: studentProfile.display_name || '',
                classCode: studentProfile.class_code || '',
                profileId: studentProfile.id,
              });
              return;
            }

            setOauthEmail(supabaseUser.email || "");
            setOauthAuthUid(supabaseUser.id);
            setShowOAuthClassCode(true);
            setView("student-account-login");
          }
        } else {
          // No user row found.  Check localStorage for a persisted student login.
          try {
            const savedRaw = localStorage.getItem('vocaband_student_login');
            if (savedRaw) {
              const { classCode: savedCode, displayName: savedName, uid: savedUid } = JSON.parse(savedRaw);
              const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              if (savedCode && savedName && savedUid && UUID_RE.test(savedUid)) {
                const { data: existingUser } = await supabase
                  .from('users').select(USER_COLUMNS).eq('uid', savedUid).maybeSingle();
                if (existingUser) {
                  await supabase.from('users')
                    .update({ uid: supabaseUser.id })
                    .eq('uid', savedUid);

                  // Try the bootstrap RPC. After the UID rewrite above,
                  // auth.uid() now points to the rewritten users row,
                  // so the RPC's Step 1 (users lookup) succeeds and
                  // returns the full dashboard payload in one round
                  // trip. Saves the separate fetchUserProfile +
                  // classes.select + Promise.all(assignments, progress)
                  // queries below.
                  const boot = await bootstrapStudentSession().catch(() => null);
                  if (boot?.status === 'ok' && boot.user) {
                    setUser(boot.user);
                    checkConsent(boot.user);
                    if (boot.user.role === "student") {
                      setStudentAssignments(boot.assignments);
                      setStudentProgress(boot.progress);
                    }
                    setBadges(boot.user.badges || []);
                    setXp(boot.user.xp ?? 0);
                    setStreak(boot.user.streak ?? 0);
                    setView(hasTeacherAccess(boot.user) ? "teacher-dashboard" : "student-dashboard");
                    localStorage.setItem('vocaband_student_login', JSON.stringify({
                      classCode:   boot.user.classCode || savedCode,
                      displayName: boot.user.displayName || savedName,
                      uid:         supabaseUser.id,
                    }));
                    return;
                  }

                  const restored = await fetchUserProfile(supabaseUser.id);
                  if (restored) {
                    setUser(restored);
                    checkConsent(restored);
                    if (restored.role === "student" && restored.classCode) {
                      const { data: classRows } = await supabase
                        .from('classes').select(CLASS_COLUMNS).eq('code', restored.classCode);
                      if (classRows && classRows.length > 0) {
                        const c = mapClass(classRows[0]);
                        const [a, p] = await Promise.all([
                          supabase.rpc('get_assignments_for_class', { p_class_id: c.id }),
                          supabase.from('progress').select(PROGRESS_COLUMNS).eq('class_code', restored.classCode).eq('student_uid', supabaseUser.id),
                        ]);
                        setStudentAssignments((a.data ?? []).map(mapAssignment));
                        setStudentProgress((p.data ?? []).map(mapProgress));
                      }
                    }
                    setBadges(restored.badges || []);
                    setXp(restored.xp ?? 0);
                    setStreak(restored.streak ?? 0);
                    setView(hasTeacherAccess(restored) ? "teacher-dashboard" : "student-dashboard");
                    localStorage.setItem('vocaband_student_login', JSON.stringify({
                      classCode: restored.classCode || savedCode,
                      displayName: restored.displayName || savedName,
                      uid: supabaseUser.id,
                    }));
                    return;
                  }
                }
                localStorage.removeItem('vocaband_student_login');
              }
            }
          } catch { /* localStorage unavailable — non-critical */ }

          const oauthProvider = supabaseUser.app_metadata?.provider;
          const isOAuthSignIn = oauthProvider === 'google' || oauthProvider === 'azure';
          if (isOAuthSignIn) {
            // Student OAuth was removed in the 2026-05-18 privacy review.
            // Sessions from before the cut still restore here — gate the
            // student bootstrap on the teacher allowlist so non-teacher
            // OAuth sessions get signed out and routed to PIN login
            // instead of silently entering the student dashboard.
            const teacherIntentEarly = readIntendedRole();
            const wantsTeacherEarly = teacherIntentEarly?.role === 'teacher' && teacherIntentEarly.fresh;
            const { data: isAllowedEarly } = await supabase.rpc('is_teacher_allowed', {
              check_email: supabaseUser.email ?? "",
            });
            if (!isAllowedEarly && !wantsTeacherEarly) {
              try { await supabase.auth.signOut(); } catch { /* best-effort */ }
              setUser(null);
              setError(
                'Students now sign in with a class code and PIN, not Google. Ask your teacher for your PIN.',
              );
              if (!shouldPreserveView("student", currentViewRef.current)) {
                setView('student-account-login');
              }
              setLoading(false);
              return;
            }
            // Try the bootstrap RPC first — Step 2 server-side covers
            // the student_profile-by-email lookup + mint + dashboard load.
            // On status:'needs-class-code' we must STILL fall through to
            // the legacy block below because the teacher-allowlist check
            // (is_teacher_allowed) disambiguates teacher vs student
            // signups, and the RPC has no notion of teacher intent.
            const boot = await bootstrapStudentSession().catch(() => null);
            if (boot?.status === 'ok' && boot.user) {
              setUser(boot.user);
              setStudentAssignments(boot.assignments);
              setStudentProgress(boot.progress);
              if (!shouldPreserveView("student", currentViewRef.current)) {
                setView("student-dashboard");
              }
              return;
            }
            if (boot?.status === 'pending-approval' && boot.pendingProfile) {
              showPendingApproval({
                name:      boot.pendingProfile.displayName,
                classCode: boot.pendingProfile.classCode,
                profileId: boot.pendingProfile.id,
              });
              setLoading(false);
              return;
            }

            const { data: studentProfile } = await supabase
              .from('student_profiles')
              .select('id, email, status, display_name, class_code, xp, avatar')
              .eq('email', supabaseUser.email ?? "")
              .maybeSingle();
            if (studentProfile && (studentProfile.status === 'active' || studentProfile.status === 'approved')) {
              const studentUser: AppUser = {
                uid: supabaseUser.id,
                email: studentProfile.email,
                displayName: studentProfile.display_name || (supabaseUser.user_metadata?.full_name as string) || "Student",
                role: "student",
                classCode: studentProfile.class_code,
                xp: studentProfile.xp || 0,
                avatar: studentProfile.avatar,
              };
              await supabase.from('users').upsert(mapUserToDb(studentUser), { onConflict: 'uid' });
              setUser(studentUser);
              if (studentProfile.class_code) {
                const { data: classRows } = await supabase
                  .from('classes').select(CLASS_COLUMNS).eq('code', studentProfile.class_code);
                if (classRows && classRows.length > 0) {
                  const classData = mapClass(classRows[0]);
                  const [assignResult, progressResult] = await Promise.all([
                    supabase.rpc('get_assignments_for_class', { p_class_id: classData.id }),
                    supabase.from('progress').select(PROGRESS_COLUMNS).eq('class_code', studentProfile.class_code).eq('student_uid', supabaseUser.id),
                  ]);
                  setStudentAssignments((assignResult.data ?? []).map(mapAssignment));
                  setStudentProgress((progressResult.data ?? []).map(mapProgress));
                }
              }
              if (!shouldPreserveView("student", currentViewRef.current)) {
                setView("student-dashboard");
              }
              return;
            } else if (studentProfile && studentProfile.status === 'pending_approval') {
              showPendingApproval({
                name: studentProfile.display_name || '',
                classCode: studentProfile.class_code || '',
                profileId: studentProfile.id,
              });
              setLoading(false);
              return;
            }

            const { data: isAllowed, error: allowErr } = await supabase.rpc('is_teacher_allowed', {
              check_email: supabaseUser.email ?? ""
            });
            if (allowErr) {
              throw new Error(`Teacher allowlist check failed: ${allowErr.message}`);
            }
            const teacherIntent = readIntendedRole();
            const wantsTeacher = teacherIntent?.role === 'teacher' && teacherIntent.fresh;
            if (!isAllowed && !wantsTeacher) {
              setOauthEmail(supabaseUser.email || "");
              setOauthAuthUid(supabaseUser.id);
              setShowOAuthClassCode(true);
              setView("student-account-login");
              setLoading(false);
              return;
            }
            if (teacherIntent) clearIntendedRole();
            const newUser: AppUser = {
              uid: supabaseUser.id,
              email: supabaseUser.email || "",
              role: "teacher",
              displayName: (supabaseUser.user_metadata?.full_name as string) || (supabaseUser.user_metadata?.name as string) || "Teacher",
              plan: "free",
              trialEndsAt: freshTrialEndsAt(),
            };
            const { error: insertErr } = await supabase
              .from('users')
              .upsert(mapUserToDb(newUser), { onConflict: 'uid', ignoreDuplicates: true });
            if (insertErr) {
              console.error("Teacher profile upsert failed:", insertErr);
            }
            setUser(newUser);
            const fetchedClasses = await fetchTeacherData(supabaseUser.id).catch(() => []);
            fetchTeacherAssignments(fetchedClasses.map(c => c.id));
            setView("teacher-dashboard");
          }
        }
      } catch (err) {
        console.error("Session restore error:", err);
        if (!restoreRetried.current) {
          restoreRetried.current = true;
          restoreInProgress.current = false;
          setTimeout(async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                await restoreSession(session.user);
              } else {
                showToast(appToasts.couldNotRestoreSession, "error");
                setLoading(false);
              }
            } catch {
              showToast(appToasts.signInFailed, "error");
              setLoading(false);
            }
          }, 1500);
          return;
        }
        showToast(appToasts.signInFailed, "error");
      } finally {
        restoreInProgress.current = false;
        setLoading(false);
      }
    };

    // Synchronously read the event/session, then fire-and-forget the
    // async restore work — must NOT be async (Supabase navigator lock).
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && !manualLoginInProgress.current && !restoreInProgress.current && !fromShareLinkRef.current) {
          restoreSession(session.user);
        } else if (fromShareLinkRef.current) {
          setLoading(false);
        } else if (!session?.user) {
          const isOAuthCallback =
            window.location.search.includes("code=") ||
            window.location.hash.includes("access_token=");
          const hasOAuthFlag =
            sessionStorage.getItem('oauth_session_ready') ||
            sessionStorage.getItem('oauth_exchange_failed');
          const savedStudent = localStorage.getItem('vocaband_student_login');
          const savedPending = sessionStorage.getItem('vocaband_pending_approval');
          if (!isOAuthCallback && !hasOAuthFlag && !savedStudent && !savedPending) {
            setLoading(false);
          }
        }
      } catch { /* getSession failed — let onAuthStateChange handle it */ }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (manualLoginInProgress.current) return;

      if (session?.user) {
        if (fromShareLinkRef.current && event === 'INITIAL_SESSION') {
          setLoading(false);
          return;
        }
        // TOKEN_REFRESHED / USER_UPDATED fire on tab refocus and the
        // periodic refresh — they never change identity. Re-running the
        // full restore on them refetches data and resets the open view,
        // wiping what the user had open when they switched tabs. Skip when
        // the same user is already restored (a real account switch fires
        // SIGNED_IN, which is never skipped).
        if ((event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')
            && restoredUidRef.current === session.user.id) {
          return;
        }
        restoreSession(session.user);
      } else if (event === 'SIGNED_OUT') {
        restoredUidRef.current = null;
        cleanupSessionData();
        try { stopAllAudio(); } catch {}
        try { window.speechSynthesis?.cancel(); } catch {}
        try { disconnectQuickPlaySocket(); } catch {}
        setUser(null);
        setActiveAssignment(null);
        setAssignmentWords([]);
        setIsFinished(false);
        setCurrentIndex(0);
        setScore(0);
        setMistakes([]);
        setWordAttemptBatch([]);
        setFeedback(null);
        setSpellingInput("");
        setMatchedIds([]);
        setSelectedMatch(null);
        setIsFlipped(false);
        setRevealedLetters(0);
        setSentenceIndex(0);
        setAvailableWords([]);
        setBuiltSentence([]);
        setSentenceFeedback(null);
        setHiddenOptions([]);
        setShowModeSelection(false);
        setQuickPlayActiveSession(null);
        setQuickPlaySessionCode(null);
        qpCumulativeScoreRef.current = 0;
        setQuickPlayKicked(false);
        setQuickPlaySessionEnded(false);
        try { localStorage.removeItem('vocaband_student_login'); } catch {}
        try { localStorage.removeItem('vocaband_quick_play_session'); } catch {}
        try { localStorage.removeItem('vocaband_qp_guest'); } catch {}
        try { clearAllReadCache(); } catch {}
        // Only a CONFIRMED teacher lands on the teacher login card. Students
        // AND Quick Play guests (whose role can be unset) must never be dumped
        // on the teacher sign-in screen — route every non-teacher to the
        // student login instead. (Previously this keyed on === 'student', so a
        // guest with no role fell through to the teacher card.)
        const wasTeacher = lastUserRoleRef.current === 'teacher';
        const postLogoutView: View = wasTeacher ? 'teacher-login' : 'student-account-login';
        lastUserRoleRef.current = null;
        const target = wasTeacher ? '/teacher' : '/student';
        if (!quickPlaySessionParam) {
          try { window.history.replaceState({ view: postLogoutView }, '', target); } catch {
            try { window.history.replaceState({ view: postLogoutView }, ''); } catch {}
          }
        } else {
          try { window.history.replaceState({ view: postLogoutView }, ''); } catch {}
        }
        setLoading(false);
        setView(postLogoutView);
      } else if (event === 'INITIAL_SESSION') {
        const isOAuthCallback =
          window.location.search.includes("code=") ||
          window.location.hash.includes("access_token=");

        const justExchanged = sessionStorage.getItem('oauth_session_ready');
        if (justExchanged) {
          sessionStorage.removeItem('oauth_session_ready');
          let pollCount = 0;
          const maxPolls = 64;
          const pollForSession = async () => {
            pollCount++;
            try {
              const { data: { session: polled } } = await supabase.auth.getSession();
              if (polled?.user) {
                if (!restoreInProgress.current) restoreSession(polled.user);
                return;
              }
            } catch { /* retry */ }
            if (pollCount < maxPolls) {
              setTimeout(pollForSession, 250);
            } else {
              showToast(appToasts.signInTakingTooLong, "error");
              setLoading(false);
            }
          };
          pollForSession();
          return;
        }

        const exchangeFailed = sessionStorage.getItem('oauth_exchange_failed');
        if (exchangeFailed) {
          sessionStorage.removeItem('oauth_exchange_failed');
          setError("Sign-in timed out. Please try again.");
          setLandingTab("teacher");
          setLoading(false);
        } else if (!isOAuthCallback) {
          try {
            const savedPending = sessionStorage.getItem('vocaband_pending_approval');
            if (savedPending) {
              const info = JSON.parse(savedPending);
              if (info.name && info.classCode) {
                setPendingApprovalInfo(info);
                setView("student-pending-approval");
                setLoading(false);
                return;
              }
            }
          } catch {}

          const savedRaw = localStorage.getItem('vocaband_student_login');
          if (savedRaw) {
            supabase.auth.signInAnonymously().catch(() => {
              localStorage.removeItem('vocaband_student_login');
              setLoading(false);
            });
          } else {
            setLoading(false);
          }
        }
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Safety timeout: if onAuthStateChange never fires (e.g. fully offline),
  // stop the spinner so the app doesn't hang forever.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!manualLoginInProgress.current && !restoreInProgress.current) setLoading(false);
    }, 20000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
