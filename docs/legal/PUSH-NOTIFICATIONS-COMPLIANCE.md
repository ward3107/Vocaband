# Push Notifications — Compliance Package (Obligatory Papers)

> ⚠️ **DRAFT — pending legal review.** Mirrors the format of the existing
> `RoPA.md`, `DPIA-EXECUTIVE-SUMMARY-*.md`, and `SUBPROCESSORS.md`. An
> Israeli privacy lawyer + DPO must ratify every section below **before**
> the first real push notification is sent. Nothing here is published to a
> regulator or a school until that sign-off.
>
> Scope: the push-notification feature designed in
> `docs/PUSH-NOTIFICATIONS-DESIGN.md`. Subjects are **minors** (grades
> 4–9), so this is treated as **high-risk processing** end-to-end.
>
> Frameworks covered: Israeli Privacy Protection Law **Amendment 13** +
> **Regulations 2017**, **GDPR** (EU-hosted data), **Communications Law
> §30A** (anti-spam), Google Play **Data Safety**, Apple **Privacy
> Nutrition Label**. Created 2026-06-22.

---

## Paper 0 — Legal basis & framing

| Question | Answer |
|---|---|
| **Is push "marketing"?** | **No.** Phase-1 pushes are strictly **functional/transactional** (a new assignment exists, a reward was granted, a live challenge is starting). They are not advertising. Any future re-engagement/marketing push to minors is **prohibited** and out of scope. |
| **Legal basis for the *processing*** | Performance of the educational contract / school authorisation — GDPR Art. 6(1)(b), consistent with the existing student-account RoPA entry. The school authorises on the child's behalf under the §25/COPPA-style model. |
| **Legal basis for the *channel* (sending to the device)** | **Explicit, separate opt-in consent** captured in `consent_log`, versioned by `PUSH_CONSENT_VERSION`. Consent is independent from, and revocable without affecting, the underlying account. |
| **§30A (Israeli anti-spam)** | Functional notifications are not "דבר פרסומת". Opt-in + functional-only keeps us clear. Marketing pushes would require their own opt-in and are excluded. |
| **Withdrawal** | One tap in Privacy Settings → row soft-deleted (`revoked_at`), consent withdrawal logged in `consent_log`. No dark patterns. |

---

## Paper 1 — DPIA Addendum (push notifications)

> Extends `docs/DPIA-TECHNICAL.md` and the bilingual
> `DPIA-EXECUTIVE-SUMMARY-*` set. Required because this is **new
> processing of children's data introducing a new device identifier** —
> GDPR Art. 35(3) / Reg 2017 risk-assessment duty.
>
> **Template basis (official sources):** structured on GDPR **Art. 35(7)(a–d)**
> (the four mandatory DPIA elements) and the **ICO Age-Appropriate Design
> Code ("Children's Code") DPIA template**, which adds the child-specific
> sections below (best interests of the child, age/development ranges,
> consultation, standards conformance). See the source links at the end of
> this paper.

### 1.0 Best interests of the child (Children's Code — primary consideration)

The best interests of the child are the **primary consideration**, per the UN
Convention on the Rights of the Child (UNCRC) as applied by the ICO Children's
Code. Assessment for this feature:

- **Benefit to the child:** a timely, low-effort cue that schoolwork is waiting
  — supports the child's right to education/development without requiring them
  to keep checking the app.
- **Developmental harm avoided:** the design **bans** the patterns most harmful
  to minors — no streak/guilt nudges, no countdowns, no loss-framing, no
  behavioural re-engagement, no advertising. Push is **additive** to the in-app
  badge (the default), never the only path.
- **Autonomy & control:** the child (and their school/parent) chooses whether to
  turn it on; one tap turns it off. Consent is separate from the account and
  revocable without losing access.
- **Conclusion:** on balance the feature serves the child's best interests *only*
  while the functional-only / PII-free / quiet-hours constraints hold; if any
  were relaxed, this assessment must be redone.

