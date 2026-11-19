import { useEffect, useRef, useState } from 'react';
import { supabase, type AppUser } from '../../core/supabase';
import type { Language } from '../../hooks/useLanguage';

const copy = {
  he: {
    title: 'ספריית צוות האנגלית', close: 'סגירה', loading: 'טוענים את מרחב הצוות…',
    unavailable: 'מרחב הצוות נפתח עם רישיון בית ספר או פיילוט פעיל.',
    share: 'שיתוף רשימת מילים עם הצוות', pickOwn: 'בחירת רשימה מספריית המורה', publish: 'פרסום לצוות',
    published: 'הרשימה זמינה לצוות.', assign: 'הקצאת תרגול', choose: 'בחירת רשימה משותפת',
    selectAll: 'בחירת כל הכיתות', titleField: 'שם המשימה', classes: 'כיתות', due: 'תאריך יעד',
    none: 'הספרייה ריקה. מורה יכול לשתף רשימה מהספרייה האישית שלו.',
    sent: 'המשימה נשלחה לכיתות שנבחרו.', error: 'לא הצלחנו להשלים את הפעולה. נסו שוב.',
    report: 'דוחות משימות הצוות', pickBatch: 'בחירת משימה', completed: 'סיימו תרגול',
    enrolled: 'תלמידים בכיתה', teacher: 'מורה', class: 'כיתה', export: 'הורדת דוח CSV',
    empty: 'דוחות יוצגו אחרי הקצאת משימה.', words: 'מילים', grade: 'שכבה',
  },
  ar: {
    title: 'مكتبة طاقم الإنجليزية', close: 'إغلاق', loading: 'جارٍ تحميل مساحة الطاقم…',
    unavailable: 'تتوفر مساحة الطاقم مع ترخيص مدرسي أو تجربة مدرسية فعّالة.',
    share: 'مشاركة قائمة كلمات مع الطاقم', pickOwn: 'اختر قائمة من مكتبتك', publish: 'نشر للطاقم',
    published: 'القائمة متاحة للطاقم.', assign: 'إسناد تمرين', choose: 'اختر قائمة مشتركة',
    selectAll: 'اختيار كل الصفوف', titleField: 'اسم الواجب', classes: 'الصفوف', due: 'موعد التسليم',
    none: 'المكتبة فارغة. يستطيع المعلّم مشاركة قائمة من مكتبته.',
    sent: 'أُرسل الواجب إلى الصفوف المختارة.', error: 'تعذّر إكمال العملية. حاول مجددًا.',
    report: 'تقارير واجبات الطاقم', pickBatch: 'اختيار واجب', completed: 'أتمّوا التمرين',
    enrolled: 'طلاب الصف', teacher: 'المعلّم', class: 'الصف', export: 'تنزيل تقرير CSV',
    empty: 'ستظهر التقارير بعد إسناد واجب.', words: 'كلمات', grade: 'الصف الدراسي',
  },
  en: {
    title: 'English team library', close: 'Close', loading: 'Loading the team workspace…',
    unavailable: 'The workspace opens with an active school license or pilot.',
    share: 'Share a word list with the team', pickOwn: 'Choose a list from your library', publish: 'Publish to team',
    published: 'The word list is available to the team.', assign: 'Assign practice', choose: 'Choose a shared list',
    selectAll: 'Select all classes', titleField: 'Assignment title', classes: 'Classes', due: 'Due date',
    none: 'The library is empty. A teacher can share a list from their personal library.',
    sent: 'The assignment was sent to the selected classes.', error: 'We could not complete that action. Try again.',
    report: 'Team assignment reports', pickBatch: 'Choose an assignment', completed: 'Completed practice',
    enrolled: 'Enrolled pupils', teacher: 'Teacher', class: 'Class', export: 'Download CSV',
    empty: 'Reports appear after assigning practice.', words: 'words', grade: 'Grade',
  },
};

type Resource = { id: string; title: string; word_count: number; grade_level: number | null };
type Workspace = {
  manager: boolean;
  resources: Resource[];
  classes: { id: string; name: string; teacher: string }[];
  batches: { id: string; title: string; created_at: string }[];
};
type Report = {
  title: string;
  classes: { id: string; name: string; teacher: string; enrolled: number; completed: number }[];
};

