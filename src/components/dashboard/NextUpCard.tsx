import React from "react";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { ALL_WORDS } from "../../data/vocabulary";
import type { AssignmentData, ProgressData } from "../../core/supabase";
import type { Word } from "../../data/vocabulary";
import type { View } from "../../core/views";
import { useLanguage } from "../../hooks/useLanguage";
import { studentDashboardT } from "../../locales/student/student-dashboard";
import { pickNextAssignment } from "../../utils/pickNextAssignment";

interface NextUpCardProps {
  studentAssignments: AssignmentData[];
  studentProgress: ProgressData[];
  /** Student uid — needed for resolveAssignmentPlays' localStorage cache. */
  userUid: string;
  setActiveAssignment: (a: AssignmentData) => void;
  setAssignmentWords: (w: Word[]) => void;
  setView: React.Dispatch<React.SetStateAction<View>>;
  setShowModeSelection: (show: boolean) => void;
}

function ProgressRing({ percent }: { percent: number }) {
  const size = 64;
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset =
    circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth="6"
          fill="none"
          className="stroke-white/30"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          className="stroke-white"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-black text-white tabular-nums">
          {Math.round(percent)}%
        </span>
      </div>
    </div>
  );
}

export default function NextUpCard({
  studentAssignments,
  studentProgress,
  userUid,
  setActiveAssignment,
  setAssignmentWords,
  setView,
  setShowModeSelection,
}: NextUpCardProps) {
  const { language, isRTL } = useLanguage();
  const t = studentDashboardT[language];

  const candidate = pickNextAssignment(studentAssignments, studentProgress, userUid);
  if (!candidate) return null;

  const { assignment, percent, state } = candidate;
  const ctaLabel =
    state === "continue"
      ? t.continueAction
      : state === "replay"
        ? t.playAgain
        : t.startAssignment;

  const handleStart = () => {
    const filteredWords =
      assignment.words ||
      ALL_WORDS.filter((w) => assignment.wordIds.includes(w.id));
    setActiveAssignment(assignment);
    setAssignmentWords(filteredWords);
    React.startTransition(() => {
      setView("game");
      setShowModeSelection(true);
    });
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
    }
  };

  return (
    <motion.button
      type="button"
      onClick={handleStart}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      style={{
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        boxShadow:
          "0 20px 40px -22px rgba(99,102,241,0.55), 0 1px 0 rgba(255,255,255,0.4) inset",
      }}
      className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-5 sm:p-6 text-start text-white"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -end-10 h-32 w-32 rounded-full bg-white/15 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -start-8 h-28 w-28 rounded-full bg-fuchsia-300/20 blur-2xl"
      />

      <div className="relative flex items-center gap-4 sm:gap-5">
        <ProgressRing percent={percent} />

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/85">
            <Sparkles size={12} className="fill-white" />
            {t.nextUp}
          </div>
          <h3 className="line-clamp-2 text-base font-black leading-tight sm:text-lg">
            {assignment.title}
          </h3>
          <p className="mt-0.5 text-[11px] font-bold text-white/80 sm:text-xs">
            {assignment.wordIds.length} words
          </p>
        </div>

        <div className="shrink-0">
          <div className="hidden sm:flex items-center gap-2 rounded-2xl bg-white/20 px-4 py-2.5 font-black text-sm backdrop-blur-sm border border-white/30">
            {ctaLabel}
            <ArrowRight size={16} className={isRTL ? "rotate-180" : ""} />
          </div>
          <div className="sm:hidden grid h-11 w-11 place-items-center rounded-full bg-white/25 border border-white/40 backdrop-blur-sm">
            <ArrowRight size={18} className={isRTL ? "rotate-180" : ""} />
          </div>
        </div>
      </div>
    </motion.button>
  );
}
