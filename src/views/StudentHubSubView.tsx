/**
 * StudentHubSubView — full-screen pages reached from the orbital ring on
 * the student dashboard.  Two destinations:
 *   - practice — spaced-repetition review / class-minute / idioms.
 *   - daily    — everything "today + your stuff": daily chest + weekly
 *                challenge, missions, daily goal, active boosts, badges.
 * The ring circle is the launcher; this is the destination.
 *
 * Hooks (missions, due-reviews) are called unconditionally and gated by
 * `enabled` so the Rules of Hooks hold across both sections — only the
 * one that needs the data actually fetches.
 */
import { useLanguage } from "../hooks/useLanguage";
import type { Language } from "../hooks/useLanguage";
import { useDailyMissions } from "../hooks/useDailyMissions";
import { useDueReviews } from "../hooks/useDueReviews";
import { ARCADE_BG, ARCADE_BUTTON_TOUCH } from "../components/arcade/theme";
import DailyPracticeRow from "../components/dashboard/DailyPracticeRow";
import DailyMissionsCard from "../components/dashboard/DailyMissionsCard";
import ActiveBoostersStrip from "../components/dashboard/ActiveBoostersStrip";
import BadgesStrip from "../components/dashboard/BadgesStrip";
import RetentionStrip from "../components/dashboard/RetentionStrip";
import DailyGoalBanner from "../components/dashboard/DailyGoalBanner";
import type { RetentionState } from "../hooks/useRetention";
import type { AppUser, ProgressData } from "../core/supabase";

export type HubSection = "practice" | "daily";

interface StudentHubSubViewProps {
  section: HubSection;
  user: AppUser;
  onBack: () => void;
  /** Practice page — spaced-repetition + class-minute derive from these.
   *  Daily page uses studentProgress for the daily-goal banner. */
  studentProgress: ProgressData[];
  studentDataLoading: boolean;
  onStartReview?: () => void;
  onStartClassMinute?: () => void;
  onStartIdioms?: () => void;
  /** Daily page — active boosts strip. */
  boosters: {
    isXpBoosterActive: boolean;
    isFocusModeActive: boolean;
    isWeekendWarriorActive: boolean;
    streakFreezes: number;
    luckyCharms: number;
  };
  /** Daily page — badges. */
  badges: string[];
  onClaimBadgeXp: (badgeId: string, xp: number, reason: string) => Promise<{ alreadyClaimed: boolean } | null>;
  /** Daily page — chest / weekly challenge + daily goal. */
  retention: RetentionState;
  onGrantXp: (amount: number, reason: string) => void;
  onPlay?: () => void;
}

/** Per-section header look + localized title. Mirrors OrbitalHub's catalogue
 *  so a circle and the page it opens read as the same destination. */
const HEAD: Record<HubSection, { emoji: string }> = {
  practice: { emoji: "⚡" },
  daily: { emoji: "🎁" },
};

const TITLES: Record<Language, Record<HubSection, string>> = {
  en: { practice: "Practice", daily: "Daily" },
  he: { practice: "תרגול", daily: "יומי" },
  ar: { practice: "تدريب", daily: "يومي" },
  ru: { practice: "Практика", daily: "Ежедневно" },
};

/** Section sub-headers on the Daily page. */
const DAILY_LABELS: Record<Language, { missions: string; badges: string; boosts: string }> = {
  en: { missions: "Today's missions", badges: "Your badges", boosts: "Active boosts" },
  he: { missions: "משימות היום", badges: "התגים שלך", boosts: "בוסטים פעילים" },
  ar: { missions: "مهام اليوم", badges: "أوسمتك", boosts: "المعززات النشطة" },
  ru: { missions: "Задания дня", badges: "Ваши значки", boosts: "Активные бусты" },
};

const BACK_LABEL: Record<Language, string> = {
  en: "Back", he: "חזרה", ar: "رجوع", ru: "Назад",
};

