import { Compass, Globe2, Zap } from "lucide-react";
import { liveHostStageCopy, type Game, type Language, type Stage } from "./LiveHostSteps";

interface LiveHostHeroProps {
  game: Game;
  stage: Stage;
  language: Language;
  title: string;
}

const ICONS = { race: Globe2, speed: Zap, arena: Compass } as const;
const ICON_GRADIENT = {
  race: "from-fuchsia-500 to-pink-500",
  speed: "from-amber-500 to-orange-500",
  arena: "from-emerald-500 to-teal-500",
} as const;

/** The same hero hierarchy as Quick Play, with each game's own icon. */
export default function LiveHostHero({ game, stage, language, title }: LiveHostHeroProps) {
  const copy = liveHostStageCopy(game, stage, language);
  const Icon = ICONS[game];

  return (
    <div className="live-host-hero mx-auto mb-6 max-w-5xl">
      <div className="vb-hero">
        <div className="relative z-10 flex items-center gap-4">
          <span className={"grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-sm sm:h-14 sm:w-14 " + ICON_GRADIENT[game]} aria-hidden="true">
            <Icon size={26} strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-white/85 sm:text-xs">{copy.number}/3 · {copy.label}</p>
            <h2 className="mt-1 text-2xl font-extrabold leading-tight text-white sm:text-3xl">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/90 sm:text-base">{copy.guidance}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
