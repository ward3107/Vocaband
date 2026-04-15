import { Zap, Trophy, Check, Copy } from "lucide-react";
import { getXpTitle } from "../../constants/game";
import type { AppUser } from "../../core/supabase";

interface StudentGreetingCardProps {
  user: AppUser;
  xp: number;
  streak: number;
  badges: string[];
  copiedCode: string | null;
  setCopiedCode: React.Dispatch<React.SetStateAction<string | null>>;
}

export default function StudentGreetingCard({
  user, xp, streak, badges, copiedCode, setCopiedCode,
}: StudentGreetingCardProps) {
  const handleCopyCode = () => {
    navigator.clipboard.writeText(user.classCode || "");
    setCopiedCode(user.classCode || "");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const xpTitle = getXpTitle(xp);

  return (
    <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
      <div className="w-14 h-14 sm:w-12 sm:h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">
        {user.avatar}
      </div>
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900">Hello, {user.displayName}!</h1>
        <p className="text-stone-500 font-bold text-base sm:text-sm">
          Class Code:{" "}
          <button
            onClick={handleCopyCode}
            className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg font-mono hover:bg-blue-100 active:scale-95 transition-all inline-flex items-center gap-1"
            title="Tap to copy code"
          >
            {user.classCode}{" "}
            {copiedCode === user.classCode ? (
              <Check size={14} className="text-blue-700" />
            ) : (
              <Copy size={14} className="text-blue-400" />
            )}
          </button>
        </p>
        <div className="mt-2 flex flex-wrap gap-2 items-center">
          <div className="bg-amber-50 text-amber-800 px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1 border border-amber-200">
            <Zap size={14} /> {xp} XP
          </div>
          <div className="bg-purple-50 text-purple-800 px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1 border border-purple-200">
            {xpTitle.emoji} {xpTitle.title}
          </div>
          {streak > 0 && (
            <div className="bg-orange-50 text-orange-800 px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1 border border-orange-200">
              🔥 {streak} streak
            </div>
          )}
          {badges.map(badge => (
            <div
              key={badge}
              className="bg-blue-50 text-blue-900 px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1"
            >
              <Trophy size={14} />
              {badge}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
