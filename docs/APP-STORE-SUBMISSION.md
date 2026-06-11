# App Store Submission Guide — Vocaband Student App

> Everything needed to publish the **students-only** app to Google Play and the
> Apple App Store. Listing copy + the filled-in privacy-form answers are ready to
> paste. Answers below come from the 2026-06-11 data-collection and
> account-deletion audits of the student code paths.
>
> The store app is a Capacitor wrapper (`capacitor.config.ts`) that loads the live
> site at `vocaband.com/student`. Web deploys reach it instantly; a new store
> release is only needed for shell-level changes (icon, splash, native plugins).

---

## 0. Pre-flight checklist (do these in order)

| # | Task | Who | Cost | Status |
|---|------|-----|------|--------|
| 1 | Open Google Play Console account | Operator | $25 once | ☐ |
| 2 | Open Apple Developer Program account | Operator | $99/yr | ☐ |
| 3 | Generate Android signing keystore + release build (AAB) | Eng | — | ☐ |
| 4 | Real-device test on Android (see §6) | Both | — | ☐ |
| 5 | Real-device test on iOS — needs a Mac/Xcode or Codemagic | Both | — | ☐ |
| 6 | Fill Data Safety form (§3) | Operator | — | ☐ |
| 7 | Fill App Privacy form (§4) | Operator | — | ☐ |
| 8 | Upload screenshots + listing copy (§1, §2) | Operator | — | ☐ |
| 9 | Submit Android first (faster review) | Operator | — | ☐ |
| 10 | Submit iOS | Operator | — | ☐ |

---

## 1. Store listing copy

**App name:** Vocaband

**Short description (Google, ≤80 chars):**
> Learn English vocabulary with fun games. For Israeli schools, grades 4–9.

**Subtitle (Apple, ≤30 chars):**
> English vocab games

**Full description:**
> Vocaband makes learning English vocabulary fun for students in grades 4–9.
>
> Play 15 game modes, earn XP, keep your streak, unlock avatars and titles, and
> climb your class leaderboard — all while building real English vocabulary
> aligned to the Israeli Ministry of Education word sets.
>
> HOW IT WORKS
> • Your teacher gives you a class code and a PIN
> • Log in — no email or personal details needed
> • Play the games your teacher assigns
> • Earn rewards and track your progress
>
> FEATURES
> • 15 vocabulary game modes
> • Hebrew and Arabic translation support
> • XP, streaks, avatars, titles, and a class shop
> • Live class challenges and leaderboards
> • Works on phones and tablets
>
> FOR FAMILIES
> • No ads, ever
> • No third-party tracking
> • Students log in with a class code + PIN — no personal account required
> • Data stored securely in the EU
> • Full privacy policy: https://www.vocaband.com/privacy
> • For parents: https://www.vocaband.com/parents

**Keywords (Apple, ≤100 chars):**
> english,vocabulary,learning,school,games,kids,education,hebrew,arabic,israel,vocab

**Category:** Education
**Secondary (Apple):** Education / Reference

**Contact / support:**
- Support email: `privacy@vocaband.com` (or a dedicated `support@vocaband.com`)
- Marketing/support URL: `https://www.vocaband.com`
- Privacy policy URL: `https://www.vocaband.com/privacy`

---

## 2. Graphic assets needed

| Asset | Google Play | Apple App Store | Status |
|-------|-------------|-----------------|--------|
| App icon | 512×512 PNG | 1024×1024 PNG | ✅ have (`public/icon-512.png`; upscaled `assets/logo.png`) |
| Feature graphic | 1024×500 PNG | — | ☐ design needed |
| Phone screenshots | 2–8, ≥320px | 3–10, per device size | ☐ capture from app |
| 7" / 10" tablet shots | optional | iPad shots if iPad supported | ☐ |
| Promo video | optional | optional | ☐ skip for v1 |

**Screenshot suggestions (capture on a real device):** student login, game mode
picker, an active game, XP/level-up moment, the shop, a live-challenge leaderboard.
Capture in English; optionally also Hebrew for an HE-localized listing.

---

## 3. Google Play — "Data Safety" form answers

> Based on the 2026-06-11 student-side audit. **No ads, no tracking SDKs.**

**Does your app collect or share user data?** → **Yes**

**Is all data encrypted in transit?** → **Yes** (HTTPS / WSS everywhere)

**Do you provide a way to request data deletion?** → **Yes**
- In-app: Privacy Settings → "Delete My Account"
- Web: https://www.vocaband.com/parents (deletion instructions + `privacy@vocaband.com`)

### Data types collected

| Data type | Collected | Shared | Purpose | Required? |
|-----------|-----------|--------|---------|-----------|
| Name (display name) | Yes | No | App functionality (login, leaderboard) | Required |
| Email address | Yes | No | Account management (login credential) | Required |
| User IDs (opaque UUID) | Yes | Yes → Sentry | App functionality, crash diagnostics | Required |
| App activity (progress, XP, scores) | Yes | No | App functionality, analytics | Required |
| App interactions | Yes | Yes → Sentry | Crash logs / diagnostics | Optional |
| Crash logs & diagnostics | Yes | Yes → Sentry | Diagnostics | Optional |
| Approximate location (IP-derived) | No* | — | — | — |