function csvCell(value: string | number) {
  const text = String(value);
  return '"' + (/^\s*[=+@-]/.test(text) ? "'" : '') + text.replaceAll('"', '""') + '"';
}

export default function SchoolWorkspace({
  user, language, onClose,
}: {
  user: AppUser;
  language: Language;
  onClose: () => void;
}) {
  const t = copy[language];
  const dialog = useRef<HTMLDialogElement>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [own, setOwn] = useState<{ id: string; name: string }[]>([]);
  const [ownId, setOwnId] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [classes, setClasses] = useState<string[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [batchId, setBatchId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const lastRequest = useRef<{ signature: string; id: string } | null>(null);
  const control = 'min-h-11 rounded-xl border border-slate-300 px-3 py-2';
  const primary = control + ' bg-violet-700 text-white font-semibold disabled:opacity-45';
  const reportDate = new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeZone: 'Asia/Jerusalem' });

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.rpc('school_workspace'),
      user.role === 'teacher'
        ? supabase.from('vocabulary_sets').select('id,name').eq('teacher_uid', user.uid)
            .eq('is_archived', false).order('updated_at', { ascending: false }).limit(100)
        : Promise.resolve({ data: [], error: null }),
    ]).then(([space, sets]) => {
      if (!active) return;
      setLoaded(true);
      if (space.error || sets.error) {
        setMessage(t.error);
        return;
      }
      setWorkspace(space.data as Workspace | null);
      setOwn(sets.data ?? []);
    }).catch(() => {
      if (active) {
        setLoaded(true);
        setMessage(t.error);
      }
    });
    return () => { active = false; };
  }, [t, user.role, user.uid]);

  async function reload() {
    const result = await supabase.rpc('school_workspace');
    if (result.error) throw result.error;
    setWorkspace(result.data as Workspace | null);
  }

  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await task();
    } catch {
      setMessage(t.error);
    } finally {
      setBusy(false);
    }
  }

  function download(report: Report) {
    const rows = [[t.class, t.teacher, t.enrolled, t.completed], ...report.classes.map(
      ({ name, teacher, enrolled, completed }) => [name, teacher, enrolled, completed]
    )];
    const blob = new Blob(['\ufeff', rows.map((row) => row.map(csvCell).join(',')).join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vocaband-team-report.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  return (
    <dialog ref={dialog} dir={language === 'en' ? 'ltr' : 'rtl'} aria-labelledby="school-workspace-title"
      onCancel={onClose}
      className="m-auto w-[min(94vw,44rem)] max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-5 text-slate-900 shadow-xl backdrop:bg-black/50">
      <header className="flex items-center justify-between gap-3">
        <h2 id="school-workspace-title" className="text-xl font-bold">{t.title}</h2>
        <button type="button" className={control} onClick={onClose}>{t.close}</button>
      </header>
      {!loaded && <p role="status" className="mt-4">{t.loading}</p>}
      {loaded && !workspace && !message && <p className="mt-4">{t.unavailable}</p>}
      {workspace && (
        <div className="mt-4 space-y-5">
          {own.length > 0 && (
            <section className="rounded-2xl border p-4">
              <h3 className="font-bold">{t.share}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <select className={control + ' min-w-0 grow'} value={ownId} aria-label={t.pickOwn}
                  onChange={(event) => setOwnId(event.target.value)}>
                  <option value="">{t.pickOwn}</option>
                  {own.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <button type="button" className={primary} disabled={!ownId || busy}
                  onClick={() => void run(async () => {
                    const result = await supabase.rpc('publish_school_word_set', { p_set: ownId });
                    if (result.error) throw result.error;
                    setMessage(t.published);
                    await reload();
                  })}>{t.publish}</button>
              </div>
            </section>
          )}

          {workspace.resources.length === 0 ? <p>{t.none}</p> : (
            <form className="space-y-3 rounded-2xl border p-4" onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                const args = { p_resource: resourceId, p_classes: [...classes].sort(), p_title: title.trim(), p_due: due || null };
                const signature = JSON.stringify(args);
                if (lastRequest.current?.signature !== signature) {
                  lastRequest.current = { signature, id: crypto.randomUUID() };
                }
                const sent = await supabase.rpc('assign_school_words', { ...args, p_request: lastRequest.current.id });
                if (sent.error) throw sent.error;
                setClasses([]);
                setMessage(t.sent);
                lastRequest.current = null;
                await reload();
              });
            }}>
              <h3 className="font-bold">{t.assign}</h3>
              <select className={control + ' w-full'} value={resourceId} aria-label={t.choose}
                required onChange={(event) => {
                  const selected = workspace.resources.find((item) => item.id === event.target.value);
                  setResourceId(event.target.value);
                  setTitle(selected?.title ?? '');
                }}>
                <option value="">{t.choose}</option>
                {workspace.resources.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.title} · {resource.word_count} {t.words}
                    {resource.grade_level !== null ? ` · ${t.grade} ${resource.grade_level}` : ''}
                  </option>
                ))}
              </select>
              <label className="grid gap-1">{t.titleField}
                <input required value={title} maxLength={100} className={control} onChange={(event) => setTitle(event.target.value)} />
              </label>
              <fieldset className="space-y-1">
                <legend className="font-semibold">{t.classes}</legend>
                {workspace.classes.length > 1 && <button type="button" className={control}
                  onClick={() => setClasses(workspace.classes.map((item) => item.id))}>{t.selectAll}</button>}
                <div className="max-h-48 overflow-y-auto">
                  {workspace.classes.map((item) => (
                    <label key={item.id} className="flex min-h-11 items-center gap-2">
                      <input type="checkbox" checked={classes.includes(item.id)} onChange={(event) => {
                        setClasses(event.target.checked ? [...classes, item.id] : classes.filter((id) => id !== item.id));
                      }} />
                      {item.name} · {item.teacher}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="grid gap-1">{t.due}
                <input type="date" value={due} min={new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jerusalem' }).format(new Date())}
                  className={control} onChange={(event) => setDue(event.target.value)} />
              </label>
              <button type="submit" className={primary} disabled={busy || !resourceId || !title.trim() || !classes.length}>
                {t.assign}
              </button>
            </form>
          )}

          {workspace.manager && (
            <section className="space-y-2 rounded-2xl border p-4">
              <h3 className="font-bold">{t.report}</h3>
              {workspace.batches.length === 0 ? <p>{t.empty}</p> : (
                <select className={control + ' w-full'} value={batchId} disabled={busy}
                  aria-label={t.pickBatch} onChange={(event) => {
                    const id = event.target.value;
                    setBatchId(id);
                    setReport(null);
                    if (id) void run(async () => {
                      const result = await supabase.rpc('school_assignment_report', { p_batch: id });
                      if (result.error || !result.data) throw new Error('Report unavailable');
                      setReport(result.data as Report);
                    });
                  }}>
                  <option value="">{t.pickBatch}</option>
                  {workspace.batches.map((batch) => <option key={batch.id} value={batch.id}>
                    {batch.title} · {reportDate.format(new Date(batch.created_at))}
                  </option>)}
                </select>
              )}
              {report && (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-start text-sm">
                      <caption className="sr-only">{report.title}</caption>
                      <thead><tr>{[t.class, t.teacher, t.enrolled, t.completed].map((label) =>
                        <th key={label} scope="col" className="p-2 text-start">{label}</th>
                      )}</tr></thead>
                      <tbody>{report.classes.map((row) => <tr key={row.id} className="border-t">
                        <th scope="row" className="p-2 text-start">{row.name}</th>
                        <td className="p-2">{row.teacher}</td><td className="p-2">{row.enrolled}</td>
                        <td className="p-2">{row.completed}</td>
                      </tr>)}</tbody>
                    </table>
                  </div>
                  <button type="button" onClick={() => download(report)} className={control}>{t.export}</button>
                </>
              )}
            </section>
          )}
        </div>
      )}
      {message && <p role="status" className="mt-4 rounded-xl bg-violet-50 p-3">{message}</p>}
    </dialog>
  );
}
