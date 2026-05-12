/**
 * GradebookView — redesigned around decision-support, not a flat table.
 *
 * Four panes, in order from "tells me what to do" down to "tells me the
 * raw numbers":
 *
 *   1. Class pulse — 3 big gradient cards (On track / Needs attention /
 *      Not playing). One-glance read of who the teacher should focus on.
 *   2. Activity chart — bar chart of per-day class XP for the last
 *      N days. Surfaces engagement dips.
 *   3. Student list — one row per student with inline Reward + Re-assign
 *      buttons. Click a row → drawer expands showing per-mode chart +
 *      per-word mastery heatmap.
 *   4. Per-assignment rollup — existing per-assignment stats, kept for
 *      teachers who want the traditional cross-tab view.
 *
 * Data sources:
 *   - allScores (progress rows) — prop from App.tsx, existing path.
 *   - get_class_mastery RPC — new in 20260509, fetched per selected class.
 *   - get_class_activity RPC — new in 20260510, fetched per class + window.
 *
 * Props contract is preserved; App.tsx doesn't need any changes.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users, Trophy, GraduationCap, ChevronDown, Download, Gift,
  AlertTriangle, CheckCircle2, Moon, Flame, Calendar,
} from "lucide-react";
import TopAppBar from "../components/TopAppBar";
import { HelpTooltip } from "../components/HelpTooltip";
import { supabase, type ProgressData, type AssignmentData, type ClassData } from "../core/supabase";
import type { View } from "../core/views";
import { buildWordIdSubjectMap, getDisplayLabel } from "../data/wordLookup";
import MasteryHeatmap, { type MasteryRow } from "./gradebook/MasteryHeatmap";
import { TeacherRewardModal, type StudentInfo } from "../components/dashboard/TeacherRewardModal";
import StudentProfile from "./classroom/StudentProfile";
import AssignmentDetail from "./classroom/AssignmentDetail";

// ── Types ────────────────────────────────────────────────────────────────────
interface ClassStudent {
  name: string;
  classCode: string;
  lastActive: string;
}

interface GradebookViewProps {
  user: { displayName?: string; avatar?: string } | null;
  allScores: ProgressData[];
  teacherAssignments: AssignmentData[];
  classStudents: ClassStudent[];
  classes: ClassData[];
  expandedStudent: string | null;
  setExpandedStudent: (key: string | null) => void;
  setView: React.Dispatch<React.SetStateAction<View>>;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  /** When true, render without the page-level TopAppBar / outer wrapper.
   *  Used by ClassroomView which provides its own header + tab bar. */
  embedded?: boolean;
  /** Hint about which scroll-anchor to land on. "pulse" = top of the
   *  page (default), "records" = scroll to the records / per-student
   *  table on mount. */
  focus?: "pulse" | "records";
  /** When set, render only the named content sections. Default (omitted)
   *  renders everything — that's the standalone /gradebook route and
   *  the legacy Pulse tab in the 2-tab classroom layout.
   *
   *  Used by the 4-tab classroom v2 to slice this view across tabs:
   *    Today       → ['pulse', 'activity']
   *    Students    → ['students']
   *    Assignments → ['assignments'] */
  sections?: Array<'pulse' | 'activity' | 'students' | 'assignments'>;
  /** When true, hide the CSV-export button. The 4-tab classroom v2
   *  moves export to the Reports tab so it doesn't duplicate. */
  hideExport?: boolean;
  /** When true, tapping a student row opens the StudentProfile drawer
   *  (or fullscreen page on mobile) instead of expanding the row
   *  inline; tapping an assignment row opens AssignmentDetail. The
   *  4-tab classroom uses this on its Students + Assignments tabs for
   *  the plan's adaptive drill pattern. */
  useDrawerDrill?: boolean;
  /** Controlled class selection. When provided, the view reflects this
   *  code and calls `onSelectedClassChange` on changes (e.g. the
   *  4-tab classroom shares class selection across Today / Students /
   *  Assignments). When omitted, the view owns the selection locally
   *  (standalone /gradebook route, legacy Pulse tab). */
  selectedClassCode?: string;
  onSelectedClassChange?: (code: string) => void;
}

