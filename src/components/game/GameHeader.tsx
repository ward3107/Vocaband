import { motion } from "framer-motion";
import { Trophy, Languages } from "lucide-react";

interface GameHeaderProps {
  score: number;
  xp: number;
  streak: number;
  targetLanguage: "hebrew" | "arabic";
  setTargetLanguage: React.Dispatch<React.SetStateAction<"hebrew" | "arabic">>;
  onExit: () => void;
}

export default function GameHeader({
  score, xp, streak, targetLanguage, setTargetLanguage, onExit,
}: GameHeaderProps) {
  return (
    <div className="w-full max-w-4xl flex flex-wrap justify-between items-center gap-1 mb-1.5 sm:mb-6">
      <div className="flex items-center gap-1.5 sm:gap-4 flex-wrap">
        <div className="bg-white px-2 sm:px-4 py-1 sm:py-2 rounded-xl sm:rounded-2xl shadow-sm flex items-center gap-1.5">
          <Trophy className="text-amber-500" size={16} />
          <span className="font-black text-stone-800 text-sm sm:text-base">{score}</span>
        </div>
        <div className="bg-blue-50 px-2 sm:px-4 py-1 sm:py-2 rounded-xl sm:rounded-2xl flex items-center gap-1.5">
          <span className="text-blue-700 font-bold text-[10px] sm:text-xs uppercase tracking-widest">XP: {xp}</span>
        </div>
        {streak > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-orange-100 px-3 sm:px-4 py-2 rounded-2xl flex items-center gap-2"
          >
            <span className="text-orange-600 font-bold text-xs uppercase tracking-widest">🔥 {streak}</span>
          </motion.div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTargetLanguage(targetLanguage === "hebrew" ? "arabic" : "hebrew")}
          className="flex items-center gap-2 bg-white px-3 sm:px-4 py-2 rounded-full shadow-sm hover:bg-stone-50 transition-colors"
        >
          <Languages size={18} />
          <span className="text-sm font-bold">{targetLanguage === "hebrew" ? "עברית" : "عربي"}</span>
        </button>
        <button
          onClick={onExit}
          className="signature-gradient text-white px-4 py-2 rounded-lg font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg"
        >Exit</button>
      </div>
    </div>
  );
}
