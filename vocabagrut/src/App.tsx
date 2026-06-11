import { useState } from 'react';
import { useLanguage, ALL_LANGUAGES, languageShortLabels } from './hooks/useLanguage';
import { useSession } from './hooks/useSession';
import { t } from './i18n/strings';
import type { View, UnitLevel } from './core/types';
import HomeView from './views/HomeView';
import BuildBagrutView from './views/BuildBagrutView';
import CustomWordsView from './views/CustomWordsView';
import VocabularyView from './views/VocabularyView';
import ReadingView from './views/ReadingView';
import WritingView from './views/WritingView';
import ExamBankView from './views/ExamBankView';
import LoginView from './views/LoginView';

export default function App() {
  const { language, setLanguage, dir } = useLanguage();
  const { session, loading, configured, signOut } = useSession();
  const [view, setView] = useState<View>('home');
  const [level, setLevel] = useState<UnitLevel>(4);

  const home = () => setView('home');

  // Sign-in not set up (env missing) — tell the operator instead of crashing.
  if (!configured) {
    return (
      <div dir={dir} className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="max-w-sm text-slate-500">{t(language, 'config_missing')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400">{t(language, 'loading')}</p>
      </div>
    );
  }

  if (!session) return <LoginView />;

  return (
    <div dir={dir} className="min-h-screen">
      {/* Top-right controls: language toggle + sign out. */}
      <div className="fixed top-3 z-50 flex items-center gap-1 rounded-full bg-white/80 p-1 shadow-sm ring-1 ring-black/5 backdrop-blur"
           style={{ insetInlineEnd: '0.75rem' }}>
        {ALL_LANGUAGES.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLanguage(l)}
            className={`rounded-full px-3 py-1 text-sm font-bold transition ${
              language === l ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {languageShortLabels[l]}
          </button>
        ))}
        <button
          type="button"
          onClick={signOut}
          title={t(language, 'signOut')}
          aria-label={t(language, 'signOut')}
          className="rounded-full px-3 py-1 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
        >
          ⏻
        </button>
      </div>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {view === 'home' && <HomeView level={level} setLevel={setLevel} onNavigate={setView} />}
        {view === 'build' && <BuildBagrutView level={level} onBack={home} onManageWords={() => setView('custom')} />}
        {view === 'custom' && <CustomWordsView level={level} onBack={home} />}
        {view === 'vocabulary' && <VocabularyView level={level} onBack={home} />}
        {view === 'reading' && <ReadingView level={level} onBack={home} />}
        {view === 'writing' && <WritingView level={level} onBack={home} />}
        {view === 'exams' && <ExamBankView level={level} onBack={home} />}
      </main>
    </div>
  );
}
