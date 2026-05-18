# Vocaband — Lawyer brief for MoE compliance consult

> **Hand this document to the privacy lawyer 48 hours before the
> consult.** Together with the four attachments listed in § 0, it
> contains everything the lawyer needs to give precise answers
> without re-discovering the architecture from source code.
>
> Target: one 1-hour consult unblocks every legal-judgement item on
> the MoE compliance roadmap. Estimated cost ₪1-2k.
>
> Last updated 2026-05-18.

---

## 0. What to send the lawyer

Bundle these into a single email or shared folder, sent 48h before
the meeting:

1. **This brief** (`docs/LAWYER-BRIEF-MOE.md`)
2. **`docs/DPIA-TECHNICAL.md`** — the technical DPIA input. The lawyer
   will fill the "FOR LAWYER" sections of this document during /
   after the consult.
3. **`docs/RISK-REGISTER.md`** — engineering-rated risk register. The
   lawyer will ratify or adjust the residual scores and fill in R13.
4. **`docs/MOE-REQUIREMENTS.md`** — master compliance tracker. The
   lawyer can see which rows are already green and which are blocked
   on them.
5. **`docs/INFORMATION-SECURITY-POLICY.md`** — for context on what
   we've published.
6. **`docs/SUBPROCESSORS.md`** — sub-processor list with hosting regions
   (for cross-border transfer analysis).
7. **Your current Hebrew privacy policy** (the published version at
   `/privacy`).
8. **Your current Hebrew terms of service** (the published version at
   `/terms`).

Tell the lawyer: "we want to use this consult to answer the 7
specific questions below + ratify the Risk Register. We'll write up
the answers ourselves; we need your judgement, not a memo."

---

## 1. Context for the lawyer (1-page summary)

**The product:** Vocaband is an English-vocabulary learning platform
for Israeli primary + middle schools (grades 4-9 primary use case,
extending to 1-12). Teachers create classes; students join with a
class code; students play game-mode exercises that record progress;
teachers see aggregate progress in a gradebook.

**The data collected** (full list in `DPIA-TECHNICAL.md § 2.1`):
- **Teachers:** email (Google or OTP) + display name.
- **Students:** display name + class code + game progress.
- No phone, no address, no health/biometric/financial data, no payment data, no precise geolocation, no third-party ad IDs.

**The architecture** (full map in `SECURITY-LEVELS.md`):
- React SPA served from Cloudflare Pages + Worker (proxy).
- Fly.io Express + WebSocket backend (Amsterdam region).
- Supabase Postgres + Auth + Storage (Frankfurt region).
- AI features (OCR, sentence generation) call Google Gemini + Anthropic Claude with vocabulary words only — no student PII sent.

**Compliance posture today** (full status in `MOE-REQUIREMENTS.md`):
- RLS on every table; A+ SSL Labs; HSTS preload submitted; audit log immutable as of 2026-05-18.
- DPIA technical sections, Risk Register, Information Security Policy, Incident Response, DR plan — all drafted.
- DPO appointed (founder), `privacy@vocaband.com` alias live.
- Not yet: external pen-test, PPA registration, MoE submission, signed DPA template.

**Why we are talking to you now:**
- Several questions require legal judgement before we can finish the MoE submission.
- We want to do the consult once, take detailed notes, then act on them ourselves.
- We expect to come back for a contracted deliverable (DPA template) once a first school formally adopts; this consult should not commit either side to that.

---

## 2. The seven questions

### Question 1 — Does teacher-mediated onboarding satisfy § 25 parental consent?

**The set-up:**

- Vocaband does not collect student email. Students do not sign up directly. The teacher creates a class, gets a class code, distributes it in their classroom; students enter the code + a display name on their device.
- The teacher is acting in their professional role under the school's authority.
- We treat the teacher's act of assigning the platform as evidence of "school-as-data-controller" consent on behalf of pupils. We do not currently collect parent emails or send a parent consent prompt.

**What we need from you:**

a) In your judgement, does the above arrangement satisfy חוק הגנת הפרטיות § 25 (consent of guardian for minor data processing) when the data subject is a primary/middle-school student in a public Israeli school context?

b) If yes: please give us one or two sentences in Hebrew + English we can paste into `/privacy` to make the legal basis explicit ("the school acts as data controller under MoE auspices; consent is obtained from the parent by the school as part of school enrolment; Vocaband acts as data processor on the school's instructions" — or your preferred wording).

c) If no: what specific addition do we need? Options we've considered:
   - Parent-email collection by Vocaband during the first student login + email confirmation step.
   - Parent-paper-form signed by the parent during school enrolment, kept by the school, optionally referenced in our `consent_log`.
   - Something else.
   For each option you flag as acceptable, tell us which Reg / circular text supports it so we can document the choice.

