import type { FormEventHandler } from 'react';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { classEntryT } from '../locales/class-entry';

export default function ClassCodeForm({
  code,
  onCodeChange,
  error,
  isGameCode,
  onSubmit,
  onJoinGame,
  onConfirmClass,
}: {
  code: string;
  onCodeChange: (value: string) => void;
  error: string;
  isGameCode: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onJoinGame: () => void;
  onConfirmClass: () => void;
}) {
  const { language } = useLanguage();
  const t = classEntryT[language];
  return (
    <form onSubmit={onSubmit}>
      <label
        htmlFor="class-entry-code"
        className="mb-2 block text-base font-bold text-[var(--vb-text-primary)]"
      >
        {t.codeLabel}
      </label>
      <input
        id="class-entry-code"
        name="classCode"
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        dir="ltr"
        aria-invalid={Boolean(error)}
        aria-describedby="class-entry-hint class-entry-error"
        maxLength={2000}
        placeholder="ABCD2345"
        className="min-h-16 w-full rounded-2xl border-2 border-[#cdd1db] bg-[#f8f9fc] px-4 py-4 text-center font-mono text-2xl font-bold tracking-wider text-[#1d2940] placeholder:text-[#929aab] focus:border-violet-600 focus:outline-2 focus:outline-violet-200"
      />
      <p id="class-entry-hint" className="mt-2 text-sm text-[var(--vb-text-secondary)]">
        {t.codeHint}
      </p>
      <div id="class-entry-error" aria-live="polite">
        {error && <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}
      </div>
      {isGameCode ? (
        <button
          type="button"
          onClick={onJoinGame}
          className="mt-5 min-h-14 w-full rounded-2xl bg-[#1d2940] p-3 text-lg font-bold text-white hover:bg-[#303f5b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
        >
          {t.joinGame}
        </button>
      ) : (
        <button
          type="submit"
          className="mt-5 flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl bg-[#1d2940] p-3 ps-5 text-base font-bold text-white hover:bg-[#303f5b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
        >
          {t.continue}
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#d8f36a] text-[#1d2940]"><ArrowRight size={20} className="rtl:rotate-180" aria-hidden="true" /></span>
        </button>
      )}
      {isGameCode && (
        <button
          type="button"
          onClick={onConfirmClass}
          className="mt-2 min-h-11 w-full rounded-xl border border-[var(--vb-border)] px-3 py-2 text-base font-bold"
        >
          {t.classCodeInstead}
        </button>
      )}
    </form>
  );
}
