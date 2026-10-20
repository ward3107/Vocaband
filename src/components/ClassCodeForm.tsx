import type { FormEventHandler } from 'react';
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
        className="min-h-14 w-full rounded-xl border-2 border-violet-300 bg-[var(--vb-surface)] px-4 py-3 text-center text-xl font-bold text-[var(--vb-text-primary)] focus-visible:outline-2 focus-visible:outline-violet-600"
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
          className="mt-4 min-h-12 w-full rounded-xl bg-violet-700 p-3 text-lg font-bold text-white"
        >
          {t.joinGame}
        </button>
      ) : (
        <button
          type="submit"
          className="mt-4 min-h-12 w-full rounded-xl bg-violet-700 p-3 text-lg font-bold text-white"
        >
          {t.continue}
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
