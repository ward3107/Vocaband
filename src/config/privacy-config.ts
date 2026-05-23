// =============================================================================
// Privacy & Compliance Configuration
// =============================================================================
// This file serves as the single source of truth for privacy-related metadata.
// Update these values when legal arrangements, hosting regions, or third-party
// processors change.  The privacy policy, in-app disclosures, and compliance
// documentation all derive from this file.
// =============================================================================

// ---------------------------------------------------------------------------
// 1. Legal roles
// ---------------------------------------------------------------------------

export const DATA_CONTROLLER = {
  name: "Vocaband",  // Legal entity name
  country: "Israel",
  contactEmail: "contact@vocaband.com",       // Amendment 13 accountability contact
  legalEmail: "contact@vocaband.com",         // Legal inquiries
} as const;

// ─── Data Protection Officer (ממונה על הגנת הפרטיות) ──────────────
// Public contact for privacy questions, data-subject rights requests
// (export / delete / rectify), and breach notifications.
//
// Required to be public-facing under תיקון 13 (Privacy Protection
// Law Amendment 13, 2025).  The role can be filled by the founder
// for a small company — no separate hire needed at this stage.
//
// `name` is shown in the privacy page so a regulator / parent can
// verify a real human is accountable.  Use the full legal name as
// it would appear on a חוזה / business registration.
//
// `email` is the dedicated privacy address.  Aliasing it to the
// founder's main inbox is fine; just make sure it's monitored on
// the 24h SLA published in INCIDENT-RESPONSE.md.
export const DATA_PROTECTION_OFFICER = {
  name: "Waseem Abu Akel",   // ⚠️ EDIT THIS before merging
  role: "Founder & Data Protection Officer",
  email: "privacy@vocaband.com",              // alias forwards to founder's inbox
  responseSlaHours: 24,
} as const;

// ---------------------------------------------------------------------------
// 2. Privacy policy versioning
// ---------------------------------------------------------------------------

// Bumped 2026-05-22 — added Sentry (EU region) and Google Cloud
// Text-to-Speech.  Sentry was active but undeclared (audit finding
// C-9); Text-to-Speech was implicit under the Gemini entry but is
// a distinct API and warranted its own row.  Bumping triggers the
// consent re-prompt so existing users see the updated disclosure list
// before continuing.
export const PRIVACY_POLICY_VERSION = "2026-05-22";  // Version 2.2 - Sentry + Google TTS disclosed
export const TERMS_VERSION = "2026-05-22";            // Version 2.2 - bumped alongside privacy version

// ---------------------------------------------------------------------------
// 3. Hosting regions (for cross-border transfer disclosures)
// ---------------------------------------------------------------------------

export const HOSTING_REGIONS = {
  supabase: "EU (Frankfurt) — eu-central-1",
  flyio: "EU (Amsterdam) — ams",
  cloudflare: "Global edge network",
  googleAuth: "Global (US-anchored)",
  anthropic: "United States",
  // Gemini OCR currently runs on the AI Studio API
  // (generativelanguage.googleapis.com), which is NOT regionally
  // pinned — see audit finding H-5 (2026-05-23) and the operator
  // task "Migrate Gemini to Vertex AI" in docs/operator-tasks.md
  // for the region-pinned + no-training migration plan.  Text-to-
  // Speech is also Google-global on the public v1 endpoint.
  googleCloud: "Google-global (AI Studio API; not regionally pinned — migration to Vertex AI EU pending)",
  googleFonts: "Global edge network",
  sentry: "EU (Germany) — *.ingest.de.sentry.io",
} as const;

// ---------------------------------------------------------------------------
// 4. Data processors / third-party registry
// ---------------------------------------------------------------------------

