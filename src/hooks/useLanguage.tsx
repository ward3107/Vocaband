import { useState, useEffect, useCallback, createContext, ReactNode } from 'react';

export type Language = 'en' | 'he' | 'ar';

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

/**
 * Detect the user's browser-preferred language and map it to one of
 * the languages we actually support.  Reads navigator.languages first
 * (the ordered preference list — what the user picked in their OS /
 * browser settings) and falls back to navigator.language (the single
 * primary language) for older browsers.
 *
 * Match is case-insensitive and prefix-based: `he-IL`, `he-il`, `he`
 * all resolve to 'he'.  Anything we don't support resolves to 'en'.
 *
 * Used only on FIRST visit (when localStorage is empty).  After that
 * the saved choice always wins — we never silently override what the
 * teacher manually picked.
 */
const detectBrowserLanguage = (): Language => {
  if (typeof navigator === 'undefined') return 'en';
  const candidates: string[] = [];
  if (Array.isArray(navigator.languages)) {
    candidates.push(...navigator.languages);
  }
  if (navigator.language) {
    candidates.push(navigator.language);
  }
  for (const raw of candidates) {
    const lc = raw.toLowerCase();
    if (lc === 'he' || lc.startsWith('he-') || lc === 'iw' || lc.startsWith('iw-')) return 'he';
    if (lc === 'ar' || lc.startsWith('ar-')) return 'ar';
    if (lc === 'en' || lc.startsWith('en-')) return 'en';
  }
  return 'en';
};

const getInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem(LANGUAGE_KEY);
  if (saved && ['en', 'he', 'ar'].includes(saved)) {
    return saved as Language;
  }
  // First visit (or saved key missing / invalid): auto-detect from
  // browser preferences so an Israeli teacher's phone (Hebrew OS)
  // lands in Hebrew without manually toggling the picker.  Manual
  // picker remains visible so the teacher can override if the
  // detection was wrong.  We do NOT persist the auto-detected choice
  // — that way if the teacher later changes their browser language,
  // the next visit re-detects.  Once they explicitly pick from the
  // language picker, that choice is persisted and wins forever.
  return detectBrowserLanguage();
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
};

export const languageFlags: Record<Language, string> = {
  en: '🇬🇧',
  he: '🇮🇱',
  ar: '🇸🇦',
};

/** Short labels for UI toggles (2-3 chars). */
export const languageShortLabels: Record<Language, string> = {
  en: 'EN',
  he: 'עב',
  ar: 'ع',
};

/** All supported languages - use this instead of hardcoding ['en', 'he', 'ar']. */
export const ALL_LANGUAGES: Language[] = ['en', 'he', 'ar'];

/** Language options for dropdowns/toggles with code, label, and flag. */
export const languageOptions: { code: Language; label: string; flag: string }[] = ALL_LANGUAGES.map(
  (code) => ({
    code,
    label: languageShortLabels[code],
    flag: languageFlags[code],
  })
);
