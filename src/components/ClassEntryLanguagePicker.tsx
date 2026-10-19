import type { Language } from '../hooks/useLanguage';

/** Local explanation language; the teacher's learning-product UI stays intact. */
export default function ClassEntryLanguagePicker({ language, onChange }: {
  language: Language;
  onChange: (language: Language) => void;
}) {
  const label = language === 'he' ? 'שפת ההסבר' : language === 'ar' ? 'لغة الشرح' : 'Explanation language';
  return (
    <div role="group" aria-label={label} className="mb-4 flex flex-wrap justify-end gap-2">
      {([['en', 'English'], ['he', 'עברית'], ['ar', 'العربية']] as const).map(([code, name]) => (
        <button key={code} type="button" lang={code} dir={code === 'en' ? 'ltr' : 'rtl'}
          aria-pressed={language === code} onClick={() => onChange(code)}
          className={`min-h-11 rounded-xl border px-4 py-2 text-base font-bold ${language === code ? 'border-violet-700 bg-violet-700 text-white' : 'border-violet-200 bg-white text-violet-950'}`}>
          {name}
        </button>
      ))}
    </div>
  );
}
