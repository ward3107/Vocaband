# 09 — Client / Browser Security

> React 19 + Vite SPA. The XSS firewall is React itself; CSP is the
> belt; localStorage is the residual exposure.

---

## 1. Security maturity assessment

| Category | Current level | Risk | Severity | Confidence |
|---|---|---|---|---|
| React XSS auto-escape | HARDENED — default JSX | Low | INFO | HIGH |
| `dangerouslySetInnerHTML` usage | MINIMAL — one site (WorksheetShareCard QR) | Low | INFO | HIGH |
| CSP `script-src` | HARDENED — no `unsafe-inline`/`unsafe-eval` (Phase 6) | Low | INFO | HIGH |
| CSP `style-src-elem` | MODERATE — `unsafe-inline` kept for motion/react | Medium | LOW | HIGH |
| `frame-ancestors` | HARDENED — `'none'` | Low | INFO | HIGH |
| CSRF posture | GOOD — token-in-header, not cookie | Low | INFO | HIGH |
| localStorage token storage | MODERATE — XSS-readable; tradeoff of PKCE OAuth | Medium | LOW | HIGH |
| localStorage PII | LOW — only "remember email" + UI prefs | Low | LOW | HIGH |
| Service worker (PWA) | GOOD — `/sw.js` served from server.ts:3149; verify scope tight | Low | LOW | MEDIUM |
| Clickjacking | HARDENED — `frame-ancestors 'none'` | Low | INFO | HIGH |
| Cookie hygiene | NOT APPLICABLE — no app cookies; auth via Bearer | Low | INFO | HIGH |
| Third-party script footprint | MINIMAL — Cloudflare Insights only | Low | LOW | HIGH |
| Source-map exposure | NEEDS VERIFY | Low | LOW | LOW |

**Overall:** GOOD (78/100).

---

## 2. Attack surface mapping

| Surface | Notes |
|---|---|
| `localStorage` (Supabase session) | PKCE code_verifier + access_token + refresh_token |
| `localStorage` (`REMEMBER_EMAIL_KEY`) | teacher email plaintext (TeacherLoginCard.tsx:50) |
| `localStorage` (`vocaband_ui_scale`, others) | preferences, no PII |
| `dangerouslySetInnerHTML` (WorksheetShareCard.tsx:150) | QR SVG markup, self-generated |
| Service worker | offline cache; can intercept fetches |
| Cloudflare Insights script (CSP-allowed origin) | first-party script-src allowlist |
| Google OAuth popup origin | CSP `formAction https://accounts.google.com` |

---

## 3. Offensive analysis

### A. XSS

**Reflected.** No server-side HTML rendering of user input — JSON
APIs only. **Not vulnerable.**

**DOM.** Grep for `innerHTML`, `eval`, `new Function` — only the QR
SVG dangerously-set found (safe; locally generated).

**Stored.** Teacher-supplied content (custom words, assignment titles,
class names) reaches the DOM via React JSX. React auto-escapes. **Not
vulnerable** in the default render path.

**Worksheet/PDF path.** Module 07 flagged: confirm AI-output → PDF/Word
templates escape.

### B. CSP bypass

`style-src-elem 'unsafe-inline'` is kept for motion/react animations.
This permits inline `<style>` blocks. **Exploit path:** stored-XSS via
a missed escape would still trip `script-src` (denied). The
`unsafe-inline` style cannot escalate to JS execution. **Acceptable
tradeoff**, but track removal (nonce-based CSP).

### C. CSRF

All authenticated requests carry `Authorization: Bearer <jwt>`. No
auth cookies. SameSite-cookie attacks irrelevant. **Not vulnerable.**

### D. Clickjacking

`frame-ancestors 'none'` (server.ts:390) — denied. **Not vulnerable.**

### E. localStorage token theft

The PKCE flow requires `code_verifier` in `localStorage` (referenced
in `src/main.tsx:215`). Once exchanged, the SDK stores access +
refresh tokens. A successful XSS could exfiltrate both.

**Mitigation depth.**
- CSP `script-src 'self' + allowlist` blocks inline injection.
- React escaping blocks injection from teacher content.
- The QR SVG `dangerouslySetInnerHTML` is the only XSS sink and
  receives self-generated SVG (zero attacker control).

