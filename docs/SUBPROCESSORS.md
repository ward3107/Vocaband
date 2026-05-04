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

> Last updated 2026-05-04.

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
| Hosting region | EU (Google Cloud `europe-west` region) |
| Endpoint | `generativelanguage.googleapis.com` |
| Trigger | Only on explicit teacher action (uploading an image to extract vocabulary) |
| Notes | Image is sent over HTTPS and discarded after the API returns the extracted text. Not stored on Vocaband infrastructure. |

### 7. Google Fonts

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

## Cross-border transfers

All persistent data lives in the EU (Frankfurt for Supabase, Amsterdam
for Fly.io request handling).  Transfers from EU → US occur only for:

- **Anthropic API calls** when a teacher uses AI features.  Anthropic
  is a US company; transfer covered by their EU SCCs.
- **Google OAuth handshake** when a teacher signs in with Google.
  Google is a US company; transfer covered by EU-US Data Privacy
  Framework (Google is certified).

For Israeli users, EU is an "adequate" jurisdiction under both EU
GDPR (Israel ↔ EU adequacy) and Israeli Privacy Protection Law.

---

## Adding a new sub-processor

1. Add an entry to `src/config/privacy-config.ts → THIRD_PARTY_REGISTRY`.
2. Add a row to this doc.
3. Bump `PRIVACY_POLICY_VERSION` in `privacy-config.ts` so existing
   users see the consent modal again.
4. Update `src/components/PublicPrivacyPage.tsx` if the new processor
   should be called out by name in the privacy policy.
5. If the new processor is in a non-EU/non-Israel jurisdiction and
   processes personal data, get legal sign-off on the transfer
   mechanism BEFORE going live.

---

## Removing a sub-processor

1. Remove the entry from `THIRD_PARTY_REGISTRY`.
2. Move the entry from "Active" to "Inactive / removed" above with the
   removal date.
3. Bump `PRIVACY_POLICY_VERSION`.
4. Confirm with `npm run build` that no code still imports the removed
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
