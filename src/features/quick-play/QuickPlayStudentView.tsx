import React from "react";
import { Loader2, QrCode } from "lucide-react";
import type { Word } from "../../shared/types";
import type { AppUser } from "../../shared/types";
import { useAuth } from "../auth/AuthContext";
import { useUI } from "../../shared/contexts/UIContext";
import { shuffle } from "../../shared/utils/helpers";

export interface QuickPlayStudentViewProps {
  quickPlayActiveSession: { id: string; sessionCode: string; wordIds: number[]; words: Word[] } | null;
  quickPlayStudentName: string;
  setQuickPlayStudentName: (v: string) => void;
  setAssignmentWords: (words: Word[]) => void;
  setCurrentIndex: (v: number) => void;
  setScore: (v: number) => void;
  setFeedback: (v: "correct" | "wrong" | "show-answer" | null) => void;
  setIsFinished: (v: boolean) => void;
  setMistakes: (v: number[]) => void;
  setShowModeSelection: (v: boolean) => void;
  createGuestUser: (name: string, prefix?: string) => AppUser;
  setView: (v: string) => void;
  showModeSelection: boolean;
  view: string;
}

export function QuickPlayStudentView({
  quickPlayActiveSession,
  quickPlayStudentName,
  setQuickPlayStudentName,
  setAssignmentWords,
  setCurrentIndex,
  setScore,
  setFeedback,
  setIsFinished,
  setMistakes,
  setShowModeSelection,
  createGuestUser,
  setView,
  showModeSelection,
  view,
}: QuickPlayStudentViewProps) {
  const { setUser } = useAuth();
  const { showToast } = useUI();

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <header className="w-full sticky top-0 bg-surface flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 z-50">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl signature-gradient flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-white text-xl sm:text-2xl font-black font-headline italic">V</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-black tracking-tight font-headline signature-gradient-text">Vocaband</span>
            <span className="text-[9px] sm:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-none hidden sm:block">Quick Play</span>
          </div>
        </div>
        <button
          onClick={() => {
            // If in game mode, go back to mode selection; otherwise go to landing
            if (view === "game" && showModeSelection) {
              setShowModeSelection(false);
            } else if (view === "game") {
              setView("quick-play-student");
            } else {
              setView("public-landing");
            }
          }}
          className="text-on-surface-variant font-bold text-sm hover:text-on-surface flex items-center gap-1"
        >
          ← Back
        </button>
      </header>

      <main className="flex-grow flex flex-col items-center px-4 py-3 sm:py-6 max-w-4xl mx-auto w-full">
          {!quickPlayActiveSession ? (
            <div className="text-center py-12 sm:py-20">
              <Loader2 className="mx-auto animate-spin text-primary mb-4" size={36} />
              <p className="text-on-surface-variant font-bold text-sm sm:text-base">Loading Quick Play session...</p>
            </div>
          ) : !quickPlayStudentName ? (
            <div className="w-full max-w-md">
              <div className="text-center mb-6 sm:mb-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <QrCode className="text-white" size={32} />
                </div>
                <h1 className="text-2xl sm:text-4xl font-black text-on-surface mb-2">Quick Play!</h1>
                <p className="text-sm sm:text-base text-on-surface-variant font-bold">{quickPlayActiveSession.words.length} words • No login needed</p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="relative">
                  <label className="absolute -top-2.5 left-4 px-2 bg-surface text-primary font-black text-xs z-10">YOUR NAME</label>
                  <input
                    id="quick-play-name-input"
                    type="text"
                    inputMode="text"
                    autoCapitalize="words"
                    autoComplete="off"
                    defaultValue={quickPlayStudentName}
                    placeholder="Enter your nickname..."
                    className="w-full px-4 py-3 sm:py-4 bg-transparent border-4 border-stone-200 rounded-2xl text-base sm:text-lg font-black text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus
                  />
                </div>

                <button
                  data-quick-play-join
                  onClick={() => {
                    const input = document.getElementById('quick-play-name-input') as HTMLInputElement;
                    const trimmedName = input?.value.trim() || "";

                    if (!trimmedName) {
                      showToast("Please enter your name first", "error");
                      return;
                    }

                    if (!quickPlayActiveSession) {
                      showToast("Session expired. Please scan QR code again.", "error");
                      return;
                    }

                    if (!quickPlayActiveSession.words || quickPlayActiveSession.words.length === 0) {
                      showToast("This session has no words. Please contact your teacher.", "error");
                      return;
                    }

                    setTimeout(() => {
                      setQuickPlayStudentName(trimmedName);
                      const guestUser = createGuestUser(trimmedName, "quickplay");
                      setUser(guestUser);

                      const words = shuffle(quickPlayActiveSession.words).map(w => ({
                        ...w,
                        hebrew: w.hebrew || "",
                        arabic: w.arabic || ""
                      }));

                      setAssignmentWords(words);
                      setCurrentIndex(0);
                      setScore(0);
                      setFeedback(null);
                      setIsFinished(false);
                      setMistakes([]);
                      setView("game");
                      setShowModeSelection(true);
                    }, 100);
                  }}
                  className="w-full py-3 sm:py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-black text-base sm:text-lg hover:opacity-90 transition-all shadow-lg"
                >
                  Start Playing →
                </button>
              </div>

              <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-surface-container-low rounded-2xl border-2 border-surface-container-highest">
                <p className="text-xs sm:text-sm text-on-surface-variant text-center">
                  ℹ️ Your progress won't be saved (guest mode). Create an account to track your XP and unlock features!
                </p>
              </div>
            </div>
          ) : null}
      </main>
    </div>
  );
}
