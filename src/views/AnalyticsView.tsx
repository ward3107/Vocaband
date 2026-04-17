import { useState, useMemo, useEffect } from "react";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  X,
  ChevronRight,
  Sparkles,
  BookOpen,
  Gamepad2,
  Check,
  Plus,
  Gift,
} from "lucide-react";
import TopAppBar from "../components/TopAppBar";
import TeacherRewardModal from "../components/dashboard/TeacherRewardModal";
import { ALL_WORDS } from "../data/vocabulary";
import {
  supabase,
  type ProgressData,
  type AssignmentData,
  type ClassData,
} from "../core/supabase";
import type { View } from "../core/views";

interface AnalyticsViewProps {
  user: { displayName?: string; avatar?: string } | null;
  classes: ClassData[];
  allScores: ProgressData[];
  teacherAssignments: AssignmentData[];
  setView: React.Dispatch<React.SetStateAction<View>>;
  // Assignment creation state from App.tsx
  selectedClass: { name: string; code: string; studentCount?: number; id?: string } | null;
  setSelectedClass: React.Dispatch<React.SetStateAction<{ name: string; code: string; studentCount?: number; id?: string } | null>>;
  selectedWords: number[];
  setSelectedWords: React.Dispatch<React.SetStateAction<number[]>>;
}

