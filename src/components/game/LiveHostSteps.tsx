import { Check } from "lucide-react";

export type Game = "race" | "speed" | "arena";
export type Stage = "setup" | "room" | "play";
export type Language = "en" | "he" | "ar";

interface LiveHostStepsProps {
  game: Game;
  stage: Stage;
  language: Language;
}

const LABELS = {
  en: { nav: "Game progress", setup: "Set up", room: "Invite class", play: "Play" },
  he: { nav: "שלבי המשחק", setup: "הגדרת המשחק", room: "הזמנת הכיתה", play: "משחקים" },
  ar: { nav: "مراحل اللعبة", setup: "إعداد اللعبة", room: "دعوة الصف", play: "اللعب" },
} as const;

const GUIDANCE: Record<Language, Record<Game, Record<Stage, string>>> = {
  en: {
    race: { setup: "Choose categories and a round timer.", room: "Share the code, then start when your class is ready.", play: "Follow the letter, timer and live scores." },
    speed: { setup: "Add words, choose question modes and set the timer.", room: "Share the code, then start the first word.", play: "Watch the countdown and fastest answers." },
    arena: { setup: "Add words, question modes and a map.", room: "Share the code, then start the hunt.", play: "Follow players and remaining words on the map." },
  },
  he: {
    race: { setup: "בחרו קטגוריות וזמן לסיבוב.", room: "שתפו את הקוד והתחילו כשהכיתה מוכנה.", play: "עקבו אחר האות, הזמן והניקוד החי." },
    speed: { setup: "הוסיפו מילים, בחרו סוגי שאלות וקבעו זמן.", room: "שתפו את הקוד והתחילו במילה הראשונה.", play: "עקבו אחר הספירה והתגובות המהירות." },
    arena: { setup: "הוסיפו מילים, סוגי שאלות ומפה.", room: "שתפו את הקוד והתחילו בציד.", play: "עקבו אחר המשתתפים והמילים שנותרו במפה." },
  },
  ar: {
    race: { setup: "اختاروا الفئات ووقت الجولة.", room: "شاركوا الرمز وابدؤوا عندما يصبح الصف جاهزًا.", play: "تابعوا الحرف والوقت والنتائج المباشرة." },
    speed: { setup: "أضيفوا الكلمات واختاروا أنواع الأسئلة والوقت.", room: "شاركوا الرمز ثم ابدؤوا بالكلمة الأولى.", play: "تابعوا العد التنازلي وأسرع الإجابات." },
    arena: { setup: "أضيفوا الكلمات وأنواع الأسئلة والخريطة.", room: "شاركوا الرمز ثم ابدؤوا الصيد.", play: "تابعوا اللاعبين والكلمات المتبقية على الخريطة." },
  },
};

const STAGES: Stage[] = ["setup", "room", "play"];

export function liveHostStageCopy(game: Game, stage: Stage, language: Language) {
  return {
    nav: LABELS[language].nav,
    label: LABELS[language][stage],
    guidance: GUIDANCE[language][game][stage],
    number: STAGES.indexOf(stage) + 1,
  };
}

/** Non-interactive three-step progress, paired with the host hero. */
export default function LiveHostSteps({ stage, language }: LiveHostStepsProps) {
  const labels = LABELS[language];
  const current = STAGES.indexOf(stage);

  return (
    <nav aria-label={labels.nav} className="live-host-steps mx-auto mb-7 max-w-3xl px-2">
      <ol className="grid grid-cols-3">
        {STAGES.map((item, index) => {
          const active = item === stage;
          const complete = index < current;
          return (
            <li key={item} aria-current={active ? "step" : undefined} className="relative flex min-w-0 flex-col items-center gap-1.5 text-center">
              <span
                className={"relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-extrabold " +
                  (active ? "bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/20" :
                    complete ? "bg-violet-100 text-violet-700" : "bg-surface text-on-surface-variant")}
                aria-hidden="true"
              >
                {complete ? <Check size={15} strokeWidth={3} /> : index + 1}
              </span>
              <span className={"max-w-full px-1 text-[11px] leading-tight sm:text-xs " +
                (active ? "font-extrabold text-on-surface" : "font-medium text-on-surface-variant")}>
                {labels[item]}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
