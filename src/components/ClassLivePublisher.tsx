import { useEffect, useId, useRef, useState } from 'react';
import { Check, Users } from 'lucide-react';
import { supabase, type ClassData } from '../core/supabase';
import { useLanguage } from '../hooks/useLanguage';
import { classLiveT } from '../locales/class-live';

export default function ClassLivePublisher({ sessionId, classes, subject }: {
  sessionId: string;
  classes: ClassData[];
  subject: string;
}) {
  const { language: uiLanguage } = useLanguage();
  const language = subject === 'hebrew' ? 'he' : uiLanguage;
  const t = classLiveT[language];
  const choices = classes.filter(c => (c.subject ?? 'english') === subject);
  const [selected, setSelected] = useState('');
  const [published, setPublished] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const selectId = useId();
  const classId = selected || (choices.length === 1 ? choices[0].id : '');

  useEffect(() => {
    const controller = new AbortController();
    activeRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12_000);
    void (async () => {
      try {
        const { data, error: queryError } = await supabase.from('class_live_sessions')
          .select('class_id').eq('session_id', sessionId).eq('is_open', true)
          .gt('expires_at', new Date().toISOString()).abortSignal(controller.signal).maybeSingle();
        if (queryError) throw queryError;
        if (activeRequest.current !== controller) return;
        setPublished(data?.class_id ?? null);
      } catch {
        if (activeRequest.current === controller) setError(t.publishError);
      } finally {
        clearTimeout(timeout);
        if (activeRequest.current === controller) setBusy(false);
      }
    })();
    return () => { activeRequest.current?.abort(); activeRequest.current = null; controller.abort(); };
  }, [sessionId, t.publishError]);

  const changeEntry = async (open: boolean) => {
    if (busy || (open && !classId)) return;
    const controller = new AbortController();
    activeRequest.current?.abort();
    activeRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12_000);
    setBusy(true);
    setError(null);
    try {
      const result = open
        ? await supabase.rpc('set_class_live_session', { p_class_id: classId, p_session_id: sessionId }).abortSignal(controller.signal)
        : await supabase.from('class_live_sessions').update({ is_open: false })
          .eq('session_id', sessionId).select('class_id').abortSignal(controller.signal);
      if (result.error) throw result.error;
      if (!open && !result.data?.length) throw new Error('entry not updated');
      if (activeRequest.current === controller) setPublished(open ? classId : null);
    } catch {
      if (activeRequest.current === controller) setError(open ? t.publishError : t.stopError);
    } finally {
      clearTimeout(timeout);
      if (activeRequest.current === controller) setBusy(false);
    }
  };
  const publishedName = choices.find(c => c.id === published)?.name;

  return (
    <section dir={language === 'en' ? 'ltr' : 'rtl'} aria-label={t.teacherTitle}
      className="mx-auto w-full max-w-5xl rounded-2xl border border-violet-200 bg-white p-4 text-violet-950 shadow-sm sm:p-5">
      <h2 className="flex items-center gap-2 text-xl font-extrabold"><Users aria-hidden="true" size={22} />{t.teacherTitle}</h2>
      {published && publishedName ? (
        <>
          <p role="status" className="mt-3 flex items-center gap-2 font-bold text-emerald-800"><Check aria-hidden="true" size={20} />{t.published(publishedName)}</p>
          <p className="mt-2 text-base leading-relaxed">{t.teacherInstructions}</p>
          <button type="button" disabled={busy} onClick={() => { void changeEntry(false); }}
            className="mt-3 min-h-11 rounded-xl border border-violet-200 px-4 py-2 font-bold disabled:opacity-50">{t.stop}</button>
        </>
      ) : choices.length ? (
        <>
          <p className="mt-2 text-base leading-relaxed">{t.teacherHint}</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="min-w-40 flex-1">
              <label htmlFor={selectId} className="mb-1 block font-bold">{t.choose}</label>
              <select id={selectId} value={classId} disabled={busy} onChange={e => setSelected(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-base">
                <option value="">{t.choosePlaceholder}</option>
                {choices.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button type="button" disabled={busy || !classId} onClick={() => { void changeEntry(true); }}
              className="min-h-12 flex-1 rounded-xl bg-violet-700 px-4 py-3 text-base font-bold text-white disabled:opacity-50">{busy ? t.publishing : t.publish}</button>
          </div>
        </>
      ) : <p className="mt-2 text-base">{t.noClasses}</p>}
      {error && <p role="alert" className="mt-3 text-base font-semibold text-red-700">{error}</p>}
    </section>
  );
}
