import { useState } from 'react';
import { Copy, KeyRound, Link, MessageCircle, Send } from 'lucide-react';
import type { Language } from '../hooks/useLanguage';
import { classEntryT } from '../locales/class-entry';
import { studentInviteT } from '../locales/student-invite';
import { buildStudentInviteMessage, type StudentInviteMode } from '../utils/studentInvites';
import ClassEntryLanguagePicker from './ClassEntryLanguagePicker';
import ModalShell from './ui/ModalShell';

/** Mounted only for the selected student, so no other student's PIN enters the message. */
export default function StudentWhatsAppInviteModal({
  className,
  classCode,
  studentId,
  studentName,
  pin,
  language: initialLanguage,
  onClose,
}: {
  className: string;
  classCode: string;
  studentId: string;
  studentName: string;
  pin: string | null;
  language: Language;
  onClose: () => void;
}) {
  const [language, setLanguage] = useState(initialLanguage);
  const [mode, setMode] = useState<StudentInviteMode>(pin ? 'both' : 'link');
  const [copyStatus, setCopyStatus] = useState<'copied' | 'failed' | null>(null);
  const selectedMode = pin ? mode : 'link';
  const t = studentInviteT[language];
  const entry = classEntryT[language];
  const message = buildStudentInviteMessage({
    className,
    classCode,
    studentId,
    studentName,
    pin,
    language,
    mode: selectedMode,
  });

  return (
    <ModalShell
      open
      onClose={onClose}
      variant="paper"
      icon={<MessageCircle size={22} aria-hidden="true" />}
      zIndex={110}
      dir={language === 'en' ? 'ltr' : 'rtl'}
      title={`${t.title} · ${studentName}`}
      subtitle={t.hint}
      closeAriaLabel={t.close}
      footer={
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-base font-bold text-white hover:bg-emerald-800"
        >
          <MessageCircle size={20} aria-hidden="true" />
          {t.share}
        </a>
      }
    >
      <ClassEntryLanguagePicker
        language={language}
        onChange={(value) => {
          setLanguage(value);
          setCopyStatus(null);
        }}
      />
      <fieldset>
        <legend className="mb-2 text-base font-bold text-[var(--vb-text-primary)]">
          {t.contents}
        </legend>
        <div className="grid gap-2">
          {(['both', 'link', 'pin'] as const).map((value) => (
            <label
              key={value}
              className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border p-3 text-base font-bold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-700 ${
                selectedMode === value
                  ? 'border-[#1d2940] bg-[#f2f5e9] text-[#1d2940]'
                  : 'border-slate-200 bg-white text-slate-700'
              } ${!pin && value !== 'link' ? 'cursor-not-allowed opacity-40' : ''}`}
            >
              <input
                type="radio"
                name="student-invite-mode"
                value={value}
                checked={selectedMode === value}
                disabled={!pin && value !== 'link'}
                onChange={() => {
                  setMode(value);
                  setCopyStatus(null);
                }}
                className="h-4 w-4 shrink-0 accent-violet-700"
              />
              {value === 'both' ? <Send size={18} aria-hidden="true" /> : value === 'link' ? <Link size={18} aria-hidden="true" /> : <KeyRound size={18} aria-hidden="true" />}
              {t[value]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 block text-sm font-bold text-[var(--vb-text-primary)]">
        {t.preview}
        <textarea
          readOnly
          value={message}
          rows={5}
          dir="auto"
          onFocus={(event) => event.currentTarget.select()}
          className="mt-2 min-h-40 w-full resize-y rounded-2xl border border-[#e1e5d6] bg-[#f6f8ee] p-4 text-sm font-normal leading-relaxed text-[#1d2940]"
        />
      </label>
      <button
        type="button"
        className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(message);
            setCopyStatus('copied');
          } catch {
            setCopyStatus('failed');
          }
        }}
      >
        <Copy size={18} aria-hidden="true" />
        {t.copy}
      </button>
      <p role="status" className="mt-2 text-sm">
        {copyStatus === 'copied'
          ? entry.copied
          : copyStatus === 'failed'
            ? t.copyFailed
            : t.personalHint}
      </p>
    </ModalShell>
  );
}
