# Vocaband — Legal Audit, May 2026

**Status:** Draft proposed language for lawyer review.
**Audit date:** 2026-05-08
**Pages audited:** Terms of Service · Privacy Policy · Security & Trust · Accessibility Statement · System Status
**Reviewer:** AI structural review (Claude). **NOT a substitute for licensed legal counsel.**
**Already shipped (no lawyer review required):**
- WCAG 2.1 AA + IS 5568 conformance statement (AccessibilityStatement)
- Last accessibility audit date (2026-05-08)
- Designated Accessibility Coordinator: Waseem · contact@vocaband.com
- Theme refresh — dark gradient page bg, light readable cards (Option A)

---

## How to use this document

Each item below is a proposed addition or strengthening to the policy text. Mark each clause with one of:

- ✅ **Approve as-written** — apply verbatim
- ✏️ **Edit** — write the change inline, I'll match it
- ❌ **Reject** — drop entirely
- 🔄 **Replace** — provide alternative language inline

Items are grouped by criticality. For each item I cite the file + insertion location so the change is mechanical once approved.

---

## 🔴 CRITICAL — Direct legal exposure under Israeli law

### Item 1 — Children's data clause (Privacy Protection Law Amendment 13, §17B)

**File:** `src/components/TermsPage.tsx` — add as new Section between current §3 (User Accounts) and §4 (Code of Conduct), OR add to PublicPrivacyPage as a dedicated "Minors' Data" section.

**Why:** Vocaband targets grades 4–9 = ages 9–15. Amendment 13 §17B introduces stricter consent rules for processing minors' data. The current text only implies this via "school authorization." Israeli regulators (PPA) flagged children's-data flows as enforcement priority for 2025–2026.

**Proposed language (EN):**

> ## Processing of Minors' Data
>
> Vocaband is designed for use in school settings, primarily by students aged 9–15. We process the personal data of minors only under one of the following lawful bases:
>
> 1. **School authorization (in loco parentis):** A teacher or school administrator with authority over the minor's education has authorized the use of Vocaband as part of the school's instructional program. The school acts as the data controller for student records; we act as a processor on the school's behalf.
>
> 2. **Verified parental consent:** Where a parent or legal guardian directly creates a student account outside a school context, we collect verifiable parental consent before any processing.
>
> Pursuant to Amendment 13 of the Israeli Privacy Protection Law (5741-1981), we do not:
> - Use minors' personal data for marketing, advertising, or profiling.
> - Share minors' data with third parties except as required to operate the Service (see our Subprocessor List).
> - Retain minors' data beyond what is necessary for the educational purpose. Account data is deleted within 90 days of account closure unless the school requires longer retention for academic records.
>
> Parents and legal guardians may exercise the rights of access, correction, and deletion on behalf of their child. Requests should be sent to <contact@vocaband.com> and will be answered within 30 days.

**Proposed language (HE/AR):** Mirror translation, lawyer to verify.

**Lawyer review focus:**
- Is the "in loco parentis" basis sufficient under Amendment 13 §17B for school deployments?
- Is 90-day deletion appropriate, or does a school's ed-records retention obligation override?
- Does the school-as-controller / Vocaband-as-processor framing match how the actual deployment works contractually?

---

### Item 2 — Refund / 14-day cooling-off (Israeli Consumer Protection Law §14C)

**File:** `src/components/TermsPage.tsx` — add as new Section between current §6 (IP) and §7 (Data Protection).

**Why:** Israeli Consumer Protection Law §14C requires a 14-day cooling-off period for distance-sales of subscriptions. Currently undisclosed in Terms, which exposes the company to consumer-protection complaints once Pro plans are sold publicly.

**Proposed language (EN):**

> ## Refunds and Cancellation
>
> Pro subscription purchases are subject to the following terms:
>
> **14-day cooling-off period.** Pursuant to §14C of the Israeli Consumer Protection Law (5741-1981), you may cancel a Pro subscription within 14 days of the first payment for a full refund. The 14-day period starts on the date of the first successful payment. Refunds are processed to the original payment method within 14 business days of cancellation.
>
> **After 14 days.** Subscriptions auto-renew at the end of each billing period. You may cancel auto-renewal at any time from your account settings. Cancellations take effect at the end of the current paid period; we do not pro-rate refunds for the remaining period of an active subscription.
>
> **How to cancel.** Cancel at any time from your account settings, or by emailing <contact@vocaband.com> with your account email.