d) If the answer depends on **age** of the student (e.g. acceptable for 14+ but not 9-13), please tell us the cut-off + the wording differences.

**Why this matters:** This is Risk R13 in the Risk Register, currently unscored. Your answer unblocks R13, and if (b) it unblocks roughly 3-5 days of engineering work; if (c) it unblocks ~2-3 weeks of engineering work to build the consent flow.

---

### Question 2 — Privacy policy diff against the current MoE template

**The set-up:**

- Our Hebrew privacy policy is published at `/privacy` (attached as item 7 in § 0).
- MoE publishes a recommended template for vendor privacy policies. We haven't done a clause-by-clause diff against the latest version.

**What we need from you:**

a) Read our `/privacy` page.
b) Compare against the current MoE template you have access to.
c) Give us a list of:
   - Clauses present in MoE template, **missing** from ours → please write the Hebrew text we should add.
   - Clauses present in ours that are **inconsistent** with MoE template → please write the correction.
   - Clauses where MoE leaves discretion → flag for our judgement.

d) Same exercise for `/terms` against MoE's terms template if one exists.

e) Tell us if we need to bump our `consent_policy_version` (which forces all existing users to re-consent on next login) or if the changes are minor enough to skip that.

**Why this matters:** This is Section B1 of `MOE-REQUIREMENTS.md` — "Hebrew privacy policy matching MoE template". We can apply your edits in engineering within 1-2 days of receiving them.

---

### Question 3 — Cross-border transfer basis

**The set-up:**

- Personal data is processed in Israel (where Vocaband operates) and stored in EU (Frankfurt — Supabase + Amsterdam — Fly).
- Google OAuth handshake briefly transits the US.
- AI features send vocabulary words (no student PII) to Anthropic (US) under their SCC-based DPA.
- We rely on the **EU-Israel mutual adequacy decision** for the Israel↔EU flow and **EU-US DPF** for the Google handshake.

**What we need from you:**

a) Confirm (or correct) that the EU-Israel mutual adequacy decision is currently in force and applies to our processing as described.
b) Confirm the EU-US DPF certification of Google + Anthropic suffices for our use case, or recommend an additional SCC step.
c) Write one Hebrew + English paragraph for the privacy policy that documents the legal basis. We will paste it verbatim.
d) Flag any disclosure / labeling requirements specific to MoE-school deployments (e.g. some Israeli school districts require that no PII leaves Israel — does our PII-only-in-EU model satisfy them?).

**Why this matters:** This is Risk R14 in the Risk Register + row A9 in `MOE-REQUIREMENTS.md`. Currently green pending your confirmation.

---

### Question 4 — Risk Register ratification

**The set-up:**

- `docs/RISK-REGISTER.md` is the engineering-rated register. We followed the 5×5 Severity × Likelihood scoring rubric in § 0 of that doc.
- Every row except R13 has a residual score; R13 is left to you (it's Question 1 in this brief).
- Most rows land at residual 4-8 (green/yellow); none are currently red.

**What we need from you:**

a) Is the 5×5 rubric in § 0 appropriate, or should we adopt the regulator's preferred 1-3 / 1-5 / "low/med/high" convention?
b) For each of R1-R12 + R14-R15, do you agree with the residual score? For any disagreement, give us the score you'd assign + one-sentence rationale.
c) Fill in R13 once Question 1 above is answered.
d) Sign off (name + date) on the final register so we can attach it to the MoE vendor questionnaire.

**Why this matters:** סקר סיכונים (Risk Register) is required by Reg 2017 § 6. We cannot submit MoE without a lawyer-ratified version.

---

### Question 5 — DPIA legal sections

**The set-up:**

- `docs/DPIA-TECHNICAL.md` is the engineering input. Sections marked "FOR LAWYER" need your input:
  - § 1.4 Legal basis (per data category).
  - § 3 Necessity and proportionality assessment.
  - § 4 Risk assessment columns (Severity / Likelihood / Residual risk) — these mirror Question 4.
  - § 5 Measures planned to address the risks.
  - § 7 Conclusion.

**What we need from you:**

a) Either fill those sections directly in the doc, or send us bullet-point input that we paste in.
b) Sign off on § 7 (lawful / risks acceptable / monitoring required / re-DPIA triggers).

**Why this matters:** The DPIA is the document MoE reviewers look at first when they want to understand what you do with student data. It carries the most weight.

---

### Question 6 — DPA template clauses (scoping only — defer drafting)

**The set-up:**

- We do not currently have a signed DPA with any school.
- When the first school formally asks (Task 12 in the Operator Playbook), we'll need a template ready.
- MoE has its own preferred DPA template that we should base ours on.

