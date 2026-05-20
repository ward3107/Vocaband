# 05 — Quick Play (Anonymous Surface)

> The most-exposed surface: anyone with a 4-char code can connect.
> Designed to be open (school-classroom QR join), so the threat model
> is "abuse" more than "compromise".

---

## 1. Security maturity assessment

| Category | Current level | Risk | Severity | Confidence |
|---|---|---|---|---|
| Session-code entropy | MODERATE — 4 chars (~1.6M states) | Medium | MODERATE | HIGH |
| Anon JWT lifecycle | GOOD — pg_cron cleanup at 30 days | Low | LOW | HIGH |
| Public session-lookup RLS bypass | MODERATE — service role used, intentionally; only minimal fields returned | Medium | MODERATE | HIGH |
| Anon namespace event auth (`TEACHER_*` events) | NEEDS RE-VERIFY — events live on the unauthenticated namespace; each handler must re-check teacher identity | Medium-High | HIGH | MEDIUM |
| Student kick / bonus abuse | MODERATE — limited to game-state damage, no PII at risk | Medium | LOW | MEDIUM |
| QR poster scraping | LOW — codes are short-lived, session-bound | Low | LOW | HIGH |
| Score-tampering economic impact | NONE — Quick Play does not award XP / shop items | Low | INFO | HIGH |

**Overall:** MODERATE (64/100). The score is held down by the
length-4 session code combined with the service-role bypass: a botnet
can sweep the space in minutes. Mitigations are simple and shipping
should not block on this, but the next sprint should close it.

---

## 2. Attack surface mapping

| Surface | Auth required | Notes |
|---|---|---|
| QR/code join (student → `/quickplay/<code>`) | none (anon JWT minted) | server.ts:925 — `STUDENT_JOIN` |
| `GET /api/quick-play/session/:code` | none, service role | server.ts:2262 |
| Socket `/quick-play` namespace | none for student events | server.ts:769 |
| Socket teacher events on same namespace | should be teacher-only | server.ts:1225-1330 |

The "should" in the last row is the heart of this module.

---

## 3. Offensive analysis

### A. Session code brute force

**Goal.** Find a live session and join as a fake student.

**Mechanics.**
- 4-char code, alphanumeric ⇒ 36⁴ ≈ 1.68M states.
- Public lookup rate-limited at 60/min/IP (server.ts:2255-2261).
- Sweep at 60/min/IP from 100 IPs = 6000/min ≈ 28000s ≈ 8h for full
  sweep. With a residential proxy network: 30min.
- Live sessions are sparse; the attacker is hitting noise mostly.
- **Hit cost to attacker:** 8h × $30 botnet/h = $240 for a sweep.
- **Hit value:** disrupt one classroom (≤30 minutes of game time).

**Verdict.** Economic incentive is weak today, but **future revenue
(XP-bearing classes, branded brackets) will raise the value**.

**Mitigation roadmap.**
1. **Cheap & immediate:** extend codes to 6 chars (~2.2B states; sweep
   becomes infeasible without prior knowledge).
2. Add a per-IP **failure-rate** ceiling on `/api/quick-play/session/:code`
   (e.g. 95% 404 in 5min → block).
3. Add Cloudflare WAF "managed challenge" on >5 unique-code probes/min
   per IP.

### B. Anon-namespace event misuse (the high-severity one)

`server.ts:1247-1330` defines teacher events on the **anon namespace**:
- `TEACHER_KICK` — eject a student from the lobby
- `TEACHER_BONUS` — grant points
- `TEACHER_END` — end the session
- `TEACHER_OBSERVE` — read leaderboard

If these handlers trust the `payload` for teacher identity (e.g.,
`payload.teacherUid`) without independently verifying the connection
is a teacher's, an attacker who knows a live session code + a real
teacher's UID can impersonate the teacher.

Status: from the grep, each handler is bound by name; we did **not**
read the full implementation. **Action P0:** confirm each
`QP_EVENTS.TEACHER_*` handler invokes a guard like:

```ts
async function isTeacherOf(payload) {
  // 1. Verify Bearer-token-issued JWT carried in socket.handshake.auth
  // 2. Look up session.hostUid; assert equality with verified uid
}
```

If this is missing, the fix is a 30-line patch — but it's the single
biggest residual risk in the platform.

### C. Anonymous-user enumeration

`supabase.auth.signInAnonymously()` mints `auth.users` rows. A scripted
attacker can create 100k anon users in a few hours.

**Existing mitigation.** `cleanup_stale_anon_users()` cron job at 30
days (`20260429_anon_user_cleanup_cron.sql`). Bounds growth.

**Missing mitigation.** No real-time abuse signal — by the time the
cron job runs, the operator has paid for a month of bloat.