export interface ThirdPartyEntry {
  name: string;
  purpose: string;
  dataCategories: string[];
  processorOnly: boolean;
  hostingRegion: string;
  endpoint: string;
  notes?: string;
  /**
   * Transfer-mechanism metadata.  Required for any vendor that
   * processes EU/UK personal data outside the EEA — without it the
   * transfer is unlawful under GDPR Chapter V + Schrems II.  Schools
   * doing procurement review will check this for every subprocessor.
   *
   * Vendors that only operate inside the EU (Supabase Frankfurt,
   * Fly.io Amsterdam, Sentry Germany) leave this `undefined` — there
   * is no cross-border transfer to authorise.
   */
  transfer?: TransferInfo;
}

export interface TransferInfo {
  /** Country / region the data is exposed to. */
  destination: string;
  /**
   * The lawful transfer mechanism under GDPR Art. 45-49.
   * - `dpf`           — vendor is certified under the EU-US Data Privacy Framework
   * - `scc`           — Standard Contractual Clauses (2021/914)
   * - `adequacy`      — destination has an EU adequacy decision
   * - `consent`       — Art. 49(1)(a) explicit consent (last-resort)
   * - `not-required`  — payload contains no personal data
   */
  mechanism: "dpf" | "scc" | "adequacy" | "consent" | "not-required";
  /** Public URL where the certification / clauses can be verified. */
  verificationUrl: string;
  /** Link to the vendor's published Data Processing Agreement / Addendum. */
  dpaUrl: string;
  /**
   * Transfer Impact Assessment (TIA) outcome.
   * - `low`        — minimal personal data, encrypted in transit, no surveillance exposure
   * - `medium`     — some personal data, vendor has additional safeguards (sub-processors, encryption at rest)
   * - `high`       — sensitive personal data; supplementary measures required (encryption + access controls)
   */
  tiaRisk: "low" | "medium" | "high";
  /** ISO date (YYYY-MM-DD) the transfer mechanism was last verified. */
  lastReviewed: string;
}

/**
 * Exhaustive registry of every external service the app communicates with.
 * Any new SDK or API MUST be added here before use — see PRIVACY_CHECKLIST.md.
 *
 * Source of truth for both the in-app Privacy Settings panel AND the
 * public privacy page table.  When this list changes, also update
 * `docs/SUBPROCESSORS.md` and bump `PRIVACY_POLICY_VERSION` so the
 * consent re-prompt fires.
 */
