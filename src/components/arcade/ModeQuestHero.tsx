import type { ReactNode } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { modeJourneyT } from '../../locales/student/mode-journey';

interface ModeQuestHeroProps {
  completed: number;
  total: number;
  roundLabel?: string;
  countLabel: string;
  companion: ReactNode;
  petName: string;
  petXp: number;
  onOpenCompanion: () => void;
}

export default function ModeQuestHero({
  completed, total, roundLabel, countLabel, companion, petName, petXp, onOpenCompanion,
}: ModeQuestHeroProps) {
  const { language } = useLanguage();
  const t = modeJourneyT[language];
  const percentage = total ? Math.min(100, Math.round(completed / total * 100)) : 0;

  return (
    <section aria-label={t.title}
      className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-indigo-950 via-indigo-800 to-violet-700 p-4 text-white shadow-lg shadow-indigo-950/10 sm:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute -end-12 -top-16 h-56 w-56 rounded-full border-[24px] border-white/5" />
      <div className="relative flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold tracking-wide text-cyan-200 sm:text-xs sm:tracking-widest">{t.eyebrow}</p>
          <h2 className="mt-1 text-lg font-extrabold leading-tight sm:mt-2 sm:text-2xl">{t.title}</h2>
          <p className="mt-2 hidden max-w-md text-sm leading-relaxed text-indigo-100 sm:block">{t.hint}</p>
        </div>
        <svg aria-hidden="true" direction="ltr" viewBox="0 0 112 120" className="h-16 w-16 shrink-0 sm:h-28 sm:w-28">
          <path d="M8 92 C70 110 34 8 101 31" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeDasharray="4 6" />
          <rect x="28" y="22" width="66" height="78" rx="14" fill="#ffffff" fillOpacity=".12" transform="rotate(13 61 61)" />
          <rect x="17" y="28" width="66" height="78" rx="14" fill="#38bdf8" transform="rotate(-9 50 67)" />
          <rect x="27" y="27" width="66" height="78" rx="14" fill="#e0f2fe" transform="rotate(5 60 66)" />
          <text x="40" y="70" fill="#312e81" fontSize="30" fontWeight="800" fontFamily="system-ui, sans-serif" transform="rotate(5 60 66)">Aa</text>
          <path d="M43 86h32" stroke="#818cf8" strokeWidth="4" strokeLinecap="round" />
          <circle cx="88" cy="99" r="13" fill="#fde68a" />
          <path d="m83 99 4 4 7-8" fill="none" stroke="#312e81" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m21 12 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#a5f3fc" />
          <circle cx="99" cy="15" r="3" fill="#fde68a" />
        </svg>
      </div>
      {total > 0 && (
        <div className="relative mt-3">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold sm:text-xs">
            <span className="inline-flex items-center gap-1.5"><Sparkles size={13} aria-hidden="true" />{countLabel}</span>
            {roundLabel && <span className="text-indigo-100">{roundLabel}</span>}
          </div>
          <div role="progressbar" aria-label={t.progress} aria-valuemin={0} aria-valuemax={total} aria-valuenow={completed}
            className="h-1 overflow-hidden rounded-full bg-white/20 sm:h-1.5">
            <div className="h-full rounded-full bg-cyan-300" style={{ width: percentage + '%' }} />
          </div>
        </div>
      )}
      <div className="relative mt-2 flex items-center gap-3 border-t border-white/15 pt-2 sm:mt-4 sm:pt-3">
        <div dir="ltr" className="h-10 w-10 shrink-0 [&>div]:origin-top-left [&>div]:scale-[0.3] sm:h-14 sm:w-14 sm:[&>div]:scale-[0.42]">{companion}</div>
        <button type="button" onClick={onOpenCompanion}
          className="flex min-h-11 min-w-0 flex-1 touch-manipulation items-center gap-3 rounded-xl text-start focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-indigo-100">{t.companion}</span>
            <span className="mt-0.5 block truncate text-sm font-extrabold">{petName} <span dir="ltr" className="text-cyan-200">· {petXp.toLocaleString()} XP</span></span>
          </span>
          <ArrowRight size={17} aria-hidden="true" className="shrink-0 text-cyan-200 rtl:rotate-180" />
        </button>
      </div>
    </section>
  );
}
