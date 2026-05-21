import { useState, useEffect, useCallback, createContext, ReactNode } from 'react';

// 'ru' is kept in the type so legacy translation maps + the
// `word.russian` translation field continue to type-check, but it
// is no longer offered as a UI language anywhere (removed from the
// supported set, ALL_LANGUAGES, and the browser-detect path below).
export type Language = 'en' | 'he' | 'ar' | 'ru';

export const LANGUAGE_KEY = 'vocaband_legal_language';

// Global state singleton — default to English.
//
// Previously defaulted to Hebrew because Israeli schools are the primary
// audience, but the app teaches ENGLISH vocabulary, and the UI is the
// learner's main exposure to the target language during a lesson. An
// English-default surface reinforces the learning context; the user
// can still switch to Hebrew or Arabic from the language picker, and
// the choice persists in localStorage under LANGUAGE_KEY.
let globalLanguage: Language = 'en';
const listeners: Set<(lang: Language) => void> = new Set();

const SUPPORTED_LANGS: readonly Language[] = ['en', 'he', 'ar'] as const;
const isSupported = (v: unknown): v is Language =>
  typeof v === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(v);

const getInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';
  // ?lang=en|he|ar wins over everything else. Google's hreflang
  // alternates send searchers to /?lang=he and /?lang=ar so a Hebrew
  // Google result must land directly in Hebrew (even when the visitor
  // has an English browser, English OS, or a stale saved preference).
  // Persist to localStorage too so subsequent navigation inside the SPA
  // keeps the chosen language without the parameter on every link.
  try {
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get('lang');
    if (isSupported(langParam)) {
      try { localStorage.setItem(LANGUAGE_KEY, langParam); } catch { /* localStorage may be blocked */ }
      return langParam;
    }
  } catch { /* URLSearchParams unavailable — fall through */ }
  const saved = localStorage.getItem(LANGUAGE_KEY);
  if (isSupported(saved)) {
    return saved;
  }
  // First visit (or saved key missing / invalid): default to English.
  // The app teaches English vocabulary, so the landing page surface is
  // English regardless of OS / browser locale — that reinforces the
  // learning context and gives every visitor the same first impression.
  // The language picker stays visible so a teacher can switch to Hebrew
  // or Arabic, and the explicit pick is persisted in localStorage.
  return 'en';
};

// Initialize global state and set initial lang attribute
if (typeof window !== 'undefined') {
  globalLanguage = getInitialLanguage();
  // Set initial lang attribute for accessibility (WCAG 2.0 AA 3.1.1)
  document.documentElement.setAttribute('lang', globalLanguage);
  // Set initial dir attribute for RTL support
  const dir = (globalLanguage === 'he' || globalLanguage === 'ar') ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
}

const setGlobalLanguage = (lang: Language) => {
  globalLanguage = lang;
  if (typeof window !== 'undefined') {
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
