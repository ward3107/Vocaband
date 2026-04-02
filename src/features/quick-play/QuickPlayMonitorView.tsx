import React from "react";
import { motion } from "motion/react";
import { QrCode, Copy, Users, BookOpen } from "lucide-react";
import { useUI } from "../../shared/contexts/UIContext";
import type { Word } from "../../shared/types";

interface QuickPlayActiveSession {
  id: string;
  sessionCode: string;
  wordIds: number[];
  words: Word[];
}

interface JoinedStudent {
  name: string;
  score: number;
  avatar: string;
}

export interface QuickPlayMonitorViewProps {
  quickPlayActiveSession: QuickPlayActiveSession | null;
  quickPlayJoinedStudents: JoinedStudent[];
  setView: (view: string) => void;
  setQuickPlayActiveSession: (session: QuickPlayActiveSession | null) => void;
  setQuickPlaySelectedWords: (words: Word[]) => void;
  setQuickPlaySessionCode: (code: string | null) => void;
  setQuickPlayJoinedStudents: (students: JoinedStudent[]) => void;
  setQuickPlayCustomWords: (words: Map<string, { hebrew: string; arabic: string }>) => void;
  setQuickPlayAddingCustom: (adding: Set<string>) => void;
  setQuickPlayTranslating: (translating: Set<string>) => void;
  setEndQuickPlayModal: (open: boolean) => void;
}

export const QuickPlayMonitorView: React.FC<QuickPlayMonitorViewProps> = ({
  quickPlayActiveSession,
  quickPlayJoinedStudents,
  setView,
  setQuickPlayActiveSession,
  setQuickPlaySelectedWords,
  setQuickPlaySessionCode,
  setQuickPlayJoinedStudents,
  setQuickPlayCustomWords,
  setQuickPlayAddingCustom,
  setQuickPlayTranslating,
  setEndQuickPlayModal,
}) => {
  const { showToast } = useUI();

  if (!quickPlayActiveSession) {
    setView("quick-play-setup");
    return null;
  }

  // Fix QR code for local development: use local network IP instead of localhost
  // so phones can scan and access the game
  const getNetworkOrigin = () => {
    const origin = window.location.origin;
    if (origin.includes('localhost')) {
      // In development, use local network IP so phones can connect
      return 'http://10.0.0.5:3000';
    }
    return origin;
  };
  const qrUrl = `${getNetworkOrigin()}/quick-play?session=${quickPlayActiveSession.sessionCode}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-3 sm:p-6 text-white">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <button
            onClick={() => {
              setView("teacher-dashboard");
              setQuickPlayActiveSession(null);
              setQuickPlaySelectedWords([]);
              setQuickPlaySessionCode(null);
              setQuickPlayJoinedStudents([]);
              setQuickPlayCustomWords(new Map());
              setQuickPlayAddingCustom(new Set());
              setQuickPlayTranslating(new Set());
            }}
            className="text-white/80 font-bold flex items-center gap-1 hover:text-white text-sm sm:text-base bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full border border-white/30 hover:bg-white/30 transition-all"
          >
            ← Back to Dashboard
          </button>
          <button
            onClick={() => {
              console.log('[End Session] Button clicked');
              console.log('[End Session] Session:', quickPlayActiveSession);
              showToast("Opening end session confirmation...", "info");
              setEndQuickPlayModal(true);
            }}
            className="bg-red-500 hover:bg-red-600 text-white px-4 sm:px-5 py-2 rounded-full font-bold transition-all text-sm sm:text-base shadow-lg hover:shadow-xl hover:scale-105"
          >
            End Session
          </button>
        </div>

        <div className="text-center mb-6 sm:mb-8">
          <motion.h1
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl sm:text-5xl font-black mb-2 drop-shadow-2xl"
          >
            🎮 Quick Play
          </motion.h1>
          <p className="text-white/90 font-bold text-xs sm:text-base">
            Scan QR code to play • {quickPlayActiveSession.words.length} words • No login required
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* QR Code Section */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-white/20">
            <h2 className="text-lg sm:text-xl font-black mb-3 sm:mb-4 flex items-center gap-2">
              <QrCode size={20} sm:size={24} />
              QR Code
            </h2>

            {/* QR Code Display */}
            <div className="bg-white rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
              <div className="aspect-square max-w-[200px] sm:max-w-[250px] mx-auto">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrUrl)}`}
                  alt="Quick Play QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <p className="text-xs sm:text-sm text-white/80 text-center mb-3 sm:mb-4">
              Session Code: <span className="bg-white text-purple-600 px-3 py-1 rounded-lg font-mono font-black ml-1">
                {quickPlayActiveSession.sessionCode}
              </span>
            </p>

            <button
              onClick={() => {
                navigator.clipboard.writeText(qrUrl);
                showToast("Link copied to clipboard!", "success");
              }}
              className="w-full px-4 py-3 bg-white/20 hover:bg-white/30 border-2 border-white/30 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <Copy size={16} sm:size={18} />
              Copy Link
            </button>
          </div>

          {/* Live Stats Section */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-white/20">
            <h2 className="text-lg sm:text-xl font-black mb-3 sm:mb-4 flex items-center gap-2">
              <Users size={20} sm:size={24} />
              Live Stats
            </h2>

            <div className="space-y-3 sm:space-y-4">
              {/* Students Joined */}
              <div className="bg-white/10 rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm font-bold">Students Joined</span>
                  <span className="text-xl sm:text-2xl font-black">{quickPlayJoinedStudents.length}</span>
                </div>
              </div>

              {/* Live Leaderboard */}
              {quickPlayJoinedStudents.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-black text-white/80">LIVE LEADERBOARD</h3>
                  {quickPlayJoinedStudents
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5)
                    .map((student, idx) => (
                      <div
                        key={student.name}
                        className="bg-white/10 rounded-xl p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black">#{idx + 1}</span>
                          <span className="text-2xl">{student.avatar}</span>
                          <span className="font-bold">{student.name}</span>
                        </div>
                        <span className="text-xl font-black">{student.score}</span>
                      </div>
                    ))}
                </div>
              )}

              {quickPlayJoinedStudents.length === 0 && (
                <div className="text-center py-8 text-white/60">
                  <Users size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="font-bold">Waiting for students to join...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Words Preview */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mt-6">
          <h2 className="text-xl font-black mb-4 flex items-center gap-2">
            <BookOpen size={24} />
            Words ({quickPlayActiveSession.words.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {quickPlayActiveSession.words.map(word => (
              <span
                key={word.id}
                className="px-3 py-1 bg-white/20 rounded-full text-sm font-bold"
              >
                {word.english}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
