import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { gameActiveT } from "../../locales/student/game-active";
import { getPronunciationSpeed, setPronunciationSpeed, type PronunciationSpeed } from "../../hooks/useAudio";

interface GameHeaderProps {
  score: number;
  xp: number;
  streak: number;
  onExit: () => void;
}

// Streak tier styling — each tier brightens the chip so the player can feel
// the run getting hotter without us having to explain anything in text.
// Glow + pulse only switch on at tier 'warm' (streak >= 3) so casual
// 1-2-correct runs don't read as a celebration.
const streakTier = (streak: number): 'normal' | 'warm' | 'hot' | 'blazing' => {
  if (streak >= 10) return 'blazing';
  if (streak >= 5) return 'hot';
  if (streak >= 3) return 'warm';
  return 'normal';
};

const STREAK_STYLES = {
  normal:  { chip: 'bg-orange-100',                                                       text: 'text-orange-600', glow: '',                                emoji: '🔥',  pulse: false, pulseDur: 0 },
  warm:    { chip: 'bg-gradient-to-r from-amber-100 to-orange-200',                       text: 'text-orange-700', glow: 'shadow-md shadow-orange-400/40',  emoji: '🔥',  pulse: true,  pulseDur: 1.4 },
  hot:     { chip: 'bg-gradient-to-r from-orange-200 via-orange-300 to-red-200',          text: 'text-red-700',    glow: 'shadow-lg shadow-orange-500/60',  emoji: '🔥🔥', pulse: true,  pulseDur: 1.0 },
  blazing: { chip: 'bg-gradient-to-r from-amber-300 via-orange-400 to-red-400 text-white',text: 'text-white',      glow: 'shadow-xl shadow-red-500/70',     emoji: '🔥⚡', pulse: true,  pulseDur: 0.7 },
} as const;

export default function GameHeader({
  score, xp, streak, onExit,
}: GameHeaderProps) {
  const { language } = useLanguage();
  const t = gameActiveT[language];
  const tier = streakTier(streak);
  const s = STREAK_STYLES[tier];

  // Pronunciation speed lives as a module-level setting in useAudio (so
  // every speak() call reads it without prop-threading); mirror it in
  // local state purely to re-render this button's label on toggle.
  const [speed, setSpeed] = useState<PronunciationSpeed>(getPronunciationSpeed());
  const toggleSpeed = () => {
    const next: PronunciationSpeed = speed === "slow" ? "normal" : "slow";
    setPronunciationSpeed(next);
    setSpeed(next);
  };
  return (
    <div className="w-full max-w-4xl lg:max-w-5xl flex flex-wrap justify-between items-center gap-1 mb-1.5 sm:mb-6">
      <div className="flex items-center gap-1.5 sm:gap-4 flex-wrap">
        <div className="bg-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl shadow-sm flex items-center gap-1.5">
          <Trophy className="text-amber-500" size={16} />
          <span className="font-black text-stone-800 text-sm sm:text-base" dir="ltr">{score}</span>
        </div>
        <div className="bg-blue-50 px-2 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl flex items-center gap-1.5">
          {/* XP token is a brand label, not translated; force LTR so
              "XP: 42" never becomes "42 :XP" under RTL chrome. */}
          <span className="text-blue-700 font-bold text-[10px] sm:text-xs uppercase tracking-widest" dir="ltr">XP: {xp}</span>
        </div>
        {streak > 0 && (
          <motion.div
            key={tier} /* remount on tier change so scale-in re-fires */
            initial={{ scale: 0 }}
            animate={s.pulse ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={s.pulse
              ? { scale: { repeat: Infinity, duration: s.pulseDur, ease: 'easeInOut' } }
              : { type: 'spring', stiffness: 280, damping: 18 }}
            style={{ transformOrigin: 'center' }}
            className={`relative px-3 sm:px-4 py-2 rounded-xl flex items-center gap-2 ${s.chip} ${s.glow}`}
          >
            {/* Emoji + number kept together as an LTR atom so the
                flame leads the count even when the surrounding chrome
                is RTL. */}
            <span className={`font-bold text-xs uppercase tracking-widest ${s.text}`} dir="ltr">{s.emoji} {streak}</span>
            {tier === 'blazing' && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-amber-200/0 via-amber-100/40 to-amber-200/0"
                animate={{ opacity: [0, 0.7, 0] }}
                transition={{ repeat: Infinity, duration: 1.3, ease: 'easeInOut' }}
              />
            )}
          </motion.div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleSpeed}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className="flex items-center gap-1.5 bg-white px-3 sm:px-4 py-2 rounded-full shadow-sm hover:bg-stone-50 transition-colors"
          aria-label={t.pronunciationSpeed}
          title={`${t.pronunciationSpeed}: ${speed === "slow" ? t.speedSlow : t.speedNormal}`}
        >
          <span className="text-base leading-none" aria-hidden>{speed === "slow" ? "🐢" : "🐇"}</span>
          <span className="text-xs font-bold text-stone-600">{speed === "slow" ? t.speedSlow : t.speedNormal}</span>
        </button>
        <button
          onClick={onExit}
          className="signature-gradient text-white px-4 py-2 rounded-lg font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg"
        >{t.exit}</button>
      </div>
    </div>
  );
}
