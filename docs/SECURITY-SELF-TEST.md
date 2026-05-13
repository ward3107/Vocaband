# Vocaband — Security Self-Test Checklist

> **Audience:** Vocaband owner running owner-authorized tests on production.
> **Goal:** Validate every claim made on the school deck (GDPR, WCAG 2.0 AA, TLS 1.2+, CSP A+, RLS, audit log) with hard evidence before any school deployment.
> **Tools:** **100 % free**. No commercial licenses required.
> **Time estimate:** ~6 working hours total, spread across multiple sessions.

---

## How to use this document

1. Run the tests **in order**. Earlier tests are quicker and surface low-hanging issues fast.
2. For every test, copy the result (terminal output, screenshot, grade, or "no findings") into the **Results Log** at the bottom of this file — *or* paste it back in chat and I'll log it for you.
3. I'll review each result and either mark it PASS or open a ticket / patch the code to fix it.
4. **Don't run any test on a third party's domain.** Every test below targets `vocaband.com`, `auth.vocaband.com`, or `*.fly.dev` — domains you own.
5. **Never run rate-limit / DoS / brute-force tests against live production unless explicitly noted.** Use the local dev server or a Fly.io preview environment for those.

---

## What to send back after each test

Use this format so I can act on it without re-asking:

```
TEST #: <number + name>
DATE: <today's date>
RESULT: <PASS / FAIL / NEEDS REVIEW>
EVIDENCE:
  <paste terminal output, grade, screenshot link, or short note>
NOTES:
  <anything weird you noticed>
```

If the tool produced a report file (HTML, JSON), save it under `security-reports/<date>-<test-name>.html` and tell me the path. Don't paste the whole file in chat.

---

## Targets (your three attack surfaces)

| Surface | Host | Tech |
|---|---|---|
| Public web app | `www.vocaband.com` | Cloudflare Worker → static SPA |
| API + WebSocket | `www.vocaband.com/api/*` and `/socket.io/*` (proxied to Fly) | Fly.io Express + socket.io |
| Auth + DB | `auth.vocaband.com` and `*.supabase.co` | Supabase (Postgres + RLS + Storage) |

When a test says **TARGET: WEB**, use the first. **TARGET: API**, use the second. **TARGET: DB**, use Supabase.

---

# Section A — Network, TLS and Headers (5 tests)

## Test 1 — TLS / SSL grade
**What it checks:** Whether your HTTPS configuration is strong enough. Are you on TLS 1.2 / 1.3, no weak ciphers, valid certificate chain.
**Why it matters:** You claim "TLS 1.2+" on the school deck. We need a public, signed grade to back that up.
**Tool:** SSL Labs (Qualys) — https://www.ssllabs.com/ssltest/
**Cost:** Free.
**Run:**
1. Open https://www.ssllabs.com/ssltest/
2. Enter `www.vocaband.com` → check "Do not show the results on the boards" → **Submit**.
3. Wait ~2 minutes. Repeat for `auth.vocaband.com`.
**PASS:** Overall grade **A** or **A+**. TLS 1.0 / 1.1 disabled. No `RC4`, `3DES`, or `EXPORT` ciphers. Cert valid, hostname match, no chain issues.
**FAIL:** Anything **B** or below. Any "deprecated TLS version supported." Cert about to expire (<30 days).
**Send back:** The overall grade letter for both hosts, plus screenshot of the summary panel.

---

## Test 2 — Security headers grade
**What it checks:** Whether the response headers protect against XSS, clickjacking, MIME sniffing, mixed content. Specifically: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
**Why it matters:** You claim "CSP A+" on the deck. This is the test that produces that grade.
**Tool:** securityheaders.com — https://securityheaders.com/
**Cost:** Free.
**Run:**
1. Open https://securityheaders.com/
2. Enter `https://www.vocaband.com` → check "Hide results" → **Scan**.
**PASS:** Grade **A** or **A+**. CSP present and not `unsafe-inline` / `unsafe-eval` everywhere. HSTS set with `max-age >= 15552000` and `includeSubDomains`.
**FAIL:** Grade **B** or below. Missing CSP, missing HSTS, or HSTS with `max-age` < ~6 months.
**Send back:** Grade + the "Missing Headers" list it shows.

