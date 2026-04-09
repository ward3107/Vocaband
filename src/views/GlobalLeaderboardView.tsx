import { Trophy } from "lucide-react";
import { motion } from "motion/react";
import type { AppUser } from "../core/supabase";

interface GlobalLeaderboardViewProps {
  user: AppUser | null;
  globalLeaderboard: { name: string; score: number; avatar: string }[];
  setView: (view: string) => void;
}

const GlobalLeaderboardView = ({ user, globalLeaderboard, setView }: GlobalLeaderboardViewProps) => {
  return (
    <div className="min-h-screen bg-stone-100 p-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setView(user?.role === "teacher" ? "teacher-dashboard" : "student-dashboard")}
          className="mb-6 text-stone-500 font-bold flex items-center gap-1 hover:text-stone-900 bg-white px-3 py-2 rounded-full"
        >
          ← Back to Dashboard
        </button>
        <div className="bg-white rounded-[40px] shadow-xl p-6 sm:p-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-yellow-100 rounded-3xl">
              <Trophy size={40} className="text-yellow-600" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-stone-900">Global Top 10</h2>
              <p className="text-stone-500">The best students across all classes!</p>
            </div>
          </div>

          <div className="space-y-4">
            {globalLeaderboard.map((entry, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex justify-between items-center p-5 bg-stone-50 rounded-2xl border border-stone-100"
              >
                <div className="flex items-center gap-4">
                  <span className={`w-8 h-8 flex items-center justify-center rounded-full font-black text-sm ${
                    idx === 0 ? "bg-yellow-400 text-white" :
                    idx === 1 ? "bg-stone-300 text-white" :
                    idx === 2 ? "bg-orange-300 text-white" :
                    "bg-stone-200 text-stone-500"
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="text-3xl">{entry.avatar}</span>
                  <span className="font-black text-stone-800 text-lg">{entry.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-blue-700">{entry.score}</p>
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Points</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalLeaderboardView;