interface MasteryApiRow {
  student_uid: string;
  student_name: string;
  avatar: string | null;
  word_id: number;
  mode: string;
  correct_count: number;
  total_count: number;
  last_attempt: string | null;
}

interface ActivityApiRow {
  student_uid: string;
  student_name: string;
  avatar: string | null;
  day: string;  // ISO date
  xp_sum: number;
  plays_count: number;
}

// Per-student rollup keyed for the student table.
interface StudentRollup {
  key: string;          // unique id — prefer auth uid, fall back to name
  studentUid: string | null;
  studentName: string;
  classCode: string;
  avatar: string;
  totalXp: number;
  bestScore: number;
  avgScore: number;
  attempts: number;
  lastDate: string;
  scores: ProgressData[];
  modeBreakdown: Map<string, { attempts: number; avgScore: number }>;
}

type PulseBucket = 'on-track' | 'needs-attention' | 'not-playing';

// ── Helpers ──────────────────────────────────────────────────────────────────
const DAYS_AGO = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const MODE_ICON: Record<string, string> = {
  classic: '📝', spelling: '✍️', flashcards: '🎴', listening: '🎧',
  matching: '🔗', scramble: '🔤', reverse: '🔄', 'true-false': '✓',
  'letter-sounds': '🔡', 'sentence-builder': '🧩',
};

const scoreColor = (score: number): string => {
  if (score >= 90) return 'from-emerald-400 to-emerald-600';
  if (score >= 70) return 'from-sky-400 to-blue-600';
  if (score >= 50) return 'from-amber-400 to-orange-500';
  return 'from-rose-400 to-rose-600';
};

