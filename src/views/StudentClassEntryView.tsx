import { useRef, useState, type ComponentProps } from 'react';
import { ArrowLeft, CheckCircle2, GraduationCap } from 'lucide-react';
import StudentPinLoginCard from '../components/StudentPinLoginCard';
import JoinGameModal from '../components/JoinGameModal';
import ClassCodeForm from '../components/ClassCodeForm';
import { useLanguage, ALL_LANGUAGES, languageNames } from '../hooks/useLanguage';
import { classEntryT } from '../locales/class-entry';
import { isStudentShell } from '../utils/studentShell';
import {
  parseJoinTarget,
  readLastClass,
  readStudentInvite,
  rememberClass,
} from '../utils/classJoin';
import type StudentAccountLoginView from './StudentAccountLoginView';

// Presentation-only replacement: the existing PIN card, auth listener,
// account restoration and Tier-2 fallback still own authentication.
export default function StudentClassEntryView(
  props: ComponentProps<typeof StudentAccountLoginView>
) {
  const {
    setView,
    error,
    studentLoginClassCode,
    setStudentLoginClassCode,
    onTier2Login,
    cookieBannerOverlay,
  } = props;
  const { language, setLanguage, dir } = useLanguage();
  const t = classEntryT[language];
  const [invite] = useState(() => readStudentInvite(window.location.search));
  const [lastClass] = useState(readLastClass);
  const [selected, setSelected] = useState(() => {
    const initial = parseJoinTarget(studentLoginClassCode || invite.code, 'class');
    return initial?.kind === 'class' ? initial.code : '';
  });
  const [raw, setRaw] = useState(studentLoginClassCode || invite.code);
  const [formError, setFormError] = useState('');
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [gameOpen, setGameOpen] = useState(false);
  const nextHeading = useRef<HTMLHeadingElement>(null);
  const className =
    selected === invite.code ? invite.name : selected === lastClass?.code ? lastClass.name : '';

  const chooseClass = (code: string) => {
    setSelected(code);
    setStudentLoginClassCode(code);
    setFormError('');
    requestAnimationFrame(() => nextHeading.current?.focus());
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseJoinTarget(raw);
    if (target?.kind === 'class') {
      chooseClass(target.code);
      setGameCode(null);
    } else if (target?.kind === 'game') {
      setGameCode(target.code);
      setFormError(t.gameHint);
    } else {
      setGameCode(null);
      setFormError(t.invalid);
    }
  };

  return (
    <div className="vb-page min-h-dvh" dir={dir}>
      <header className="vb-header flex min-h-18 items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {isStudentShell() ? (
          <span />
        ) : (
          <button
            type="button"
            className="vb-button min-h-11 px-3"
            onClick={() => setView('public-landing')}
          >
            <ArrowLeft size={18} aria-hidden="true" className="rtl:rotate-180" /> {t.back}
          </button>
        )}
        <span className="text-lg font-extrabold text-violet-700">Vocaband</span>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-lg px-4 py-6 sm:py-10">
        <nav className="mb-5 grid grid-cols-3 gap-2" aria-label="English / עברית / العربية">
          {ALL_LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              lang={lang}
              aria-pressed={language === lang}
              onClick={() => setLanguage(lang)}
              className={`min-h-11 rounded-xl px-2 py-2 text-base font-bold ${language === lang ? 'bg-violet-700 text-white' : 'border border-[var(--vb-border)] bg-[var(--vb-surface)] text-[var(--vb-text-primary)]'}`}
            >
              {languageNames[lang]}
            </button>
          ))}
        </nav>
        <div className="mb-5 flex items-center gap-3">
          <GraduationCap size={36} className="shrink-0 text-violet-600" aria-hidden="true" />
          <div>
            <h1 className="text-3xl font-extrabold text-[var(--vb-text-primary)]">{t.title}</h1>
            <p className="mt-1 text-base text-[var(--vb-text-secondary)]">
              {selected ? t.nameHint : t.subtitle}
            </p>
          </div>
        </div>
        <ol className="mb-5 grid grid-cols-2 gap-2 text-sm font-bold" aria-label={t.title}>
          {[t.classStep, t.studentStep].map((step, i) => (
            <li
              key={step}
              aria-current={Number(Boolean(selected)) === i ? 'step' : undefined}
              className={`rounded-xl px-3 py-3 ${Number(Boolean(selected)) === i ? 'bg-violet-100 text-violet-900' : 'bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)]'}`}
            >
              {i + 1}. {step}
            </li>
          ))}
        </ol>
        <section className="vb-card p-5 sm:p-6">
          {error && (
            <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-rose-800">
              {error}
            </p>
          )}
          {selected ? (
            <>
              <div className="mb-4 rounded-xl bg-emerald-50 p-4 text-emerald-950">
                <h2
                  ref={nextHeading}
                  tabIndex={-1}
                  className="flex items-center gap-2 text-lg font-bold"
                >
                  <CheckCircle2 size={20} aria-hidden="true" />
                  {className || t.ready}
                </h2>
                <button
                  type="button"
                  className="mt-2 min-h-11 text-sm font-semibold underline"
                  onClick={() => {
                    setSelected('');
                    setRaw('');
                    setStudentLoginClassCode('');
                    setFormError('');
                    setGameCode(null);
                  }}
                >
                  {t.change}
                </button>
              </div>
              <StudentPinLoginCard
                key={selected}
                classCode={selected}
                prefilledStudentId={selected === invite.code ? invite.studentId : null}
                onTier2Login={onTier2Login}
                onSuccess={() => rememberClass(selected, className)}
              />
              <p className="mt-4 text-sm leading-relaxed text-[var(--vb-text-secondary)]">
                {t.personalHint}
              </p>
            </>
          ) : (
            <>
              {lastClass && (
                <div className="mb-5 rounded-xl bg-violet-50 p-4 text-violet-950">
                  <p className="mb-2 text-sm font-semibold">{t.lastClass}</p>
                  <button
                    type="button"
                    className="min-h-12 w-full rounded-xl bg-white px-4 py-3 text-base font-bold shadow-sm"
                    onClick={() => chooseClass(lastClass.code)}
                  >
                    {lastClass.name || t.continue}
                  </button>
                </div>
              )}
              <ClassCodeForm
                code={raw}
                error={formError}
                isGameCode={Boolean(gameCode)}
                onSubmit={submit}
                onCodeChange={(value) => {
                  setRaw(value);
                  setFormError('');
                  setGameCode(null);
                }}
                onJoinGame={() => setGameOpen(true)}
                onConfirmClass={() => {
                  if (gameCode) {
                    chooseClass(gameCode);
                    setGameCode(null);
                  }
                }}
              />
            </>
          )}
        </section>
        <p className="mt-3 text-center text-sm text-[var(--vb-text-secondary)]">{t.noSignup}</p>
        <details className="mt-4 rounded-xl border border-[var(--vb-border)] bg-[var(--vb-surface)] px-4 py-1 text-[var(--vb-text-primary)]">
          <summary className="min-h-11 cursor-pointer py-3 font-bold">{t.needHelp}</summary>
          <p className="pb-3 text-base leading-relaxed">{t.help}</p>
        </details>
        <button
          type="button"
          className="mt-4 min-h-11 w-full px-2 text-sm font-semibold text-violet-700 underline"
          onClick={() => setGameOpen(true)}
        >
          {t.game}
        </button>
      </main>
      {gameOpen && (
        <JoinGameModal initialCode={gameCode ?? undefined} onClose={() => setGameOpen(false)} />
      )}
      {cookieBannerOverlay}
    </div>
  );
}
