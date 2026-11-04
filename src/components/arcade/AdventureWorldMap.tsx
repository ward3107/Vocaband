import type { ReactNode } from 'react';
import { ArrowUpRight, Check, Lock, Sparkles, Star } from 'lucide-react';
import type { GameMode } from '../../constants/game';
import { useLanguage } from '../../hooks/useLanguage';
import { adventureT, type AdventureWorldId } from '../../locales/student/adventure';
import type { IslandState } from './ModeIsland';
import AdventureWorldArt from './AdventureWorldArt';

export interface AdventureMode {
  id: GameMode;
  name: string;
  description: string;
  icon: ReactNode;
  state: IslandState;
  mastery: number;
}

const WORLD_MODES: Record<AdventureWorldId, GameMode[]> = {
  jungle: ['flashcards', 'classic', 'fill-blank', 'matching', 'true-false'],
  ocean: ['listening', 'memory-flip', 'letter-sounds', 'reverse'],
  space: ['spelling', 'scramble', 'sentence-builder', 'speed-round'],
};

const WORLD_STYLE: Record<AdventureWorldId, { border: string; glow: string; badge: string; route: string }> = {
  jungle: {
    border: 'border-emerald-300/25', glow: 'from-emerald-400/20',
    badge: 'bg-emerald-100 text-emerald-950', route: 'bg-emerald-300/45',
  },
  ocean: {
    border: 'border-cyan-300/25', glow: 'from-cyan-400/20',
    badge: 'bg-cyan-100 text-sky-950', route: 'bg-cyan-300/45',
  },
  space: {
    border: 'border-violet-300/25', glow: 'from-violet-400/20',
    badge: 'bg-violet-100 text-violet-950', route: 'bg-violet-300/45',
  },
};

interface AdventureWorldMapProps {
  modes: AdventureMode[];
  onPlay: (id: GameMode) => void;
  petEmoji: string;
}

/** A single route through the teacher-approved modes; every station is an actual button. */
export default function AdventureWorldMap({ modes, onPlay, petEmoji }: AdventureWorldMapProps) {
  const { language } = useLanguage();
  const t = adventureT[language] ?? adventureT.en;

  return (
    <div className="space-y-6 pb-4 sm:space-y-8">
      {(['jungle', 'ocean', 'space'] as const).map((world, worldIndex) => {
        const stops = WORLD_MODES[world].map(id => modes.find(mode => mode.id === id)).filter((mode): mode is AdventureMode => Boolean(mode));
        if (!stops.length) return null;
        const completed = stops.filter(mode => mode.state === 'done' || mode.state === 'locked').length;
        const style = WORLD_STYLE[world];
        const chapter = t.worlds[world];

        return (
          <section key={world} aria-labelledby={`adventure-${world}-title`} className={`overflow-hidden rounded-[1.75rem] border ${style.border} bg-[#0D2440] shadow-[0_24px_70px_-35px_rgba(0,0,0,.8)]`}>
            <div className="relative isolate h-[176px] overflow-hidden sm:h-[224px]">
              <AdventureWorldArt world={world} />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0D2440] via-[#0D2440]/20 to-black/10" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-5 pb-5 sm:px-8 sm:pb-6">
                <div>
                  <p className="mb-1 text-xs font-extrabold tracking-wide text-amber-200">{String(worldIndex + 1).padStart(2, '0')} / 03</p>
                  <h2 id={`adventure-${world}-title`} className="font-['Fredoka',sans-serif] text-3xl font-bold leading-none text-white drop-shadow-[0_2px_8px_rgba(0,0,0,.55)] sm:text-4xl">{chapter.name}</h2>
                  <p className="mt-1.5 text-sm font-semibold text-white/90">{chapter.subtitle}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold ${style.badge}`} aria-label={t.modeCount(completed, stops.length)}>
                  {completed}/{stops.length}
                </span>
              </div>
            </div>

            <ol className="relative px-4 pb-5 pt-2 sm:px-7 sm:pb-7" aria-label={chapter.name}>
              <span aria-hidden className={`absolute bottom-10 start-9 top-10 w-[3px] rounded-full ${style.route} sm:start-12`} />
              {stops.map((mode, index) => {
                const locked = mode.state === 'locked';
                const done = mode.state === 'done';
                const next = mode.state === 'next';
                const stateLabel = locked ? t.locked : done ? t.completed : next ? t.recommended : t.available;
                return (
                  <li key={mode.id} className="relative py-1.5">
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => onPlay(mode.id)}
                      aria-label={`${mode.name} - ${stateLabel}`}
                      data-state={mode.state}
                      className={`group relative flex min-h-[80px] w-full items-center gap-3 rounded-2xl border px-3 py-3 text-start shadow-lg outline-none transition-transform duration-200 focus-visible:ring-4 focus-visible:ring-amber-200/90 motion-safe:hover:-translate-y-0.5 sm:gap-4 sm:px-5 ${
                        next ? 'border-amber-300 bg-[#233D4F] shadow-amber-500/15' :
                        locked ? 'cursor-not-allowed border-white/10 bg-white/[.045] text-white/55' :
                        'border-white/15 bg-white/[.075] hover:bg-white/[.12]'
                      }`}
                    >
                      <span aria-hidden className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 shadow-[0_4px_12px_rgba(0,0,0,.35)] sm:h-14 sm:w-14 ${
                        next ? 'border-amber-100 bg-amber-400 text-[#302410] motion-safe:animate-pulse' :
                        done ? 'border-emerald-200 bg-emerald-500 text-white' :
                        locked ? 'border-white/20 bg-slate-600 text-white/65' :
                        'border-white/60 bg-[#F5EAD1] text-[#25324C]'
                      }`}>
                        {locked ? <Lock size={19} /> : done ? <Check size={24} strokeWidth={3} /> : next ? <span className="text-2xl">{petEmoji}</span> : <span className="text-sm font-black">{index + 1}</span>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-base font-extrabold leading-tight text-white sm:text-lg">
                          <span aria-hidden className="shrink-0 opacity-80">{mode.icon}</span>{mode.name}
                        </span>
                        <span className="mt-1 block line-clamp-2 text-xs leading-snug text-white/75 sm:text-sm">{locked ? `${t.sessionPlayed}. ${t.chooseAnother}` : mode.description}</span>
                        {next && <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-300/20 px-2 py-0.5 text-[11px] font-extrabold text-amber-100"><Sparkles size={12} />{t.nextQuest}</span>}
                        {mode.mastery > 0 && <span className="mt-1 inline-flex items-center gap-0.5 text-amber-200" aria-label={`${mode.mastery} / 3`}>
                          {[0, 1, 2].map(star => <Star key={star} size={12} fill={star < mode.mastery ? 'currentColor' : 'none'} />)}
                        </span>}
                      </span>
                      {!locked && <ArrowUpRight aria-hidden size={22} className="shrink-0 text-amber-200 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