**Lawyer review focus:**
- Does §14C apply to B2B school licenses or only to individual teachers? (Distinction matters because B2B may exempt §14C.)
- Should we explicitly call out school licenses as a separate class with negotiated terms?
- Is the "14 business days for refund processing" timeline aligned with Israeli payment-processor SLAs?

---

### Item 5 — Termination & data-retention clause

**File:** `src/components/TermsPage.tsx` — add as new Section near current §9 (Governing Law).

**Why:** Without this, users can't predict what happens to their data, and we have no contractual protection if a teacher claims data was deleted prematurely.

**Proposed language (EN):**

> ## Termination and Data Retention
>
> **Termination by you.** You may close your account at any time from your account settings. Closure is immediate and irrevocable.
>
> **Termination by us.** We may suspend or terminate accounts that materially violate these Terms, with at least 14 days' notice except in cases of fraud, security risk, or legal compulsion. Where possible, we will give you a chance to cure the violation.
>
> **What happens to your data on closure:**
> - **Active session and authentication data** — purged immediately.
> - **User profile, classes, and student progress** — soft-deleted on closure (visible only to you for 30 days in case of accidental closure), then hard-deleted within 90 days.
> - **Database backups** — encrypted backups are retained on a 180-day rolling window. Your data is overwritten in backups within 180 days of closure.
> - **Aggregated, anonymized usage statistics** — may be retained indefinitely. These cannot be used to re-identify you.
> - **Records required by law** (e.g. tax invoices for paid plans) — retained for the period the law requires (currently 7 years under Israeli tax law).

**Lawyer review focus:**
- Is the 30-day soft-delete window reasonable, or should it be shorter/longer?
- For school deployments where the school is the data controller, what's the school's notice obligation when closing a class?
- Does "180 days for backups" align with our actual Supabase/Cloudflare backup rotation?
- Tax retention: confirm 7 years is correct for our entity type.

---

### Item 6 — DPA / processor agreement disclosure

**File:** `src/components/PublicPrivacyPage.tsx` — add reference link in current §1 (Data Controller) or as new §X (Subprocessors).

**Why:** Schools commonly require a Data Processing Agreement (DPA) before signing. Currently, `THIRD_PARTY_REGISTRY` in `privacy-config.ts` lists processors but the Privacy Policy doesn't expose this. Schools' procurement teams won't sign without a public DPA reference.

**Proposed language (EN):**

> ## Subprocessors and Data Processing Agreement
>
> Vocaband uses the following subprocessors to operate the Service. Each is bound by a written Data Processing Agreement requiring them to process data only on our instructions and to apply appropriate security measures.
>
> | Subprocessor | Purpose | Region | Privacy notice |
> |---|---|---|---|
> | Supabase | Database, authentication, storage | EU (Frankfurt) | https://supabase.com/privacy |
> | Cloudflare | CDN, edge worker, DDoS protection | Global edge | https://www.cloudflare.com/privacypolicy/ |
> | Fly.io | Application server (WebSocket, API) | EU (Frankfurt) | https://fly.io/legal/privacy-policy/ |
> | Anthropic | AI sentence generation | US | https://www.anthropic.com/legal/privacy |
> | Google Cloud | Translation API, OCR | EU multi-region | https://policies.google.com/privacy |
>
> **Schools requesting a Data Processing Agreement** may email <contact@vocaband.com> to receive our standard DPA in PDF, signed and ready for counter-signature.

**Lawyer review focus:**
- Should we include the actual DPA terms in the Privacy Policy or only reference its availability?
- Does Anthropic-in-US trigger Israeli/EU cross-border transfer language we need to disclose?
- Are all current subprocessors actually under contract? Confirm DPAs exist and are countersigned for each.

---

### Item 8 — Force majeure clause

**File:** `src/components/TermsPage.tsx` — add as new Section between current §8 (Liability) and §9 (Governing Law).

**Why:** Standard worldwide protection. Without it, we're potentially liable for SLA breaches caused by events beyond our control (war, infrastructure outages, pandemics, etc.).

**Proposed language (EN):**

> ## Force Majeure
>
> Neither party shall be liable for any failure or delay in performance of obligations under these Terms (excluding payment obligations) caused by events beyond reasonable control, including but not limited to: acts of war or terrorism, civil unrest, governmental action, natural disasters, epidemics, failures of public utilities or telecommunications networks, third-party cloud-provider outages, and cyber-attacks not attributable to a failure of the affected party's reasonable security measures.
>
> The party affected by a force majeure event shall notify the other party as soon as reasonably possible and use commercially reasonable efforts to resume performance. If a force majeure event continues for more than 60 days, either party may terminate the affected portion of the Service with no further obligation.

