# Security Policy

Thanks for helping keep Vocaband and our users safe. This document
explains how to report a vulnerability, what we treat as in-scope, and
what you can expect back from us.

We deliberately keep this page short. Specific architectural, operational,
and defensive implementation details are not published — they are shared
on a need-to-know basis with vetted researchers under a written
agreement.

---

## Reporting a vulnerability

**Please do NOT open a public GitHub issue, pull request, or discussion
thread for security reports.**

Send the details privately to:

📧 **contact@vocaband.com**

If your report contains sensitive material (PII, credentials, exploit
code, working proofs of concept), please request our PGP key in your
first message and wait for us to share it before sending the details.

When possible, please include:

- A clear description of the issue and the impact you believe it has
- Steps to reproduce
- A proof-of-concept (code, screenshot, video) — be concise
- Which user role(s) the issue affects
- Your name or handle if you'd like credit, or a clear note that you
  prefer to stay anonymous
- Whether you've already shared the finding with anyone else

Please **do not** automate scans against production, exfiltrate real
user data, attempt to pivot beyond a minimum proof, or interact with
real classroom sessions in any way. If your test would impact real
teachers or students, stop and contact us first — we will work with
you to set up a safe test environment.

---

## What to expect

| Milestone | Target |
|---|---|
| Acknowledgment of your report | Within **2 business days** |
| Initial triage + severity rating | Within **5 business days** |
| Fix shipped for critical issues | Within **7 days** of triage |
| Fix shipped for high issues | Within **14 days** of triage |
| Fix shipped for medium/low issues | Within **30 days** of triage |
| Public disclosure (if you want one) | After the fix is live and at least 7 days have passed |

We will keep you updated throughout the process and credit you once
the fix has shipped, unless you ask to remain anonymous.

---

## Scope

### In scope

- The production web app at **https://www.vocaband.com**
- Any subdomain of `vocaband.com` that we operate

We will tell you privately during triage whether a specific endpoint or
host you are looking at is one of ours.

### Out of scope (please don't test, and we won't accept these)

- Third-party services and SaaS dependencies that we use — please
  report those directly to the relevant vendor through their own
  disclosure programs.
- Social engineering of our staff, contractors, users, teachers, or
  students.
- Denial-of-service testing, load testing, brute force, traffic
  amplification, or anything else that could degrade the service for
  real classrooms.
- Physical attacks on any person, device, or office.
- Security of unsupported forks, third-party hosts, or modified copies
  of this codebase that we do not operate.
- Issues caused by third-party browser extensions or local malware on
  the tester's own device.
- "Self-XSS" or attacks that require the victim to paste hostile code
  into their own browser console.
- Reports based solely on missing best-practice headers, banner
  fingerprinting, software version disclosure, or theoretical issues
  without a working proof of concept.
- Anything that requires access we have not granted (stolen
  credentials, leaked tokens not obtained from our public surface,
  etc.).
- Automated scanner output without manual validation.

---

## Safe-harbour

We consider good-faith security research performed consistently with
this policy to be:

- Authorised in view of any applicable anti-hacking laws — we will
  not initiate legal action against you for research performed under
  this policy.
- Authorised in view of relevant anti-circumvention laws — we will
  not bring a claim against you for circumventing technology controls
  in good-faith research.
- Exempt from any restrictions in our Terms of Service that would
  otherwise interfere with conducting security research; we waive
  those restrictions on a limited basis for work done under this
  policy.

If at any time you are uncertain whether your research is consistent
with this policy, contact us first at **contact@vocaband.com**. When
in doubt, ask.

This safe-harbour does not apply if you exfiltrate real user data,
publicly disclose an unfixed issue, attempt to extort the project, or
act in bad faith.

---

## Our security posture (high level)

We treat the safety of children and the privacy of teachers as a core
product requirement, not an afterthought.

- We follow least-privilege principles across the platform.
- We perform internal security reviews on a recurring basis, plus
  third-party assessments before significant releases.
- We minimise the personal data we collect from students by design —
  most students can use the platform without providing an email
  address, password, or any persistent identifier.
- We do not publish implementation details of our authentication,
  authorisation, data isolation, or anti-abuse controls. Detailed
  technical documentation is available only to vetted partners and
  researchers under a written agreement.

If you need a deeper security or privacy briefing for procurement,
research, or a school district evaluation, contact
**contact@vocaband.com** and we will arrange one under NDA.

---

## Acknowledgments

We publicly thank researchers who report valid vulnerabilities in good
faith, unless they ask to remain anonymous. If you'd like to be listed
here once your report is resolved, mention it in your email.

<!--
 Hall of Fame — appended as reports are validated and fixed.
 YYYY-MM-DD — <name / handle> — <one-line summary, kept generic>
-->

---

## Bug bounty

Vocaband does not currently offer a paid bug bounty. We are a small
team building for classrooms. We do acknowledge reporters publicly
(with permission) and will work with you on responsible disclosure
timing.

---

## Contact

📧 **contact@vocaband.com** — security reports, NDA briefings, and
commercial licensing inquiries.