export const THIRD_PARTY_REGISTRY: ThirdPartyEntry[] = [
  {
    name: "Supabase",
    purpose: "PostgreSQL database, authentication, row-level security, file storage, real-time subscriptions",
    dataCategories: ["user profiles", "class data", "assignments", "progress scores", "audit logs", "auth tokens", "uploaded vocabulary lists"],
    processorOnly: true,
    hostingRegion: HOSTING_REGIONS.supabase,
    endpoint: "*.supabase.co (custom domain auth.vocaband.com)",
  },
  {
    name: "Fly.io",
    purpose: "Application server hosting (REST API, WebSocket server, OCR + AI translation endpoints)",
    dataCategories: ["HTTP requests (IP, User-Agent)", "live challenge scores (in-memory only — never written to disk)", "OCR uploaded images (in-memory only — discarded after processing)"],
    processorOnly: true,
    hostingRegion: HOSTING_REGIONS.flyio,
    endpoint: "api.vocaband.com (vocaband.fly.dev)",
  },
  {
    name: "Cloudflare",
    purpose: "DNS, CDN, TLS termination, DDoS mitigation, Workers (request routing), privacy-friendly Web Analytics (no cookies)",
    dataCategories: ["HTTP request metadata (IP, User-Agent, geolocation country)", "TLS handshake metadata"],
    processorOnly: true,
    hostingRegion: HOSTING_REGIONS.cloudflare,
    endpoint: "vocaband.com, *.vocaband.com",
    transfer: {
      destination: "United States (parent entity); EU PoPs handle EU traffic",
      mechanism: "dpf",
      verificationUrl: "https://www.dataprivacyframework.gov/s/participant-search/participant-detail?id=a2zt00000000K2GFAA0",
      dpaUrl: "https://www.cloudflare.com/en-gb/cloudflare-customer-dpa/",
      tiaRisk: "low",
      lastReviewed: "2026-05-22",
    },
  },
  {
    name: "Google OAuth",
    purpose: "Teacher authentication via Google Sign-In (alternative path to email + OTP)",
    dataCategories: ["email address", "display name", "OAuth ID + refresh tokens"],
    processorOnly: false,
    hostingRegion: HOSTING_REGIONS.googleAuth,
    endpoint: "accounts.google.com",
    notes: "Google acts as an INDEPENDENT controller for the OAuth handshake itself; processor for the email + display name passed back to Vocaband",
    transfer: {
      destination: "United States (Google LLC)",
      mechanism: "dpf",
      verificationUrl: "https://www.dataprivacyframework.gov/s/participant-search/participant-detail?id=a2zt000000001L5AAI",
      dpaUrl: "https://cloud.google.com/terms/data-processing-addendum",
      tiaRisk: "medium",
      lastReviewed: "2026-05-22",
    },
  },
  {
    name: "Anthropic (Claude API)",
    purpose: "AI sentence generation for vocabulary worksheets and AI lesson builder",
    dataCategories: ["vocabulary words (no personal data)", "generation parameters (difficulty level, language pair)"],
    processorOnly: true,
    hostingRegion: HOSTING_REGIONS.anthropic,
    endpoint: "api.anthropic.com",
    notes: "Triggered only on explicit teacher action.  Anthropic API tier has zero-retention policy — prompts and responses are not stored beyond the request lifetime, not used for model training. https://privacy.anthropic.com",
    transfer: {
      destination: "United States (Anthropic PBC)",
      mechanism: "dpf",
      verificationUrl: "https://www.dataprivacyframework.gov/s/participant-search/participant-detail?id=a2zt0000000GnZyAAK",
      dpaUrl: "https://www.anthropic.com/legal/dpa",
      tiaRisk: "low",
      lastReviewed: "2026-05-22",
    },
  },
  {
    name: "Google Cloud (Gemini API)",
    purpose: "Server-side OCR of teacher-uploaded vocabulary list images (replaces previous in-process Tesseract.js)",
    dataCategories: ["uploaded image bytes (typically a worksheet photo containing only English words)"],
    processorOnly: true,
    hostingRegion: HOSTING_REGIONS.googleCloud,
    endpoint: "generativelanguage.googleapis.com (AI Studio API)",
    notes: "Triggered only on explicit teacher action.  Image discarded after the API returns the extracted text; not stored on Vocaband infrastructure.  CURRENT TIER (2026-05-23): AI Studio API via aistudio.google.com — Google's Pay-As-You-Go terms apply when billing is enabled in the GCP project; the free tier may use prompts for product improvement and model training.  Operator action: verify the project's billing status and enable Pay-As-You-Go before processing any data the audit cycle has not blessed for free-tier disclosure.  Migration to Vertex AI Gemini (region-pinned, no-training contract) is tracked at docs/operator-tasks.md.",
    transfer: {
      destination: "Google-global (AI Studio API endpoint; US parent entity)",
      mechanism: "dpf",
      verificationUrl: "https://www.dataprivacyframework.gov/s/participant-search/participant-detail?id=a2zt000000001L5AAI",
      dpaUrl: "https://cloud.google.com/terms/data-processing-addendum",
      tiaRisk: "low",
      lastReviewed: "2026-05-23",
    },
  },
  {
    name: "Google Cloud (Text-to-Speech API)",
    purpose: "Server-side generation of MP3 audio for vocabulary words (used both as a runtime fallback for teacher-uploaded custom words and as a batch generator for the base 9,159-word corpus)",
    dataCategories: ["English vocabulary words (no personal data) — the cleaned text string sent to the synthesis API"],
    processorOnly: true,
    hostingRegion: "Google-global (texttospeech.googleapis.com is not regionally pinned for the public v1 endpoint)",
    endpoint: "texttospeech.googleapis.com",
    notes: "Triggered on teacher action (custom-word audio) or on operator action (corpus regeneration via scripts/generate-audio.ts).  No user data is sent — only the vocabulary word itself.  Generated MP3 is stored in the Supabase `sound` bucket and served to students; cleared from Google after synthesis.",
    transfer: {
      destination: "Google-global (United States parent entity)",
      mechanism: "not-required",
      verificationUrl: "https://www.dataprivacyframework.gov/s/participant-search/participant-detail?id=a2zt000000001L5AAI",
      dpaUrl: "https://cloud.google.com/terms/data-processing-addendum",
      tiaRisk: "low",
      lastReviewed: "2026-05-22",
    },
  },
  {
    name: "Sentry",
    purpose: "Application error tracking and performance monitoring (browser SPA + Node server)",
    dataCategories: ["JavaScript error messages and stack traces (scrubbed by `src/utils/scrubPii.ts` before send: emails, JWTs, Bearer tokens, Supabase keys removed)", "browser metadata (User-Agent, viewport, URL path)", "user UID when authenticated (no email, no name — only the opaque UUID, attached via Sentry.setUser)", "session-replay snippets (DOM masked, inputs masked) when the user has not opted out"],
    processorOnly: true,
    hostingRegion: HOSTING_REGIONS.sentry,
    endpoint: "o*.ingest.de.sentry.io, browser.sentry-cdn.com",
    notes: "Sentry DSN points to the EU region (Germany) — no transatlantic transfer for error telemetry.  Before-send scrubber redacts PII on every event payload server-side (server.ts) and client-side (src/core/sentry.ts).  Sentry DPA at https://sentry.io/legal/dpa/.  Session-replay is gated by user-consent and lazy-loaded after first paint to honour the 'no telemetry before interaction' guarantee.",
  },
  {
    name: "Google Fonts",
    purpose: "Web font delivery (Heebo + Fredoka — Hebrew/Arabic only)",
    dataCategories: ["HTTP request metadata (IP, User-Agent, Referer) when the browser fetches font files"],
    processorOnly: false,
    hostingRegion: HOSTING_REGIONS.googleFonts,
    endpoint: "fonts.googleapis.com, fonts.gstatic.com",
    notes: "Latin fonts (Plus Jakarta Sans + Be Vietnam Pro) were self-hosted in the 2026-05-19 follow-up to PR #787 — they no longer touch Google.  Heebo + Fredoka are still loaded from Google Fonts but only when the visitor's language is HE or AR (lazy-injected by boot-debug.js).  Per Google's privacy doc, font request data is logged but not used for advertising or correlated to other Google services.  Self-hosting the RTL fonts is the next step.",
    transfer: {
      destination: "Google global edge network (US parent entity)",
      mechanism: "dpf",
      verificationUrl: "https://www.dataprivacyframework.gov/s/participant-search/participant-detail?id=a2zt000000001L5AAI",
      dpaUrl: "https://developers.google.com/fonts/faq/privacy",
      tiaRisk: "low",
      lastReviewed: "2026-05-22",
    },
  },
];