### 1.1 Nature, scope, context, purpose
- **Nature:** store a per-device push subscription; send VAPID-signed,
  PII-free messages via Google/Apple/Mozilla push services to the device.
- **Scope:** opted-in students only; functional messages only.
- **Context:** minors, school setting, multilingual (he/ar/en).
- **Purpose:** timely awareness of teacher-assigned work.

### 1.2 Necessity & proportionality
- Notifications are **opt-in**, **functional-only**, **PII-free**, and
  **frequency-capped with quiet hours (both enforced server-side in code)** —
  the least intrusive design that meets the purpose. In-app badge remains the
  default; push is additive.

### 1.3 Risks & mitigations
| Risk to the child | Mitigation |
|---|---|
| Device token is a persistent identifier | Stored under RLS, visible only to the owning student + the service-role sender; **teachers cannot read it**; soft-deleted on opt-out/expiry. |
| PII leaking through third-party push services | Payload carries **no name/class/score** — generic localized text; details fetched only post-authentication. |
| Over-notification / pressure on a child | **Enforced server-side:** quiet hours 20:00–07:00 (Asia/Jerusalem) — no pushes sent during the child's night — and a daily per-student cap (default 5; counts the notification event, not per device). **No** streak/guilt nudges. The in-app badge still shows everything; only the device buzz is gated. |
| Unsolicited contact (anti-spam) | Functional-only + explicit opt-in; marketing excluded. |
| Cross-border transfer (US push services) | Google/Apple covered by EU-US **DPF** + SCCs; only opaque token + PII-free payload transit. |
| Manipulative design toward minors | No countdowns, no loss-framing, no behavioural re-engagement in Phase 1. |

### 1.4 Residual risk
**Low**, conditional on the mitigations above and lawyer ratification.

### 1.5 Age ranges & developmental needs (Children's Code)

Vocaband serves **grades 4–9 (typically ages ~9–15)**. The Children's Code asks
that processing account for differing ages and capacities:

- The opt-in pre-prompt uses **plain, kid-readable language** in the child's own
  language (en/he/ar/ru) — see Paper 4 — not legal copy.
- The notification content is identical and minimal for all ages (one short
  functional line); there is no age-targeted or behaviour-targeted messaging.
- Because the message is functional-only and PII-free, the risk profile does not
  materially differ across the 9–15 band; no age-gated variation is required for
  this feature beyond the readable consent copy.

### 1.6 Consultation with children & parents (Children's Code)

The Code expects consultation with children/parents, *or* a recorded
justification where it is disproportionate:

- **Planned:** lightweight consultation with the pilot-class teacher(s) and, via
  them, a small number of parents — does the opt-in wording make sense to a child;
  is the off-switch findable. Record the outcome here before wide rollout.
- **Proportionality note:** Vocaband is an early-stage small team; full-scale
  user research is disproportionate at this stage. The mitigation is the
  conservative default (push OFF, functional-only, PII-free) plus the school
  authorisation model (Paper 5), which keeps a parent/school veto in place.
- **DPO action:** confirm whether the regulator expects formal consultation
  given the pilot size, and record the decision + date here at sign-off.

### 1.7 Children's-Code standards conformance (summary)

How this feature meets the Code's relevant standards (the lawyer should confirm
each):

| Standard | How the push feature conforms |
|---|---|
| Best interests of the child | §1.0 above — primary consideration documented. |
| Data protection impact assessments | This paper. |
| Age-appropriate application | §1.5 — readable consent copy in 4 languages; uniform minimal message. |
| Transparency | Paper 4 pre-prompt + Paper 7 privacy-policy text, child-readable. |
| Detrimental use of data | Functional-only; marketing to minors prohibited. |
| Data minimisation | Opaque endpoint only; **no name/class/score** in payload. |
| Default settings / data sharing | Push **OFF by default**; endpoint shared only with the transit router; teachers cannot read it. |
| Nudge techniques | **No** streak/guilt nudges, countdowns, or loss-framing. |
| Online tools (right to exercise) | One-tap off in Privacy Settings → subscription deleted + consent withdrawal logged. |

