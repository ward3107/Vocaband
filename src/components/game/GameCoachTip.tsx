import { useState } from 'react';
import { HelpCircle, Lightbulb, X } from 'lucide-react';
import type { GameMode } from '../../constants/game';
import { useLanguage } from '../../hooks/useLanguage';
import { adventureT } from '../../locales/student/adventure';
import { modeIntroT } from '../../locales/student/mode-intro';

interface GameCoachTipProps {
  mode: GameMode;
  currentIndex: number;
  feedback: string | null;
}

/** Short, optional guidance stays beside the first action instead of blocking the game. */
export default function GameCoachTip({ mode, currentIndex, feedback }: GameCoachTipProps) {
  const { language, dir } = useLanguage();
  const [manual, setManual] = useState<'auto' | 'open' | 'closed'>('auto');
  const labels = adventureT[language] ?? adventureT.en;
  const tip = modeIntroT[language]?.modes[mode]?.steps[0] ?? modeIntroT.en.modes[mode].steps[0];

  const open = manual === 'open' || (manual === 'auto' && currentIndex === 0 && feedback !== 'correct');

  return (
    <div dir={dir} className="mb-2 w-full max-w-4xl md:max-w-5xl lg:max-w-6xl">
      {open ? (
        <aside aria-label={labels.help} className="flex items-start gap-2.5 rounded-2xl border border-sky-200/35 bg-[#123953] px-3 py-2.5 text-white shadow-[0_8px_20px_rgba(12,48,82,.15)] sm:px-4">
          <Lightbulb aria-hidden size={19} className="mt-0.5 shrink-0 text-amber-300" />
          <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">{tip}</p>
          <button type="button" onClick={() => setManual('closed')} aria-label={labels.hideHelp}
            className="-m-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/85 outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-amber-200">
            <X aria-hidden size={17} />
          </button>
        </aside>
      ) : (
        <button type="button" onClick={() => setManual('open')}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-sky-400/25 bg-[#123953] px-3 text-xs font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-amber-200">
          <HelpCircle aria-hidden size={15} />{labels.help}
        </button>
      )}
    </div>
  );
}
