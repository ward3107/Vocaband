import React from "react";
import { motion } from "motion/react";
import { Check, Copy, Zap, Trophy, BookOpen, RefreshCw, Play, Star } from "lucide-react";
import { supabase, type AppUser, type AssignmentData, type ProgressData } from "../core/supabase";
import { ALL_WORDS } from "../data/vocabulary";
import { getXpTitle } from "../constants/game";
import { getGameModeDef } from "../components/setup/types";
import FloatingButtons from "../components/FloatingButtons";
import StudentOnboarding from "../components/StudentOnboarding";

interface StudentDashboardViewProps {
  user: AppUser;
  consentModal: React.ReactNode;
  showStudentOnboarding: boolean;
  setShowStudentOnboarding: (v: boolean) => void;
  activeThemeBg: string;
  xp: number;
  streak: number;
  badges: string[];
  copiedCode: string | null;
  setCopiedCode: (v: string | null) => void;
  studentAssignments: AssignmentData[];
  studentProgress: ProgressData[];
  studentDataLoading: boolean;
  toProgressValue: (v: number) => number;
  setActiveAssignment: (a: AssignmentData | null) => void;
  setAssignmentWords: (w: any[]) => void;
  setShowModeSelection: (v: boolean) => void;
  setShopTab: (v: string) => void;
  setView: (view: string) => void;
}

