/**
 * TeamScoreBar — the live Red vs Blue total for team mode. Sums each
 * side from the leaderboard the host already has (the unioned roster, so
 * the totals are correct across VMs) and draws a proportional bar with
 * both totals, the leader highlighted.
 *
 * Pure presentation: hand it the current leaderboard entries (each may
 * carry a `team`); it renders nothing meaningful until students are on
 * teams. Owns its own en/he/ar labels.
 */
import { motion } from "motion/react";
import { useLanguage } from "../../hooks/useLanguage";
import type { QpTeam } from "../../core/quickPlayProtocol";

interface TeamScoreBarProps {
  entries: { team?: QpTeam; score: number }[];
  className?: string;
}

const LABELS = {
  en: { red: "Red", blue: "Blue", points: "pts" },
  he: { red: "אדום", blue: "כחול", points: "נק'" },
  ar: { red: "أحمر", blue: "أزرق", points: "نقطة" },
} as const;

export default function TeamScoreBar({ entries, className = "" }: TeamScoreBarProps) {
  const { language, isRTL } = useLanguage();
  const t = LABELS[language === "he" ? "he" : language === "ar" ? "ar" : "en"];

  let red = 0, blue = 0;
  for (const e of entries) {
    if (e.team === "red") red += e.score;
    else if (e.team === "blue") blue += e.score;
  }
  const total = red + blue;
  // Split the bar by share of points; 50/50 until anyone scores.
  const redPct = total > 0 ? (red / total) * 100 : 50;

  return (
    <div className={`rounded-3xl border border-stone-200/70 bg-white/80 backdrop-blur shadow-lg p-4 sm:p-5 ${className}`}>
      <div className={`flex items-center justify-between mb-2 ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-rose-500" />
          <span className="font-black text-rose-600 text-lg sm:text-xl tabular-nums">{t.red} {red}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-black text-sky-600 text-lg sm:text-xl tabular-nums">{blue} {t.blue}</span>
          <span className="inline-block w-3 h-3 rounded-full bg-sky-500" />
        </div>
      </div>
      {/* The bar always reads left=Red, right=Blue regardless of RTL —
          the coloured dots above label each end. */}
      <div dir="ltr" className="relative h-5 w-full overflow-hidden rounded-full bg-sky-500">
        <motion.div
          className="absolute inset-y-0 left-0 bg-rose-500"
          initial={false}
          animate={{ width: `${redPct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
        {/* Centre seam marker */}
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/50" />
      </div>
    </div>
  );
}
