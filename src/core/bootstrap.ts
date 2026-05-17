/**
 * One-call student session bootstrap.
 *
 * Replaces the 3-5 sequential round-trips in useAuthRestore.ts with a
 * single SECURITY DEFINER RPC. The RPC composes existing helpers
 * (get_or_create_student_profile_oauth, get_assignments_for_class,
 * get_or_create_daily_missions, get_pet_state, get_unseen_rewards) and
 * returns the entire dashboard state in one JSONB blob.
 *
 * See supabase/migrations/20260614000000_bootstrap_student_session.sql
 * for the SQL contract.
 *
 * STATUS — feature is wired up to the RPC but NOT yet swapped into
 * useAuthRestore.ts. The old multi-query path remains. Once metrics
 * confirm the RPC behaves identically across all 5 entry paths in
 * useAuthRestore.ts, a follow-up PR will delete those branches.
 */
import {
  supabase,
  mapUser,
  mapClass,
  mapAssignment,
  mapProgress,
  type AppUser,
  type ClassData,
  type AssignmentData,
  type ProgressData,
} from './supabase';

export type BootstrapStatus =
  | 'ok'
  | 'needs-class-code'
  | 'pending-approval'
  | 'class-not-found';

export interface PetState {
  activeDays: number;
  lastActiveDate: string | null;
  daysSinceLastActive: number;
}

export interface DailyMission {
  userUid: string;
  missionDate: string;
  missionType: 'master_words' | 'play_modes' | 'beat_record';
  target: number;
  progress: number;
  completed: boolean;
  xpReward: number;
  completedAt: string | null;
}

export interface UnseenReward {
  id: string;
  teacherUid: string;
  teacherName: string;
  rewardType: 'xp' | 'badge' | 'title' | 'avatar';
  rewardValue: string;
  reason: string | null;
  createdAt: string;
}

export interface PendingApprovalProfile {
  id: string;
  displayName: string;
  classCode: string;
}

export interface BootstrapResult {
  status: BootstrapStatus;
  user: AppUser | null;
  class: ClassData | null;
  assignments: AssignmentData[];
  progress: ProgressData[];
  dailyMissions: DailyMission[];
  petState: PetState | null;
  unseenRewards: UnseenReward[];
  /** Only present when status === 'pending-approval'. */
  pendingProfile?: PendingApprovalProfile;
}

export interface BootstrapOptions {
  /** For OAuth first-login: the class code the student typed. */
  classCode?: string;
  /** For OAuth first-login: the display name. */
  displayName?: string;
  /** Default '🦊'. Captured here at OAuth-first-login time. */
  avatar?: string;
  /** User-local date in YYYY-MM-DD. Drives daily_missions / pet rollover. */
  localDate?: string;
}

/**
 * Calls the bootstrap RPC and maps the JSONB response into TS types.
 * Returns null on RPC failure — callers fall back to the legacy
 * multi-query path in useAuthRestore.ts.
 */
export async function bootstrapStudentSession(
  opts: BootstrapOptions = {},
): Promise<BootstrapResult | null> {
  const { data, error } = await supabase.rpc('bootstrap_student_session', {
    p_class_code:   opts.classCode   ?? null,
    p_display_name: opts.displayName ?? null,
    p_avatar:       opts.avatar      ?? '🦊',
    p_local_date:   opts.localDate   ?? null,
  });

  if (error) {
    console.error('[bootstrap_student_session] RPC failed:', error);
    return null;
  }
  return mapBootstrapResponse(data);
}

/**
 * Exported for unit-testing the mapper without hitting Supabase.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapBootstrapResponse(raw: any): BootstrapResult {
  const status = (raw?.status ?? 'needs-class-code') as BootstrapStatus;

  const result: BootstrapResult = {
    status,
    user:           raw?.user  ? mapUser(raw.user)   : null,
    class:          raw?.class ? mapClass(raw.class) : null,
    assignments:    Array.isArray(raw?.assignments)
                      ? raw.assignments.map(mapAssignment)
                      : [],
    progress:       Array.isArray(raw?.progress)
                      ? raw.progress.map(mapProgress)
                      : [],
    dailyMissions:  Array.isArray(raw?.daily_missions)
                      ? raw.daily_missions.map(mapDailyMission)
                      : [],
    petState:       raw?.pet_state ? mapPetState(raw.pet_state) : null,
    unseenRewards:  Array.isArray(raw?.unseen_rewards)
                      ? raw.unseen_rewards.map(mapUnseenReward)
                      : [],
  };

  if (status === 'pending-approval' && raw?.pending_profile) {
    result.pendingProfile = {
      id:          raw.pending_profile.id,
      displayName: raw.pending_profile.display_name,
      classCode:   raw.pending_profile.class_code,
    };
  }

  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDailyMission(row: any): DailyMission {
  return {
    userUid:      row.user_uid,
    missionDate:  row.mission_date,
    missionType:  row.mission_type,
    target:       row.target,
    progress:     row.progress ?? 0,
    completed:    row.completed ?? false,
    xpReward:     row.xp_reward,
    completedAt:  row.completed_at ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPetState(row: any): PetState {
  return {
    activeDays:          row.active_days ?? 0,
    lastActiveDate:      row.last_active_date ?? null,
    daysSinceLastActive: row.days_since_last_active ?? 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapUnseenReward(row: any): UnseenReward {
  return {
    id:          row.id,
    teacherUid:  row.teacher_uid,
    teacherName: row.teacher_name,
    rewardType:  row.reward_type,
    rewardValue: row.reward_value,
    reason:      row.reason ?? null,
    createdAt:   row.created_at,
  };
}
