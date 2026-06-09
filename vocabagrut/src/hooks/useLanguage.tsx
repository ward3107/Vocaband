import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

// VocaBagrut UI languages. English is the target language (and default),
// with Hebrew + Arabic for instructions and translations — the same
// trilingual stance as Vocaband, simplified for a standalone app.
export type Language = 'en' | 'he' | 'ar';

const LANGUAGE_KEY = 'vocabagrut_language';
const SUPPORTED: readonly Language[] = ['en', 'he', 'ar'] as const;
const isSupported = (v: unknown): v is Language =>
  typeof v === 'string' && (SUPPORTED as readonly string[]).includes(v);

const getInitial = (): Language => {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (isSupported(saved)) return saved;
  } catch { /* localStorage blocked */ }
  return 'en';
};

const applyDir = (lang: Language) => {
  if (typeof document === 'undefined') return;
  const dir = lang === 'he' || lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', dir);
};

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  textAlign: 'text-left' | 'text-right';
}

const LanguageContext = createContext<LanguageState | null>(null);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(getInitial);

  useEffect(() => { applyDir(language); }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    try { localStorage.setItem(LANGUAGE_KEY, lang); } catch { /* blocked */ }
    setLanguageState(lang);
  }, []);

  const isRTL = language === 'he' || language === 'ar';
  const value: LanguageState = {
    language,
    setLanguage,
    isRTL,
    dir: isRTL ? 'rtl' : 'ltr',
    textAlign: isRTL ? 'text-right' : 'text-left',
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageState => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};

export const languageShortLabels: Record<Language, string> = {
  en: 'EN',
  he: 'עב',
  ar: 'ع',
};

export const ALL_LANGUAGES: Language[] = ['en', 'he', 'ar'];
