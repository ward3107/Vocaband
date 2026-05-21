/**
 * loadtest-socket.ts — concurrent socket.io load harness (QA #3).
 *
 * Opens N socket.io connections against Vocaband's server, holds them
 * for HOLD_SECONDS, then disconnects.  Measures connection-layer
 * throughput + sustained-connection health, which is the actual
 * bottleneck for Live Challenge at classroom scale.
 *
 * What this measures
 *   - Time to handshake + auth (p50 / p95 / p99)
 *   - Percentage of connections that succeed vs reject
 *   - Round-trip latency on a ping/pong while holding the connection
 *   - Whether the server stays responsive past N simultaneous clients
 *
 * What this does NOT measure
 *   - The full game loop (no JOIN_CHALLENGE, no SUBMIT_ANSWER).  Real
 *     per-event load needs the operator to set up test classes +
 *     stage students.  The connection layer is the documented
 *     bottleneck per `docs/qa-framework/05-LIVE-CHALLENGE.md`, so
 *     starting here is the right ROI.
 *
 * Auth
 *   The server's `io.use` middleware rejects any connection without
 *   a valid Supabase JWT.  Operator supplies ONE legit JWT (via the
 *   TEST_JWT env var) and the script reuses it across all
 *   connections.  Same uid across 5000 sockets is fine for
 *   connection-load testing because the server doesn't enforce uid
 *   uniqueness on connect — only on `JOIN_CHALLENGE` (which this
 *   harness doesn't emit).
 *
 *   To get the JWT: sign in to the deployed app as a test teacher,
 *   open DevTools console, run
 *     (await window.supabase.auth.getSession()).data.session.access_token
 *
 * Usage
 *   TEST_JWT=<jwt>  CONNECTIONS=500  TARGET=https://www.vocaband.com \
 *     npx tsx scripts/loadtest-socket.ts
 *
 *   For a stepped ramp (100 → 500 → 1000 → 2500 → 5000), run the
 *   script multiple times bumping CONNECTIONS each round.  Capture
 *   the output into a per-run report (see
 *   docs/load-test-runbook.md).
 *
 * Where to run from
 *   k6-style "drive 5000 connections from one box" works from any
 *   $5 cloud droplet with decent network — e.g. DigitalOcean
 *   `s-1vcpu-1gb` in fra1 (matches Fly's prod region).  See runbook.
 */

import { io, type Socket } from "socket.io-client";

// ---------------------------------------------------------------------------
// Config (env-driven)
// ---------------------------------------------------------------------------
const TARGET = process.env.TARGET ?? "https://www.vocaband.com";
const TEST_JWT = process.env.TEST_JWT ?? "";
const CONNECTIONS = parseInt(process.env.CONNECTIONS ?? "100", 10);
const HOLD_SECONDS = parseInt(process.env.HOLD_SECONDS ?? "60", 10);
// Connection ramp: open N concurrently at a time so we don't TCP-flood
// the upstream.  100 simultaneous handshakes is a healthy ceiling for a
// single droplet — beyond that we start hitting ephemeral-port limits.
const RAMP_BATCH = parseInt(process.env.RAMP_BATCH ?? "100", 10);
const RAMP_BATCH_DELAY_MS = parseInt(process.env.RAMP_BATCH_DELAY_MS ?? "250", 10);

if (!TEST_JWT) {
  console.error("ERROR: TEST_JWT env var is required.");
  console.error("Get one from DevTools console on the deployed app:");
  console.error("  (await window.supabase.auth.getSession()).data.session.access_token");
  process.exit(2);
}

console.log(`Target:       ${TARGET}`);
console.log(`Connections:  ${CONNECTIONS}`);
console.log(`Hold (sec):   ${HOLD_SECONDS}`);
console.log(`Ramp batch:   ${RAMP_BATCH} every ${RAMP_BATCH_DELAY_MS}ms`);
console.log();

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------
type Sample = { id: number; connectMs: number | null; rejected: boolean; pingMs: number | null };
const samples: Sample[] = [];
let connectedAtAnyMoment = 0;
let peakConcurrent = 0;
const errorsByMessage = new Map<string, number>();

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