**What we need from you in *this* consult:**

a) Confirm you have access to the latest MoE DPA template (most lawyers do).
b) Give us a 1-page outline of the clauses our DPA will need to include — purpose, scope, sub-processors, security measures, audit rights, breach notification, term, termination, return of data on termination.
c) Quote a fixed fee for drafting the full template + delivering as Word/Google Docs + reviewing the first school's redlines. Mark this as **out of scope for this consult**; we'll commission it separately when the first school asks. We just need the price-and-timeline expectation now.

**Why this matters:** We don't want to commission the template until we have a real school to use it with — but knowing the price + timeline lets us not panic when that day comes.

---

### Question 7 — PPA registration timing + content

**The set-up:**

- Currently <1,000 users. The registration thresholds (≥10,000 data subjects; ≥100,000 records; sensitive-data; direct marketing; data-not-collected-from-subject; public-body) do not yet apply.
- Our plan (Task 10 in the Operator Playbook) is to start the registration process at ~5,000 users, given the 30-90 day lead time, so the certificate is in hand before crossing 10,000.

**What we need from you:**

a) Confirm this is still defensible, or recommend earlier registration.
b) Flag any thresholds that have changed in the last 12 months (the rules do change).
c) Look at the field-by-field guidance in Operator Playbook Task 10 and tell us if any field is mis-described.
d) Quote a fixed fee for "lawyer review of the filled registration form before submission" — usually ₪500-1500. We'll likely commission this separately when we reach 5,000 users.

**Why this matters:** Saves us submitting a defective registration. Saves us paying for registration before we need to.

---

## 3. Output format we'd like

Either:

- **Option A** — annotate the attached docs directly with track-changes / comments. We'll consolidate.
- **Option B** — write us a single response email with seven numbered answers (one per question above). We'll apply edits.

Either works. Option A is faster for us; Option B is sometimes cheaper for you. Pick whichever fits your standard practice.

---

## 4. What we explicitly do NOT need from this consult

- A new privacy policy from scratch (we already have one — just diff against MoE template).
- A new DPA template (defer to a later contracted deliverable).
- A formal legal opinion letter (saves your time + our cost; we'll come back for that when MoE specifically asks).
- An audit of our codebase (we have an external pen-test planned separately).
- A general "GDPR for startups" walkthrough (we know it).

---

## 5. After the consult — engineering follow-ups

Once we have your answers, here's what happens on our side:

| Lawyer output | Engineering action | Owner | ETA |
|---|---|---|---|
| § 25 answer (Q1) | Update R13 + add policy paragraph; if explicit consent required, build parent-email consent flow | Engineering | 1-21 days depending on (b) vs (c) |
| Privacy policy diff (Q2) | Paste corrections, bump `consent_policy_version` | Engineering | 1-2 days |
| Cross-border paragraph (Q3) | Paste into `/privacy` HE+EN, reference in Policy doc | Engineering | <1 day |
| Risk Register ratification (Q4) | Update doc header to "ratified by [name] on [date]"; update scores | Engineering | <1 day |
| DPIA legal sections (Q5) | Apply edits + remove "FOR LAWYER" markers | Engineering | <1 day |
| DPA scoping (Q6) | File quote in `docs/operator-tasks.md` for future | Operator | <1 day |
| PPA registration confirmation (Q7) | Update Operator Playbook Task 10 + calendar reminder | Operator | <1 day |

Total engineering work to apply all the consult outputs (excluding parent-consent flow if that's required): **2-4 days**.

---

## 6. Out-of-scope follow-on engagements (rough budget so you know)

Tell the lawyer up front that **if the consult goes well**, we'd
likely come back for these three deliverables, each separately
quoted:

1. **DPA template drafting + first-school redlines** — ₪3-8k expected.
2. **PPA registration form review** at ~5,000 users — ₪500-1500 expected.
3. **MoE submission review** (Tofes 22/23 filled + reviewed before submit) — ₪2-5k expected.

That tells the lawyer this is a real customer pipeline, not a
one-off engagement, and many firms will price the initial consult
accordingly.

---

## 7. Logistics

- **Meeting format:** Zoom / Teams / in-person — your preference.
- **Language:** Hebrew or English — we're fluent in both.
- **Recording:** with permission, we'd like to record for our notes. Tell us if your firm doesn't permit it.
- **Note-taker:** we'll bring our own note-taker. We'll send you our notes within 48h of the meeting for accuracy-check.
- **Confidentiality:** standard NDA acceptable; we can sign yours, or use a simple mutual NDA.

---

## 8. Contact

[DPO name — see Operator Playbook Task 3]
Data Protection Officer, Vocaband Educational Technologies
privacy@vocaband.com
[phone]
