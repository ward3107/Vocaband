import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Maximize2, Users, X } from "lucide-react";
import type { Language } from "../../hooks/useLanguage";
import { useBackLayer } from "../../hooks/useBackLayer";
import { useClipboardFeedback } from "../../hooks/useClipboardFeedback";
import QPAvatar from "../QPAvatar";

export interface JoinPlayer { id: string; name: string; avatar: string }

const COPY = {
  en: { title: "Invite your class", hint: "Scan the QR code or enter the class code to join.", code: "Class code", joined: "Joined students", empty: "Waiting for students to join…", copy: "Copy join link", copied: "Copied!", enlarge: "Enlarge QR and participants", close: "Back to game", status: "Joined" },
  he: { title: "הזמנת הכיתה", hint: "סורקים את קוד ה־QR או מקלידים את קוד הכיתה כדי להצטרף.", code: "קוד כיתה", joined: "תלמידים שהצטרפו", empty: "ממתינים שתלמידים יצטרפו…", copy: "העתקת קישור להצטרפות", copied: "הועתק!", enlarge: "הגדלת QR ורשימת משתתפים", close: "חזרה למשחק", status: "הצטרף/ה" },
  ar: { title: "دعوة الصف", hint: "امسحوا رمز QR أو أدخلوا رمز الصف للانضمام.", code: "رمز الصف", joined: "الطلاب المنضمون", empty: "في انتظار انضمام الطلاب…", copy: "نسخ رابط الانضمام", copied: "تم النسخ!", enlarge: "تكبير QR وقائمة المشاركين", close: "العودة للعبة", status: "انضم" },
} as const;
const copyFor = (language: Language) => COPY[language === "he" ? "he" : language === "ar" ? "ar" : "en"];

interface JoinProps {
  code: string;
  url: string;
  language: Language;
}

export function JoinCodeButton({ code, url, language, onClick }: JoinProps & { onClick: () => void }) {
  const t = copyFor(language);
  return <button type="button" onClick={onClick} aria-label={t.enlarge} title={t.enlarge} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-900">
    <QRCodeSVG value={url} size={32} marginSize={1} fgColor="#111827" bgColor="#ffffff" />
    <span dir="ltr" className="hidden pe-1 text-sm font-black tracking-wider sm:inline">{code}</span>
  </button>;
}

/** A visible, scannable code; opening it keeps the live roster beside it. */
export function JoinCodeCard({ code, url, language, compact = false, enlarged = false, onEnlarge }: JoinProps & { compact?: boolean; enlarged?: boolean; onEnlarge?: () => void }) {
  const t = copyFor(language);
  const { copied, copyToClipboard } = useClipboardFeedback();
  return (
    <section data-live-join-code className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold text-violet-800">{t.title}</h2>
        {onEnlarge && <button type="button" onClick={onEnlarge} aria-label={t.enlarge} title={t.enlarge} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-200 text-violet-700 hover:bg-violet-50"><Maximize2 size={17} /></button>}
      </div>
      <div className={compact ? "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-3" : "flex flex-col items-center gap-3 text-center"}>
        <button type="button" onClick={onEnlarge} disabled={!onEnlarge} aria-label={t.enlarge} className={`mx-auto block aspect-square max-w-full rounded-xl bg-white p-2 ${compact ? "w-28" : enlarged ? "w-[clamp(7rem,25vw,20rem)]" : "w-[clamp(7rem,22vw,16rem)]"}`}>
          <QRCodeSVG value={url} size={320} level="M" marginSize={2} fgColor="#111827" bgColor="#ffffff" style={{ width: "100%", height: "100%" }} />
        </button>
        <div className="min-w-0 text-center">
          <p className="text-xs font-semibold text-slate-500">{t.code}</p>
          <p dir="ltr" className={`${compact ? "text-xl" : "text-2xl sm:text-4xl"} mt-1 break-all font-black tracking-wider text-slate-900`}>{code}</p>
          <button type="button" onClick={() => void copyToClipboard(url)} className="mt-3 inline-flex min-h-10 max-w-full items-center justify-center gap-1.5 rounded-xl bg-violet-700 px-3 py-2 text-xs font-bold text-white hover:bg-violet-800">
            {copied ? <Check size={15} /> : <Copy size={15} />}{copied ? t.copied : t.copy}
          </button>
        </div>
      </div>
    </section>
  );
}

export function JoinedStudents({ players, language }: { players: JoinPlayer[]; language: Language }) {
  const t = copyFor(language);
  return (
    <section data-live-join-roster aria-label={t.joined} className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 sm:p-5">
      <h2 className="flex flex-wrap items-center gap-2 text-sm font-extrabold sm:text-lg"><Users size={19} />{t.joined}<span aria-live="polite" className="ms-auto rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">{players.length}</span></h2>
      <div className="mt-3 min-h-0 overflow-y-auto overscroll-contain" style={{ maxHeight: "min(52dvh, 440px)" }}>
        {players.length ? <ul className="grid gap-2 sm:grid-cols-2">
          {players.map(player => <li key={player.id} className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 p-2 sm:p-3">
            <span className="shrink-0"><QPAvatar value={player.avatar} iconSize={28} className="text-2xl" /></span>
            <span className="min-w-0 flex-1 break-words text-sm font-bold" dir="auto">{player.name}</span>
            <Check size={16} className="shrink-0 text-emerald-600" aria-label={t.status} />
          </li>)}
        </ul> : <p className="py-8 text-center text-sm leading-relaxed text-slate-500">{t.empty}</p>}
      </div>
    </section>
  );
}

export function LiveJoinRoom({ code, url, language, players, onEnlarge, actions, enlarged }: JoinProps & { players: JoinPlayer[]; onEnlarge?: () => void; actions?: ReactNode; enlarged?: boolean }) {
  return (
    <section data-live-join-room className="mx-auto grid w-full max-w-[1100px] grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] items-stretch gap-3 sm:gap-5">
      <JoinCodeCard code={code} url={url} language={language} onEnlarge={onEnlarge} enlarged={enlarged} />
      <JoinedStudents players={players} language={language} />
      {actions && <div className="col-span-2 flex flex-wrap items-center justify-start gap-3">{actions}</div>}
    </section>
  );
}

/** Native top layer + body portal escapes board transforms and stacking contexts. */
export function LiveJoinDialog({ open, onClose, ...props }: JoinProps & { players: JoinPlayer[]; open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const t = copyFor(props.language);
  useBackLayer(onClose, { enabled: open, priority: 100 });
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return createPortal(
    <dialog ref={dialogRef} aria-label={t.title} dir={props.language === "he" || props.language === "ar" ? "rtl" : "ltr"}
      onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      className="m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-[1100px] overflow-y-auto rounded-3xl border-0 bg-slate-50 p-3 text-slate-900 shadow-2xl backdrop:bg-slate-950/70 sm:p-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div><h1 className="text-lg font-black sm:text-2xl">{t.title}</h1><p className="mt-1 text-xs text-slate-600 sm:text-sm">{t.hint}</p></div>
        <button type="button" onClick={onClose} aria-label={t.close} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700"><X size={21} /></button>
      </header>
      <LiveJoinRoom {...props} enlarged />
    </dialog>, document.body,
  );
}
