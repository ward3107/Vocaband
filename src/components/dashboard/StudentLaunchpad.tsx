import type { ReactNode } from "react";
import { ArrowUpRight, BookOpen, CalendarCheck, Gamepad2, Radio, ShoppingBag, Trophy, Zap } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import type { Language } from "../../hooks/useLanguage";

type Destination = "play" | "join" | "tasks" | "shop" | "leaderboard" | "practice" | "daily";
export interface StudentDestination {
  key: Destination;
  onClick: () => void;
  badge?: number;
  disabled?: boolean;
}

const LABELS: Record<Language, Record<Destination, [string, string]>> = {
  en: { play: ["Play", "Continue your next assignment"], join: ["Join", "Enter your teacher’s game code"], tasks: ["Tasks", "Your class assignments, all together"], shop: ["Shop", "Make your learning space yours"], leaderboard: ["Ranks", "Celebrate your progress"], practice: ["Practice", "A little practice, every day"], daily: ["Daily", "Missions, rewards and new goals"] },
  he: { play: ["שחק", "ממשיכים למשימה הבאה"], join: ["הצטרף", "נכנסים עם קוד המשחק מהמורה"], tasks: ["משימות", "כל משימות הכיתה במקום אחד"], shop: ["חנות", "מעצבים את מרחב הלמידה שלך"], leaderboard: ["דירוג", "חוגגים את ההתקדמות שלך"], practice: ["תרגול", "קצת תרגול בכל יום"], daily: ["יומי", "משימות, פרסים ויעדים חדשים"] },
  ar: { play: ["العب", "تابع مهمتك التالية"], join: ["انضم", "أدخل رمز اللعبة من معلّمك"], tasks: ["المهام", "كل مهام صفّك في مكان واحد"], shop: ["المتجر", "اجعل مساحة تعلّمك مميّزة"], leaderboard: ["الترتيب", "احتفل بتقدّمك"], practice: ["تدريب", "قليل من التدريب كل يوم"], daily: ["يومي", "مهام ومكافآت وأهداف جديدة"] },
};
const META = {
  play: { icon: Gamepad2, tint: "bg-indigo-100 text-indigo-700" },
  join: { icon: Radio, tint: "bg-violet-100 text-violet-700" },
  tasks: { icon: BookOpen, tint: "bg-teal-100 text-teal-700" },
  shop: { icon: ShoppingBag, tint: "bg-pink-100 text-pink-700" },
  leaderboard: { icon: Trophy, tint: "bg-amber-100 text-amber-800" },
  practice: { icon: Zap, tint: "bg-blue-100 text-blue-700" },
  daily: { icon: CalendarCheck, tint: "bg-emerald-100 text-emerald-700" },
};
const COPY = {
  en: { heading: "Your learning space", pet: "Growing with you", petSub: "Every word brings you one step further. Tap your companion to see what’s next." },
  he: { heading: "מרחב הלמידה שלך", pet: "גדלים יחד", petSub: "כל מילה מקרבת אותך לשלב הבא. לחצו על הדמות כדי לראות מה מחכה בהמשך." },
  ar: { heading: "مساحة تعلّمك", pet: "نكبر معًا", petSub: "كل كلمة تقرّبك خطوة. اضغط على رفيقك لترى ما ينتظرك." },
};

/** Same card, icon and type hierarchy as the teacher's activity launcher.
 * Destinations remain real buttons, with stable labels for keyboard/voice use. */
export default function StudentLaunchpad({ items, companion }: { items: StudentDestination[]; companion: ReactNode }) {
  const { language, dir } = useLanguage();
  const t = COPY[language];
  return (
    <section dir={dir} className="w-full" aria-labelledby="student-space-title">
      <h2 id="student-space-title" className="vb-section-heading">{t.heading}</h2>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {items.map(item => {
            const { icon: Icon, tint } = META[item.key];
            const [label, description] = LABELS[language][item.key];
            return (
              <button key={item.key} type="button" onClick={item.onClick} disabled={item.disabled} aria-label={label}
                className="vb-card vb-interactive-card group flex min-h-40 flex-col items-start p-4 sm:p-5">
                <span className="mb-4 flex w-full items-center justify-between gap-2">
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl ${tint}`}><Icon size={23} aria-hidden /></span>
                  {item.badge ? <span className="rounded-full bg-[var(--vb-accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--vb-accent)]">{item.badge}</span> : <ArrowUpRight size={17} className="text-[var(--vb-text-muted)] rtl:-scale-x-100" aria-hidden />}
                </span>
                <span className="text-base font-extrabold sm:text-lg">{label}</span>
                <span className="mt-1 text-sm leading-relaxed text-[var(--vb-text-secondary)]">{description}</span>
              </button>
            );
          })}
        </div>
        <aside className="vb-card flex flex-col items-center justify-center gap-3 px-5 py-7 text-center">
          <h3 className="text-lg font-extrabold">{t.pet}</h3>
          <div className="relative flex min-h-48 items-center justify-center">{companion}</div>
          <p className="max-w-xs text-sm leading-relaxed text-[var(--vb-text-secondary)]">{t.petSub}</p>
        </aside>
      </div>
    </section>
  );
}