// ---------------------------------------------------------------------------
// 4b. Subprocessor change history (audit-loggable changes since launch)
// ---------------------------------------------------------------------------

export interface SubprocessorChange {
  /** ISO date (YYYY-MM-DD) the change was published. */
  date: string;
  vendor: string;
  /** Nature of the change.  Schools can subscribe to be notified of these. */
  changeType: "added" | "removed" | "region_changed" | "scope_changed" | "mechanism_changed";
  description: string;
}

/**
 * Chronological log of every material change to THIRD_PARTY_REGISTRY.
 * Used to populate the public "Subprocessor Change History" table in
 * docs/SUBPROCESSORS.md and to honour the 30-day prior-notice promise
 * to schools subscribed via privacy@vocaband.com.
 *
 * Newest entry first.  Append (never edit) so the audit trail is
 * tamper-evident under standard git-history inspection.
 */
export const SUBPROCESSOR_CHANGELOG: SubprocessorChange[] = [
  { date: "2026-05-23", vendor: "Google Cloud (Gemini API)", changeType: "region_changed", description: "Honest verification (audit H-5): the AI Studio API endpoint is Google-global, NOT regionally pinned to europe-west as previously published. Transfer mechanism reclassified from intra-EEA adequacy to EU-US DPF. Migration to Vertex AI in europe-west remains the roadmap target." },
  { date: "2026-05-22", vendor: "Google Cloud (Text-to-Speech API)", changeType: "added", description: "Disclosed as a distinct entry (previously implicit under the Google Cloud Gemini row)." },
  { date: "2026-05-22", vendor: "Sentry", changeType: "added", description: "Disclosed for the first time. Active since launch but undeclared until the C-9 audit pass; DSN points at the EU (Germany) region." },
  { date: "2026-05-04", vendor: "Render", changeType: "removed", description: "Migrated application server to Fly.io (Amsterdam) for better EU presence." },
  { date: "2026-05-04", vendor: "Tesseract.js (in-process)", changeType: "removed", description: "Replaced by Google Cloud Gemini OCR for better accuracy." },
  { date: "2026-05-04", vendor: "Cloudflare", changeType: "added", description: "Added on initial sub-processor list publication." },
  { date: "2026-05-04", vendor: "Fly.io", changeType: "added", description: "Added on initial sub-processor list publication." },
  { date: "2026-05-04", vendor: "Anthropic (Claude API)", changeType: "added", description: "Added on initial sub-processor list publication." },
  { date: "2026-05-04", vendor: "Google Cloud (Gemini API)", changeType: "added", description: "Added on initial sub-processor list publication." },
  { date: "2026-05-04", vendor: "Google Fonts", changeType: "added", description: "Added on initial sub-processor list publication." },
];

