import { useRef, useState, type ComponentProps } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Gamepad2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
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
import BrandWordmark from '../components/BrandWordmark';
import { useBackLayer } from '../hooks/useBackLayer';
import { modalBackStack } from '../utils/modalBackStack';
import type StudentAccountLoginView from './StudentAccountLoginView';

// Presentation-only replacement: the existing PIN card, auth listener,
// account restoration and Tier-2 fallback still own authentication.
export default function StudentClassEntryView(
  props: ComponentProps<typeof StudentAccountLoginView>
) {
  const {
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
  const [signingIn, setSigningIn] = useState(false);
  const [pinStep, setPinStep] = useState(false);
  const [allowInvitePrefill, setAllowInvitePrefill] = useState(true);
  const [raw, setRaw] = useState(studentLoginClassCode || invite.code);
  const [formError, setFormError] = useState('');
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [gameOpen, setGameOpen] = useState(false);
  const nextHeading = useRef<HTMLHeadingElement>(null);
  const className =
    selected === invite.code ? invite.name : selected === lastClass?.code ? lastClass.name : '';

  const chooseClass = (code: string) => {
    setSelected(code);
    setRaw(code);
    setPinStep(false);
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

  const changeClass = () => {
    setSelected('');
    setStudentLoginClassCode('');
    setAllowInvitePrefill(false);
    setPinStep(false);
    setFormError('');
    setGameCode(null);
    requestAnimationFrame(() => document.getElementById('class-entry-code')?.focus());
  };
  useBackLayer(changeClass, { enabled: Boolean(selected), priority: 10, escape: false });
  const back = () => {
    if (!modalBackStack.closeTop()) window.history.back();
  };
  const currentStep = selected ? (pinStep ? 2 : 1) : 0;

  return (
    <div
      className="min-h-dvh bg-[#fffdf7] text-[#1d2940] [--vb-text-primary:#1d2940] [--vb-text-secondary:#606b7e] [--vb-accent:#7c3aed]"
      dir={dir}
    >
      <header className="mx-auto flex min-h-20 max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
        {isStudentShell() && !selected ? (
          <span />
        ) : (
          <button
            type="button"
            onClick={back}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#e2e2db] bg-white px-4 text-sm font-bold hover:bg-[#f1f0e9] focus-visible:outline-2 focus-visible:outline-violet-600"
          >
            <ArrowLeft size={18} aria-hidden="true" className="rtl:rotate-180" /> {t.back}
          </button>
        )}
        <BrandWordmark />
      </header>
      <main
        id="main-content"
        className="mx-auto grid w-full max-w-6xl gap-8 px-4 pb-8 pt-2 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16 lg:py-10"
      >
        <div className="relative lg:pb-14">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#dfe4ce] bg-[#eef4db] px-3 py-1.5 text-xs font-extrabold tracking-wide text-[#455523]">
            <Sparkles size={14} aria-hidden="true" /> {t.entryPass}
          </div>
          <h1 className="max-w-lg font-headline text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
            {t.title}
            <span aria-hidden="true" className="text-violet-600">
              .
            </span>
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-[#606b7e] lg:text-lg">
            {selected ? (pinStep ? t.pinHint : t.nameHint) : t.subtitle}
          </p>
          <div aria-hidden="true" className="relative mx-auto mt-10 hidden h-64 max-w-sm lg:block">
            <div className="absolute inset-x-6 bottom-4 h-44 -rotate-6 rounded-[40px] bg-[#ebe5ff]" />
            <div className="absolute inset-x-10 bottom-8 h-44 rotate-3 rounded-[32px] border-2 border-[#1d2940] bg-white p-5 shadow-[8px_8px_0_#1d2940]">
              <div className="flex items-center justify-between">
                <span className="font-headline text-xs font-black tracking-[.2em]">
                  VOCABAND CLASS CLUB
                </span>
                <span className="h-3 w-3 rounded-full bg-[#d8f36a]" />
              </div>
              <div className="mt-5 flex justify-center gap-3" dir="ltr">
                <span className="grid h-20 w-20 -rotate-6 place-items-center rounded-2xl bg-[#d8f36a] font-headline text-5xl font-black">
                  A
                </span>
                <span className="grid h-20 w-20 rotate-6 place-items-center rounded-2xl bg-[#ffcfb4] font-headline text-5xl font-black">
                  B
                </span>
              </div>
            </div>
            <span className="absolute -end-1 top-0 grid h-20 w-20 rotate-12 place-items-center rounded-full border-4 border-[#fffdf7] bg-violet-600 text-4xl text-white">
              ✦
            </span>
            <span className="absolute bottom-0 start-0 grid h-16 w-16 -rotate-12 place-items-center rounded-2xl border-2 border-[#1d2940] bg-[#fff0b4] text-3xl">
              🦊
            </span>
          </div>
          <p className="mt-7 hidden text-center font-headline text-lg font-bold lg:block">
            {t.welcome}
          </p>
        </div>
        <div className="min-w-0">
          <nav
            className="mb-5 flex rounded-full border border-[#e2e2db] bg-[#f1f0e9] p-1"
            aria-label="English / עברית / العربية"
          >
            {ALL_LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                lang={lang}
                aria-pressed={language === lang}
                onClick={() => setLanguage(lang)}
                className={`min-h-11 flex-1 rounded-full px-2 py-2 text-sm font-bold transition-colors ${language === lang ? 'bg-white text-[#1d2940] shadow-sm' : 'text-[#606b7e] hover:text-[#1d2940]'}`}
              >
                {languageNames[lang]}
              </button>
            ))}
          </nav>
          <section className="overflow-hidden rounded-[28px] border border-[#dadcd5] bg-white shadow-[0_8px_0_#eeeee6]">
            <ol
              className="grid grid-cols-3 border-b border-[#e9eae3] bg-[#fbfcf7] px-3 py-4 text-xs font-bold sm:px-5 sm:text-sm"
              aria-label={t.title}
            >
              {[t.classStep, t.studentStep, t.pinStep].map((step, i) => (
                <li
                  key={step}
                  aria-current={currentStep === i ? 'step' : undefined}
                  className={`flex items-center justify-center gap-1.5 ${currentStep === i ? 'text-[#1d2940]' : 'text-[#798171]'}`}
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${currentStep > i ? 'bg-[#d8f36a] text-[#354218]' : currentStep === i ? 'bg-[#1d2940] text-white' : 'border border-[#d9ddd0]'}`}
                  >
                    {currentStep > i ? <Check size={14} aria-hidden="true" /> : i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <div className="p-5 sm:p-7">
              {error && (
                <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-rose-800">
                  {error}
                </p>
              )}
              {selected ? (
                <>
                  <div className="mb-5 flex items-center gap-3 border-b border-dashed border-[#dfe2e9] pb-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#eef4db] text-[#455523]">
                      <CheckCircle2 size={22} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2
                        ref={nextHeading}
                        tabIndex={-1}
                        className="break-words text-lg font-extrabold"
                      >
                        {className || t.ready}
                      </h2>
                      <span
                        dir="ltr"
                        className="font-mono text-xs font-bold tracking-wider text-[#606b7e]"
                      >
                        {selected}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="min-h-11 max-w-28 rounded-xl px-2 text-xs font-bold text-violet-700 underline underline-offset-4"
                      disabled={signingIn}
                      onClick={changeClass}
                    >
                      {t.change}
                    </button>
                  </div>
                  <StudentPinLoginCard
                    key={selected}
                    classCode={selected}
                    prefilledStudentId={
                      allowInvitePrefill && selected === invite.code ? invite.studentId : null
                    }
                    onTier2Login={onTier2Login}
                    onBusyChange={setSigningIn}
                    onStepChange={(step) => setPinStep(step === 'pin')}
                    onSuccess={() => rememberClass(selected, className)}
                  />
                  <p className="mt-5 text-sm leading-relaxed text-[#606b7e]">{t.personalHint}</p>
                </>
              ) : (
                <>
                  {lastClass && (
                    <div className="mb-5 rounded-2xl border border-[#e3e7d6] bg-[#f6f8ef] p-4">
                      <p className="mb-1 text-xs font-bold text-[#606b7e]">{t.lastClass}</p>
                      <button
                        type="button"
                        className="flex min-h-11 w-full items-center justify-between gap-3 text-start text-base font-extrabold"
                        onClick={() => chooseClass(lastClass.code)}
                      >
                        {lastClass.name || t.continue}
                        <ArrowUpRight size={20} aria-hidden="true" className="rtl:-scale-x-100" />
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
            </div>
          </section>
          <p className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-[#606b7e]">
            <ShieldCheck size={16} aria-hidden="true" />
            {t.noSignup}
          </p>
          <button
            type="button"
            className="mt-5 flex min-h-14 w-full items-center gap-3 rounded-2xl border border-[#e3e2dc] px-4 py-3 text-start text-sm font-bold hover:bg-[#f4f2ea]"
            onClick={() => setGameOpen(true)}
          >
            <Gamepad2 size={22} className="shrink-0 text-violet-600" aria-hidden="true" />
            <span className="flex-1">{t.game}</span>
            <ArrowUpRight size={18} className="shrink-0 rtl:-scale-x-100" aria-hidden="true" />
          </button>
          <details className="mt-3 px-2 text-[#606b7e]">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">
              {t.needHelp}
            </summary>
            <p className="pb-3 text-sm leading-relaxed">{t.help}</p>
          </details>
        </div>
      </main>
      {gameOpen && (
        <JoinGameModal initialCode={gameCode ?? undefined} onClose={() => setGameOpen(false)} />
      )}
      {cookieBannerOverlay}
    </div>
  );
}
