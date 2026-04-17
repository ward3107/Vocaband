import { useState, useEffect, useCallback, createContext, ReactNode } from 'react';

export type Language = 'en' | 'he' | 'ar';

export const LANGUAGE_KEY = 'vocaband_legal_language';

// Global state singleton - default to Hebrew (primary target audience for Israeli schools)
let globalLanguage: Language = 'he';
const listeners: Set<(lang: Language) => void> = new Set();

const getInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'he';
  const saved = localStorage.getItem(LANGUAGE_KEY);
  if (saved && ['en', 'he', 'ar'].includes(saved)) {
    return saved as Language;
  }
  return 'he';
};

// Initialize global state and set initial lang attribute
if (typeof window !== 'undefined') {
  globalLanguage = getInitialLanguage();
  // Set initial lang attribute for accessibility (WCAG 2.0 AA 3.1.1)
  document.documentElement.setAttribute('lang', globalLanguage);
  // Note: dir is NOT set on <html> globally — each page manages its own dir
  // to prevent RTL leaking into the landing page which must always be LTR.
}

const setGlobalLanguage = (lang: Language) => {
  globalLanguage = lang;
  if (typeof window !== 'undefined') {
    localStorage.setItem(LANGUAGE_KEY, lang);
    // Set lang attribute for accessibility (WCAG 2.0 AA 3.1.1)
    document.documentElement.setAttribute('lang', lang);
    // Note: dir is NOT set on <html> globally — each page manages its own dir
    // to prevent RTL leaking into the landing page which must always be LTR.
  }
  // Notify all listeners
  listeners.forEach(listener => listener(lang));
};

export const useLanguage = () => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      return getInitialLanguage();
    }
    return 'he';
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
