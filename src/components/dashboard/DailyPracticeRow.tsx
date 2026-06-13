/**
 * DailyPracticeRow — collapses the three "play something quick" cards
 * (Review Queue, Class Minute, Idioms) into a single compact row.
 *
 * Each tile takes ~⅓ the vertical space of the original full-width
 * cards, so the dashboard surfaces ~3× more retention nudges in the
 * same scroll real estate.  Tiles render conditionally: pass the
 * matching props and they appear; omit and the column disappears.
 *
 * Mobile layout (grid-cols-3) is intentionally tight — these are
 * pill-style entry points, not full cards.  The richer "done today"
 * / "all caught up" celebrations the original cards rendered as full
 * panels collapse here into a corner checkmark + emerald tint.
 */
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Brain, Timer, ArrowRight, CheckCircle2 } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import type { Language } from "../../hooks/useLanguage";
import { useFeatureFlag } from "../../hooks/useFeatureFlag";
import {
  ARCADE_CARD,
  ARCADE_HERO_GRADIENT,
  ARCADE_REWARD_GRADIENT,
  ARCADE_STREAK_GRADIENT,
} from "../arcade/theme";

interface DailyPracticeRowProps {
  /** Spaced-Repetition Review Queue — when omitted, the Review tile
   *  is hidden entirely. */
  review?: {
    dueCount: number;
    isLoading: boolean;
    onStart: () => void;
  };
  /** Class Minute — when omitted, the tile is hidden entirely. */
  classMinute?: {
    doneToday: boolean;
    streak: number;
    isLoading: boolean;
    onStart: () => void;
  };
  /** Idioms bonus practice — when omitted, the tile is hidden. */
  idioms?: {
    onStart: () => void;
  };
}

const STRINGS: Record<Language, {
  header: string;
  review: string;
  reviewDue: (n: number) => string;
  reviewClear: string;
  classMinute: string;
  classMinuteSubtitle: string;
  classMinuteDone: string;
  classMinuteStreak: (n: number) => string;
  idioms: string;
  idiomsSubtitle: string;
}> = {
  en: {
    header: "Daily practice",
    review: "Review",
    reviewDue: (n) => `${n} due`,
    reviewClear: "All caught up",
    classMinute: "Class Minute",
    classMinuteSubtitle: "60s drill",
    classMinuteDone: "Done today",
    classMinuteStreak: (n) => `${n}🔥`,
    idioms: "Idioms",
    idiomsSubtitle: "Bonus",
  },
  he: {
    header: "תרגול יומי",
    review: "חזרה",
    reviewDue: (n) => `${n} לחזרה`,
    reviewClear: "הכל מעודכן",
    classMinute: "דקת כיתה",
    classMinuteSubtitle: "תרגול 60 שניות",
    classMinuteDone: "הושלם היום",
    classMinuteStreak: (n) => `${n}🔥`,
    idioms: "ביטויים",
    idiomsSubtitle: "בונוס",
  },
  ar: {
    header: "تدريب يومي",
    review: "مراجعة",
    reviewDue: (n) => `${n} مستحقة`,
    reviewClear: "كل شيء محدث",
    classMinute: "دقيقة الصف",
    classMinuteSubtitle: "تمرين 60 ثانية",
    classMinuteDone: "اكتمل اليوم",
    classMinuteStreak: (n) => `${n}🔥`,
    idioms: "تعابير",
    idiomsSubtitle: "إضافي",
  },
  ru: {
    header: "Daily practice",
    review: "Review",
    reviewDue: (n) => `${n} due`,
    reviewClear: "All caught up",
    classMinute: "Class Minute",
    classMinuteSubtitle: "60s drill",
    classMinuteDone: "Done today",
    classMinuteStreak: (n) => `${n}🔥`,
    idioms: "Idioms",
    idiomsSubtitle: "Bonus",
  },
};

interface PracticeTileProps {
  icon: ReactNode;
  iconBg: string;
  surfaceClass: string;
  ringClass: string;
  title: string;
  caption: string;
  badge?: { text: string; tone: "live" | "muted" | "ok" };
  done?: boolean;
  loading?: boolean;
  onClick: () => void;
  disabled?: boolean;
  /** Arcade theme — dark frosted row with white text on the colored
   *  tile gradient (the surface/ring/icon backgrounds are chosen by
   *  the caller; the text + chrome colors are switched here). */
  arcade?: boolean;
}

