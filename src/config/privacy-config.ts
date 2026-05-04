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
  name: "Vocaband Educational Technologies",  // Legal entity name
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
  name: "TODO: full legal name of the DPO",   // ⚠️ EDIT THIS before merging
  role: "Founder & Data Protection Officer",
  email: "privacy@vocaband.com",              // alias forwards to founder's inbox
  responseSlaHours: 24,
} as const;

// ---------------------------------------------------------------------------
// 2. Privacy policy versioning
// ---------------------------------------------------------------------------

// Bumped 2026-05-04 — sub-processor list refreshed (Render + Tesseract
// removed; Cloudflare, Fly.io, Anthropic, Google Cloud Gemini, Google
// Fonts added).  Bumping triggers the consent re-prompt so existing
// users see the updated disclosure list before continuing.
export const PRIVACY_POLICY_VERSION = "2026-05-04";  // Version 2.1 - Amendment 13 + processor list refresh
export const TERMS_VERSION = "2026-05-04";            // Version 2.1 - bumped alongside privacy version

// ---------------------------------------------------------------------------
// 3. Hosting regions (for cross-border transfer disclosures)
// ---------------------------------------------------------------------------

export const HOSTING_REGIONS = {
  supabase: "EU (Frankfurt) — eu-central-1",
  flyio: "EU (Amsterdam) — ams",
  cloudflare: "Global edge network",
  googleAuth: "Global (US-anchored)",
  anthropic: "United States",
  googleCloud: "EU (europe-west)",
  googleFonts: "Global edge network",
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
  },
  {
    name: "Google OAuth",
    purpose: "Teacher authentication via Google Sign-In (alternative path to email + OTP)",
    dataCategories: ["email address", "display name", "OAuth ID + refresh tokens"],
    processorOnly: false,
    hostingRegion: HOSTING_REGIONS.googleAuth,
    endpoint: "accounts.google.com",
    notes: "Google acts as an INDEPENDENT controller for the OAuth handshake itself; processor for the email + display name passed back to Vocaband",
  },
  {
    name: "Anthropic (Claude API)",
    purpose: "AI sentence generation for vocabulary worksheets and AI lesson builder",
    dataCategories: ["vocabulary words (no personal data)", "generation parameters (difficulty level, language pair)"],
    processorOnly: true,
    hostingRegion: HOSTING_REGIONS.anthropic,
    endpoint: "api.anthropic.com",
    notes: "Triggered only on explicit teacher action.  Anthropic API tier has zero-retention policy — prompts and responses are not stored beyond the request lifetime, not used for model training. https://privacy.anthropic.com",
  },
  {
    name: "Google Cloud (Gemini API)",
    purpose: "Server-side OCR of teacher-uploaded vocabulary list images (replaces previous in-process Tesseract.js)",
    dataCategories: ["uploaded image bytes (typically a worksheet photo containing only English words)"],
    processorOnly: true,
    hostingRegion: HOSTING_REGIONS.googleCloud,
    endpoint: "generativelanguage.googleapis.com",
    notes: "Triggered only on explicit teacher action.  Image discarded after the API returns the extracted text; not stored on Vocaband infrastructure.",
  },
  {
    name: "Google Fonts",
    purpose: "Web font delivery (Plus Jakarta Sans, Heebo, Be Vietnam Pro, Fredoka)",
    dataCategories: ["HTTP request metadata (IP, User-Agent, Referer) when the browser fetches font files"],
    processorOnly: false,
    hostingRegion: HOSTING_REGIONS.googleFonts,
    endpoint: "fonts.googleapis.com, fonts.gstatic.com",
    notes: "Per Google's privacy doc, font request data is logged but not used for advertising or correlated to other Google services.  Self-hosted fonts are a future option to remove this.",
  },
];

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
