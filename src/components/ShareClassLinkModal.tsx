import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, GraduationCap, MessageCircle, Printer, Users } from 'lucide-react';
import { useLanguage, type Language } from '../hooks/useLanguage';
import { teacherDashboardT } from '../locales/teacher/dashboard';
import { buildClassJoinUrl } from '../utils/classJoin';
import { classEntryT } from '../locales/class-entry';
import ClassEntryGuide from './ClassEntryGuide';
import ClassEntryLanguagePicker from './ClassEntryLanguagePicker';
import ModalShell, { ModalPrimaryButton } from './ui/ModalShell';

interface ShareClassLinkModalProps {
  open: boolean;
  onClose: () => void;
  className: string;
  code: string;
  justCreated?: boolean;
  language?: Language;
  onOpenRoster?: () => void;
  assignmentId?: string;
  assignmentTitle?: string;
  playMode?: 'class-minute';
}

// Unmount the body on close so clipboard feedback never survives a reopen.
export default function ShareClassLinkModal(props: ShareClassLinkModalProps) {
  return props.open ? <ShareClassLinkContent {...props} /> : null;
}

function ShareClassLinkContent({
  onClose,
  className,
  code,
  onOpenRoster,
  assignmentId,
  assignmentTitle,
  playMode,
  justCreated,
  language: inviteLanguage,
}: ShareClassLinkModalProps) {
  const { language: uiLanguage } = useLanguage();
  const [language, setLanguage] = useState<Language>(inviteLanguage ?? uiLanguage);
  const dir = language === 'en' ? 'ltr' : 'rtl';
  const t = teacherDashboardT[language];
  const entry = classEntryT[language];
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);
  const url = buildClassJoinUrl(code, { className, assignmentId, playMode });
  const instructions = entry.instructions(className, url, code);
  const baseInvite = !assignmentId && !playMode;
  const L = (en: string, he: string, ar: string) =>
    language === 'he' ? he : language === 'ar' ? ar : en;
  const title = assignmentId
    ? assignmentTitle || L('Share assignment', 'שיתוף משימה', 'مشاركة الواجب')
    : playMode
      ? L('Send Class Minute', 'שליחת דקת כיתה', 'إرسال دقيقة الصف')
      : justCreated
        ? L(
            'Class created — invite students',
            'הכיתה נוצרה — מזמינים תלמידים',
            'تم إنشاء الصف — ادعُ الطلاب'
          )
        : entry.invite;
  const copy = async (value: string, kind: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setCopyFailed(false);
    } catch {
      setCopied(null);
      setCopyFailed(true);
    }
  };
  const openShare = (href: string) => window.open(href, '_blank', 'noopener,noreferrer');

  return (
    <ModalShell
      open
      variant="paper"
      onClose={onClose}
      dir={dir}
      zIndex={100}
      icon="🎓"
      title={`${title} · ${className}`}
      closeAriaLabel={L('Close', 'סגירה', 'إغلاق')}
      subtitle={
        baseInvite
          ? entry.shareHint
          : L(
              'The link opens this activity after the student enters their class.',
              'הקישור פותח את הפעילות אחרי כניסת התלמיד לכיתה.',
              'يفتح الرابط هذا النشاط بعد دخول الطالب إلى صفه.'
            )
      }
      footer={<ModalPrimaryButton onClick={onClose}>{t.shareClassLinkDone}</ModalPrimaryButton>}
    >
      <ClassEntryLanguagePicker language={language} onChange={setLanguage} />
      {baseInvite && (
        <div className="mb-4 rounded-2xl border border-[#e1e5d6] bg-[#f6f8ee] p-4 text-[#1d2940]">
          <p className="font-bold">1. {entry.prepare}</p>
          <p className="mt-1 text-sm leading-relaxed">{entry.prepareHint}</p>
          {onOpenRoster && (
            <button
              type="button"
              className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold"
              onClick={() => {
                onClose();
                onOpenRoster();
              }}
            >
              <Users size={18} aria-hidden="true" />
              {entry.manage}
            </button>
          )}
        </div>
      )}
      <p className="mb-3 text-base font-bold">{baseInvite ? `2. ${entry.share}` : entry.share}</p>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(instructions)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-base font-bold text-white"
      >
        <MessageCircle size={20} aria-hidden="true" />
        {t.shareWhatsApp}
      </a>
      <button
        type="button"
        onClick={() => {
          void copy(url, 'link');
        }}
        className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--vb-border)] bg-[var(--vb-surface-alt)] px-4 py-3 text-base font-bold"
      >
        {copied === 'link' ? (
          <Check size={18} aria-hidden="true" />
        ) : (
          <Copy size={18} aria-hidden="true" />
        )}
        {copied === 'link' ? entry.copied : entry.copyLink}
      </button>
      <p aria-live="polite" className="mt-2 text-sm text-[var(--vb-text-secondary)]">
        {copyFailed ? entry.copyFailed : copied ? entry.copied : baseInvite ? entry.fixedLink : ''}
      </p>
      <input
        readOnly
        value={url}
        aria-label={entry.copyLink}
        dir="ltr"
        onFocus={(e) => e.currentTarget.select()}
        className="mt-2 min-h-11 w-full rounded-lg border border-[var(--vb-border)] bg-[var(--vb-surface)] px-3 py-2 text-sm text-[var(--vb-text-secondary)]"
      />
      {baseInvite && (
        <div className="mt-4 rounded-xl bg-[var(--vb-surface-alt)] p-4">
          <p className="font-bold">3. {entry.explain}</p>
          <p className="mt-1 text-sm leading-relaxed">{entry.explainHint}</p>
        </div>
      )}
      <details className="mt-3 rounded-xl border border-[var(--vb-border)] px-4 py-1">
        <summary className="min-h-11 cursor-pointer py-3 text-base font-bold">
          {entry.showQr}
        </summary>
        <div className="mx-auto mb-4 w-fit rounded-xl bg-white p-3">
          <QRCodeSVG
            value={url}
            size={184}
            level="M"
            fgColor="#1F2937"
            bgColor="#FFFFFF"
            aria-label={`${entry.invite}: ${className}`}
          />
        </div>
      </details>
      {baseInvite && (
        <details className="mt-3 rounded-xl border border-[var(--vb-border)] px-4 py-1">
          <summary className="min-h-11 cursor-pointer py-3 text-base font-bold">
            {entry.teacherHelp}
          </summary>
          <div className="pb-3">
            <ClassEntryGuide
              language={language}
              className={className}
              classCode={code}
              url={url}
              onOpenRoster={
                onOpenRoster
                  ? () => {
                      onClose();
                      onOpenRoster();
                    }
                  : undefined
              }
            />
          </div>
        </details>
      )}
      <details className="mt-3 rounded-xl border border-[var(--vb-border)] px-4 py-1">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">
          {entry.moreWays}
        </summary>
        <p className="mb-2 text-sm">
          {t.shareClassLinkCodeLabel}: <bdi className="font-mono text-lg font-bold">{code}</bdi>
        </p>
        <button
          type="button"
          onClick={() => {
            void copy(code, 'code');
          }}
          className="mb-2 min-h-11 rounded-xl border border-[var(--vb-border)] px-3 py-2 text-sm font-bold"
        >
          {copied === 'code' ? entry.copied : entry.copyCode}
        </button>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              openShare(
                `https://classroom.google.com/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(className)}`
              )
            }
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white"
          >
            <GraduationCap size={18} aria-hidden="true" />
            {t.shareGoogleClassroom}
          </button>
          <button
            type="button"
            onClick={() =>
              openShare(
                `https://teams.microsoft.com/share?href=${encodeURIComponent(url)}&msgText=${encodeURIComponent(className)}&preview=true`
              )
            }
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-3 py-2 text-sm font-bold text-white"
          >
            <Users size={18} aria-hidden="true" />
            {t.shareTeams}
          </button>
        </div>
        {baseInvite && (
          <button
            type="button"
            onClick={() =>
              openShare(
                `/poster?class=${encodeURIComponent(code)}&ref=teacher-${encodeURIComponent(code)}`
              )
            }
            className="mb-3 inline-flex min-h-11 items-center gap-2 px-3 py-2 text-sm font-bold"
          >
            <Printer size={18} aria-hidden="true" />
            {t.printPoster}
          </button>
        )}
      </details>
    </ModalShell>
  );
}
