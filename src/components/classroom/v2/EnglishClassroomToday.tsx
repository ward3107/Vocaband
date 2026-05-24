import { useMemo } from "react";
import type { ProgressData } from "../../../core/supabase";
import { useLanguage } from "../../../hooks/useLanguage";
import { classroomTodayT } from "../../../locales/teacher/classroomToday";
import ActivityChart from "./ActivityChart";
import PulseCard from "./PulseCard";
import StatCard from "./StatCard";
import type {
  ClassroomStudent,
  ClassroomTodayData,
} from "./types";

interface ClassStudent {
  name: string;
  classCode: string;
  lastActive: string;
}

interface EnglishClassroomTodayProps {
  classCode: string;
  allScores: ProgressData[];
  classStudents: ClassStudent[];
  mobile?: boolean;
  /** Drill-into-roster handler.  When wired, each pulse card is
   *  clickable and calls this with the bucket id.  Optional — when
   *  omitted the cards stay non-interactive (read-only summary). */
  onPulseClick?: (bucket: "ontrack" | "attn" | "idle") => void;
}

// Deterministic emoji for a student's avatar in the pulse roster
// — the data model doesn't carry per-student emojis so we hash the
// name to a stable choice.  Keeps the same student visually
// recognisable across renders even if their position changes.
const AVATAR_POOL = [
  "🐯", "🦄", "🌱", "🐼", "🦊", "🐳", "🐝", "🍓",
  "🎨", "🚀", "⭐", "🦋", "🌈", "🎈", "🐙", "🐢",
  "🦉", "🐧", "🐨",
];

function emojiForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_POOL[Math.abs(hash) % AVATAR_POOL.length];
}

/**
 * Today-panel adapter: takes the same Supabase-backed data the
 * existing ClassroomView already loads and projects it into the
 * redesigned `ClassroomTodayData` shape, then renders the new
 * StatCard / PulseCard / ActivityChart trio.
 *
 * Rendered ADDITIVELY above the existing v2 Today content so the
 * teacher can see both at once during phased rollout.  English path
 * only — gated by the caller (ClassroomView).
 */
export default function EnglishClassroomToday({
  classCode,
  allScores,
  classStudents,
  mobile = false,
  onPulseClick,
}: EnglishClassroomTodayProps) {
  const { language } = useLanguage();
  const t = classroomTodayT[language];

  const data: ClassroomTodayData = useMemo(() => {
    const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const classScores = allScores.filter((s) => s.classCode === classCode);
    const roster = classStudents.filter((cs) => cs.classCode === classCode);

    // Stat row
    const weekScores = classScores.filter(
      (s) => new Date(s.completedAt).getTime() >= sevenDaysAgoMs,
    );
    const playsThisWeek = weekScores.length;
    const avgScore =
      weekScores.length === 0
        ? 0
        : Math.round(
            weekScores.reduce((sum, s) => sum + s.score, 0) /
              weekScores.length,
          );
    const activeStudentNames = new Set(
      weekScores.map((s) => s.studentName.trim().toLowerCase()),
    );
    const activeStudents = activeStudentNames.size;
    const totalStudents = roster.length;

    // Per-student bucketing.  Idle is hard-coded at "no plays in the
    // last 7 days"; attn/ontrack split on a 70% recent-avg threshold
    // (matches the desc copy "≥70% and active this week").
    const ontrack: ClassroomStudent[] = [];
    const attn: ClassroomStudent[] = [];
    const idle: ClassroomStudent[] = [];

    for (const student of roster) {
      const key = student.name.trim().toLowerCase();
      const studentScores = classScores.filter(
        (s) => s.studentName.trim().toLowerCase() === key,
      );
      const lastTs =
        studentScores.length === 0
          ? 0
          : Math.max(
              ...studentScores.map((s) => new Date(s.completedAt).getTime()),
            );
      const isIdle = lastTs < sevenDaysAgoMs;

      const cs: ClassroomStudent = {
        id: student.name,
        emoji: emojiForName(student.name),
        name: student.name,
      };

      if (isIdle) {
        idle.push(cs);
      } else {
        const recent = studentScores.filter(
          (s) => new Date(s.completedAt).getTime() >= sevenDaysAgoMs,
        );
        const studentAvg =
          recent.length === 0
            ? 0
            : recent.reduce((sum, s) => sum + s.score, 0) / recent.length;
        if (studentAvg >= 70) ontrack.push(cs);
        else attn.push(cs);
      }
    }

    // 7-day chart, oldest → today.  Empty days render as 0% (visible
    // dip in the line) rather than NaN; the chart card subtitle warns
    // teachers that gaps mean "no plays that day".
    const chart = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dayScores = classScores.filter((s) => {
        const ts = new Date(s.completedAt).getTime();
        return ts >= dayStart.getTime() && ts < dayEnd.getTime();
      });
      const dayAvg =
        dayScores.length === 0
          ? 0
          : Math.round(
              dayScores.reduce((sum, s) => sum + s.score, 0) /
                dayScores.length,
            );
      chart.push({
        label:
          i === 0
            ? "Today"
            : dayStart.toLocaleDateString(language === "he" ? "he-IL" : language === "ar" ? "ar-EG" : "en-US", {
                month: "short",
                day: "numeric",
              }),
        avgScore: dayAvg,
      });
    }

    return {
      stats: { playsThisWeek, avgScore, activeStudents, totalStudents },
      pulse: {
        ontrack: { count: ontrack.length, students: ontrack },
        attn: { count: attn.length, students: attn },
        idle: { count: idle.length, students: idle },
      },
      chart,
    };
  }, [allScores, classStudents, classCode, language]);

  const { stats, pulse, chart } = data;
  const formatDelta = (n?: number) =>
    typeof n === "number"
      ? `${n > 0 ? "↑" : n < 0 ? "↓" : ""} ${Math.abs(n)}`
      : undefined;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard
          label={mobile ? t.stats.playsShort : t.stats.plays}
          value={stats.playsThisWeek}
          trailing={formatDelta(stats.playsDelta)}
        />
        <StatCard
          label={mobile ? t.stats.avgScoreShort : t.stats.avgScore}
          value={`${stats.avgScore}%`}
          trailing={formatDelta(stats.avgScoreDelta)}
        />
        <StatCard
          label={mobile ? t.stats.activeShort : t.stats.activeStudents}
          value={stats.activeStudents}
          trailing={mobile ? undefined : `/ ${stats.totalStudents}`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <PulseCard
          bucket="ontrack"
          glyph="✓"
          count={pulse.ontrack.count}
          label={t.pulse.ontrack.label}
          desc={t.pulse.ontrack.desc}
          students={pulse.ontrack.students}
          hideRoster={mobile}
          onClick={onPulseClick ? () => onPulseClick("ontrack") : undefined}
        />
        <PulseCard
          bucket="attn"
          glyph="!"
          count={pulse.attn.count}
          label={t.pulse.attn.label}
          desc={t.pulse.attn.desc}
          students={pulse.attn.students}
          hideRoster={mobile}
          onClick={onPulseClick ? () => onPulseClick("attn") : undefined}
        />
        <PulseCard
          bucket="idle"
          glyph="◐"
          count={pulse.idle.count}
          label={t.pulse.idle.label}
          desc={t.pulse.idle.desc}
          students={pulse.idle.students}
          hideRoster={mobile}
          onClick={onPulseClick ? () => onPulseClick("idle") : undefined}
        />
      </div>

      {!mobile && (
        <ActivityChart
          points={chart}
          title={t.chart.title}
          sub={t.chart.sub}
        />
      )}
    </div>
  );
}
