import type { ReactNode } from 'react';
import { ArrowRight, Check, Play, Sparkles, Star } from 'lucide-react';
import type { IslandState } from './ModeIsland';
import { useLanguage } from '../../hooks/useLanguage';
import { modeJourneyT } from '../../locales/student/mode-journey';

interface ModeActivityCardProps {
  name: string;
  description: string;
  icon: ReactNode;
  gradient: string;
  state: IslandState;
  stateLabel: string;
  mastery: number;
  onSelect: () => void;
}

export default function ModeActivityCard({
  name, description, icon, gradient, state, stateLabel, mastery, onSelect,
}: ModeActivityCardProps) {
  const { language } = useLanguage();
  const t = modeJourneyT[language];
  const next = state === 'next';
  const locked = state === 'locked';
  const completed = state === 'done' || locked;

  return (
    <button type="button" disabled={locked} onClick={onSelect} aria-label={name + ' — ' + stateLabel}
      className={'group relative flex min-h-32 w-full touch-manipulation items-center gap-4 overflow-hidden rounded-3xl border p-4 text-start shadow-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--vb-accent)] motion-safe:transition motion-safe:duration-200 disabled:cursor-not-allowed sm:min-h-36 sm:p-5 ' +
        (next
          ? 'border-indigo-700 bg-gradient-to-br from-indigo-800 via-violet-700 to-violet-600 text-white shadow-lg shadow-indigo-900/15'
          : 'border-[var(--vb-border)] bg-[var(--vb-surface)] text-[var(--vb-text-primary)] enabled:hover:border-[var(--vb-accent)] enabled:hover:shadow-md')}>
      <span aria-hidden="true" className={'relative grid h-16 w-16 shrink-0 place-items-center rounded-[1.25rem] text-white shadow-sm ' +
        (next ? 'border border-white/25 bg-white/15' : 'bg-gradient-to-br ' + gradient)}>
        <span className="absolute -end-1 -top-1 h-5 w-5 rounded-md border border-white/50 bg-white/20 rotate-12" />
        <span className="[&>svg]:h-8 [&>svg]:w-8">{icon}</span>
        {next && <Sparkles size={14} className="absolute -bottom-1 -start-1 rounded-full bg-amber-300 p-0.5 text-indigo-950" />}
      </span>
      <span className="relative min-w-0 flex-1">
        <span className={'mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold ' +
          (next ? 'text-cyan-200' : 'text-[var(--vb-text-secondary)]')}>
          {completed ? <Check size={13} aria-hidden="true" /> : next ? <Play size={11} className="fill-current" aria-hidden="true" /> : null}
          {locked ? t.played : next ? t.next : completed ? t.done : t.ready}
        </span>
        <span className="block text-base font-extrabold leading-snug sm:text-lg">{name}</span>
        <span className={'mt-1 block text-xs leading-relaxed sm:text-sm ' + (next ? 'text-indigo-100' : 'text-[var(--vb-text-secondary)]')}>
          {locked ? t.lockedHint : description}
        </span>
        {mastery > 0 && (
          <span className="mt-2 flex gap-1" aria-label={t.stars(mastery)}>
            {[1, 2, 3].map(star => <Star key={star} size={13} aria-hidden="true"
              className={star <= mastery ? 'fill-amber-400 text-amber-500' : 'text-[var(--vb-border-strong)]'} />)}
          </span>
        )}
      </span>
      {!locked && <ArrowRight size={18} aria-hidden="true" className={'shrink-0 rtl:rotate-180 ' + (next ? 'text-white' : 'text-[var(--vb-accent)]')} />}
    </button>
  );
}
