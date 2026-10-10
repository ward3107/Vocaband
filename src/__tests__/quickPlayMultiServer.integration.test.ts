import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { io, type Socket } from 'socket.io-client';
import { createClient } from 'redis';
import { QP_EVENTS as E, QP_SERVER_EVENTS as S, type QpJoinedPayload, type QpLeaderboardPayload } from '../core/quickPlayProtocol';

// CI supplies an isolated Redis service. Local opt-in: QP_TEST_REDIS_URL.
// HTTP fixture implements only local session lookup and idempotent finalization.
const redisUrl = process.env.QP_TEST_REDIS_URL;
const root = fileURLToPath(new URL('../..', import.meta.url));
const sockets: Socket[] = [], children: ChildProcess[] = [], rooms: string[] = [];
const bases: string[] = [];
const fixture = createServer();
const sessions = new Map<string, { id: string; teacher_uid: string; is_active: boolean }>();
const progress = new Map<string, Record<string, unknown>>();
let workdir = '', fixtureUrl = '', teacherToken = '', failPersist = false;
const redis = redisUrl ? createClient({ url: redisUrl, socket: { reconnectStrategy: false } }) : undefined;
type Ack = { ok: boolean; code?: string; score?: number; totalScore?: number };
function room() { const code = randomUUID().replaceAll('-', '').slice(0,6).toUpperCase().replaceAll('0','G').replaceAll('1','H'); rooms.push(code); return code; }
function once<T>(socket: Socket, event: string, predicate: (p:T) => boolean = () => true): Promise<T> {
  return new Promise((resolveEvent, reject) => {
    const done = (data:T) => { if (!predicate(data)) return; clearTimeout(timer); socket.off(event,done); resolveEvent(data); };
    const timer = setTimeout(() => { socket.off(event,done); reject(new Error(`Timeout: ${event}`)); },5000);
    socket.on(event,done);
  });
}
async function connect(index: number) {
  const s = io(`${bases[index]}/quick-play`, { transports:['websocket'], reconnection:false, autoConnect:false });
  sockets.push(s); const ready = once(s,'connect'); s.connect(); await ready; return s;
}
async function student(index:number, code:string, identity?:QpJoinedPayload) {
  const socket = await connect(index), accepted = once<QpJoinedPayload>(socket,S.JOINED);
  socket.emit(E.STUDENT_JOIN,{sessionCode:code,clientId:identity?.clientId ?? randomUUID(),rejoinToken:identity?.rejoinToken,nickname:'Alex'});
  return { socket, identity:await accepted };
}
function ack(socket:Socket,event:string,payload:Record<string,unknown>):Promise<Ack> {
  return new Promise((res,rej) => socket.timeout(7000).emit(event,payload,(error:Error|null,value:Ack) => error ? rej(error) : res(value)));
}
async function score(s:Awaited<ReturnType<typeof student>>,code:string,value:number) {
  return ack(s.socket,E.SCORE_UPDATE,{sessionCode:code,clientId:s.identity.clientId,score:value});
}
async function stop(index:number) {
  const child = children[index]; if (child.exitCode !== null) return;
  const stopped = new Promise<void>(r => child.once('exit',() => r())); child.kill('SIGTERM'); await stopped;
}
async function start(index:number) {
  const probe = createServer(); await new Promise<void>(r => probe.listen(0,'127.0.0.1',r));
  const address = probe.address(); if (!address || typeof address === 'string') throw new Error('missing port');
  await new Promise<void>(r => probe.close(() => r()));
  bases[index] = `http://127.0.0.1:${address.port}`;
  let output = '';
  const child = spawn(process.execPath,['--import',resolve(root,'node_modules/tsx/dist/loader.mjs'),resolve(root,'server.ts')],{
    cwd:workdir,env:{ PATH:process.env.PATH,NODE_ENV:'production',PORT:String(address.port),REDIS_URL:redisUrl,
      SUPABASE_URL:fixtureUrl,SUPABASE_SERVICE_ROLE_KEY:'local-test-only-shared-secret' },stdio:['ignore','pipe','pipe'],
  });
  children[index] = child;
  child.stdout?.on('data',d => { output += String(d); }); child.stderr?.on('data',d => { output += String(d); });
  await new Promise<void>((res,rej) => {
    const deadline = setTimeout(() => { clearInterval(timer); rej(new Error(output)); },20000);
    const timer = setInterval(() => {
      if (output.includes('Server running')) { clearTimeout(deadline); clearInterval(timer); res(); }
      else if (child.exitCode !== null) { clearTimeout(deadline); clearInterval(timer); rej(new Error(output)); }
    },50);
  });
}

