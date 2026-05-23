#!/usr/bin/env bash
# =============================================================================
# Security pen-test — verify the 4 audit-fix migrations are live.
#
# Usage:
#   1. Fill in SUPABASE_URL + ANON_KEY below (or pass as env vars).
#   2. chmod +x scripts/security-pen-test.sh
#   3. ./scripts/security-pen-test.sh
#
# Nothing this script does is destructive — it sends 4 anon-role
# requests that SHOULD all be rejected.  If any test FAILs, that
# migration didn't take and there's a real exploit window open.
# =============================================================================

set -u

# Optional debug: set DEBUG=1 to trace every command. Useful for
# diagnosing CI-specific failures where the local run passes but
# the GitHub-runner run fails (network, DNS, curl version, etc.).
if [[ "${DEBUG:-}" == "1" ]]; then
  set -x
fi

SUPABASE_URL="${SUPABASE_URL:-}"
ANON_KEY="${ANON_KEY:-}"

# Fallback: read from .env.local if env vars weren't set.
if [[ -z "$SUPABASE_URL" || -z "$ANON_KEY" ]]; then
  if [[ -f .env.local ]]; then
    SUPABASE_URL="${SUPABASE_URL:-$(grep -E '^VITE_SUPABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')}"
    ANON_KEY="${ANON_KEY:-$(grep -E '^VITE_SUPABASE_ANON_KEY=' .env.local | cut -d= -f2- | tr -d '"')}"
  fi
fi

if [[ -z "$SUPABASE_URL" || -z "$ANON_KEY" ]]; then
  echo "ERROR: SUPABASE_URL and ANON_KEY must be set."
  echo "  Either export them, or fill in .env.local with VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY."
  exit 1
fi

echo "Target: $SUPABASE_URL"
echo

# Auto-detect Supabase publishable-key format.  PostgREST rejects
# `sb_publishable_*` keys via raw HTTP (they're meant for use through
# `supabase-js`, which exchanges them server-side).  When CI runs us
# with the public fallback key from `src/core/supabase.ts`, the REST
# anon-probe tests would all fail with "Invalid API key" — masking the
# real RLS posture.  Detect that case and skip the REST block with a
# clear warning, so the app-server checks (10-16) and audit_log
# immutability checks (17-18) still run and catch regressions.
#
# To enable the full RLS suite in CI, add `SUPABASE_ANON_KEY` as a
# repo secret containing the JWT-format anon key (`eyJhbGc…`) from
# the Supabase dashboard → API settings → "anon public" row.
SKIP_SUPABASE_REST=
if [[ "$ANON_KEY" == sb_publishable_* ]]; then
  SKIP_SUPABASE_REST=1
  echo "⚠️  Detected Supabase publishable-format ANON_KEY."
  echo "    REST anon-probe tests (1-9) and audit_log RLS tests (17-18) will be SKIPPED."
  echo "    To enable: set ANON_KEY to the JWT-format legacy anon key from Supabase dashboard."
  echo
fi

PASS=0
FAIL=0
SKIP=0

check() {
  local name="$1"
  local expect_pattern="$2"
  local body="$3"
  if echo "$body" | grep -qE "$expect_pattern"; then
    echo "  PASS  $name"
    PASS=$((PASS+1))
  else
    echo "  FAIL  $name"
    echo "        body: $body"
    FAIL=$((FAIL+1))
  fi
}

if [[ -z "$SKIP_SUPABASE_REST" ]]; then

# ─── Test 1: anon forging another student's progress ─────────────────
echo "[1] Anon forging save_student_progress_batch"
body=$(curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/save_student_progress_batch" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_batch":[{"student_uid":"victim-uid","class_code":"ABC123","assignment_id":"00000000-0000-0000-0000-000000000000","mode":"classic","score":9999,"student_name":"hacker"}]}')
check "anon save_progress is rejected" "Authentication required|permission denied|42501|not allowed" "$body"

