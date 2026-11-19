import { useEffect, useId, useState } from 'react';
import { supabase } from '../../core/supabase';
import { useLanguage } from '../../hooks/useLanguage';

const COPY = {
  en: { teacher: 'Student places', school: 'School places in use', fraction: (used: string, limit: string) => `${used} of ${limit}`, upgrade: 'Add more places' },
  he: { teacher: 'מכסת תלמידים', school: 'מקומות בשימוש בבית הספר', fraction: (used: string, limit: string) => `${used} מתוך ${limit}`, upgrade: 'הרחבת מכסה' },
  ar: { teacher: 'مقاعد الطلاب', school: 'المقاعد المستخدمة في المدرسة', fraction: (used: string, limit: string) => `${used} من ${limit}`, upgrade: 'إضافة مقاعد' },
};

type Usage = { used: number; capacity: number | null; scope: 'teacher' | 'school' };

export default function TeacherSeatUsage({ onUpgrade }: { onUpgrade: () => void }) {
  const { language, dir } = useLanguage();
  const [usage, setUsage] = useState<Usage | null>(null);
  const title = useId();

  useEffect(() => {
    let active = true;
    let pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try {
        const { data, error } = await supabase.rpc('billing_my_usage');
        if (active && !error) setUsage(data as Usage | null);
      } finally {
        pending = false;
      }
    };
    const load = () => { void refresh().catch(() => undefined); };
    load();
    window.addEventListener('focus', load);
    window.addEventListener('vocaband:roster-changed', load);
    return () => {
      active = false;
      window.removeEventListener('focus', load);
      window.removeEventListener('vocaband:roster-changed', load);
    };
  }, []);

  if (!usage || usage.capacity == null || usage.capacity <= 0) return null;
  const t = COPY[language];
  const formatted = new Intl.NumberFormat(language);
  const nearLimit = usage.used * 5 >= usage.capacity * 4;

  return (
    <section dir={dir} aria-labelledby={title}
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--vb-border)] bg-[var(--vb-surface)] px-4 py-3 text-[var(--vb-text-primary)]">
      <div className="min-w-36 flex-1 sm:max-w-72">
        <h2 id={title} className="text-sm font-bold">{t[usage.scope]}</h2>
        <p className="mt-1 text-sm tabular-nums">{t.fraction(formatted.format(usage.used), formatted.format(usage.capacity))}</p>
        <progress aria-labelledby={title} className="mt-1 h-2 w-full accent-violet-700"
          value={Math.min(usage.used, usage.capacity)} max={usage.capacity} />
      </div>
      {nearLimit && usage.scope === 'teacher' && (
        <button type="button" onClick={onUpgrade}
          className="min-h-11 rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700">
          {t.upgrade}
        </button>
      )}
    </section>
  );
}
