import { useEffect, useId, useState } from 'react';
import { supabase } from '../../core/supabase';
import type { Language } from '../../hooks/useLanguage';

const COPY = {
  en: { title: 'Weekly practice summary', thisWeek: 'This week', lastWeek: 'Last week', classes: 'Classes that practiced', completed: 'Students who finished an assignment', className: 'Class', practiced: 'Practiced', finished: 'Finished an assignment', empty: 'No recorded practice in this week.', loading: 'Loading weekly practice…', error: 'Could not load weekly practice.' },
  he: { title: 'סיכום תרגול שבועי', thisWeek: 'השבוע', lastWeek: 'שבוע שעבר', classes: 'כיתות שתרגלו', completed: 'תלמידים שהשלימו משימה', className: 'כיתה', practiced: 'תרגלו', finished: 'השלימו משימה', empty: 'בשבוע הזה עדיין אין תרגול מתועד.', loading: 'טוען את סיכום התרגול…', error: 'סיכום התרגול לא נטען.' },
  ar: { title: 'ملخص التدريب الأسبوعي', thisWeek: 'هذا الأسبوع', lastWeek: 'الأسبوع الماضي', classes: 'الصفوف التي تدرّبت', completed: 'الطلاب الذين أكملوا واجبًا', className: 'الصف', practiced: 'تدرّبوا', finished: 'أكملوا واجبًا', empty: 'لا يوجد تدريب مسجّل لهذا الأسبوع.', loading: 'جار تحميل ملخص التدريب…', error: 'تعذّر تحميل ملخص التدريب.' },
};

type Summary = {
  startsOn: string;
  endsOn: string;
  classesPracticed: number;
  studentsCompleted: number;
  classes: { name: string; practiced: number; completed: number }[];
};

export default function SchoolWeeklySummary({ language }: { language: Language }) {
  const [previous, setPrevious] = useState(false);
  const [result, setResult] = useState<{ previous: boolean; report: Summary | null; failed: boolean }>();
  const title = useId();
  const t = COPY[language];

  useEffect(() => {
    let active = true;
    supabase.rpc('school_weekly_activity', { p_previous: previous }).then(({ data, error }) => {
      if (active) setResult({ previous, report: data as Summary | null, failed: !!error });
    }, () => {
      if (active) setResult({ previous, report: null, failed: true });
    });
    return () => { active = false; };
  }, [previous]);

  if (!result || (!result.report && !result.failed)) return null;
  const loading = result.previous !== previous;
  const report = loading ? null : result.report;
  const formatter = new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeZone: 'Asia/Jerusalem' });
  const localDate = (date: string) => formatter.format(new Date(date + 'T12:00:00Z'));

  return (
    <section aria-labelledby={title} className="space-y-3 rounded-2xl bg-[var(--vb-surface)] p-4 text-[var(--vb-text-primary)] shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id={title} className="font-bold">{t.title}</h2>
          {report && <p className="text-sm">{localDate(report.startsOn)} – {localDate(report.endsOn)}</p>}
        </div>
        <div role="group" aria-labelledby={title} className="flex gap-2">
          {[false, true].map((value) => (
            <button key={String(value)} type="button" aria-pressed={previous === value}
              onClick={() => setPrevious(value)}
              className="min-h-11 rounded-xl border px-3 py-1 text-sm font-semibold aria-pressed:bg-violet-700 aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-offset-2">
              {value ? t.lastWeek : t.thisWeek}
            </button>
          ))}
        </div>
      </div>
      {loading && <p role="status">{t.loading}</p>}
      {!loading && result.failed && <p role="status">{t.error}</p>}
      {report && (
        <>
          <dl className="flex flex-wrap gap-x-8 gap-y-2">
            <div><dt>{t.classes}</dt><dd className="font-bold tabular-nums">{report.classesPracticed}</dd></div>
            <div><dt>{t.completed}</dt><dd className="font-bold tabular-nums">{report.studentsCompleted}</dd></div>
          </dl>
          {report.classesPracticed === 0 ? <p>{t.empty}</p> : (
            <table className="w-full table-fixed border-collapse text-start text-sm">
              <thead><tr>
                <th scope="col" className="w-1/2 p-2 text-start">{t.className}</th>
                <th scope="col" className="p-2 text-start">{t.practiced}</th>
                <th scope="col" className="p-2 text-start">{t.finished}</th>
              </tr></thead>
              <tbody>
                {report.classes.map((item, i) => (
                  <tr key={item.name + i} className="border-t border-[var(--vb-border)]">
                    <th scope="row" className="break-words p-2 text-start font-medium">{item.name}</th>
                    <td className="p-2 tabular-nums">{item.practiced}</td>
                    <td className="p-2 tabular-nums">{item.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}
