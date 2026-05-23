# Records of Processing Activities (RoPA) — Vocaband

> ⚠️ **DRAFT — pending legal review.**  This RoPA was generated
> as part of the 2026-05-22 edtech-compliance audit (C-5).  An
> Israeli privacy lawyer + DPO should ratify the entries below
> before publishing it to a regulator.

| Language | מסמך / المستند / Документ |
|---|---|
| English | (this document) |
| עברית | Section headers are bilingual; row content is identical across languages. |
| العربية | عناوين الأقسام ثنائية اللغة؛ محتوى الصفوف مماثل عبر اللغات. |
| Русский | Заголовки разделов двуязычные; содержание строк идентично на всех языках. |

GDPR Article 30 requires every controller and processor to maintain
a Record of Processing Activities ("RoPA").  Israeli Privacy
Protection Regulations 2017 § 5 require an equivalent "Specification
of Processing Operations" ("פירוט מאגרי המידע ופעולות העיבוד").
This single document covers both.

- **Authoritative source of truth:** `src/config/privacy-config.ts`
  (`DATA_CONTROLLER`, `DATA_PROTECTION_OFFICER`, `RETENTION_PERIODS`,
  `THIRD_PARTY_REGISTRY`, `DATA_COLLECTION_POINTS`).
- **Last reviewed:** 2026-05-22.
- **Next review:** annually + on any material change to the data
  flows.

---

## §1. Controller / Processor identity / זהות הבקר / هوية المتحكم / Идентичность контролера

| Field / שדה / حقل / Поле | Value |
|---|---|
| **Controller** (בעל המאגר / المتحكم / Контролер) | Vocaband Educational Technologies, Israel |
| **DPO** (ממונה / المسؤول / DPO) | See `src/config/privacy-config.ts → DATA_PROTECTION_OFFICER`. Public contact: `privacy@vocaband.com`, response SLA 24 h. |
| **Joint controller(s)** | None at the time of writing.  When a school signs the DPA (`docs/legal/DPA-en.md`) the school is the Controller for student data and Vocaband is the Processor; for teacher OAuth identity Google is an independent controller for the handshake (see SUBPROCESSORS.md). |
| **Representative in EU** | Not yet appointed; mandatory under GDPR Art. 27 once we onboard our first EU-resident school.  Operator task. |

---

## §2. Processing activities / פעולות עיבוד / أنشطة المعالجة / Деятельность по обработке

Each row below is one processing activity.  Source: the
`DATA_COLLECTION_POINTS` array in `src/config/privacy-config.ts`,
cross-referenced with the operational flows in
`docs/DATA_FLOW.md`.

### Activity 1 — Student account creation and authentication

| GDPR Art. 30 field | Value |
|---|---|
| **Purpose** | Identify a student within their class so that progress can be attributed to the right learner and the teacher's gradebook stays correct. |
| **Categories of data subjects** | Students (minors, ages 9–15 typically; full range 6–18 supported). |
| **Categories of personal data** | `display_name` (free text, ≤30 chars), `class_code` (the join credential), `avatar` (emoji), synthetic internal email (`student-<uuid>@class-<code>.vocaband.local` — never delivered to a real inbox). |
| **Categories of recipients** | Supabase (EU-Frankfurt) as processor.  Cloudflare (EU PoP) as a transit processor.  Within the platform: the student themselves, the class teacher, and the school administrator if appointed. |
| **Third-country transfer + safeguards** | None for this activity (all storage EU; Cloudflare DPF-certified for transit metadata only). |
| **Time limit for erasure** | Indefinite while account is active.  Orphaned student accounts (no class membership) are deleted after `RETENTION_PERIODS.orphanedStudentDays` (90 days) by `cleanup_expired_data`.  On user request, deletion is immediate via `delete_my_account`. |
| **Security measures** | RLS (`users_select` / `users_insert` / `users_update` policies in `supabase/schema.sql`); session JWT verified locally by JWKS (`server.ts`); rate-limited login (`student_sign_in_rate`); audit-log entry on every login. |
| **Legal basis** | Performance of an educational contract between the school and Vocaband (GDPR Art. 6(1)(b)); school authorisation under the COPPA/§25 school-authorisation model pending the C-1+C-8 parental-rights work. |

### Activity 2 — Teacher authentication

| GDPR Art. 30 field | Value |
|---|---|
| **Purpose** | Authenticate the teacher and bind them to their classes + gradebook. |
| **Categories of data subjects** | Teachers (adults). |
| **Categories of personal data** | `email`, `display_name`, OAuth ID + refresh tokens (where Google OAuth is used). |
| **Categories of recipients** | Supabase (storage); Google (OAuth handshake; independent controller for the handshake itself); Sentry (error tracking, scrubbed). |
| **Third-country transfer + safeguards** | Google OAuth: EU-US DPF certified (see SUBPROCESSORS.md row for verification URL).  Sentry: EU region (`*.ingest.de.sentry.io`), no third-country transfer. |
| **Time limit for erasure** | Indefinite while account is active.  On user request: immediate via `delete_my_account`. |
| **Security measures** | Allowlisted email (`teacher_allowlist`); JWKS-verified JWTs; MFA on operator-side Supabase / Fly / Cloudflare consoles (teacher MFA is finding H-1, not yet shipped). |
| **Legal basis** | Performance of the school's contract with Vocaband; legitimate interest in authenticating staff. |

