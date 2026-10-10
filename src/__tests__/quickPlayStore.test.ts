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
    for (const suffix of ['meta', 'players', 'kicked', 'operations', 'engine', 'positions']) keys.push(`qp-state:v1:{${code}}:${suffix}`);
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
    await store.leave(code,p.clientId,p.owner);
    expect((await store.join(code,player('replacement'),'next')).status).toBe('ok');
    expect((await store.join(code,p,'returning')).status).toBe('session_full');
    expect((await store.close(code)).students).toHaveLength(61);
  });
  it('clears teams when disabled', async () => {
    const { store, code } = setup(); await store.join(code,player(),'a');
    await store.teams(code,true);
    await store.teams(code,false);
    expect((await store.snapshot(code)).students?.every(p => !p.team)).toBe(true);
  });
  it('keeps a stable celebration cursor across duplicate delivery and a bonus', async () => {
    const { store, code } = setup(), p = player(); await store.join(code,p,'a');
    await store.score(code,p.clientId,'a',20,{perfectRound:true}); await store.award(code,p.clientId,5,'bonus');
    expect((await store.score(code,p.clientId,'a',20,{perfectRound:true})).entry).toMatchObject({score:25,perfectRoundScore:20});
  });
  it('commits the question state and awards together and fences a competing server', async () => {
    const {store,code}=setup(), p=player(); await store.join(code,p,'a');
    const results=await Promise.all([
      store.engineCommit(code,0,'winner-a',[{id:p.clientId,amount:20,operationId:'answer:round'}],{id:p.clientId,owner:'a'}),
      store.engineCommit(code,0,'winner-b',[{id:p.clientId,amount:50,operationId:'answer:round'}],{id:p.clientId,owner:'a'}),
    ]);
    expect(results.filter(r => r.status==='ok')).toHaveLength(1);
    const snapshot=await store.engineRead(code);
    expect(snapshot.engineRevision).toBe(1);
    expect(snapshot.students?.[0].score).toBe(snapshot.engine==='winner-a'?20:50);
    await store.engineCommit(code,1,'receipt-replay',[{id:p.clientId,amount:999,operationId:'answer:round'}]);
    expect((await store.snapshot(code)).students?.[0].score).toBe(snapshot.students?.[0].score);
  });
  it('rejects revoked player transitions and rolls back the entire award batch before any write', async () => {
    const {store,code}=setup(), p=player(); await store.join(code,p,'a'); await store.join(code,p,'b');
    expect((await store.engineCommit(code,0,'bad',[],{id:p.clientId,owner:'a'})).status).toBe('unauthorized');
    const result=await store.engineCommit(code,0,'partial',[
      {id:p.clientId,amount:50,operationId:'one'}, {id:'unknown',amount:30,operationId:'two'},
    ]);
    expect(result.status).toBe('conflict');
    expect((await store.engineRead(code))).toMatchObject({engineRevision:0,students:[{score:0}]});
    await store.close(code);
    expect((await store.engineCommit(code,0,'late',[])).status).toBe('session_inactive');
  });
  it('preserves independent movement while transitions race and revokes old movers', async () => {
    const {store,code}=setup(), p=player(); await store.join(code,p,'a');
    await store.engineCommit(code,0,'arena',[]);
    await store.move(code,p.clientId,'a',{x:10,y:20,lastMoveTs:30});
    await store.engineCommit(code,1,'locked',[]);
    expect((await store.engineRead(code)).positions?.[p.clientId]).toMatchObject({x:10,y:20});
    await store.join(code,p,'b');
    expect((await store.move(code,p.clientId,'a',{x:0,y:0,lastMoveTs:40})).status).toBe('unauthorized');
    await store.engineCommit(code,2,'new arena',[],undefined,true);
    expect(Object.keys((await store.engineRead(code)).positions ?? {})).toHaveLength(0);
  });

});
it('fails closed when configured Redis is unavailable', async () => {
  const store = createQuickPlayStore({ eval: async () => { throw new Error('redis offline'); } });
  await expect(store.join('ABC234',player(),'a')).rejects.toThrow('redis offline');
});
