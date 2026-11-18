import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import {
  CreateAssignmentWizard,
  type CreateAssignmentWizardProps,
} from '../components/CreateAssignmentWizard';
import HebrewAssignmentWizard from '../components/HebrewAssignmentWizard';
import type { ClassData } from '../core/supabase';
import {
  useAssignmentDraft,
  type DraftValues,
  AssignmentDraftSession,
} from '../hooks/useAssignmentDraft';
import { assignmentWorkflowT } from '../locales/teacher/assignment-workflows';
import { useLanguage } from '../hooks/useLanguage';
import { URL_ROUTING_PUSH } from '../utils/urlRouting';

type Props = CreateAssignmentWizardProps & {
  teacherUid?: string;
  activeAssignmentDraft: RefObject<AssignmentDraftSession | null>;
};
export interface DraftBinding {
  initial: DraftValues | null;
  save: (value: DraftValues) => void;
}
function Editor(props: Props & { draft?: DraftBinding }) {
  const fullClass = props.selectedClass as ClassData;
  if (fullClass?.subject === 'hebrew') {
    return (
      <HebrewAssignmentWizard
        {...props}
        selectedClass={fullClass}
        isEditing={!!props.editingAssignment}
      />
    );
  }
  return <CreateAssignmentWizard {...props} />;
}

function RestoredEditor({ props, session }: { props: Props; session: AssignmentDraftSession }) {
  const [{ initial, resetForm }] = useState(session.snapshot);
  const [ready, setReady] = useState(!initial && !resetForm);
  const [failed, setFailed] = useState(false);
  const publishing = useRef(false);
  const { language } = useLanguage();
  useLayoutEffect(() => {
    if (!initial && !resetForm) return;
    props.setAssignmentTitle(initial?.title ?? '');
    props.setAssignmentDeadline(initial?.deadline ?? '');
    props.setAssignmentModes(initial?.modes ?? []);
    props.setAssignmentSentences(initial?.sentences ?? []);
    props.setSentenceDifficulty(initial?.difficulty ?? 2);
    props.setSelectedWords(initial?.ids ?? []);
    const custom = initial?.words.filter((w) => w.id < 0 || w.level === 'Custom') ?? [];
    if (custom.length)
      props.setCustomWords((old) => [
        ...new Map([...old, ...custom].map((w) => [w.id, w])).values(),
      ]);
    setReady(true);
    // A new remote version mounts a fresh editor. Updating during ordinary input would overwrite it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!ready) return null;
  return (
    <>
      <Editor
        {...props}
        template={resetForm ? null : props.template}
        draft={{ initial, save: session.save }}
        handleSaveAssignment={async (...args) => {
          if (publishing.current) throw new Error('Publication already in progress');
          publishing.current = true;
          setFailed(false);
          try {
            await props.handleSaveAssignment(...args);
            session.clear();
          } catch (error) {
            setFailed(true);
            throw error;
          } finally {
            publishing.current = false;
          }
        }}
      />
      {failed && (
        <p role="alert" className="mx-auto max-w-4xl px-4 py-2 font-semibold">
          {assignmentWorkflowT[language].publishError}
        </p>
      )}
    </>
  );
}

function initialSlot(props: Props, classId: string) {
  // Copies, templates and preselected reteach words must never overwrite an
  // unrelated half-written assignment in the destination class.
  if (props.template) return 'template-' + props.template.id;
  if (props.selectedWords.length || props.assignmentTitle) {
    const data = JSON.stringify([
      props.assignmentTitle,
      props.selectedWords,
      props.assignmentModes,
      props.assignmentSentences,
    ]);
    let hash = 2166136261;
    for (let i = 0; i < data.length; i++) hash = Math.imul(hash ^ data.charCodeAt(i), 16777619);
    return 'seed-' + (hash >>> 0).toString(36);
  }
  const url = new URL(window.location.href);
  const saved = url.searchParams.get('draft');
  return url.pathname === '/create-assignment' &&
    url.searchParams.get('classId') === classId &&
    saved &&
    /^(?:seed-[a-z0-9]+|template-[a-zA-Z0-9_-]{1,90})$/.test(saved)
    ? saved
    : 'new';
}
function Workspace({ props, uid, classId }: { props: Props; uid: string; classId: string }) {
  const { language } = useLanguage();
  const t = assignmentWorkflowT[language];
  const active = props.activeAssignmentDraft;
  const [session] = useState(() => {
    const previous = active.current;
    if (previous?.uid === uid && previous.classId === classId) return previous;
    return new AssignmentDraftSession(uid, classId, initialSlot(props, classId));
  });
  const slot = session.slot;
  const snapshot = useAssignmentDraft(session);
  useLayoutEffect(() => {
    active.current = session;
  }, [active, session]);
  useLayoutEffect(() => {
    const original = window.location.href;
    const url = new URL('/create-assignment', window.location.origin);
    url.searchParams.set('classId', classId);
    if (slot !== 'new') url.searchParams.set('draft', slot);
    if (original !== url.href) {
      const state = { ...history.state, view: 'create-assignment' };
      if (history.state?.view === 'create-assignment' || location.pathname === url.pathname)
        history.replaceState(state, '', url);
      else history.pushState(state, '', url);
    }
    return () => {
      // With general URL routing disabled the dashboard leaves the URL as-is.
      // Remove the editor deep link on exit so refreshing reopens the dashboard.
      if (!URL_ROUTING_PUSH && window.location.href === url.href) {
        const previous = new URL(original);
        history.replaceState(
          history.state,
          '',
          previous.pathname === url.pathname ? '/' : previous
        );
      }
    };
  }, [classId, slot]);
  if (!snapshot.ready)
    return (
      <p className="p-4" role="status">
        {t.loading}
      </p>
    );
  return (
    <>
      <RestoredEditor key={snapshot.version} props={props} session={session} />
      {snapshot.status !== 'empty' && (
        <aside className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] text-sm sm:pb-4">
          <span role="status">
            {snapshot.status === 'conflict'
              ? t.conflict
              : snapshot.status === 'saved'
                ? t.saved
                : snapshot.status === 'unavailable'
                  ? t.storageError
                  : t.local}
          </span>
          {snapshot.status === 'conflict' && (
            <>
              <button type="button" className="min-h-11 underline" onClick={session.useRemote}>
                {t.useRemote}
              </button>
              <button type="button" className="min-h-11 underline" onClick={session.keepLocal}>
                {t.keepLocal}
              </button>
            </>
          )}
          <button
            className="min-h-11 underline"
            type="button"
            onClick={() => {
              if (window.confirm(t.discardConfirm)) {
                session.clear();
                props.onBack();
              }
            }}
          >
            {t.discard}
          </button>
        </aside>
      )}
    </>
  );
}

export default function CreateAssignmentView(props: Props) {
  const id = props.selectedClass?.id;
  if (!props.teacherUid || !id || props.editingAssignment) return <Editor {...props} />;
  return (
    <Workspace
      key={props.teacherUid + ':' + id}
      props={props}
      uid={props.teacherUid}
      classId={id}
    />
  );
}
