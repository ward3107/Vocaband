import { createClient } from '@supabase/supabase-js';
import type { Language } from '../hooks/useLanguage';

// Public fallback values — these are the production Supabase URL + anon
// ("publishable") key. They're already visible inside every shipped JS
// bundle; Supabase labelled the key "publishable" precisely because it
// is safe for browser exposure (gated by RLS, not secret).
//
// Using them as fallbacks instead of relying solely on import.meta.env
// because Cloudflare Workers Builds can inject empty-string values for
// VITE_* secrets scoped to production only — which leaks into
// non-production (preview) builds as empty strings, overrides
// .env.production, and leaves the app in "Supabase is not configured"
// mode on every preview URL even when the .env.production file IS in
// the repo. Source-level fallbacks sidestep that entirely: if the env
// var is empty/missing for any reason, this still works.
const FALLBACK_SUPABASE_URL = 'https://auth.vocaband.com';
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_Pw-mQ9L76U5T-wLdKjOkpg_GnG99XDF';

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Exported so non-client modules (e.g. the network diagnostic probe) can
// hit Supabase REST endpoints directly with the right apikey header,
// without re-reading the env or re-importing the fallback constants.
export const supabaseUrl = (envUrl && envUrl.length > 0) ? envUrl : FALLBACK_SUPABASE_URL;
export const supabaseAnonKey = (envKey && envKey.length > 0) ? envKey : FALLBACK_SUPABASE_ANON_KEY;

// Guard kept for true dev-shell edge cases where even the fallback is
// somehow empty (should not happen in practice).
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
if (!isSupabaseConfigured) {
  console.error(
    '[Vocaband] Neither VITE_SUPABASE_URL/ANON_KEY nor the in-source fallback was available. ' +
    'This should not happen — check src/core/supabase.ts.'
  );
}

// Per-request fetch timeout. The browser's default fetch has no abort
// timer; on a silent black-hole pipe a request can hang for 30-60s
// before the underlying socket gives up. On Israeli school Wi-Fi that
// produces the "frozen spinner" experience students describe. An 8s
// budget is generous for REST queries that normally complete in <1s
// and lets the existing save-queue retry path catch the abort instead
// of the UI awaiting indefinitely.
//
// Storage uploads (OCR images, custom-word audio) can legitimately
// take 20-30s on a slow uplink, so they get a longer budget. Realtime
// runs over WebSocket, not fetch, so it's unaffected.
const REST_TIMEOUT_MS = 8_000;
const STORAGE_TIMEOUT_MS = 60_000;

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function vocabandFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // If the caller already wired up an AbortSignal (e.g. useNetworkDiagnostic,
  // OCR upload), respect it — don't double-abort.
  if (init?.signal) return fetch(input, init);

  const url = urlOf(input);
  const isStorage = url.includes('/storage/v1/');
  const timeoutMs = isStorage ? STORAGE_TIMEOUT_MS : REST_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(input, { ...init, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Use PKCE flow for better mobile/redirect support
      flowType: 'pkce',
      // Disable automatic URL detection — we exchange the PKCE code manually
      // in main.tsx before React mounts.
      detectSessionInUrl: false,
    },
    global: { fetch: vocabandFetch },
  }
);

// ---------------------------------------------------------------------------
// Fast user-initiated logout
// ---------------------------------------------------------------------------
//
// `scope: 'local'` skips the /auth/v1/logout network round-trip (the default
// global signOut waits for it before firing SIGNED_OUT, which on a slow
// mobile network meant the teacher tapped Logout and stared at the
// dashboard for several seconds).  With local scope, supabase-js clears the
// in-memory + localStorage session and fires SIGNED_OUT almost
// synchronously.  The handler in App.tsx then does all the cleanup —
// audio, sockets, React state, history reset, view swap to the public
// landing — without a hard page reload.  Total perceived logout latency
// drops to <100 ms.
export function performUserLogout(): void {
  supabase.auth.signOut({ scope: 'local' }).catch(() => { /* best-effort */ });
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface DbErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    isAnonymous: boolean | undefined;
  };
}

export async function handleDbError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): Promise<never> {
  // Log full error details for Supabase errors
  let errorMsg: string;
  if (error && typeof error === 'object' && 'message' in error) {
    const e = error as { message?: string; details?: string; hint?: string; code?: string };
    errorMsg = [e.message, e.details, e.hint, e.code].filter(Boolean).join(' | ');
  } else {
    errorMsg = error instanceof Error ? error.message : String(error);
  }
  console.error(`Supabase ${operationType} error on ${path}: ${errorMsg}`);
  throw new Error('Database error — please try again.');
}