describe.skipIf(!redisUrl)('Quick Play with TWO real servers and Redis', () => {
  beforeAll(async () => {
    await redis!.connect();
    const {privateKey,publicKey} = await generateKeyPair('ES256');
    const jwk = {...await exportJWK(publicKey),kid:'local-multi-key',alg:'ES256',use:'sig'};
    teacherToken = await new SignJWT({}).setProtectedHeader({alg:'ES256',kid:jwk.kid}).setSubject('test-teacher')
      .setAudience('authenticated').setExpirationTime('10m').sign(privateKey);
    fixture.on('request',async(req,res) => {
      res.setHeader('Content-Type','application/json');
      if (req.url?.includes('/.well-known/jwks.json')) return res.end(JSON.stringify({keys:[jwk]}));
      const url = new URL(req.url!,'http://fixture');
      if (url.pathname === '/rest/v1/quick_play_sessions') {
        const code = url.searchParams.get('session_code')?.replace('eq.','') ?? '';
        if (!sessions.has(code)) sessions.set(code,{id:randomUUID(),teacher_uid:'test-teacher',is_active:true});
        const session = sessions.get(code)!;
        if (req.method === 'PATCH') { session.is_active = false; res.statusCode=204; return res.end(); }
        return res.end(JSON.stringify(session));
      }
      if (url.pathname === '/rest/v1/progress') {
        if (failPersist) { res.statusCode=503; return res.end(JSON.stringify({message:'temporary fixture outage',code:'TEST_OUTAGE'})); }
        let body=''; for await (const chunk of req) body += chunk;
        expect(req.headers.prefer).toContain('resolution=ignore-duplicates');
        expect(url.searchParams.get('on_conflict')).toBe('assignment_id,student_uid,mode,class_code');
        for (const row of JSON.parse(body) as Record<string,unknown>[]) {
          const key = `${row.assignment_id}:${row.student_uid}`;
          if (!progress.has(key)) progress.set(key,row);
        }
        res.statusCode=201; return res.end('');
      }
      return res.end('[]');
    });
    await new Promise<void>(r => fixture.listen(0,'127.0.0.1',r));
    const address=fixture.address(); if (!address || typeof address === 'string') throw new Error('missing fixture port');
    fixtureUrl=`http://127.0.0.1:${address.port}`;
    workdir=await mkdtemp(join(tmpdir(),'vocaband-two-servers-'));
    await start(0); await start(1);
  },45000);
  afterAll(async () => {
    sockets.forEach(s => s.disconnect());
    await Promise.all(children.map((_,i) => stop(i)));
    if (fixture.listening) await new Promise<void>(r => fixture.close(() => r()));
    const keys=rooms.flatMap(c => ['meta','players','kicked','operations'].map(k => `qp-state:v1:{${c}}:${k}`));
    if (redis?.isReady) { if (keys.length) await redis.del(keys); await redis.quit(); }
    if(workdir) await rm(workdir,{recursive:true,force:true});
  },15000);

  it('keeps score and bonus when reconnecting to another server, including lost-ACK replay',async() => {
    const code=room(), a=await student(0,code), teacher=await connect(1);
    expect(await score(a,code,50)).toMatchObject({ok:true,score:50,totalScore:50});
    const bonus={sessionCode:code,clientId:a.identity.clientId,token:teacherToken,amount:10,requestId:randomUUID()};
    expect(await ack(teacher,E.TEACHER_BONUS,bonus)).toMatchObject({ok:true,totalScore:60});
    expect(await ack(teacher,E.TEACHER_BONUS,bonus)).toMatchObject({ok:true,totalScore:60});
    a.socket.disconnect(); const b=await student(1,code,a.identity);
    expect(b.identity).toMatchObject({acceptedScore:50,leaderboard:[{score:60}]});
    expect(await score(b,code,70)).toMatchObject({ok:true,score:70,totalScore:80});
    expect(await score(b,code,70)).toMatchObject({ok:true,score:70,totalScore:80});
    expect(JSON.stringify(b.identity.leaderboard)).not.toMatch(/reportedScore|owner|authUid/);
  });
  it('scores a server-owned Speed Round across servers without losing the next regular score',async() => {
    const code=room(), a=await student(1,code), teacher=await connect(0);
    const observed=once(teacher,S.LEADERBOARD); teacher.emit(E.TEACHER_OBSERVE,{sessionCode:code,token:teacherToken}); await observed;
    const started=once<{roundId:string}>(a.socket,S.SPEED_ROUND);
    teacher.emit(E.SPEED_START,{sessionCode:code,token:teacherToken,mode:'classic',prompt:'cat',promptKind:'text',options:['חתול','כלב'],correctIndex:0,roundSeconds:15});
    const round=await started;
    const result=once<{totalScore:number}>(a.socket,S.SPEED_RESULT);
    a.socket.emit(E.SPEED_SUBMIT,{sessionCode:code,clientId:a.identity.clientId,roundId:round.roundId,choiceIndex:0});
    const scored=await result; expect(scored.totalScore).toBeGreaterThan(0);
    expect(await score(a,code,20)).toMatchObject({ok:true,totalScore:scored.totalScore+20});
  });
  it('removes a student on the other server and rejects their signed rejoin',async() => {
    const code=room(), a=await student(1,code), teacher=await connect(0);
    const kicked=once(a.socket,S.KICKED);
    expect(await ack(teacher,E.TEACHER_KICK,{sessionCode:code,token:teacherToken,clientId:a.identity.clientId})).toMatchObject({ok:true});
    await kicked;
    const newcomer=await connect(0), denied=once<{code:string}>(newcomer,S.ERROR);
    newcomer.emit(E.STUDENT_JOIN,{sessionCode:code,clientId:a.identity.clientId,rejoinToken:a.identity.rejoinToken,nickname:'Alex'});
    expect((await denied).code).toBe('kicked');
  });
  it('freezes both servers on END failure and retries the frozen result exactly once',async() => {
    const code=room(), a=await student(0,code), b=await student(1,code), teacher=await connect(0);
    await score(a,code,30); await score(b,code,50);
    const endedA=once(a.socket,S.SESSION_ENDED), endedB=once(b.socket,S.SESSION_ENDED);
    failPersist=true;
    expect(await ack(teacher,E.TEACHER_END,{sessionCode:code,token:teacherToken})).toMatchObject({ok:false,code:'internal_error'});
    await Promise.all([endedA,endedB]); failPersist=false;
    expect((await score(b,code,99)).ok).toBe(false);
    const otherTeacher=await connect(1);
    expect(await ack(otherTeacher,E.TEACHER_END,{sessionCode:code,token:teacherToken})).toMatchObject({ok:true});
    expect(await ack(teacher,E.TEACHER_END,{sessionCode:code,token:teacherToken})).toMatchObject({ok:true});
    const rows=[...progress.values()].filter(p => p.assignment_id === sessions.get(code)?.id);
    expect(rows.map(p => p.score).sort()).toEqual([30,50]);
    expect(rows.every(p => p.play_count===1)).toBe(true);
    expect(sessions.get(code)?.is_active).toBe(false);
  });
  it('restores totals and teams after BOTH application servers restart',async() => {
    const code=room(), a=await student(0,code), b=await student(1,code), teacher=await connect(0);
    await score(a,code,90); await score(b,code,40);
    const observed=once(teacher,S.LEADERBOARD); teacher.emit(E.TEACHER_OBSERVE,{sessionCode:code,token:teacherToken}); await observed;
    const teams=once<QpLeaderboardPayload>(teacher,S.LEADERBOARD,p => p.students.every(s => !!s.team));
    teacher.emit(E.TEACHER_TEAM_MODE,{sessionCode:code,token:teacherToken,enabled:true}); await teams;
    await stop(0); await stop(1); await start(0); await start(1);
    const restored=await student(1,code,a.identity);
    expect(restored.identity.acceptedScore).toBe(90);
    expect(restored.identity.leaderboard.map(s => s.score).sort()).toEqual([40,90]);
    expect(restored.identity.leaderboard.filter(s => s.team==='red')).toHaveLength(1);
  },30000);
});
