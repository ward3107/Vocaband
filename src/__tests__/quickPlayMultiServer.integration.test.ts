import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
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
import { QP_EVENTS as E, QP_SERVER_EVENTS as S, type QpJoinedPayload, type QpLeaderboardPayload, type QpSpeedRoundPayload, type QpSpeedResultPayload, type QpRaceRoundPayload, type QpRaceResultPayload, type QpArenaStatePayload, type QpArenaGrabGrantedPayload, type QpArenaGrabDeniedPayload, QP_ARENA_BASE_POINTS } from '../core/quickPlayProtocol';

// CI supplies an isolated Redis service. Local opt-in: QP_TEST_REDIS_URL.
// HTTP fixture implements only local session lookup and idempotent finalization.
const redisUrl = process.env.QP_TEST_REDIS_URL;
const root = fileURLToPath(new URL('../..', import.meta.url));
const sockets: Socket[] = [], children: ChildProcess[] = [], rooms: string[] = [];
const bases: string[] = [];
const outputs: string[] = [];
afterEach(context => { if (context.task.result?.state === 'fail') console.error(outputs.map((log,i) => `server ${i}: ${log.slice(-6000)}`).join("\n")); });
const fixture = createServer();
const sessions = new Map<string, { id: string; teacher_uid: string; is_active: boolean }>();
const progress = new Map<string, Record<string, unknown>>();
let workdir = '', fixtureUrl = '', teacherToken = '', failPersist = false;
const redis = redisUrl ? createClient({ url: redisUrl, socket: { reconnectStrategy: false } }) : undefined;
type Ack = { ok: boolean; code?: string; score?: number; totalScore?: number };
function room() { const code = randomUUID().replaceAll('-', '').slice(0,6).toUpperCase().replaceAll('0','G').replaceAll('1','H'); rooms.push(code); return code; }
function once<T>(socket: Socket, event: string, predicate: (p:T) => boolean = () => true, timeout=5000): Promise<T> {
  return new Promise((resolveEvent, reject) => {
    const done = (data:T) => { if (!predicate(data)) return; clearTimeout(timer); socket.off(event,done); resolveEvent(data); };
    const timer = setTimeout(() => { socket.off(event,done); reject(new Error(`Timeout: ${event}`)); },timeout);
    socket.on(event,done);
  });
}
async function connect(index: number) {
  const s = io(`${bases[index]}/quick-play`, { transports:['websocket'], reconnection:false, autoConnect:false });
  sockets.push(s); const ready = once(s,'connect'); s.connect(); await ready; return s;
}
async function student(index:number, code:string, identity?:QpJoinedPayload, ready?: (s:Socket) => void) {
  const socket = await connect(index), accepted = once<QpJoinedPayload>(socket,S.JOINED);
  ready?.(socket);
  socket.emit(E.STUDENT_JOIN,{sessionCode:code,clientId:identity?.clientId ?? randomUUID(),rejoinToken:identity?.rejoinToken,nickname:'Alex'});
  return { socket, identity:await accepted };
}
function ack(socket:Socket,event:string,payload:Record<string,unknown>):Promise<Ack> {
  return new Promise((res,rej) => socket.timeout(7000).emit(event,payload,(error:Error|null,value:Ack) => error ? rej(error) : res(value)));
}
async function score(s:Awaited<ReturnType<typeof student>>,code:string,value:number) {
  return ack(s.socket,E.SCORE_UPDATE,{sessionCode:code,clientId:s.identity.clientId,score:value});
}
async function stop(index:number, signal:NodeJS.Signals='SIGTERM') {
  const child = children[index]; if (child.exitCode !== null || child.signalCode !== null) return;
  const stopped = new Promise<void>(r => child.once('exit',() => r())); child.kill(signal); await stopped;
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
  child.stdout?.on('data',d => { output += String(d); outputs[index]=output; }); child.stderr?.on('data',d => { output += String(d); outputs[index]=output; });
  await new Promise<void>((res,rej) => {
    const deadline = setTimeout(() => { clearInterval(timer); rej(new Error(output)); },20000);
    const timer = setInterval(() => {
      if (output.includes('Server running')) { clearTimeout(deadline); clearInterval(timer); res(); }
      else if (child.exitCode !== null) { clearTimeout(deadline); clearInterval(timer); rej(new Error(output)); }
    },50);
  });
}


