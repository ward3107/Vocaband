import { GraduationCap, Users } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { classEntryT } from '../../locales/class-entry';
import { useEffect, useRef, useState } from 'react';
import { useClassLiveSession } from '../../hooks/useClassLiveSession';
import { classLiveT } from '../../locales/class-live';
import { ClassLessonEndedError, loadMyClassLiveGame } from '../../utils/classLiveSession';
import { primeAudio } from '../../utils/primeAudio';

export default function StudentClassCard({
  className,
  uid,
  onJoin,
  onJoinLesson,
  onSwitchStudent,
}: {
  className?: string;
  uid: string;
  onJoin: () => void;
  onJoinLesson: (game: Awaited<ReturnType<typeof loadMyClassLiveGame>>) => void;
  onSwitchStudent?: () => void;
}) {
  const { language } = useLanguage();
  const t = classEntryT[language];
  const lesson = classLiveT[language];
  const { live, className: discoveredClassName, status, refresh } = useClassLiveSession(uid);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { const pending = request.current; request.current = null; pending?.abort(); }, [uid]);
  const join = async () => {
    if (joining) return;
    primeAudio();
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15_000);
    setJoining(true);
    setError(null);
    try {
      const game = await loadMyClassLiveGame(controller.signal);
      controller.signal.throwIfAborted();
      onJoinLesson(game);
    } catch (reason) {
      if (request.current === controller) {
        setError(reason instanceof ClassLessonEndedError ? lesson.ended : lesson.joinError);
        refresh();
      }
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) setJoining(false);
    }
  };
  return (
    <section
      className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-violet-950 sm:p-5"
      aria-label={t.homeTitle}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <GraduationCap size={20} aria-hidden="true" />
            {t.homeTitle}
          </p>
          {(discoveredClassName || className) && <h2 className="mt-1 text-2xl font-extrabold">{discoveredClassName || className}</h2>}
        </div>
        {onSwitchStudent && (
          <button
            type="button"
            onClick={onSwitchStudent}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl bg-white px-3 py-2 text-sm font-bold"
          >
            <Users size={18} aria-hidden="true" />
            {t.switchStudent}
          </button>
        )}
      </div>
      <p role="status" className="mt-3 text-base leading-relaxed">{status === 'loading' ? lesson.loading : status === 'error' ? lesson.unavailable : live ? lesson.active : lesson.waiting}</p>
      {live && <>
        <p className="mt-1 text-sm">{lesson.nameReady}</p>
        <button type="button" disabled={joining} onClick={() => { void join(); }}
          className="mt-3 min-h-14 w-full rounded-xl bg-violet-700 px-4 py-3 text-xl font-bold text-white disabled:opacity-60">
          {joining ? lesson.joining : lesson.join}
        </button>
      </>}
      {error && <p role="alert" className="mt-3 text-base font-semibold text-red-700">{error}</p>}
      {!live && <button type="button" onClick={refresh} className="mt-2 min-h-11 rounded-xl bg-white px-4 py-2 font-bold">{lesson.refresh}</button>}
      <details className="mt-3 rounded-xl border border-violet-200 bg-white px-3">
        <summary className="min-h-11 cursor-pointer py-3 font-bold">{lesson.manual}</summary>
        <button type="button" onClick={onJoin} className="mb-2 min-h-11 rounded-xl bg-violet-100 px-4 py-2 font-bold">{lesson.enterCode}</button>
      </details>
    </section>
  );
}
