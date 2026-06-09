// k6 — "full classroom" Category Race / Quick Play load test.
//
// WHY THIS EXISTS
//   socket.js opens N idle sockets; this models a REAL class: every
//   student joins the SAME session code, then — the worst case for the
//   server — they all submit their answers inside the same ~2s window
//   when the round timer ends (a thundering herd of RACE_SUBMITs hitting
//   server.ts scoring + the leaderboard broadcaster at once). That burst
//   is what falls over in production if anything is going to.
//
//   Each virtual student also auto-plays: it listens for the RACE_ROUND
//   broadcast, waits a randomized "thinking" delay, then submits, so a
//   teacher only has to start rounds — the load drives itself.
//
// RUN (staging only — will trip Cloudflare WAF against prod):
//   1. On staging, a teacher opens a Category Race and notes the 6-char
//      session code (or create one via the create_quick_play_session RPC
//      with allowed_modes = ['category-race']).
//   2. k6 run \
//        -e STAGING_ORIGIN=https://vocaband-staging.fly.dev \
//        -e SESSION_CODE=ABCDEF \
//        -e STUDENTS=200 \
//        scripts/loadtest/classroom-race.js
//   3. With the room joined, start rounds from the teacher device; watch
//      the metrics below.
//
// PASS CRITERIA (thresholds)
//   * <2% of joins fail
//   * JOINED ack p95 < 1.5s   (students see the lobby quickly)
//   * RACE_RESULT p95 < 2s    (scoring keeps up with the submit burst)

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

const ORIGIN = __ENV.STAGING_ORIGIN || 'https://vocaband-staging.fly.dev';
const WS_ORIGIN = ORIGIN.replace(/^http/, 'ws');
const SESSION_CODE = __ENV.SESSION_CODE || '';
const STUDENTS = parseInt(__ENV.STUDENTS || '200', 10);
const NS = '/quick-play';

const joinsOk = new Counter('qp_joins_ok');
const joinsFail = new Counter('qp_joins_fail');
const joinLatency = new Trend('qp_join_latency_ms', true);
const submitRtt = new Trend('qp_submit_result_rtt_ms', true);
const leaderboardSeen = new Counter('qp_leaderboard_msgs');
const errorRate = new Rate('qp_error_rate');

export const options = {
  scenarios: {
    classroom: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: STUDENTS }, // everyone scans the QR within 20s
        { duration: '4m', target: STUDENTS },  // hold a full lesson of rounds
        { duration: '15s', target: 0 },        // class ends
      ],
      gracefulStop: '10s',
    },
  },
  thresholds: {
    qp_joins_fail: ['count<' + Math.ceil(STUDENTS * 0.02)],
    qp_join_latency_ms: ['p(95)<1500'],
    qp_submit_result_rtt_ms: ['p(95)<2000'],
    qp_error_rate: ['rate<0.05'],
  },
};

// Minimal UUID v4 (k6 has no crypto.randomUUID) so clientId passes the
// server's isValidClientId regex.
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// A word-shaped answer that starts with the rolled letter — always valid
// under the open-validation model, so every submit scores and the full
// scoring path is exercised.
function answerFor(letter) {
  return (letter || 'a').toLowerCase() + 'ana';
}

export default function () {
  if (!SESSION_CODE) {
    throw new Error('Set -e SESSION_CODE=<6-char race session code from staging>');
  }

  const clientId = uuid();
  const url = `${WS_ORIGIN}/socket.io/?EIO=4&transport=websocket`;
  let joinSentAt = 0;
  let submitSentAt = 0;
  let currentRoundId = null;

  const res = ws.connect(url, {}, (socket) => {
    socket.on('open', () => {
      // engine.io: server sends "0{...}" open frame; we connect to the
      // /quick-play namespace, then emit STUDENT_JOIN.
      socket.send('40' + NS + ',');
    });

    socket.on('message', (raw) => {
      // ── engine.io control frames ──
      if (raw === '2') { socket.send('3'); return; }       // ping → pong
      if (raw[0] === '0') return;                           // open handshake

      // ── namespace connect ack: "40/quick-play,{sid}" → now JOIN ──
      if (raw.indexOf('40' + NS) === 0) {
        joinSentAt = Date.now();
        socket.send(
          '42' + NS + ',' + JSON.stringify(['qp:student:join', {
            sessionCode: SESSION_CODE,
            clientId,
            nickname: 'Student' + __VU,
            avatar: '🦊',
          }]),
        );
        return;
      }

      // ── socket.io EVENT frames: "42/quick-play,[\"name\",payload]" ──
      if (raw.indexOf('42' + NS) === 0) {
        const json = raw.slice(raw.indexOf('[')); // strip "42/quick-play,"
        let evt;
        try { evt = JSON.parse(json); } catch (_) { return; }
        const [name, payload] = evt;

        if (name === 'qp:joined') {
          joinLatency.add(Date.now() - joinSentAt);
          joinsOk.add(1);
          check(payload, { 'joined echoes clientId': (p) => p && p.clientId === clientId });
        } else if (name === 'qp:leaderboard') {
          leaderboardSeen.add(1);
        } else if (name === 'qp:race:round') {
          // A new round — answer after a randomized think time, all
          // students converging on the same deadline = the submit burst.
          currentRoundId = payload.roundId;
          const cats = payload.categories || [];
          const answers = {};
          for (const c of cats) answers[c] = answerFor(payload.letter);
          const think = 0.5 + Math.random() * 2.5; // 0.5–3s
          sleep(think);
          submitSentAt = Date.now();
          socket.send(
            '42' + NS + ',' + JSON.stringify(['qp:student:race:submit', {
              sessionCode: SESSION_CODE,
              clientId,
              roundId: currentRoundId,
              answers,
            }]),
          );
        } else if (name === 'qp:race:result') {
          submitRtt.add(Date.now() - submitSentAt);
        } else if (name === 'qp:error') {
          errorRate.add(1);
          joinsFail.add(1);
        }
      }
    });

    socket.on('error', () => { joinsFail.add(1); errorRate.add(1); });

    // Stay connected for the lesson; the message handler drives play.
    socket.setTimeout(() => socket.close(), 270000);
  });

  check(res, { 'ws status 101': (r) => r && r.status === 101 });
}
