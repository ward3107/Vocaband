import { Check } from "lucide-react";

type Game = "race" | "speed" | "arena";
type Stage = "setup" | "room" | "play";
type Language = "en" | "he" | "ar";

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

const COLORS: Record<Game, string> = {
  race: "#A80F58",
  speed: "#B54716",
  arena: "#08756F",
};

const STAGES: Stage[] = ["setup", "room", "play"];

/** Shared, non-interactive progress guide for all three live-game hosts. */
export default function LiveHostSteps({ game, stage, language }: LiveHostStepsProps) {
  const labels = LABELS[language];
  const current = STAGES.indexOf(stage);
  const color = COLORS[game];

  return (
    <nav aria-label={labels.nav} className="mb-6 rounded-2xl border border-outline-variant bg-surface px-3 py-3 shadow-sm sm:px-5">
      <ol className="grid grid-cols-3 gap-1 sm:gap-3">
        {STAGES.map((item, index) => {
          const active = item === stage;
          const complete = index < current;
          return (
            <li
              key={item}
              aria-current={active ? "step" : undefined}
              className="flex min-w-0 items-center gap-2 rounded-xl px-1.5 py-1 sm:px-3"
              style={active ? { backgroundColor: "color-mix(in srgb, " + color + " 10%, transparent)" } : undefined}
            >
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-black sm:h-8 sm:w-8"
                style={active || complete
                  ? { backgroundColor: color, borderColor: color, color: "#fff" }
                  : { borderColor: "var(--vb-border)", color: "var(--vb-text-muted)" }}
                aria-hidden="true"
              >
                {complete ? <Check size={15} strokeWidth={3} /> : index + 1}
              </span>
              <span className={"min-w-0 text-xs leading-tight sm:text-sm " + (active ? "font-extrabold text-on-surface" : complete ? "font-bold text-on-surface-variant" : "font-semibold text-on-surface-variant")}>
                {labels[item]}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 px-2 text-xs font-medium leading-relaxed text-on-surface-variant sm:px-3 sm:text-sm">
        {GUIDANCE[language][game][stage]}
      </p>
    </nav>
  );
}