### Activity 3 — Student progress and gradebook

| GDPR Art. 30 field | Value |
|---|---|
| **Purpose** | Record game-mode scores so a teacher can see who learned what and a student can see their own growth. |
| **Categories of data subjects** | Students. |
| **Categories of personal data** | `score`, `mode`, `mistakes` (per-word), `completed_at`, `avatar`. |
| **Categories of recipients** | Supabase (storage). The student themselves, the class teacher, and the school administrator if appointed.  No third party. |
| **Third-country transfer + safeguards** | None — EU only. |
| **Time limit for erasure** | `RETENTION_PERIODS.progressRecordsDays` (365 days post-assignment-completion) by `cleanup_expired_data`; immediate on user request via `delete_my_account`. |
| **Security measures** | `progress_select` RLS (student sees own; teacher sees own classes; admin sees all); audit-log entry on bulk reads by teachers/admins; daily backups + offsite weekly `pg_dump` in R2. |
| **Legal basis** | Performance of educational contract. |

### Activity 4 — Live in-class challenge

| GDPR Art. 30 field | Value |
|---|---|
| **Purpose** | Real-time multi-student vocabulary competition led by the teacher; gives the class a live leaderboard. |
| **Categories of data subjects** | Students (anonymous Quick-Play participants OR enrolled students). |
| **Categories of personal data** | `display_name`, `uid`, `class_code`, live score, latency telemetry. |
| **Categories of recipients** | Fly.io (in-memory only, never written to disk).  Optional Upstash Redis for multi-VM broadcasts (if `REDIS_URL` is configured; today single-VM). |
| **Third-country transfer + safeguards** | None — Fly.io EU-Amsterdam. |
| **Time limit for erasure** | In-memory only.  TTL configured per session; on session end the WebSocket state is dropped.  Score-only persistence (no PII) optionally written to `progress` if the teacher confirms at end-of-game. |
| **Security measures** | JWT re-verified every 5 min during socket lifetime; per-event payload validation in `server-utils.ts`; rate-limited score submissions. |
| **Legal basis** | Performance of educational contract; explicit teacher action initiates the session. |

### Activity 5 — Teacher-initiated AI features (OCR / sentence generation / lesson builder / Bagrut)

| GDPR Art. 30 field | Value |
|---|---|
| **Purpose** | Reduce the teacher's prep time by generating example sentences, extracting vocabulary from photographs of textbooks, generating reading-comprehension lessons, and generating Bagrut-style exercises. |
| **Categories of data subjects** | None directly (payloads are vocabulary words, teacher-uploaded image bytes, generation parameters). |
| **Categories of personal data** | None directly.  Image bytes may incidentally contain personal data if the teacher photographs something that includes student names — risk mitigated by teacher instruction ("upload word lists, not student work") + the image is discarded by the AI vendor after OCR returns the extracted text. |
| **Categories of recipients** | Anthropic (sentence + lesson + Bagrut); Google Cloud Gemini (OCR); Google Cloud Text-to-Speech (audio).  Per-vendor DPA + DPF status in `docs/SUBPROCESSORS.md`. |
| **Third-country transfer + safeguards** | Anthropic: EU-US DPF + zero-retention API tier.  Google Cloud Gemini: regionally pinned to `europe-west` (intra-EEA adequacy).  Google Cloud TTS: Google-global, no personal data sent (only the vocabulary word). |
| **Time limit for erasure** | Vendor side: zero retention per the relevant DPAs.  Vocaband side: AI feature usage counters retained for the configured `RETENTION_PERIODS.progressRecordsDays` (365 days). |
| **Security measures** | Triggered only on explicit teacher action; per-user rate limiting via `ai_usage_counters` + Express middleware; prompt-injection regex on free-text inputs (`server.ts`); output schema validation via the Gemini `responseSchema` / Claude tool calls. |
| **Legal basis** | Performance of educational contract; explicit teacher action. |

### Activity 6 — Consent management

