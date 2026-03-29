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

// ---------------------------------------------------------------------------
// 2. Privacy policy versioning
// ---------------------------------------------------------------------------

export const PRIVACY_POLICY_VERSION = "2024-03-01";  // Version 2.0 - Amendment 13 compliant
export const TERMS_VERSION = "2024-03-01";            // Version 2.0 - Amendment 13 compliant

// ---------------------------------------------------------------------------
// 3. Hosting regions (for cross-border transfer disclosures)
// ---------------------------------------------------------------------------

export const HOSTING_REGIONS = {
  supabase: "us-east-1",           // Supabase project region
  render: "oregon",                // Render web service region
  googleAuth: "global",            // Google OAuth is multi-region
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
 */
export const THIRD_PARTY_REGISTRY: ThirdPartyEntry[] = [
  {
    name: "Supabase",
    purpose: "Database, authentication, row-level security",
    dataCategories: ["user profiles", "class data", "assignments", "progress scores", "auth tokens"],
    processorOnly: true,
    hostingRegion: HOSTING_REGIONS.supabase,
    endpoint: "*.supabase.co",
  },
  {
    name: "Render",
    purpose: "Web server hosting, Socket.IO live challenge server",
    dataCategories: ["HTTP requests (IP, User-Agent)", "live challenge scores (in-memory only)"],
    processorOnly: true,
    hostingRegion: HOSTING_REGIONS.render,
    endpoint: "www.vocaband.com",
  },
  {
    name: "Google OAuth",
    purpose: "Teacher authentication via Google Sign-In",
    dataCategories: ["email address", "display name", "OAuth tokens"],
    processorOnly: false,
    hostingRegion: HOSTING_REGIONS.googleAuth,
    endpoint: "accounts.google.com",
    notes: "Google acts as an independent controller for its own auth data",
  },
  {
    name: "Google Sheets (optional)",
    purpose: "Teacher imports vocabulary from a public Google Sheet",
    dataCategories: ["sheet content (vocabulary words only, no personal data)"],
    processorOnly: false,
    hostingRegion: "global",
    endpoint: "docs.google.com",
    notes: "Only triggered by explicit teacher action; no personal data sent",
  },
  {
    name: "Tesseract.js (client-side)",
    purpose: "OCR — extract text from images for vocabulary matching",
    dataCategories: ["uploaded image (processed locally in browser, never sent to a server)"],
    processorOnly: false,
    hostingRegion: "client-side",
    endpoint: "N/A (runs in browser WebAssembly)",
    notes: "WASM binary loaded from app bundle; no external network call for processing",
  },
  {
    name: "Google Favicon",
    purpose: "Display Google icon on Sign-In button",
    dataCategories: ["HTTP request metadata (IP, User-Agent)"],
    processorOnly: false,
    hostingRegion: "global",
    endpoint: "www.google.com/favicon.ico",
    notes: "Static asset fetch; no personal data transmitted",
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