---

## Test 3 — Mozilla Observatory (deeper header analysis)
**What it checks:** Same area as Test 2 but with more nuance: cookie security flags, CORS policy, redirection sanity, subresource integrity.
**Tool:** Mozilla HTTP Observatory — https://observatory.mozilla.org/
**Cost:** Free.
**Run:**
1. Open https://observatory.mozilla.org/
2. Enter `www.vocaband.com` → check "Don't include my site in the public results" → **Scan**.
**PASS:** Grade **A** or **A+**. Score ≥ 90/100.
**FAIL:** Grade B or lower. Score < 75.
**Send back:** Grade, score, and a screenshot of the "Test Scores" table.

---

## Test 4 — Local TLS deep scan (testssl.sh)
**What it checks:** Same as Test 1, but it runs on your laptop so you can scan internal Fly.io and Supabase hosts too. Catches Heartbleed, ROBOT, BEAST, padding-oracle, weak DH parameters.
**Tool:** testssl.sh — https://testssl.sh/
**Cost:** Free (open source).
**Install (macOS):**
```bash
brew install testssl
```
**Install (Linux):**
```bash
git clone --depth 1 https://github.com/drwetter/testssl.sh.git
cd testssl.sh
```
**Run:**
```bash
./testssl.sh --severity HIGH www.vocaband.com
./testssl.sh --severity HIGH auth.vocaband.com
./testssl.sh --severity HIGH <your-fly-app>.fly.dev
```
**PASS:** No HIGH or CRITICAL severity findings. "Not vulnerable" for every CVE listed.
**FAIL:** Any vulnerable result on a named CVE (Heartbleed, ROBOT, FREAK, LOGJAM, DROWN, BEAST, BREACH).
**Send back:** The "Testing vulnerabilities" section output, or the full log file if it's short.

---

## Test 5 — DNS, DMARC, SPF
**What it checks:** Whether your domain has SPF/DKIM/DMARC so attackers can't easily spoof emails *from* `@vocaband.com`. Also DNSSEC and CAA records.
**Why it matters:** Schools will receive notification emails. If your DMARC is missing, a phishing email *from* "Vocaband" lands in their inbox with no warning.
**Tool:** MXToolbox SuperTool — https://mxtoolbox.com/SuperTool.aspx
**Cost:** Free.
**Run:**
1. Open the SuperTool. For each of these, enter `vocaband.com` and pick the matching check:
   - **SPF Record Lookup**
   - **DKIM Lookup** (key selector — try `google._domainkey` if you use Google Workspace)
   - **DMARC Lookup**
   - **DNSSEC Check**
   - **CAA Lookup**
**PASS:**
- SPF exists and ends with `~all` or `-all` (not `+all`)
- DKIM record returned for at least one selector
- DMARC record exists with `p=quarantine` or `p=reject` (not `p=none`)
- DNSSEC: signed and validating
- CAA: lists exactly your CAs (letsencrypt.org / google trust services / etc.)
**FAIL:** SPF missing or `+all`. DMARC missing or `p=none` after a few weeks of monitoring. DNSSEC unsigned. CAA missing.
**Send back:** A screenshot of each result, or the raw text of every record.

---

# Section B — Web Application Vulnerabilities (5 tests)