export default function StudentDashboardView({
  user,
  consentModal,
  showStudentOnboarding,
  setShowStudentOnboarding,
  activeThemeBg,
  xp,
  streak,
  badges,
  copiedCode,
  setCopiedCode,
  studentAssignments,
  studentProgress,
  studentDataLoading,
  toProgressValue,
  setActiveAssignment,
  setAssignmentWords,
  setShowModeSelection,
  setShopTab,
  setView,
}: StudentDashboardViewProps) {
  return (
    <div className={`min-h-screen ${activeThemeBg} p-4 sm:p-6`}>
      {consentModal}
      {showStudentOnboarding && (
        <StudentOnboarding
          userName={user.displayName}
          onComplete={() => setShowStudentOnboarding(false)}
        />
      )}
      <div className="max-w-4xl mx-auto">
        {/* Top bar with logout */}
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setView("privacy-settings")} className="px-3 py-2 text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded-xl text-xs font-bold transition-all" title="Privacy Settings">
            Privacy
          </button>
          <button onClick={() => { setShopTab("avatars"); setView("shop"); }} className="px-6 py-2.5 bg-gradient-to-r from-pink-400 to-rose-500 text-white font-bold rounded-xl hover:from-pink-500 hover:to-rose-600 transition-all text-base flex items-center gap-2 shadow-lg shadow-pink-500/30 animate-pulse">
            🛍️ Shop
          </button>
          <button onClick={() => supabase.auth.signOut()} className="px-4 py-2 text-stone-500 font-bold hover:text-red-500 hover:bg-red-50 rounded-xl text-sm transition-all">Logout</button>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-12 sm:h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">
            {user.avatar}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900">Hello, {user.displayName}!</h1>
            <p className="text-stone-500 font-bold text-base sm:text-sm">Class Code: <button onClick={() => { navigator.clipboard.writeText(user.classCode || ""); setCopiedCode(user.classCode || ""); setTimeout(() => setCopiedCode(null), 2000); }} className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg font-mono hover:bg-blue-100 active:scale-95 transition-all inline-flex items-center gap-1" title="Tap to copy code">{user.classCode} {copiedCode === user.classCode ? <Check size={14} className="text-blue-700" /> : <Copy size={14} className="text-blue-400" />}</button></p>
            <div className="mt-2 flex flex-wrap gap-2 items-center">
              <div className="bg-amber-50 text-amber-800 px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1 border border-amber-200">
                <Zap size={14} /> {xp} XP
              </div>
              <div className="bg-purple-50 text-purple-800 px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1 border border-purple-200">
                {getXpTitle(xp).emoji} {getXpTitle(xp).title}
              </div>
              {streak > 0 && (
                <div className="bg-orange-50 text-orange-800 px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1 border border-orange-200">
                  🔥 {streak} streak
                </div>
              )}
              {badges.map(badge => (
                <div key={badge} className="bg-blue-50 text-blue-900 px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1">
                  <Trophy size={14} />
                  {badge}
                </div>
              ))}
            </div>
          </div>
        </div>

        {studentAssignments.length > 0 && (
          <div className="bg-white p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] shadow-sm mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-lg font-bold text-stone-800 mb-3 sm:mb-2">Overall Progress</h3>
            <div className="flex items-center gap-3 sm:gap-4">
              <progress
                className="flex-1 h-5 sm:h-4 [&::-webkit-progress-bar]:bg-stone-100 [&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600 rounded-full overflow-hidden"
                max={100}
                value={toProgressValue((studentAssignments.filter(a => {
                  const allowedModes = (a.allowedModes || ["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse", "letter-sounds", "sentence-builder"]).filter(m => m !== "flashcards");
                  const completedModes = new Set(
                    studentProgress.filter(p => p.assignmentId === a.id && p.mode !== "flashcards").map(p => p.mode)
                  ).size;
                  return completedModes >= allowedModes.length;
                }).length / studentAssignments.length) * 100)}
              />
              <span className="font-bold text-stone-500 text-sm sm:text-sm">
                {studentAssignments.filter(a => {
                  const allowedModes = (a.allowedModes || ["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse", "letter-sounds", "sentence-builder"]).filter(m => m !== "flashcards");
                  const completedModes = new Set(
                    studentProgress.filter(p => p.assignmentId === a.id && p.mode !== "flashcards").map(p => p.mode)
                  ).size;
                  return completedModes >= allowedModes.length;
                }).length} / {studentAssignments.length}
              </span>
            </div>
          </div>
        )}

        <div className="bg-white p-5 sm:p-8 rounded-[28px] sm:rounded-[40px] shadow-xl">
          <h2 className="text-xl sm:text-2xl font-black mb-5 sm:mb-6 flex items-center gap-2">
            <BookOpen className="text-blue-700" size={22} /> Your Assignments
          </h2>

          {studentDataLoading && (
            <div className="mb-4 p-3 bg-blue-50 rounded-xl flex items-center gap-2 animate-pulse">
              <RefreshCw className="text-blue-700 animate-spin" size={16} />
              <span className="text-blue-800 font-bold text-sm">Loading your assignments...</span>
            </div>
          )}

          {studentAssignments.length === 0 && !studentDataLoading ? (
            <p className="text-stone-400 italic text-center py-10 text-base sm:text-sm">No assignments yet. Check back later!</p>
          ) : (
            <div className="space-y-6 sm:space-y-4">
              {studentAssignments.map((assignment, assignmentIdx) => {
                const allowedModes = (assignment.allowedModes || ["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse", "letter-sounds", "sentence-builder"]).filter(m => m !== "flashcards");
                const totalModes = allowedModes.length;

                const completedModeSet = new Set(
                  studentProgress
                    .filter(p => p.assignmentId === assignment.id && p.mode !== "flashcards")
                    .map(p => p.mode)
                );
                const completedModes = completedModeSet.size;

                const progressPercentage = Math.min(100, Math.round((completedModes / Math.max(totalModes, 1)) * 100));
                const isComplete = completedModes >= totalModes;

                const accentColors = [
                  { gradient: "from-blue-50 to-indigo-50", border: "border-blue-200/60", bar: "[&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600", btn: "from-blue-600 to-blue-700", btnShadow: "shadow-blue-500/30", strip: "from-blue-400 to-blue-600", glow: "bg-blue-400/20" },
                  { gradient: "from-purple-50 to-fuchsia-50", border: "border-purple-200/60", bar: "[&::-webkit-progress-value]:bg-purple-600 [&::-moz-progress-bar]:bg-purple-600", btn: "from-purple-600 to-purple-700", btnShadow: "shadow-purple-500/30", strip: "from-purple-400 to-purple-600", glow: "bg-purple-400/20" },
                  { gradient: "from-emerald-50 to-teal-50", border: "border-emerald-200/60", bar: "[&::-webkit-progress-value]:bg-emerald-600 [&::-moz-progress-bar]:bg-emerald-600", btn: "from-emerald-600 to-emerald-700", btnShadow: "shadow-emerald-500/30", strip: "from-emerald-400 to-emerald-600", glow: "bg-emerald-400/20" },
                  { gradient: "from-amber-50 to-orange-50", border: "border-amber-200/60", bar: "[&::-webkit-progress-value]:bg-amber-600 [&::-moz-progress-bar]:bg-amber-600", btn: "from-amber-600 to-amber-700", btnShadow: "shadow-amber-500/30", strip: "from-amber-400 to-amber-600", glow: "bg-amber-400/20" },
                  { gradient: "from-rose-50 to-pink-50", border: "border-rose-200/60", bar: "[&::-webkit-progress-value]:bg-rose-600 [&::-moz-progress-bar]:bg-rose-600", btn: "from-rose-600 to-rose-700", btnShadow: "shadow-rose-500/30", strip: "from-rose-400 to-rose-600", glow: "bg-rose-400/20" },
                  { gradient: "from-cyan-50 to-sky-50", border: "border-cyan-200/60", bar: "[&::-webkit-progress-value]:bg-cyan-600 [&::-moz-progress-bar]:bg-cyan-600", btn: "from-cyan-600 to-cyan-700", btnShadow: "shadow-cyan-500/30", strip: "from-cyan-400 to-cyan-600", glow: "bg-cyan-400/20" },
                ];
                const accent = accentColors[assignmentIdx % accentColors.length];

                return (
                  <motion.div
                    key={assignment.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: assignmentIdx * 0.1, duration: 0.4, ease: "easeOut" }}
                    className={`bg-gradient-to-br ${accent.gradient} p-6 sm:p-6 rounded-3xl border-2 ${accent.border} relative overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
                  >
                    {/* Decorative gradient strip */}
                    <div className={`absolute top-0 left-0 w-2 h-full bg-gradient-to-b ${accent.strip} rounded-l-3xl`} />
                    {/* Decorative glow circle */}
                    <div className={`absolute -top-12 -right-12 w-40 h-40 ${accent.glow} rounded-full blur-3xl pointer-events-none`} />

                    {/* Completion badge */}
                    {isComplete && (
                      <div className="absolute top-4 right-4 z-10">
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white text-xs font-black rounded-full shadow-lg shadow-green-500/30">
                          <Star size={12} fill="currentColor" /> All Done!
                        </span>
                      </div>
                    )}

                    {/* Title + meta */}
                    <div className="relative z-10 mb-5">
                      <h3 className="text-2xl sm:text-xl font-black text-stone-800 leading-tight pr-20">
                        {assignment.title}
                      </h3>
                      <p className="text-stone-500 text-sm font-semibold mt-2 flex items-center gap-2">
                        <BookOpen size={14} className="shrink-0" />
                        {assignment.wordIds.length} words
                        {assignment.deadline && (
                          <span className="text-stone-400">
                            &bull; Due {new Date(assignment.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Per-mode progress indicators */}
                    <div className="relative z-10 mb-4">
                      <div className="flex justify-between text-xs font-bold mb-2">
                        <span className="text-stone-400 uppercase tracking-widest">Modes</span>
                        <span className={isComplete ? "text-green-600 font-black" : "text-stone-400"}>
                          {completedModes}/{totalModes}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {allowedModes.map(modeId => {
                          const done = completedModeSet.has(modeId);
                          const modeDef = getGameModeDef(modeId);
                          return (
                            <span
                              key={modeId}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                done
                                  ? 'bg-green-100 text-green-700 ring-1 ring-green-300 shadow-sm'
                                  : 'bg-white/60 text-stone-400 ring-1 ring-stone-200/60'
                              }`}
                            >
                              <span className="text-sm">{modeDef?.emoji || '🎮'}</span>
                              <span>{modeDef?.name || modeId}</span>
                              {done && <Check size={12} className="text-green-600" />}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative z-10 mb-5">
                      <progress
                        className={`h-3 sm:h-2.5 w-full rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-white/50 ${accent.bar}`}
                        max={100}
                        value={toProgressValue(progressPercentage)}
                      />
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={() => {
                        const filteredWords = assignment.words || ALL_WORDS.filter(w => assignment.wordIds.includes(w.id));
                        setActiveAssignment(assignment);
                        setAssignmentWords(filteredWords);
                        React.startTransition(() => {
                          setView("game");
                          setShowModeSelection(true);
                        });
                      }}
                      className={`relative z-10 w-full px-6 py-4 sm:py-3.5 bg-gradient-to-r ${accent.btn} text-white rounded-2xl font-black text-lg sm:text-base shadow-lg ${accent.btnShadow} active:scale-[0.97] transition-all flex items-center justify-center gap-2`}
                    >
                      {isComplete ? (
                        <><Trophy size={18} /> Play Again</>
                      ) : (
                        <><Play size={18} fill="currentColor" /> Start Learning</>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <FloatingButtons showBackToTop={true} />
    </div>
  );
}
