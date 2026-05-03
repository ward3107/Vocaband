import { LogOut, Globe } from "lucide-react";
import { useState } from "react";
import { supabase } from "../../core/supabase";
import { useLanguage, languageNames, type Language } from "../../hooks/useLanguage";
import { studentDashboardT } from "../../locales/student/student-dashboard";

/**
 * Top bar for the student dashboard.  Logout affordance + a compact
 * language switcher (🌐 EN / 🇮🇱 HE / 🇸🇦 AR).  The student-facing
 * screens are all translated to EN/HE/AR via src/locales/student/*.ts
 * but the LanguageSwitcher component was previously only mounted on
 * the legal pages (Terms / Privacy / Accessibility / Security), so
 * students had no way to actually flip the language.  Surfacing the
 * picker here makes the existing translations reachable from the
 * dashboard — and once flipped, the choice persists via the
 * useLanguage hook's localStorage so the games + shop + game-active
 * screens all inherit it on the next view change.
 */
export default function StudentTopBar() {
  const { language, setLanguage } = useLanguage();
  const t = studentDashboardT[language];
  const [langOpen, setLangOpen] = useState(false);
  const langs: Language[] = ["en", "he", "ar"];

  return (
    <div className="flex justify-end items-center gap-2 mb-4">
      <div className="relative">
        <button
          onClick={() => setLangOpen(o => !o)}
          type="button"
          aria-label="Change language"
          aria-expanded={langOpen}
          style={{ touchAction: 'manipulation' }}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-stone-500 hover:text-stone-900 hover:bg-white/60 rounded-xl text-xs sm:text-sm font-semibold transition-all"
        >
          <Globe size={14} />
          <span className="hidden sm:inline">{languageNames[language]}</span>
        </button>
        {langOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
            <div className="absolute top-full mt-1 right-0 z-50 bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden min-w-[160px]">
              {langs.map(lng => (
                <button
                  key={lng}
                  onClick={() => { setLanguage(lng); setLangOpen(false); }}
                  type="button"
                  style={{ touchAction: 'manipulation' }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-stone-50 transition-colors ${
                    language === lng ? 'bg-indigo-50 text-indigo-700' : 'text-stone-700'
                  }`}
                >
                  <Globe size={14} aria-hidden />
                  <span>{languageNames[lng]}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <button
        onClick={() => supabase.auth.signOut()}
        type="button"
        style={{ touchAction: 'manipulation' }}
        className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-stone-400 hover:text-rose-600 hover:bg-white/60 rounded-xl text-xs sm:text-sm font-semibold transition-all"
        title={t.signOut}
      >
        <LogOut size={14} />
        <span className="hidden sm:inline">{t.logout}</span>
      </button>
    </div>
  );
}