**Recommendation.** Cloudflare WAF rule on the Supabase auth endpoint
domain — if you can't WAF auth.vocaband.com directly (Supabase manages
it), add a Worker-level pre-flight that throttles `signInAnonymously`
intent at the SPA → Supabase boundary (rate-limit the JS call client-
side, log to Sentry server-side via a beacon).

### D. Joiner-name abuse

The student-supplied "name" on `STUDENT_JOIN` (server.ts:925) flows to
the leaderboard and to the teacher's UI. Slur / phishing / impersonation
("MR PRINCIPAL") possible. **Mitigation:** a profanity filter +
character-length cap. Did not find one in code; verify and add.

### E. Score-update spoofing

The student client emits `SCORE_UPDATE` (server.ts:1056). No
zero-knowledge proof of play. **Acceptable** — Quick Play has no
economic stakes; this is a known design choice.

### F. Stale resume hint

`src/components/QuickPlayResumeBanner.tsx` reads a `STORAGE_KEY` from
localStorage and offers to resume. On a **shared classroom device**,
the next student sees the previous student's session hint.
**Impact:** discloses the previous session's code (already public on
the teacher's screen). Acceptable.

---

## 4. Blue-team controls

| Control | Status | Recommendation |
|---|---|---|
| Service role used only for QP session lookup | ✅ | keep narrow |
| Code length ≥4 | ✅ | **extend to 6** |
| Per-IP rate limit on `/api/quick-play/session/:code` | ✅ 60/min | tighten to 30/min, add 95%-404 ban |
| Anon-user cleanup at 30d | ✅ | — |
| Joiner name profanity / length filter | ❌ | add `bad-words` (English/Hebrew/Arabic) + 30-char cap |
| Teacher-event guard on anon namespace | ❓ | **audit + add `requireTeacherForSession` if missing** |
| WAF on `auth.vocaband.com/signup` | ❌ | Cloudflare rule |
| Per-session leaderboard cap (max joiners) | partial | confirm hard cap in `STUDENT_JOIN` handler |

---

## 5. Testing strategy

| Test | Auto? |
|---|---|
| Code-sweep brute force | Manual (use staging only, with permission) |
| Teacher impersonation via crafted `TEACHER_KICK` payload | Manual + scripted socket-client |
| Joiner name with HTML/scripts ends up escaped in teacher UI | Auto (Playwright) |
| Joiner name >100 chars rejected | Auto |
| `signInAnonymously` flood, observe cleanup | Manual on staging |

---

## 6. Monitoring + detection

| Signal | Alert | Tier |
|---|---|---|
| `/api/quick-play/session/:code` 404 rate >50% in 5min | brute-force in progress | P1 |
| Anon-user creation rate >100/min | flood | P1 |
| Joiner-name profanity-filter hits | top-N report | P3 |
| `TEACHER_*` event from a non-teacher socket | should be zero | P0 |
| Quick Play session abandoned >10x average | abuse pattern | P3 |

---

## 7. Incident response

- **Code sweep detected:** flip WAF to "managed challenge" for the
  source ASN; rotate every active code (force teachers to regenerate);
  publish a status banner.
- **Teacher impersonation:** disable Quick Play feature flag (`VITE_*`
  in `.env.production`); investigate which sessions were affected;
  notify affected teachers; restore after fix.
- **Anon flood:** scale Supabase compute temporarily; let cleanup catch
  up; root-cause the WAF rule that should have caught it.

---

## 8. Edge cases

- **Two students with same name.** Allowed by design; teacher
  disambiguates by initials. UI must render the second one without
  collision; spot-check.
- **Student joins, network drops, reconnects mid-game.** Resume-hint
  in localStorage; new socket connection re-uses the same anon JWT.
  Test under flaky-network in Playwright.
- **Teacher kicks student → student rejoins instantly.** Need a short
  cooldown per (sessionCode, userUid) — verify exists.
- **Session ends, code reused.** Codes should not be re-issued
  immediately; document the policy.

---

## 9. KPIs

| KPI | Healthy | Warning | Critical |
|---|---|---|---|
| QP session code 404 rate | <10% | 10-50% | >50% (brute-force) |
| Avg joiners / session | 5-30 (single class) | 30-200 | >200 (suspicious) |
| Anon users created / day | <2k | 2-10k | >10k |
| `TEACHER_*` events from anon socket | 0 | — | ≥1 (impersonation alert) |

---

## 10. Self-critique

- The single highest residual risk in the system is whether
  `TEACHER_*` events on the anon namespace re-verify teacher identity.
  We **inferred** the structure from grep but did not read all the
  handler bodies. **Operator action P0:** confirm with a 15-minute
  pair-walk.
- The 4-char code was a UX choice (typeable from a poster) — extending
  to 6 is a UX trade. Soft alternative: keep 4 but require a 6-char
  word **plus** the code for `TEACHER_*` events.
- Quick Play deliberately stores no PII — confirm that no future change
  starts storing real student names + emails on this surface.
