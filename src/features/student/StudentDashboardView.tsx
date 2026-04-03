import React, { useState } from "react";
import {
  Zap,
  Trophy,
  BookOpen,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import * as authService from "../../services/authService";
import FloatingButtons from "../../shared/components/FloatingButtons";
import { getXpTitle } from "../../shared/constants/game";
import { ALL_WORDS } from "../../data/vocabulary";
import type { AssignmentData, ProgressData } from "../../core/supabase";
import type { Word } from "../../shared/types";

interface ActiveThemeConfig {
  colors: { bg: string; card: string; text: string; accent: string };
}

export interface StudentDashboardViewProps {
  xp: number;
  streak: number;
  badges: string[];
  studentAssignments: AssignmentData[];
  studentProgress: ProgressData[];
  studentDataLoading: boolean;
  activeThemeConfig: ActiveThemeConfig;
  consentModal: React.ReactNode;
  setView: (view: string) => void;
  setActiveAssignment: (a: AssignmentData) => void;
  setAssignmentWords: (words: Word[]) => void;
  setShowModeSelection: (v: boolean) => void;
  setShopTab: (tab: "avatars" | "themes" | "powerups" | "titles" | "frames" | "boosters") => void;
}

export function StudentDashboardView({
  xp,
  streak,
  badges,
  studentAssignments,
  studentProgress,
  studentDataLoading,
  activeThemeConfig,
  consentModal,
  setView,
  setActiveAssignment,
  setAssignmentWords,
  setShowModeSelection,
  setShopTab,
}: StudentDashboardViewProps) {
  const { user } = useAuth();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!user) return null;

  const toProgressValue = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className={`min-h-screen ${activeThemeConfig.colors.bg} p-4 sm:p-6`}>
      {consentModal}
      <div className="max-w-4xl mx-auto">
        {/* Top bar with logout */}
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setView("privacy-settings")} className="px-3 py-2 text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded-xl text-xs font-bold transition-all" title="Privacy Settings">
            Privacy
          </button>
          <button onClick={() => { setShopTab("avatars"); setView("shop"); }} className="px-6 py-2.5 bg-gradient-to-r from-pink-400 to-rose-500 text-white font-bold rounded-xl hover:from-pink-500 hover:to-rose-600 transition-all text-base flex items-center gap-2 shadow-lg shadow-pink-500/30 animate-pulse">
            🛍️ Shop
          </button>
          <button onClick={() => authService.signOut()} className="px-4 py-2 text-stone-500 font-bold hover:text-red-500 hover:bg-red-50 rounded-xl text-sm transition-all">Logout</button>
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
                  const allowedModes = (a.allowedModes || ["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse"]).filter(m => m !== "flashcards");
                  const completedModes = new Set(
                    studentProgress.filter(p => p.assignmentId === a.id && p.mode !== "flashcards").map(p => p.mode)
                  ).size;
                  return completedModes >= allowedModes.length;
                }).length / studentAssignments.length) * 100)}
              />
              <span className="font-bold text-stone-500 text-sm sm:text-sm">
                {studentAssignments.filter(a => {
                  const allowedModes = (a.allowedModes || ["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse"]).filter(m => m !== "flashcards");
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

          {/* Background loading indicator */}
          {studentDataLoading && (
            <div className="mb-4 p-3 bg-blue-50 rounded-xl flex items-center gap-2 animate-pulse">
              <RefreshCw className="text-blue-700 animate-spin" size={16} />
              <span className="text-blue-800 font-bold text-sm">Loading your assignments...</span>
            </div>
          )}

          {studentAssignments.length === 0 && !studentDataLoading ? (
            <p className="text-stone-400 italic text-center py-10 text-base sm:text-sm">No assignments yet. Check back later!</p>
          ) : (
            <div className="space-y-5 sm:space-y-4">
              {studentAssignments.map((assignment, assignmentIdx) => {
                const allowedModes = (assignment.allowedModes || ["classic", "listening", "spelling", "matching", "true-false", "flashcards", "scramble", "reverse"]).filter(m => m !== "flashcards");
                const totalModes = allowedModes.length;

                // Find unique modes completed for this assignment (flashcards excluded from progress)
                const completedModes = new Set(
                  studentProgress
                    .filter(p => p.assignmentId === assignment.id && p.mode !== "flashcards")
                    .map(p => p.mode)
                ).size;

                const progressPercentage = Math.min(100, Math.round((completedModes / Math.max(totalModes, 1)) * 100));
                const isComplete = completedModes >= totalModes;

                // Cycle through accent colors for visual differentiation
                const accentColors = [
                  { bg: "bg-blue-50", border: "border-blue-100", hoverBorder: "hover:border-blue-300", bar: "[&::-webkit-progress-value]:bg-blue-600 [&::-moz-progress-bar]:bg-blue-600", btn: "bg-blue-700 hover:bg-blue-800", strip: "bg-blue-500" },
                  { bg: "bg-purple-50", border: "border-purple-100", hoverBorder: "hover:border-purple-300", bar: "[&::-webkit-progress-value]:bg-purple-600 [&::-moz-progress-bar]:bg-purple-600", btn: "bg-purple-700 hover:bg-purple-800", strip: "bg-purple-500" },
                  { bg: "bg-emerald-50", border: "border-emerald-100", hoverBorder: "hover:border-emerald-300", bar: "[&::-webkit-progress-value]:bg-emerald-600 [&::-moz-progress-bar]:bg-emerald-600", btn: "bg-emerald-700 hover:bg-emerald-800", strip: "bg-emerald-500" },
                  { bg: "bg-amber-50", border: "border-amber-100", hoverBorder: "hover:border-amber-300", bar: "[&::-webkit-progress-value]:bg-amber-600 [&::-moz-progress-bar]:bg-amber-600", btn: "bg-amber-700 hover:bg-amber-800", strip: "bg-amber-500" },
                  { bg: "bg-rose-50", border: "border-rose-100", hoverBorder: "hover:border-rose-300", bar: "[&::-webkit-progress-value]:bg-rose-600 [&::-moz-progress-bar]:bg-rose-600", btn: "bg-rose-700 hover:bg-rose-800", strip: "bg-rose-500" },
                  { bg: "bg-cyan-50", border: "border-cyan-100", hoverBorder: "hover:border-cyan-300", bar: "[&::-webkit-progress-value]:bg-cyan-600 [&::-moz-progress-bar]:bg-cyan-600", btn: "bg-cyan-700 hover:bg-cyan-800", strip: "bg-cyan-500" },
                ];
                const accent = accentColors[assignmentIdx % accentColors.length];

                return (
                  <div key={assignment.id} className={`${accent.bg} p-5 sm:p-6 rounded-3xl border-2 ${accent.border} ${accent.hoverBorder} transition-colors relative overflow-hidden`}>
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${accent.strip} rounded-l-3xl`} />
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                      <div className="flex-1">
                        <h3 className="text-xl sm:text-xl font-bold text-stone-800">{assignment.title}</h3>
                        <p className="text-stone-500 text-base sm:text-sm font-medium mt-2 sm:mt-1">
                          {assignment.wordIds.length} Vocabulary Words
                          {assignment.deadline && ` • Due: ${new Date(assignment.deadline).toLocaleDateString()}`}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const filteredWords = assignment.words || ALL_WORDS.filter(w => assignment.wordIds.includes(w.id));
                          setActiveAssignment(assignment);
                          setAssignmentWords(filteredWords);
                          // Use startTransition for non-urgent view change so React can paint immediately
                          React.startTransition(() => {
                            setView("game");
                            setShowModeSelection(true);
                          });
                        }}
                        className={`w-full sm:w-auto px-6 py-4 sm:py-3 ${accent.btn} text-white rounded-xl font-bold transition-colors whitespace-nowrap text-base sm:text-sm`}
                      >
                        {isComplete ? "Play Again" : "Start Learning"}
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm sm:text-xs font-bold mb-3 sm:mb-2">
                        <span className="text-stone-500 uppercase tracking-widest">Progress</span>
                        <span className={isComplete ? "text-blue-700" : "text-stone-500"}>
                          {completedModes} / {totalModes} Modes ({progressPercentage}%)
                        </span>
                      </div>
                      <progress
                        className={`h-4 sm:h-3 w-full rounded-full overflow-hidden [&::-webkit-progress-bar]:bg-stone-200 ${accent.bar}`}
                        max={100}
                        value={toProgressValue(progressPercentage)}
                      />
                    </div>
                  </div>
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