\* *IP reaches Cloudflare/Fly.io as normal infrastructure metadata but is not
collected as a location data type. Declare only if the Play reviewer's tooling
flags it; the honest answer is "infra logs, not used for location."*

**Ads / advertising ID:** **None.** No advertising, no ad ID.
**Data used for tracking (cross-app/site):** **No.**

**Third parties that receive data:**
- **Supabase** (database, EU/Frankfurt) — profiles, progress
- **Sentry** (crash diagnostics, EU/Germany) — errors + opaque UID, **PII scrubbed**
- **Cloudflare** (CDN) — request metadata
- **Google Fonts** (Hebrew/Arabic fonts only) — request metadata

**Target audience / Families policy:** This app targets **children and adults**
(grades 4–9). Expect to complete the **Families / Designed for Families** section.
Be ready to confirm: no ads to children, no restricted SDKs, privacy policy linked.

---

## 4. Apple — "App Privacy" form answers

> Apple groups by "linked to you" / "not linked" / "used for tracking."
> **Nothing is used for tracking.**

### Data Used to Track You
→ **None.** (No advertising, no cross-app tracking.)

### Data Linked to You
| Category | Specific type | Purpose |
|----------|---------------|---------|
| Contact Info | Email address | App Functionality |
| User Content | Display name, avatar, scores | App Functionality |
| Identifiers | User ID (opaque UUID) | App Functionality |
| Usage Data | Game progress, interactions | App Functionality, Analytics |

### Data Not Linked to You
| Category | Specific type | Purpose |
|----------|---------------|---------|
| Diagnostics | Crash data, performance | App Functionality (Sentry, PII scrubbed) |

**Privacy policy URL:** https://www.vocaband.com/privacy

**Kids Category (Apple):** If you list under the **Kids** category, Apple applies
guideline 1.3 — no third-party analytics/ads that transmit kid data, and a
parental gate for outbound links. Sentry sends only scrubbed diagnostics with an
opaque UID; review whether that's acceptable for the Kids category, or list under
**Education** (not Kids) to avoid the stricter rule. **Recommended: list under
Education**, since the app is teacher-assigned, not direct-to-child marketed.

---

## 5. Account deletion (store requirement) — already satisfied ✅

- **In-app:** `src/views/PrivacySettingsView.tsx` → "Delete My Account" (EN/HE/AR/RU)
- **Backend:** `public.delete_my_account()` RPC — wipes profile, progress, consent,
  auth row; keeps only a 730-day audit log (GDPR legal-retention exemption)
- **Public page:** `public/parents.html` §7 + `public/privacy.html` §8, contact
  `privacy@vocaband.com`
- **Bonus:** in-app data export (JSON) via `public.export_my_data()`

For Google Play's "Delete Account" listing field, use:
`https://www.vocaband.com/parents`

---

## 6. Real-device test checklist (before submitting)

Run on at least one **real Android phone** (and one iPhone before the Apple
submission). A cheap/old Android device is the most realistic for school use.

**Core flow**
- ☐ Install the built app (not the browser)
- ☐ Boots straight to student login (no marketing page, no teacher login)
- ☐ Log in with class code + PIN
- ☐ Play a full game; earn XP; see a level-up
- ☐ Word audio plays through the phone speaker
- ☐ Close the app and reopen — still logged in

**Navigation & shell**
- ☐ Android back button never gets stuck / never escapes to a blank page
- ☐ No way to reach the teacher dashboard or marketing landing
- ☐ External links (privacy policy) open in the system browser, not trapped in-app

**Resilience**
- ☐ Turn off Wi-Fi → friendly offline page, not a white screen
- ☐ Rotate the device → layout holds
- ☐ Camera/OCR (if a student path uses it) prompts for permission and works

**Performance**
- ☐ Loads acceptably on a low-end Android device
- ☐ No crash during a 10-minute play session

**Account / privacy**
- ☐ Privacy Settings → "Delete My Account" works end to end
- ☐ Cookie/consent banner appears and saves choice

---

## 7. Known minor items (not blockers)

- **Hebrew/Arabic fonts** still load from Google Fonts (English fonts are
  self-hosted). For a strict kids posture, self-host the RTL fonts too. Cosmetic,
  not a submission blocker.
- **No 30-day deletion grace period** — deletion is immediate. Google *prefers* a
  grace period but does not require it.
- **iOS build needs a Mac** (Xcode) or a cloud builder (Codemagic / EAS-style). No
  Mac is required for Android.

---

## 8. Build commands (reference — run when ready)

```bash
# Sync web shell config into the native projects after any capacitor.config change
npx cap sync

# Android: open in Android Studio to generate a signed release AAB
npx cap open android
#   → Build > Generate Signed Bundle/APK > Android App Bundle
#   → create/keep the upload keystore SAFE (losing it blocks future updates)

# iOS: open in Xcode (Mac only) to archive + upload to App Store Connect
npx cap open ios
#   → Product > Archive > Distribute App
```

> The shell loads the live site, so there is **no `npm run build` step required for
> store releases** — only `npx cap sync` to refresh native config/assets.