### 1.8 Official source templates this paper follows

- **GDPR Art. 35** (DPIA content + when required) — https://gdpr-info.eu/art-35-gdpr/
- **GDPR Art. 30** (records, used in Paper 2 RoPA) — https://gdpr-info.eu/art-30-gdpr/
- **ICO DPIA guidance + template** — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/
- **ICO Children's Code DPIA template (Annex D)** — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/annex-d-dpia-template/
- **ICO Children's Code — the 15 standards** — https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/faqs-on-the-15-standards-of-the-children-s-code/

> **Israel note:** Vocaband's primary regulator is the Israeli **Privacy
> Protection Authority** (Amendment 13 + Regulations 2017). Israel has EU
> adequacy, so this GDPR/ICO-structured DPIA is accepted as the basis; the
> Israeli lawyer should confirm any Reg-2017-specific wording at sign-off.

---

## Paper 2 — RoPA entry (paste into `docs/legal/RoPA.md` §2 after sign-off)

### Activity N — Push-notification delivery to opted-in students

| GDPR Art. 30 field | Value |
|---|---|
| **Purpose** | Notify a student on their device that their teacher has assigned new work / a reward / a live challenge. |
| **Categories of data subjects** | Students (minors) who have explicitly opted in. |
| **Categories of personal data** | Push subscription endpoint (opaque URL), client public key (`p256dh`), auth secret, device label (UX only), language, consent version + timestamps. No name/score in transit. |
| **Categories of recipients** | Supabase (EU-Frankfurt, storage). Push transit: **Google FCM**, **Apple APNs** (when iOS lands), **Mozilla autopush** — message routers only. |
| **Third-country transfer + safeguards** | Token + PII-free payload transit to Google/Apple (US); EU-US **DPF** + **SCCs**. |
| **Time limit for erasure** | Until opt-out or endpoint expiry (410), then soft-deleted; hard-purged with the account via `delete_my_account` / orphan cleanup. |
| **Security measures** | RLS (owner-only; teachers excluded); VAPID-signed sends from `server.ts` under service-role key; no PII in payload; quiet hours + caps; audit-log entry on opt-in/opt-out. |
| **Legal basis** | Processing: Art. 6(1)(b) educational contract / school authorisation. Channel: explicit opt-in consent (`PUSH_CONSENT_VERSION`), revocable. |

---

## Paper 3 — Sub-processor entries (paste into `docs/SUBPROCESSORS.md` + sync `THIRD_PARTY_REGISTRY`)

### Google — Firebase Cloud Messaging (FCM)
| Field | Value |
|---|---|
| Type | Processor (message transit only) |
| Purpose | Route push notifications to Android/Chrome devices |
| Data categories | Opaque push endpoint, PII-free notification payload in transit |
| Hosting region | Google global (US-routed); EU-US **DPF** certified |
| Sub-processor agreement | Google Cloud DPA / DPF |
| Notes | Receives **no** student name, class, or score |

### Apple — Apple Push Notification service (APNs) *(only when iOS Phase 4 ships)*
| Field | Value |
|---|---|
| Type | Processor (message transit only) |
| Purpose | Route push to installed iOS PWAs / native app |
| Data categories | Opaque device token, PII-free payload in transit |
| Hosting region | Apple global (US-routed); **DPF** certified |

### Mozilla — autopush *(Firefox endpoints)*
| Field | Value | 
|---|---|
| Type | Processor (message transit only) |
| Purpose | Route push to Firefox; PII-free payload |

> ⚠️ Per `SUBPROCESSORS.md` rule, `src/config/privacy-config.ts →
> THIRD_PARTY_REGISTRY` is the source of truth and must be updated **before**
> the first production push.

---

## Paper 4 — Consent copy (opt-in pre-prompt), all four languages

> Shown in the contextual pre-prompt **before** the browser permission API
> is called. Mirrors the trilingual+RU pattern in `legalTranslations.ts`.
> Acceptance writes to `consent_log` with `PUSH_CONSENT_VERSION`.

