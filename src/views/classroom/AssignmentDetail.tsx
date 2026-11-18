import { useEffect, useState } from 'react';
import { supabase, type ClassData, type ProgressData } from '../../core/supabase';
import { useLanguage } from '../../hooks/useLanguage';
import { assignmentWorkflowT } from '../../locales/teacher/assignment-workflows';
import AdaptiveDrawer from '../../components/classroom/AdaptiveDrawer';

export type FollowupKind = 'reminder' | 'practice';
interface Member {
  id: string;
  name: string;
  avatar: string | null;
  plays: number;
  accuracy: number | null;
  best_points?: number | null;
  missed: number[];
  reminder_sent: boolean;
  practice_sent: boolean;
}
interface Report {
  assignment_id: string;
  title: string;
  expected: number;
  participated: number;
  attempts: number;
  students: Member[] | null;
}
const action =
  'min-h-11 rounded-xl bg-violet-700 px-4 py-2 font-bold text-white disabled:opacity-60';
const secondary = 'min-h-11 rounded-xl border border-[var(--vb-border)] px-4 py-2 font-bold';
const panel =
  'space-y-3 rounded-xl border border-[var(--vb-border)] bg-[var(--vb-surface)] p-4 text-[var(--vb-text-primary)]';
const needsPractice = (s: Member) =>
  s.plays > 0 && (s.missed.length > 0 || (s.accuracy !== null && s.accuracy < 70));
type History = {
  assignmentId: string;
  title: string;
  attempts: number;
  avgScore: number;
  uniqueStudents: Set<string>;
};

function useReports(classId: string, assignmentId: string | null, scores: ProgressData[]) {
  const [rows, setRows] = useState<Report[] | null>(null);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    void (async () => {
      try {
        const result = await supabase
          .rpc('teacher_assignment_report', {
            p_class_id: classId,
            p_assignment_id: assignmentId,
          })
          .abortSignal(controller.signal);
        if (result.error) throw result.error;
        if (!controller.signal.aborted) setRows(result.data ?? []);
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    })();
    return () => controller.abort();
  }, [classId, assignmentId, refresh, scores]);
  return { rows, error, reload: () => setRefresh((v) => v + 1) };
}