// ---------------------------------------------------------------------------
// Explicit column lists for `.select(...)` calls.
//
// Prefer these over `.select('*')` so the mapper and the query stay in sync
// and the client doesn't waste bandwidth hauling a row's full surface area
// (e.g. users' full cosmetic state) on every dashboard refresh. Each
// constant lists exactly the columns the matching mapper below reads.
// ---------------------------------------------------------------------------
export const USER_COLUMNS =
  'uid,email,role,display_name,class_code,avatar,badges,xp,coins,streak,unlocked_avatars,unlocked_themes,power_ups,active_theme,active_frame,active_title,teacher_dashboard_theme,first_rating,first_rating_at,rating_dismissed_at,onboarded_at,plan,trial_ends_at,subject,guides_seen,school_id';
export const CLASS_COLUMNS = 'id,name,code,teacher_uid,avatar,subject,school_name,school_logo_url,background_color';
export const ASSIGNMENT_COLUMNS =
  'id,class_id,word_ids,words,title,deadline,allowed_modes,sentences,sentence_difficulty,created_at,subject';
export const PROGRESS_COLUMNS =
  'id,student_name,student_uid,assignment_id,class_code,score,mode,completed_at,mistakes,avatar,play_count';
export const FEATURE_FLAG_COLUMNS = 'name,enabled,enabled_for_classes,description,updated_at';

// ---------------------------------------------------------------------------
// Row-to-interface mappers (DB uses snake_case, TS uses camelCase)
// ---------------------------------------------------------------------------

export interface AppUser {
  uid: string;
  email?: string;
  /**
   * In-memory role for the React state.  `'teacher' | 'student' | 'admin'`
   * map 1:1 to rows in `public.users` (DB CHECK constraint enforces those
   * three; see supabase/schema.sql).  `'guest'` is intentionally NOT in
   * the DB CHECK — guests (Quick Play participants without an account)
   * exist only as in-memory `AppUser` objects produced by
   * `utils/createGuestUser.ts` and are NEVER persisted to public.users.
   * If you find code writing a `'guest'` row to the DB, that's a bug —
   * filter it out before .insert() / .update().  Audit L-4 (2026-05-23).
   */
  role: 'teacher' | 'student' | 'admin' | 'manager' | 'guest';
  displayName: string;
  classCode?: string;
  avatar?: string;
  /** Spend currency for the shop. XP is rank-only; coins are spent. */
  coins: number;
  badges?: string[];
  xp?: number;
  streak?: number;
  unlockedAvatars?: string[];
  unlockedThemes?: string[];
  powerUps?: Record<string, number>;
  activeTheme?: string;
  /** Id of the currently-equipped frame cosmetic (NAME_FRAMES), or null/undefined. */
  activeFrame?: string | null;
  /** Id of the currently-equipped title cosmetic (TITLES_CATALOG), or null/undefined. */
  activeTitle?: string | null;
  /** Id of the teacher dashboard theme.  See TEACHER_DASHBOARD_THEMES.
   *  Read only by the teacher dashboard chrome — students ignore this
   *  field even though it sits on every users row. */
  teacherDashboardTheme?: string;
  /** First in-app rating (1-5 stars), captured the first time the
   *  rating prompt fires.  Never overwritten — we want first-impression
   *  NPS, not "happy returning user" inflation. */
  firstRating?: number | null;
  /** Timestamp of first_rating capture. */
  firstRatingAt?: string | null;
  /** Timestamp of when the user closed the prompt without rating.
   *  Prompt waits ≥7 days before re-asking. */
  ratingDismissedAt?: string | null;
  isGuest?: boolean;
  createdAt?: string;
  /** Timestamp the teacher completed the first-class onboarding
   *  wizard.  NULL = wizard hasn't shown yet (or was skipped without
   *  completion).  Used by TeacherDashboardView to decide whether to
   *  open the wizard on mount.  Students ignore this field. */
  onboardedAt?: string | null;
  /** Paid plan tier — see src/core/plan.ts.  'free' is default; the
   *  effective plan at runtime also considers `trialEndsAt`.  Students
   *  ignore this field. */
  plan?: 'free' | 'pro' | 'school';
  /** Timestamp the 14-day Pro trial expires.  While > now() and
   *  plan='free', the teacher has Pro features.  NULL for users who
   *  never had a trial (e.g. plan='pro' set manually). */
  trialEndsAt?: string | null;
  /** Which Vocas the school's principal has assigned this teacher.
   *  The single Voca this teacher belongs to.  Defaults to 'english'.
   *  Admins ignore this field — admin role grants entry to all Vocas
   *  via getEntitledVocas() in core/subject.ts.  Students ignore it too
   *  (their Voca comes from the class they joined). */
  subject?: 'english' | 'hebrew';
  /** First-time-guide keys this teacher has dismissed.  Mirrors the
   *  `users.guides_seen text[]` column; see useFirstTimeGuide.  Empty
   *  array (the DB default) means no guides have been dismissed yet —
   *  every guide will auto-show once.  Students ignore this field. */
  guidesSeen?: string[];
  /** School this user belongs to (teachers + managers).  NULL for users not
   *  attached to a school, and for students (a student's school is implied
   *  by their class).  Drives the manager dashboard's tenant scope.  See
   *  migration 20260623000000_school_manager.sql. */
  schoolId?: string | null;
  /** Plan of the school this user belongs to, fetched alongside the user at
   *  load time (see fetchUserProfile). Lets getEffectivePlan() grant Pro to
   *  every teacher in a paid school WITHOUT touching the teacher's own plan.
   *  undefined when the user has no school, or when the school billing columns
   *  aren't readable yet (e.g. before the migration is applied) — in which case
   *  the teacher just falls back to their own plan. The server enforces the
   *  real entitlement regardless, so this is a UI convenience only. */
  schoolPlan?: 'free' | 'school' | null;
  /** School-wide Pro trial expiry, when the school is trialing rather than on a
   *  paid license. While > now(), every member reads as Pro. */
  schoolTrialEndsAt?: string | null;
  /** Display name of the school this user belongs to (fetched alongside
   *  schoolPlan in attachSchoolPlan). Surfaced on the dashboard plan card so a
   *  school-licensed teacher sees their school name as confirmation. */
  schoolName?: string | null;
  // (Parent Weekly Digest fields lived here until 2026-05-18 — removed
  // alongside the schema in migration
  // 20260618000000_drop_parent_digest_stub.sql.)
}

