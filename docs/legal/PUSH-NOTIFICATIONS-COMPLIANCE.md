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

### 1.1 Nature, scope, context, purpose
- **Nature:** store a per-device push subscription; send VAPID-signed,
  PII-free messages via Google/Apple/Mozilla push services to the device.
- **Scope:** opted-in students only; functional messages only.
- **Context:** minors, school setting, multilingual (he/ar/en).
- **Purpose:** timely awareness of teacher-assigned work.

### 1.2 Necessity & proportionality
- Notifications are **opt-in**, **functional-only**, **PII-free**, and
  **frequency-capped** with quiet hours — the least intrusive design that
  meets the purpose. In-app badge remains the default; push is additive.

### 1.3 Risks & mitigations
| Risk to the child | Mitigation |
|---|---|
| Device token is a persistent identifier | Stored under RLS, visible only to the owning student + the service-role sender; **teachers cannot read it**; soft-deleted on opt-out/expiry. |
| PII leaking through third-party push services | Payload carries **no name/class/score** — generic localized text; details fetched only post-authentication. |
| Over-notification / pressure on a child | Quiet hours 20:00–07:00, daily cap, burst coalescing; **no streak/guilt nudges** (default OFF). |
| Unsolicited contact (anti-spam) | Functional-only + explicit opt-in; marketing excluded. |
| Cross-border transfer (US push services) | Google/Apple covered by EU-US **DPF** + SCCs; only opaque token + PII-free payload transit. |
| Manipulative design toward minors | No countdowns, no loss-framing, no behavioural re-engagement in Phase 1. |

### 1.4 Residual risk
**Low**, conditional on the mitigations above and lawyer ratification.

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
