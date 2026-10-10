import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from 'redis';
import { randomUUID } from 'node:crypto';
import { createQuickPlayStore } from '../utils/quickPlayStore.server';
import type { QpStudentEntry } from '../core/quickPlayProtocol';
const redis = process.env.QP_TEST_REDIS_URL ? createClient({ url: process.env.QP_TEST_REDIS_URL, socket: { reconnectStrategy: false } }) : undefined;
const keys: string[] = [];
beforeAll(async () => { if (redis) await redis.connect(); });
afterAll(async () => { if (redis?.isReady) { if (keys.length) await redis.del(keys); await redis.quit(); } });
const player = (clientId: string = randomUUID()): QpStudentEntry => ({ clientId, nickname: 'Alex', avatar: '🦊', score: 0, lastSeen: 1 });
for (const mode of ['memory', ...(redis ? ['redis'] : [])]) describe(`shared scores (${mode})`, () => {
  function setup() {
    const code = `test-${randomUUID()}`;
    for (const suffix of ['meta', 'players', 'kicked', 'operations']) keys.push(`qp-state:v1:{${code}}:${suffix}`);
    return { code, store: createQuickPlayStore(mode === 'redis' ? { eval: (s,o) => redis!.eval(s,o) } : undefined) };
  }
  it('adds regular progress independently of awards and ignores duplicate/lower totals', async () => {
    const { store, code } = setup(), p = player(); await store.join(code,p,'socket-a');
    expect((await store.score(code,p.clientId,'socket-a',50)).entry?.score).toBe(50);
    await store.award(code,p.clientId,10,'bonus');
    await Promise.all(Array.from({ length: 10 }, () => store.award(code,p.clientId,10,'bonus')));
    expect((await store.score(code,p.clientId,'socket-a',70)).entry).toMatchObject({ score:80,reportedScore:70 });
    expect((await store.score(code,p.clientId,'socket-a',20)).entry?.score).toBe(80);
    expect((await store.score(code,p.clientId,'socket-a',2000)).status).toBe('invalid_payload');
  });
  it('revokes old ownership and persists kicks across store instances', async () => {
    const { store, code } = setup(), p = player(); await store.join(code,p,'old');
    await store.join(code,p,'new');
    expect((await store.score(code,p.clientId,'old',10)).status).toBe('unauthorized');
    await store.kick(code,p.clientId);
    expect((await store.join(code,p,'again')).status).toBe('kicked');
    expect((await store.award(code,p.clientId,10,'later')).status).toBe('kicked');
  });
  it('freezes all results, including explicit leaves, and rejects all late writes', async () => {
    const { store, code } = setup(), p = player(); await store.join(code,p,'a');
    await store.score(code,p.clientId,'a',80); await store.leave(code,p.clientId,'a');
    expect((await store.snapshot(code)).students).toEqual([]);
    const closed = await store.close(code);
    expect(closed.students?.[0].score).toBe(80);
    expect((await store.close(code))).toEqual(closed);
    expect((await store.join(code,p,'a')).status).toBe('session_inactive');
    expect((await store.award(code,p.clientId,1,'late')).status).toBe('session_inactive');
  });
  it('enforces global capacity atomically and restores balanced teams', async () => {
    const { store, code } = setup(); await store.teams(code,true);
    const joined = await Promise.all(Array.from({ length: 65 }, (_,i) => store.join(code,player(`id-${i}`),`socket-${i}`)));
    expect(joined.filter(x => x.status === 'ok')).toHaveLength(60);
    const snap = await store.snapshot(code);
    expect(snap.students?.filter(x => x.team === 'red')).toHaveLength(30);
    expect(snap.students?.filter(x => x.team === 'blue')).toHaveLength(30);
    const p = snap.students![0];
    expect((await store.team(code,p.clientId,p.owner,p.team === 'red' ? 'blue' : 'red')).status).toBe('invalid_payload');
    await store.teams(code,false);
    expect((await store.snapshot(code)).students?.every(p => !p.team)).toBe(true);
  });
  it('keeps a stable celebration cursor across duplicate delivery and a bonus', async () => {
    const { store, code } = setup(), p = player(); await store.join(code,p,'a');
    await store.score(code,p.clientId,'a',20,{perfectRound:true}); await store.award(code,p.clientId,5,'bonus');
    expect((await store.score(code,p.clientId,'a',20,{perfectRound:true})).entry).toMatchObject({score:25,perfectRoundScore:20});
  });
});
it('fails closed when configured Redis is unavailable', async () => {
  const store = createQuickPlayStore({ eval: async () => { throw new Error('redis offline'); } });
  await expect(store.join('ABC234',player(),'a')).rejects.toThrow('redis offline');
});
