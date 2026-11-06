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
    </nav>
  );
}
