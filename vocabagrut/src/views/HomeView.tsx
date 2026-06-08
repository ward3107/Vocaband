import { useLanguage } from '../hooks/useLanguage';
import { t } from '../i18n/strings';
import { GradientCard } from '../components/ui';
import type { Pillar, UnitLevel, View } from '../core/types';

const LEVELS: UnitLevel[] = [3, 4, 5];

const PILLARS: { id: Pillar; emoji: string; gradient: string }[] = [
  { id: 'vocabulary', emoji: '📚', gradient: 'from-indigo-500 via-violet-500 to-fuchsia-500' },
  { id: 'reading', emoji: '📖', gradient: 'from-sky-500 via-cyan-500 to-teal-500' },
  { id: 'writing', emoji: '✍️', gradient: 'from-fuchsia-500 via-pink-500 to-rose-500' },
  { id: 'exams', emoji: '📝', gradient: 'from-amber-500 via-orange-500 to-rose-500' },
];

export default function HomeView({
  level,
  setLevel,
  onNavigate,
}: {
  level: UnitLevel;
  setLevel: (l: UnitLevel) => void;
  onNavigate: (v: View) => void;
}) {
  const { language } = useLanguage();

  return (
    <div>
      <header className="mb-6 text-center">
        <div className="text-5xl">🎓</div>
        <h1 className="mt-2 text-3xl font-black text-slate-900">{t(language, 'appName')}</h1>
        <p className="mt-1 text-lg font-semibold text-indigo-600">{t(language, 'tagline')}</p>
        <p className="mt-1 text-sm text-slate-500">{t(language, 'subtitle')}</p>
      </header>

      <div className="mb-6">
        <p className="mb-2 text-center text-sm font-semibold text-slate-500">{t(language, 'chooseLevel')}</p>
        <div className="flex justify-center gap-3">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              className={`rounded-2xl px-6 py-3 font-bold transition ${
                level === l
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                  : 'bg-white text-slate-600 ring-1 ring-black/5 hover:bg-slate-50'
              }`}
            >
              {l} {t(language, 'units')}
            </button>
          ))}
        </div>
      </div>

      {/* Headline feature: click to build the whole Bagrut */}
      <div className="mb-4">
        <GradientCard
          gradient="from-emerald-500 via-teal-500 to-cyan-500"
          emoji="🏗️"
          title={t(language, 'build_cta')}
          subtitle={t(language, 'build_cta_desc')}
          onClick={() => onNavigate('build')}
        />
      </div>

      <div className="grid gap-4">
        {PILLARS.map((p) => (
          <GradientCard
            key={p.id}
            gradient={p.gradient}
            emoji={p.emoji}
            title={t(language, `pillar_${p.id}`)}
            subtitle={t(language, `pillar_${p.id}_desc`)}
            onClick={() => onNavigate(p.id)}
          />
        ))}
      </div>
    </div>
  );
}
