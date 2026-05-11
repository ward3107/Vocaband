// k6 smoke test — verifies the harness + JWTs + origin reachability.
// Runs in ~1 minute with 1 VU. If this fails, fix it before running heavier scenarios.
//
// Run: k6 run scripts/loadtest/smoke.js
// Env required: STAGING_ORIGIN, STUDENT_JWT, TEACHER_JWT, STAGING_SUPABASE_URL, STAGING_ANON_KEY

import http from 'k6/http';
import { check, sleep } from 'k6';

const ORIGIN        = __ENV.STAGING_ORIGIN        || 'https://vocaband-staging.fly.dev';
const SUPA_URL      = __ENV.STAGING_SUPABASE_URL  || '';
const SUPA_ANON     = __ENV.STAGING_ANON_KEY      || '';
const STUDENT_JWT   = __ENV.STUDENT_JWT           || '';
const TEACHER_JWT   = __ENV.TEACHER_JWT           || '';

export const options = {
  vus: 1,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed:   ['rate<0.01'],
    checks:            ['rate>0.99'],
  },
};

export default function () {
  // 1) Health check — should return 200 from Express
  const health = http.get(`${ORIGIN}/api/health`);
  check(health, { 'health 200': (r) => r.status === 200 });

  // 2) Authenticated student read via Supabase REST — RLS should allow
  if (SUPA_URL && STUDENT_JWT) {
    const me = http.get(`${SUPA_URL}/rest/v1/users?select=id,xp&limit=1`, {
      headers: {
        apikey: SUPA_ANON,
        Authorization: `Bearer ${STUDENT_JWT}`,
      },
    });
    check(me, {
      'student read 200': (r) => r.status === 200,
      'student read returns array': (r) => Array.isArray(r.json()),
    });
  }

  // 3) Authenticated teacher read — class list
  if (SUPA_URL && TEACHER_JWT) {
    const classes = http.get(`${SUPA_URL}/rest/v1/classes?select=id,name&limit=5`, {
      headers: {
        apikey: SUPA_ANON,
        Authorization: `Bearer ${TEACHER_JWT}`,
      },
    });
    check(classes, { 'teacher read 200': (r) => r.status === 200 });
  }

  // 4) Anon caller hitting a gated endpoint — should be 401
  const gated = http.get(`${ORIGIN}/api/version`);
  check(gated, { 'anon /api/version is 401': (r) => r.status === 401 });

  sleep(1);
}