function PracticeTile({
  icon, iconBg, surfaceClass, ringClass,
  title, caption, badge, done, loading,
  onClick, disabled, arcade,
}: PracticeTileProps) {
  const badgeClass =
    badge?.tone === "live"
      ? "bg-violet-500 text-white"
      : badge?.tone === "ok"
        ? "bg-emerald-500 text-white"
        : arcade
          ? "bg-white/20 text-white"
          : "bg-stone-200 text-stone-700";

  if (loading) {
    return (
      <div
        className={`rounded-2xl border ${ringClass} shadow-sm ${surfaceClass} p-3 sm:p-4 animate-pulse`}
        style={{ minHeight: 96 }}
      >
        <div className="h-8 w-8 rounded-lg bg-white/60 mb-2" />
        <div className="h-3 w-16 bg-white/60 rounded mb-1.5" />
        <div className="h-2 w-12 bg-white/40 rounded" />
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      className={`group relative w-full text-start rounded-2xl border ${ringClass} ${surfaceClass} p-3 sm:p-4 shadow-sm hover:shadow-md transition-all ${disabled ? "cursor-default opacity-90" : ""}`}
    >
      <div className="flex items-center gap-2.5 mb-1.5 sm:mb-2">
        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg ${iconBg} flex items-center justify-center shadow-sm shrink-0`}>
          {icon}
        </div>
        {done && (
          <span className={`ms-auto inline-flex items-center gap-1 text-[10px] font-black ${arcade ? "text-white" : "text-emerald-700"}`}>
            <CheckCircle2 size={12} className="fill-emerald-200" />
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 mb-0.5">
        <h3 className={`text-xs sm:text-sm font-black ${arcade ? "text-white" : "text-stone-800"} leading-tight truncate flex-1 min-w-0`}>
          {title}
        </h3>
        {!done && (
          <ArrowRight
            size={12}
            className={`${arcade ? "text-white/70" : "text-stone-400"} shrink-0 group-hover:translate-x-0.5 transition-transform rtl:rotate-180 rtl:group-hover:-translate-x-0.5`}
          />
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <p className={`text-[10px] sm:text-[11px] ${arcade ? "text-cyan-200" : "text-stone-600"} font-bold truncate`}>
          {caption}
        </p>
        {badge && (
          <span className={`text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full ${badgeClass} shrink-0`}>
            {badge.text}
          </span>
        )}
      </div>
    </motion.button>
  );
}

export default function DailyPracticeRow({
  review,
  classMinute,
  idioms,
}: DailyPracticeRowProps) {
  const { language, dir } = useLanguage();
  const t = STRINGS[language] || STRINGS.en;
  // Arcade theme: dark frosted row, vivid per-tile gradients, white
  // text. Falls back to the existing light styling when off.
  const arcade = useFeatureFlag("arcade_hub", false);

  // Hide the whole row when none of the three are wired.
  if (!review && !classMinute && !idioms) return null;

  // Shared arcade overrides reused across all three tiles.
  const arcadeIconBg = "bg-white/20 backdrop-blur-sm";
  const arcadeRing = "border-white/25";
  const iconClass = arcade ? "text-white drop-shadow" : "text-white";

  return (
    <div dir={dir} className={arcade ? `${ARCADE_CARD} p-3 sm:p-4` : undefined}>
      <div className={`mb-2 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] ${arcade ? "text-cyan-200" : "text-[#8B5CF6]"}`}>
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)" }}
        />
        {t.header}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {review && (
          <PracticeTile
            icon={<Brain size={16} className={iconClass} />}
            iconBg={arcade ? arcadeIconBg : "bg-gradient-to-br from-violet-500 to-purple-600"}
            surfaceClass={
              arcade
                ? ARCADE_HERO_GRADIENT
                : review.dueCount === 0
                  ? "bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50"
                  : "bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50"
            }
            ringClass={arcade ? arcadeRing : "border-white/80"}
            arcade={arcade}
            title={t.review}
            caption={review.dueCount === 0 ? t.reviewClear : t.reviewDue(review.dueCount)}
            done={review.dueCount === 0}
            loading={review.isLoading}
            onClick={review.onStart}
            disabled={review.dueCount === 0}
          />
        )}
        {classMinute && (
          <PracticeTile
            icon={<Timer size={16} className={iconClass} />}
            iconBg={
              arcade
                ? arcadeIconBg
                : classMinute.doneToday
                  ? "bg-gradient-to-br from-emerald-400 to-teal-500"
                  : "bg-gradient-to-br from-amber-500 to-orange-600"
            }
            surfaceClass={
              arcade
                ? ARCADE_REWARD_GRADIENT
                : classMinute.doneToday
                  ? "bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50"
                  : "bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50"
            }
            ringClass={arcade ? arcadeRing : "border-white/80"}
            arcade={arcade}
            title={t.classMinute}
            caption={classMinute.doneToday ? t.classMinuteDone : t.classMinuteSubtitle}
            badge={
              classMinute.streak > 0
                ? {
                    text: t.classMinuteStreak(classMinute.streak),
                    tone: classMinute.doneToday ? "ok" : "muted",
                  }
                : undefined
            }
            done={classMinute.doneToday}
            loading={classMinute.isLoading}
            onClick={classMinute.onStart}
            disabled={classMinute.doneToday}
          />
        )}
        {idioms && (
          <PracticeTile
            icon={<span className={arcade ? "text-base drop-shadow" : "text-base"} aria-hidden>💭</span>}
            iconBg={arcade ? arcadeIconBg : "bg-gradient-to-br from-sky-400 to-blue-500"}
            surfaceClass={arcade ? ARCADE_STREAK_GRADIENT : "bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50"}
            ringClass={arcade ? arcadeRing : "border-white/80"}
            arcade={arcade}
            title={t.idioms}
            caption={t.idiomsSubtitle}
            onClick={idioms.onStart}
          />
        )}
      </div>
    </div>
  );
}