/** Treat `admin` as a superset of `teacher` for UI access.  Admins keep
 *  their elevated DB privileges (RLS bypass via `is_admin()`) AND see
 *  every teacher surface — dashboard, classes, gradebook, live challenge,
 *  etc.  Without this helper the developer/admin account silently gets
 *  rejected by the teacher-intent guard at sign-in and never reaches
 *  the teacher dashboard.
 *
 *  Declared as a type predicate narrowing the role field so callers
 *  like `if (hasTeacherAccess(user)) { use(user) }` get `user` narrowed
 *  from `AppUser | null` to a non-null AppUser inside the branch,
 *  while the else branch still sees the original `AppUser`. */
export function hasTeacherAccess<T extends { role?: string }>(
  user: T | null | undefined
): user is T & { role: 'teacher' | 'admin' } {
  return user?.role === 'teacher' || user?.role === 'admin';
}

/** Admin-only gate.  Used by the security audit dashboard nav entry —
 *  the underlying `authz_failures` table is also RLS-protected to
 *  admin readers, so this is purely a UI shortcut to avoid showing
 *  a button that would just dead-end for non-admins. */
export function hasAdminAccess<T extends { role?: string }>(
  user: T | null | undefined
): user is T & { role: 'admin' } {
  return user?.role === 'admin';
}

/** School-manager (principal) gate.  Kept SEPARATE from hasTeacherAccess on
 *  purpose: a manager must NOT inherit teacher-only behaviours (live
 *  challenge, vocab library, XP-on-finish, etc.) — they only get the
 *  read-only oversight dashboard.  Tenant data is enforced server-side by
 *  the manager_* RLS clauses; this is purely the UI routing gate. */
export function hasManagerAccess<T extends { role?: string }>(
  user: T | null | undefined
): user is T & { role: 'manager' } {
  return user?.role === 'manager';
}

// ---------------------------------------------------------------------------
// School-manager dashboard payload (see public.manager_overview RPC).
// ---------------------------------------------------------------------------
export interface ManagerTeacherRow {
  uid: string;
  display_name: string;
  email: string | null;
  class_count: number;
  student_count: number;
  active_students_7d: number;
  /** ISO timestamp of the most recent student activity, or null if none. */
  last_activity: string | null;
}

export interface ManagerClassRow {
  id: string;
  name: string;
  code: string;
  teacher_name: string | null;
  students: number;
  avg_score: number | null;
  completion: number;
  active_7d: number;
  last_activity: string | null;
}
/** A {day,value} point used by every console time-series chart. */
export interface DayPoint { d: string; active?: number; games?: number; }

export interface ManagerOverview {
  school: { id: string; name: string } | null;
  totals: { teachers: number; classes: number; students: number; active_students_7d: number; games_7d: number; total_xp: number };
  teachers: ManagerTeacherRow[];
  engagement14: DayPoint[];
  students_by_class: { name: string; value: number }[];
  xp_by_teacher: { name: string; xp: number }[];
  classes: ManagerClassRow[];
}
export interface ManagerEngagement {
  active30: { d: string; active: number }[];
  games14: { d: string; games: number }[];
  dow: { dow: number; plays: number }[];
  modes: { mode: string; plays: number }[];
}
export interface ManagerTeacherDetail {
  teacher: { uid: string; display_name: string; email: string | null; classes: number; students: number; active_7d: number; xp: number };
  activity14: { d: string; active: number }[];
  per_class: { name: string; students: number }[];
  top_students: { name: string; xp: number }[];
}
export interface ManagerClassDetail {
  class: { id: string; name: string; code: string; teacher_name: string | null; students: number; avg_score: number | null; active_7d: number };
  score_dist: { band: string; n: number }[];
  activity14: { d: string; active: number }[];
  assignments: { title: string; completion: number }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callManagerRpc<T>(fn: string, args?: Record<string, any>): Promise<T | null> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error || !data || (data as { error?: string }).error) return null;
  return data as T;
}

