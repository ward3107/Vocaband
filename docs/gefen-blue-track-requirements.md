# Gefen (גפ"ן) — Blue Track Vendor Requirements

> How to get Vocaband listed as an approved program in the Israeli Ministry of
> Education's **מאגר התוכניות והמענים** via the **Blue Track (מסלול כחול)** — the
> year-round, non-tender path.
>
> This is a **business/compliance track, not an engineering task.** No code
> unlocks it. Keep the live action items in `docs/operator-tasks.md`; this file
> is the reference.
>
> ⚠️ Procedures change every school year (תשפ"ו at time of writing). Verify
> against the official MoE supplier guide before each submission, and have a
> lawyer review the legal declarations. Sources are listed at the bottom.

---

## 0. The two tracks (so you know where Blue sits)

| | 🔵 Blue (מסלול כחול) | 🟢 Green (מסלול ירוק / מכרז) |
|---|---|---|
| When | **Open year-round** | Only during an active tender window |
| Barrier | Low | High (תנאי סף, ~60 tender sections, lawyer docs) |
| Funding | School pays directly from its own budget | Main Gefen budget allocation |
| Purpose | Get **listed** so schools *can* choose you | Win a place in the funded catalogue |
| Rule | If rejected here, you **cannot** go Green | Must have passed Blue first |

**Start with Blue.** It is the realistic entry point and a prerequisite for Green.

---

## 1. Hard prerequisite — a registered Israeli business

You **cannot** be a Gefen supplier as a private individual / employed teacher.
You must operate through one of:

- **עוסק פטור** (exempt dealer) — simplest, but has an annual revenue ceiling.
- **עוסק מורשה** (licensed dealer) — typical for a real product business.
- **חברה בע"מ** (Ltd company) — best if taking school payments at scale / raising money.
- **עמותה** (nonprofit) — only if structured as one.

> **Action:** Decide the entity and open it (accountant + ~1 day at רשם / מע"מ).
> This is step zero — nothing else can start without it.

Required business paperwork you'll reference throughout:
- תעודת עוסק / תעודת התאגדות (registration certificate)
- אישור ניהול ספרים (book-keeping approval) — from your accountant
- אישור ניכוי מס במקור (tax-deduction-at-source approval)
- Bank account details for the business (for school payments)

---

## 2. Register as a supplier + request to add a program

Submit the **"בקשת הרשאה להוספת תוכנית חדשה"** (request for permission to add a
new program) through the MoE registry portal:

`https://apps4.education.gov.il/tyh.extension.net/public/addBakashatHarshaa`

What this step establishes:
- Your **supplier identity** in the system (tied to the business entity above).
- Permission to then build and upload the program record.

> Note: A school **cannot** legally work with any supplier that is not in this
> registry — so this is non-negotiable, even for one friendly school.

---

## 3. Build the program record (the תוכנית)

Frame Vocaband as a **structured English-vocabulary program**, not "an app."
The MoE evaluates a *pedagogical program* that happens to be delivered digitally.

Fields/content to prepare:
- **Program name** (HE) + short and long descriptions.
- **Target population** — grades 4–9 (matches MoE vocabulary Sets 1–3).
- **Subject / סל / תת-סל** — map it to the correct basket and sub-basket
  (English / language enrichment / digital learning — confirm exact bucket).
- **Pedagogical rationale** — learning objectives, alignment to the MoE English
  curriculum and the official vocabulary sets, HE/AR translation support.
- **Scope & format** — hours, delivery model (self-paced + teacher dashboard),
  whether it's student licenses, teacher tool, or both.
- **Outcomes / measurement** — XP, progress analytics, what a teacher sees.
- **Pricing** — per-student / per-class / per-school. Schools pay this directly
  on the Blue track, so set a clear, defensible price.
- **Geographic service area** — where you can operate (start: Haifa / חיפה).

> Choose the track (**Blue**) at upload. You **cannot switch tracks later** for
> that program record, so choose deliberately.

---

## 4. The document that actually approves a Blue-track program: a school letter

This is the Blue track's defining requirement. Because there's no tender to
vouch for you, **a school vouches for you instead.**

When you submit with no active tender, the request goes to status
**"הוחזר לארגון"** (returned to organization). You then reply by email with a
**school intent letter (מכתב/אישור בית ספר)**. That letter must contain:

- Statement of interest in the **specific** program.
- **Program number** and **supplier (business) name**.
- **School name + institutional symbol (סמל מוסד)**.
- **Principal's signature**.
- **Official school stamp (חותמת)**.

**Sample wording (HE):**
> "אנו מעוניינים לעבוד עם התוכנית [שם], מספר [X], בבית ספרנו.
> [שם מנהל/ת, חתימה, סמל מוסד וחותמת רשמית]."

> **Your advantage:** you teach at **עירוני א' חיפה**. A signed letter from your
> own principal (or another Haifa school) is the single most important document
> to line up early. Get this **before** you submit so you can reply immediately.

---

## 5. Threshold conditions (תנאי סף)

The Blue track is **lighter** than Green, but expect these to surface — and they
become mandatory if you later go for the Green tender:

- **Academic** — program developers/operators generally need at least a
  **bachelor's degree (תואר ראשון)** in the relevant field (English / education
  qualifies you here).
- **Recommendations** — typically **~3 recommendations** from pedagogical bodies
  about the program (Green track; gather them early regardless).
- **Certificates & declarations** — clean-business declarations, possibly
  **lawyer-signed** legal documents.

---

## 6. Information security & student-data (DON'T skip — minors involved)

The commercial/pedagogical approval above does **not** by itself authorize
handling pupil data. Because Vocaband processes **minors' data**, a **separate**
MoE compliance layer applies:

- **Privacy / data-protection** — alignment with the MoE's student-privacy rules
  (חוזר מנכ"ל on הגנת הפרטיות) and a **data-processing agreement (DPA)**; under
  GDPR the school/MoE is the controller and Vocaband is the processor.
- **Information-security standard** — the MoE's infosec requirements for ed-tech
  vendors (audit / declaration).
- **הזדהות אחידה (unified identification)** — the national SSO. This is the
  *sanctioned* way to receive **verified student identities** (the original
  "can we auto-build the roster" question). It is its **own** technical +
  security review, granted by the MoE — not unlocked by a Blue listing alone.

> The exact current infosec spec + הזדהות אחידה onboarding steps still need to be
> confirmed with the MoE — treat as a parallel track. See `operator-tasks.md`.

---

## 7. Staying in the catalogue (ongoing)

- Blue-track programs that get **feedback below a weighted score of 60** are
  **removed** from the database — quality of delivery matters after listing.
- If a supplier is rejected by the tender committee or has all programs removed,
  they **cannot** submit on Blue until the underlying reason is resolved (plus a
  dedicated request to the אגף שירות לציבור ותהליכי שותפות).

---

## 8. Checklist (Blue track, in order)

- [ ] Open a registered business entity (עוסק מורשה / חברה בע"מ)
- [ ] Gather business docs (עוסק cert, ניהול ספרים, ניכוי מס, bank details)
- [ ] Secure a signed **school intent letter** from עירוני א' חיפה (or another school)
- [ ] Submit **בקשת הרשאה להוספת תוכנית חדשה** in the MoE portal
- [ ] Build the program record (pedagogy, grades 4–9, Sets 1–3, pricing, area) → choose **Blue**
- [ ] On "הוחזר לארגון", reply by email with the school letter
- [ ] Confirm program gets its identification number / goes active
- [ ] Open the **infosec + privacy + הזדהות אחידה** track in parallel
- [ ] Keep delivery quality up (avoid <60 feedback score)

---

## Contacts

- Support line: **`*6552`**, extension **2**
- Educational services email: **maanim@education.gov.il**

## Sources

- [ספקי גפ"ן — מערכת גפ"ן של משרד החינוך](https://mygefen.co.il/)
- [איך נרשמים לגפ"ן — הרשמה, הגשה ושיווק](https://mygefen.co.il/help/)
- [מדריך גפ"ן לספקי מאגר התוכניות (משרד החינוך, PDF)](https://meyda.education.gov.il/files/PortalBaaluyot/POB/guide-gefen-sapakim.pdf)
- [מדריך גפ"ן לספקים — מעודכן תשפ"ו (PDF)](https://meyda.education.gov.il/files/edu-hub/sherut/M_gefensap_dec.pdf)
- [מאגר ספקי תכניות ומענים — מנהל הרכש הממשלתי](https://mr.gov.il/ilgstorefront/he/p/4000549730)
- [מאגר התוכניות והמענים החינוכיים — פורטל רשויות ובעלויות](https://pob.education.gov.il/edu-info/educational-programs/)
