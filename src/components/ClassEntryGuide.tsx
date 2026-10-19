import { useState } from 'react';
import { Check, Copy, Users } from 'lucide-react';
import type { Language } from '../hooks/useLanguage';
import { classEntryT } from '../locales/class-entry';

/** One instruction next to each action, with the same words students see. */
export default function ClassEntryGuide({
  language,
  className,
  url,
  onOpenRoster,
}: {
  language: Language;
  className: string;
  url: string;
  onOpenRoster?: () => void;
}) {
  const t = classEntryT[language];
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const instructions = t.instructions(className, url);
  return (
    <div className="space-y-3">
      <ol className="space-y-3 text-[var(--vb-text-primary)]">
        <li className="rounded-xl bg-[var(--vb-surface-alt)] p-4">
          <p className="text-base font-bold">1. {t.prepare}</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--vb-text-secondary)]">
            {t.prepareHint}
          </p>
          {onOpenRoster && (
            <button
              type="button"
              onClick={onOpenRoster}
              className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--vb-border)] bg-[var(--vb-surface)] px-3 py-2 text-sm font-bold"
            >
              <Users size={18} aria-hidden="true" />
              {t.manage}
            </button>
          )}
        </li>
        <li className="rounded-xl bg-[var(--vb-surface-alt)] p-4">
          <p className="text-base font-bold">2. {t.share}</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--vb-text-secondary)]">
            {t.shareHint}
          </p>
        </li>
        <li className="rounded-xl bg-[var(--vb-surface-alt)] p-4">
          <p className="text-base font-bold">3. {t.explain}</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--vb-text-secondary)]">
            {t.explainHint}
          </p>
        </li>
      </ol>
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-3 py-3 text-base font-bold text-white"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(instructions);
            setCopied(true);
            setFailed(false);
          } catch {
            setFailed(true);
            setCopied(false);
          }
        }}
      >
        {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
        {copied ? t.copied : t.copyInstructions}
      </button>
      <p aria-live="polite" className="text-sm text-[var(--vb-text-secondary)]">
        {failed ? t.copyFailed : copied ? t.copied : ''}
      </p>
      {failed && (
        <textarea
          readOnly
          aria-label={t.copyInstructions}
          value={instructions}
          rows={7}
          className="w-full rounded-xl border border-[var(--vb-border)] p-3 text-sm"
          onFocus={(e) => e.currentTarget.select()}
        />
      )}
    </div>
  );
}
