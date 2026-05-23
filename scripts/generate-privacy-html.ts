// =============================================================================
// generate-privacy-html.ts
// =============================================================================
// Generates `public/privacy.html` from `src/config/privacy-config.ts`.
//
// `privacy-config.ts` is the single source of truth for sub-processors,
// retention, hosting regions, DPO, and policy version. The in-app React
// privacy page (`PublicPrivacyPage.tsx`) already reads from there; this script
// keeps the static HTML version (linked from the consent modal and Privacy
// Settings as the "Full Privacy Policy") aligned so the two views can't drift.
//
// Wired into `prebuild` in package.json — runs on every build.
// =============================================================================

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DATA_CONTROLLER,
  DATA_PROTECTION_OFFICER,
  PRIVACY_POLICY_VERSION,
  HOSTING_REGIONS,
  THIRD_PARTY_REGISTRY,
  RETENTION_PERIODS,
  CLIENT_STORAGE_KEYS,
} from "../src/config/privacy-config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "..", "public", "privacy.html");

const escape = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const subProcessorRows = THIRD_PARTY_REGISTRY.map(
  (p) => `
    <tr>
      <td><strong>${escape(p.name)}</strong></td>
      <td>${escape(p.purpose)}</td>
      <td>${escape(p.dataCategories.join("; "))}</td>
      <td>${escape(p.hostingRegion)}</td>
      <td>${escape(p.endpoint)}</td>
    </tr>`,
).join("");

const MECHANISM_LABEL: Record<string, string> = {
  dpf: "EU-US Data Privacy Framework (DPF) certified",
  scc: "EU Standard Contractual Clauses (2021/914)",
  adequacy: "EU adequacy decision (intra-EEA)",
  consent: "Art. 49(1)(a) explicit consent",
  "not-required": "No personal data transferred",
};

const crossBorderRows = THIRD_PARTY_REGISTRY.map((p) => {
  const safeguard = p.transfer
    ? `${escape(MECHANISM_LABEL[p.transfer.mechanism] ?? p.transfer.mechanism)} — verify at <a href="${escape(p.transfer.verificationUrl)}" target="_blank" rel="noopener">vendor record</a>. DPA: <a href="${escape(p.transfer.dpaUrl)}" target="_blank" rel="noopener">link</a>. TIA risk: ${escape(p.transfer.tiaRisk)}. Last reviewed: ${escape(p.transfer.lastReviewed)}.`
    : escape(
        p.processorOnly
          ? "Processor under DPA; encryption in transit + at rest"
          : "Independent controller for this surface; encryption in transit",
      );
  return `
    <tr>
      <td>${escape(p.hostingRegion)}</td>
      <td>${escape(p.name)}</td>
      <td>${safeguard}</td>
    </tr>`;
}).join("");

const storageRows = Object.entries(CLIENT_STORAGE_KEYS)
  .map(
    ([label, key]) => `
    <tr>
      <td><code>${escape(key)}</code></td>
      <td>${escape(label)}</td>
    </tr>`,
  )
  .join("");

