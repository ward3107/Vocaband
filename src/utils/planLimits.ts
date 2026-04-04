export type PlanTier = 'free' | 'pro' | 'admin';

export interface PlanLimits {
  maxClasses: number;
  maxStudentsPerClass: number;
  maxAssignmentsPerClass: number;
  allowedModes: readonly string[];
  maxWords: number;
  quickPlayEnabled: boolean;
  maxQuickPlaySessionsPerDay: number;
  ocrEnabled: boolean;
  aiTutorEnabled: boolean;
}

const FREE_MODES = ['classic', 'matching', 'true-false'] as const;

const ALL_MODES = [
  'classic', 'listening', 'spelling', 'matching', 'true-false',
  'flashcards', 'scramble', 'reverse', 'letter-sounds', 'sentence-builder',
] as const;

const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxClasses: 1,
    maxStudentsPerClass: 15,
    maxAssignmentsPerClass: 3,
    allowedModes: FREE_MODES,
    maxWords: 500,
    quickPlayEnabled: true,
    maxQuickPlaySessionsPerDay: 3,
    ocrEnabled: false,
    aiTutorEnabled: false,
  },
  pro: {
    maxClasses: 50,
    maxStudentsPerClass: 200,
    maxAssignmentsPerClass: Infinity,
    allowedModes: ALL_MODES,
    maxWords: 5156,
    quickPlayEnabled: true,
    maxQuickPlaySessionsPerDay: Infinity,
    ocrEnabled: true,
    aiTutorEnabled: true,
  },
  admin: {
    maxClasses: 50,
    maxStudentsPerClass: 200,
    maxAssignmentsPerClass: Infinity,
    allowedModes: ALL_MODES,
    maxWords: 5156,
    quickPlayEnabled: true,
    maxQuickPlaySessionsPerDay: Infinity,
    ocrEnabled: true,
    aiTutorEnabled: true,
  },
};

export function getPlanLimits(plan?: PlanTier | string): PlanLimits {
  return PLAN_LIMITS[(plan as PlanTier)] || PLAN_LIMITS.free;
}

export function isModeAllowed(mode: string, plan?: PlanTier | string): boolean {
  return getPlanLimits(plan).allowedModes.includes(mode);
}

export function isPro(plan?: PlanTier | string): boolean {
  return plan === 'pro' || plan === 'admin';
}
