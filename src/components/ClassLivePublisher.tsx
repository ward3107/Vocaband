import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, LoaderCircle, Users, X } from 'lucide-react';
import { supabase, type ClassData } from '../core/supabase';
import { useLanguage, type Language } from '../hooks/useLanguage';
import { classLiveT } from '../locales/class-live';
import ClassEntryLanguagePicker from './ClassEntryLanguagePicker';

export default function ClassLivePublisher({ sessionId, classes, subject }: {
  sessionId: string;
  classes: ClassData[];
  subject: string;
}) {
  const { language: uiLanguage } = useLanguage();
  const [language, setLanguage] = useState<Language>(subject === 'hebrew' ? 'he' : uiLanguage);
  const t = classLiveT[language];
  const choices = classes.filter(c => (c.subject ?? 'english') === subject);
  const [selected, setSelected] = useState('');
  const [published, setPublished] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<'publish' | 'stop' | null>(null);
  const [expanded, setExpanded] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const selectId = useId();
  const panelId = useId();
  const titleId = useId();
  const classId = selected || (choices.length === 1 ? choices[0].id : '');

  useEffect(() => {
    if (!expanded) return;
    panelRef.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setExpanded(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setExpanded(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [expanded]);

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
        if (activeRequest.current === controller) setError('publish');
      } finally {
        clearTimeout(timeout);
        if (activeRequest.current === controller) setBusy(false);
      }
    })();
    return () => { activeRequest.current?.abort(); activeRequest.current = null; controller.abort(); };
  }, [sessionId]);

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
      if (activeRequest.current === controller) {
        setPublished(open ? classId : null);
        setExpanded(false);
        triggerRef.current?.focus();
      }
    } catch {
      if (activeRequest.current === controller) setError(open ? 'publish' : 'stop');
    } finally {
      clearTimeout(timeout);
      if (activeRequest.current === controller) setBusy(false);
    }
  };
  const publishedName = choices.find(c => c.id === published)?.name;

  return (
    <section ref={containerRef} dir={language === 'en' ? 'ltr' : 'rtl'} aria-label={t.teacherTitle}
      className="relative z-40 mx-auto flex w-full max-w-5xl flex-col items-end text-violet-950">
      <button ref={triggerRef} type="button" aria-expanded={expanded} aria-controls={panelId}
        onClick={() => setExpanded(value => !value)}
        className={'inline-flex min-h-11 max-w-full touch-manipulation items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ' +
          (publishedName ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-violet-200 bg-white text-violet-900')}>
        {busy ? <LoaderCircle size={17} aria-hidden="true" className="motion-safe:animate-spin" /> :
          publishedName ? <Check size={17} aria-hidden="true" /> : <Users size={17} aria-hidden="true" />}
        <span className="truncate">{publishedName ? t.published(publishedName) : t.choosePlaceholder}</span>
        <ChevronDown size={15} aria-hidden="true" className={expanded ? 'shrink-0 rotate-180' : 'shrink-0'} />
      </button>
      <span role="status" className="sr-only">{publishedName ? t.published(publishedName) : ''}</span>
      {expanded && (
        <div ref={panelRef} id={panelId} role="region" aria-labelledby={titleId} tabIndex={-1}
          className="absolute end-0 top-full mt-2 max-h-[70dvh] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-violet-200 bg-white p-4 text-start shadow-2xl shadow-violet-950/20 focus:outline-none">
          <div className="mb-3 flex items-start justify-between gap-3">
            <h2 id={titleId} className="text-base font-extrabold">{t.teacherTitle}</h2>
            <button type="button" aria-label={t.closePanel} onClick={() => { setExpanded(false); triggerRef.current?.focus(); }}
              className="-me-2 -mt-2 flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full hover:bg-violet-50">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <ClassEntryLanguagePicker language={language} onChange={setLanguage} />
          {published && publishedName ? (
            <>
              <p className="flex items-center gap-2 font-bold text-emerald-800"><Check aria-hidden="true" size={20} />{t.published(publishedName)}</p>
              <p className="mt-2 text-sm leading-relaxed">{t.teacherInstructions}</p>
              <button type="button" disabled={busy} onClick={() => { void changeEntry(false); }}
                className="mt-3 min-h-11 w-full rounded-xl border border-violet-200 px-4 py-2 font-bold disabled:opacity-50">{t.stop}</button>
            </>
          ) : choices.length ? (
            <>
              <p className="text-sm leading-relaxed">{t.teacherHint}</p>
              <label htmlFor={selectId} className="mb-1 mt-3 block text-sm font-bold">{t.choose}</label>
              <select id={selectId} value={classId} disabled={busy} onChange={e => setSelected(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-base">
                <option value="">{t.choosePlaceholder}</option>
                {choices.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="button" disabled={busy || !classId} onClick={() => { void changeEntry(true); }}
                className="mt-3 min-h-12 w-full rounded-xl bg-violet-700 px-4 py-3 text-base font-bold text-white disabled:opacity-50">{busy ? t.publishing : t.publish}</button>
            </>
          ) : <p className="text-sm leading-relaxed">{t.noClasses}</p>}
          {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error === 'stop' ? t.stopError : t.publishError}</p>}
        </div>
      )}
      {!expanded && error && <p role="alert" className="mt-2 max-w-sm rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error === 'stop' ? t.stopError : t.publishError}</p>}
    </section>
  );
}