# ─── Test 2: anon enumerating teacher_profiles ───────────────────────
echo "[2] Anon enumerating teacher_profiles"
body=$(curl -s "$SUPABASE_URL/rest/v1/teacher_profiles?select=email,school_name" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY")
check "anon teacher_profiles returns empty" '^\[\]$' "$body"

# ─── Test 3: anon enumerating quick_play_joins ───────────────────────
echo "[3] Anon enumerating quick_play_joins"
body=$(curl -s "$SUPABASE_URL/rest/v1/quick_play_joins?select=session_code,student_name" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY")
check "anon quick_play_joins returns empty" '^\[\]$' "$body"

# ─── Test 4: anon inserting into quick_play_joins ────────────────────
echo "[4] Anon inserting into quick_play_joins"
body=$(curl -s -X POST "$SUPABASE_URL/rest/v1/quick_play_joins" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"session_code":"FAKE99","student_name":"spam"}')
check "anon insert is rejected" "row-level security|violates|permission denied|42501" "$body"

# ─── Test 5: anon enumerating Vocabagrut tests ────────────────────────
echo "[5] Anon enumerating bagrut_tests"
body=$(curl -s "$SUPABASE_URL/rest/v1/bagrut_tests?select=id" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY")
check "anon bagrut_tests returns empty" '^\[\]$' "$body"

# ─── Test 6: anon enumerating Vocabagrut responses ────────────────────
echo "[6] Anon enumerating bagrut_responses"
body=$(curl -s "$SUPABASE_URL/rest/v1/bagrut_responses?select=id" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY")
check "anon bagrut_responses returns empty" '^\[\]$' "$body"

# ─── Test 7: anon enumerating bagrut_cache (server-only) ──────────────
echo "[7] Anon enumerating bagrut_cache"
body=$(curl -s "$SUPABASE_URL/rest/v1/bagrut_cache?select=cache_key" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY")
check "anon bagrut_cache returns empty" '^\[\]$' "$body"

# ─── Test 8: anon inserting bagrut_tests ──────────────────────────────
echo "[8] Anon inserting bagrut_tests"
body=$(curl -s -X POST "$SUPABASE_URL/rest/v1/bagrut_tests" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"teacher_uid":"00000000-0000-0000-0000-000000000000","module":"B","title":"hack","source_words":["x"],"content":{}}')
check "anon bagrut_tests insert is rejected" "row-level security|violates|permission denied|42501" "$body"

# ─── Test 9: anon inserting bagrut_cache (server-only) ────────────────
echo "[9] Anon inserting bagrut_cache"
body=$(curl -s -X POST "$SUPABASE_URL/rest/v1/bagrut_cache" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"cache_key":"hack","module":"B","model":"x","content":{}}')
check "anon bagrut_cache insert is rejected" "row-level security|violates|permission denied|42501" "$body"

# ─── Test 9b: anon enumerating classes (C-3 cross-tenant fix) ─────────
# Was: classes_select USING(true) — every authenticated user could
# list every class in the database.  Migrations 20260430_hardening_
# and_perf.sql + 20260517125414_filter_anon_auth_round2.sql locked
# this down to teacher_or_own-class-or-admin AND blocked anonymous
# sessions.  Anon callers (no auth.uid()) must get an empty list —
# no class names, no codes, no teacher_uid leaks.  schema.sql baseline
# was aligned in the same audit pass so a fresh dev bootstrap starts
# in the secure state.
echo "[9b] Anon enumerating classes"
body=$(curl -s "$SUPABASE_URL/rest/v1/classes?select=id,code,name,teacher_uid" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY")
check "anon classes list returns empty" '^\[\]$' "$body"

else
  echo "[1-9b] SKIPPED (Supabase REST anon-probe tests — see warning above)"
  SKIP=$((SKIP+10))
fi

# ─── F2 — authenticated-student direct-UPDATE attacks ─────────────────
# These require a STUDENT_JWT (an authenticated session token for a
# test student account).  Without one, the section is skipped — but
# the F2 lock can still be verified via the SQL queries in the
# 20260604 migration's verification section.
#
# To run: sign in to the demo classroom as a test student, copy the
# access token from devtools (supabase.auth.getSession()), then:
#   STUDENT_JWT=<token> ./scripts/security-pen-test.sh

if [[ -n "${STUDENT_JWT:-}" ]]; then
  echo
  echo "── F2 direct-UPDATE attacks (authenticated student) ──"

  # 17. Direct xp inflation — must fail with the F2 trigger message.
  echo "[17] Authed student tries direct UPDATE users.xp = 999999"
  body=$(curl -s -X PATCH "$SUPABASE_URL/rest/v1/users?uid=eq.STUDENT_UID_PLACEHOLDER" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $STUDENT_JWT" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d '{"xp": 999999}')
  check "authed UPDATE users.xp is rejected by F2 trigger" "Direct UPDATE of users.xp is not allowed|42501" "$body"

  # 18. Direct streak inflation.
  echo "[18] Authed student tries direct UPDATE users.streak = 365"
  body=$(curl -s -X PATCH "$SUPABASE_URL/rest/v1/users?uid=eq.STUDENT_UID_PLACEHOLDER" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $STUDENT_JWT" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d '{"streak": 365}')
  check "authed UPDATE users.streak is rejected" "Direct UPDATE of users.streak is not allowed|42501" "$body"

  # 19. Direct badges inflation.
  echo "[19] Authed student tries direct UPDATE users.badges"
  body=$(curl -s -X PATCH "$SUPABASE_URL/rest/v1/users?uid=eq.STUDENT_UID_PLACEHOLDER" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $STUDENT_JWT" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d '{"badges": ["🎯 Perfect Score", "👑 Champion"]}')
  check "authed UPDATE users.badges is rejected" "Direct UPDATE of users.badges is not allowed|42501" "$body"

  # 20. Direct unlocked_avatars inflation.
  echo "[20] Authed student tries direct UPDATE users.unlocked_avatars"
  body=$(curl -s -X PATCH "$SUPABASE_URL/rest/v1/users?uid=eq.STUDENT_UID_PLACEHOLDER" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $STUDENT_JWT" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d '{"unlocked_avatars": ["🐉", "🦄"]}')
  check "authed UPDATE users.unlocked_avatars is rejected" "Direct UPDATE of users.unlocked_avatars is not allowed|42501" "$body"

  # 21. Direct power_ups inflation.
  echo "[21] Authed student tries direct UPDATE users.power_ups"
  body=$(curl -s -X PATCH "$SUPABASE_URL/rest/v1/users?uid=eq.STUDENT_UID_PLACEHOLDER" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $STUDENT_JWT" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d '{"power_ups": {"skip": 99, "fifty_fifty": 99, "reveal_letter": 99}}')
  check "authed UPDATE users.power_ups is rejected" "Direct UPDATE of users.power_ups is not allowed|42501" "$body"

  # 22. F1 regression — plan still locked.
  echo "[22] Authed student tries direct UPDATE users.plan = 'pro' (F1 regression)"
  body=$(curl -s -X PATCH "$SUPABASE_URL/rest/v1/users?uid=eq.STUDENT_UID_PLACEHOLDER" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $STUDENT_JWT" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d '{"plan": "pro", "trial_ends_at": "2099-01-01"}')
  check "authed UPDATE users.plan is still rejected (F1)" "row-level security|violates|42501" "$body"
else
  echo
  echo "── F2 / F1 authenticated tests skipped (set STUDENT_JWT to run) ──"
fi

# ─── App-server pen-tests ─────────────────────────────────────────────
# Optional: also probe the Express app server for unauthenticated info-
# disclosure regressions on /api/version, /api/ocr/status, /api/ocr/
# diagnostic. Skip the block if APP_URL isn't set.
if [[ -n "${APP_URL:-}" ]]; then
  echo
  echo "── App-server checks (APP_URL=$APP_URL) ──"

  # 10. /api/version unauth → 401
  echo "[10] Anon GET /api/version"
  status=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/api/version")
  check "anon /api/version returns 401" '^401$' "$status"

  # 11. /api/ocr/status unauth → 401
  echo "[11] Anon GET /api/ocr/status"
  status=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/api/ocr/status")
  check "anon /api/ocr/status returns 401" '^401$' "$status"

  # 12. /api/ocr/diagnostic unauth → 401
  echo "[12] Anon GET /api/ocr/diagnostic"
  status=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/api/ocr/diagnostic")
  check "anon /api/ocr/diagnostic returns 401" '^401$' "$status"

  # 13. /api/submit-bagrut unauth → 401
  echo "[13] Anon POST /api/submit-bagrut"
  status=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"test_id":"x","answers":{}}' \
    "$APP_URL/api/submit-bagrut")
  check "anon /api/submit-bagrut returns 401" '^401$' "$status"

  # 14. /api/student-bagrut/:id unauth → 401
  echo "[14] Anon GET /api/student-bagrut/x"
  status=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/api/student-bagrut/x")
  check "anon /api/student-bagrut returns 401" '^401$' "$status"

  # 15. Security headers present (HSTS, X-Frame-Options, X-Content-Type-Options)
  echo "[15] Security headers on /api/health"
  headers=$(curl -sI "$APP_URL/api/health")
  check "HSTS header present"           "[Ss]trict-[Tt]ransport-[Ss]ecurity" "$headers"
  check "X-Frame-Options header present" "[Xx]-[Ff]rame-[Oo]ptions" "$headers"
  check "X-Content-Type-Options nosniff" "[Xx]-[Cc]ontent-[Tt]ype-[Oo]ptions:.*nosniff" "$headers"

  # 16. CSP locks down inline-script + eval execution.
  # script-src must NOT contain 'unsafe-inline' or 'unsafe-eval' — this is
  # the high-value XSS-defence win. style-src-elem keeps 'unsafe-inline'
  # because motion/react injects <style> blocks for animation keyframes
  # at runtime; tracked as deferred hardening.
  echo "[16] CSP hardening on /"
  csp=$(curl -sI "$APP_URL/" | grep -i '^content-security-policy:' | tr -d '\r')
  script_directive=$(echo "$csp" | grep -oE "script-src[^;]*" | head -1)

  if echo "$script_directive" | grep -q "'unsafe-inline'"; then
    echo "  FAIL  script-src has 'unsafe-inline'"; FAIL=$((FAIL+1))
  else
    echo "  PASS  script-src has no 'unsafe-inline'"; PASS=$((PASS+1))
  fi
  if echo "$script_directive" | grep -q "'unsafe-eval'"; then
    echo "  FAIL  script-src has 'unsafe-eval'"; FAIL=$((FAIL+1))
  else
    echo "  PASS  script-src has no 'unsafe-eval'"; PASS=$((PASS+1))
  fi
fi

# ─── Audit-log immutability (Reg 2017 § 8) ────────────────────────────
# Verifies the 20260518120000 migration is live. anon should be rejected
# at the RLS layer (SELECT denied without auth.uid()), and the explicit
# UPDATE/DELETE attempts should fail even when called via PostgREST.
if [[ -n "$SKIP_SUPABASE_REST" ]]; then
  echo
  echo "[17-18] SKIPPED (audit_log RLS tests — see warning above)"
  SKIP=$((SKIP+2))
else

echo
echo "[17] Anon UPDATE public.audit_log should be rejected"
body=$(curl -s -X PATCH "$SUPABASE_URL/rest/v1/audit_log?id=eq.00000000-0000-0000-0000-000000000000" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{"action":"tampered"}')
# PostgREST returns either {"message":...} or empty body; either way it
# must not be a 2xx success. Easiest stable check: an error payload OR
# nothing changed. Use HTTP status:
status=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH \
  "$SUPABASE_URL/rest/v1/audit_log?id=eq.00000000-0000-0000-0000-000000000000" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{"action":"tampered"}')
if [[ "$status" =~ ^(401|403|404)$ ]]; then
  echo "  PASS  anon UPDATE audit_log → $status"; PASS=$((PASS+1))
else
  echo "  FAIL  anon UPDATE audit_log returned $status (expected 401/403/404)"
  FAIL=$((FAIL+1))
fi

echo "[18] Anon DELETE public.audit_log should be rejected"
status=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
  "$SUPABASE_URL/rest/v1/audit_log?id=eq.00000000-0000-0000-0000-000000000000" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY")
if [[ "$status" =~ ^(401|403|404)$ ]]; then
  echo "  PASS  anon DELETE audit_log → $status"; PASS=$((PASS+1))
else
  echo "  FAIL  anon DELETE audit_log returned $status (expected 401/403/404)"
  FAIL=$((FAIL+1))
fi

fi  # /SKIP_SUPABASE_REST guard for tests 17-18

echo
echo "Results: $PASS passed, $FAIL failed, $SKIP skipped."
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