export default function AnalyticsView({
  user,
  classes,
  allScores,
  teacherAssignments,
  setView,
  selectedClass: appSelectedClass,
  setSelectedClass: setAppSelectedClass,
  selectedWords: appSelectedWords,
  setSelectedWords: setAppSelectedWords,
}: AnalyticsViewProps) {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedScore, setSelectedScore] = useState<ProgressData | null>(null);
  // State for words selected for reteaching
  const [reteachWords, setReteachWords] = useState<Set<number>>(new Set());
  // State for teacher rewards
  const [rewardStudent, setRewardStudent] = useState<{ uid: string; name: string; avatar: string; xp?: number } | null>(null);
  const [studentUidMap, setStudentUidMap] = useState<Map<string, { uid: string; xp: number }>>(new Map());

  // Per-class analytics
  const classAnalytics = useMemo(() => {
    const analytics: Map<string, {
      studentCount: number;
      avgScore: number;
      totalAttempts: number;
      strugglingCount: number;
      topMistakes: Array<{ wordId: number; count: number; word: typeof ALL_WORDS[number] }>;
      bestMode: string;
      modeCounts: Record<string, number>;
      strugglingStudents: Array<{
        name: string;
        avg: number;
        avatar: string;
        attempts: number;
      }>;
    }> = new Map();

    // Group scores by class
    const byClass: Map<string, ProgressData[]> = new Map();
    allScores.forEach(s => {
      if (!byClass.has(s.classCode)) byClass.set(s.classCode, []);
      byClass.get(s.classCode)!.push(s);
    });

    byClass.forEach((scores, classCode) => {
      // Unique students
      const uniqueStudents = new Set(scores.map(s => s.studentName));
      const studentCount = uniqueStudents.size;

      // Average score
      const avgScore = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length);

      // Total attempts
      const totalAttempts = scores.length;

      // Find struggling students (avg < 70%)
      const studentStats: Map<string, { total: number; count: number; avatar: string }> = new Map();
      scores.forEach(s => {
        if (!studentStats.has(s.studentName)) {
          studentStats.set(s.studentName, { total: 0, count: 0, avatar: s.avatar || '🦊' });
        }
        const stat = studentStats.get(s.studentName)!;
        stat.total += s.score;
        stat.count++;
      });

      const strugglingStudents: Array<{ name: string; avg: number; avatar: string; attempts: number }> = [];
      studentStats.forEach((stat, name) => {
        const avg = Math.round(stat.total / stat.count);
        if (avg < 70) {
          strugglingStudents.push({ name, avg, avatar: stat.avatar, attempts: stat.count });
        }
      });
      strugglingStudents.sort((a, b) => a.avg - b.avg);

      // Most missed words
      const mistakeCounts: Record<number, number> = {};
      scores.forEach(s => {
        s.mistakes?.forEach(wordId => {
          mistakeCounts[wordId] = (mistakeCounts[wordId] || 0) + 1;
        });
      });
      const topMistakes = Object.entries(mistakeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([wordId, count]) => ({
          wordId: parseInt(wordId),
          count,
          word: ALL_WORDS.find(w => w.id === parseInt(wordId)),
        }))
        .filter(m => m.word !== undefined) as Array<{ wordId: number; count: number; word: typeof ALL_WORDS[number] }>;

      // Best mode (most plays with high scores)
      const modeScores: Map<string, { total: number; count: number }> = new Map();
      scores.forEach(s => {
        if (!modeScores.has(s.mode)) modeScores.set(s.mode, { total: 0, count: 0 });
        const m = modeScores.get(s.mode)!;
        m.total += s.score;
        m.count++;
      });

      let bestMode = "flashcards";
      let bestScore = -1;
      modeScores.forEach((stats, mode) => {
        const avg = stats.total / stats.count;
        if (avg > bestScore && stats.count >= 3) {
          bestScore = avg;
          bestMode = mode;
        }
      });

      // Mode counts for "most played"
      const modeCounts: Record<string, number> = {};
      scores.forEach(s => {
        modeCounts[s.mode] = (modeCounts[s.mode] || 0) + 1;
      });

      analytics.set(classCode, {
        studentCount,
        avgScore,
        totalAttempts,
        strugglingCount: strugglingStudents.length,
        topMistakes,
        bestMode,
        modeCounts,
        strugglingStudents,
      });
    });

    return analytics;
  }, [allScores]);

  // Get analytics for selected class (or "all")
  const currentAnalytics = selectedClass
    ? classAnalytics.get(selectedClass)
    : (() => {
        // Aggregate for "all classes"
        let totalStudents = 0;
        let totalScore = 0;
        let totalCount = 0;
        const allStruggling: Set<string> = new Set();
        const allMistakes: Record<number, number> = {};
        const allModeCounts: Record<string, number> = {};

        classAnalytics.forEach((data) => {
          totalStudents += data.studentCount;
          totalScore += data.avgScore * data.totalAttempts;
          totalCount += data.totalAttempts;
          data.strugglingStudents.forEach(s => allStruggling.add(s.name));
          data.topMistakes.forEach(m => {
            allMistakes[m.wordId] = (allMistakes[m.wordId] || 0) + m.count;
          });
          Object.entries(data.modeCounts).forEach(([mode, count]) => {
            allModeCounts[mode] = (allModeCounts[mode] || 0) + count;
          });
        });

        // Build struggling students list from all scores
        const studentStats: Map<string, { total: number; count: number; avatar: string }> = new Map();
        allScores.forEach(s => {
          if (!studentStats.has(s.studentName)) {
            studentStats.set(s.studentName, { total: 0, count: 0, avatar: s.avatar || '🦊' });
          }
          const stat = studentStats.get(s.studentName)!;
          stat.total += s.score;
          stat.count++;
        });

        const strugglingStudents: Array<{ name: string; avg: number; avatar: string; attempts: number }> = [];
        studentStats.forEach((stat, name) => {
          const avg = Math.round(stat.total / stat.count);
          if (avg < 70) {
            strugglingStudents.push({ name, avg, avatar: stat.avatar, attempts: stat.count });
          }
        });
        strugglingStudents.sort((a, b) => a.avg - b.avg);

        const topMistakes = Object.entries(allMistakes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([wordId, count]) => ({
            wordId: parseInt(wordId),
            count,
            word: ALL_WORDS.find(w => w.id === parseInt(wordId)),
          }))
          .filter(m => m.word !== undefined) as Array<{ wordId: number; count: number; word: typeof ALL_WORDS[number] }>;

        // Find best mode
        let bestMode = "flashcards";
        let bestPlays = 0;
        Object.entries(allModeCounts).forEach(([mode, count]) => {
          if (count > bestPlays) {
            bestPlays = count;
            bestMode = mode;
          }
        });

        return {
          studentCount: totalStudents,
          avgScore: totalCount > 0 ? Math.round(totalScore / totalCount) : 0,
          totalAttempts: totalCount,
          strugglingCount: allStruggling.size,
          topMistakes,
          bestMode,
          modeCounts: allModeCounts,
          strugglingStudents,
        };
      })();

  const selectedClassData = classes.find(c => c.code === selectedClass);

  // Matrix data for student detail modal
  const matrixData = useMemo(() => {
    const studentMap = new Map<string, ProgressData[]>();
    allScores.forEach(s => {
      if (!studentMap.has(s.studentName)) {
        studentMap.set(s.studentName, []);
      }
      studentMap.get(s.studentName)!.push(s);
    });

    const assignmentTitleMap = new Map<string, string>();
    teacherAssignments.forEach(a => assignmentTitleMap.set(a.id, a.title));

    return { studentMap, getAssignmentTitle: (id: string) => assignmentTitleMap.get(id) || id.slice(0, 8) + '…' };
  }, [allScores, teacherAssignments]);

  // Toggle word selection for reteaching
  const toggleReteachWord = (wordId: number) => {
    setReteachWords(prev => {
      const next = new Set(prev);
      if (next.has(wordId)) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }
      return next;
    });
  };

  // Select all visible mistake words
  const selectAllReteachWords = () => {
    if (currentAnalytics?.topMistakes) {
      setReteachWords(new Set(currentAnalytics.topMistakes.map(m => m.wordId)));
    }
  };

  // Clear all selections
  const clearReteachWords = () => {
    setReteachWords(new Set());
  };

  // Create assignment with selected reteach words
  const handleCreateAssignment = () => {
    if (reteachWords.size === 0) return;

    // Find which class we're viewing
    const targetClassCode = selectedClass || (classes.length === 1 ? classes[0].code : null);
    if (!targetClassCode) {
      // Need to ask user to select a class first
      return;
    }

    const targetClass = classes.find(c => c.code === targetClassCode);
    if (!targetClass) return;

    // Set the selected class and words in App.tsx state
    setAppSelectedClass({
      name: targetClass.name,
      code: targetClass.code,
      studentCount: currentAnalytics?.studentCount,
      id: targetClass.id,
    });

    setAppSelectedWords(Array.from(reteachWords));

    // Navigate to create-assignment view
    setView("create-assignment");
  };

  // Fetch student UIDs when class is selected (for reward functionality)
  useEffect(() => {
    const fetchStudentUids = async () => {
      if (!selectedClass) {
        setStudentUidMap(new Map());
        return;
      }

      try {
        const { data, error } = await supabase.rpc('list_students_in_class', {
          p_class_code: selectedClass,
        });

        if (error) throw error;

        // Create map of student name -> uid + xp
        const map = new Map<string, { uid: string; xp: number }>();
        if (data) {
          data.forEach((student: { id: string; auth_uid: string | null; display_name: string; xp: number }) => {
            // Use auth_uid as the user identifier for award_reward
            if (student.auth_uid) {
              map.set(student.display_name, { uid: student.auth_uid, xp: student.xp });
            }
          });
        }
        setStudentUidMap(map);
      } catch (err) {
        console.error('Failed to fetch student UIDs:', err);
      }
    };

    fetchStudentUids();
  }, [selectedClass]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white pb-24">
      <TopAppBar
        title="Analytics"
        subtitle="CLASSROOM INSIGHTS"
        showBack
        onBack={() => setView("teacher-dashboard")}
        userName={user?.displayName}
        userAvatar={user?.avatar}
        onLogout={() => supabase.auth.signOut()}
      />

      <main className="pt-24 px-4 max-w-5xl mx-auto">
        {/* Class Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => { setSelectedClass(null); setReteachWords(new Set()); }}
            className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
              selectedClass === null
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                : "bg-white text-stone-600 hover:bg-stone-100 border-2 border-stone-200"
            }`}
          >
            All Classes
          </button>
          {classes.map(c => (
            <button
              key={c.code}
              onClick={() => { setSelectedClass(c.code); setReteachWords(new Set()); }}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                selectedClass === c.code
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                  : "bg-white text-stone-600 hover:bg-stone-100 border-2 border-stone-200"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {allScores.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl shadow-xl text-center">
            <Sparkles className="mx-auto text-stone-300 mb-4" size={48} />
            <p className="text-stone-400 font-medium">No student data yet. Analytics will appear once students complete assignments.</p>
          </div>
        ) : (
          <>
            {/* CLASS CARDS VIEW (when no class selected) */}
            {selectedClass === null && classes.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map(c => {
                  const analytics = classAnalytics.get(c.code);
                  if (!analytics) return null;

                  return (
                    <button
                      key={c.code}
                      onClick={() => setSelectedClass(c.code)}
                      className="bg-white p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all text-left group border-2 border-transparent hover:border-indigo-200"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-4xl">{c.avatar || '📖'}</span>
                        <ChevronRight className="text-stone-300 group-hover:text-indigo-500 transition-colors" size={24} />
                      </div>
                      <h3 className="font-bold text-lg text-stone-900 mb-3">{c.name}</h3>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-stone-500 text-sm">Students</span>
                          <span className="font-bold text-stone-900">{analytics.studentCount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-stone-500 text-sm">Average Score</span>
                          <span className={`font-bold ${analytics.avgScore >= 80 ? 'text-emerald-600' : analytics.avgScore >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                            {analytics.avgScore}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-stone-500 text-sm">Total Attempts</span>
                          <span className="font-bold text-stone-900">{analytics.totalAttempts}</span>
                        </div>
                        {analytics.strugglingCount > 0 && (
                          <div className="pt-2 border-t border-stone-100">
                            <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-sm">
                              <AlertTriangle size={14} />
                              {analytics.strugglingCount} need help
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* DETAILED ANALYTICS (when class selected) */}
            {selectedClass !== null && currentAnalytics && (
              <>
                {/* Back header */}
                <button
                  onClick={() => { setSelectedClass(null); setReteachWords(new Set()); }}
                  className="mb-6 flex items-center gap-2 text-stone-500 hover:text-stone-900 font-medium transition-colors"
                >
                  ← Back to all classes
                </button>

                {/* Class Title */}
                <div className="mb-8">
                  <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
                    {selectedClassData?.name || 'All Classes'}
                  </h1>
                  <p className="text-stone-500 mt-1">
                    {currentAnalytics.studentCount} students • {currentAnalytics.totalAttempts} total attempts
                  </p>
                </div>

                {/* 3-CARD DESIGN */}
                <div className="space-y-6">
                  {/* CARD 1: WHO NEEDS HELP */}
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-3xl shadow-xl border-2 border-amber-200">
                    <h2 className="font-black text-lg text-stone-900 mb-4 flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                        <Users className="text-amber-700" size={20} />
                      </div>
                      Who Needs Help
                    </h2>

                    {currentAnalytics.strugglingStudents.length === 0 ? (
                      <p className="text-stone-500 italic">All students are doing well! 🎉</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {currentAnalytics.strugglingStudents.slice(0, 6).map(s => {
                          const studentInfo = studentUidMap.get(s.name);
                          return (
                            <div
                              key={s.name}
                              className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all border-2 border-amber-100 hover:border-amber-300"
                            >
                              <button
                                onClick={() => setSelectedStudent(s.name)}
                                className="flex items-center gap-3 w-full text-left"
                              >
                                <span className="text-2xl">{s.avatar}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-stone-900 truncate">{s.name}</p>
                                  <p className="text-stone-500 text-sm">{s.attempts} attempts</p>
                                </div>
                                <span className={`font-black text-xl ${s.avg < 50 ? 'text-rose-600' : 'text-amber-600'}`}>
                                  {s.avg}%
                                </span>
                              </button>
                              <div className="mt-2 pt-2 border-t border-amber-100 flex justify-end">
                                <button
                                  onClick={() => {
                                    if (studentInfo) {
                                      setRewardStudent({
                                        uid: studentInfo.uid,
                                        name: s.name,
                                        avatar: s.avatar,
                                        xp: studentInfo.xp,
                                      });
                                    }
                                  }}
                                  type="button"
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-bold transition-colors"
                                  title="Give reward"
                                >
                                  <Gift size={14} />
                                  Reward
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {currentAnalytics.strugglingStudents.length > 6 && (
                      <p className="text-stone-500 text-sm mt-3">
                        +{currentAnalytics.strugglingStudents.length - 6} more students need attention
                      </p>
                    )}
                  </div>

                  {/* CARD 2: WHAT TO RETEACH (with selection) */}
                  <div className="bg-gradient-to-br from-rose-50 to-pink-50 p-6 rounded-3xl shadow-xl border-2 border-rose-200">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-black text-lg text-stone-900 flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                          <BookOpen className="text-rose-700" size={20} />
                        </div>
                        What to Reteach
                      </h2>
                      <div className="flex gap-2">
                        <button
                          onClick={selectAllReteachWords}
                          className="text-xs font-bold text-rose-600 hover:text-rose-800 px-3 py-1 bg-rose-100 rounded-full"
                        >
                          Select All
                        </button>
                        {reteachWords.size > 0 && (
                          <button
                            onClick={clearReteachWords}
                            className="text-xs font-bold text-stone-500 hover:text-stone-700 px-3 py-1 bg-stone-100 rounded-full"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {currentAnalytics.topMistakes.length === 0 ? (
                      <p className="text-stone-500 italic">No mistakes recorded yet — students are doing great!</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {currentAnalytics.topMistakes.map(({ word, count }) => {
                          const isSelected = reteachWords.has(word.id);
                          return (
                            <button
                              key={word.id}
                              onClick={() => toggleReteachWord(word.id)}
                              className={`relative p-4 rounded-2xl border-2 transition-all text-left ${
                                isSelected
                                  ? 'bg-rose-500 border-rose-600 shadow-lg'
                                  : 'bg-white border-rose-100 hover:border-rose-300 shadow-sm'
                              }`}
                            >
                              {/* Selection indicator */}
                              <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-white'
                                  : 'bg-rose-100'
                              }`}>
                                {isSelected && <Check className="text-rose-600" size={14} />}
                              </div>

                              <div className="flex justify-between items-start mb-2 pr-6">
                                <p className={`font-bold ${isSelected ? 'text-white' : 'text-stone-900'}`}>{word.english}</p>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                  isSelected
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-rose-100 text-rose-700'
                                }`}>
                                  {count}×
                                </span>
                              </div>
                              <div className={`flex gap-2 text-sm ${isSelected ? 'text-rose-100' : 'text-stone-500'}`}>
                                {word.hebrew && <span dir="rtl">{word.hebrew}</span>}
                                {word.hebrew && word.arabic && <span>•</span>}
                                {word.arabic && <span dir="rtl">{word.arabic}</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {reteachWords.size > 0 && (
                      <div className="mt-4 p-3 bg-rose-100 rounded-xl flex items-center justify-between">
                        <span className="text-rose-700 font-bold text-sm">
                          {reteachWords.size} word{reteachWords.size !== 1 ? 's' : ''} selected
                        </span>
                        <span className="text-rose-600 text-sm">Create assignment below ↓</span>
                      </div>
                    )}
                  </div>

                  {/* CARD 3: CLASS HEALTH */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-3xl shadow-xl border-2 border-emerald-200">
                    <h2 className="font-black text-lg text-stone-900 mb-4 flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <TrendingUp className="text-emerald-700" size={20} />
                      </div>
                      Class Health
                    </h2>

                    <div className="space-y-4">
                      {/* Average Score Bar */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-stone-600 font-medium">Average Score</span>
                          <span className={`font-black text-xl ${currentAnalytics.avgScore >= 80 ? 'text-emerald-600' : currentAnalytics.avgScore >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                            {currentAnalytics.avgScore}%
                          </span>
                        </div>
                        <div className="h-4 bg-white rounded-full overflow-hidden shadow-inner">
                          <div
                            className={`h-full rounded-full transition-all ${
                              currentAnalytics.avgScore >= 80 ? 'bg-emerald-500' :
                              currentAnalytics.avgScore >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${currentAnalytics.avgScore}%` }}
                          />
                        </div>
                      </div>

                      {/* Best Mode */}
                      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <Gamepad2 className="text-indigo-600" size={20} />
                          </div>
                          <div>
                            <p className="text-stone-500 text-sm">Most Played Mode</p>
                            <p className="font-black text-stone-900 capitalize">
                              {currentAnalytics.bestMode.replace(/-/g, ' ')}
                            </p>
                          </div>
                        </div>
                        <span className="text-indigo-600 font-bold">
                          {currentAnalytics.modeCounts[currentAnalytics.bestMode] || 0} plays
                        </span>
                      </div>

                      {/* Engagement Summary */}
                      <div className="flex items-center gap-4">
                        <div className="flex-1 bg-white p-4 rounded-2xl shadow-sm text-center">
                          <p className="text-3xl font-black text-indigo-600">{currentAnalytics.studentCount}</p>
                          <p className="text-stone-500 text-sm">Active Students</p>
                        </div>
                        <div className="flex-1 bg-white p-4 rounded-2xl shadow-sm text-center">
                          <p className="text-3xl font-black text-indigo-600">{currentAnalytics.totalAttempts}</p>
                          <p className="text-stone-500 text-sm">Total Attempts</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* FLOATING ACTION BUTTON - Create Assignment */}
      {reteachWords.size > 0 && selectedClass !== null && (
        <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-auto z-40">
          <button
            onClick={handleCreateAssignment}
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3 font-bold"
          >
            <Plus size={20} />
            Create Assignment with {reteachWords.size} word{reteachWords.size !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* STUDENT DETAIL MODAL */}
      {selectedStudent && (() => {
        const studentScores = matrixData.studentMap.get(selectedStudent) || [];
        const avgScore = studentScores.length > 0
          ? Math.round(studentScores.reduce((sum, s) => sum + s.score, 0) / studentScores.length)
          : 0;

        // Get top mistakes
        const mistakeCounts: Record<number, number> = {};
        studentScores.forEach(s => {
          s.mistakes?.forEach(wordId => {
            mistakeCounts[wordId] = (mistakeCounts[wordId] || 0) + 1;
          });
        });
        const topMistakes = Object.entries(mistakeCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([wordId, count]) => ({ wordId: parseInt(wordId), count }))
          .map(({ wordId, count }) => ({
            wordId,
            count,
            word: ALL_WORDS.find(w => w.id === wordId),
          }))
          .filter(m => m.word !== undefined);

        const avatar = studentScores[0]?.avatar || '🦊';

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedStudent(null)}>
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{avatar}</span>
                  <div>
                    <h2 className="text-2xl font-black text-stone-900">{selectedStudent}</h2>
                    <p className="text-stone-500">{studentScores.length} {studentScores.length === 1 ? 'attempt' : 'attempts'}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedStudent(null)} className="text-stone-400 hover:text-stone-600">
                  <X size={24} />
                </button>
              </div>

              {/* Average Score */}
              <div className={`p-6 rounded-2xl mb-6 ${
                avgScore >= 80 ? 'bg-emerald-50' : avgScore >= 70 ? 'bg-amber-50' : 'bg-rose-50'
              }`}>
                <p className="text-stone-500 text-sm font-bold uppercase mb-1">Average Score</p>
                <p className={`text-4xl font-black ${avgScore >= 80 ? 'text-emerald-600' : avgScore >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {avgScore}%
                </p>
              </div>

              {/* Top Mistakes */}
              {topMistakes.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
                    <AlertTriangle className="text-rose-500" size={18} />
                    Most Challenging Words
                  </h3>
                  <div className="space-y-2">
                    {topMistakes.map(({ word, count }) => (
                      <div key={word.id} className="bg-stone-50 p-3 rounded-xl flex justify-between items-center">
                        <div>
                          <p className="font-bold text-stone-800">{word.english}</p>
                          <p className="text-stone-500 text-sm">{word.hebrew || ''}</p>
                        </div>
                        <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded-full text-sm font-bold">{count}×</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Attempts */}
              <div>
                <h3 className="font-bold text-stone-800 mb-3">Recent Attempts</h3>
                <div className="space-y-2">
                  {studentScores
                    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
                    .slice(0, 5)
                    .map(s => (
                      <div
                        key={s.id}
                        className={`p-4 rounded-xl border-2 cursor-pointer hover:shadow-md transition-all ${
                          s.score >= 80 ? 'bg-emerald-50 border-emerald-200' : s.score >= 70 ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'
                        }`}
                        onClick={() => { setSelectedStudent(null); setSelectedScore(s); }}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-bold text-stone-800">{matrixData.getAssignmentTitle(s.assignmentId)}</p>
                            <p className="text-stone-500 text-sm capitalize">{s.mode.replace(/-/g, ' ')} • {new Date(s.completedAt).toLocaleDateString()}</p>
                          </div>
                          <span className={`font-black text-lg ${s.score >= 80 ? 'text-emerald-600' : s.score >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                            {s.score}%
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SCORE DETAIL MODAL */}
      {selectedScore && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedScore(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-black text-stone-900">{selectedScore.studentName}</h2>
                <p className="text-stone-500">{matrixData.getAssignmentTitle(selectedScore.assignmentId)}</p>
              </div>
              <button onClick={() => setSelectedScore(null)} className="text-stone-400 hover:text-stone-600">
                <X size={24} />
              </button>
            </div>

            <div className={`p-6 rounded-2xl mb-6 text-center ${
              selectedScore.score >= 80 ? 'bg-emerald-50' : selectedScore.score >= 70 ? 'bg-amber-50' : 'bg-rose-50'
            }`}>
              <p className={`text-5xl font-black ${selectedScore.score >= 80 ? 'text-emerald-600' : selectedScore.score >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                {selectedScore.score}%
              </p>
              <p className="text-stone-500 mt-1 capitalize">{selectedScore.mode.replace(/-/g, ' ')}</p>
            </div>

            {selectedScore.mistakes && selectedScore.mistakes.length > 0 && (
              <div>
                <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="text-rose-500" size={18} />
                  Words Missed
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {selectedScore.mistakes.map((wordId, idx) => {
                    const word = ALL_WORDS.find(w => w.id === wordId);
                    return (
                      <div key={idx} className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                        <p className="font-bold text-stone-800">{word?.english || 'Unknown'}</p>
                        <p className="text-stone-500 text-sm">{word?.hebrew || ''}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Teacher Reward Modal */}
      <TeacherRewardModal
        student={rewardStudent}
        onClose={() => setRewardStudent(null)}
        onRewardGiven={() => {
          // Optionally refresh data after giving reward
        }}
        showToast={(message, type) => {
          // Simple toast notification
          console.log(`[${type}] ${message}`);
          // In a real app, this would use the app's toast system
        }}
      />
    </div>
  );
}
