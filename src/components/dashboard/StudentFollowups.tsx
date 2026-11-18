import { useEffect, useState } from 'react';
import { supabase, type AssignmentData } from '../../core/supabase';
import { flushPracticeReceipts } from '../../utils/assignmentPracticeReceipt';
import { useLanguage } from '../../hooks/useLanguage';
import { assignmentWorkflowT } from '../../locales/teacher/assignment-workflows';
import { resolveAssignmentWords } from '../../utils/resolveAssignmentWords';
import type { Word } from '../../data/vocabulary';

interface Note {
  profile_id: string;
  assignment_id: string;
  kind: 'reminder' | 'practice';
  word_ids: number[];
}
interface Props {
  uid: string;
  classCode: string;
  assignments: AssignmentData[];
  inTasks: boolean;
  openTasks: () => void;
  launch: (assignment: AssignmentData, words: Word[]) => void;
}
export default function StudentFollowups({
  uid,
  classCode,
  assignments,
  inTasks,
  openTasks,
  launch,
}: Props) {
  const { language } = useLanguage();
  const t = assignmentWorkflowT[language];
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    let serial = 0;
    async function load() {
      const request = ++serial;
      try {
        await flushPracticeReceipts(uid);
        const result = await supabase.rpc('my_assignment_followups', { p_class_code: classCode });
        if (result.error) throw result.error;
        if (active && request === serial) {
          setNotes(result.data ?? []);
          setError(false);
        }
      } catch {
        if (active && request === serial) setError(true);
      }
    }
    void load();
    window.addEventListener('focus', load);
    window.addEventListener('online', load);
    return () => {
      active = false;
      window.removeEventListener('focus', load);
      window.removeEventListener('online', load);
    };
  }, [uid, classCode, revision]);
  async function open(note: Note) {
    if (!inTasks) {
      openTasks();
      return;
    }
    const assignment = assignments.find((a) => a.id === note.assignment_id);
    if (!assignment) {
      setError(true);
      return;
    }
    try {
      const words = await resolveAssignmentWords(assignment);
      const missed = new Set(note.word_ids);
      const selected =
        note.kind === 'practice' && missed.size ? words.filter((w) => missed.has(w.id)) : words;
      if (!selected.length) {
        setError(true);
        return;
      }
      // Focused practice uses these exact word cards even when the original
      // assignment was a sentence game. Its completion has a separate receipt.
      launch(
        {
          ...assignment,
          words: selected,
          wordIds: selected.map((w) => w.id),
          allowedModes:
            note.kind === 'practice' ? ['flashcards', 'classic'] : assignment.allowedModes,
          followupProfileId: note.kind === 'practice' ? note.profile_id : undefined,
        },
        selected
      );
    } catch {
      setError(true);
    }
  }
  return (
    <>
      {error && inTasks && (
        <p role="status">
          {t.missing}{' '}
          <button type="button" onClick={() => setRevision((n) => n + 1)}>
            {t.retry}
          </button>
        </p>
      )}
      {notes.map((note) => (
        <button
          type="button"
          key={note.assignment_id + note.kind}
          onClick={() => void open(note)}
          className="mb-2 block w-full rounded-xl border border-violet-300 bg-[var(--vb-surface)] p-3 text-start text-[var(--vb-text-primary)]"
        >
          <strong>{note.kind === 'practice' ? t.practiceLabel : t.reminderLabel}</strong>
          {' · '}
          <bdi>{assignments.find((a) => a.id === note.assignment_id)?.title}</bdi>
          {inTasks && (
            <span className="block font-bold text-violet-700 dark:text-violet-300">
              {note.kind === 'practice' ? t.play : t.open}
            </span>
          )}
        </button>
      ))}
    </>
  );
}