**Residual risk:** a future ESM dependency with a stored XSS would
slip through. Defence: keep `script-src` tight + monitor CSP-report
violations (currently no report-uri — **add one**).

### F. Service-worker hijack

`/sw.js` served from `server.ts:3149`. The SW's scope is implicit
from its URL. If the SW caches arbitrary URLs without integrity, an
attacker on the same origin (via XSS) could poison the cache. **Verify
SW source:** confirm it's a Vite-generated PWA SW with `precacheManifest`
+ revision hashes (not a hand-rolled `caches.put(arbitraryUrl)`).

### G. localStorage email leak on shared device

Teacher email persisted under `REMEMBER_EMAIL_KEY` (TeacherLoginCard.tsx
:106). On a school's shared device, the next user sees the previous
teacher's email pre-filled. **Mitigation:** add a "Don't remember"
default + a "Sign out everywhere" affordance. Severity: LOW (it's an
email, not a password).

### H. Source-map / build-artifact exposure

Vite production builds default to no source maps. **Verify**
`vite.config.ts` doesn't set `sourcemap: true` for prod; if it does,
strip in CI before deploy.

### I. Third-party script supply-chain

Only `static.cloudflareinsights.com` is allowlisted (server.ts:382-
383). Cloudflare's beacon is reasonably trustworthy; treat as a
dependency in the supply-chain audit.

---

## 4. Blue-team controls

| Control | Status | Priority |
|---|---|---|
| CSP `script-src` minimal | ✅ | — |
| `frame-ancestors 'none'` | ✅ | — |
| Permissions-Policy locked down | ✅ | — |
| HSTS preload | ✅ | — |
| `dangerouslySetInnerHTML` lint guard | ❌ | P2 — eslint rule |
| CSP `report-uri` | ❌ | P1 — point to a Sentry or custom endpoint |
| Service-worker scope audit | ❌ | P2 |
| Remove `REMEMBER_EMAIL_KEY` default-on | ❌ | P3 |
| Source-map strip in CI | ❓ | verify |

---

## 5. Testing strategy

| Test | Auto? |
|---|---|
| CSP delivered on every HTML response | Auto |
| CSP-violations report to Sentry | Auto (after report-uri added) |
| No `dangerouslySetInnerHTML` outside allowlist | Auto (eslint custom rule) |
| `localStorage` doesn't contain PII beyond email + prefs | Auto (test harness reads) |
| Service worker scope `/` | Auto |
| HSTS preload check at hstspreload.org | Manual |

---

## 6. Architecture review

- **React's escape-by-default + tight CSP = belt + braces.** Preserve.
- Use a `useDangerouslySetInnerHTML` lint rule with an allowlist
  comment requirement.
- PWA SW should be regenerated by Vite — don't hand-roll.

---

## 7. Monitoring + detection

| Signal | Alert | Tier |
|---|---|---|
| CSP violation reports > baseline | injection attempt or third-party change | P2 |
| Sentry: errors mentioning `localStorage is null` (private mode) | UX | P3 |
| ServiceWorker registration failure rate > 5% | rollout regression | P2 |

---

## 8. Incident response

- **CSP violations spike:** identify offending directive + source URL
  in Sentry; either patch the offending code or tighten the directive.
- **Suspected client-side malware injected via XSS:** rotate JWT secret
  (revokes all tokens), force re-login, audit the user's audit_log
  trail.

---

## 9. Edge cases

- **Private mode / no localStorage:** Supabase falls back to memory
  storage; session ends on tab close. UX message exists.
- **iOS storage eviction after 7 days:** known Safari behaviour;
  triggers re-login. Acceptable.
- **Extension-injected content:** out of scope (browser sandboxing).

---

## 10. KPIs

| KPI | Healthy | Warning | Critical |
|---|---|---|---|
| CSP violation rate | <10/day | 10-100/day | >100/day |
| Sentry client errors | <0.5%/session | 0.5-2% | >2% |
| PWA install success rate | >80% | 50-80% | <50% |

---

## 11. Self-critique

- We did not enumerate every component for hidden `innerHTML` writes
  beyond the grep we ran. A custom eslint rule would catch future
  additions.
- We did not benchmark the cost of removing `style-src-elem 'unsafe-
  inline'` — motion/react replacement is non-trivial; treat as a
  multi-week workstream.
