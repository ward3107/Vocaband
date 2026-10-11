import { ArrowRight, Plus, Sparkles } from "lucide-react";
import type { Language } from "../../hooks/useLanguage";

const COPY = {
  en: { eyebrow: "Your teaching space", title: (name: string) => `Ready for a great lesson${name ? `, ${name}` : ""}?`, sub: "Bring words to life. Start a live game, prepare an activity, or see how your class is doing.", start: "Start a live game", create: "Create a class", classes: "classes", assignments: "assignments" },
  he: { eyebrow: "מרחב ההוראה שלך", title: (name: string) => `מוכנים לשיעור הבא${name ? `, ${name}` : ""}?`, sub: "הופכים מילים לחוויה. מתחילים משחק חי, מכינים פעילות או בודקים את התקדמות הכיתה.", start: "התחלת משחק חי", create: "יצירת כיתה", classes: "כיתות", assignments: "משימות" },
  ar: { eyebrow: "مساحتك التعليمية", title: (name: string) => `جاهزون للدرس القادم${name ? `، ${name}` : ""}؟`, sub: "حوّل الكلمات إلى تجربة. ابدأ لعبة مباشرة، حضّر نشاطًا أو تابع تقدّم صفّك.", start: "ابدأ لعبة مباشرة", create: "إنشاء صف", classes: "صفوف", assignments: "مهام" },
} satisfies Record<Language, unknown>;

export default function WorkspaceWelcome({ name, language, classCount, assignmentCount, onStart, onCreate }: {
  name: string; language: Language; classCount: number; assignmentCount: number;
  onStart: () => void; onCreate: () => void;
}) {
  const t = COPY[language];
  return (
    <section className="vb-hero mb-7" aria-labelledby="teacher-welcome-title">
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
        <div className="max-w-2xl">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wide text-indigo-100"><Sparkles size={15} aria-hidden />{t.eyebrow}</p>
          <h1 id="teacher-welcome-title" className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{t.title(name)}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-indigo-100 sm:text-base">{t.sub}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={onStart} className="vb-button bg-white! text-indigo-800! shadow-sm">{t.start}<ArrowRight size={17} className="rtl:rotate-180" /></button>
            <button type="button" onClick={onCreate} className="vb-button border border-white/30 bg-white/10 text-white hover:bg-white/20"><Plus size={17} />{t.create}</button>
          </div>
        </div>
        <div className="flex gap-6 border-white/20 sm:gap-8 lg:border-s lg:ps-8">
          <div><p className="text-3xl font-extrabold tabular-nums">{classCount}</p><p className="mt-1 text-sm text-indigo-100">{t.classes}</p></div>
          <div><p className="text-3xl font-extrabold tabular-nums">{assignmentCount}</p><p className="mt-1 text-sm text-indigo-100">{t.assignments}</p></div>
        </div>
      </div>
    </section>
  );
}