/** Each fetcher returns null when the caller isn't a manager / lacks access
 *  (the RPC self-scopes server-side), so views show an empty state rather
 *  than leaking that other schools or out-of-school rows exist. */
export const fetchManagerOverview = () => callManagerRpc<ManagerOverview>('manager_overview');
export const fetchManagerEngagement = () => callManagerRpc<ManagerEngagement>('manager_engagement');
export const fetchManagerTeacherDetail = (uid: string) => callManagerRpc<ManagerTeacherDetail>('manager_teacher_detail', { p_uid: uid });
export const fetchManagerClassDetail = (classId: string) => callManagerRpc<ManagerClassDetail>('manager_class_detail', { p_class_id: classId });

export interface ClassData {
  id: string;
  name: string;
  code: string;
  teacherUid: string;
  /** Optional emoji avatar for the class — null until the teacher picks
   * one.  Selected from a curated education-appropriate pool in the
   * client (CLASS_AVATARS).  Renamed/changed without losing students. */
  avatar?: string | null;
  /** Which Voca this class belongs to.  DB default is 'english' so any
   *  legacy row with the column missing reads as English.  See
   *  20260507204614_voca_subject_flags. */
  subject?: 'english' | 'hebrew';
  /** Per-class school branding (added 20260512_school_branding).  Both
   *  null until the teacher fills them in via Edit Class.  Displayed
   *  on the teacher class card and the student class-join screen. */
  schoolName?: string | null;
  schoolLogoUrl?: string | null;
  /** Per-class background tint (added 20260618_class_background_color).
   *  Hex string like '#fde68a' or null for the default theme surface.
   *  Lets teachers visually distinguish multiple classes at a glance. */
  backgroundColor?: string | null;
}

export interface AssignmentData {
  id: string;
  classId: string;
  wordIds: number[];
  words?: import('../data/vocabulary').Word[];
  title: string;
  deadline?: string | null;
  createdAt?: string;
  allowedModes?: string[];
  sentences?: string[];
  sentenceDifficulty?: number;
  /** Denormalized from the parent class row — application code keeps
   *  it consistent with classes.subject. */
  subject?: 'english' | 'hebrew';
}

/** A classroom competition — async tournament wrapping one assignment.
 *  Created by the teacher at assignment-create time; opens immediately
 *  and closes at the assignment's deadline.  See migration
 *  20260516120000_classroom_competitions.sql for the underlying table.
 *  Per-student ranking comes from the `competition_leaderboard` RPC. */
export interface CompetitionData {
  id: string;
  assignmentId: string;
  classId: string;
  opensAt: string;
  closesAt: string;
  status: 'live' | 'ended';
  createdAt: string;
}

export interface CompetitionLeaderboardEntry {
  studentUid: string;
  studentName: string;
  avatar: string | null;
  totalScore: number;
  lastPlayed: string;
}

export interface FeatureFlag {
  /** Snake-case identifier — permanent once set.  Matches the DB primary key. */
  name: string;
  /** Master switch.  true + empty enabledForClasses = on for everyone. */
  enabled: boolean;
  /** Class CODES that always see the feature, regardless of `enabled`.
   *  Use for beta rollouts: list one or two trusted classes, watch for
   *  a day, then flip `enabled=true` and empty this array for global. */
  enabledForClasses: string[];
  /** Human-readable note for the admin — what does this flag gate? */
  description: string;
  /** Server-managed timestamp (auto-bumped by trigger on update). */
  updatedAt: string;
}

