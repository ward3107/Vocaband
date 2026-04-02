import React, { useState } from "react";
import { Users, Trophy, GraduationCap, ChevronDown, UserCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../auth/AuthContext";
import { useUI } from "../../shared/contexts/UIContext";
import * as authService from "../../services/authService";
import TopAppBar from "../../shared/components/TopAppBar";
import { HelpTooltip } from "../../shared/components/HelpTooltip";
import type { ProgressData, ClassData } from "../../shared/types";

export interface ClassStudent {
  name: string;
  classCode: string;
  lastActive: string;
}

interface GradebookViewProps {
  allScores: ProgressData[];
  classes: ClassData[];
  classStudents: ClassStudent[];
  setView: (view: string) => void;
}

export function GradebookView({
  allScores,
  classes,
  classStudents,
  setView,
}: GradebookViewProps) {
  const { user } = useAuth();
  const { showToast } = useUI();

  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  // Group scores by student
  const groupedByStudent = allScores.reduce((acc, score) => {
    const key = `${score.studentName}-${score.classCode}`;
    if (!acc[key]) {
      acc[key] = {
        studentName: score.studentName,
        classCode: score.classCode,
        scores: [],
        totalScore: 0,
        bestScore: 0,
        lastDate: score.completedAt
      };
    }
    acc[key].scores.push(score);
    acc[key].totalScore += score.score;
    acc[key].bestScore = Math.max(acc[key].bestScore, score.score);
    if (new Date(score.completedAt) > new Date(acc[key].lastDate)) {
      acc[key].lastDate = score.completedAt;
    }
    return acc;
  }, {} as Record<string, {
    studentName: string;
    classCode: string;
    scores: typeof allScores;
    totalScore: number;
    bestScore: number;
    lastDate: string;
  }>);

  const studentEntries = Object.values(groupedByStudent);

  // Score badge with color based on performance
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-gradient-to-br from-green-400 to-green-500 text-white';
    if (score >= 70) return 'bg-gradient-to-br from-blue-400 to-blue-500 text-white';
    if (score >= 50) return 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white';
    return 'bg-gradient-to-br from-red-400 to-red-500 text-white';
  };

  // Mode icon and color
  const getModeInfo = (mode: string) => {
    const modeMap: Record<string, { icon: string; color: string; label: string; name: string }> = {
      classic: { icon: '\u{1F4DD}', color: 'from-blue-400 to-blue-500', label: 'Multiple Choice', name: 'Classic' },
      spelling: { icon: '\u270D\uFE0F', color: 'from-purple-400 to-purple-500', label: 'Type the answer', name: 'Spelling' },
      flashcards: { icon: '\u{1F3B4}', color: 'from-green-400 to-green-500', label: 'Study mode', name: 'Flashcards' },
      listening: { icon: '\u{1F3A7}', color: 'from-pink-400 to-pink-500', label: 'Audio questions', name: 'Listening' },
      matching: { icon: '\u{1F517}', color: 'from-orange-400 to-orange-500', label: 'Match pairs', name: 'Matching' },
      scramble: { icon: '\u{1F524}', color: 'from-teal-400 to-teal-500', label: 'Unscramble letters', name: 'Scramble' },
      reverse: { icon: '\u{1F504}', color: 'from-indigo-400 to-indigo-500', label: 'Reverse definitions', name: 'Reverse' },
      'true-false': { icon: '\u2713', color: 'from-rose-400 to-rose-500', label: 'True or False', name: 'T/F' }
    };
    return modeMap[mode] || { icon: '\u{1F4CA}', color: 'from-gray-400 to-gray-500', label: 'Unknown', name: 'Unknown' };
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <TopAppBar
        title="Gradebook"
        subtitle="STUDENT SCORES & PROGRESS"
        showBack
        onBack={() => setView("teacher-dashboard")}
        userName={user?.displayName}
        userAvatar={user?.avatar}
        onLogout={() => authService.signOut()}
      />

      <main className="pt-24 px-6 max-w-4xl mx-auto">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-surface-container-lowest p-5 rounded-xl shadow-xl border-2 border-tertiary-container/30">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-tertiary-container flex items-center justify-center">
                <Users className="text-tertiary" size={20} />
              </div>
            </div>
            <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Students</p>
            <p className="text-3xl font-black text-on-surface">{studentEntries.length}</p>
          </div>
          <div className="bg-surface-container-lowest p-5 rounded-xl shadow-xl border-2 border-emerald-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Trophy className="text-emerald-600" size={20} />
              </div>
            </div>
            <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Total Attempts</p>
            <p className="text-3xl font-black text-on-surface">{allScores.length}</p>
          </div>
          <div className="bg-surface-container-lowest p-5 rounded-xl shadow-xl border-2 border-secondary-container/30">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center">
                <GraduationCap className="text-secondary" size={20} />
              </div>
            </div>
            <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Classes</p>
            <p className="text-3xl font-black text-on-surface">{classes.length}</p>
          </div>
        </div>

        {studentEntries.length === 0 ? (
          <div className="bg-surface-container-lowest p-12 rounded-xl shadow-xl text-center border-2 border-tertiary-container/30">
            <GraduationCap className="mx-auto text-on-surface-variant mb-4" size={48} />
            <p className="text-on-surface-variant font-medium">No scores recorded yet.</p>
            <p className="text-on-surface-variant/60 text-sm mt-2">Student results will appear here once they complete assignments.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {studentEntries
              .sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime())
              .map((entry, idx) => {
                const avgScore = Math.round(entry.totalScore / entry.scores.length);
                const isExpanded = expandedStudent === `${entry.studentName}-${entry.classCode}`;
                const entryKey = `${entry.studentName}-${entry.classCode}`;

                return (
                  <motion.div
                    key={entryKey}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="bg-surface-container-lowest rounded-xl shadow-xl overflow-hidden border-2 border-surface-container"
                  >
                    {/* Summary Row - Always Visible */}
                    <div
                      onClick={() => setExpandedStudent(isExpanded ? null : entryKey)}
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-container-low transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        {/* Expand/Collapse Icon */}
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant"
                        >
                          <ChevronDown size={20} />
                        </motion.div>

                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-tertiary-container flex items-center justify-center text-on-tertiary-container font-black text-lg shadow-md">
                          {entry.studentName.charAt(0)}
                        </div>

                        {/* Name and Class */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-on-surface text-lg truncate">{entry.studentName}</h3>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold">
                              {entry.classCode}
                            </span>
                            <span className="text-on-surface-variant text-xs font-medium">
                              {entry.scores.length} {entry.scores.length === 1 ? 'attempt' : 'attempts'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="flex items-center gap-3 sm:gap-6">
                        <div className="text-center">
                          <div className="text-[10px] text-on-surface-variant font-bold uppercase">Avg</div>
                          <div className={`text-lg sm:text-xl font-black ${
                            avgScore >= 90 ? 'text-emerald-600' :
                            avgScore >= 70 ? 'text-primary' :
                            avgScore >= 50 ? 'text-amber-600' :
                            'text-rose-600'
                          }`}>{avgScore}%</div>
                        </div>
                        <div className="text-center hidden sm:block">
                          <div className="text-[10px] text-on-surface-variant font-bold uppercase">Best</div>
                          <div className="text-lg sm:text-xl font-black text-tertiary">{entry.bestScore}%</div>
                        </div>
                        <div className="text-center hidden sm:block">
                          <div className="text-[10px] text-on-surface-variant font-bold uppercase">Total</div>
                          <div className="text-lg sm:text-xl font-black text-secondary">{entry.totalScore}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-on-surface-variant font-bold uppercase">Last</div>
                          <div className="text-xs sm:text-sm font-bold text-primary">
                            {new Date(entry.lastDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 border-t border-surface-container">
                            {/* Detailed Stats Header */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                              <HelpTooltip content={`Average Score: ${avgScore}% - Mean performance across all attempts`}>
                                <div className="text-center p-3 bg-surface-container rounded-xl cursor-help hover:bg-surface-container-high transition-colors">
                                  <div className="text-xs text-on-surface-variant font-bold uppercase">Average</div>
                                  <div className={`text-2xl font-black ${getScoreColor(avgScore)}`}>
                                    {avgScore}%
                                  </div>
                                </div>
                              </HelpTooltip>

                              <HelpTooltip content={`Best Score: ${entry.bestScore}% - Highest score achieved`}>
                                <div className="text-center p-3 bg-tertiary-container/30 rounded-xl cursor-help hover:bg-tertiary-container/50 transition-colors">
                                  <div className="flex items-center gap-1 justify-center">
                                    <span className="text-xs text-tertiary font-bold uppercase">Best</span>
                                    <span>{'\u2B50'}</span>
                                  </div>
                                  <div className="text-2xl font-black text-tertiary">{entry.bestScore}%</div>
                                </div>
                              </HelpTooltip>

                              <HelpTooltip content={`Total Points: ${entry.totalScore} - Sum of all scores earned`}>
                                <div className="text-center p-3 bg-secondary-container/30 rounded-xl cursor-help hover:bg-secondary-container/50 transition-colors">
                                  <div className="text-xs text-secondary font-bold uppercase">Total</div>
                                  <div className="text-2xl font-black text-secondary">{entry.totalScore}</div>
                                </div>
                              </HelpTooltip>

                              <HelpTooltip content={`Last Activity: ${new Date(entry.lastDate).toLocaleString()} - Most recent attempt`}>
                                <div className="text-center p-3 bg-green-50 rounded-xl cursor-help hover:bg-green-100 transition-colors">
                                  <div className="flex items-center gap-1 justify-center">
                                    <span className="text-xs text-green-600 font-bold uppercase">Last</span>
                                    <span>{'\u{1F550}'}</span>
                                  </div>
                                  <div className="text-sm font-bold text-green-600">
                                    {new Date(entry.lastDate).toLocaleDateString()}
                                  </div>
                                </div>
                              </HelpTooltip>
                            </div>

                            {/* All Scores */}
                            <div className="mt-4">
                              <div className="flex items-center gap-2 mb-3">
                                <HelpTooltip content="Individual scores for each attempt with detailed information">
                                  <span className="text-xs text-on-surface-variant font-bold uppercase cursor-help">All Attempts</span>
                                </HelpTooltip>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {entry.scores.map((s, i) => {
                                  const modeInfo = getModeInfo(s.mode);
                                  return (
                                    <HelpTooltip
                                      key={i}
                                      content={`${modeInfo.name} Mode \u2022 ${s.score}% \u2022 ${new Date(s.completedAt).toLocaleString()} \u2022 ${s.mistakes?.length || 0} mistake${(s.mistakes?.length || 0) !== 1 ? 's' : ''}`}
                                    >
                                      <div className="flex items-center justify-between p-3 bg-surface-container rounded-xl border-2 border-surface-container-high hover:border-primary/30 hover:shadow-sm transition-all cursor-help">
                                        <div className="flex items-center gap-2">
                                          <span className="text-lg">{modeInfo.icon}</span>
                                          <div>
                                            <div className="font-bold text-on-surface text-sm">{modeInfo.name}</div>
                                            <div className="text-[10px] text-on-surface-variant">{modeInfo.label}</div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <div className={`px-3 py-1 rounded-lg font-bold text-sm ${getScoreColor(s.score)}`}>
                                            {s.score}%
                                          </div>
                                          <div className="text-[10px] text-on-surface-variant">
                                            {new Date(s.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                          </div>
                                        </div>
                                      </div>
                                    </HelpTooltip>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
          </div>
        )}

        {/* Enrolled Students Without Scores */}
        {(() => {
          const scoredNames = new Set(studentEntries.map(e => e.studentName));
          const noScoreStudents = classStudents.filter(s => !scoredNames.has(s.name));
          if (noScoreStudents.length === 0) return null;
          return (
            <div className="bg-surface-container-lowest rounded-xl shadow-xl p-6 mt-6 border-2 border-surface-container">
              <h3 className="text-lg font-black text-on-surface mb-1 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-tertiary-container flex items-center justify-center">
                  <UserCircle size={20} className="text-tertiary" />
                </div>
                Enrolled Students ({noScoreStudents.length})
              </h3>
              <p className="text-on-surface-variant text-xs mb-4 font-medium">Students who joined but haven't completed any assignments yet.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {noScoreStudents.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-surface-container rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center font-bold text-sm">
                      {s.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-on-surface text-sm truncate">{s.name}</p>
                      <p className="text-on-surface-variant text-xs font-medium">{classes.find(c => c.code === s.classCode)?.name || s.classCode}</p>
                    </div>
                    <span className="text-xs text-on-surface-variant font-medium">Last: {new Date(s.lastActive).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}
