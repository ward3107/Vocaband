// k6 WebSocket scenario — Live Challenge stress test.
// Connects 100 concurrent socket.io-style clients, sends periodic events,
// verifies the server stays responsive.
//
// Run: k6 run scripts/loadtest/socket.js
// Pass criteria: 100 sockets connected within 30s; server replies to events within 500ms p95.

import ws from 'k6/ws';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const WS_ORIGIN = (__ENV.STAGING_ORIGIN || 'https://vocaband-staging.fly.dev')
  .replace(/^https/, 'wss');

const connectsOk    = new Counter('ws_connects_ok');
const connectsFail  = new Counter('ws_connects_fail');
const messageRTT    = new Trend('ws_message_rtt', true);

export const options = {
  scenarios: {
    sockets: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 }, // ramp to 100 sockets
        { duration: '3m',  target: 100 }, // hold
        { duration: '30s', target: 0   }, // tear down
      ],
    },
  },
  thresholds: {
    ws_connects_fail:     ['count<5'],     // < 5% of 100 sockets failing
    ws_message_rtt:       ['p(95)<500'],   // server responds within 500ms p95
  },
};

export default function () {
  // socket.io polling-then-upgrade is complex; we test raw WS endpoint here.
  // If your live-challenge uses socket.io, change to use the socket.io-client equivalent.
  const url = `${WS_ORIGIN}/socket.io/?EIO=4&transport=websocket`;

  const res = ws.connect(url, {}, (socket) => {
    socket.on('open', () => {
      connectsOk.add(1);
      // socket.io v4 handshake — '40' = CONNECT
      socket.send('40');
    });

    socket.on('message', (msg) => {
      const sentAt = socket.lastSentAt || Date.now();
      messageRTT.add(Date.now() - sentAt);

      // Periodically emit a ping-style event
      if (Math.random() < 0.1) {
        socket.lastSentAt = Date.now();
        socket.send('42["ping",{}]');
      }
    });

    socket.on('error', () => connectsFail.add(1));

    socket.setTimeout(() => socket.close(), 60000);
  });

  check(res, { 'ws status 101': (r) => r && r.status === 101 });
}
