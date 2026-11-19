import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { Language } from '../hooks/useLanguage';
import { scanPinT } from '../locales/student/scan-pin';
import { classEntryT } from '../locales/class-entry';

/** One instruction next to each action, with the same words students see. */
export default function ClassEntryGuide({
  language,
  className,
  classCode,
  url,
  scanInstructions,
}: {
  language: Language;
  className: string;
  classCode: string;
  url: string;
  scanInstructions?: string;
}) {
  const t = classEntryT[language];
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const instructions = scanInstructions ?? t.instructions(className, url, classCode);
  return (
    <div className="space-y-3">
      <ol className="space-y-3 text-[var(--vb-text-primary)]">
        <li className="rounded-xl bg-[var(--vb-surface-alt)] p-4">
          <p className="text-base font-bold">1. {t.prepare}</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--vb-text-secondary)]">
            {scanInstructions ? scanPinT[language].teacherHint : t.prepareHint}
          </p>
        </li>
        <li className="rounded-xl bg-[var(--vb-surface-alt)] p-4">
          <p className="text-base font-bold">2. {t.share}</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--vb-text-secondary)]">
            {scanInstructions ? t.fixedLink : t.shareHint}
          </p>
        </li>
        <li className="rounded-xl bg-[var(--vb-surface-alt)] p-4">
          <p className="text-base font-bold">3. {t.explain}</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--vb-text-secondary)]">
            {scanInstructions ? scanPinT[language].share : t.explainHint}
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