const speedSeed = {mode:'classic',prompt:'cat',promptKind:'text',options:['חתול','כלב'],correctIndex:0};
async function observe(index:number, code:string) {
  const socket=await connect(index), observed=once(socket,S.LEADERBOARD);
  socket.emit(E.TEACHER_OBSERVE,{sessionCode:code,token:teacherToken}); await observed; return socket;
}
async function move(player:Awaited<ReturnType<typeof student>>, code:string, pos:{x:number;y:number}) {
  const moved=once<{ids:string[]}>(player.socket,S.ARENA_SNAPSHOT,p => p.ids.includes(player.identity.clientId));
  player.socket.emit(E.ARENA_MOVE,{sessionCode:code,clientId:player.identity.clientId,...pos}); await moved;
}
function grab(player:Awaited<ReturnType<typeof student>>, code:string, wordId:string) {
  return new Promise<QpArenaGrabGrantedPayload|QpArenaGrabDeniedPayload>((resolveGrab,reject) => {
    const done=(p:QpArenaGrabGrantedPayload|QpArenaGrabDeniedPayload) => {clearTimeout(timer); player.socket.off(S.ARENA_GRAB_GRANTED,done); player.socket.off(S.ARENA_GRAB_DENIED,done); resolveGrab(p);};
    const timer=setTimeout(() => reject(new Error('grab timeout')),5000);
    player.socket.once(S.ARENA_GRAB_GRANTED,done); player.socket.once(S.ARENA_GRAB_DENIED,done);
    player.socket.emit(E.ARENA_GRAB,{sessionCode:code,clientId:player.identity.clientId,wordId});
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
    const keys=rooms.flatMap(c => ['meta','players','kicked','operations','engine','positions'].map(k => `qp-state:v1:{${c}}:${k}`));
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
  it('continues an active Speed Round on the surviving server after SIGKILL, preserving winner and receipts', async () => {
    const code=room(), a=await student(0,code), b=await student(1,code), teacher=await observe(0,code);
    const started=once<QpSpeedRoundPayload>(b.socket,S.SPEED_ROUND);
    teacher.emit(E.SPEED_START,{sessionCode:code,token:teacherToken,...speedSeed,roundSeconds:30});
    const round=await started;
    const first=once<QpSpeedResultPayload>(a.socket,S.SPEED_RESULT);
    a.socket.emit(E.SPEED_SUBMIT,{sessionCode:code,clientId:a.identity.clientId,roundId:round.roundId,choiceIndex:0});
    const firstResult=await first; expect(firstResult.firstCorrect).toBe(true);
    await stop(0,'SIGKILL');
    const otherTeacher=await connect(1), resumed=once<QpSpeedRoundPayload>(otherTeacher,S.SPEED_ROUND);
    otherTeacher.emit(E.TEACHER_OBSERVE,{sessionCode:code,token:teacherToken});
    expect(await resumed).toMatchObject({roundId:round.roundId,deadlineTs:round.deadlineTs,prompt:'cat'});
    expect(JSON.stringify(round)).not.toContain('correctIndex');
    const second=once<QpSpeedResultPayload>(b.socket,S.SPEED_RESULT);
    b.socket.emit(E.SPEED_SUBMIT,{sessionCode:code,clientId:b.identity.clientId,roundId:round.roundId,choiceIndex:0});
    expect(await second).toMatchObject({correct:true,firstCorrect:false});
    await start(0);
    let receipt!:Promise<QpSpeedResultPayload>;
    const restored=await student(0,code,a.identity,s => { receipt=once(s,S.SPEED_RESULT); });
    expect(await receipt).toMatchObject({roundId:round.roundId,totalScore:firstResult.totalScore,correct:true});
    const replay=once<QpSpeedResultPayload>(restored.socket,S.SPEED_RESULT);
    restored.socket.emit(E.SPEED_SUBMIT,{sessionCode:code,clientId:a.identity.clientId,roundId:round.roundId,choiceIndex:1});
    expect(await replay).toMatchObject({totalScore:firstResult.totalScore,correct:true});
    expect(await score(restored,code,0)).toMatchObject({totalScore:firstResult.totalScore});
  },30000);

  it('restores Category Race after both processes are killed and lets a teacher on another server end it', async () => {
    const code=room(), a=await student(0,code), teacher=await observe(0,code);
    const started=once<QpRaceRoundPayload>(a.socket,S.RACE_ROUND);
    teacher.emit(E.RACE_START,{sessionCode:code,token:teacherToken,categories:['animal'],roundSeconds:60});
    const round=await started;
    await Promise.all([stop(0,'SIGKILL'),stop(1,'SIGKILL')]);
    await start(0); await start(1);
    let resumed!:Promise<QpRaceRoundPayload>;
    const restored=await student(1,code,a.identity,s => { resumed=once(s,S.RACE_ROUND); });
    expect(await resumed).toMatchObject({roundId:round.roundId,letter:round.letter,deadlineTs:round.deadlineTs,categories:['animal']});
    const extra=await student(0,code);
    const result=once<QpRaceResultPayload>(restored.socket,S.RACE_RESULT);
    restored.socket.emit(E.RACE_SUBMIT,{sessionCode:code,clientId:a.identity.clientId,roundId:round.roundId,answers:{animal:`${round.letter}at`}});
    expect((await result).roundPoints).toBeGreaterThan(0);
    const otherTeacher=await observe(0,code), ended=once(extra.socket,S.RACE_ENDED);
    otherTeacher.emit(E.RACE_END_ROUND,{sessionCode:code,token:teacherToken,roundId:round.roundId});
    await ended;
    // An explicit close is authoritative even before the original deadline.
    let lateResult=false; extra.socket.once(S.RACE_RESULT,() => { lateResult=true; });
    extra.socket.emit(E.RACE_SUBMIT,{sessionCode:code,clientId:extra.identity.clientId,roundId:round.roundId,answers:{animal:`${round.letter}at`}});
    await new Promise(r => setTimeout(r,300));
    expect(lateResult).toBe(false); expect(await score(extra,code,0)).toMatchObject({totalScore:0});
  },30000);

  it('keeps an arena lock and double-points pickup across total process loss, with only one cross-server grab winner', async () => {
    const code=room(), a=await student(0,code), b=await student(1,code), teacher=await observe(0,code);
    const started=once<QpArenaStatePayload>(a.socket,S.ARENA_STATE);
    teacher.emit(E.ARENA_START,{sessionCode:code,token:teacherToken,words:[{...speedSeed,label:'cat'},{...speedSeed,prompt:'dog',label:'dog'}],config:{roundSeconds:30}});
    const arena=await started;
    expect(JSON.stringify(arena)).not.toMatch(/correctIndex|optionCount/);
    const double=arena.pickups.find(p => p.kind==='double')!;
    await move(a,code,double.pos);
    const collected=once(a.socket,S.ARENA_PICKUP_GONE);
    a.socket.emit(E.ARENA_PICKUP,{sessionCode:code,clientId:a.identity.clientId,pickupId:double.pickupId}); await collected;
    const word=arena.words[0]; await move(a,code,word.pos); await move(b,code,word.pos);
    const grabs=await Promise.all([grab(a,code,word.wordId),grab(b,code,word.wordId)]);
    expect(grabs.filter(g => 'roundId' in g)).toHaveLength(1);
    const winner='roundId' in grabs[0] ? a : b;
    const granted=grabs.find(g => 'roundId' in g) as QpArenaGrabGrantedPayload;
    await Promise.all([stop(0,'SIGKILL'),stop(1,'SIGKILL')]); await start(0); await start(1);
    let resumed!:Promise<QpArenaGrabGrantedPayload>, map!:Promise<QpArenaStatePayload>;
    const restored=await student(1,code,winner.identity,s => { resumed=once(s,S.ARENA_GRAB_GRANTED); map=once(s,S.ARENA_STATE); });
    expect(await resumed).toMatchObject({roundId:granted.roundId,deadlineTs:granted.deadlineTs,options:speedSeed.options});
    expect((await map).words.find(w => w.wordId===word.wordId)).toMatchObject({state:'locked',lockedBy:winner.identity.clientId});
    const answered=once<QpSpeedResultPayload>(restored.socket,S.SPEED_RESULT);
    restored.socket.emit(E.SPEED_SUBMIT,{sessionCode:code,clientId:winner.identity.clientId,roundId:granted.roundId,choiceIndex:0});
    const result=await answered;
    expect(result.roundPoints).toBe(QP_ARENA_BASE_POINTS*(winner===a?2:1));
    const replay=once<QpSpeedResultPayload>(restored.socket,S.SPEED_RESULT);
    restored.socket.emit(E.SPEED_SUBMIT,{sessionCode:code,clientId:winner.identity.clientId,roundId:granted.roundId,choiceIndex:0});
    expect((await replay).totalScore).toBe(result.totalScore);
  },30000);

  it('advances a persisted deadline on a surviving server without a teacher browser', async () => {
    const code=room(), a=await student(1,code), teacher=await observe(0,code);
    const started=once<QpSpeedRoundPayload>(a.socket,S.SPEED_ROUND);
    teacher.emit(E.SPEED_START,{sessionCode:code,token:teacherToken,...speedSeed,roundSeconds:3});
    const round=await started, ended=once<{roundId:string;correctIndex:number}>(a.socket,S.SPEED_ENDED,() => true,10000);
    await stop(0,'SIGKILL');
    expect(await ended).toMatchObject({roundId:round.roundId,correctIndex:0});
    await start(0);
  },35000);

  it('finishes queued results after the teacher disconnects and both application servers crash', async () => {
    const code=room(), a=await student(0,code), teacher=await observe(0,code);
    await score(a,code,77); failPersist=true;
    expect(await ack(teacher,E.TEACHER_END,{sessionCode:code,token:teacherToken})).toMatchObject({ok:false});
    teacher.disconnect(); a.socket.disconnect();
    expect(await redis!.ttl(`qp-state:v1:{${code}}:players`)).toBe(-1);
    await Promise.all([stop(0,'SIGKILL'),stop(1,'SIGKILL')]);
    failPersist=false; await start(0); await start(1);
    await expect.poll(() => sessions.get(code)?.is_active,{timeout:10000}).toBe(false);
    const rows=[...progress.values()].filter(p => p.assignment_id===sessions.get(code)?.id);
    expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({score:77,play_count:1});
    expect(await redis!.ttl(`qp-state:v1:{${code}}:players`)).toBeGreaterThan(0);
  },30000);

  it('commits sixty simultaneous classroom answers across two servers without losing or duplicating awards', async () => {
    const code=room(), players=await Promise.all(Array.from({length:60},(_,i) => student(i%2,code))), teacher=await observe(0,code);
    const rounds=players.map(p => once<QpSpeedRoundPayload>(p.socket,S.SPEED_ROUND));
    teacher.emit(E.SPEED_START,{sessionCode:code,token:teacherToken,...speedSeed,roundSeconds:30});
    const [round]=await Promise.all(rounds);
    const results=players.map(p => once<QpSpeedResultPayload>(p.socket,S.SPEED_RESULT,() => true,15000));
    players.forEach(p => p.socket.emit(E.SPEED_SUBMIT,{sessionCode:code,clientId:p.identity.clientId,roundId:round.roundId,choiceIndex:0}));
    const scored=await Promise.all(results);
    expect(scored.filter(p => p.firstCorrect)).toHaveLength(1);
    expect(scored.every(p => p.correct && p.totalScore>0)).toBe(true);
    const final=await redis!.hVals(`qp-state:v1:{${code}}:players`);
    expect(final).toHaveLength(60);
    expect(final.map(raw => JSON.parse(raw).score).sort()).toEqual(scored.map(p => p.totalScore).sort());
    players.forEach(p => p.socket.disconnect()); teacher.disconnect();
  },30000);

});