export default function StudentHubSubView({
  section, user, onBack,
  studentProgress, studentDataLoading,
  onStartReview, onStartClassMinute, onStartIdioms,
  boosters, badges, onClaimBadgeXp,
  retention, onGrantXp, onPlay,
}: StudentHubSubViewProps) {
  const { language, dir, isRTL } = useLanguage();
  const isStudent = user?.role === "student" && !user?.isGuest;

  // Both hooks always run; only the section that needs the data sets
  // `enabled`, so the other never fetches. Keeps the Rules of Hooks happy.
  const dailyMissions = useDailyMissions({ enabled: section === "daily" && isStudent });
  const dueReviews = useDueReviews({
    enabled: section === "practice" && isStudent && Boolean(onStartReview),
  });
  const dl = DAILY_LABELS[language] || DAILY_LABELS.en;

  // Class Minute streak — same derivation the dashboard used to do for
  // DailyPracticeRow, now scoped to the practice page that needs it.
  const { classMinuteDoneToday, classMinuteStreak } = (() => {
    if (section !== "practice") return { classMinuteDoneToday: false, classMinuteStreak: 0 };
    const todayKey = new Intl.DateTimeFormat("sv-SE").format(new Date());
    const daysWithPlay = new Set<string>();
    for (const row of studentProgress) {
      if (row.mode !== "class-minute") continue;
      daysWithPlay.add(new Intl.DateTimeFormat("sv-SE").format(new Date(row.completedAt)));
    }
    const doneToday = daysWithPlay.has(todayKey);
    let streak = 0;
    const cursor = new Date();
    if (!doneToday) cursor.setDate(cursor.getDate() - 1);
    while (daysWithPlay.has(new Intl.DateTimeFormat("sv-SE").format(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return { classMinuteDoneToday: doneToday, classMinuteStreak: streak };
  })();

  const title = (TITLES[language] || TITLES.en)[section];

  return (
    <div dir={dir} className={`min-h-screen ${ARCADE_BG} relative overflow-hidden`}>
      <div className="relative z-10 mx-auto max-w-3xl space-y-4 p-4 pb-[calc(env(safe-area-inset-bottom)+4rem)] sm:space-y-6 sm:p-6">
        {/* Page header — back to the orbital hub + section title. */}
        <header className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
          <button
            type="button"
            onClick={onBack}
            aria-label={BACK_LABEL[language] || BACK_LABEL.en}
            className={`${ARCADE_BUTTON_TOUCH} flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl text-white ring-1 ring-white/20 backdrop-blur-md transition hover:bg-white/20`}
          >
            <span aria-hidden>{isRTL ? "→" : "←"}</span>
          </button>
          <h1 className="flex items-center gap-2 text-2xl font-black text-white">
            <span aria-hidden>{HEAD[section].emoji}</span>
            {title}
          </h1>
        </header>

        {section === "practice" && (
          <DailyPracticeRow
            review={onStartReview ? {
              dueCount: dueReviews.dueCount,
              isLoading: dueReviews.isLoading,
              onStart: onStartReview,
            } : undefined}
            classMinute={onStartClassMinute ? {
              doneToday: classMinuteDoneToday,
              streak: classMinuteStreak,
              isLoading: studentDataLoading,
              onStart: onStartClassMinute,
            } : undefined}
            idioms={onStartIdioms ? { onStart: onStartIdioms } : undefined}
          />
        )}

        {section === "daily" && (
          <div className="space-y-5 sm:space-y-6">
            {/* Chest + weekly challenge + comeback. */}
            <RetentionStrip retention={retention} onGrantXp={onGrantXp} />

            {/* Daily goal nudge. */}
            <DailyGoalBanner studentProgress={studentProgress} onPlay={onPlay} />

            {/* Today's missions. */}
            <section className="space-y-2">
              <h2 className="px-1 text-xs font-bold uppercase tracking-widest text-cyan-200">{dl.missions}</h2>
              <DailyMissionsCard missions={dailyMissions.missions} isLoading={dailyMissions.isLoading} />
            </section>

            {/* Active boosts (buy more in the Shop). */}
            <section className="space-y-2">
              <h2 className="px-1 text-xs font-bold uppercase tracking-widest text-cyan-200">{dl.boosts}</h2>
              <ActiveBoostersStrip {...boosters} />
            </section>

            {/* Badges earned. */}
            {badges.length > 0 && (
              <section className="space-y-2">
                <h2 className="px-1 text-xs font-bold uppercase tracking-widest text-cyan-200">{dl.badges}</h2>
                <BadgesStrip earned={badges} userUid={user.uid} onClaimBadgeXp={onClaimBadgeXp} />
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
