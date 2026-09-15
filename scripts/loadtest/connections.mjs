import { io } from 'socket.io-client';
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';

export function configuration(env = process.env) {
  const integer = (name, fallback, min, max) => {
    const n = Number(env[name] ?? fallback);
    if (!Number.isInteger(n) || n < min || n > max) throw new Error(`Invalid ${name}`);
    return n;
  };
  if (!env.TARGET) throw new Error('TARGET is required; use an isolated staging origin');
  const target = new URL(env.TARGET);
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.search || target.hash || target.pathname !== '/') throw new Error('TARGET must be an HTTP(S) origin');
  if (/(^|\.)vocaband\.com$/i.test(target.hostname.replace(/\.$/, ''))) throw new Error('Production target is not allowed');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname);
  if (!local && env.STAGING_ORIGIN !== target.origin) throw new Error('STAGING_ORIGIN must match the reviewed target origin');
  if (!env.TEST_JWT) throw new Error('TEST_JWT is required');
  return { target: target.origin, token: env.TEST_JWT,
    connections: integer('CONNECTIONS', 10, 1, 10000),
    holdMs: integer('HOLD_SECONDS', 60, 1, 3600) * 1000,
    batch: integer('RAMP_BATCH', 10, 1, 100),
    rampDelayMs: integer('RAMP_BATCH_DELAY_MS', 250, 1, 60000),
    timeoutMs: integer('CONNECT_TIMEOUT_MS', 15000, 100, 60000),
    maxP95Ms: integer('MAX_P95_MS', 1500, 1, 60000) };
}

export async function runConnections(config) {
  const sockets = [];
  const times = [];
  const transportTimes = [];
  const authenticationTimes = [];
  let current = 0, peak = 0, rejected = 0, drops = 0, closing = false;
  let minHeld = Infinity, holding = false;
  const started = performance.now();
  const lag = monitorEventLoopDelay({ resolution: 20 });
  lag.enable();
  const open = () => new Promise(resolve => {
    const start = performance.now();
    const socket = io(config.target, { autoConnect: false, forceNew: true,
      transports: ['websocket'], auth: { token: config.token },
      agent: config.agent, reconnection: false, timeout: config.timeoutMs });
    sockets.push(socket);
    let transportOpened;
    socket.io.once('open', () => { transportOpened = performance.now(); });
    let settled = false, counted = false;
    const settle = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      if (ok) {
        const connectedAt = performance.now();
        times.push(connectedAt - start);
        if (transportOpened !== undefined) {
          transportTimes.push(transportOpened - start);
          authenticationTimes.push(connectedAt - transportOpened);
        }
        counted = true;
        current++;
        peak = Math.max(peak, current);
      } else { rejected++; socket.disconnect(); }
      resolve();
    };
    const deadline = setTimeout(() => settle(false), config.timeoutMs);
    socket.once('connect', () => settle(true));
    socket.once('connect_error', () => settle(false));
    socket.on('disconnect', () => {
      if (counted) {
        counted = false;
        current--;
        if (!closing) drops++;
        if (holding) minHeld = Math.min(minHeld, current);
      }
    });
    socket.connect();
  });
  try {
    const pending = [];
    for (let i = 0; i < config.connections; i++) {
      pending.push(open());
      if ((i + 1) % config.batch === 0 && i + 1 < config.connections) await delay(config.rampDelayMs);
    }
    await Promise.all(pending);
    holding = true;
    minHeld = current;
    await delay(config.holdMs);
    const sorted = times.sort((a,b) => a-b);
    const percentile = p => sorted.length ? sorted[Math.ceil(sorted.length * p) - 1] : null;
    const p95 = percentile(.95);
    const checks = {
      connectionSuccess: times.length / config.connections >= .99,
      sustainedConcurrency: minHeld / config.connections >= .99,
      connectLatency: p95 !== null && p95 < config.maxP95Ms,
      noUnexpectedDisconnects: drops === 0,
    };
    return { scope: 'connection-only; not distinct students or gameplay',
      target: config.target, attempted: config.connections, connected: times.length,
      rejected, unexpectedDisconnects: drops, peakConcurrent: peak,
      minimumConcurrentDuringHold: minHeld, holdSeconds: config.holdMs / 1000,
      durationSeconds: (performance.now()-started)/1000,
      connectMs: { p50: percentile(.5), p95, p99: percentile(.99) },
      connectionPhasesMs: {
        transport: summarize(transportTimes),
        namespaceAuthentication: summarize(authenticationTimes),
      },
      driver: { eventLoopP99Ms: lag.percentile(99)/1e6, rssBytes: process.memoryUsage().rss },
      checks, pass: Object.values(checks).every(Boolean) };
  } finally {
    closing = true;
    for (const socket of sockets) socket.disconnect();
    lag.disable();
  }
}

function summarize(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = p => sorted.length ? sorted[Math.ceil(sorted.length * p) - 1] : null;
  return { count: sorted.length, p50: percentile(.5), p95: percentile(.95), p99: percentile(.99) };
}
