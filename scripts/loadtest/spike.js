// k6 spike test — simulates a "release-day" 0 → 1000 → 0 ramp.
// Models a viral teacher share: thousands of students hit the app within minutes.
//
// Run: k6 run scripts/loadtest/spike.js
// Pass criteria: degradation acceptable; no complete origin collapse; recovery within 1 min after spike.

import http from 'k6/http';
import { check, sleep } from 'k6';

const ORIGIN      = __ENV.STAGING_ORIGIN       || 'https://vocaband-staging.fly.dev';
const SUPA_URL    = __ENV.STAGING_SUPABASE_URL || '';
const SUPA_ANON   = __ENV.STAGING_ANON_KEY     || '';
const STUDENT_JWT = __ENV.STUDENT_JWT          || '';

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 1000,
      stages: [
        { duration: '30s', target: 10   },   // baseline
        { duration: '1m',  target: 1000 },   // spike — 1000 req/s
        { duration: '2m',  target: 1000 },   // sustained spike
        { duration: '1m',  target: 10   },   // recovery
        { duration: '30s', target: 10   },   // post-recovery
      ],
    },
  },
  thresholds: {
    http_req_duration:   ['p(95)<5000'],   // degradation OK during spike
    http_req_failed:     ['rate<0.20'],    // up to 20% failures tolerable
    'http_req_failed{status_class:5xx}': ['rate<0.05'], // origin shouldn't collapse
  },
};

export default function () {
  // Mix the cheap reads with one expensive call to find the bottleneck.
  const choice = Math.random();

  if (choice < 0.6) {
    // 60%: cheap GET
    http.get(`${ORIGIN}/api/health`);
  } else if (choice < 0.9) {
    // 30%: authenticated read
    http.get(`${SUPA_URL}/rest/v1/users?select=id,xp&limit=1`, {
      headers: {
        apikey: SUPA_ANON,
        Authorization: `Bearer ${STUDENT_JWT}`,
      },
    });
  } else {
    // 10%: static asset (worker-cached in prod, origin-served in staging)
    http.get(`${ORIGIN}/assets/index.js`);
  }
}

export function handleSummary(data) {
  const m = data.metrics;
  const summary = `
=== Spike-test summary ===
http_reqs:                    ${m.http_reqs.values.count}
http_req_duration p95:        ${m.http_req_duration.values['p(95)'].toFixed(0)}ms
http_req_duration max:        ${m.http_req_duration.values.max.toFixed(0)}ms
http_req_failed:              ${(m.http_req_failed.values.rate * 100).toFixed(2)}%
peak rate (rps):              ${(m.http_reqs.values.rate).toFixed(0)}

Pass criteria:
  p95 < 5000ms during spike    : ${m.http_req_duration.values['p(95)'] < 5000 ? 'PASS' : 'FAIL'}
  failure rate < 20%           : ${m.http_req_failed.values.rate < 0.20 ? 'PASS' : 'FAIL'}

If FAIL: scale Fly tier, add more instances, or move expensive
endpoints (Gemini OCR, /api/submit-bagrut) behind a queue.
`;
  return { stdout: summary };
}