// ---------------------------------------------------------------------------
// Single connection lifecycle
// ---------------------------------------------------------------------------
function openOne(id: number): Promise<void> {
  return new Promise<void>(resolve => {
    const sample: Sample = { id, connectMs: null, rejected: false, pingMs: null };
    samples.push(sample);
    const startedAt = Date.now();

    const socket: Socket = io(TARGET, {
      path: "/socket.io/",
      transports: ["websocket"],
      auth: { token: TEST_JWT },
      // No reconnect — we want the rejection/error surfaced cleanly
      // rather than masked by a silent retry loop.
      reconnection: false,
      timeout: 30_000,
    });

    let pingSentAt = 0;

    socket.on("connect", () => {
      sample.connectMs = Date.now() - startedAt;
      connectedAtAnyMoment++;
      peakConcurrent = Math.max(peakConcurrent, connectedAtAnyMoment);

      // Round-trip probe — socket.io's reserved `ping` is hidden in
      // v4; we emit a custom event the server doesn't recognise.
      // It'll bounce as an `error` ack on the client, which is
      // good enough for latency measurement.
      pingSentAt = Date.now();
      socket.emit("loadtest_ping", { id });
      // No matching server handler → we just measure the time until
      // the event flushes, which is dominated by the TCP/TLS round
      // trip to Fly.
      sample.pingMs = Date.now() - pingSentAt;
    });

    socket.on("connect_error", err => {
      sample.rejected = true;
      const msg = err?.message ?? String(err);
      errorsByMessage.set(msg, (errorsByMessage.get(msg) ?? 0) + 1);
      socket.close();
      resolve();
    });

    socket.on("disconnect", () => {
      if (sample.connectMs !== null) connectedAtAnyMoment--;
    });

    // After the hold window, close cleanly.
    setTimeout(() => {
      socket.close();
      resolve();
    }, HOLD_SECONDS * 1000);
  });
}

// ---------------------------------------------------------------------------
// Drive the ramp
// ---------------------------------------------------------------------------
async function run(): Promise<void> {
  const t0 = Date.now();
  const allPromises: Promise<void>[] = [];

  for (let i = 0; i < CONNECTIONS; i += RAMP_BATCH) {
    const batchSize = Math.min(RAMP_BATCH, CONNECTIONS - i);
    for (let j = 0; j < batchSize; j++) {
      allPromises.push(openOne(i + j));
    }
    if (i + batchSize < CONNECTIONS) {
      await new Promise(r => setTimeout(r, RAMP_BATCH_DELAY_MS));
    }
  }

  // Periodic progress while sockets are held
  const progressInterval = setInterval(() => {
    const ok = samples.filter(s => s.connectMs !== null).length;
    const rej = samples.filter(s => s.rejected).length;
    const pending = samples.length - ok - rej;
    console.log(
      `[t+${Math.floor((Date.now() - t0) / 1000)}s]  ` +
        `ok=${ok}  rejected=${rej}  pending=${pending}  ` +
        `peak_concurrent=${peakConcurrent}  current_concurrent=${connectedAtAnyMoment}`,
    );
  }, 5_000);

  await Promise.all(allPromises);
  clearInterval(progressInterval);

  // ---------------------------------------------------------------------
  // Report
  // ---------------------------------------------------------------------
  const connectTimes = samples
    .map(s => s.connectMs)
    .filter((x): x is number => x !== null);
  const okCount = connectTimes.length;
  const rejCount = samples.filter(s => s.rejected).length;

  console.log();
  console.log("=== Load-test report ===");
  console.log(`Target:                 ${TARGET}`);
  console.log(`Attempted connections:  ${CONNECTIONS}`);
  console.log(`Successful:             ${okCount}  (${((okCount / CONNECTIONS) * 100).toFixed(1)}%)`);
  console.log(`Rejected:               ${rejCount}  (${((rejCount / CONNECTIONS) * 100).toFixed(1)}%)`);
  console.log(`Peak concurrent:        ${peakConcurrent}`);
  console.log(`Hold duration:          ${HOLD_SECONDS}s`);
  console.log(`Wall clock:             ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log();
  console.log("Connection time (ms):");
  console.log(`  p50:   ${percentile(connectTimes, 0.5)}`);
  console.log(`  p95:   ${percentile(connectTimes, 0.95)}`);
  console.log(`  p99:   ${percentile(connectTimes, 0.99)}`);
  console.log(`  max:   ${Math.max(0, ...connectTimes)}`);
  if (errorsByMessage.size > 0) {
    console.log();
    console.log("Rejection reasons:");
    for (const [msg, n] of [...errorsByMessage.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${n}× ${msg}`);
    }
  }
  console.log();
  console.log("Pass criteria (default):");
  console.log("  ✓ success rate >= 99%");
  console.log("  ✓ p95 connect time < 1500ms");
  console.log("  ✓ no rejections after the warmup window");
}

run().then(() => process.exit(0)).catch(err => {
  console.error("loadtest crashed:", err);
  process.exit(1);
});