const html = `<!DOCTYPE html>
<!--
  AUTO-GENERATED from src/config/privacy-config.ts via scripts/generate-privacy-html.ts.
  Do not edit by hand. To change disclosures, edit the config and rerun
  \`tsx scripts/generate-privacy-html.ts\` (also runs on \`npm run build\`).
-->
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - Vocaband</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem 1.5rem; color: #1c1917; line-height: 1.7; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.25rem; margin-top: 2rem; border-bottom: 1px solid #e7e5e4; padding-bottom: 0.5rem; color: #1e40af; }
    h3 { font-size: 1rem; margin-top: 1.5rem; color: #374151; }
    .meta { color: #78716c; font-size: 0.875rem; margin-bottom: 2rem; }
    .meta strong { color: #1c1917; }
    ul, ol { padding-left: 1.5rem; }
    li { margin-bottom: 0.5rem; }
    a { color: #2563eb; }
    code { background: #f3f4f6; padding: 0.1rem 0.35rem; border-radius: 0.25rem; font-size: 0.85em; }
    .back { display: inline-block; margin-bottom: 1.5rem; color: #78716c; text-decoration: none; font-size: 0.875rem; }
    .back:hover { color: #1c1917; }
    .highlight { background: #f0f9ff; padding: 1rem 1.5rem; border-radius: 0.5rem; border-left: 4px solid #2563eb; margin: 1rem 0; }
    .table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.95rem; }
    .table th, .table td { border: 1px solid #e5e7eb; padding: 0.75rem; text-align: left; vertical-align: top; }
    .table th { background: #f9fafb; }
  </style>
</head>
<body>
  <a href="/" class="back">&larr; Back to Vocaband</a>

  <h1>Privacy Policy</h1>
  <div class="meta">
    <p><strong>Effective Date:</strong> ${escape(PRIVACY_POLICY_VERSION)} | <strong>Version:</strong> 2.1</p>
    <p><strong>Legal Basis:</strong> Privacy Protection Law, 5741-1981 (Israel), Amendment 13 (תיקון 13 לחוק הגנת הפרטיות)</p>
  </div>

  <div class="highlight">
    <strong>Summary:</strong> Vocaband is designed for Israeli schools. Student accounts are anonymous — no email or personal identification required. Teachers sign in with Google OAuth or an email one-time code. We don't sell data, show ads, or track users for marketing.
  </div>

  <!-- Section 1: Data Controller + DPO -->
  <h2>1. Data Controller (בעל המאגר) &amp; Data Protection Officer</h2>
  <p>Under the Israeli Privacy Protection Law (Amendment 13), the data controller for Vocaband is:</p>
  <ul>
    <li><strong>Entity:</strong> ${escape(DATA_CONTROLLER.name)}</li>
    <li><strong>Country:</strong> ${escape(DATA_CONTROLLER.country)}</li>
    <li><strong>General Contact:</strong> <a href="mailto:${escape(DATA_CONTROLLER.contactEmail)}">${escape(DATA_CONTROLLER.contactEmail)}</a></li>
    <li><strong>Database Registration:</strong> As required under Section 18 of the Privacy Protection Law</li>
  </ul>

  <h3>Data Protection Officer (ממונה על הגנת הפרטיות)</h3>
  <p>Amendment 13 requires a public, accountable privacy contact. For Vocaband, that is:</p>
  <ul>
    <li><strong>Name:</strong> ${escape(DATA_PROTECTION_OFFICER.name)}</li>
    <li><strong>Role:</strong> ${escape(DATA_PROTECTION_OFFICER.role)}</li>
    <li><strong>Privacy Email:</strong> <a href="mailto:${escape(DATA_PROTECTION_OFFICER.email)}">${escape(DATA_PROTECTION_OFFICER.email)}</a></li>
    <li><strong>Response SLA:</strong> ${DATA_PROTECTION_OFFICER.responseSlaHours} hours for security incident reports; 30 days for data-subject rights requests (access, deletion, rectification).</li>
  </ul>

  <!-- Section 2: Legal Basis -->
  <h2>2. Legal Basis for Processing</h2>
  <p>We process personal data under the following legal bases as permitted by Israeli Privacy Protection Law (Amendment 13) and compatible international standards:</p>
  <table class="table">
    <tr><th>Data Type</th><th>Legal Basis</th><th>Purpose</th></tr>
    <tr><td>Student display name, avatar, class code</td><td>Contract performance (educational service)</td><td>Account creation, identification within class</td></tr>
    <tr><td>Game scores, progress, mistakes</td><td>Contract performance</td><td>Learning experience, progress tracking</td></tr>
    <tr><td>Teacher email (Google OAuth or email OTP)</td><td>Contract performance + legitimate interest (authentication)</td><td>Account verification, security</td></tr>
    <tr><td>Teacher display name</td><td>Contract performance</td><td>Identification in gradebook</td></tr>
    <tr><td>Class and assignment data</td><td>Contract performance</td><td>Teaching tools, class management</td></tr>
    <tr><td>Audit and consent records</td><td>Legal obligation (Amendment 13 §§ 8, 11)</td><td>Compliance and accountability</td></tr>
  </table>

  <!-- Section 3: Data We Collect -->
  <h2>3. Data We Collect</h2>

  <h3>3.1 For Students (Anonymous / PIN-Based Accounts)</h3>
  <p>Student accounts are designed to minimize personal data. We collect:</p>
  <ul>
    <li><strong>Display name</strong> — chosen by the student or assigned by the teacher; does not need to be a real name (first names or nicknames are encouraged)</li>
    <li><strong>Avatar</strong> — an emoji selected by the student</li>
    <li><strong>Class code</strong> — the 6-digit code used to join a class</li>
    <li><strong>Game scores and progress</strong> — scores, game modes played, word-level mistake data</li>
    <li><strong>Badges, streaks, XP</strong> — gamification metrics</li>
  </ul>
  <p><strong>Synthetic internal email:</strong> For PIN-based student accounts, the auth system generates an internal placeholder address (e.g., <code>student-&lt;uuid&gt;@class-&lt;code&gt;.vocaband.local</code>). This address is never delivered to a real inbox and is not used to contact the student. It exists only to satisfy the authentication system's unique-identifier requirement.</p>
  <p><strong>We do NOT collect from students:</strong> real email addresses, phone numbers, physical addresses, photos, government IDs, or any other personally identifiable information.</p>

  <h3>3.2 For Teachers</h3>
  <p>Teachers sign in via Google OAuth <em>or</em> email + one-time code (OTP). We collect:</p>
  <ul>
    <li><strong>Email address</strong> — used to verify identity against a pre-approved allowlist</li>
    <li><strong>Display name</strong> — from Google profile or set by the teacher</li>
    <li><strong>Classes and assignments created</strong> — class codes, settings, vocabulary lists, due dates</li>
  </ul>

  <h3>3.3 Technical Data (Automatic)</h3>
  <ul>
    <li><strong>Session tokens</strong> — for maintaining login (browser local storage, managed by Supabase SDK)</li>
    <li><strong>IP addresses</strong> — for security and rate limiting (not stored long-term)</li>
    <li><strong>Browser / User-Agent</strong> — for compatibility diagnostics (not used for tracking)</li>
  </ul>

  <!-- Section 4: Sub-processors -->
  <h2>4. Third-Party Sub-processors</h2>
  <p>Vocaband uses the following third-party services. All processors are bound by data processing agreements. Independent controllers (e.g., Google OAuth, Google Fonts) are noted as such. This list is the authoritative registry from our internal configuration — any new service is added here <em>before</em> it is used in production.</p>
  <table class="table">
    <tr><th>Service</th><th>Purpose</th><th>Data Categories</th><th>Hosting Region</th><th>Endpoint</th></tr>${subProcessorRows}
  </table>
  <p>We do <strong>not</strong> use advertising networks, behavioral analytics, marketing pixels, or data brokers.</p>

  <!-- Section 5: How We Use Data -->
  <h2>5. How We Use Your Data</h2>
  <p>Your data is used solely to deliver the learning service:</p>
  <ul>
    <li>Provide vocabulary games and persist progress</li>
    <li>Show teachers a gradebook of their students' progress</li>
    <li>Power live leaderboards during in-class challenges (scores held in memory only, never written to disk by the live-challenge server)</li>
    <li>Authenticate teachers</li>
    <li>Prevent abuse (rate limiting, security logs)</li>
    <li>On explicit teacher action: AI sentence generation (Anthropic) and OCR of uploaded worksheets (Google Cloud Gemini). Uploaded images are discarded after the API call returns the extracted text.</li>
  </ul>
  <p><strong>We do NOT:</strong></p>
  <ul>
    <li>Sell or rent personal data</li>
    <li>Use data for advertising or marketing</li>
    <li>Create user profiles for commercial purposes</li>
    <li>Share data with data brokers</li>
    <li>Use tracking cookies or third-party analytics</li>
  </ul>

  <!-- Section 6: Retention -->
  <h2>6. Data Retention</h2>
  <p>Under Amendment 13 we retain data only as long as necessary:</p>
  <table class="table">
    <tr><th>Data Type</th><th>Retention Period</th><th>Deletion Trigger</th></tr>
    <tr><td>Student progress records</td><td>${RETENTION_PERIODS.progressRecordsDays} days after assignment completion</td><td>Class deletion, account deletion, or scheduled cleanup</td></tr>
    <tr><td>Orphaned student accounts (no class membership)</td><td>${RETENTION_PERIODS.orphanedStudentDays} days after last login</td><td>Automatic cleanup</td></tr>
    <tr><td>Audit log entries</td><td>${RETENTION_PERIODS.auditLogDays} days (≈ 2 years)</td><td>Automatic deletion</td></tr>
    <tr><td>Consent log entries</td><td>${RETENTION_PERIODS.consentLogDays} days (≈ 10 years)</td><td>Legal requirement</td></tr>
    <tr><td>Database provider platform backups (Supabase PITR / daily snapshots)</td><td>Up to ${RETENTION_PERIODS.backupSupabasePlatformDays} days</td><td>Automatic rotation by the provider</td></tr>
    <tr><td>Off-site disaster-recovery archive (encrypted weekly <code>pg_dump</code> in Cloudflare R2)</td><td>Up to ${RETENTION_PERIODS.backupOffsiteR2Days} days (≈ ${Math.round(RETENTION_PERIODS.backupOffsiteR2Days / 30)} months)</td><td>R2 lifecycle policy — automatic deletion at ${RETENTION_PERIODS.backupOffsiteR2Days} days</td></tr>
  </table>
  <p>When a class is deleted, all associated assignments and progress records are removed via cascading delete. Encrypted backups may still contain copies of deleted data until the windows above expire and the backups are overwritten or automatically deleted.</p>

  <!-- Section 7: Cross-Border Transfers -->
  <h2>7. Cross-Border Data Transfers</h2>
  <p>Some processing occurs outside Israel and the EEA. Below is the destination for each sub-processor, with the lawful transfer mechanism (under GDPR Chapter V + Schrems II), the vendor's published Data Processing Agreement, the result of our per-vendor Transfer Impact Assessment (TIA), and the date the mechanism was last reviewed:</p>
  <table class="table">
    <tr><th>Destination</th><th>Service</th><th>Safeguards &amp; transfer mechanism</th></tr>${crossBorderRows}
  </table>
  <p>All transfers additionally use encryption in transit (TLS 1.3) and at rest. For the full transfer register, change history, and subscription instructions, see the human-readable companion doc <a href="https://github.com/ward3107/vocaband/blob/main/docs/SUBPROCESSORS.md" target="_blank" rel="noopener">docs/SUBPROCESSORS.md</a>.</p>

  <!-- Section 8: Your Rights -->
  <h2>8. Your Rights (Data Subject Rights)</h2>
  <p>Under Israeli Privacy Protection Law (Amendment 13) and international standards (GDPR-compatible), you have the right to:</p>
  <table class="table">
    <tr><th>Right</th><th>Description</th><th>How to Exercise</th></tr>
    <tr><td><strong>Access</strong></td><td>Receive a copy of all your personal data</td><td>Privacy Settings → "Export My Data", or email <a href="mailto:${escape(DATA_PROTECTION_OFFICER.email)}">${escape(DATA_PROTECTION_OFFICER.email)}</a></td></tr>
    <tr><td><strong>Rectification</strong></td><td>Correct inaccurate data (e.g., display name)</td><td>Edit directly in app or Privacy Settings</td></tr>
    <tr><td><strong>Erasure</strong></td><td>Permanently delete your account and associated data</td><td>Privacy Settings → "Delete My Account"</td></tr>
    <tr><td><strong>Portability</strong></td><td>Receive data in a machine-readable format (JSON)</td><td>Privacy Settings → "Export My Data"</td></tr>
    <tr><td><strong>Withdraw Consent</strong></td><td>Withdraw previously given consent</td><td>Privacy Settings → "Withdraw Consent"</td></tr>
    <tr><td><strong>Object</strong></td><td>Object to processing based on legitimate interests</td><td>Email <a href="mailto:${escape(DATA_PROTECTION_OFFICER.email)}">${escape(DATA_PROTECTION_OFFICER.email)}</a> with the specific request</td></tr>
  </table>
  <p>We respond to all requests within <strong>30 days</strong>. Access and deletion requests are free of charge.</p>

  <!-- Section 9: Children's Privacy -->
  <h2>9. Children's Privacy</h2>
  <p>Vocaband is designed for students in Israeli schools, many of whom are minors under applicable law.</p>

  <h3>9.1 School Authorization</h3>
  <p>The educational institution (school) authorizes student use of Vocaband as part of the educational curriculum. By providing a class code to students, the teacher (acting on behalf of the school) authorizes student access.</p>

  <h3>9.2 Minimal Data Collection</h3>
  <ul>
    <li>No email address required for students (synthetic internal address only — see §3.1)</li>
    <li>No real name required (display name only; first names or nicknames are encouraged)</li>
    <li>No personal identification documents</li>
    <li>No location tracking</li>
    <li>No behavioral advertising</li>
  </ul>

  <h3>9.3 Parental Rights</h3>
  <p>Parents or legal guardians may exercise data subject rights on behalf of their children by contacting the school or emailing <a href="mailto:${escape(DATA_PROTECTION_OFFICER.email)}">${escape(DATA_PROTECTION_OFFICER.email)}</a> with verification of guardianship.</p>
  <p>For a parent-facing summary of what we collect (and never collect), how to exercise rights, and a structured request form, see the dedicated parental information page:</p>
  <ul>
    <li><a href="/parents.html">English</a></li>
    <li><a href="/parents-he.html">עברית (Hebrew)</a></li>
    <li><a href="/parents-ar.html">العربية (Arabic)</a></li>
    <li><a href="/parents-ru.html">Русский (Russian)</a></li>
  </ul>

  <!-- Section 10: Security -->
  <h2>10. Security Measures</h2>
  <ul>
    <li><strong>Encryption in transit:</strong> All traffic over HTTPS (TLS 1.3)</li>
    <li><strong>Encryption at rest:</strong> Database and storage encrypted by Supabase</li>
    <li><strong>Access control:</strong> Row-Level Security (RLS) policies ensure users can only access their own data</li>
    <li><strong>Authentication:</strong> Teachers via Google OAuth or email OTP; students via class code + PIN</li>
    <li><strong>Teacher allowlist:</strong> Only pre-approved email addresses can access teacher functionality</li>
    <li><strong>Rate limiting:</strong> Protection against automated attacks</li>
    <li><strong>Audit logging:</strong> Privacy-sensitive actions (data export, deletion, role changes, login) are logged with append-only protection</li>
    <li><strong>Penetration testing:</strong> Automated RLS pen-test suite (<code>scripts/security-pen-test.sh</code>) verifies isolation between classes and roles</li>
  </ul>

  <!-- Section 11: Local Storage -->
  <h2>11. Cookies and Local Storage</h2>
  <p>Vocaband uses no tracking, advertising, or third-party analytics cookies. The following keys are stored in your browser:</p>
  <table class="table">
    <tr><th>Storage Key</th><th>Purpose</th></tr>${storageRows}
  </table>
  <p>Cloudflare Web Analytics is used for traffic measurement; it stores no cookies and does not identify individual users.</p>

  <!-- Section 12: Changes -->
  <h2>12. Changes to This Policy</h2>
  <ul>
    <li>The "Effective Date" and version number above will change</li>
    <li>Users will be notified via in-app consent modal</li>
    <li>Continued use after material changes constitutes acceptance</li>
  </ul>
  <p>Material policy changes trigger a re-consent prompt as required by Amendment 13.</p>

  <!-- Section 13: Complaints -->
  <h2>13. Complaints and Regulatory Authority</h2>
  <ol>
    <li>Contact us first at <a href="mailto:${escape(DATA_PROTECTION_OFFICER.email)}">${escape(DATA_PROTECTION_OFFICER.email)}</a></li>
    <li>If unresolved, file a complaint with the Israeli Privacy Protection Authority (הרשות להגנת הפרטיות):
      <ul>
        <li>Website: <a href="https://www.gov.il/he/departments/the_privacy_protection_authority" target="_blank" rel="noopener">www.gov.il</a></li>
        <li>Email: ppa@justice.gov.il</li>
      </ul>
    </li>
  </ol>

  <!-- Section 14: Contact -->
  <h2>14. Contact</h2>
  <ul>
    <li><strong>Privacy / data-subject requests:</strong> <a href="mailto:${escape(DATA_PROTECTION_OFFICER.email)}">${escape(DATA_PROTECTION_OFFICER.email)}</a></li>
    <li><strong>General inquiries:</strong> <a href="mailto:${escape(DATA_CONTROLLER.contactEmail)}">${escape(DATA_CONTROLLER.contactEmail)}</a></li>
    <li><strong>Response SLA:</strong> ${DATA_PROTECTION_OFFICER.responseSlaHours} hours for security incidents; 30 days for data-subject rights requests</li>
  </ul>

  <hr style="margin: 3rem 0; border: none; border-top: 1px solid #e5e7eb;">

  <p style="color: #78716c; font-size: 0.875rem;">
    <strong>Related Documents:</strong> <a href="/terms.html">Terms of Service</a>
  </p>
</body>
</html>
`;

writeFileSync(OUT_PATH, html, "utf8");
console.log(`✓ Generated ${OUT_PATH} (policy version ${PRIVACY_POLICY_VERSION}, ${THIRD_PARTY_REGISTRY.length} sub-processors)`);