export default function AssignmentReports({
  classroom,
  scores,
  history,
}: {
  classroom: ClassData;
  scores: ProgressData[];
  history: History[];
}) {
  const { language } = useLanguage();
  const t = assignmentWorkflowT[language];
  const { rows, error, reload } = useReports(classroom.id, null, scores);
  const [selected, setSelected] = useState<Report | null>(null);
  const [past, setPast] = useState<History | null>(null);
  const published = new Set(rows?.map((r) => r.assignment_id));
  const previous = history.filter((r) => !published.has(r.assignmentId));
  return (
    <section className={panel}>
      <h3 className="text-lg font-black">{t.assignments}</h3>
      {error && (
        <p role="alert">
          {t.error}{' '}
          <button className={secondary} onClick={reload}>
            {t.retry}
          </button>
        </p>
      )}
      {!error && !rows && <p role="status">{t.loading}</p>}
      {!error && rows?.length === 0 && <p>{t.empty}</p>}
      {rows?.map((r) => (
        <button
          key={r.assignment_id}
          onClick={() => setSelected(r)}
          className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--vb-surface-alt)] p-3 text-start"
        >
          <strong>{r.title}</strong>
          <span>{t.total(r.participated, r.expected)}</span>
        </button>
      ))}
      {rows && previous.length > 0 && (
        <details>
          <summary>{t.historical}</summary>
          {previous.map((r) => (
            <button className={secondary} key={r.assignmentId} onClick={() => setPast(r)}>
              {r.title} · {t.rounds(r.attempts)}
            </button>
          ))}
        </details>
      )}
      {past && (
        <AdaptiveDrawer
          open
          onClose={() => setPast(null)}
          title={past.title}
          subtitle={t.rounds(past.attempts)}
        >
          <ul className="p-4">
            {scores
              .filter((s) => s.classCode === classroom.code && s.assignmentId === past.assignmentId)
              .map((s) => (
                <li key={s.id}>
                  {s.studentName} · {s.score}
                </li>
              ))}
          </ul>
        </AdaptiveDrawer>
      )}
      {selected && (
        <ReportDetail
          key={selected.assignment_id}
          classroom={classroom}
          initial={selected}
          scores={scores}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

function ReportDetail({
  classroom,
  initial,
  scores,
  onClose,
}: {
  classroom: ClassData;
  initial: Report;
  scores: ProgressData[];
  onClose: () => void;
}) {
  const { language } = useLanguage();
  const t = assignmentWorkflowT[language];
  const { rows, error, reload } = useReports(classroom.id, initial.assignment_id, scores);
  const report = rows?.[0];
  const [confirm, setConfirm] = useState<{ kind: FollowupKind; members: Member[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  async function send() {
    if (!confirm || busy) return;
    setBusy(true);
    setNotice('');
    try {
      const { data, error: sendError } = await supabase.rpc('send_assignment_followup', {
        p_assignment_id: initial.assignment_id,
        p_kind: confirm.kind,
        p_profile_ids: confirm.members.map((m) => m.id),
      });
      if (sendError || typeof data !== 'number')
        throw sendError ?? new Error('Missing delivery count');
      if (data === confirm.members.length) {
        setSentIds(
          (prev) => new Set([...prev, ...confirm.members.map((m) => confirm.kind + m.id)])
        );
      }
      setNotice(t.sent(data));
      setConfirm(null);
      reload();
    } catch {
      setNotice(t.failed);
    } finally {
      setBusy(false);
    }
  }
  const members = report?.students ?? [];
  const groups: { title: string; kind?: FollowupKind; members: Member[] }[] = [
    { title: t.waiting, kind: 'reminder', members: members.filter((s) => !s.plays) },
    { title: t.needsPractice, kind: 'practice', members: members.filter(needsPractice) },
    { title: t.started, members: members.filter((s) => s.plays && !needsPractice(s)) },
  ];
  return (
    <AdaptiveDrawer open onClose={onClose} title={initial.title} subtitle={classroom.name}>
      <div className="space-y-4 p-4">
        {error || (rows && !report) ? (
          <p role="alert">
            {t.error}{' '}
            <button className={secondary} onClick={reload}>
              {t.retry}
            </button>
          </p>
        ) : !report ? (
          <p role="status">{t.loading}</p>
        ) : (
          <>
            <h3 className="text-xl font-black">{t.total(report.participated, report.expected)}</h3>
            {groups.map((group) => {
              const kind = group.kind;
              const pending = kind
                ? group.members.filter(
                    (s) =>
                      !(kind === 'reminder' ? s.reminder_sent : s.practice_sent) &&
                      !sentIds.has(kind + s.id)
                  )
                : [];
              return (
                <section className={panel} key={group.title}>
                  <h4 className="font-black">
                    {group.title} · {group.members.length}
                  </h4>
                  <ul>
                    {group.members.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-1"
                      >
                        <bdi>{s.name}</bdi>
                        <small>
                          {s.plays ? t.rounds(s.plays) : ''}
                          {s.best_points != null && ' · ' + t.bestPoints(s.best_points)}
                          {s.accuracy !== null && ' · ' + t.accuracy(s.accuracy)}
                        </small>
                      </li>
                    ))}
                  </ul>
                  {kind && pending.length > 0 && !confirm && (
                    <button
                      className={action}
                      onClick={() => {
                        setNotice('');
                        setConfirm({ kind, members: pending });
                      }}
                    >
                      {kind === 'reminder' ? t.reminder : t.practice}
                    </button>
                  )}
                  {kind && group.members.length > 0 && !pending.length && <small>{t.all}</small>}
                </section>
              );
            })}
          </>
        )}
        {confirm && (
          <section className={panel} aria-live="polite">
            <strong>{t.confirm(confirm.members.length, classroom.name)}</strong>
            <p>{confirm.members.map((s) => s.name).join(', ')}</p>
            <div className="flex gap-2">
              <button className={action} disabled={busy} onClick={() => void send()}>
                {t.send}
              </button>
              <button className={secondary} disabled={busy} onClick={() => setConfirm(null)}>
                {t.cancel}
              </button>
            </div>
          </section>
        )}
        <p role="status">{notice}</p>
      </div>
    </AdaptiveDrawer>
  );
}
