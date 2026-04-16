import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Zap, Check, Copy, Flame } from "lucide-react";
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

/**
 * Vibrant hero with a gradient backdrop, animated avatar ring, and a
 * time-of-day greeting. Designed to feel alive — the avatar bobs gently,
 * XP value rolls up on mount, and the streak flame flickers if the student
 * has a streak going.
 */
export default function StudentGreetingCard({
  user, xp, streak, copiedCode, setCopiedCode,
}: StudentGreetingCardProps) {
  const handleCopyCode = () => {
    navigator.clipboard.writeText(user.classCode || "");
    setCopiedCode(user.classCode || "");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const xpTitle = getXpTitle(xp);

  // Roll-up XP counter on mount for a "wow" entrance.
  const [displayedXp, setDisplayedXp] = useState(0);
  useEffect(() => {
    const duration = 900;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayedXp(Math.round(eased * xp));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [xp]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[28px] sm:rounded-[32px] mb-6 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-5 sm:p-7 shadow-xl shadow-violet-500/20"
    >
      {/* Soft glow blobs in the background — pure decoration */}
      <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 bg-pink-400/30 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-400/25 rounded-full blur-3xl" />

      <div className="relative flex items-center gap-4 sm:gap-5">
        {/* Animated avatar — gentle bob + pulsing ring */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="relative shrink-0"
        >
          <div className="absolute inset-0 rounded-3xl bg-white/40 blur-md animate-pulse" />
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-3xl flex items-center justify-center text-3xl sm:text-4xl shadow-lg ring-4 ring-white/30">
            {user.avatar || '🦊'}
          </div>
          {streak > 0 && (
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-orange-400 to-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-md flex items-center gap-0.5 border-2 border-white">
              <Flame size={10} className="fill-white" />
              {streak}
            </div>
          )}
        </motion.div>

        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-bold text-white/80 tracking-wide">
            {greeting},
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-white truncate leading-tight">
            {user.displayName} <span className="inline-block">👋</span>
          </h1>
          {/* Title + class code inline */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <span className="bg-white/20 backdrop-blur-sm text-white font-bold px-2.5 py-0.5 rounded-full border border-white/30 flex items-center gap-1">
              {xpTitle.emoji} {xpTitle.title}
            </span>
            <button
              onClick={handleCopyCode}
              type="button"
              style={{ touchAction: 'manipulation' }}
              className="bg-white/10 hover:bg-white/20 text-white/90 font-mono font-bold px-2.5 py-0.5 rounded-full border border-white/20 inline-flex items-center gap-1 active:scale-95 transition-all"
              title="Tap to copy class code"
            >
              {user.classCode}
              {copiedCode === user.classCode ? (
                <Check size={12} />
              ) : (
                <Copy size={12} className="opacity-70" />
              )}
            </button>
          </div>
        </div>

        {/* XP orb on the right — big, juicy, with rolling number */}
        <div className="hidden sm:flex shrink-0 flex-col items-center justify-center bg-white/15 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/20">
          <div className="flex items-center gap-1 text-amber-200">
            <Zap size={18} className="fill-amber-200" />
            <span className="text-2xl font-black text-white tabular-nums">{displayedXp}</span>
          </div>
          <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider mt-0.5">XP</span>
        </div>
      </div>

      {/* Mobile XP pill — shown instead of the orb below 640px */}
      <div className="sm:hidden mt-4 flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/20 w-fit">
        <Zap size={14} className="text-amber-200 fill-amber-200" />
        <span className="text-white font-black tabular-nums text-sm">{displayedXp} XP</span>
      </div>
    </motion.div>
  );
}
