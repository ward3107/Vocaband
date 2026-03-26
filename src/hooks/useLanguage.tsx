import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

export type Language = 'en' | 'he' | 'ar';

export const LANGUAGE_KEY = 'vocaband_legal_language';

// Global state singleton
let globalLanguage: Language = 'en';
const listeners: Set<(lang: Language) => void> = new Set();

const getInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem(LANGUAGE_KEY);
  if (saved && ['en', 'he', 'ar'].includes(saved)) {
    return saved as Language;
  }
  return 'en';
};

// Initialize global state
if (typeof window !== 'undefined') {
  globalLanguage = getInitialLanguage();
}

const setGlobalLanguage = (lang: Language) => {
  globalLanguage = lang;
  if (typeof window !== 'undefined') {
    localStorage.setItem(LANGUAGE_KEY, lang);
    const isRTL = lang === 'he' || lang === 'ar';
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
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

  return { language, setLanguage, dir, isRTL };
};

// Context for optional provider wrapping
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const { language, setLanguage, dir, isRTL } = useLanguage();

  return (
    <LanguageContext.Provider value={{ language, setLanguage, dir, isRTL }}>
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
