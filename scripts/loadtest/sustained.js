// k6 sustained-load — simulates 200 students playing during a class.
// Mix: progress writes (heavy), reads (light), word-pack fetches (CDN-cached).
//
// Run: k6 run scripts/loadtest/sustained.js
// Pass criteria: p95 < 1500ms, 5xx rate < 1%, error rate < 5%.

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

const ORIGIN      = __ENV.STAGING_ORIGIN       || 'https://vocaband-staging.fly.dev';
const SUPA_URL    = __ENV.STAGING_SUPABASE_URL || '';
const SUPA_ANON   = __ENV.STAGING_ANON_KEY     || '';
const STUDENT_JWT = __ENV.STUDENT_JWT          || '';

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    classroom: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50  },   // first wave logs in
        { duration: '1m', target: 200 },   // bell rings — everyone joins
        { duration: '5m', target: 200 },   // 5 min of active play
        { duration: '2m', target: 0   },   // class ends, stream out
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration:   ['p(95)<1500'],
    http_req_failed:     ['rate<0.05'],
    'http_req_failed{status_class:5xx}': ['rate<0.01'],
    errors:              ['rate<0.05'],
  },
};

const auth = () => ({
  apikey: SUPA_ANON,
  Authorization: `Bearer ${STUDENT_JWT}`,
  'Content-Type': 'application/json',
});

export default function () {
  group('student read — XP + progress', () => {
    const r = http.get(
      `${SUPA_URL}/rest/v1/users?select=id,xp,streak_days&limit=1`,
      { headers: auth() }
    );
    const ok = check(r, { 'progress read 200': (rr) => rr.status === 200 });
    errorRate.add(!ok);
  });

  sleep(0.5);

  group('write progress — save_student_progress RPC', () => {
    // Calls the auth-gated SECURITY DEFINER RPC. Real shape from save_student_progress.
    const r = http.post(
      `${SUPA_URL}/rest/v1/rpc/save_student_progress`,
      JSON.stringify({
        p_class_code: 'STG-LOAD',
        p_student_name: `loadtest-vu-${__VU}`,
        p_assignment_id: '00000000-0000-0000-0000-000000000001',
        p_game_mode: 'flashcards',
        p_score: Math.floor(Math.random() * 100),
        p_word: 'apple',
        p_word_indices: [0, 1, 2],
        p_session_id: `vu-${__VU}-${__ITER}`,
        p_metadata: {},
      }),
      { headers: auth() }
    );
    const ok = check(r, {
      'progress write accepted': (rr) => rr.status === 200 || rr.status === 204,
    });
    errorRate.add(!ok);
  });

  sleep(Math.random() * 2 + 1); // 1-3s between actions — student think-time

  group('static asset — vocabulary chunk', () => {
    // Cloudflare-cached in prod; in staging it hits the origin.
    const r = http.get(`${ORIGIN}/assets/vocabulary-chunk.js`, {
      tags: { name: 'static_asset' },
    });
    check(r, { 'static 200 or 304': (rr) => rr.status === 200 || rr.status === 304 });
  });

  sleep(Math.random() * 3 + 2); // 2-5s before next loop
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data),
    'scripts/loadtest/results-sustained.json': JSON.stringify(data, null, 2),
  };
}

// minimal textSummary so we don't pull in the k6 chai library
function textSummary(data) {
  const m = data.metrics;
  return `
=== Sustained-load summary ===
http_reqs:         ${m.http_reqs.values.count}
http_req_duration p95: ${m.http_req_duration.values['p(95)'].toFixed(0)}ms
http_req_failed:   ${(m.http_req_failed.values.rate * 100).toFixed(2)}%
errors:            ${(m.errors ? m.errors.values.rate * 100 : 0).toFixed(2)}%
data_received:     ${(m.data_received.values.count / 1024 / 1024).toFixed(2)} MB
data_sent:         ${(m.data_sent.values.count / 1024 / 1024).toFixed(2)} MB
`;
}