/**
 * Public mailing-list address schools can subscribe to in order to
 * receive ≥30-day prior notice of any subprocessor addition or
 * material change.  Mirrors the change-notification promises common
 * to enterprise SaaS DPAs.  Routes to the DPO inbox.
 */
export const SUBPROCESSOR_NOTIFICATION_EMAIL = DATA_PROTECTION_OFFICER.email;
export const SUBPROCESSOR_NOTIFICATION_LEAD_TIME_DAYS = 30;

// ---------------------------------------------------------------------------
// 5. Data collection points map
// ---------------------------------------------------------------------------

export interface DataCollectionPoint {
  location: string;
  fields: string[];
  purpose: string;
  mandatory: boolean;
  role: "student" | "teacher" | "both";
}

export const DATA_COLLECTION_POINTS: DataCollectionPoint[] = [
  {
    location: "Student login form",
    fields: ["display_name", "class_code"],
    purpose: "Identify student within a class for assignments and progress tracking",
    mandatory: true,
    role: "student",
  },
  {
    location: "Google OAuth (teacher login)",
    fields: ["email", "display_name"],
    purpose: "Authenticate teachers and create teacher accounts",
    mandatory: true,
    role: "teacher",
  },
  {
    location: "Anonymous sign-in (student)",
    fields: ["uid (auto-generated anonymous ID)"],
    purpose: "Create authenticated session for database access (RLS)",
    mandatory: true,
    role: "student",
  },
  {
    location: "Assignment completion / score save",
    fields: ["score", "mode", "mistakes", "completed_at", "avatar"],
    purpose: "Track student progress and enable teacher gradebook",
    mandatory: true,
    role: "student",
  },
  {
    location: "Live challenge (Socket.IO)",
    fields: ["display_name", "uid", "class_code", "live score"],
    purpose: "Real-time leaderboard during class competitions",
    mandatory: false,
    role: "student",
  },
  {
    location: "Avatar / theme selection",
    fields: ["avatar", "active_theme", "unlocked_avatars", "unlocked_themes"],
    purpose: "Gamification personalization",
    mandatory: false,
    role: "student",
  },
  {
    location: "XP and badges",
    fields: ["xp", "streak", "badges", "power_ups"],
    purpose: "Gamification rewards",
    mandatory: false,
    role: "student",
  },
  {
    location: "OCR image upload (teacher)",
    fields: ["image file (processed client-side, never stored)"],
    purpose: "Extract vocabulary words from textbook photos",
    mandatory: false,
    role: "teacher",
  },
  {
    location: "CSV / XLSX / DOCX upload (teacher)",
    fields: ["file content (parsed client-side for word extraction, never stored)"],
    purpose: "Import vocabulary lists",
    mandatory: false,
    role: "teacher",
  },
  {
    location: "Google Sheets import (teacher)",
    fields: ["Google Sheets URL"],
    purpose: "Import vocabulary from a public spreadsheet",
    mandatory: false,
    role: "teacher",
  },
];

