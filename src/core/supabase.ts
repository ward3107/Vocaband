import { createClient } from '@supabase/supabase-js';

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
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_O1immSThDxWWI6PNXPNi1w__27CAThD';

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const supabaseUrl = (envUrl && envUrl.length > 0) ? envUrl : FALLBACK_SUPABASE_URL;
const supabaseAnonKey = (envKey && envKey.length > 0) ? envKey : FALLBACK_SUPABASE_ANON_KEY;

// Guard kept for true dev-shell edge cases where even the fallback is
// somehow empty (should not happen in practice).
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
if (!isSupabaseConfigured) {
  console.error(
    '[Vocaband] Neither VITE_SUPABASE_URL/ANON_KEY nor the in-source fallback was available. ' +
    'This should not happen — check src/core/supabase.ts.'
  );
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
  }
);

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
  'uid,email,role,display_name,class_code,avatar,badges,xp,streak,unlocked_avatars,unlocked_themes,power_ups,active_theme,active_frame,active_title,teacher_dashboard_theme,first_rating,first_rating_at,rating_dismissed_at,onboarded_at,plan,trial_ends_at,subjects_taught,guides_seen';
export const CLASS_COLUMNS = 'id,name,code,teacher_uid,avatar,subject,school_name,school_logo_url';
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
  role: 'teacher' | 'student' | 'admin' | 'guest';
  displayName: string;
  classCode?: string;
  avatar?: string;
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
  /** Timestamp the 30-day Pro trial expires.  While > now() and
   *  plan='free', the teacher has Pro features.  NULL for users who
   *  never had a trial (e.g. plan='pro' set manually). */
  trialEndsAt?: string | null;
  /** Which Vocas the school's principal has assigned this teacher.
   *  e.g. ['english'] for an English teacher, ['english','hebrew']
   *  for a teacher who teaches both.  Drives the post-login Voca
   *  Picker — teachers with length >= 2 see a picker before
   *  landing in a dashboard.  Defaults to ['english'] for legacy
   *  rows so existing teachers are unaffected.  Students ignore
   *  this field (their Voca comes from the class they joined). */
  subjectsTaught?: string[];
  /** First-time-guide keys this teacher has dismissed.  Mirrors the
   *  `users.guides_seen text[]` column; see useFirstTimeGuide.  Empty
   *  array (the DB default) means no guides have been dismissed yet —
   *  every guide will auto-show once.  Students ignore this field. */
  guidesSeen?: string[];
}

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
    subjectsTaught: row.subjects_taught ?? ['english'],
    guidesSeen: row.guides_seen ?? [],
  };
}

export function mapUserToDb(u: Partial<AppUser> & { uid: string }) {
  return {
    uid: u.uid,
    ...(u.email !== undefined && { email: u.email }),
    ...(u.role !== undefined && { role: u.role }),
    ...(u.displayName !== undefined && { display_name: u.displayName }),
    ...(u.classCode !== undefined && { class_code: u.classCode }),
    ...(u.avatar !== undefined && { avatar: u.avatar }),
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
    ...(u.subjectsTaught !== undefined && { subjects_taught: u.subjectsTaught }),
    ...(u.guidesSeen !== undefined && { guides_seen: u.guidesSeen }),
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
