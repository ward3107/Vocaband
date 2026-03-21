import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Use PKCE flow for better mobile/redirect support
    flowType: 'pkce',
    // Disable automatic URL detection — we exchange the PKCE code manually
    // in main.tsx before React mounts.
    detectSessionInUrl: false,
  },
});

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
// Row-to-interface mappers (DB uses snake_case, TS uses camelCase)
// ---------------------------------------------------------------------------

export interface AppUser {
  uid: string;
  email?: string;
  role: 'teacher' | 'student' | 'admin';
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
}

export interface ClassData {
  id: string;
  name: string;
  code: string;
  teacherUid: string;
}

export interface AssignmentData {
  id: string;
  classId: string;
  wordIds: number[];
  words?: import('./vocabulary').Word[];
  title: string;
  deadline?: string | null;
  createdAt?: string;
  allowedModes?: string[];
  sentences?: string[];
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
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapClass(row: any): ClassData {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    teacherUid: row.teacher_uid,
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