**English**
> **Get a ping when your teacher sends a task?**
> We'll notify you on this device when your teacher posts a new assignment,
> sends a reward, or starts a live challenge. Nothing else — no ads. You can
> turn this off anytime in Privacy Settings. [Not now] [Yes, notify me]

**עברית**
> **לקבל התראה כשהמורה שולח משימה?**
> נודיע לך במכשיר הזה כשהמורה מוסיף משימה חדשה, שולח פרס, או מתחיל אתגר חי.
> שום דבר אחר — בלי פרסומות. אפשר לכבות בכל רגע בהגדרות הפרטיות.
> [לא עכשיו] [כן, עדכנו אותי]

**العربية**
> **هل تريد تنبيهًا عندما يرسل معلمك مهمة؟**
> سننبهك على هذا الجهاز عندما ينشر معلمك مهمة جديدة أو يرسل مكافأة أو يبدأ
> تحديًا مباشرًا. لا شيء آخر — بدون إعلانات. يمكنك إيقاف ذلك في أي وقت من
> إعدادات الخصوصية. [ليس الآن] [نعم، أبلغني]

**Русский**
> **Получать уведомление, когда учитель отправляет задание?**
> Мы уведомим вас на этом устройстве о новом задании, награде или начале
> живого соревнования. Больше ничего — никакой рекламы. Отключить можно в
> любой момент в настройках конфиденциальности. [Не сейчас] [Да, уведомлять]

---

## Paper 5 — Parental / school transparency notice

Because subjects are minors, opt-in alone is not the whole story — the
**school authorisation model** governs:
- The push capability is disclosed in the **privacy sheet** handed to
  schools/parents (`public/docs/privacy-sheet-*.pdf`) and the **DPA**
  (`docs/legal/DPA-*.md`) before a class enables it.
- A child's opt-in does **not** override a school/parent opt-out: if a
  school disables push for its classes (admin setting / DPA annex), the
  pre-prompt is never shown to those students.
- Plain-language line for the parent sheet: *"If your child turns it on,
  the app can send a notification to their device when their teacher posts
  work. It never includes your child's name or scores, contains no
  advertising, and can be switched off at any time."*

---

## Paper 6 — Store disclosures

### Google Play — Data Safety form deltas
- **Data type:** "Device or other IDs" → push subscription endpoint.
- **Collected:** Yes. **Shared:** Yes (Google FCM as transit processor).
- **Purpose:** App functionality (notifications). **Optional:** Yes (opt-in).
- **Encrypted in transit:** Yes. **User can request deletion:** Yes.
- Confirm **"Designed for Families"** notification rules: functional-only,
  no ad/marketing pushes to children.

### Apple — Privacy Nutrition Label deltas *(Phase 4 / iOS)*
- **Identifiers → Device ID:** used for **App Functionality**, **not** linked
  to identity for tracking, **not** used for tracking.

---

## Paper 7 — Privacy policy snippet (add to `public/privacy.html` + `PublicPrivacyPage.tsx`)

> **Notifications.** If you choose to turn on notifications, we store a
> push "subscription" for your device so we can alert you when your teacher
> assigns new work, sends a reward, or starts a live challenge. These
> messages are delivered through your browser/operating system's push
> service (e.g. Google) and **never contain your name, class, or scores**.
> We send only functional notifications — never advertising. You can turn
> notifications off at any time in Privacy Settings, which deletes the
> stored subscription for that device.

---

## Sign-off ledger (fill on ratification)
| Item | Owner | Status | Date |
|---|---|---|---|
| DPIA addendum ratified | DPO + lawyer | ☐ | |
| RoPA entry merged | DPO | ☐ | |
| `SUBPROCESSORS.md` + `THIRD_PARTY_REGISTRY` updated | engineering | ☐ | |
| Privacy policy + version bump | engineering + lawyer | ☐ | |
| Google Play Data Safety updated | operator | ☐ | |
| Apple label updated (iOS phase) | operator | ☐ | |
| School DPA annex / opt-out wired | operator + engineering | ☐ | |
