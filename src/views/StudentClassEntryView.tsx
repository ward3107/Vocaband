import { useRef, useState, type ComponentProps } from 'react';
import { ArrowLeft, ArrowUpRight, Gamepad2 } from 'lucide-react';
import StudentPinLoginCard from '../components/StudentPinLoginCard';
import JoinGameModal from '../components/JoinGameModal';
import ClassCodeForm from '../components/ClassCodeForm';
import StudentLangButton from '../components/StudentLangButton';
import { useLanguage } from '../hooks/useLanguage';
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
  const { language, dir } = useLanguage();
  const t = classEntryT[language];
  const [invite] = useState(() => readStudentInvite(window.location.search));
  const [lastClass] = useState(readLastClass);
  const [selected, setSelected] = useState(() => {
    const initial = parseJoinTarget(studentLoginClassCode || invite.code, 'class');
    return initial?.kind === 'class' ? initial.code : '';
  });
  const [signingIn, setSigningIn] = useState(false);
  const [allowInvitePrefill, setAllowInvitePrefill] = useState(true);
  const [raw, setRaw] = useState(studentLoginClassCode || invite.code);
  const [formError, setFormError] = useState('');
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [gameOpen, setGameOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const fromInvite = allowInvitePrefill && selected === invite.code && Boolean(selected);
  const className =
    selected === invite.code ? invite.name : selected === lastClass?.code ? lastClass.name : '';

  const chooseClass = (code: string) => {
    setSelected(code);
    setRaw(code);
    setStudentLoginClassCode(code);
    setFormError('');
    requestAnimationFrame(() => heading.current?.focus());
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
    setFormError('');
    setGameCode(null);
    requestAnimationFrame(() => document.getElementById('class-entry-code')?.focus());
  };
  useBackLayer(changeClass, { enabled: Boolean(selected), priority: 10, escape: false });
  const back = () => {
    if (!modalBackStack.closeTop()) window.history.back();
  };

  return (
    <div
      className="min-h-dvh bg-[#f8f9f6] text-[#1d2940] [--vb-text-primary:#1d2940] [--vb-text-secondary:#606b7e] [--vb-accent:#6d28d9]"
      dir={dir}
    >
      <header className="border-b border-[#e5e8e0] bg-white">
        <div className="mx-auto flex min-h-16 w-full max-w-lg items-center justify-between gap-3 px-4">
          {isStudentShell() && !selected ? (
            <span className="w-11" />
          ) : (
            <button
              type="button"
              onClick={back}
              aria-label={t.back}
              className="grid size-11 place-items-center rounded-xl hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-violet-700"
            >
              <ArrowLeft size={21} aria-hidden="true" className="rtl:rotate-180" />
            </button>
          )}
          <BrandWordmark />
          <StudentLangButton />
        </div>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-lg px-4 pb-12 pt-6 sm:pt-10">
        <section className="rounded-3xl border border-[#e0e5dc] bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-3">
            <h1
              ref={heading}
              tabIndex={-1}
              className="min-w-0 break-words font-headline text-2xl font-extrabold leading-tight sm:text-3xl"
            >
              {selected ? className || t.title : t.title}
            </h1>
            {selected && (
              <button
                type="button"
                className="min-h-11 -my-2 max-w-28 shrink-0 rounded-lg px-2 text-sm font-semibold text-violet-800 underline underline-offset-4 disabled:opacity-50"
                disabled={signingIn}
                onClick={changeClass}
              >
                {t.change}
              </button>
            )}
          </div>
          {error && (
            <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-rose-800">
              {error}
            </p>
          )}
          {selected ? (
            <StudentPinLoginCard
              key={selected}
              classCode={selected}
              guidedJoin={fromInvite && !invite.studentId}
              prefilledStudentId={fromInvite ? invite.studentId : null}
              onTier2Login={onTier2Login}
              onBusyChange={setSigningIn}
              onSuccess={() => rememberClass(selected, className)}
            />
          ) : (
            <>
              {lastClass && (
                <div className="mb-5 rounded-xl border border-[#e3e7d6] bg-[#f6f8ef] px-4 pt-3">
                  <p className="text-xs font-bold text-[#606b7e]">{t.lastClass}</p>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center justify-between gap-3 text-start font-extrabold"
                    onClick={() => chooseClass(lastClass.code)}
                  >
                    {lastClass.name || t.continue}
                    <ArrowUpRight size={18} aria-hidden="true" className="rtl:-scale-x-100" />
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
        {!selected && (
          <div className="mt-3">
            <button
              type="button"
              className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-violet-800 hover:underline"
              onClick={() => setGameOpen(true)}
            >
              <Gamepad2 size={18} aria-hidden="true" />
              {t.game}
            </button>
            <details className="px-2 text-[#606b7e]">
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">
                {t.needHelp}
              </summary>
              <p className="pb-3 text-sm leading-relaxed">{t.help}</p>
            </details>
          </div>
        )}
      </main>
      {gameOpen && (
        <JoinGameModal initialCode={gameCode ?? undefined} onClose={() => setGameOpen(false)} />
      )}
      {cookieBannerOverlay}
    </div>
  );
}
