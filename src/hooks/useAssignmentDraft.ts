import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { supabase } from '../core/supabase';
import type { Word } from '../data/vocabulary';
import type { SentenceDifficulty } from '../constants/game';
import type { AiLessonResponse } from '../utils/aiLesson';

export interface DraftValues {
  step: 1 | 2 | 3;
  words: Word[];
  ids: number[];
  modes: string[];
  title: string;
  deadline: string;
  instructions: string;
  sentences: string[];
  difficulty: SentenceDifficulty;
  competition?: boolean;
  lesson?: AiLessonResponse | null;
  paste?: string;
  pack?: string | null;
}
interface Remote {
  revision: string;
  payload: DraftValues | null;
}
interface Cache extends Remote {
  base: string | null;
  pending: boolean;
}
type Status = 'empty' | 'local' | 'saved' | 'conflict' | 'unavailable';
type Snapshot = { ready: boolean; initial: DraftValues | null; version: number; status: Status };
function valid(value: DraftValues | null) {
  return (
    value === null ||
    (value &&
      [1, 2, 3].includes(value.step) &&
      Array.isArray(value.words) &&
      value.words.every((w) => w && Number.isFinite(w.id)) &&
      Array.isArray(value.ids) &&
      Array.isArray(value.modes) &&
      typeof value.title === 'string' &&
      typeof value.deadline === 'string' &&
      Array.isArray(value.sentences))
  );
}

// Serialise cloud writes per tab. The database compares revisions across tabs
// and devices, and the local copy survives a reload even while a write is pending.
export class AssignmentDraftSession {
  private key: string;
  private row: Cache | null = null;
  private conflict: Remote | null = null;
  private timer?: ReturnType<typeof setTimeout>;
  private running = false;
  private generation = 0;
  private listeners = new Set<() => void>();
  private state: Snapshot;
  constructor(
    private uid: string,
    private classId: string,
    private slot: string
  ) {
    this.key = 'vocaband_assignment_draft_v1:' + JSON.stringify([uid, classId, slot]);
    try {
      const cached = JSON.parse(localStorage.getItem(this.key) ?? 'null') as Cache | null;
      if (cached && typeof cached.revision === 'string' && valid(cached.payload)) this.row = cached;
    } catch {
      /* Storage can be disabled on a shared device. */
    }
    this.state = {
      ready: !!this.row,
      initial: this.row?.payload ?? null,
      version: 0,
      status: this.row?.pending ? 'local' : this.row?.payload ? 'saved' : 'empty',
    };
  }
  snapshot = () => this.state;
  subscribe = (notify: () => void) => {
    this.listeners.add(notify);
    return () => {
      this.listeners.delete(notify);
    };
  };
  private publish(change: Partial<Snapshot>) {
    this.state = { ...this.state, ...change };
    this.listeners.forEach((f) => f());
  }
  private cache() {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.row));
      return true;
    } catch {
      return false;
    }
  }
  private replace(remote: Remote | null) {
    this.row = remote ? { ...remote, base: remote.revision, pending: false } : null;
    this.conflict = null;
    this.cache();
    this.publish({
      ready: true,
      initial: remote?.payload ?? null,
      version: this.state.version + 1,
      status: remote?.payload ? 'saved' : 'empty',
    });
  }
  load = async () => {
    const generation = ++this.generation;
    if (this.running) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    try {
      const { data, error } = await supabase
        .from('assignment_drafts')
        .select('revision,payload')
        .eq('teacher_uid', this.uid)
        .eq('class_id', this.classId)
        .eq('slot', this.slot)
        .abortSignal(controller.signal)
        .maybeSingle();
      if (generation !== this.generation || this.running) return;
      if (error) throw error;
      const remote: Remote | null = data?.revision && valid(data.payload) ? data : null;
      if (this.row?.pending) {
        if (remote?.revision === this.row.revision) {
          this.row = { ...this.row, base: remote.revision, pending: false };
          this.cache();
          this.publish({ ready: true, status: this.row.payload ? 'saved' : 'empty' });
        } else if ((remote?.revision ?? null) !== this.row.base) {
          this.conflict = remote;
          this.publish({ ready: true, status: 'conflict' });
        } else {
          this.publish({ ready: true });
          await this.flush();
        }
      } else if (remote?.revision !== this.row?.revision) this.replace(remote);
      else this.publish({ ready: true });
    } catch {
      if (generation === this.generation) this.publish({ ready: true });
    } finally {
      clearTimeout(timer);
    }
  };
  save = (payload: DraftValues | null) => {
    if (JSON.stringify(this.row?.payload ?? null) === JSON.stringify(payload)) return;
    this.row = {
      revision: crypto.randomUUID(),
      base: this.row?.base ?? null,
      pending: true,
      payload,
    };
    const cached = this.cache();
    if (this.state.status === 'conflict') return;
    this.publish({ status: cached ? 'local' : 'unavailable' });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), 450);
  };
  private flush = async () => {
    const written = this.row;
    if (this.running || !written?.pending || this.state.status === 'conflict') return;
    this.running = true;
    ++this.generation;
    let check = false;
    try {
      const { data, error } = await supabase.rpc('save_assignment_draft', {
        p_class_id: this.classId,
        p_slot: this.slot,
        p_base: written.base,
        p_revision: written.revision,
        p_payload: written.payload,
      });
      if (error) throw error;
      if (data !== true) {
        check = data === false;
        return;
      }
      if (!this.row) return;
      this.row = {
        ...this.row,
        base: written.revision,
        pending: this.row.revision !== written.revision,
      };
      this.cache();
      this.publish({ status: this.row.pending ? 'local' : this.row.payload ? 'saved' : 'empty' });
    } catch {
      this.publish({ status: this.cache() ? 'local' : 'unavailable' });
    } finally {
      this.running = false;
      if (check) void this.load();
      else if (this.row?.pending && this.row.revision !== written.revision) void this.flush();
    }
  };
  useRemote = () => this.replace(this.conflict);
  keepLocal = () => {
    if (!this.row) return;
    this.row = { ...this.row, base: this.conflict?.revision ?? null };
    this.conflict = null;
    this.cache();
    this.publish({ status: 'local' });
    void this.flush();
  };
  clear = () => {
    if (this.state.status === 'conflict') {
      this.useRemote();
      return;
    }
    this.save(null);
    void this.flush();
  };
}
export function useAssignmentDraft(uid: string, classId: string, slot: string) {
  const session = useMemo(
    () => new AssignmentDraftSession(uid, classId, slot),
    [uid, classId, slot]
  );
  const snapshot = useSyncExternalStore(session.subscribe, session.snapshot, session.snapshot);
  useEffect(() => {
    void session.load();
    window.addEventListener('online', session.load);
    window.addEventListener('focus', session.load);
    return () => {
      window.removeEventListener('online', session.load);
      window.removeEventListener('focus', session.load);
    };
  }, [session]);
  return { session, snapshot };
}