export interface ProgressData {
  id: string;
  studentName: string;
  studentUid?: string;
  assignmentId: string;
  classCode: string;
  score: number;
  mode: string;
  completedAt: string;
  mistakes?: number[];
  avatar?: string;
  /** Cumulative replay count for this (assignment, mode) pair.  Added
   * in migration 20260425 — null/undefined means the row predates the
   * migration and should be treated as 1. */
  playCount?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapUser(row: any): AppUser {
  return {
    uid: row.uid,
    email: row.email,
    role: row.role,
    displayName: row.display_name,
    classCode: row.class_code,
    avatar: row.avatar,
    badges: row.badges ?? [],
    coins: row.coins ?? 0,
    xp: row.xp ?? 0,
    streak: row.streak ?? 0,
    unlockedAvatars: row.unlocked_avatars ?? [],
    unlockedThemes: row.unlocked_themes ?? [],
    powerUps: row.power_ups ?? {},
    activeTheme: row.active_theme ?? 'default',
    activeFrame: row.active_frame ?? null,
    activeTitle: row.active_title ?? null,
    teacherDashboardTheme: row.teacher_dashboard_theme ?? 'default',
    firstRating: row.first_rating ?? null,
    firstRatingAt: row.first_rating_at ?? null,
    ratingDismissedAt: row.rating_dismissed_at ?? null,
    onboardedAt: row.onboarded_at ?? null,
    plan: row.plan ?? 'free',
    trialEndsAt: row.trial_ends_at ?? null,
    subject: row.subject === 'hebrew' ? 'hebrew' : 'english',
    guidesSeen: row.guides_seen ?? [],
    schoolId: row.school_id ?? null,
  };
}

/**
 * Look up an AppUser by Supabase auth uid, with a single retry on
 * transient errors.  Returns null when the row genuinely doesn't
 * exist (PKCE first-sign-in / pre-trigger window).
 *
 * Used by the auth/onAuthStateChange restore flow — kept here next
 * to USER_COLUMNS + mapUser so the lookup, projection list, and shape
 * mapping stay in sync.
 */
export async function fetchUserProfile(
  uid: string,
  retries = 1,
): Promise<AppUser | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const { data: userRow, error } = await supabase
      .from('users')
      .select(USER_COLUMNS)
      .eq('uid', uid)
      .maybeSingle();
    if (userRow) {
      const user = mapUser(userRow);
      await attachSchoolPlan(user);
      return user;
    }
    if (!error) return null;
    if (attempt < retries) await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

/**
 * If the user belongs to a school, fetch that school's plan + trial and stash
 * them on the user so getEffectivePlan() can grant Pro to every teacher in a
 * paid school. Best-effort: any error — including the billing columns not
 * existing yet, before migration 20260624000000 is applied — leaves the fields
 * unset and the teacher falls back to their own plan. The server still enforces
 * the real entitlement, so this is purely a UI convenience and must never break
 * the login path. RLS lets a user read their own school row (schools_select).
 */
async function attachSchoolPlan(user: AppUser): Promise<void> {
  if (!user.schoolId) return;
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('name,plan,trial_ends_at')
      .eq('id', user.schoolId)
      .maybeSingle();
    if (!error && data) {
      user.schoolPlan = (data.plan as 'free' | 'school' | null) ?? null;
      user.schoolTrialEndsAt = (data.trial_ends_at as string | null) ?? null;
      user.schoolName = (data.name as string | null) ?? null;
    }
  } catch {
    // best-effort only — ignore and fall back to the user's own plan
  }
}

