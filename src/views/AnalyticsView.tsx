import { useState, useMemo } from "react";
import {
  BarChart3,
  Users,
  RefreshCw,
  TrendingUp,
  BookOpen,
  Layers,
  AlertTriangle,
  X,
  ChevronRight,
  History,
} from "lucide-react";
import { ALL_WORDS } from "../data/vocabulary";
import { supabase, type AppUser, type ClassData, type AssignmentData, type ProgressData } from "../core/supabase";
import TopAppBar from "../components/TopAppBar";

interface AnalyticsViewProps {
  user: AppUser | null;
  allScores: ProgressData[];
  teacherAssignments: AssignmentData[];
  classes: ClassData[];
  setView: (view: string) => void;
}

const toScoreHeightClass = (score: number) => {
  if (score < 25) return "h-1/4";
  if (score < 50) return "h-2/4";
  if (score < 75) return "h-3/4";
  return "h-full";
};

const AnalyticsView = ({ user, allScores, teacherAssignments, classes, setView }: AnalyticsViewProps) => {
  const [analyticsClassFilter, setAnalyticsClassFilter] = useState<string>("all");
  const [selectedScore, setSelectedScore] = useState<ProgressData | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  // Matrix data for Student × Assignment view
  const matrixData = useMemo(() => {
    const studentMap = new Map<string, ProgressData[]>();
    const assignmentSet = new Set<string>();

    allScores.forEach(s => {
      if (!studentMap.has(s.studentName)) {
        studentMap.set(s.studentName, []);
      }
      studentMap.get(s.studentName)!.push(s);
      assignmentSet.add(s.assignmentId);
    });

    const students = Array.from(studentMap.keys()).sort();
    const assignments = Array.from(assignmentSet).sort();

    const getStudentClassCode = (studentName: string): string => {
      const scores = studentMap.get(studentName);
      return scores?.[0]?.classCode || "";
    };

    const getStudentAvatar = (studentName: string): string | undefined => {
      const scores = studentMap.get(studentName);
      return scores?.find(s => s.avatar)?.avatar;
    };

    const matrix: Map<string, Map<string, ProgressData>> = new Map();
    const averages: Map<string, number> = new Map();

    students.forEach(student => {
      matrix.set(student, new Map());
      const studentScores = studentMap.get(student)!;
      const avgScore = studentScores.reduce((sum, s) => sum + s.score, 0) / studentScores.length;
      averages.set(student, Math.round(avgScore));

      assignments.forEach(assignmentId => {
        const assignmentScores = studentScores.filter(s => s.assignmentId === assignmentId);
        if (assignmentScores.length > 0) {
          assignmentScores.sort((a, b) =>
            new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
          );
          matrix.get(student)!.set(assignmentId, assignmentScores[0]);
        }
      });
    });

    const assignmentTitleMap = new Map<string, string>();
    teacherAssignments.forEach(a => assignmentTitleMap.set(a.id, a.title));
    const getAssignmentTitle = (id: string) => assignmentTitleMap.get(id) || id.slice(0, 8) + '…';

    return { students, assignments, matrix, averages, studentMap, getStudentClassCode, getStudentAvatar, getAssignmentTitle };
  }, [allScores, teacherAssignments]);

  // Per-class analytics computed from allScores
  const classAnalytics = useMemo(() => {
    const filteredScores = analyticsClassFilter === "all"
      ? allScores
      : allScores.filter(s => s.classCode === analyticsClassFilter);

    if (filteredScores.length === 0) return null;

    const distribution = { excellent: 0, good: 0, needsWork: 0 };
    filteredScores.forEach(s => {
      if (s.score >= 90) distribution.excellent++;
      else if (s.score >= 70) distribution.good++;
      else distribution.needsWork++;
    });

    const modeCount: Record<string, number> = {};
    filteredScores.forEach(s => {
      modeCount[s.mode] = (modeCount[s.mode] || 0) + 1;
    });
    const topModes = Object.entries(modeCount).sort((a, b) => b[1] - a[1]);
    const maxModeCount = topModes.length > 0 ? topModes[0][1] : 1;

    const weekMap: Record<string, { count: number; totalScore: number }> = {};
    filteredScores.forEach(s => {
      const d = new Date(s.completedAt);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const weekKey = monday.toISOString().slice(0, 10);
      if (!weekMap[weekKey]) weekMap[weekKey] = { count: 0, totalScore: 0 };
      weekMap[weekKey].count++;
      weekMap[weekKey].totalScore += s.score;
    });
    const weeklyActivity = Object.entries(weekMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12);
    const maxWeekCount = Math.max(...weeklyActivity.map(([, v]) => v.count), 1);

    const mistakeCounts: Record<number, number> = {};
    filteredScores.forEach(s => {
      s.mistakes?.forEach(wordId => {
        mistakeCounts[wordId] = (mistakeCounts[wordId] || 0) + 1;
      });
    });
    const topMistakes = Object.entries(mistakeCounts)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 8)
      .map(([wordId, count]) => ({ wordId: parseInt(wordId), count }));
    const maxMistakeCount = topMistakes.length > 0 ? topMistakes[0].count : 1;

    const uniqueStudents = new Set(filteredScores.map(s => s.studentUid || s.studentName));
    const avgScore = Math.round(filteredScores.reduce((sum, s) => sum + s.score, 0) / filteredScores.length);

    const assignmentStudents: Record<string, Set<string>> = {};
    filteredScores.forEach(s => {
      if (!assignmentStudents[s.assignmentId]) assignmentStudents[s.assignmentId] = new Set();
      assignmentStudents[s.assignmentId].add(s.studentName);
    });

    return {
      totalAttempts: filteredScores.length,
      uniqueStudents: uniqueStudents.size,
      avgScore,
      distribution,
      topModes,
      maxModeCount,
      weeklyActivity,
      maxWeekCount,
      topMistakes,
      maxMistakeCount,
      assignmentStudents,
    };
  }, [allScores, analyticsClassFilter]);

  return (
    <div className="min-h-screen bg-background pb-8">
      <TopAppBar
        title="Analytics"
        subtitle="CLASSROOM INSIGHTS & PERFORMANCE"
        showBack
        onBack={() => setView("teacher-dashboard")}
        userName={user?.displayName}
        userAvatar={user?.avatar}
        onLogout={() => supabase.auth.signOut()}
      />

      <main className="pt-24 px-6 max-w-7xl mx-auto">
        {/* Class Filter Tabs */}
        {classes.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setAnalyticsClassFilter("all")}
              className={`px-5 py-2.5 rounded-full text-sm font-black transition-all ${
                analyticsClassFilter === "all"
                  ? "bg-secondary text-white shadow-lg shadow-purple-500/20"
                  : "bg-surface-container-lowest text-on-surface hover:bg-surface-container border-2 border-surface-container"
              }`}
            >
              All Classes
            </button>
            {classes.map(c => (
              <button
                key={c.code}
                onClick={() => setAnalyticsClassFilter(c.code)}
                className={`px-5 py-2.5 rounded-full text-sm font-black transition-all ${
                  analyticsClassFilter === c.code
                    ? "bg-secondary text-white shadow-lg shadow-purple-500/20"
                    : "bg-surface-container-lowest text-on-surface hover:bg-surface-container border-2 border-surface-container"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {allScores.length === 0 ? (
          <div className="bg-surface-container-lowest p-12 rounded-xl shadow-xl text-center border-2 border-blue-50">
            <BarChart3 className="mx-auto text-on-surface-variant mb-4" size={48} />
            <p className="text-on-surface-variant font-medium">No student data yet. Analytics will appear once students complete assignments.</p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xl border-2 border-purple-50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Users className="text-secondary" size={20} />
                  </div>
                </div>
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Students</p>
                <p className="text-3xl font-black text-on-surface">{classAnalytics?.uniqueStudents ?? 0}</p>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xl border-2 border-blue-50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <RefreshCw className="text-primary" size={20} />
                  </div>
                </div>
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Attempts</p>
                <p className="text-3xl font-black text-on-surface">{classAnalytics?.totalAttempts ?? 0}</p>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xl border-2 border-emerald-50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <TrendingUp className="text-emerald-600" size={20} />
                  </div>
                </div>
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Avg Score</p>
                <p className="text-3xl font-black text-primary">{classAnalytics?.avgScore ?? 0}%</p>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xl border-2 border-amber-50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <BookOpen className="text-tertiary" size={20} />
                  </div>
                </div>
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Assignments</p>
                <p className="text-3xl font-black text-on-surface">{matrixData.assignments.length}</p>
              </div>
            </div>

            {/* Charts Row */}
            {classAnalytics && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                {/* Score Distribution Chart */}
                <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xl border-2 border-purple-50">
                  <h3 className="font-black text-on-surface mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center">
                      <BarChart3 className="text-secondary" size={16} />
                    </div>
                    Score Distribution
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: "Excellent (90%+)", count: classAnalytics.distribution.excellent, color: "bg-emerald-400", textColor: "text-emerald-700" },
                      { label: "Good (70-89%)", count: classAnalytics.distribution.good, color: "bg-blue-400", textColor: "text-blue-700" },
                      { label: "Needs Work (<70%)", count: classAnalytics.distribution.needsWork, color: "bg-rose-400", textColor: "text-rose-700" },
                    ].map(({ label, count, color, textColor }) => {
                      const total = classAnalytics.totalAttempts;
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-on-surface-variant font-bold">{label}</span>
                            <span className={`font-black ${textColor}`}>{count} ({pct}%)</span>
                          </div>
                          <div className="h-4 bg-surface-container rounded-full overflow-hidden">
                            <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Game Mode Usage */}
                <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xl border-2 border-purple-50">
                  <h3 className="font-black text-on-surface mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center">
                      <Layers className="text-secondary" size={16} />
                    </div>
                    Game Mode Usage
                  </h3>
                  <div className="space-y-2">
                    {classAnalytics.topModes.slice(0, 6).map(([mode, count]) => {
                      const pct = Math.round((count / classAnalytics.maxModeCount) * 100);
                      return (
                        <div key={mode} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-on-surface-variant w-24 truncate capitalize">{mode.replace(/-/g, ' ')}</span>
                          <div className="flex-1 h-5 bg-surface-container rounded-full overflow-hidden">
                            <div className="h-full bg-secondary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-black text-on-surface w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Weekly Activity Chart */}
                <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xl border-2 border-purple-50">
                  <h3 className="font-black text-on-surface mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <TrendingUp className="text-emerald-600" size={16} />
                    </div>
                    Weekly Activity
                  </h3>
                  {classAnalytics.weeklyActivity.length > 0 ? (
                    <div className="flex items-end gap-1 h-32">
                      {classAnalytics.weeklyActivity.map(([week, data]) => {
                        const heightPct = Math.round((data.count / classAnalytics.maxWeekCount) * 100);
                        const avgPct = Math.round(data.totalScore / data.count);
                        return (
                          <div key={week} className="flex-1 flex flex-col items-center gap-1 group relative">
                            <div
                              className={`w-full rounded-t-md transition-all ${avgPct >= 90 ? "bg-emerald-400" : avgPct >= 70 ? "bg-primary" : "bg-rose-400"}`}
                              style={{ height: `${Math.max(heightPct, 8)}%` }}
                            />
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-on-surface text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              {data.count} attempts, avg {avgPct}%
                            </div>
                            <span className="text-[9px] text-on-surface-variant truncate w-full text-center">{week.slice(5)}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-on-surface-variant text-sm italic">No activity data yet</p>
                  )}
                  <p className="text-[10px] text-on-surface-variant mt-2 text-center">Bar color = average score quality</p>
                </div>

                {/* Most Missed Words */}
                <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xl border-2 border-rose-100">
                  <h3 className="font-black text-on-surface mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-error-container/20 flex items-center justify-center">
                      <AlertTriangle className="text-error" size={16} />
                    </div>
                    Most Missed Words
                  </h3>
                  {classAnalytics.topMistakes.length > 0 ? (
                    <div className="space-y-3">
                      {classAnalytics.topMistakes.map(({ wordId, count }) => {
                        const word = ALL_WORDS.find(w => w.id === wordId);
                        const pct = Math.round((count / classAnalytics.maxMistakeCount) * 100);
                        const studentsWhoMissed = new Set<string>();
                        allScores.filter(s => analyticsClassFilter === "all" || s.classCode === analyticsClassFilter)
                          .forEach(s => { if (s.mistakes?.includes(wordId)) studentsWhoMissed.add(s.studentName); });
                        return (
                          <div key={wordId} className="bg-rose-50/50 rounded-xl p-3 border border-rose-100">
                            <div className="flex items-center gap-3 mb-1">
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-black text-sm text-on-surface">{word?.english || `#${wordId}`}</span>
                                  <span className="text-error font-black text-sm ml-2">{count}×</span>
                                </div>
                                <div className="flex gap-2 text-xs text-on-surface-variant">
                                  {word?.hebrew && <span dir="rtl">{word.hebrew}</span>}
                                  {word?.hebrew && word?.arabic && <span>•</span>}
                                  {word?.arabic && <span dir="rtl">{word.arabic}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="h-2 bg-surface-container rounded-full overflow-hidden mb-1.5">
                              <div className="h-full bg-error/60 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {Array.from(studentsWhoMissed).slice(0, 5).map(name => (
                                <span key={name} className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-bold">{name}</span>
                              ))}
                              {studentsWhoMissed.size > 5 && <span className="text-[10px] text-rose-500 font-bold">+{studentsWhoMissed.size - 5} more</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-on-surface-variant text-sm italic">No mistake data yet</p>
                  )}
                </div>
              </div>
            )}

            {/* Students Needing Attention + Weak Modes row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
              {/* Students Needing Attention */}
              <div className="bg-white rounded-[30px] shadow-xl p-5 sm:p-6">
                <h3 className="text-sm font-black text-on-surface mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Users className="text-amber-700" size={16} />
                  </div>
                  Students Needing Attention
                </h3>
                {(() => {
                  const studentStats: { name: string; avg: number; mistakes: number; attempts: number; avatar: string }[] = [];
                  const filtered = allScores.filter(s => analyticsClassFilter === "all" || s.classCode === analyticsClassFilter);
                  const byStudent = new Map<string, typeof filtered>();
                  filtered.forEach(s => {
                    const key = s.studentName;
                    if (!byStudent.has(key)) byStudent.set(key, []);
                    byStudent.get(key)!.push(s);
                  });
                  byStudent.forEach((scores, name) => {
                    const avg = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length);
                    const totalMistakes = scores.reduce((sum, s) => sum + (s.mistakes?.length || 0), 0);
                    const avatar = scores[0]?.avatar || '🦊';
                    if (avg < 70 || (totalMistakes > 5 && avg < 80)) {
                      studentStats.push({ name, avg, mistakes: totalMistakes, attempts: scores.length, avatar });
                    }
                  });
                  studentStats.sort((a, b) => a.avg - b.avg);
                  return studentStats.length > 0 ? (
                    <div className="space-y-2">
                      {studentStats.slice(0, 6).map(s => (
                        <div key={s.name} className="flex items-center gap-3 bg-amber-50/50 rounded-xl p-3 border border-amber-100 cursor-pointer hover:shadow-md hover:ring-2 hover:ring-amber-400 transition-all" onClick={() => setSelectedStudent(s.name)}>
                          <span className="text-xl">{s.avatar}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-stone-800 truncate">{s.name}</p>
                            <p className="text-xs text-stone-500">{s.attempts} attempts • {s.mistakes} mistakes</p>
                          </div>
                          <span className={`font-black text-lg ${s.avg < 50 ? 'text-rose-600' : 'text-amber-600'}`}>{s.avg}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-on-surface-variant text-sm italic">All students are doing well! 🎉</p>
                  );
                })()}
              </div>

              {/* Score by Game Mode */}
              <div className="bg-white rounded-[30px] shadow-xl p-5 sm:p-6">
                <h3 className="text-sm font-black text-on-surface mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Layers className="text-purple-700" size={16} />
                  </div>
                  Average Score by Mode
                </h3>
                {(() => {
                  const filtered = allScores.filter(s => analyticsClassFilter === "all" || s.classCode === analyticsClassFilter);
                  const modeStats = new Map<string, { total: number; count: number; mistakes: number }>();
                  filtered.forEach(s => {
                    if (!modeStats.has(s.mode)) modeStats.set(s.mode, { total: 0, count: 0, mistakes: 0 });
                    const m = modeStats.get(s.mode)!;
                    m.total += s.score;
                    m.count++;
                    m.mistakes += (s.mistakes?.length || 0);
                  });
                  const sorted = Array.from(modeStats.entries())
                    .map(([mode, stats]) => ({ mode, avg: Math.round(stats.total / stats.count), count: stats.count, mistakes: stats.mistakes }))
                    .sort((a, b) => a.avg - b.avg);
                  return sorted.length > 0 ? (
                    <div className="space-y-2">
                      {sorted.map(({ mode, avg, count, mistakes }) => (
                        <div key={mode} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="font-bold text-on-surface capitalize">{mode.replace('-', ' ')}</span>
                              <span className="text-on-surface-variant">{count} plays • {mistakes} mistakes</span>
                            </div>
                            <div className="h-3 bg-surface-container rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${avg >= 80 ? 'bg-blue-400' : avg >= 60 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${avg}%` }} />
                            </div>
                          </div>
                          <span className={`font-black text-sm w-10 text-right ${avg >= 80 ? 'text-blue-600' : avg >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>{avg}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-on-surface-variant text-sm italic">No data yet</p>
                  );
                })()}
              </div>
            </div>

            {/* Explanation banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 sm:p-5 mb-6">
              <h2 className="font-bold text-purple-900 text-sm sm:text-base mb-2">Student Scores Matrix</h2>
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-50 border border-blue-300 inline-block"></span> ★ 90%+ Excellent</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-50 border border-blue-200 inline-block"></span> 70-89% Good</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 inline-block"></span> Below 70%</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-stone-100 border border-stone-200 inline-block"></span> — Not attempted</span>
              </div>
              <p className="text-xs text-purple-700 mt-2 font-medium">💡 Click any <strong>student name</strong> or <strong>score cell</strong> to see detailed breakdown and missed words.</p>
            </div>

            {/* Matrix Table */}
            <div className="bg-white rounded-[30px] shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-bold text-stone-400 uppercase text-[10px] sm:text-xs sticky left-0 bg-stone-50">Student</th>
                      {matrixData.assignments.map(assignmentId => (
                        <th key={assignmentId} className="px-2 py-2.5 text-center font-bold text-stone-400 text-[10px] sm:text-xs min-w-[70px] max-w-[120px]" title={assignmentId}>
                          <span className="line-clamp-2 leading-tight">{matrixData.getAssignmentTitle(assignmentId)}</span>
                        </th>
                      ))}
                      <th className="px-2 py-2.5 text-center font-bold text-stone-400 uppercase text-[10px] sm:text-xs min-w-[60px]">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrixData.students
                      .filter(student => analyticsClassFilter === "all" || matrixData.getStudentClassCode(student) === analyticsClassFilter)
                      .map(student => {
                        const studentAvg = matrixData.averages.get(student) || 0;
                        const classCode = matrixData.getStudentClassCode(student);
                        const avatar = matrixData.getStudentAvatar(student);
                        const className = classes.find(c => c.code === classCode)?.name;
                        return (
                          <tr key={student} className="border-t border-stone-100 hover:bg-stone-50">
                            <td
                              className="px-3 py-2 font-bold text-blue-700 text-sm sticky left-0 bg-white hover:bg-blue-50 cursor-pointer hover:ring-2 hover:ring-blue-600 transition-all underline decoration-blue-300 decoration-dotted underline-offset-2"
                              onClick={() => setSelectedStudent(student)}
                            >
                              <div className="flex items-center gap-1.5">
                                {avatar && <span className="text-base">{avatar}</span>}
                                <div className="flex flex-col">
                                  <span className="text-xs sm:text-sm leading-tight">{student}</span>
                                  {className && <span className="text-[10px] font-normal text-stone-400 leading-tight">{className}</span>}
                                </div>
                              </div>
                            </td>
                            {matrixData.assignments.map(assignmentId => {
                              const scoreData = matrixData.matrix.get(student)?.get(assignmentId);
                              const score = scoreData?.score || 0;
                              const hasScore = scoreData !== undefined;

                              let cellClass = "bg-stone-100";
                              let indicator = "";

                              if (hasScore) {
                                if (score >= 90) {
                                  cellClass = "bg-blue-50";
                                  indicator = "★";
                                } else if (score >= 70) {
                                  cellClass = "bg-blue-50";
                                } else {
                                  cellClass = "bg-rose-100";
                                  indicator = "⚠️";
                                }
                              }

                              return (
                                <td
                                  key={assignmentId}
                                  className={`px-2 py-2 text-center text-xs ${cellClass} ${hasScore ? "cursor-pointer hover:ring-2 hover:ring-blue-600 transition-all" : ""}`}
                                  onClick={() => hasScore && setSelectedScore(scoreData!)}
                                >
                                  {hasScore ? (
                                    <span className="font-black text-stone-800">{indicator}{score}%</span>
                                  ) : (
                                    <span className="text-stone-300">—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className={`px-2 py-2 text-center text-xs font-bold ${
                              studentAvg >= 90 ? "text-blue-700" : studentAvg >= 70 ? "text-blue-600" : "text-rose-600"
                            }`}>
                              {studentAvg}%
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="p-4 bg-stone-50 border-t border-stone-100">
                <div className="flex items-center gap-2 mb-2 text-stone-400 text-xs sm:hidden">
                  <span>Scroll for legend</span>
                  <span>→</span>
                </div>
                <div className="flex flex-wrap gap-4 sm:gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded"></div>
                    <span className="text-stone-800 font-bold">Excellent (90%+)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded"></div>
                    <span className="text-stone-800 font-bold">Good (70-89%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-rose-100 border-2 border-rose-400 rounded"></div>
                    <span className="text-stone-800 font-bold">Needs Attention (&lt;70%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Detail Modal */}
            {selectedScore && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedScore(null)}>
                <div className="bg-white rounded-[30px] shadow-2xl max-w-lg w-full p-8" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-black text-stone-900">{selectedScore.studentName}</h2>
                      <p className="text-stone-500">Assignment: {matrixData.getAssignmentTitle(selectedScore.assignmentId)}</p>
                    </div>
                    <button
                      onClick={() => setSelectedScore(null)}
                      className="text-stone-400 hover:text-stone-600"
                      aria-label="Close score details"
                      title="Close score details"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Score */}
                    <div className="flex items-center gap-4">
                      <div className={`px-6 py-3 rounded-2xl font-black text-2xl ${
                        selectedScore.score >= 90 ? "bg-blue-50 text-blue-700" :
                        selectedScore.score >= 70 ? "bg-blue-100 text-blue-700" :
                        "bg-rose-100 text-rose-700"
                      }`}>
                        {selectedScore.score}%
                      </div>
                      <div className="text-stone-500">
                        <p>Mode: <span className="font-bold text-stone-800 capitalize">{selectedScore.mode}</span></p>
                        <p>Completed: <span className="font-bold text-stone-800">{new Date(selectedScore.completedAt).toLocaleDateString()}</span></p>
                      </div>
                    </div>

                    {/* Mistakes */}
                    {selectedScore.mistakes && selectedScore.mistakes.length > 0 && (
                      <div>
                        <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
                          <AlertTriangle className="text-rose-500" size={20} />
                          Words Missed ({selectedScore.mistakes.length})
                        </h3>
                        <div className="bg-stone-50 rounded-2xl p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {selectedScore.mistakes.map((wordId, idx) => {
                              const word = ALL_WORDS.find(w => w.id === wordId);
                              const totalMisses = allScores
                                .filter(s => s.studentName === selectedScore.studentName)
                                .reduce((sum, s) => sum + (s.mistakes?.filter(m => m === wordId).length || 0), 0);
                              return (
                                <div key={`${selectedScore.id}-${wordId}-${idx}`} className="bg-white p-3 rounded-xl border border-rose-200">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-black text-stone-800">{word?.english || "Unknown"}</p>
                                      <div className="flex gap-2 text-xs text-stone-500 mt-0.5">
                                        {word?.hebrew && <span dir="rtl">{word.hebrew}</span>}
                                        {word?.arabic && <span dir="rtl">{word.arabic}</span>}
                                      </div>
                                    </div>
                                    {totalMisses > 1 && (
                                      <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full text-[10px] font-black">{totalMisses}× total</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Class Info */}
                    <p className="text-stone-500">
                      Class: <span className="font-bold text-stone-800">{selectedScore.classCode}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Student Profile Modal */}
            {selectedStudent && (() => {
              const studentScores = matrixData.studentMap.get(selectedStudent) || [];
              const classCode = matrixData.getStudentClassCode(selectedStudent);
              const avatar = matrixData.getStudentAvatar(selectedStudent);
              const avgScore = matrixData.averages.get(selectedStudent) || 0;
              const classAvg = Math.round(Array.from(matrixData.averages.values()).reduce((a, b) => a + b, 0) / matrixData.averages.size) || 0;

              const mistakeCounts: Record<number, number> = {};
              studentScores.forEach(s => {
                s.mistakes?.forEach(wordId => {
                  mistakeCounts[wordId] = (mistakeCounts[wordId] || 0) + 1;
                });
              });
              const topMistakes = Object.entries(mistakeCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([wordId, count]) => ({ wordId: parseInt(wordId), count }));

              const scoreTrend = [...studentScores]
                .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

              return (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedStudent(null)}>
                  <div className="bg-white rounded-[30px] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        {avatar && <span className="text-4xl">{avatar}</span>}
                        <div>
                          <h2 className="text-2xl sm:text-3xl font-black text-stone-900">{selectedStudent}</h2>
                          <p className="text-stone-500 flex items-center gap-2">
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-sm font-bold">{classCode}</span>
                            <span>•</span>
                            <span>{studentScores.length} {studentScores.length === 1 ? 'attempt' : 'attempts'}</span>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedStudent(null)}
                        className="text-stone-400 hover:text-stone-600"
                        aria-label="Close student details"
                        title="Close student details"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      <div className={`p-4 rounded-2xl ${
                        avgScore >= 90 ? "bg-blue-50" : avgScore >= 70 ? "bg-blue-100" : "bg-rose-100"
                      }`}>
                        <p className="text-stone-500 text-sm font-bold uppercase">Average Score</p>
                        <p className={`text-3xl font-black ${
                          avgScore >= 90 ? "text-blue-700" : avgScore >= 70 ? "text-blue-600" : "text-rose-600"
                        }`}>{avgScore}%</p>
                      </div>
                      <div className="p-4 bg-stone-50 rounded-2xl">
                        <p className="text-stone-500 text-sm font-bold uppercase">Class Average</p>
                        <p className="text-3xl font-black text-stone-700">{classAvg}%</p>
                        <p className={`text-sm mt-1 ${avgScore >= classAvg ? "text-green-600" : "text-rose-600"}`}>
                          {avgScore >= classAvg ? "▲ Above class avg" : "▼ Below class avg"}
                        </p>
                      </div>
                      <div className="p-4 bg-stone-50 rounded-2xl">
                        <p className="text-stone-500 text-sm font-bold uppercase">Total Score Points</p>
                        <p className="text-3xl font-black text-stone-700">{studentScores.reduce((sum, s) => sum + s.score, 0)}</p>
                      </div>
                    </div>

                    {/* Score Trend Chart */}
                    {scoreTrend.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
                          <TrendingUp className="text-blue-600" size={20} />
                          Score Trend Over Time
                        </h3>
                        <div className="bg-stone-50 rounded-2xl p-4">
                          <div className="flex items-end gap-1 h-32">
                            {scoreTrend.map((s, idx) => (
                              <div
                                key={`${s.id}-${idx}`}
                                className="flex-1 flex flex-col items-center gap-1 group relative"
                              >
                                <div
                                  className={`w-full rounded-t-lg transition-all ${
                                    s.score >= 90 ? "bg-blue-400" : s.score >= 70 ? "bg-blue-300" : "bg-rose-300"
                                  } ${toScoreHeightClass(s.score)}`}
                                />
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                  {s.score}%
                                </div>
                                <span className="text-xs text-stone-400 truncate w-full text-center">{idx + 1}</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-center text-xs text-stone-400 mt-2">Click/tap bars to see exact scores</p>
                        </div>
                      </div>
                    )}

                    {/* Top Mistakes */}
                    {topMistakes.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
                          <AlertTriangle className="text-rose-500" size={20} />
                          Most Challenging Words ({topMistakes.length} total)
                        </h3>
                        <div className="bg-stone-50 rounded-2xl p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {topMistakes.map(({ wordId, count }) => {
                              const word = ALL_WORDS.find(w => w.id === wordId);
                              return (
                                <div key={wordId} className="bg-white p-3 rounded-xl border border-stone-200 flex justify-between items-center">
                                  <div>
                                    <p className="font-bold text-stone-800">{word?.english || "Unknown"}</p>
                                    <p className="text-xs text-stone-500">{word?.hebrew || ""}</p>
                                  </div>
                                  <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded-full text-sm font-bold">{count}×</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Assignment History */}
                    <div>
                      <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
                        <History className="text-blue-600" size={20} />
                        Assignment History
                      </h3>
                      <div className="bg-stone-50 rounded-2xl p-4 space-y-2">
                        {scoreTrend.map((s, idx) => (
                          <div
                            key={`${s.id}-${idx}`}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                              s.score >= 90 ? "bg-blue-50 border-blue-200" : s.score >= 70 ? "bg-blue-50 border-blue-200" : "bg-rose-50 border-rose-200"
                            }`}
                            onClick={() => { setSelectedStudent(null); setSelectedScore(s); }}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full font-bold text-lg ${
                                  s.score >= 90 ? "bg-blue-200 text-blue-800" : s.score >= 70 ? "bg-blue-200 text-blue-800" : "bg-rose-200 text-rose-800"
                                }`}>
                                  {s.score}%
                                </span>
                                <div>
                                  <p className="font-bold text-stone-800">{matrixData.getAssignmentTitle(s.assignmentId)}</p>
                                  <p className="text-xs text-stone-500">
                                    <span className="capitalize">{s.mode.replace('-', ' ')}</span> • {new Date(s.completedAt).toLocaleDateString()}
                                    {s.mistakes && s.mistakes.length > 0 && (
                                      <span className="text-rose-500 ml-1">• {s.mistakes.length} mistake{s.mistakes.length !== 1 ? 's' : ''}</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className="text-stone-400" size={18} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-stone-400 mt-2 text-center">Click any attempt to see details</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </main>
    </div>
  );
};

export default AnalyticsView;
