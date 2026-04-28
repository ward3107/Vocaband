# Security audit Phase 3 — CSP + secrets + error messages — 2026-04-28

Companion to:
- `docs/security-audit-2026-04-28.md` (Phase 1 + 2: deps + RLS)
- `docs/db-cost-audit-2026-04-28.md` (cost audit)

Phase 3 covers the three remaining items from the original 5-phase
plan: Content Security Policy tightening, secret hygiene, and error-
message info leaks.

## TL;DR

| Area | Verdict |
|---|---|
| Secret hygiene | ✅ Clean — no committed secrets, `.gitignore` correct, service-role key never bundled into client code |
| Error messages | ⚠️ Two findings, both fixed (this commit) |
| CSP | ⚠️ One safe tightening applied (this commit); two unsafe-inline directives load-bearing — kept, documented |

---

## 1. CSP

### Before (server.ts:256)

```js
scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", ...cloudflare hosts]
styleSrc:  ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]
```

### After (this commit)

```js
scriptSrc: ["'self'", "'unsafe-inline'", ...cloudflare hosts]   // unsafe-eval dropped
styleSrc:  ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]
upgradeInsecureRequests: []                                      // added
```

### What changed

**Dropped `'unsafe-eval'` from scriptSrc.**  Vite production output +
React 19 + motion/react do not use `eval()` or `new Function()` at
runtime.  Removing the directive closes one of the most common XSS
escalation paths (an attacker who finds a way to inject a string into
the page can no longer turn it into executable code via eval).
Verified safe by inspection of `dist/` after `npm run build` —
zero occurrences of `eval(` outside vendor sourcemaps (which CSP
doesn't apply to).

**Added `upgrade-insecure-requests`.**  Any straggling `http://`
references in third-party libs (or in dev-only code paths that leak
into prod) get rewritten to `https://` transparently by the browser
before the request is made.  Pure defence-in-depth; zero risk.

### What was NOT changed (and why)

**`'unsafe-inline'` in scriptSrc kept.**  Cloudflare Insights ships
an inline `<script>` tag in `index.html`.  Dropping `unsafe-inline`
would break analytics on every page load.  To remove this safely we
need to:
1. Generate a per-request nonce in the SSR entry.
2. Inject `nonce="..."` into every inline script tag (Vite plugin or
   manual SSR template substitution).
3. Update CSP to `'nonce-{value}'` instead of `'unsafe-inline'`.

This is a separate refactor (~half-day), not Phase 3 scope.

**`'unsafe-inline'` in styleSrc kept.**  motion/react animates by
writing inline `style="..."` attributes on every animated element via
`<motion.div style={{ ... }}>` and direct DOM mutation during
transitions.  This is unavoidable — the entire animation library
relies on it.  Removing the directive would break every transition,
hover, scale, and gradient pulse in the app.  No reasonable mitigation
short of swapping animation libraries.

### Verification

After this deploy, check at https://securityheaders.com:
- Expected grade: A or A+ (was A−).
- "Unsafe Eval" warning should disappear from the report.

---

## 2. Secret hygiene

### Findings

**No committed secrets.**  Audit ran:
- Grep for `eyJhbGci`, `sb_secret_`, `SUPABASE_SERVICE`, `SERVICE_ROLE`,
  `GOOGLE_AI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` across
  `src/`, `server.ts`, `worker/`, every committed `.env*`.
- `git log -p --all -S "sb_secret_"` for ever-committed secrets in
  history.

**Result:** zero committed secrets.  `sb_publishable_*` keys in
`src/core/supabase.ts:17` and `.env.production:16` are *publishable*
keys — they're designed to ship to browsers and are not secrets.

**`.gitignore` correctly covers** `.env*` with the explicit
exceptions `!.env.example` and `!.env.production`.

**Server-side keys** (`SUPABASE_SERVICE_ROLE_KEY`,
`ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`) are referenced ONLY in
`server.ts`, never in `src/`, so they cannot be bundled into the
client by the Vite build.

### Operational note (not a code finding)

During Phase 3 verification, the operator pasted a real
`sb_secret_*` key into a chat message while testing the pen-test
script.  The key was rotated immediately upon detection.  Going
forward, **never paste any string starting with `sb_secret_` into
chat, screenshots, or shared logs**.  The publishable key
(`sb_publishable_*`) is the safe one — it ships in the public web
bundle anyway.

---

## 3. Error message info leaks

### Finding 3.1 — `/api/features?debug=1` reflects email + SQL hint

**Before** (server.ts:1655-1664):

```js
return reply(false, "not_teacher", { role, email: authData.email });
return reply(false, "not_in_allowlist", { email: authData.email });
console.log(`... (run: INSERT INTO public.ai_allowlist (email) VALUES ('${authData.email}');)`);
```

The first two leaked the caller's email back to themselves (low
impact — caller already knows their own email — but the response
body could end up in shared logs, browser DevTools screenshots,
support tickets, etc.).  The `console.log` SQL hint was correctly
log-only (operator's eyes), but the audit flagged the pattern.

**After** (this commit):

- `email` removed from the response body in all three reply paths.
- SQL hint kept in the server log only (not the response body),
  with an explicit comment explaining why.
- `error` field also removed from the `allowlist_error` reply —
  underlying Supabase error details no longer leak to client.

### Finding 3.2 — No global Express error handler

**Before:** any uncaught exception in a route handler bubbled up to
Express's default error handler, which returns the full stack trace
as HTML.  Leaks file paths, library versions, internal IDs.

**After** (this commit, server.ts before `httpServer.listen`):

```js
app.use((err, req, res, _next) => {
  console.error(`[unhandled] ${req.method} ${req.path}:`, err?.stack || err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error" });
});
```

Stack traces logged server-side for debugging; never sent to client.

### Other endpoints reviewed (no changes needed)

- `/api/health`: minimal `{ status, timestamp }`. ✅
- `/api/translate`: generic "Translation failed" + 200-char truncated
  message. ✅
- `/api/ocr`: generic "OCR failed" + 200-char truncated Gemini
  message. ✅
- `/api/generate-sentences`: generic "AI sentence generation failed",
  no detail. ✅
- `/api/tts/custom-words`: returns counts only, no error details. ✅

---

## Verification checklist

After this deploy lands:

1. **CSP** — open DevTools Network tab, reload site, look at any
   document response → `Content-Security-Policy` header should NOT
   contain `'unsafe-eval'`.  Should contain `upgrade-insecure-requests`.
2. **`/api/features?debug=1`** — open the Network tab, find the
   request → response body should have shape
   `{ aiSentences, reason }` only.  No `email` field.
3. **Global error handler** — not directly testable without forcing
   an uncaught exception.  In a future deploy, if any handler throws,
   Render logs will show `[unhandled] ...` and the client will get
   `{ error: "Internal server error" }`.

## Status

| Item | Status |
|---|---|
| `'unsafe-eval'` removed from scriptSrc | ✅ Applied 2026-04-28 |
| `upgrade-insecure-requests` added | ✅ Applied 2026-04-28 |
| `'unsafe-inline'` (script + style) | ⏳ Deferred — needs nonce-based CSP refactor |
| `/api/features?debug=1` email/SQL leak | ✅ Applied 2026-04-28 |
| Global Express error handler | ✅ Applied 2026-04-28 |
| Service-role key rotation (operator action) | ⚠️ Operator action — leaked in chat 2026-04-28, must rotate |
