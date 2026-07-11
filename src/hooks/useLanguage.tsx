import { useState, useEffect, useCallback, createContext, ReactNode } from 'react';

// 'ru' is kept in the type so legacy translation maps + the
// `word.russian` translation field continue to type-check, but it
// is no longer offered as a UI language anywhere (removed from the
// supported set, ALL_LANGUAGES, and the browser-detect path below).
export type Language = 'en' | 'he' | 'ar' | 'ru';

export const LANGUAGE_KEY = 'vocaband_legal_language';

// Global state singleton — the initial UI language is ALWAYS English.
//
// Deliberately ignores the browser/device language, any previously saved
// choice, AND the ?lang= deep-link param: every visitor (public or
// logged-in, on any device, arriving from any link) opens in English.
// Vocaband teaches ENGLISH, and the UI is the learner's main exposure to
// the target language during a lesson, so an English-first surface is the
// product default. Hebrew/Arabic are still fully available, but only as an
// explicit choice via the in-app language toggle — that selection holds for
// the current session and resets to English on the next load.
//
// SEO note: worker/index.ts still localizes the CRAWLED HTML metadata for
// ?lang=he|ar|ru so Google snippets stay localized. That is server-side,
// for crawlers, and independent of this client-side UI default.
let globalLanguage: Language = 'en';
const listeners: Set<(lang: Language) => void> = new Set();

const getInitialLanguage = (): Language => 'en';

// Initialize the document attributes for the English default. The initial
// language is always English (getInitialLanguage), so the first paint is
// unconditionally lang="en" / dir="ltr"; a later in-app toggle updates both
// via setGlobalLanguage.
if (typeof window !== 'undefined') {
  document.documentElement.setAttribute('lang', globalLanguage);
  document.documentElement.setAttribute('dir', 'ltr');
}

const setGlobalLanguage = (lang: Language) => {
  globalLanguage = lang;
  if (typeof window !== 'undefined') {
    // Persist for the session so within-SPA reads (e.g. the Quick Play
    // bootstrap's localized error toasts) pick up the toggled language.
    // NOT read back by getInitialLanguage — the initial language is always
    // English, so this choice deliberately does not survive a reload.
    localStorage.setItem(LANGUAGE_KEY, lang);
    // Set lang attribute for accessibility (WCAG 2.0 AA 3.1.1)
    document.documentElement.setAttribute('lang', lang);
    // Set dir attribute for RTL support (Hebrew/Arabic)
    const dir = (lang === 'he' || lang === 'ar') ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    // Heebo + Fredoka are NOT in index.html's blocking <link> for
    // English-default visitors. When a user toggles to HE/AR for the
    // first time in a session, boot-debug.js's window-scoped loader
    // injects the RTL font CSS so subsequent renders don't fall back to
    // system-ui Hebrew (which on Windows is Arial — visually jarring
    // mid-session). No-op on repeat calls.
    if (dir === 'rtl') {
      const load = (window as unknown as { __vocabandLoadRtlFonts?: () => void }).__vocabandLoadRtlFonts;
      if (typeof load === 'function') load();
    }
  }
  // Notify all listeners
  listeners.forEach(listener => listener(lang));
};

export const useLanguage = () => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      return getInitialLanguage();
    }
    return 'en';
  });

  useEffect(() => {
    // Subscribe to global changes
    const listener = (lang: Language) => {
      setLanguageState(lang);
    };
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setGlobalLanguage(lang);
  }, []);

  const isRTL = language === 'he' || language === 'ar';
  const dir: 'ltr' | 'rtl' = isRTL ? 'rtl' : 'ltr';
  const textAlign = isRTL ? 'text-right' : 'text-left';

  return { language, setLanguage, dir, isRTL, textAlign };
};

// Context for optional provider wrapping
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  textAlign: string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const { language, setLanguage, dir, isRTL, textAlign } = useLanguage();

  return (
    <LanguageContext.Provider value={{ language, setLanguage, dir, isRTL, textAlign }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const languageNames: Record<Language, string> = {
  en: 'English',
  he: 'עברית',
  ar: 'العربية',
  ru: 'Русский',
};

/** Short labels for UI toggles (2-3 chars). */
export const languageShortLabels: Record<Language, string> = {
  en: 'EN',
  he: 'עב',
  ar: 'ع',
  ru: 'РУ',
};

/** All user-selectable UI languages — drives every language toggle in
 *  the app.  Russian is intentionally excluded: pre-translated `ru`
 *  strings remain in i18n maps and on the Word type for the
 *  Russian-PDF feature, but the UI toggle no longer offers it. */
export const ALL_LANGUAGES: Language[] = ['en', 'he', 'ar'];

/** Language options for dropdowns/toggles with code + label. */
export const languageOptions: { code: Language; label: string }[] = ALL_LANGUAGES.map(
  (code) => ({
    code,
    label: languageShortLabels[code],
  })
);