// ---------------------------------------------------------------------------
// 6. Retention periods (configurable by legal)
// ---------------------------------------------------------------------------

export const RETENTION_PERIODS = {
  /** Days to keep progress records after assignment completion */
  progressRecordsDays: 365,
  /** Days to keep orphaned student accounts (no class membership) */
  orphanedStudentDays: 90,
  /** Days to keep audit log entries */
  auditLogDays: 730, // 2 years
  /** Days to keep consent log entries (keep indefinitely — set very high) */
  consentLogDays: 3650, // 10 years
  /**
   * Minutes a Quick Play guest's local resume hint survives before being
   * silently dropped on the client.  Quick Play guests have no DB row to
   * speak of — this controls only the browser-side localStorage hint that
   * lets a student rejoin a session if the tab closed accidentally.  Set
   * by `src/utils/qpResumeHint.ts` + `src/hooks/useQuickPlayGuestState.ts`
   * (both use `90 * 60 * 1000 ms`).  Disclosure added in audit M-10
   * (2026-05-23) — previously the TTL existed but was undocumented in the
   * privacy disclosure.
   */
  quickPlayResumeHintMinutes: 90,
  /**
   * Conservative upper bound for our database provider's (Supabase) platform
   * backups (PITR / daily snapshots).  Actual retention varies by plan tier
   * (Free 7d, Pro 14d, Team 28d).  Setting 30 to safely bound the disclosure.
   */
  backupSupabasePlatformDays: 30,
  /**
   * Off-site disaster-recovery archive in Cloudflare R2 (weekly pg_dump).
   * Must match the lifecycle rule on the `vocaband-backups` R2 bucket
   * (`delete at 365 days`) — see .github/workflows/backup-supabase-weekly.yml.
   * Update both when changing.
   */
  backupOffsiteR2Days: 365,
} as const;

// ---------------------------------------------------------------------------
// 7. localStorage / sessionStorage keys used by the app
// ---------------------------------------------------------------------------

export const CLIENT_STORAGE_KEYS = {
  /** Supabase auth session (managed by Supabase SDK) */
  supabaseAuth: "sb-*-auth-token",
  /** Whether the welcome modal has been dismissed */
  welcomeSeen: "vocaband_welcome_seen",
  /** Offline progress retry queue */
  retryProgress: "vocaband_retry_*",
  /** OAuth exchange failure flag (sessionStorage, ephemeral) */
  oauthExchangeFailed: "oauth_exchange_failed",
  /** Privacy policy consent version (localStorage) */
  consentVersion: "vocaband_consent_version",
} as const;
