# Vocaband — Sub-processors

> List of every third-party service that processes Vocaband data, what
> they do with it, where it's hosted, and what category of data they
> see.  Maintained per Israeli Privacy Protection Regulations 2017 §
> 9 and as a public-facing trust artifact for schools / parents / the
> Ministry of Education vendor questionnaire.
>
> Source of truth: `src/config/privacy-config.ts → THIRD_PARTY_REGISTRY`.
> If you spot a difference between this doc and the source code, the
> source code wins — file an issue and we'll re-sync.

> Last updated 2026-05-22.

---

## Definitions

- **Processor** — handles data ONLY on Vocaband's instructions.  Does
  not use the data for its own purposes.
- **Independent controller** — receives data and uses it for its own
  purposes (e.g. Google for OAuth identity).
- **Hosting region** — physical location of the data centre processing
  the data.  Where the data is "stored" for legal-jurisdiction purposes.

---

## Active sub-processors

### 1. Supabase

| Field | Value |
|---|---|
| Type | Processor |
| Purpose | PostgreSQL database, authentication, file storage, real-time subscriptions, row-level security enforcement |
| Data categories | User profiles (email, display name, avatar), class data, assignments, progress scores, audit logs, OAuth + session tokens, uploaded vocabulary lists, generated audio file references |
| Hosting region | **EU (Frankfurt, Germany)** — `eu-central-1` |
| Endpoint | `auth.vocaband.com` (custom domain in front of `*.supabase.co`) |
| Encryption at rest | AES-256 |
| Sub-processor agreement | Supabase DPA available at https://supabase.com/legal/dpa |
| Access by Vocaband staff | Founder + 1 engineer via dashboard MFA |

### 2. Fly.io

| Field | Value |
|---|---|
| Type | Processor |
| Purpose | Application server hosting (REST API, WebSocket server for live game challenges, OCR + AI translation endpoints) |
| Data categories | HTTP requests (IP, User-Agent), live challenge scores in transit (in-memory only — never written to disk), OCR uploaded images (in-memory only — discarded after processing) |
| Hosting region | **EU (Amsterdam, NL)** — `ams` region |
| Endpoint | `api.vocaband.com` → `vocaband.fly.dev` |
| Encryption at rest | N/A — no data persisted on Fly.io |
| Sub-processor agreement | Fly.io DPA available at https://fly.io/legal/dpa |
| Access by Vocaband staff | Founder via Fly CLI + browser dashboard MFA |

### 3. Cloudflare

| Field | Value |
|---|---|
| Type | Processor |
| Purpose | DNS, CDN for static assets, TLS termination, DDoS mitigation, Workers (request routing), Web Analytics (privacy-friendly, no cookies) |
| Data categories | HTTP request metadata (IP, User-Agent, geolocation country), TLS handshake metadata; CDN-cached static assets do NOT contain personal data |
| Hosting region | **Global edge network** — request handled by nearest PoP (typically EU PoPs for EU users) |
| Endpoint | `vocaband.com`, `*.vocaband.com` |
| Encryption at rest | N/A — no data persisted by Cloudflare |
| Sub-processor agreement | Cloudflare DPA at https://www.cloudflare.com/en-gb/cloudflare-customer-dpa/ |
| Access by Vocaband staff | Founder via dashboard MFA |

### 4. Google OAuth (independent controller)

| Field | Value |
|---|---|
| Type | **Independent controller** for the OAuth handshake itself; processor for the email + display name passed back to Vocaband |
| Purpose | Teacher authentication via Google Sign-In |
| Data categories | Teacher's Google email address, display name, OAuth ID + refresh tokens |
| Hosting region | Google global infrastructure |
| Endpoint | `accounts.google.com` |
| User opt-in | Explicit — teacher chooses Google sign-in (alternative is email + OTP) |
| Notes | Google's own privacy practices apply to the OAuth flow itself (their cookies, their device fingerprinting). Vocaband only sees what Google returns in the ID token. |

### 5. Anthropic (Claude API)