**Lawyer review focus:**
- Does the carve-out for payment obligations match Israeli consumer-law expectations?
- Is the 60-day termination right reasonable, or should it be longer/shorter?
- Should we explicitly enumerate "regional military conflict" given current geopolitical context?

---

## 🟡 IMPORTANT — Best practice / auditor expectation

### Item 9 — Version history display *(safe to ship without lawyer)*

**File:** All 4 main legal pages.

**Action:** Add a small "Version 2.1 · Effective 2026-05-04" line at the top of each legal page, sourced from `PRIVACY_POLICY_VERSION` already in `src/config/privacy-config.ts`. No new commitments — just exposing existing config.

**Status:** Pending — can ship without lawyer review. Awaiting user go-ahead.

---

## 🟢 NICE-TO-HAVE — Already approved by user, ship without lawyer

### Item 10 — Print stylesheet

**Action:** Add `@media print` CSS rule in global stylesheet:
- Hide `<PublicNav>`, `<FloatingButtons>`, `<footer>` print buttons
- Force white background (override dark gradient)
- Force black text
- Avoid page breaks inside section cards

**Status:** Pending — can ship without lawyer review.

### Item 11 — PPA complaint procedure

**File:** `src/components/PublicPrivacyPage.tsx` — add as a new section near Contact.

**Action:** Add disclosure of users' right to file a complaint with the Israeli Privacy Protection Authority if dissatisfied with our response.

**Proposed language (EN):**

> ## Right to Complain to the Regulator
>
> If you believe we have failed to handle your privacy request adequately, you have the right to file a complaint with the Israeli Privacy Protection Authority (Rashut HaHaganat HaPratiyut):
>
> - **Online:** https://www.gov.il/he/departments/the_privacy_protection_authority
> - **Email:** ppa@justice.gov.il
> - **Phone:** *6552
>
> Before contacting the regulator, please give us 30 days to address your concern by contacting our Data Protection Officer at <contact@vocaband.com>.

**Status:** Pending — can ship without lawyer review (just disclosing existing rights, not creating new commitments).

### Item 12 — Cookies disclosure section

**File:** `src/components/PublicPrivacyPage.tsx` — add as a new section.

**Action:** Transcribe the 3 cookie categories already in the CookieBanner (Essential / Analytics / Functional) into the policy text with examples and purpose.

**Status:** Pending — can ship without lawyer review (transcription of existing behavior).

---

## 📋 Decision matrix for the lawyer

| Item | File | Lines added | Risk if shipped without lawyer | Lawyer time estimate |
|---|---|---|---|---|
| 1. Children's data | TermsPage + PrivacyPage | ~25 | HIGH — direct liability under Amendment 13 | 30 min |
| 2. Refund / cooling-off | TermsPage | ~15 | HIGH — Consumer Protection violation | 20 min |
| 5. Termination + retention | TermsPage | ~25 | MEDIUM — contractual mismatch with engineering | 30 min |
| 6. DPA / subprocessors | PrivacyPage | ~20 | MEDIUM — schools won't sign without it | 20 min |
| 8. Force majeure | TermsPage | ~12 | LOW — standard boilerplate | 10 min |
| **TOTAL** | | **~97** | | **~110 min** |

---

## ⏭ After lawyer review

When the lawyer returns this document with markup, the implementation is mechanical:

1. For each ✅ approved item, I apply the language verbatim.
2. For each ✏️ edited item, I apply the lawyer's edited version verbatim.
3. For each 🔄 replaced item, I apply the lawyer's replacement verbatim.
4. For each ❌ rejected item, I skip.
5. Bump `PRIVACY_POLICY_VERSION` in `privacy-config.ts` to trigger consent re-acceptance for all existing users.
6. Email the team a heads-up that policy version changed.

Estimated implementation time after lawyer signoff: **~30 min for all 5 items**.

---

## 📞 Escalation contacts

- **Israeli Privacy Protection Authority (PPA):** ppa@justice.gov.il · *6552 · https://www.gov.il/he/departments/the_privacy_protection_authority
- **Israeli Equal Rights for People with Disabilities Commission:** mugbaluyot@justice.gov.il · *6092
- **Israeli Consumer Protection and Fair Trade Authority:** https://www.gov.il/en/departments/the_israel_consumer_protection_and_fair_trade_authority

---

*End of audit document. Last updated 2026-05-08 by Claude (AI assistant). For questions about this document, contact <contact@vocaband.com>. For legal advice, consult a licensed Israeli attorney.*
