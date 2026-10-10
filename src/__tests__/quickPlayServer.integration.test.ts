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
import { QP_EVENTS as E, QP_SERVER_EVENTS as S, type QpJoinedPayload } from '../core/quickPlayProtocol';

// Real Express/Socket.IO server with an isolated local Supabase fixture.
// No production credentials, data, databases or endpoints are used.
const root = fileURLToPath(new URL('../..', import.meta.url));
const sockets: Socket[] = [];
let child: ChildProcess;
let workdir = '';
let base = '';
let studentToken = '';
let serverOutput = '';
const fixture = createServer();

function once<T>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolveEvent, reject) => {
    const done = (data: T) => { clearTimeout(timeout); resolveEvent(data); };
    const timeout = setTimeout(() => { socket.off(event, done); reject(new Error(`Timeout: ${event}\n${serverOutput.slice(-2000)}`)); }, 5000);
    socket.once(event, done);
  });
}
async function connect(token?: string) {
  const socket = io(`${base}/quick-play`, { transports: ['websocket'], reconnection: false, autoConnect: false, auth: { token } });
  sockets.push(socket);
  const ready = once(socket, 'connect');
  socket.connect();
  await ready;
  return socket;
}
async function joinStudent(socket: Socket, sessionCode: string, identity?: QpJoinedPayload, nickname = 'Alex') {
  const accepted = once<QpJoinedPayload>(socket, S.JOINED);
  socket.emit(E.STUDENT_JOIN, { sessionCode, clientId: identity?.clientId ?? randomUUID(), rejoinToken: identity?.rejoinToken, nickname });
  return accepted;
}

