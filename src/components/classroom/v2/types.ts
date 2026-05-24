/**
 * Shapes for the redesigned Classroom Today panel.
 *
 * Mirrors the source zip's `ClassroomData` so the design files we
 * copy in keep type-checking. The adapter (EnglishClassroomToday.tsx)
 * is responsible for mapping the live Supabase data into this shape.
 */

export type PulseBucket = "ontrack" | "attn" | "idle";

export interface ClassroomStudent {
  id: string;
  /** Single emoji used as the avatar in pulse rows. */
  emoji: string;
  name?: string;
}

export interface ClassroomStats {
  playsThisWeek: number;
  /** Optional delta vs. previous period. e.g. +4 */
  playsDelta?: number;
  /** 0–100. */
  avgScore: number;
  avgScoreDelta?: number;
  activeStudents: number;
  totalStudents: number;
}

export interface PulseGroup {
  count: number;
  /** First few are rendered as avatars; the rest become a "+N" chip. */
  students: ClassroomStudent[];
}

export interface ClassroomChartPoint {
  /** Pre-formatted axis label, e.g. "May 17". */
  label: string;
  /** 0–100. */
  avgScore: number;
}

export interface ClassroomTodayData {
  stats: ClassroomStats;
  pulse: {
    ontrack: PulseGroup;
    attn: PulseGroup;
    idle: PulseGroup;
  };
  /** 7–30 chronological points. The last point is highlighted as "today". */
  chart: ClassroomChartPoint[];
}

export interface ClassroomTodayStrings {
  stats: {
    plays: string;
    avgScore: string;
    activeStudents: string;
    playsShort: string;
    avgScoreShort: string;
    activeShort: string;
  };
  pulse: {
    ontrack: { label: string; desc: string };
    attn: { label: string; desc: string };
    idle: { label: string; desc: string };
  };
  chart: {
    title: string;
    sub: string;
  };
}