## Test 6 — OWASP ZAP automated scan (the big one)
**What it checks:** Most OWASP Top 10 issues — XSS, SQLi, open redirects, missing CSRF tokens, info disclosure, insecure cookies, unsafe headers, mixed content.
**Why it matters:** This is the single most valuable automated DAST. Spend ~30 minutes setting it up; it saves days of manual probing.
**Tool:** OWASP ZAP — https://www.zaproxy.org/download/
**Cost:** Free (open source).
**Install:**
1. Download installer for your OS from the page above.
2. Install. Open ZAP. Choose "No, I do not want to persist this session."
**Run (Automated Scan — easiest):**
1. In ZAP's main panel, click **Automated Scan**.
2. URL: `https://www.vocaband.com`
3. Check "Use traditional spider" and "Use ajax spider".
4. Click **Attack**. Wait 20–60 minutes.
**PASS:** Zero **High** alerts. ≤ 2 **Medium** alerts (and they're things like "missing security header X" which Test 2/3 already covered).
**FAIL:** Any High alert. Any "SQL Injection," "Cross-Site Scripting (Reflected/Stored/DOM)," "Path Traversal," "Remote OS Command Injection."
**Send back:** **File → Report → Generate HTML report.** Save as `security-reports/<date>-zap.html` and tell me the path. Also paste the count of High / Medium / Low / Informational alerts.

> ⚠️ **Don't run the active scan against the API while real users are on the site.** Do it after-hours, or against a Fly.io preview deploy.

---

## Test 7 — Manual XSS smoke test
**What it checks:** Whether any input field (assignment name, custom-word list, class name, student display name, chat) reflects user input back without escaping.
**Why it matters:** A stored XSS in a class name would mean every kid who joins the class gets JavaScript injected. Catastrophic for a kids' app.
**Tool:** Your browser. No installation.
**Run:** Try pasting each of these strings into every text input on the site (class name, assignment name, custom word, student name, search, chat).
```
<script>alert('xss-1')</script>
"><script>alert('xss-2')</script>
<img src=x onerror=alert('xss-3')>
<svg/onload=alert('xss-4')>
javascript:alert('xss-5')
```
**PASS:** All five strings appear as **literal text** in the page (escaped). No popup. No console error suggesting code execution.
**FAIL:** Any popup. Or the text shows as a working hyperlink / image / element instead of as text.
**Send back:** For each input you tested, the input field name + the result (escaped / popup). A 10-row list is fine.

---

## Test 8 — CSRF on state-changing endpoints
**What it checks:** Whether your API requires a token / SameSite-cookie protection. If not, a malicious site could trick a logged-in teacher into deleting their class.
**Why it matters:** Teachers stay logged in for hours. Hostile pages (ads, malware) can submit forms to your endpoints on their behalf.
**Tool:** `curl` from the terminal.
**Run:**
1. Log into vocaband.com in your browser.
2. Open DevTools → Application → Cookies. Find the Supabase auth cookie. Copy its name and value.
3. Pick a destructive endpoint — e.g. `DELETE /api/classes/<id>` (replace with the real route).
4. From a *different* origin (e.g. localhost), try:
```bash
curl -X DELETE 'https://www.vocaband.com/api/classes/<id>' \
  -H 'Cookie: sb-access-token=<paste>' \
  -H 'Origin: https://evil.example' \
  -v
```
**PASS:** Server returns **401**, **403**, or **CORS preflight rejection**.
**FAIL:** Server returns **200** and actually deletes the class.
**Send back:** The HTTP status code returned and the response body.

---

## Test 9 — Nikto (web server misconfig scanner)
**What it checks:** Default files, exposed `.env`, leftover `phpinfo.php`, dangerous HTTP methods (TRACE / PUT / DELETE), exposed `.git`, exposed admin paths.
**Tool:** Nikto — https://github.com/sullo/nikto
**Cost:** Free.
**Install (macOS):**
```bash
brew install nikto
```
**Install (Linux):**
```bash
sudo apt install nikto   # Debian/Ubuntu
```
**Run:**
```bash
nikto -h https://www.vocaband.com -o nikto-report.txt
```
**PASS:** No OSVDB findings flagged High / Critical. No `.git` directory exposed. No `.env` exposed. No directory listing enabled.
**FAIL:** Any of: `.git/HEAD` accessible, `/.env` accessible, `/admin/` accessible without auth, `TRACE` method allowed, server banner reveals exact version of a vulnerable package.
**Send back:** The contents of `nikto-report.txt` if short, or the "+ " lines (the findings) only.

---

## Test 10 — Subdomain takeover scan
**What it checks:** Whether any DNS record points at a service (Heroku, S3, GitHub Pages) that you no longer own. Attacker can claim that service and host content on *your* subdomain.
**Why it matters:** `lab.vocaband.com` pointing at a dead Vercel project = anyone can register the project and serve malware that the browser trusts as Vocaband.
**Tool:** subjack — https://github.com/haccer/subjack
**Cost:** Free.
**Install:**
```bash
go install github.com/haccer/subjack@latest
```
(or grab a release binary from the GitHub page)
**Get your subdomain list first** (use a free tool):
```bash
# subfinder is also free
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
subfinder -d vocaband.com -o subdomains.txt
```
**Run:**
```bash
subjack -w subdomains.txt -t 10 -timeout 30 -ssl -c $(go env GOPATH)/pkg/mod/github.com/haccer/subjack*/fingerprints.json -v
```
**PASS:** Zero `[Vulnerable]` lines. Output shows `[Not Vulnerable]` or HTTP 200 with content you control.
**FAIL:** Any subdomain marked `[Vulnerable]`.
**Send back:** Just the `[Vulnerable]` lines, or "no vulnerable subdomains" plus the subfinder list.

---

# Section C — Authentication & Session (4 tests)

## Test 11 — Session fixation and logout invalidation
**What it checks:** After logout, does the old token still work? After a password change, are existing sessions revoked?
**Why it matters:** A teacher in a school computer lab logs out → walks away. If the previous session is still valid, a kid on the same machine can grab the cookie and impersonate them.
**Tool:** Browser DevTools.
**Run:**
1. Log in. Open DevTools → Application → Cookies. Copy the Supabase auth-token cookie value.
2. Log out.
3. Paste the same cookie value back into the cookie store (right-click → edit) and reload `/teacher`.
**PASS:** Server redirects you back to login OR returns 401 from `/api/me`.
**FAIL:** You're still logged in as the same teacher.
**Send back:** Step 3's result (still in OR logged out).

---

## Test 12 — JWT decode and inspection
**What it checks:** Whether the JWT contains only what it should (sub, role, exp). No emails of *other users*. No internal IDs. No secret keys. Sane expiration.
**Tool:** https://jwt.io/ (paste-only; doesn't send the token anywhere if you read the disclaimer).
**Cost:** Free.
**Run:**
1. Log in. DevTools → Application → Cookies → copy the access token (the long string starting with `eyJ`).
2. Paste into https://jwt.io/ left column.
3. Read the right column.
**PASS:** Payload contains `sub`, `role`, `aud`, `exp`. `exp` is **≤ 1 hour** from `iat` (or refresh-token rotation is enabled). No email/PII of anyone other than the logged-in user. No internal secrets.
**FAIL:** `exp` is days/weeks away. Payload contains other users' info. Algorithm is `none`. Header reveals `kid` pointing to a public key on a third-party server.
**Send back:** The payload JSON (redact your own email if you want, but show the structure).

---

## Test 13 — Rate-limit / brute-force probe
**What it checks:** Whether the login endpoint locks attackers out after N failed attempts.
**Why it matters:** Kids share simple passwords. Without rate limiting, a script can brute-force a class code or student account in minutes.
**Tool:** `curl` + bash loop. **Run against a Fly.io preview environment, not live production.** If you don't have a preview, run against `localhost` after starting `npm run dev`.
**Run:**
```bash
# 30 failed login attempts in a row
for i in {1..30}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST 'http://localhost:5173/api/login' \
    -H 'Content-Type: application/json' \
    -d '{"email":"test@example.com","password":"wrongpass'$i'"}'
done
```
**PASS:** After ~5–10 attempts, the response code becomes **429 (Too Many Requests)** or **403** with a "locked out" message.
**FAIL:** All 30 attempts return **401** — meaning unlimited guessing is possible.
**Send back:** The list of 30 status codes (e.g. `401 401 401 ... 429`).

---

## Test 14 — Insecure direct object reference (IDOR)
**What it checks:** Whether a logged-in user can see / edit / delete another user's records by changing an ID in the URL.
**Why it matters:** Most catastrophic class of bug. Teacher A could read Teacher B's class roster, or worse, a student could access another student's profile.
**Tool:** Browser + DevTools.
**Run:**
1. Log in as **Teacher A**. Open a class detail page. Note the class ID in the URL (e.g. `/teacher/class/abc123`).
2. Open a second incognito window. Log in as **Teacher B** (or create a second free account).
3. In Teacher B's browser, paste Teacher A's URL: `/teacher/class/abc123`.
4. Also try the API directly: `curl 'https://www.vocaband.com/api/classes/abc123' -H 'Cookie: <teacher B cookie>'`.
**PASS:** Teacher B sees **"not found"** or **"403 forbidden"** — not Teacher A's data.
**FAIL:** Teacher B sees Teacher A's class details, roster, or assignments.
**Send back:** Screenshot of what Teacher B sees + the HTTP status code from the `curl` call.

> Repeat this with assignment IDs, student IDs, and submission IDs. If your URLs use UUIDs, the test is harder to enumerate but still possible — note that "obscure ID" is not a security boundary.

---

# Section D — Database & Backend (3 tests)

## Test 15 — RLS pen-test (you already have this script)
**What it checks:** Whether anonymous users (no JWT) can read or write to your Supabase tables.
**Tool:** Your existing `scripts/security-pen-test.sh` from this repo.
**Run:**
```bash
bash scripts/security-pen-test.sh
```
**PASS:** All four checks report **PASS**.
**FAIL:** Any check reports **FAIL** — paste the failing check name.
**Send back:** The full script output.

---

## Test 16 — Supabase Security Advisor
**What it checks:** Supabase's own built-in linter for RLS gaps, missing indexes, function-security issues, exposed PII columns.
**Tool:** Built into the Supabase dashboard. Free.
**Run:**
1. Log into https://supabase.com/dashboard
2. Pick the Vocaband project → **Advisors** in the left nav.
3. Open **Security** tab. Then **Performance** tab.
**PASS:** Zero items under Security. (Performance ones are nice-to-have, not blockers.)
**FAIL:** Any "RLS not enabled," "Public table," "SECURITY DEFINER without `search_path`."
**Send back:** Screenshot of the Security tab. If empty, just say "no security advisors firing."

---

## Test 17 — WebSocket authentication test
**What it checks:** Whether someone can connect to your socket.io endpoint without a valid JWT and start receiving live-challenge events.
**Why it matters:** A leaderboard contains kids' display names. Anonymous access = data leak.
**Tool:** `wscat` (free, npm).
**Install:**
```bash
npm install -g wscat
```
**Run:**
```bash
wscat -c 'wss://www.vocaband.com/socket.io/?EIO=4&transport=websocket'
```
After it connects, type:
```
40
```
This is the socket.io "connect" message without auth.
**PASS:** Server immediately disconnects you, or returns a `44{"message":"unauthorized"}` style error.
**FAIL:** Server keeps the socket open and sends you any session / leaderboard data.
**Send back:** The raw message stream (whatever the server sent you before disconnecting).

---

# Section E — Code & Dependencies (4 tests)

## Test 18 — npm audit
**What it checks:** Known CVEs in your direct and transitive dependencies.
**Tool:** Built in. Free.
**Run:**
```bash
npm audit --production
npm audit --omit=dev --json > audit-prod.json
```
**PASS:** **Zero** High or Critical findings in production deps. Mediums in dev-only deps are acceptable.
**FAIL:** Any High or Critical in a production dependency.
**Send back:** The summary line (`X vulnerabilities found …`) plus the names of any High/Critical packages.

---

## Test 19 — Retire.js (outdated client-side libraries)
**What it checks:** Whether your *built* bundle ships any known-vulnerable JS library, even if `package.json` looks fine.
**Tool:** retire.js — https://retirejs.github.io/retire.js/
**Install:**
```bash
npm install -g retire
```
**Run:**
```bash
npm run build
retire --path dist
```
**PASS:** "No vulnerabilities found."
**FAIL:** Any library listed with CVE info.
**Send back:** The retire output, or "clean."

---

## Test 20 — Secret scanning (gitleaks)
**What it checks:** Whether your git history ever committed an `.env`, API key, or service-role secret.
**Why it matters:** Once a secret hits git, it's effectively public. Even after `git rm`, the history retains it.
**Tool:** gitleaks — https://github.com/gitleaks/gitleaks
**Install (macOS):**
```bash
brew install gitleaks
```
**Install (Linux):** grab a release binary from the GitHub releases page.
**Run:**
```bash
gitleaks detect --source . --report-path gitleaks-report.json --report-format json --verbose
```
**PASS:** "no leaks found."
**FAIL:** Any finding. **If it found a real secret, rotate it immediately** (regenerate the key in Supabase / Fly / Google Cloud / GitHub) before doing anything else.
**Send back:** The summary count + the file/line of each finding (don't paste the secret itself).

---

## Test 21 — Semgrep (static analysis for code patterns)
**What it checks:** Risky code patterns — `dangerouslySetInnerHTML`, hardcoded URLs to insecure protocols, SQL string concatenation, weak crypto, missing input validation.
**Tool:** semgrep — https://semgrep.dev/
**Install:**
```bash
pip install semgrep
# OR
brew install semgrep
```
**Run:**
```bash
semgrep --config p/owasp-top-ten --config p/react --config p/typescript --output semgrep.txt --error
```
**PASS:** Exit code 0, no findings.
**FAIL:** Any ERROR-severity finding. (WARNING-severity is reviewable.)
**Send back:** The output file, or just the "X findings" summary + the rule IDs that fired.

---

# Section F — Privacy & Compliance (3 tests)

## Test 22 — Cookie / storage inventory
**What it checks:** Exactly what you store in cookies, localStorage, sessionStorage, IndexedDB. Are sensitive items encrypted? Are auth cookies marked `Secure`, `HttpOnly`, `SameSite=Lax|Strict`?
**Why it matters:** GDPR + Israeli Privacy Amendment 13 both require minimization. Auditors will ask for this exact inventory.
**Tool:** Chrome DevTools. Free.
**Run:**
1. Open vocaband.com in an incognito Chrome window.
2. DevTools → Application tab.
3. Walk through: **Cookies** (every domain listed), **Local Storage**, **Session Storage**, **IndexedDB**, **Web SQL**.
4. For each item, note: **name, domain, value (truncated), Secure flag, HttpOnly, SameSite**.
**PASS:** Auth cookies have `Secure=true`, `HttpOnly=true`, `SameSite=Lax` or `Strict`. localStorage contains no plaintext passwords or PII of *other* users.
**FAIL:** Any auth cookie missing `Secure` or `HttpOnly`. localStorage holding raw emails, full names, JWTs (acceptable for Supabase, but flag it), passwords.
**Send back:** A table with rows for each storage item. Markdown or screenshot.

---

## Test 23 — Third-party tracker scan (Blacklight)
**What it checks:** Hidden trackers, fingerprinting scripts, session recorders, ad networks. GDPR demands explicit consent for these.
**Why it matters:** Schools will refuse if your site silently sends kid data to AdSense, Meta Pixel, Hotjar, etc.
**Tool:** Blacklight by The Markup — https://themarkup.org/blacklight
**Cost:** Free.
**Run:**
1. Open https://themarkup.org/blacklight
2. Enter `https://www.vocaband.com` → **Scan**.
**PASS:** Zero ad trackers, zero session recorders, zero canvas fingerprinting. Only first-party + Supabase + Google OAuth (expected) + Cloudflare analytics.
**FAIL:** Any "Ad Tech" / "Session Recording" / "Canvas Fingerprinting" / "Key Logging" line lights up red.
**Send back:** Screenshot of the result page.

---

## Test 24 — CSP Evaluator
**What it checks:** Whether your CSP actually blocks XSS, not just decorates the response. Many CSPs look strict but have `unsafe-inline` or `*.googleapis.com` whitelisted which defeat the purpose.
**Tool:** Google CSP Evaluator — https://csp-evaluator.withgoogle.com/
**Run:**
1. Open https://csp-evaluator.withgoogle.com/
2. Paste your full Content-Security-Policy header (get it from `curl -I https://www.vocaband.com` or DevTools → Network → first request → Response Headers).
3. Click **Check Content-Security-Policy**.
**PASS:** All directives green or yellow. No red **High Severity** items. No `unsafe-inline`, no `'unsafe-eval'`, no overly broad host lists (`https:`, `*`).
**FAIL:** Any red High-Severity finding (typically `script-src unsafe-inline` or `default-src *`).
**Send back:** Screenshot.

---

# Section G — Accessibility (WCAG 2.0 AA) (2 tests)

## Test 25 — axe DevTools full scan
**What it checks:** All 38 WCAG 2.0 AA criteria, automated parts. (~50 % of WCAG can be auto-tested; the rest is Test 26.)
**Why it matters:** You claim "WCAG 2.0 AA — all 38 criteria" on the deck. This is the test that backs that up.
**Tool:** axe DevTools — https://www.deque.com/axe/devtools/ (free Chrome / Firefox extension).
**Run:**
1. Install the extension. Free; no account needed for basic scan.
2. Open vocaband.com. DevTools → axe DevTools tab.
3. **Scan ALL of My Page**.
4. Repeat for: `/teacher` (dashboard), `/student` (dashboard), every game mode screen (`/play/flashcards`, etc.), `/shop`, `/settings`.
**PASS:** Zero issues on the "Critical" and "Serious" severities for every page.
**FAIL:** Any Critical or Serious issue. Common offenders: missing form labels, color contrast < 4.5:1, missing alt text, focus order broken.
**Send back:** Either an HTML export (use the "Export" button) or a list of pages × issue count.

---

## Test 26 — Keyboard-only navigation
**What it checks:** Whether a user with no mouse can use the entire app. Critical for kids with motor disabilities.
**Tool:** Your keyboard.
**Run:**
1. Unplug or ignore your mouse. Open vocaband.com.
2. Use only **Tab** / **Shift+Tab** / **Enter** / **Space** / **arrow keys**.
3. Try to: log in → enter a class code → start a game → answer a flashcard → open settings → log out.
**PASS:** Every interactive element is reachable, has a **visible focus ring**, and activates with Enter/Space. No "trap" where Tab stops working.
**FAIL:** Any button unreachable. Focus invisible (need to guess where Tab is). A modal that grabs focus and never gives it back.
**Send back:** A list of pages and any specific element that failed (e.g. "On /shop, the 'Buy' button can't be reached with Tab").

---

# Section H — Performance & PWA (2 tests)

## Test 27 — Lighthouse full audit
**What it checks:** Performance, Accessibility, Best Practices, SEO, PWA installability.
**Tool:** Chrome DevTools → Lighthouse tab. Free.
**Run:**
1. Open vocaband.com in an incognito window.
2. DevTools → Lighthouse → check all five categories → **Mobile** mode → **Analyze page load**.
3. Repeat for `/teacher` and `/student` (you need to be logged in for these).
**PASS:** All five scores **≥ 90**.
**FAIL:** Any score below 80. Especially Best Practices (security regressions) or Accessibility (WCAG regressions).
**Send back:** A screenshot of the five scores per page. If something is below 90, paste the top 3 opportunities Lighthouse listed.

---

## Test 28 — Service worker / offline behavior
**What it checks:** Whether the SW caches sensitive responses (it shouldn't), and whether logging out clears the cache.
**Tool:** Chrome DevTools.
**Run:**
1. Log in. Use the site for a minute.
2. DevTools → Application → **Service Workers** → check the SW is registered, no errors.
3. Application → **Cache Storage** → walk through each cache. Look at the URLs cached.
4. Log out.
5. Inspect Cache Storage again.
**PASS:** No `/api/me`, `/api/classes/*`, `/api/students/*` responses cached. After logout, any user-specific cached responses are purged (or the SW invalidates them).
**FAIL:** Cached API responses with student names, emails, or roster data. Cached `/api/me` survives logout.
**Send back:** A short list of cached URL patterns + your interpretation.

---

# Section I — Operational (2 tests)

## Test 29 — Backup & restore drill
**What it checks:** Can you actually restore a backup if Supabase has an incident?
**Why it matters:** Compliance auditors will ask "have you ever restored a backup?" The honest answer must be yes.
**Tool:** Supabase dashboard.
**Run:**
1. Supabase dashboard → **Database** → **Backups**.
2. Confirm daily backups are running.
3. **Create a manual backup**.
4. Spin up a Supabase **branch** from that backup (free for paid plans, limited free).
5. Open the branch's SQL editor → confirm at least one row from a real table is visible.
**PASS:** You can list backups for the last 7 days *and* you successfully spun up a branch from one.
**FAIL:** Backups disabled. Or you can't restore one.
**Send back:** Screenshot of the backup list + confirmation that the branch loaded.

---

## Test 30 — Audit-log verification
**What it checks:** The "2-year audit log retention" you claim on the deck. Is it actually firing? Is data going somewhere it can be queried?
**Why it matters:** GDPR Article 30 ("records of processing activities") + Israeli Privacy Amendment 13 both require this.
**Tool:** Supabase logs + your `audit_log` table.
**Run:**
1. Take an action as a teacher (create class, add a student, delete an assignment).
2. SQL editor in Supabase:
```sql
select * from audit_log
where actor_id = '<your teacher uuid>'
order by created_at desc
limit 10;
```
3. Confirm a row was written matching your action.
4. Check retention: `select min(created_at), max(created_at) from audit_log;` — confirm rows older than 2 years would not be purged prematurely.
**PASS:** Action is recorded within a few seconds, with `actor_id`, `action`, `entity_id`, `created_at`, `ip` (or whatever your schema has).
**FAIL:** No row written. Or your retention policy says < 24 months.
**Send back:** The query results (paste the row) + retention setting.

---

# Section J — Bonus / Optional (2 tests)

## Test 31 — Burp Suite Community (manual probing)
**What it checks:** Whatever ZAP missed, especially around socket.io, multipart uploads, OAuth flows.
**Tool:** Burp Suite Community — https://portswigger.net/burp/communitydownload
**Cost:** Free.
**When to do this:** Only after all earlier tests are clean. This is advanced/manual.
**Run:** Out of scope of this checklist — when you reach this point, ping me and I'll write a focused playbook just for the Vocaband flows that need manual probing (OCR upload, OAuth, custom-words CSV).

---

## Test 32 — Pa11y CI accessibility regression test
**What it checks:** Same as Test 25 but runnable in CI so you catch regressions on every PR.
**Tool:** pa11y-ci — https://github.com/pa11y/pa11y-ci
**Cost:** Free.
**Run:**
```bash
npm install -g pa11y-ci
echo '{"urls":["https://www.vocaband.com","https://www.vocaband.com/teacher","https://www.vocaband.com/student"]}' > pa11y.json
pa11y-ci --config pa11y.json
```
**PASS:** Exit code 0.
**FAIL:** Any "error" level finding. (Warnings are reviewable.)
**Send back:** Output.

---

# Results Log

Fill this in as you go. I'll review each entry and update the project.

| # | Test | Date run | Result | Notes |
|---|------|---------|--------|-------|
| 1 | TLS / SSL grade | | | |
| 2 | Security headers grade | | | |
| 3 | Mozilla Observatory | | | |
| 4 | testssl.sh deep scan | | | |
| 5 | DNS / DMARC / SPF | | | |
| 6 | OWASP ZAP automated | | | |
| 7 | Manual XSS smoke | | | |
| 8 | CSRF on state-changing | | | |
| 9 | Nikto | | | |
| 10 | Subdomain takeover | | | |
| 11 | Session fixation / logout | | | |
| 12 | JWT inspection | | | |
| 13 | Rate-limit / brute force | | | |
| 14 | IDOR | | | |
| 15 | RLS pen-test script | | | |
| 16 | Supabase Security Advisor | | | |
| 17 | WebSocket auth | | | |
| 18 | npm audit | | | |
| 19 | Retire.js | | | |
| 20 | Secret scanning (gitleaks) | | | |
| 21 | Semgrep | | | |
| 22 | Cookie / storage inventory | | | |
| 23 | Blacklight tracker scan | | | |
| 24 | CSP Evaluator | | | |
| 25 | axe DevTools | | | |
| 26 | Keyboard-only navigation | | | |
| 27 | Lighthouse | | | |
| 28 | Service worker / offline | | | |
| 29 | Backup & restore drill | | | |
| 30 | Audit-log verification | | | |
| 31 | Burp Community (optional) | | | |
| 32 | Pa11y CI (optional) | | | |

---

# Recommended order

If you only have a couple of hours today:

**Fastest wins (45 minutes total):** 1, 2, 3, 18, 20, 23, 24 — these are public-website tests + dependency audit + secret scan. They give you concrete grades to put in front of auditors and they catch the most embarrassing footguns.

**Tomorrow (2 hours):** 6 (ZAP), 15 (RLS), 16 (Supabase Advisor), 21 (Semgrep), 25 (axe).

**Day three (1 hour each, can be split):** 7, 11, 12, 14, 17 — manual application-layer tests.

**End of week:** 5, 10, 22, 26, 27, 28, 29, 30 — operational and compliance closeout.

Bring me each result as you finish it. I'll log it in the table, decide if it's a PASS, and patch the code for any FAIL.
