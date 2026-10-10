import { AsyncLocalStorage } from 'node:async_hooks';
import type { QpStudentEntry } from '../core/quickPlayProtocol';
import { QP_MAX_SESSION_SCORE } from '../core/quickPlayProtocol';
import type { createQuickPlayStore, EngineAward } from './quickPlayStore.server';

type Store = ReturnType<typeof createQuickPlayStore>;
type State = { sessionCode: string; students: Map<string, QpStudentEntry>; teamMode: boolean };
type Message = { room: string; event: string; payload: unknown };
export function encodeRoundState(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (v instanceof Map) return { $map: [...v] };
    if (v instanceof Set) return { $set: [...v] };
    return v;
  });
}
export function decodeRoundState<T>(value: string): T {
  return JSON.parse(value, (_key, v) => v?.$map ? new Map(v.$map) : v?.$set ? new Set(v.$set) : v) as T;
}

/** A round transition and its score awards commit together. Optimistic Redis
 * revisions fence concurrent machines without a host lease or a failover gap.
 * Nothing reaches a browser until the winning transaction has committed. */
export function createQuickPlayEngine<T extends State>(options: {
  store: Store;
  local: (code: string) => T;
  hydrate: (state: T, saved?: string, positions?: Record<string, { x: number; y: number; lastMoveTs: number }>) => void;
  serialize: (state: T) => string;
  nextAt: (state: T) => number;
  emit: (message: Message) => void;
  broadcast: (code: string) => void;
}) {
  type Context = { state: T; awards: EngineAward[]; messages: Message[]; broadcast: boolean; attempt: number; resetPositions: boolean };
  const context = new AsyncLocalStorage<Context>();
  const queues = new Map<string, Promise<void>>();
  const current = () => context.getStore();
  async function transact(code: string, action: () => Promise<void> | void, actor?: { id: string; owner: string }) {
    for (let attempt = 0; attempt < 64; attempt++) {
      const snapshot = await options.store.engineRead(code);
      if (snapshot.closed) throw new Error('Quick Play session has ended');
      if (actor && !snapshot.students?.some(p => p.clientId === actor.id && p.owner === actor.owner)) throw new Error('Quick Play player ownership changed');
      const state = { ...options.local(code), students: new Map((snapshot.students ?? []).map(p => [p.clientId, p])), teamMode: !!snapshot.teamMode };
      options.hydrate(state, snapshot.engine, snapshot.positions);
      const before = options.serialize(state);
      const tx: Context = { state, awards: [], messages: [], broadcast: false, attempt, resetPositions: false };
      await context.run(tx, action);
      const after = options.serialize(state);
      // Read-only resyncs still compare revisions before publishing a question.
      // Timer polls with no work require no write or extra network round trip.
      if (before === after && !tx.messages.length && !tx.awards.length) return;
      const result = await options.store.engineCommit(code, snapshot.engineRevision ?? 0, after, tx.awards, actor, tx.resetPositions, options.nextAt(state));
      if (result.status === 'conflict') continue;
      if (result.status !== 'ok') throw new Error(`Quick Play transition rejected: ${result.status}`);
      for (const message of tx.messages) {
        // A regular score or a teacher bonus can land while this transition
        // is being computed. Report the committed total, including both.
        if (actor && message.payload && typeof message.payload === 'object' && 'totalScore' in message.payload) {
          message.payload.totalScore = result.students?.find(p => p.clientId === actor.id)?.score ?? message.payload.totalScore;
        }
        options.emit(message);
      }
      if (tx.broadcast) options.broadcast(code);
      return;
    }
    throw new Error('Quick Play room busy; retry the action');
  }
  return {
    current,
    state: (code: string) => current()?.state.sessionCode === code ? current()!.state : undefined,
    emit(room: string, event: string, payload: unknown) {
      const message = { room, event, payload: structuredClone(payload) };
      const tx = current();
      if (tx) tx.messages.push(message); else options.emit(message);
    },
    award(id: string, amount: number, operationId: string) {
      const tx = current();
      if (!tx) throw new Error('Round awards require a transaction');
      const player = tx.state.students.get(id);
      if (!player) return null;
      tx.awards.push({ id, amount, operationId });
      player.score = Math.min(QP_MAX_SESSION_SCORE, player.score + amount);
      return player;
    },
    run(code: string, action: () => Promise<void> | void, actor?: { id: string; owner: string }) {
      // One local queue avoids retry storms for a classroom's simultaneous taps.
      const work = (queues.get(code) ?? Promise.resolve()).catch(() => {}).then(() => transact(code, action, actor));
      queues.set(code, work);
      void work.finally(() => { if (queues.get(code) === work) queues.delete(code); }).catch(() => {});
      return work;
    },
  };
}