export function mapUserToDb(u: Partial<AppUser> & { uid: string }) {
  return {
    uid: u.uid,
    ...(u.email !== undefined && { email: u.email }),
    ...(u.role !== undefined && { role: u.role }),
    ...(u.displayName !== undefined && { display_name: u.displayName }),
    ...(u.classCode !== undefined && { class_code: u.classCode }),
    ...(u.avatar !== undefined && { avatar: u.avatar }),
    ...(u.coins !== undefined && { coins: u.coins }),
    ...(u.badges !== undefined && { badges: u.badges }),
    ...(u.xp !== undefined && { xp: u.xp }),
    ...(u.streak !== undefined && { streak: u.streak }),
    ...(u.unlockedAvatars !== undefined && { unlocked_avatars: u.unlockedAvatars }),
    ...(u.unlockedThemes !== undefined && { unlocked_themes: u.unlockedThemes }),
    ...(u.powerUps !== undefined && { power_ups: u.powerUps }),
    ...(u.activeTheme !== undefined && { active_theme: u.activeTheme }),
    ...(u.activeFrame !== undefined && { active_frame: u.activeFrame }),
    ...(u.activeTitle !== undefined && { active_title: u.activeTitle }),
    ...(u.teacherDashboardTheme !== undefined && { teacher_dashboard_theme: u.teacherDashboardTheme }),
    ...(u.plan !== undefined && { plan: u.plan }),
    ...(u.trialEndsAt !== undefined && { trial_ends_at: u.trialEndsAt }),
    ...(u.subject !== undefined && { subject: u.subject }),
    ...(u.guidesSeen !== undefined && { guides_seen: u.guidesSeen }),
    ...(u.schoolId !== undefined && { school_id: u.schoolId }),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapClass(row: any): ClassData {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    teacherUid: row.teacher_uid,
    avatar: row.avatar ?? null,
    subject: row.subject === 'hebrew' ? 'hebrew' : 'english',
    schoolName: row.school_name ?? null,
    schoolLogoUrl: row.school_logo_url ?? null,
    backgroundColor: row.background_color ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapAssignment(row: any): AssignmentData {
  return {
    id: row.id,
    classId: row.class_id,
    wordIds: row.word_ids ?? [],
    words: row.words,
    title: row.title,
    deadline: row.deadline,
    allowedModes: row.allowed_modes,
    sentences: row.sentences ?? [],
    sentenceDifficulty: row.sentence_difficulty ?? 2,
    createdAt: row.created_at,
    subject: row.subject === 'hebrew' ? 'hebrew' : 'english',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapProgress(row: any): ProgressData {
  return {
    id: row.id,
    studentName: row.student_name,
    studentUid: row.student_uid,
    assignmentId: row.assignment_id,
    classCode: row.class_code,
    score: row.score,
    mode: row.mode,
    completedAt: row.completed_at,
    mistakes: row.mistakes,
    avatar: row.avatar,
    playCount: row.play_count ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapCompetition(row: any): CompetitionData {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    classId: row.class_id,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    status: row.status === 'ended' ? 'ended' : 'live',
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapCompetitionLeaderboardEntry(row: any): CompetitionLeaderboardEntry {
  return {
    studentUid: row.student_uid,
    studentName: row.student_name,
    avatar: row.avatar ?? null,
    totalScore: Number(row.total_score ?? 0),
    lastPlayed: row.last_played,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapFeatureFlag(row: any): FeatureFlag {
  return {
    name: row.name,
    enabled: row.enabled === true,
    enabledForClasses: Array.isArray(row.enabled_for_classes) ? row.enabled_for_classes : [],
    description: row.description ?? '',
    updatedAt: row.updated_at,
  };
}

export function mapProgressToDb(p: Omit<ProgressData, 'id'>) {
  return {
    student_name: p.studentName,
    student_uid: p.studentUid,
    assignment_id: p.assignmentId,
    class_code: p.classCode,
    score: p.score,
    mode: p.mode,
    completed_at: p.completedAt,
    mistakes: p.mistakes,
    avatar: p.avatar,
  };
}

// ---------------------------------------------------------------------------
// Vocabulary Library — teacher-owned persistent vocabulary storage
// ---------------------------------------------------------------------------
// Schema in supabase/migrations/20260621000000_vocabulary_library.sql.
// Hierarchy: teacher → Collection (nested, max depth 5) → Set → Word → Sentence.
// All consumer surfaces (assignments, worksheets, Class Show, Quick Play)
// read from these tables; OCR / manual / paste / AI / curriculum-pick all
// write into them.

export const VOCABULARY_COLLECTION_COLUMNS =
  'id,teacher_uid,parent_id,name,description,emoji,color,school_year,grade_level,share_mode,shared_with_school_id,is_archived,created_at,updated_at';

export const VOCABULARY_SET_COLUMNS =
  'id,teacher_uid,collection_id,name,description,source_type,source_label,extraction_job_id,grade_level,language_pair,curriculum_alignment,difficulty,word_count,sentence_preset,emoji,color,is_archived,is_template,created_at,updated_at,last_used_at';

export const VOCABULARY_SET_WORD_COLUMNS =
  'id,set_id,position,english,hebrew,arabic,part_of_speech,difficulty,curriculum_word_id,audio_url,metadata,created_at,updated_at';

export const VOCABULARY_SET_WORD_SENTENCE_COLUMNS =
  'id,word_id,text,kind,level,length_bucket,tense,tone,theme,grammar_focus,cultural_context,is_primary,was_edited,generated_by,audio_url,created_at,updated_at';

export const VOCABULARY_EXTRACTION_JOB_COLUMNS =
  'id,teacher_uid,set_id,source_type,source_filename,source_size_bytes,source_mime_type,source_hash_sha256,ai_model,status,words_extracted,processing_ms,error_message,storage_object_key,storage_deleted_at,created_at,completed_at';

export type VocabularySourceType =
  | 'manual'
  | 'paste'
  | 'ocr_image'
  | 'ocr_document'
  | 'ai_topic'
  | 'ai_augment'
  | 'curriculum'
  | 'imported';

export type VocabularyShareMode = 'private' | 'school' | 'invite';

export type VocabularyLanguagePair =
  | 'en-he-ar'
  | 'en-he'
  | 'en-ar'
  | 'he-en'
  | 'ar-en';

export type VocabularyCurriculumAlignment = 'Set 1' | 'Set 2' | 'Set 3' | 'Custom';

export type VocabularyExtractionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired';

export type SentenceLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
export type SentenceLengthBucket = 'short' | 'medium' | 'long';
export type SentenceTense = 'present' | 'past' | 'future' | 'mixed';
export type SentenceTone = 'neutral' | 'fun' | 'story' | 'conversational' | 'educational';
export type SentenceCulturalContext = 'universal' | 'israeli';

/** Sentence-generation defaults persisted on each Set. Empty object = no
 *  preset; the AI uses smart defaults derived from grade_level at call
 *  time. See migration #4 (sentence controls). */
export interface VocabularySentencePreset {
  level?: SentenceLevel;
  length?: SentenceLengthBucket;
  tense?: SentenceTense;
  tone?: SentenceTone;
  theme?: string;
  grammar?: string | null;
  perWord?: 1 | 2 | 3;
  culturalContext?: SentenceCulturalContext;
}

export interface VocabularyCollection {
  id: string;
  teacherUid: string;
  parentId: string | null;
  name: string;
  description?: string | null;
  emoji?: string | null;
  color?: string | null;
  schoolYear?: string | null;
  gradeLevel?: number | null;
  shareMode: VocabularyShareMode;
  sharedWithSchoolId?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VocabularySet {
  id: string;
  teacherUid: string;
  collectionId: string | null;
  name: string;
  description?: string | null;
  sourceType: VocabularySourceType;
  sourceLabel?: string | null;
  extractionJobId?: string | null;
  gradeLevel?: number | null;
  languagePair: VocabularyLanguagePair;
  curriculumAlignment?: VocabularyCurriculumAlignment | null;
  difficulty?: number | null;
  wordCount: number;
  sentencePreset: VocabularySentencePreset;
  emoji?: string | null;
  color?: string | null;
  isArchived: boolean;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string | null;
}

export interface VocabularySetWord {
  id: string;
  setId: string;
  position: number;
  english: string;
  hebrew?: string | null;
  arabic?: string | null;
  partOfSpeech?: string | null;
  difficulty?: number | null;
  curriculumWordId?: number | null;
  audioUrl?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type SentenceKind = 'sentence' | 'fill_blank';

export interface VocabularySetWordSentence {
  id: string;
  wordId: string;
  text: string;
  /** 'sentence' = full sentence; 'fill_blank' = sentence with the
   *  target word replaced by ______. Added in migration
   *  20260621000020_sentence_kind.sql. */
  kind: SentenceKind;
  level?: SentenceLevel | null;
  lengthBucket?: SentenceLengthBucket | null;
  tense?: SentenceTense | null;
  tone?: SentenceTone | null;
  theme?: string | null;
  grammarFocus?: string | null;
  culturalContext?: SentenceCulturalContext | null;
  isPrimary: boolean;
  wasEdited: boolean;
  generatedBy: 'ai' | 'manual';
  audioUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VocabularyExtractionJob {
  id: string;
  teacherUid: string;
  setId?: string | null;
  sourceType: 'ocr_image' | 'ocr_document' | 'paste' | 'ai_topic' | 'ai_augment';
  sourceFilename?: string | null;
  sourceSizeBytes?: number | null;
  sourceMimeType?: string | null;
  sourceHashSha256?: string | null;
  aiModel?: string | null;
  status: VocabularyExtractionStatus;
  wordsExtracted?: number | null;
  processingMs?: number | null;
  errorMessage?: string | null;
  storageObjectKey?: string | null;
  storageDeletedAt?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapVocabularyCollection(row: any): VocabularyCollection {
  return {
    id: row.id,
    teacherUid: row.teacher_uid,
    parentId: row.parent_id ?? null,
    name: row.name,
    description: row.description ?? null,
    emoji: row.emoji ?? null,
    color: row.color ?? null,
    schoolYear: row.school_year ?? null,
    gradeLevel: row.grade_level ?? null,
    shareMode: (row.share_mode ?? 'private') as VocabularyShareMode,
    sharedWithSchoolId: row.shared_with_school_id ?? null,
    isArchived: row.is_archived === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapVocabularySet(row: any): VocabularySet {
  return {
    id: row.id,
    teacherUid: row.teacher_uid,
    collectionId: row.collection_id ?? null,
    name: row.name,
    description: row.description ?? null,
    sourceType: (row.source_type ?? 'manual') as VocabularySourceType,
    sourceLabel: row.source_label ?? null,
    extractionJobId: row.extraction_job_id ?? null,
    gradeLevel: row.grade_level ?? null,
    languagePair: (row.language_pair ?? 'en-he-ar') as VocabularyLanguagePair,
    curriculumAlignment: (row.curriculum_alignment ?? null) as VocabularyCurriculumAlignment | null,
    difficulty: row.difficulty ?? null,
    wordCount: row.word_count ?? 0,
    sentencePreset: (row.sentence_preset ?? {}) as VocabularySentencePreset,
    emoji: row.emoji ?? null,
    color: row.color ?? null,
    isArchived: row.is_archived === true,
    isTemplate: row.is_template === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsedAt: row.last_used_at ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapVocabularySetWord(row: any): VocabularySetWord {
  return {
    id: row.id,
    setId: row.set_id,
    position: row.position,
    english: row.english,
    hebrew: row.hebrew ?? null,
    arabic: row.arabic ?? null,
    partOfSpeech: row.part_of_speech ?? null,
    difficulty: row.difficulty ?? null,
    curriculumWordId: row.curriculum_word_id ?? null,
    audioUrl: row.audio_url ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapVocabularySetWordSentence(row: any): VocabularySetWordSentence {
  return {
    id: row.id,
    wordId: row.word_id,
    text: row.text,
    kind: (row.kind ?? 'sentence') as SentenceKind,
    level: (row.level ?? null) as SentenceLevel | null,
    lengthBucket: (row.length_bucket ?? null) as SentenceLengthBucket | null,
    tense: (row.tense ?? null) as SentenceTense | null,
    tone: (row.tone ?? null) as SentenceTone | null,
    theme: row.theme ?? null,
    grammarFocus: row.grammar_focus ?? null,
    culturalContext: (row.cultural_context ?? null) as SentenceCulturalContext | null,
    isPrimary: row.is_primary === true,
    wasEdited: row.was_edited === true,
    generatedBy: (row.generated_by ?? 'ai') as 'ai' | 'manual',
    audioUrl: row.audio_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapVocabularyExtractionJob(row: any): VocabularyExtractionJob {
  return {
    id: row.id,
    teacherUid: row.teacher_uid,
    setId: row.set_id ?? null,
    sourceType: row.source_type,
    sourceFilename: row.source_filename ?? null,
    sourceSizeBytes: row.source_size_bytes ?? null,
    sourceMimeType: row.source_mime_type ?? null,
    sourceHashSha256: row.source_hash_sha256 ?? null,
    aiModel: row.ai_model ?? null,
    status: (row.status ?? 'pending') as VocabularyExtractionStatus,
    wordsExtracted: row.words_extracted ?? null,
    processingMs: row.processing_ms ?? null,
    errorMessage: row.error_message ?? null,
    storageObjectKey: row.storage_object_key ?? null,
    storageDeletedAt: row.storage_deleted_at ?? null,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? null,
  };
}

export function mapVocabularyCollectionToDb(c: Partial<VocabularyCollection> & { teacherUid: string; name: string }) {
  return {
    ...(c.id !== undefined && { id: c.id }),
    teacher_uid: c.teacherUid,
    ...(c.parentId !== undefined && { parent_id: c.parentId }),
    name: c.name,
    ...(c.description !== undefined && { description: c.description }),
    ...(c.emoji !== undefined && { emoji: c.emoji }),
    ...(c.color !== undefined && { color: c.color }),
    ...(c.schoolYear !== undefined && { school_year: c.schoolYear }),
    ...(c.gradeLevel !== undefined && { grade_level: c.gradeLevel }),
    ...(c.shareMode !== undefined && { share_mode: c.shareMode }),
    ...(c.sharedWithSchoolId !== undefined && { shared_with_school_id: c.sharedWithSchoolId }),
    ...(c.isArchived !== undefined && { is_archived: c.isArchived }),
  };
}

export function mapVocabularySetToDb(s: Partial<VocabularySet> & { teacherUid: string; name: string }) {
  return {
    ...(s.id !== undefined && { id: s.id }),
    teacher_uid: s.teacherUid,
    ...(s.collectionId !== undefined && { collection_id: s.collectionId }),
    name: s.name,
    ...(s.description !== undefined && { description: s.description }),
    ...(s.sourceType !== undefined && { source_type: s.sourceType }),
    ...(s.sourceLabel !== undefined && { source_label: s.sourceLabel }),
    ...(s.extractionJobId !== undefined && { extraction_job_id: s.extractionJobId }),
    ...(s.gradeLevel !== undefined && { grade_level: s.gradeLevel }),
    ...(s.languagePair !== undefined && { language_pair: s.languagePair }),
    ...(s.curriculumAlignment !== undefined && { curriculum_alignment: s.curriculumAlignment }),
    ...(s.difficulty !== undefined && { difficulty: s.difficulty }),
    ...(s.sentencePreset !== undefined && { sentence_preset: s.sentencePreset }),
    ...(s.emoji !== undefined && { emoji: s.emoji }),
    ...(s.color !== undefined && { color: s.color }),
    ...(s.isArchived !== undefined && { is_archived: s.isArchived }),
  };
}

export function mapVocabularySetWordToDb(
  w: Partial<VocabularySetWord> & { setId: string; position: number; english: string }
) {
  return {
    ...(w.id !== undefined && { id: w.id }),
    set_id: w.setId,
    position: w.position,
    english: w.english,
    ...(w.hebrew !== undefined && { hebrew: w.hebrew }),
    ...(w.arabic !== undefined && { arabic: w.arabic }),
    ...(w.partOfSpeech !== undefined && { part_of_speech: w.partOfSpeech }),
    ...(w.difficulty !== undefined && { difficulty: w.difficulty }),
    ...(w.curriculumWordId !== undefined && { curriculum_word_id: w.curriculumWordId }),
    ...(w.audioUrl !== undefined && { audio_url: w.audioUrl }),
    ...(w.metadata !== undefined && { metadata: w.metadata }),
  };
}