// ── Component ────────────────────────────────────────────────────────────────
export default function GradebookView({
  user,
  allScores,
  teacherAssignments,
  classStudents,
  classes,
  expandedStudent,
  setExpandedStudent,
  setView,
  showToast,
  embedded = false,
  focus = "pulse",
  sections,
  hideExport = false,
  useDrawerDrill = false,
  selectedClassCode: controlledClassCode,
  onSelectedClassChange,
}: GradebookViewProps) {
  void focus; // reserved for future scroll-anchor wiring; kept in
              // the prop signature so callers can plumb intent now
  const showPulse       = !sections || sections.includes('pulse');
  const showActivity    = !sections || sections.includes('activity');
  const showStudents    = !sections || sections.includes('students');
  const showAssignments = !sections || sections.includes('assignments');

  // Drill-mode state (v2 classroom only). Kept local so the inline-
  // expand path is untouched on the standalone /gradebook route.
  const [drillStudent, setDrillStudent] = useState<StudentRollup | null>(null);
  const [drillAssignmentId, setDrillAssignmentId] = useState<string | null>(null);

  // Class selection is controlled when the parent passes it in (4-tab
  // classroom) and uncontrolled otherwise (standalone /gradebook route).
  const [localClassCode, setLocalClassCode] = useState<string>(() =>
    controlledClassCode ?? classes[0]?.code ?? ''
  );
  const selectedClassCode = controlledClassCode ?? localClassCode;
  const setSelectedClassCode = (code: string) => {
    if (onSelectedClassChange) onSelectedClassChange(code);
    else setLocalClassCode(code);
  };
  const [windowDays, setWindowDays] = useState<7 | 14 | 30>(7);

  const [masteryRows, setMasteryRows] = useState<MasteryApiRow[]>([]);
  const [activityRows, setActivityRows] = useState<ActivityApiRow[]>([]);
  const [loadingMastery, setLoadingMastery] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const [rewardStudent, setRewardStudent] = useState<StudentInfo | null>(null);

  // Keep selectedClassCode valid if classes list updates.
  useEffect(() => {
    if (classes.length === 0) return;
    if (!classes.some(c => c.code === selectedClassCode)) {
      setSelectedClassCode(classes[0].code);
    }
  }, [classes, selectedClassCode]);

  // Map of wordId → subject of the assignment that owns it, used to
  // resolve display labels per dot in the MasteryHeatmap.  Without this,
  // Hebrew lemma ids would look up against ALL_WORDS (English) and fall
  // back to "#${id}" tooltips on every dot for Hebrew assignments.
  const wordIdSubjectMap = useMemo(
    () => buildWordIdSubjectMap(teacherAssignments),
    [teacherAssignments],
  );
  const getMasteryLabel = useCallback(
    (wordId: number) =>
      getDisplayLabel(wordId, wordIdSubjectMap.get(wordId) ?? "english"),
    [wordIdSubjectMap],
  );

  // RPC-fetched data, keyed by class.
  useEffect(() => {
    if (!selectedClassCode) return;
    let cancelled = false;
    setLoadingMastery(true);
    supabase
      .rpc('get_class_mastery', { p_class_code: selectedClassCode })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('[Gradebook] get_class_mastery failed:', error);
          showToast(`Couldn't load mastery data: ${error.message}`, 'error');
          setMasteryRows([]);
        } else {
          setMasteryRows((data as MasteryApiRow[]) ?? []);
        }
        setLoadingMastery(false);
      });
    return () => { cancelled = true; };
  }, [selectedClassCode, showToast]);

  useEffect(() => {
    if (!selectedClassCode) return;
    let cancelled = false;
    setLoadingActivity(true);
    supabase
      .rpc('get_class_activity', { p_class_code: selectedClassCode, p_days: windowDays })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('[Gradebook] get_class_activity failed:', error);
          showToast(`Couldn't load activity data: ${error.message}`, 'error');
          setActivityRows([]);
        } else {
          setActivityRows((data as ActivityApiRow[]) ?? []);
        }
        setLoadingActivity(false);
      });
    return () => { cancelled = true; };
  }, [selectedClassCode, windowDays, showToast]);

  // ── Per-student rollup (scoped to selected class) ─────────────────────────
  const studentRollups = useMemo<StudentRollup[]>(() => {
    const bucket = new Map<string, StudentRollup>();
    allScores
      .filter(s => s.classCode === selectedClassCode)
      .forEach(s => {
        const key = s.studentUid || s.studentName;
        if (!bucket.has(key)) {
          bucket.set(key, {
            key,
            studentUid: s.studentUid || null,
            studentName: s.studentName,
            classCode: s.classCode,
            avatar: s.avatar || '🦊',
            totalXp: 0, bestScore: 0, avgScore: 0,
            attempts: 0,
            lastDate: s.completedAt,
            scores: [],
            modeBreakdown: new Map(),
          });
        }
        const r = bucket.get(key)!;
        r.scores.push(s);
        r.totalXp += s.score;
        r.bestScore = Math.max(r.bestScore, s.score);
        r.attempts += 1;
        if (new Date(s.completedAt) > new Date(r.lastDate)) {
          r.lastDate = s.completedAt;
          if (s.avatar) r.avatar = s.avatar;
        }
        const prevMode = r.modeBreakdown.get(s.mode) ?? { attempts: 0, avgScore: 0 };
        const newAttempts = prevMode.attempts + 1;
        const newAvg = Math.round((prevMode.avgScore * prevMode.attempts + s.score) / newAttempts);
        r.modeBreakdown.set(s.mode, { attempts: newAttempts, avgScore: newAvg });
      });
    bucket.forEach(r => {
      r.avgScore = r.attempts > 0 ? Math.round(r.totalXp / r.attempts) : 0;
    });
    return Array.from(bucket.values()).sort(
      (a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime()
    );
  }, [allScores, selectedClassCode]);

  // ── Class pulse classification ────────────────────────────────────────────
  const { onTrack, needsAttention, notPlaying } = useMemo(() => {
    const threeDaysAgo = DAYS_AGO(3).getTime();
    const sevenDaysAgo = DAYS_AGO(7).getTime();

    const strugglingByUid = new Map<string, number>();
    masteryRows.forEach(r => {
      if (r.total_count >= 3 && (r.correct_count / r.total_count) < 0.5) {
        strugglingByUid.set(r.student_uid, (strugglingByUid.get(r.student_uid) ?? 0) + 1);
      }
    });

    const result: Record<PulseBucket, StudentRollup[]> = {
      'on-track': [], 'needs-attention': [], 'not-playing': [],
    };

    const scoredKeys = new Set<string>();
    studentRollups.forEach(r => {
      scoredKeys.add(r.studentName.toLowerCase());
      const last = new Date(r.lastDate).getTime();
      const struggling = r.studentUid ? (strugglingByUid.get(r.studentUid) ?? 0) : 0;
      if (last < sevenDaysAgo) result['not-playing'].push(r);
      else if (r.avgScore < 70 || struggling >= 3) result['needs-attention'].push(r);
      else if (last < threeDaysAgo) result['needs-attention'].push(r);
      else result['on-track'].push(r);
    });

    classStudents
      .filter(s => s.classCode === selectedClassCode)
      .forEach(s => {
        if (!scoredKeys.has(s.name.toLowerCase())) {
          result['not-playing'].push({
            key: `__no_scores_${s.name}`,
            studentUid: null,
            studentName: s.name,
            classCode: s.classCode,
            avatar: '🦊',
            totalXp: 0, bestScore: 0, avgScore: 0, attempts: 0,
            lastDate: s.lastActive,
            scores: [],
            modeBreakdown: new Map(),
          });
        }
      });

    return {
      onTrack: result['on-track'],
      needsAttention: result['needs-attention'],
      notPlaying: result['not-playing'],
    };
  }, [studentRollups, masteryRows, classStudents, selectedClassCode]);

  // ── Activity aggregation per-day for the bar chart ────────────────────────
  const activityByDay = useMemo(() => {
    const byDay = new Map<string, number>();
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = DAYS_AGO(i);
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, 0);
    }
    activityRows.forEach(r => {
      if (byDay.has(r.day)) byDay.set(r.day, byDay.get(r.day)! + r.xp_sum);
    });
    const entries = Array.from(byDay.entries()).map(([day, xp]) => ({ day, xp }));
    const maxXp = Math.max(1, ...entries.map(e => e.xp));
    return { entries, maxXp };
  }, [activityRows, windowDays]);

  // ── Per-assignment rollup ─────────────────────────────────────────────────
  const assignmentRollups = useMemo(() => {
    const byAssignment = new Map<string, {
      assignmentId: string;
      title: string;
      attempts: number;
      avgScore: number;
      uniqueStudents: Set<string>;
    }>();
    allScores
      .filter(s => s.classCode === selectedClassCode)
      .forEach(s => {
        if (!byAssignment.has(s.assignmentId)) {
          const title = teacherAssignments.find(a => a.id === s.assignmentId)?.title ?? 'Quick Play';
          byAssignment.set(s.assignmentId, {
            assignmentId: s.assignmentId,
            title,
            attempts: 0, avgScore: 0,
            uniqueStudents: new Set(),
          });
        }
        const r = byAssignment.get(s.assignmentId)!;
        r.avgScore = Math.round((r.avgScore * r.attempts + s.score) / (r.attempts + 1));
        r.attempts += 1;
        r.uniqueStudents.add(s.studentUid || s.studentName);
      });
    return Array.from(byAssignment.values()).sort((a, b) => b.attempts - a.attempts);
  }, [allScores, selectedClassCode, teacherAssignments]);

  // ── CSV export with per-word mastery hints ────────────────────────────────
  const handleExportCsv = () => {
    const header = ['Student', 'Class', 'Assignment', 'Mode', 'Score', 'Mistakes', 'Date'];
    const rows: string[][] = [header];
    studentRollups.forEach(r => {
      r.scores.forEach(s => {
        const assignmentTitle = teacherAssignments.find(a => a.id === s.assignmentId)?.title ?? 'Quick Play';
        rows.push([
          r.studentName,
          r.classCode,
          assignmentTitle,
          s.mode,
          String(s.score),
          String(s.mistakes?.length ?? 0),
          new Date(s.completedAt).toLocaleDateString(),
        ]);
      });
    });
    rows.push([]);
    rows.push(['Student', 'Mastered words', 'Shaky words', 'Struggling words', 'Attempts']);
    const masteryByUid = new Map<string, { g: number; a: number; r: number; attempts: number }>();
    masteryRows.forEach(row => {
      const key = row.student_uid;
      const prev = masteryByUid.get(key) ?? { g: 0, a: 0, r: 0, attempts: 0 };
      prev.attempts += row.total_count;
      if (row.total_count > 0) {
        const acc = row.correct_count / row.total_count;
        if (acc >= 0.8) prev.g += 1;
        else if (acc >= 0.5) prev.a += 1;
        else prev.r += 1;
      }
      masteryByUid.set(key, prev);
    });
    studentRollups.forEach(r => {
      const m = r.studentUid ? masteryByUid.get(r.studentUid) : null;
      rows.push([
        r.studentName,
        String(m?.g ?? 0),
        String(m?.a ?? 0),
        String(m?.r ?? 0),
        String(m?.attempts ?? 0),
      ]);
    });

    const csv = rows.map(r =>
      r.map(cell => `"${(cell ?? '').toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    // BOM prefix so Excel (Windows) reads as UTF-8 instead of CP-1252,
    // which would otherwise turn Hebrew + Arabic names into mojibake.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocaband-gradebook-${selectedClassCode || 'class'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Gradebook exported as CSV!', 'success');
  };

  const openRewardFor = (r: StudentRollup) => {
    if (!r.studentUid) {
      showToast(`${r.studentName} has no account yet — can't receive rewards.`, 'error');
      return;
    }
    setRewardStudent({
      uid: r.studentUid,
      name: r.studentName,
      avatar: r.avatar,
      xp: r.totalXp,
    });
  };

  const selectedClassName = classes.find(c => c.code === selectedClassCode)?.name ?? selectedClassCode;

  return (
    <div className={embedded ? "pb-8" : "min-h-screen bg-background pb-8"}>
      {!embedded && (
        <TopAppBar
          title="Gradebook"
          subtitle="PROGRESS · DECISION SUPPORT"
          showBack
          onBack={() => setView('teacher-dashboard')}
          userName={user?.displayName}
          userAvatar={user?.avatar}
          onLogout={() => supabase.auth.signOut()}
        />
      )}

      <main id="main-content" className={`${embedded ? 'pt-4' : 'pt-36 sm:pt-32'} px-4 sm:px-6 max-w-5xl mx-auto`}>
        {/* Class + window selectors — the class picker is the primary
            control on this page (everything else is scoped to it), so
            it gets a branded gradient treatment that catches the eye
            rather than reading as a neutral utility pill. */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <label className="group relative inline-flex items-center gap-2.5 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white rounded-2xl pl-3 pr-2 py-2.5 shadow-lg shadow-indigo-500/20 ring-1 ring-white/10 hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <GraduationCap size={16} className="text-white" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80 leading-none">Class</span>
              <select
                value={selectedClassCode}
                onChange={e => setSelectedClassCode(e.target.value)}
                aria-label="Select class"
                className="bg-transparent text-sm font-black text-white focus:outline-none cursor-pointer pr-6 mt-0.5"
                style={{
                  // Force the native caret to render white against the
                  // dark gradient — by default browsers draw it black.
                  colorScheme: 'dark',
                }}
              >
                {classes.map(c => (
                  <option key={c.code} value={c.code} className="text-[var(--vb-text-primary)]">{c.name} · {c.code}</option>
                ))}
              </select>
            </div>
          </label>
          <div className="flex items-center gap-1 bg-[var(--vb-surface)] rounded-xl px-1 py-1 shadow-sm border border-[var(--vb-border)]">
            {[7, 14, 30].map(n => (
              <button
                key={n}
                onClick={() => setWindowDays(n as 7 | 14 | 30)}
                type="button"
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                  windowDays === n
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-[var(--vb-text-muted)] hover:bg-[var(--vb-surface)]'
                }`}
              >
                {n}d
              </button>
            ))}
          </div>
          {!hideExport && (
            <div className="ml-auto">
              <button
                onClick={handleExportCsv}
                type="button"
                style={{ backgroundColor: 'var(--vb-accent)', color: 'var(--vb-accent-text)' }}
                className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-colors shadow-sm"
              >
                <Download size={14} />
                Export CSV
              </button>
            </div>
          )}
        </div>

        {/* ── 1. CLASS PULSE ─────────────────────────────────────────────── */}
        {showPulse && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <PulseCard
            kind="on-track"
            students={onTrack}
            title="On track"
            subtitle="≥70% and active this week"
            icon={<CheckCircle2 size={22} />}
          />
          <PulseCard
            kind="needs-attention"
            students={needsAttention}
            title="Needs attention"
            subtitle="Low scores or stuck on specific words"
            icon={<AlertTriangle size={22} />}
          />
          <PulseCard
            kind="not-playing"
            students={notPlaying}
            title="Not playing"
            subtitle="No activity in 7+ days"
            icon={<Moon size={22} />}
          />
        </div>
        )}

        {/* ── 2. ACTIVITY CHART ──────────────────────────────────────────── */}
        {showActivity && (
        <div className="bg-[var(--vb-surface)] rounded-2xl p-5 shadow-sm border border-[var(--vb-border)] mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-[var(--vb-text-primary)] flex items-center gap-2">
                <Calendar size={16} className="text-indigo-500" />
                Class activity
                <HelpTooltip content="Total XP earned by all students per day." />
              </h3>
              <p className="text-xs text-[var(--vb-text-muted)] font-medium mt-0.5">
                Last {windowDays} days · {selectedClassName}
                {loadingActivity && ' · loading…'}
              </p>
            </div>
          </div>
          <div className="flex items-end gap-1 h-28">
            {activityByDay.entries.map(({ day, xp }) => {
              const h = Math.max(2, Math.round((xp / activityByDay.maxXp) * 100));
              const d = new Date(day);
              const isToday = day === new Date().toISOString().slice(0, 10);
              return (
                <div key={day} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.4, delay: 0.01 }}
                    title={`${d.toLocaleDateString()} · ${xp} XP`}
                    className={`w-full rounded-t ${
                      xp === 0
                        ? 'bg-[var(--vb-surface-alt)]'
                        : isToday
                          ? 'bg-gradient-to-t from-indigo-500 to-violet-400'
                          : 'bg-gradient-to-t from-emerald-400 to-emerald-300'
                    }`}
                  />
                  <span className="text-[9px] text-[var(--vb-text-muted)] font-bold">{d.getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* ── 3. STUDENT LIST ────────────────────────────────────────────── */}
        {showStudents && (
        <div className="bg-[var(--vb-surface)] rounded-2xl p-4 sm:p-5 shadow-sm border border-[var(--vb-border)] mb-6">
          <h3 className="text-base font-black text-[var(--vb-text-primary)] mb-4 flex items-center gap-2">
            <Users size={16} className="text-violet-500" />
            Students
            <span className="text-xs font-bold text-[var(--vb-text-muted)]">· {studentRollups.length}</span>
          </h3>
          {studentRollups.length === 0 ? (
            <div className="text-center py-10 text-[var(--vb-text-muted)] text-sm">
              No students have played yet in this class.
            </div>
          ) : (
            <div className="space-y-2">
              {studentRollups.map(r => {
                const isExpanded = expandedStudent === r.key;
                const studentMasteryRows: MasteryRow[] = masteryRows
                  .filter(m => m.student_uid === r.studentUid)
                  .map(m => ({
                    wordId: m.word_id,
                    correctCount: m.correct_count,
                    totalCount: m.total_count,
                    lastAttempt: m.last_attempt,
                  }));
                return (
                  <div
                    key={r.key}
                    className="rounded-xl border border-[var(--vb-border)] bg-white/40 hover:bg-[var(--vb-surface)] transition-colors overflow-hidden"
                  >
                    <div className="flex items-center gap-3 p-3 sm:p-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (useDrawerDrill) {
                            setDrillStudent(r);
                          } else {
                            setExpandedStudent(isExpanded ? null : r.key);
                          }
                        }}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <span className="text-2xl shrink-0">{r.avatar}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-[var(--vb-text-primary)] truncate">{r.studentName}</p>
                          <p className="text-xs text-[var(--vb-text-muted)] font-medium">
                            {r.attempts} {r.attempts === 1 ? 'play' : 'plays'}
                            {r.lastDate && ` · last ${new Date(r.lastDate).toLocaleDateString()}`}
                          </p>
                        </div>
                      </button>
                      <div className={`hidden sm:flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br text-white font-black ${scoreColor(r.avgScore)}`}>
                        {r.avgScore}
                      </div>
                      <button
                        type="button"
                        onClick={() => openRewardFor(r)}
                        title="Reward"
                        aria-label={`Reward ${r.studentName}`}
                        className="p-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 transition-colors"
                      >
                        <Gift size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (useDrawerDrill) {
                            setDrillStudent(r);
                          } else {
                            setExpandedStudent(isExpanded ? null : r.key);
                          }
                        }}
                        aria-label="Toggle details"
                        className="p-1"
                      >
                        <ChevronDown
                          size={18}
                          className={`text-[var(--vb-text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {isExpanded && !useDrawerDrill && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 sm:px-4 pb-4 space-y-4 border-t border-[var(--vb-border)] pt-3">
                            <div>
                              <h4 className="text-xs font-black uppercase tracking-widest text-[var(--vb-text-muted)] mb-2">
                                Per mode
                              </h4>
                              {r.modeBreakdown.size === 0 ? (
                                <p className="text-sm text-[var(--vb-text-muted)] italic">No mode data yet.</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {Array.from(r.modeBreakdown.entries())
                                    .sort((a, b) => b[1].attempts - a[1].attempts)
                                    .map(([mode, stats]) => (
                                      <div key={mode} className="flex items-center gap-2 text-xs">
                                        <span className="w-6">{MODE_ICON[mode] ?? '🎯'}</span>
                                        <span className="w-24 font-semibold text-[var(--vb-text-secondary)] capitalize truncate">{mode}</span>
                                        <div className="flex-1 h-3 bg-[var(--vb-surface-alt)] rounded-full overflow-hidden">
                                          <div
                                            className={`h-full bg-gradient-to-r ${scoreColor(stats.avgScore)}`}
                                            style={{ width: `${Math.min(100, stats.avgScore)}%` }}
                                          />
                                        </div>
                                        <span className="w-14 text-right font-black text-[var(--vb-text-secondary)]">{stats.avgScore}</span>
                                        <span className="w-12 text-right text-[var(--vb-text-muted)]">×{stats.attempts}</span>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>

                            <div>
                              <h4 className="text-xs font-black uppercase tracking-widest text-[var(--vb-text-muted)] mb-2">
                                Word mastery
                                {loadingMastery && ' · loading…'}
                              </h4>
                              <MasteryHeatmap rows={studentMasteryRows} getLabel={getMasteryLabel} />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}

        {/* ── 4. PER-ASSIGNMENT rollup ───────────────────────────────────── */}
        {showAssignments && assignmentRollups.length > 0 && (
          <div className="bg-[var(--vb-surface)] rounded-2xl p-5 shadow-sm border border-[var(--vb-border)]">
            <h3 className="text-base font-black text-[var(--vb-text-primary)] mb-4 flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" />
              Assignments
              <span className="text-xs font-bold text-[var(--vb-text-muted)]">· {assignmentRollups.length}</span>
            </h3>
            <div className="space-y-2">
              {assignmentRollups.map(a => {
                const RowInner = (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-bold text-[var(--vb-text-primary)] truncate">{a.title}</p>
                      <p className="text-xs text-[var(--vb-text-muted)]">
                        {a.uniqueStudents.size} student{a.uniqueStudents.size === 1 ? '' : 's'} · {a.attempts} play{a.attempts === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className={`px-3 py-1.5 rounded-lg bg-gradient-to-br text-white font-black text-sm ${scoreColor(a.avgScore)}`}>
                      {a.avgScore}
                    </div>
                  </>
                );
                return useDrawerDrill ? (
                  <button
                    key={a.assignmentId}
                    type="button"
                    onClick={() => setDrillAssignmentId(a.assignmentId)}
                    className="w-full flex items-center gap-3 p-3 bg-white/40 hover:bg-[var(--vb-surface-alt)]/60 rounded-xl transition-colors"
                    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as never }}
                  >
                    {RowInner}
                    <ChevronDown size={16} className="text-[var(--vb-border)] -rotate-90 shrink-0" aria-hidden />
                  </button>
                ) : (
                  <div
                    key={a.assignmentId}
                    className="flex items-center gap-3 p-3 bg-white/40 rounded-xl"
                  >
                    {RowInner}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <TeacherRewardModal
        student={rewardStudent}
        onClose={() => setRewardStudent(null)}
        onRewardGiven={() => showToast('Reward sent!', 'success')}
        showToast={(msg, type) => showToast(msg, type)}
      />

      {/* v2 Classroom drill drawers — only active when useDrawerDrill is
          true. The StudentProfile / AssignmentDetail components render
          nothing when their `open` is false, so they're cheap to mount. */}
      {useDrawerDrill && (
        <>
          <StudentProfile
            open={!!drillStudent}
            onClose={() => setDrillStudent(null)}
            student={drillStudent && {
              uid: drillStudent.studentUid,
              name: drillStudent.studentName,
              avatar: drillStudent.avatar,
              classCode: drillStudent.classCode,
            }}
            scores={drillStudent?.scores ?? []}
            masteryRows={
              drillStudent
                ? masteryRows
                    .filter(m => m.student_uid === drillStudent.studentUid)
                    .map(m => ({
                      wordId: m.word_id,
                      correctCount: m.correct_count,
                      totalCount: m.total_count,
                      lastAttempt: m.last_attempt,
                    }))
                : []
            }
            teacherAssignments={teacherAssignments}
            onReward={
              drillStudent
                ? () => openRewardFor(drillStudent)
                : undefined
            }
          />
          <AssignmentDetail
            open={!!drillAssignmentId}
            onClose={() => setDrillAssignmentId(null)}
            assignment={
              drillAssignmentId
                ? {
                    id: drillAssignmentId,
                    title:
                      teacherAssignments.find(a => a.id === drillAssignmentId)?.title
                      ?? 'Quick Play',
                    classCode: selectedClassCode,
                  }
                : null
            }
            scores={allScores.filter(
              s => s.assignmentId === drillAssignmentId && s.classCode === selectedClassCode
            )}
            classStudents={classStudents}
            onReassign={(names) => {
              showToast(
                `Reassign flow coming next: ${names.length} student${names.length === 1 ? '' : 's'} flagged.`,
                'info'
              );
            }}
          />
        </>
      )}
    </div>
  );
}

// ── Pulse card — one of the 3 decision cards at the top ──────────────────────
function PulseCard({
  kind, students, title, subtitle, icon,
}: {
  kind: PulseBucket;
  students: StudentRollup[];
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  const styles: Record<PulseBucket, { bg: string; ring: string; glow: string }> = {
    'on-track':        { bg: 'from-emerald-500 to-teal-600', ring: 'ring-emerald-200', glow: 'shadow-emerald-500/30' },
    'needs-attention': { bg: 'from-amber-500 to-orange-600', ring: 'ring-amber-200',   glow: 'shadow-amber-500/30' },
    'not-playing':     { bg: 'from-stone-500 to-stone-700',  ring: 'ring-stone-200',   glow: 'shadow-stone-500/20' },
  };
  const s = styles[kind];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={`relative rounded-2xl p-4 sm:p-5 bg-gradient-to-br ${s.bg} text-white shadow-xl ${s.glow} ring-1 ${s.ring}/40`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black leading-none">{students.length}</span>
            <span className="text-sm font-black opacity-90">{title}</span>
          </div>
          <p className="text-[11px] opacity-80 mt-1 leading-snug">{subtitle}</p>
        </div>
      </div>
      {students.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {students.slice(0, 8).map((st, i) => (
            <span
              key={i}
              title={st.studentName}
              className="text-lg w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
            >
              {st.avatar}
            </span>
          ))}
          {students.length > 8 && (
            <span className="text-xs font-black w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              +{students.length - 8}
            </span>
          )}
        </div>
      )}
      {kind === 'on-track' && students.length > 0 && (
        <div className="mt-2 flex items-center gap-1 text-[11px] opacity-95 font-bold">
          <Flame size={12} /> Strong engagement
        </div>
      )}
    </motion.div>
  );
}
