import React from "react";
import { School, Users, TrendingUp, Target, Send, GraduationCap } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { landingPageT } from "../../locales/student/landing-page";

// "For school leaders" — surfaces the principal dashboard to prospective
// schools and opens the school-inquiry form. The console preview on the
// right is decorative (aria-hidden); the real dashboard is ManagerConsoleView.
interface Props {
  /** Open the school-inquiry modal (lead capture). */
  onInquire: () => void;
}

const LandingSchools: React.FC<Props> = ({ onInquire }) => {
  const { language, dir, isRTL } = useLanguage();
  const t = landingPageT[language].schools;
  const ta = isRTL ? "text-right" : "text-left";

  const points = [
    { Icon: Users, label: t.point1 },
    { Icon: TrendingUp, label: t.point2 },
    { Icon: Target, label: t.point3 },
  ];
  const kpis = [
    { k: t.kpiTeachers, v: "12", g: "from-indigo-500 to-violet-600" },
    { k: t.kpiClasses, v: "34", g: "from-violet-500 to-fuchsia-600" },
    { k: t.kpiStudents, v: "680", g: "from-fuchsia-500 to-rose-500" },
    { k: t.kpiActive, v: "512", g: "from-amber-400 to-orange-500" },
  ];

  return (
    <section className="py-16 px-4 md:px-6" dir={dir}>
      <div className="max-w-6xl mx-auto">
        <div className="rounded-[2rem] bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-900 p-8 md:p-12 text-white shadow-2xl shadow-violet-500/20 overflow-hidden relative">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-fuchsia-500/20 rounded-full blur-3xl" aria-hidden="true" />
          <div className="grid md:grid-cols-2 gap-10 items-center relative">
            {/* Pitch */}
            <div className={ta}>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-white/85 mb-4">
                <School size={13} aria-hidden="true" /> {t.eyebrow}
              </span>
              <h2 className="text-3xl md:text-4xl font-black font-headline mb-3 leading-tight">{t.heading}</h2>
              <p className="text-white/75 text-base md:text-lg mb-6">{t.subtitle}</p>
              <ul className="space-y-3 mb-8">
                {points.map(({ Icon, label }, i) => (
                  <li key={i} className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span className="font-semibold text-white/90">{label}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={onInquire}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className="inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl text-lg font-black text-indigo-950 bg-white hover:bg-white/90 shadow-lg transition-colors"
              >
                <Send size={20} strokeWidth={2.5} /> {t.cta}
              </button>
            </div>

            {/* Decorative principal-console preview. */}
            <div className="rounded-2xl bg-white/5 border border-white/15 backdrop-blur-sm p-5" aria-hidden="true">
              <div className={`flex items-center gap-2 mb-4 text-white/80 ${isRTL ? "flex-row-reverse" : ""}`}>
                <GraduationCap size={18} />
                <span className="font-bold text-sm">{t.previewTitle}</span>
                <span className={`${isRTL ? "mr-auto" : "ml-auto"} text-[10px] uppercase tracking-widest text-white/40`}>{t.previewBadge}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {kpis.map((c, i) => (
                  <div key={i} className={`rounded-xl p-3 bg-gradient-to-br ${c.g} shadow ${ta}`}>
                    <div className="text-2xl font-black leading-none">{c.v}</div>
                    <div className="text-[11px] font-medium text-white/85 mt-1">{c.k}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <div className={`text-[11px] font-semibold text-white/60 mb-2 ${ta}`}>{t.previewChart}</div>
                <div className="flex items-end gap-1.5 h-20">
                  {[40, 55, 48, 70, 62, 80, 75, 90, 68, 84, 78, 95, 88, 100].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-violet-500/60 to-fuchsia-400/80" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingSchools;
