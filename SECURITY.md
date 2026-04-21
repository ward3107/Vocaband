# Security Policy

Thanks for helping keep Vocaband and our users safe. This document explains
how to report a vulnerability, what we treat as in-scope, and what you can
expect back from us.

## Reporting a vulnerability

**Please do NOT open a public GitHub issue for security reports.**

Send the details privately to:

📧 **contact@vocaband.com**

Encrypt with our PGP key if the report contains PII, credentials, or
exploit material — request the key in your first email and we'll share it.

Include, when possible:

- A clear description of the issue and its impact
- Steps to reproduce (URLs, payloads, affected user roles)
- Proof-of-concept code or screenshots
- Your name / handle if you'd like credit in the Acknowledgments section
  below
- Whether you've already shared the finding with anyone else

## What to expect

| Milestone | Target |
|---|---|
| Acknowledgment of your report | Within **2 business days** |
| Initial triage + severity rating | Within **5 business days** |
| Fix shipped for critical issues | Within **7 days** of triage |
| Fix shipped for high issues | Within **14 days** of triage |
| Fix shipped for medium/low issues | Within **30 days** of triage |
| Public disclosure (if you want one) | After the fix is live and at least 7 days have passed |

We will keep you updated throughout the process and credit you once the
fix has shipped (unless you request anonymity).

## Scope

### In scope

- The production web app at **https://www.vocaband.com** (and any
  `*.vocaband.com` subdomain we operate)
- The backend API at **https://api.vocaband.com** (Render-hosted)
- The Supabase project (`niknruuooktjotwydlqa`) — schema, RLS policies,
  RPC functions, storage rules
- The Cloudflare Worker edge logic in `worker/index.ts`
- Any code in this repository that ends up in production

### Out of scope (please don't test or report)

- Third-party services we depend on (Supabase, Render, Cloudflare,
  Google OAuth, Google Cloud / Gemini, MyMemory) — report issues
  directly to those vendors via their own disclosure programs
- Social-engineering of our staff, contractors, or users
- Denial-of-service testing against production (load testing,
  Slowloris, amplification attacks)
- Physical attacks on any person or device
- Security of unsupported or modified forks of this codebase
- Issues arising from third-party browser extensions installed on the
  tester's own machine
- "Self-XSS" or attacks that require the victim to paste hostile code
  into their own browser console
- Missing best-practice headers that don't translate to a concrete
  attack (please include a working PoC)
- Rate-limit bypasses on non-authenticated read-only endpoints unless
  they enable a meaningful attack

## Vulnerability classes we especially care about

- **Authentication / session** — anything that lets one user act as
  another (teacher, student, admin), bypasses the teacher allowlist,
  bypasses the student approval gate, or forges a Google OAuth identity.
- **Authorization / RLS** — any Row-Level Security policy that leaks
  cross-tenant data (another teacher's class, another student's
  progress, another student's PII).
- **SECURITY DEFINER RPCs** — SQL injection, `search_path` hijacking,
  privilege escalation, or missing ownership checks.
- **Student PII** — display names, scores, or device-linked anon UIDs
  leaking to users who shouldn't see them.
- **Realtime channels** — ability to eavesdrop on a classroom's
  socket.io room or a Quick Play session you don't own.
- **CSRF / CORS** — anything that turns a cross-origin request into
  a state-changing action on our API.
- **XSS / content injection** — via student display names, class
  names, assignment titles, pasted vocabulary, or OCR output.
- **Build-time leaks** — secrets, service-role keys, or server-side
  logic accidentally shipped into the browser bundle.

## Acknowledgments

We publicly thank researchers who report valid vulnerabilities in good
faith (unless they ask to remain anonymous). If you'd like to be listed
here once your report is resolved, mention it in your email.

<!--
 Hall of Fame — appended as reports are validated and fixed.
 2026-xx-xx — <name / handle> — <one-line summary of the finding>
-->

## Safe-harbour

We consider good-faith security research performed consistently with this
policy to be:

- Authorised in view of any applicable anti-hacking laws; we will not
  initiate legal action against you for research performed under this
  policy.
- Authorised in view of relevant anti-circumvention laws; we will not
  bring a claim against you for circumvention of technology controls.
- Exempt from restrictions in our Terms of Service that would interfere
  with conducting security research; we waive those restrictions on a
  limited basis for work done under this policy.

If at any time you are uncertain whether your research is consistent
with this policy, contact us first at **contact@vocaband.com**.

## Our own security practices

For transparency, a summary of Vocaband's internal controls:

- **Row-Level Security** enabled on every public table
- **Allowlisted teacher emails** — only pre-approved email addresses
  can sign in as teachers
- **Student approval queue** — new student accounts are teacher-gated
- **PKCE flow** for Supabase OAuth (not implicit-grant)
- **JWT verification** on every backend route that mutates data
- **Content Security Policy** + strict CSRF protections via Helmet
- **Input validation** at API and DB layers; bounded numeric columns;
  `CHECK` constraints on enums
- **`SECURITY DEFINER` RPCs** run with explicit `SET search_path` and
  ownership checks
- **Internal security audits** are conducted periodically; reports are
  kept private.  Researchers with a specific technical question about
  how a control is implemented can email us directly.

## Bug-bounty

Vocaband does not currently offer a paid bug bounty. We're a small team
building for classrooms. We do acknowledge reporters publicly (with
permission) and will work with you on responsible disclosure timing.