beforeAll(async () => {
  const { privateKey, publicKey } = await generateKeyPair('ES256');
  const jwk = { ...await exportJWK(publicKey), kid: 'local-test-key', alg: 'ES256', use: 'sig' };
  studentToken = await new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid: jwk.kid })
    .setSubject('test-student-account').setAudience('authenticated').setExpirationTime('10m').sign(privateKey);
  fixture.on('request', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url?.includes('/.well-known/jwks.json')) return res.end(JSON.stringify({ keys: [jwk] }));
    if (req.url?.startsWith('/rest/v1/quick_play_sessions')) return res.end(JSON.stringify({ is_active: true, teacher_uid: 'test-teacher' }));
    return res.end('[]');
  });
  await new Promise<void>(r => fixture.listen(0, '127.0.0.1', r));
  const fixtureAddress = fixture.address();
  if (!fixtureAddress || typeof fixtureAddress === 'string') throw new Error('No fixture port');
  const portProbe = createServer();
  await new Promise<void>(r => portProbe.listen(0, '127.0.0.1', r));
  const address = portProbe.address();
  if (!address || typeof address === 'string') throw new Error('No server port');
  await new Promise<void>(r => portProbe.close(() => r()));
  base = `http://127.0.0.1:${address.port}`;
  workdir = await mkdtemp(join(tmpdir(), 'vocaband-integration-'));
  child = spawn(process.execPath, ['--import', resolve(root, 'node_modules/tsx/dist/loader.mjs'), resolve(root, 'server.ts')], {
    cwd: workdir,
    env: { PATH: process.env.PATH, NODE_ENV: 'production', PORT: String(address.port), SUPABASE_URL: `http://127.0.0.1:${fixtureAddress.port}`, SUPABASE_SERVICE_ROLE_KEY: 'local-test-only-secret' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', data => { serverOutput += String(data); });
  child.stderr?.on('data', data => { serverOutput += String(data); });
  await new Promise<void>((ready, reject) => {
    const deadline = setTimeout(() => { clearInterval(timer); reject(new Error(serverOutput)); }, 20000);
    const timer = setInterval(() => {
      if (serverOutput.includes('Server running')) { clearTimeout(deadline); clearInterval(timer); ready(); }
      else if (child.exitCode !== null) { clearTimeout(deadline); clearInterval(timer); reject(new Error(serverOutput)); }
    }, 50);
  });
}, 25000);

afterAll(async () => {
  for (const socket of sockets) socket.disconnect();
  if (child && child.exitCode === null) {
    const exited = new Promise<void>(r => child.once('exit', () => r()));
    child.kill('SIGTERM');
    await exited;
  }
  await new Promise<void>(r => fixture.close(() => r()));
  if (workdir) await rm(workdir, { recursive: true, force: true });
}, 15000);

describe('real Quick Play server', () => {
  it('keeps two same-name students separate and returns only public fields', async () => {
    const a = await connect(studentToken), b = await connect();
    const first = await joinStudent(a, 'ABC234');
    const second = await joinStudent(b, 'ABC234');
    expect(first.clientId).not.toBe(second.clientId);
    expect(second.leaderboard).toHaveLength(2);
    expect(JSON.stringify(second.leaderboard)).not.toContain('authUid');
    expect(JSON.stringify(second.leaderboard)).not.toContain('test-student-account');
    expect(JSON.stringify(second.leaderboard)).not.toContain('rejoinToken');
  });
  it('restores score with a valid private rejoin proof', async () => {
    const a = await connect();
    const identity = await joinStudent(a, 'BCD234');
    const board = once<{ students: { score: number }[] }>(a, S.LEADERBOARD);
    a.emit(E.SCORE_UPDATE, { sessionCode: 'BCD234', clientId: identity.clientId, score: 30 });
    expect((await board).students[0].score).toBe(30);
    a.disconnect();
    const b = await connect();
    const restored = await joinStudent(b, 'BCD234', identity);
    expect(restored.clientId).toBe(identity.clientId);
    expect(restored.leaderboard[0].score).toBe(30);
  });
  it('does not grant a known ID to a caller without proof, even on first join', async () => {
    const a = await connect(), b = await connect();
    const identity = await joinStudent(a, 'CDE234');
    const attempted = await joinStudent(b, 'CDE234', { ...identity, rejoinToken: undefined });
    expect(attempted.clientId).not.toBe(identity.clientId);
  });
  it('accepts a wheel answer without a client-supplied ID and stamps its owner', async () => {
    const a = await connect();
    const identity = await joinStudent(a, 'GHJ234');
    const answer = once<{ clientId: string; choiceIndex: number }>(a, S.WHEEL_ANSWER);
    a.emit(E.WHEEL_ANSWER, { sessionCode: 'GHJ234', askId: 'question-1', choiceIndex: 2 });
    expect(await answer).toMatchObject({ clientId: identity.clientId, choiceIndex: 2 });
  });
  it('reuses the same identity when a JOINED reply is retried on the same socket', async () => {
    const a = await connect();
    const requestedId = randomUUID();
    const payload = { sessionCode: 'HKL234', clientId: requestedId, nickname: 'Alex' };
    const first = once<QpJoinedPayload>(a, S.JOINED);
    a.emit(E.STUDENT_JOIN, payload);
    const accepted = await first;
    const second = once<QpJoinedPayload>(a, S.JOINED);
    a.emit(E.STUDENT_JOIN, payload);
    expect((await second).clientId).toBe(accepted.clientId);
  });
  it('admits 60 students in a join wave and reconnects them without duplicate rows', async () => {
    const classroom = await Promise.all(Array.from({ length: 60 }, () => connect()));
    const identities = await Promise.all(classroom.map(socket => joinStudent(socket, 'JKL234')));
    expect(new Set(identities.map(p => p.clientId)).size).toBe(60);
    expect(Math.max(...identities.map(p => p.leaderboard.length))).toBe(60);
    classroom.forEach(socket => socket.disconnect());
    const replacements = await Promise.all(Array.from({ length: 60 }, () => connect()));
    const rejoined = await Promise.all(replacements.map((socket, i) => joinStudent(socket, 'JKL234', identities[i])));
    expect(rejoined.map(p => p.clientId)).toEqual(identities.map(p => p.clientId));
    expect(rejoined.every(p => p.leaderboard.length === 60)).toBe(true);
    replacements.forEach(socket => socket.disconnect());
  }, 15000);
  it('rejects use of a signed-in student credential by a guest', async () => {
    const a = await connect(studentToken), b = await connect();
    const identity = await joinStudent(a, 'DEF234');
    const error = once<{ code: string }>(b, S.ERROR);
    b.emit(E.STUDENT_JOIN, { sessionCode: 'DEF234', clientId: identity.clientId, rejoinToken: identity.rejoinToken, nickname: 'Alex' });
    expect((await error).code).toBe('unauthorized');
  });
  it.each([E.SCORE_UPDATE, E.REACTION_SEND, E.STUDENT_LEAVE, E.STUDENT_RAISE_HAND, E.TEAM_SWITCH, E.WHEEL_ANSWER, E.RACE_SUBMIT, E.SPEED_SUBMIT, E.ARENA_MOVE, E.ARENA_GRAB, E.ARENA_PICKUP, E.ARENA_TACKLE])('blocks cross-player action %s before the handler', async event => {
    const a = await connect(), b = await connect();
    const victim = await joinStudent(a, 'EFG234', undefined, 'Sam');
    await joinStudent(b, 'EFG234', undefined, 'Kim');
    const error = once<{ code: string; event: string }>(b, S.ERROR);
    b.emit(event, { sessionCode: 'EFG234', clientId: victim.clientId, studentUid: victim.clientId, score: 99, x: 100, y: 100 });
    expect(await error).toMatchObject({ event, code: 'unauthorized' });
  });
});
