import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Socket as NetSocket } from 'node:net';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { io } from 'socket.io-client';
import { isLivenessRequest } from '../utils/liveness.server';

const root = fileURLToPath(new URL('../..', import.meta.url));
const redisConnections = new Set<NetSocket>();
const quotaRedis = createServer(socket => {
  redisConnections.add(socket);
  socket.once('close', () => redisConnections.delete(socket));
  socket.on('error', () => {});
  socket.end('-ERR max requests limit exceeded\r\n');
});
let child: ChildProcess | undefined;
let directory = '';
let base = '';
let output = '';

beforeAll(async () => {
  await new Promise<void>(resolve => quotaRedis.listen(0, '127.0.0.1', resolve));
  const redisPort = (quotaRedis.address() as { port: number }).port;
  const reserved = createServer();
  await new Promise<void>(resolve => reserved.listen(0, '127.0.0.1', resolve));
  const port = (reserved.address() as { port: number }).port;
  await new Promise<void>(resolve => reserved.close(() => resolve()));
  directory = await mkdtemp(join(tmpdir(), 'vocaband-quota-'));
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['--import', resolve(root, 'node_modules/tsx/dist/loader.mjs'), resolve(root, 'server.ts')], {
    cwd: directory,
    env: { PATH: process.env.PATH, NODE_ENV: 'production', PORT: String(port),
      REDIS_URL: `redis://127.0.0.1:${redisPort}`, SUPABASE_URL: 'http://127.0.0.1:1', SUPABASE_SERVICE_ROLE_KEY: 'local-test-only-secret' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', data => { output += String(data); });
  child.stderr?.on('data', data => { output += String(data); });
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try { if ((await fetch(base + '/api/health')).ok) return; } catch {}
    if (child.exitCode !== null) throw new Error(output);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`HTTP did not start under a Redis quota outage:\n${output}`);
}, 25_000);

afterAll(async () => {
  if (child && child.exitCode === null && child.signalCode === null) {
    const ended = new Promise<void>(resolve => child!.once('exit', () => resolve()));
    child.kill('SIGKILL');
    await ended;
  }
  for (const socket of redisConnections) socket.destroy();
  await new Promise<void>(resolve => quotaRedis.close(() => resolve()));
  if (directory) await rm(directory, { recursive: true, force: true });
});

describe('production with Redis refusing every command', () => {
  it('keeps Fly liveness healthy and uncached', async () => {
    for (const path of ['/api/health', '/api/health/']) {
      const response = await fetch(base + path);
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect((await response.json()).status).toBe('ok');
    }
    expect((await fetch(base + '/api/health', { method: 'HEAD' })).status).toBe(200);
  });
  it('still denies protected API requests when shared rate counters cannot be checked', async () => {
    const response = await fetch(base + '/api/features');
    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('30');
    expect((await response.text())).not.toContain('Redis');
  });
  it('can accept a WebSocket handshake without falsely confirming a game action', async () => {
    const socket = io(base + '/quick-play', { transports: ['websocket'], reconnection: false, autoConnect: false });
    try {
      await new Promise<void>((resolve, reject) => {
        socket.once('connect', resolve);
        socket.once('connect_error', reject);
        socket.connect();
      });
      expect(socket.connected).toBe(true);
    } finally { socket.disconnect(); }
  });
  it('does not exempt costly health diagnostics or non-read requests', () => {
    expect(isLivenessRequest({ method: 'GET', path: '/api/health/redis' })).toBe(false);
    expect(isLivenessRequest({ method: 'POST', path: '/api/health' })).toBe(false);
  });
});