| Field | Value |
|---|---|
| Type | Processor (zero-retention for API tier) |
| Purpose | Generate context-appropriate example sentences for vocabulary words; AI lesson builder text generation |
| Data categories | Vocabulary words (no personal data), generation parameters (difficulty level, language pair); responses sent back to teacher |
| Hosting region | US (Anthropic API) |
| Endpoint | `api.anthropic.com` |
| Trigger | Only on explicit teacher action (clicking "Generate sentences" or "AI lesson builder") |
| Notes | Anthropic API tier has zero-retention policy — prompts and responses are not stored beyond the request lifetime, not used for model training. See https://privacy.anthropic.com |

### 6. Google Cloud (Gemini API)

| Field | Value |
|---|---|
| Type | Processor |
| Purpose | Server-side OCR of teacher-uploaded vocabulary list images |
| Data categories | Uploaded image bytes (typically a worksheet photo containing only English words) |
| Hosting region | **Google-global** — AI Studio API endpoint is NOT regionally pinned. Migration to Vertex AI Gemini in `europe-west` is on the operator roadmap (see `docs/operator-tasks.md`). |
| Endpoint | `generativelanguage.googleapis.com` (AI Studio API) |
| Trigger | Only on explicit teacher action (uploading an image to extract vocabulary) |
| Notes | **API tier note (2026-05-23, audit H-5):** the current integration uses the AI Studio API key (`aistudio.google.com/apikey`).  Under Google's Pay-As-You-Go terms (billing enabled), prompts are not used for product improvement / model training.  Under the free tier, they may be.  Operator must keep billing enabled in the GCP project to honour the no-training disclosure in this row.  Image bytes are sent over HTTPS and discarded by Google after the API returns the extracted text; not stored on Vocaband infrastructure. |

### 7. Google Cloud (Text-to-Speech API)

| Field | Value |
|---|---|
| Type | Processor |
| Purpose | Generate MP3 audio for vocabulary words (runtime fallback for teacher-uploaded custom words; batch generator for the base 9,159-word corpus) |
| Data categories | The vocabulary word itself (no personal data — only the cleaned English string that gets synthesised) |
| Hosting region | Google-global (the public `texttospeech.googleapis.com/v1` endpoint is not regionally pinned) |
| Endpoint | `texttospeech.googleapis.com` |
| Trigger | Teacher action (custom-word audio generation) or operator action (corpus regeneration via `scripts/generate-audio.ts`) |
| Sub-processor agreement | Google Cloud DPA at https://cloud.google.com/terms/data-processing-addendum |
| Notes | Synthesised MP3 is stored in the Supabase `sound` bucket and served to students; cleared from Google's side after synthesis. Uses the same `GOOGLE_AI_API_KEY` that powers Gemini OCR — no separate service-account JSON. |

### 8. Sentry

| Field | Value |
|---|---|
| Type | Processor |
| Purpose | Application error tracking and performance monitoring (browser SPA + Node server) |
| Data categories | JavaScript error messages and stack traces (scrubbed by `src/utils/scrubPii.ts` before send — emails, JWTs, Bearer tokens, Supabase keys removed); browser metadata (User-Agent, viewport, URL path); user UID when authenticated (no email, no name — only the opaque UUID, attached via `Sentry.setUser`); session-replay snippets (DOM masked, inputs masked) when the user has not opted out |
| Hosting region | **EU (Germany)** — DSN points at `*.ingest.de.sentry.io` |
| Endpoint | `o*.ingest.de.sentry.io`, `browser.sentry-cdn.com` (for lazy-loaded replay integration) |
| Encryption at rest | Sentry-managed (AES-256) |
| Sub-processor agreement | Sentry DPA at https://sentry.io/legal/dpa/ |
| Access by Vocaband staff | Founder via Sentry dashboard MFA |
| Notes | EU-region DSN means error telemetry never crosses to the US. The PII scrubber runs in Sentry's `beforeSend` hook server-side (`server.ts`) and client-side (`src/core/sentry.ts`) so any incidental email / token / key in an error payload is redacted before it leaves the user's browser or our server. Session-replay is lazy-loaded after first paint and DOM-masked by default. |

### 9. Google Fonts

| Field | Value |
|---|---|
| Type | Processor |
| Purpose | Web font delivery (Plus Jakarta Sans, Heebo, Be Vietnam Pro, Fredoka) |
| Data categories | HTTP request metadata (IP, User-Agent, Referer) when the browser fetches the stylesheet/font files |
| Hosting region | Global |
| Endpoint | `fonts.googleapis.com`, `fonts.gstatic.com` |
| Notes | Per Google's own privacy doc, font request data is logged but not used for advertising or correlated to other Google services. We may move to self-hosted fonts in a future release to remove this. |