| GDPR Art. 30 field | Value |
|---|---|
| **Purpose** | Record acceptance / rejection of the Privacy Policy and Terms; gate non-essential cookies + Sentry behind consent. |
| **Categories of data subjects** | All authenticated users (teachers and students). |
| **Categories of personal data** | `uid`, `policy_version`, `terms_version`, `action` (accept/withdraw), `recorded_at`. |
| **Categories of recipients** | Supabase (storage). |
| **Third-country transfer + safeguards** | None — EU only. |
| **Time limit for erasure** | `RETENTION_PERIODS.consentLogDays` (10 years) by `cleanup_expired_data`.  Long retention is a deliberate compliance choice — consent records must be producible on regulator request long after a user leaves. |
| **Security measures** | RLS (`consent_log_insert` / `consent_log_select`); record is append-only by policy (not by trigger — the immutability trigger is on `audit_log`, not `consent_log`). |
| **Legal basis** | Legal obligation (Israeli Privacy Protection Law Amendment 13 + GDPR Art. 7(1) accountability). |

### Activity 7 — Security audit logging

| GDPR Art. 30 field | Value |
|---|---|
| **Purpose** | Record privacy-sensitive actions (data export, account deletion, role changes, gradebook bulk reads) for accountability and incident investigation. |
| **Categories of data subjects** | All authenticated users (as actor and/or target). |
| **Categories of personal data** | `actor_uid`, `target_uid`, `action`, `data_category`, `metadata` (JSON; PII-scrubbed where possible). |
| **Categories of recipients** | Supabase (storage); operator (read-only via service-role); on subject access request the user (via `export_my_data`'s `audit_log_as_actor` + `audit_log_as_target` sections). |
| **Third-country transfer + safeguards** | None — EU only. |
| **Time limit for erasure** | `audit_retention_days` parameter to `cleanup_expired_data`, default 730 days (2 years). |
| **Security measures** | Append-only by database trigger (`audit_log_forbid_update`, `audit_log_forbid_delete` — migration `20260518120000`); RLS scopes reads to the actor or admin; immutability status exposed by `audit_log_immutability_status()` RPC for uptime monitoring. |
| **Legal basis** | Legal obligation (Israeli Privacy Protection Regulations 2017 § 8); legitimate interest (security operations). |

### Activity 8 — Error telemetry (Sentry)

| GDPR Art. 30 field | Value |
|---|---|
| **Purpose** | Detect, diagnose, and fix bugs that affect students and teachers. |
| **Categories of data subjects** | Any user whose session emitted an error. |
| **Categories of personal data** | Stack traces (scrubbed by `src/utils/scrubPii.ts` for emails, JWTs, Bearer tokens, Supabase secrets); browser metadata (UA, viewport, URL path); user `uid` when authenticated (no email, no name — only the opaque UUID, set via `Sentry.setUser`); optional session-replay snippet (DOM masked, inputs masked) when the user has not opted out. |
| **Categories of recipients** | Sentry (EU-Germany region — `*.ingest.de.sentry.io`). |
| **Third-country transfer + safeguards** | None — EU only. |
| **Time limit for erasure** | Sentry retention configured at vendor default (90 days for errors, 30 days for replays); on user deletion the UID-keyed events become unlinkable (the `uid` no longer maps to any current user). |
| **Security measures** | Telemetry gated behind explicit `analytics: true` cookie consent; pre-Sentry error buffer caps at 10 events; PII scrubber runs in `beforeSend` AND on console output (`installScrubbingConsole`); session-replay lazy-loaded after first paint. |
| **Legal basis** | Legitimate interest in product reliability + explicit user consent (analytics cookies). |

---

## §3. Cross-references / הפניות / مراجع / Перекрёстные ссылки

- **Sub-processor list** (Art. 28 disclosures + international
  transfer register): `docs/SUBPROCESSORS.md`.
- **Risk register** (per Israeli Reg 2017 § 6): `docs/RISK-REGISTER.md`.
- **DPIA** (per GDPR Art. 35 / Israeli Reg 2017 § 9):
  `docs/DPIA-TECHNICAL.md` (engineering version) + `docs/legal/DPIA-EXECUTIVE-SUMMARY-{en,he,ar,ru}.md` (procurement-facing version).
- **Incident-response runbook** (per Art. 33–34 / Reg 2017 § 11):
  `docs/INCIDENT-RESPONSE.md`.
- **Information security policy** (per Reg 2017 § 4):
  `docs/INFORMATION-SECURITY-POLICY.md`.
- **DPA template** (per Art. 28 contracts with schools):
  `docs/legal/DPA-{en,he,ar,ru}.md`.
- **Data subject rights implementation** (Art. 15 + Art. 17):
  `supabase/migrations/20260522020000_expand_export_and_delete.sql`
  + `src/views/PrivacySettingsView.tsx`.

---

## §4. Maintenance / תחזוקה / صيانة / Сопровождение

- **Review cadence:** annual baseline review + ad-hoc on any
  material change to the architecture, the data model, or the
  sub-processor list.
- **Authoritative source:** when this file diverges from
  `src/config/privacy-config.ts`, the config file wins — the next
  reviewer regenerates the affected rows here.
- **Owner:** Founder + DPO (single individual at time of writing —
  see `INCIDENT-RESPONSE.md → "Roles + contact"` for backup).
