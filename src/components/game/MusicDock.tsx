import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Music, X } from "lucide-react";
import { useBackLayer } from "../../hooks/useBackLayer";
import type { Language } from "../../hooks/useLanguage";

const LABEL = { en: "Music", he: "מוזיקה", ar: "الموسيقى" };
const CLOSE = { en: "Minimize music", he: "מזעור נגן המוזיקה", ar: "تصغير مشغل الموسيقى" };

/** A stable corner control. Remount only this UI on stage changes, never audio. */
export default function MusicDock({ language, playing, children }: { language: Language; playing: boolean; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const lang = language === "he" ? "he" : language === "ar" ? "ar" : "en";
  const close = () => { setExpanded(false); buttonRef.current?.focus(); };
  useBackLayer(close, { enabled: expanded, priority: 35 });
  return createPortal(
    <aside data-music-dock data-expanded={expanded} className="pointer-events-none fixed bottom-3 end-3 z-40 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2" dir={lang === "en" ? "ltr" : "rtl"}>
      {expanded && <div role="group" aria-label={LABEL[lang]} className="pointer-events-auto fixed top-20 end-3 w-[min(340px,calc(100vw-1.5rem))] rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-xl">
        <div className="mb-2 flex items-center justify-between gap-2"><strong className="text-sm">{LABEL[lang]}</strong><button type="button" onClick={close} aria-label={CLOSE[lang]} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100"><X size={17} /></button></div>
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>}
      <button ref={buttonRef} type="button" onClick={() => setExpanded(value => !value)} aria-label={LABEL[lang]} aria-expanded={expanded} className="pointer-events-auto inline-flex min-h-10 items-center gap-2 rounded-full border border-violet-200 bg-white px-3 text-xs font-extrabold text-violet-800 shadow-md hover:bg-violet-50">
        <Music size={17} /><span>{LABEL[lang]}</span>{playing && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
      </button>
    </aside>, document.body,
  );
}