---

## Inactive / removed sub-processors

| Service | When removed | Why |
|---|---|---|
| Render | 2026-Q1 | Migrated server hosting to Fly.io (better EU presence) |
| Cloudflare R2 | Never connected | Considered for asset storage; ended up using Supabase Storage instead |
| Tesseract.js (in-process) | Replaced by Gemini OCR (better accuracy) | — |

---

## International transfer register (GDPR Chapter V + Schrems II)

All **persistent** data stays inside the EU (Supabase Frankfurt,
Fly.io Amsterdam, Sentry Germany).  The table below covers every
**transit-only** transfer outside the EEA — what legal mechanism
authorises it, where to verify, and the result of the per-vendor
Transfer Impact Assessment (TIA).  Schools doing GDPR Art. 28
procurement review can use this table as the canonical answer.

Source of truth: `src/config/privacy-config.ts → THIRD_PARTY_REGISTRY[i].transfer`.

| Vendor | Destination | Mechanism | Verify | DPA | TIA risk | Last reviewed |
|---|---|---|---|---|---|---|
| Cloudflare | United States (EU PoPs serve EU traffic) | **EU-US DPF** | [DPF list](https://www.dataprivacyframework.gov/s/participant-search/participant-detail?id=a2zt00000000K2GFAA0) | [DPA](https://www.cloudflare.com/en-gb/cloudflare-customer-dpa/) | Low | 2026-05-22 |
| Google OAuth | United States | **EU-US DPF** | [DPF list](https://www.dataprivacyframework.gov/s/participant-search/participant-detail?id=a2zt000000001L5AAI) | [DPA](https://cloud.google.com/terms/data-processing-addendum) | Medium (auth identity) | 2026-05-22 |
| Anthropic (Claude API) | United States | **EU-US DPF** (zero-retention API tier) | [DPF list](https://www.dataprivacyframework.gov/s/participant-search/participant-detail?id=a2zt0000000GnZyAAK) | [DPA](https://www.anthropic.com/legal/dpa) | Low (no personal data sent — vocabulary words only) | 2026-05-22 |
| Google Cloud (Gemini API) | Google-global (AI Studio API endpoint; US parent entity) | **EU-US DPF** | [DPF list](https://www.dataprivacyframework.gov/s/participant-search/participant-detail?id=a2zt000000001L5AAI) | [DPA](https://cloud.google.com/terms/data-processing-addendum) | Low (vocabulary words + image bytes only; no student PII in payload) | 2026-05-23 |
| Google Cloud (Text-to-Speech API) | Google-global (no regional pin) | **Not required** (no personal data — only vocabulary words) | [DPF list](https://www.dataprivacyframework.gov/s/participant-search/participant-detail?id=a2zt000000001L5AAI) | [DPA](https://cloud.google.com/terms/data-processing-addendum) | Low | 2026-05-22 |
| Sentry | EU (Germany) | **Adequacy** (intra-EEA via `*.ingest.de.sentry.io`) | [Sentry data residency](https://sentry.io/legal/dpa/) | [DPA](https://sentry.io/legal/dpa/) | Low (PII scrubbed pre-send) | 2026-05-22 |
| Google Fonts | Google global edge | **EU-US DPF** | [DPF list](https://www.dataprivacyframework.gov/s/participant-search/participant-detail?id=a2zt000000001L5AAI) | [Privacy doc](https://developers.google.com/fonts/faq/privacy) | Low (no personal data — IP + UA only on RTL pages) | 2026-05-22 |

For Israeli users, the EU is an "adequate" jurisdiction under both
EU GDPR (Israel ↔ EU adequacy) and Israeli Privacy Protection Law
5741-1981.  No additional safeguards required for Israel → EU
transfers.

### TIA risk legend

- **Low** — no special-category data, encrypted in transit, vendor has
  organisational safeguards, no realistic surveillance exposure given
  the payload.
- **Medium** — some personal data (email, identity), but vendor has
  supplementary measures (DPF certification, encryption at rest,
  documented sub-processor list, breach SLAs).
- **High** — sensitive personal data; would require additional
  controller-side measures (e.g. column-level encryption).  None of
  the active vendors are in this tier today.

---

## Subprocessor change history

The newest entry is at the top.  Append-only — git history is the
audit trail.  Driven by the `SUBPROCESSOR_CHANGELOG` array in
`src/config/privacy-config.ts`.

| Date | Vendor | Change | Description |
|---|---|---|---|
| 2026-05-23 | Google Cloud (Gemini API) | Region & mechanism corrected | Honest verification (audit H-5): the AI Studio API endpoint is Google-global, NOT regionally pinned to `europe-west` as previously published.  Transfer mechanism reclassified from "EU adequacy (intra-EEA)" to "EU-US DPF".  TIA risk unchanged (low — image bytes / vocabulary words, no student PII).  Vertex AI region-pinned migration tracked in `docs/operator-tasks.md`. |
| 2026-05-22 | Google Cloud (Text-to-Speech API) | Added | Disclosed as a distinct entry (previously implicit under the Google Cloud Gemini row). |
| 2026-05-22 | Sentry | Added | Disclosed for the first time.  Active since launch but undeclared until the C-9 audit pass; DSN points at the EU (Germany) region. |
| 2026-05-04 | Render | Removed | Migrated application server to Fly.io (Amsterdam) for better EU presence. |
| 2026-05-04 | Tesseract.js (in-process) | Removed | Replaced by Google Cloud Gemini OCR for better accuracy. |
| 2026-05-04 | Cloudflare | Added | Added on initial sub-processor list publication. |
| 2026-05-04 | Fly.io | Added | Added on initial sub-processor list publication. |
| 2026-05-04 | Anthropic (Claude API) | Added | Added on initial sub-processor list publication. |
| 2026-05-04 | Google Cloud (Gemini API) | Added | Added on initial sub-processor list publication. |
| 2026-05-04 | Google Fonts | Added | Added on initial sub-processor list publication. |

---

## Subscribe to subprocessor changes

Schools and parents who want **prior notice of any subprocessor
addition or material change** can subscribe by emailing
**[privacy@vocaband.com](mailto:privacy@vocaband.com)** with subject
line `SUBSCRIBE`.  Vocaband commits to **at least 30 days' notice
before activating a new subprocessor** that handles personal data,
mirroring the change-notification clauses common to enterprise SaaS
DPAs.  No-cost; unsubscribe with `UNSUBSCRIBE` to the same address.

For automated monitoring (CI / procurement tooling), watch this file
in the repository — every change is committed and visible in git
history.

---

## Adding a new sub-processor

1. Add an entry to `src/config/privacy-config.ts → THIRD_PARTY_REGISTRY`,
   including the `transfer` block if the destination is outside the EEA.
2. Append a row to `SUBPROCESSOR_CHANGELOG` (and to the change-history
   table in this doc).
3. Send the ≥30-day notice to every address on the privacy@ subscriber
   list BEFORE the new processor goes live.
4. Add a row to the "Active sub-processors" section in this doc.
5. Bump `PRIVACY_POLICY_VERSION` in `privacy-config.ts` so existing
   users see the consent modal again.
6. Update `src/components/PublicPrivacyPage.tsx` if the new processor
   should be called out by name in the privacy policy.
7. If the new processor is in a non-EU/non-Israel jurisdiction and
   processes personal data, get legal sign-off on the transfer
   mechanism BEFORE going live.

---

## Removing a sub-processor

1. Remove the entry from `THIRD_PARTY_REGISTRY`.
2. Append a "removed" row to `SUBPROCESSOR_CHANGELOG` and to the
   change-history table in this doc.
3. Move the entry from "Active" to "Inactive / removed" with the
   removal date.
4. Bump `PRIVACY_POLICY_VERSION`.
5. Confirm with `npm run build` that no code still imports the removed
   processor's SDK / endpoint.

---

## Verification queries

```sql
-- Confirm only the listed connect-src origins appear in production CSP.
-- Anything additional means a sub-processor was added without doc update.
SELECT 1; -- placeholder; CSP enforcement happens at Cloudflare, see public/_headers
```

```bash
# List every external HTTPS origin reachable from the client bundle.
# Output should match the "Active sub-processors" section above.
grep -ohE 'https?://[a-z0-9.-]+\.(com|co|io|cloud|app)' \
  src/**/*.ts src/**/*.tsx 2>/dev/null \
  | sort -u
```
