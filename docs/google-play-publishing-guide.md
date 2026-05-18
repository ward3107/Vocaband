# Google Play Publishing Guide — Vocaband

How to ship Vocaband to the Play Store as a **Trusted Web Activity (TWA)** — the existing PWA wrapped in a thin Android shell. Chrome runs `https://www.vocaband.com` inside the shell; updates ship instantly via your normal Cloudflare deploy. No second codebase to maintain.

Audience: you, the operator. Assumes you already have a Google Play Developer account ($25 one-time, already paid).

---

## Why TWA (and not Capacitor / native)

| Path | Pros | Cons |
|---|---|---|
| **TWA via Bubblewrap** ✅ | Smallest binary (~1–2 MB). Updates ship from web — no Play review for content changes. Single codebase. PWA features already work. | Needs valid PWA + Digital Asset Links. No native push without extra work (Web Push works on Chrome). |
| Capacitor wrapper | Native APIs (push, in-app billing, deep file access). | Second codebase to maintain. Every content fix needs a Play review. Larger binary. |
| Native rewrite | Full control. | Months of work. Two codebases forever. |

Vocaband is already a PWA (manifest, service worker, maskable icon). TWA is a near-free win. The rest of this doc assumes TWA.

---

## What Vocaband already has ✅

Audit of the current setup (`public/manifest.webmanifest`, `src/main.tsx`, `index.html`):

- ✅ HTTPS at `https://www.vocaband.com` (Cloudflare)
- ✅ `manifest.webmanifest` with `name`, `short_name`, `theme_color`, `background_color`, `display: standalone`, `start_url`, `scope`
- ✅ Icons: `icon-192.png`, `icon-512.png`, plus a maskable variant
- ✅ Service worker registered at `/sw.js` (vite-plugin-pwa, idle registration in `src/main.tsx`)
- ✅ Privacy policy at `/privacy.html`, terms at `/terms.html`
- ✅ Existing PWA install banner (`src/components/PwaInstallGate.tsx`)

## What's missing (do these BEFORE running Bubblewrap)

### 1. Digital Asset Links file

TWA requires proof that you own both the domain and the app. Add a placeholder you'll fill in once you have the app signing key fingerprint:

```
public/.well-known/assetlinks.json
```

Schema (final form):

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.vocaband.app",
    "sha256_cert_fingerprints": ["AA:BB:CC:..."]
  }
}]
```

You'll fill in `sha256_cert_fingerprints` after the keystore step (see §4 below). Confirm the worker serves `/.well-known/*` as a static asset and that Cloudflare doesn't strip it. Test with:

```bash
curl -i https://www.vocaband.com/.well-known/assetlinks.json
```

Expected: `200 OK` with `Content-Type: application/json`.

### 2. Reconcile theme color

`index.html` declares `<meta name="theme-color" content="#059669" />` (emerald) but `manifest.webmanifest` uses `#4f46e5` (indigo). TWA uses the manifest value for the splash screen and the navigation bar. Decide which is canonical — recommend matching the manifest (`#4f46e5`) since that's what the install prompt and Play listing will use. Update `index.html`:

```html
<meta name="theme-color" content="#4f46e5" />
```

### 3. Add manifest enhancements

Update `public/manifest.webmanifest`:

```json
{
  "id": "/?source=pwa",
  "name": "Vocaband",
  "short_name": "Vocaband",
  "description": "Gamified English vocabulary for Israeli classrooms",
  "theme_color": "#4f46e5",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/?source=pwa",
  "scope": "/",
  "lang": "en",
  "categories": ["education", "games"],
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [
    { "src": "/screenshots/play-home.png", "sizes": "1080x1920", "type": "image/png", "form_factor": "narrow" },
    { "src": "/screenshots/play-game.png", "sizes": "1080x1920", "type": "image/png", "form_factor": "narrow" }
  ]
}
```

Why each change:
- `id` — stable PWA identity (recommended by Chrome)
- `start_url: /?source=pwa` — lets you filter installed-app traffic in analytics
- `orientation: portrait` — Vocaband is portrait-first; locks the TWA the same way
- `categories` — picked up by the Play listing
- `screenshots` with `form_factor: narrow` — Chrome's richer install prompt + Play Store carryover
- Maskable should ideally be a separate icon with safe-area padding. Test the current one at https://maskable.app/ — if the logo gets cropped, generate a padded variant.

### 4. Optional: a dedicated maskable icon

Maskable icons get circle/squircle masks applied by launchers. The safe zone is the center 80%. If `icon-512.png` has the logo edge-to-edge, parts will be clipped on round/rounded-square launcher masks (Pixel, Samsung). Generate a 512×512 PNG with the logo at ~70% size and a solid `#4f46e5` background. Save as `public/icon-512-maskable.png` and update the manifest entry.

---

## Bubblewrap workflow

Bubblewrap is Google's official CLI for generating TWAs.

### Prerequisites on your machine

```bash
# Node ≥ 18 (you already have 22). JDK 17 needed for Bubblewrap.
brew install openjdk@17                       # macOS
# or: sudo apt install openjdk-17-jdk        # Linux

npm install -g @bubblewrap/cli
bubblewrap doctor                             # downloads Android SDK / JDK if missing
```

`bubblewrap doctor` will offer to install the Android SDK and JDK if not found — say yes; it caches them under `~/.bubblewrap/`.

### 1. Initialize the TWA project

Pick a directory OUTSIDE the Vocaband repo (e.g. `~/dev/vocaband-twa/`). This keeps Android build artifacts out of the web repo:

```bash
mkdir -p ~/dev/vocaband-twa && cd ~/dev/vocaband-twa
bubblewrap init --manifest=https://www.vocaband.com/manifest.webmanifest
```

Bubblewrap prompts you for:

| Prompt | Answer |
|---|---|
| Application ID | `com.vocaband.app` |
| Application name | `Vocaband` |
| Short name | `Vocaband` |
| Launcher name | `Vocaband` |
| Display mode | `standalone` |
| Status bar color | `#4f46e5` |
| Splash screen color | `#4f46e5` |
| Start URL | `/` |
| Icon URL | (use the manifest one) |
| Maskable icon URL | (use the manifest one) |
| Include support for Play Billing | No (unless you add IAP) |
| Signing key path | `./android.keystore` (default) |
| Signing key alias | `android` |

Keep the **signing-key password** somewhere safe (1Password, Bitwarden, your password manager). **If you lose it, you cannot publish updates** — Play matches updates by signing key fingerprint and locks you out of the listing.

> Better: enable **Play App Signing** (default for new apps since 2021). You upload an "upload key" to Play; Google holds the real release key. Losing the upload key is recoverable via Google support. Recommended.

### 2. Get the SHA-256 fingerprint for assetlinks.json

After Bubblewrap creates the keystore:

```bash
keytool -list -v -keystore android.keystore -alias android
```

Copy the `SHA256` line (looks like `AA:BB:CC:...` — 64 hex chars in pairs). Paste it into `public/.well-known/assetlinks.json` in the Vocaband repo, then deploy:

```bash
# From the Vocaband repo
git add public/.well-known/assetlinks.json public/manifest.webmanifest index.html
git commit -m "Add Digital Asset Links and tighten PWA manifest for TWA"
git push
# Cloudflare auto-deploys; confirm with:
curl https://www.vocaband.com/.well-known/assetlinks.json
```

**Important:** Once you enable Play App Signing (recommended), the fingerprint that matters is the **App signing key certificate** in Play Console → Setup → App signing — not the upload key. Update `assetlinks.json` with that fingerprint after the first upload. Bubblewrap can fetch both and merge with `bubblewrap fingerprint add ...`.

### 3. Build the signed bundle

```bash
cd ~/dev/vocaband-twa
bubblewrap build
```

Outputs:
- `app-release-bundle.aab` — upload this to Play Console
- `app-release-signed.apk` — for sideload testing on your phone (`adb install`)

To regenerate after Vocaband changes (only needed if you bump app version, icons, or splash; web content updates DON'T need a rebuild):

```bash
bubblewrap update                # pulls latest manifest
bubblewrap build
```

### 4. Smoke-test on a real device

Before uploading, sideload and verify:

```bash
adb install app-release-signed.apk
```

Checklist on the device:
- [ ] App opens to vocaband.com without a browser address bar (TWA verified)
- [ ] If you see a Chrome URL bar at the top, **Digital Asset Links is broken** — fix `assetlinks.json` and reinstall
- [ ] Google OAuth login works (opens in Custom Tabs, returns to app)
- [ ] Class-code login works
- [ ] Camera (OCR feature in `InPageCamera.tsx`) — Chrome prompts for camera permission
- [ ] Audio plays (word TTS, motivational sounds)
- [ ] Live challenge works (socket.io connection over WSS)
- [ ] RTL works for Hebrew/Arabic
- [ ] Back gesture exits the app cleanly from the home screen (not stuck mid-game)

If OAuth fails: TWAs open OAuth in Chrome Custom Tabs. Make sure your Supabase Google OAuth client doesn't restrict to a specific browser. Test with the real Play-signed build (closed track) — sideloaded debug builds can behave differently for OAuth.

---

## Google Play Console setup

### App creation

1. Play Console → **Create app**
2. App name: `Vocaband`
3. Default language: English (United States)
4. App or game: **App** (even though it has games — Play's "app" category fits education tools better than "game")
5. Free or paid: **Free**
6. Declarations: tick the developer-program-policy and US-export checkboxes

### Required listing assets

Get these ready before you start the listing — Play won't let you save partial drafts of some sections.

| Asset | Spec | Notes |
|---|---|---|
| **App icon** | 512×512 PNG, 32-bit, alpha allowed | Reuse `public/icon-512.png`. Make sure it looks good at 48dp (Play renders small). |
| **Feature graphic** | 1024×500 PNG/JPG, no alpha | The hero banner on your Play listing. Make a branded one (indigo→violet gradient + "Vocaband" + tagline). |
| **Phone screenshots** | 2–8 PNGs, 16:9 or 9:16, min 320px, max 3840px | Use real screens. Best with light marketing copy overlay ("Live class challenges!"). |
| **Tablet screenshots** | 2–8 PNGs (7" and 10") | Optional but boosts ranking on tablet searches. Use a tablet emulator or resize. |
| **Short description** | ≤ 80 chars | "Gamified English vocabulary for schools — CEFR A1–B2, 15 game modes, free for teachers." |
| **Full description** | ≤ 4000 chars | Pull from the meta description in `index.html` + expand. Cover: who it's for, what it does, language coverage, free-for-teachers angle. |
| **App category** | Education | Primary. Add "Educational" as a tag. |
| **Content rating** | IARC questionnaire | Walk through the form. Vocaband should land at **Everyone** / **PEGI 3**. |
| **Privacy policy URL** | https://www.vocaband.com/privacy.html | Already exists. |

Screenshots tip: take them on a real Pixel (or via Chrome devtools at 1080×1920) for the cleanest result. Aim for 4–5 narrative screens: dashboard → game mode picker → mid-game → leaderboard → progress.

### Data Safety form

This is the form parents check before installing. Be thorough — Google audits and will pull listings for misdeclarations.

Personal info collected:
- **Name** — yes (teacher name, student display name) — Required for app functionality
- **Email** — yes (teachers only) — Required for Login + Account management; encrypted in transit
- **User IDs** — yes (Supabase user ID) — Required for app functionality
- **Photos** — yes, IF camera is used (OCR) — App functionality; **not transmitted to ad networks**; **deleted after processing**

App activity:
- **App interactions** — yes (game progress, XP) — App functionality
- **Other user-generated content** — yes (assignments, custom word lists)

Device IDs: no.

Location: no.

Financial: no (free).

Health/fitness: no.

Messages/contacts/files: no.

**Data sharing with third parties:**
- Supabase (data processor under DPA) — declare as a data processor, not third-party sharing
- Google (Gemini for OCR/sentence generation) — declare as a data processor; teacher OCR images go to Gemini and are deleted

**Security practices:**
- ✅ Data encrypted in transit (TLS)
- ✅ Users can request data deletion (have a flow at `/privacy.html` or via support email)
- ✅ Independent security review (you have `docs/security-audit-*.md` — declare it)

### Kids and families — critical

Vocaband targets grades 4–9 (ages 9–15). Some students are under 13, which puts you under:
- **Google Play Families Policy**
- **COPPA** (US)
- **GDPR-K** (EU)
- **Israeli Privacy Protection Law** (minors)

In Play Console → Policy → App content → **Target audience**:
- Pick `Ages 9–12, 13–15` (multiple age groups)
- This triggers **Designed for Families** review

What that means:
- **No ads or only kid-safe ads** (Vocaband has no ads — declare none)
- **No personalized data collection on under-13 users**
- **Augmented disclosures** in the data-safety form
- **Stricter content moderation rules**
- **No social-account sign-in for users you know are under 13** — your teacher OAuth is fine; student class-code login is the kid-safe path

The Designed for Families program adds 2–4 weeks to first-release review. Plan accordingly.

### Target API level

Play requires new apps to target the API level released within the last 12 months. As of 2026, that means API 34 (Android 14) minimum, likely API 35 (Android 15) by Q3. Bubblewrap's default template targets the right level automatically — just rerun `bubblewrap update` periodically.

### Release tracks — the rollout path

Don't go straight to production. Use Play's tracks:

1. **Internal testing** (max 100 testers, instant rollout)
   - Add 5–10 friendly testers (you, co-founder, 2–3 teachers you trust)
   - No review wait; new builds live in ~hours
   - Get them to test login, gameplay, OCR, live challenge, RTL

2. **Closed testing** (up to thousands, gated by email list)
   - Add a pilot cohort of teachers (10–50)
   - First closed-track release triggers Designed for Families review (~2 weeks)
   - Required before you can open production

3. **Open testing** (anyone with link, "early access" badge)
   - Optional. Useful if you want a "beta" badge on Play before full launch.

4. **Production**
   - Roll out at 5% → 20% → 50% → 100% over a week. Watch crash rate in Play Console → Quality → Android vitals.

---

## Wiring up Sentry for the Android build

The app already uses `@sentry/react` (see `package.json`). It works inside the TWA's Chrome runtime — no extra setup. But to distinguish TWA traffic from web traffic, set a tag in `src/main.tsx` when the manifest's `?source=pwa` param is present, or check `navigator.userAgent` for the Android WebView marker. This is a 5-line change if you want it.

---

## Updating the app

Two kinds of updates:

| What changed | Action |
|---|---|
| Web code, content, copy, words, game logic, RLS policies | Normal Cloudflare deploy. **No Play release needed.** TWA loads the new web build on next launch. |
| App icon, splash color, package name, status-bar color, target API level | `bubblewrap update && bubblewrap build`, bump `appVersionCode` (Bubblewrap does this on `update`), upload new `.aab` to Play. |

Bump `appVersionCode` for every Play upload — it's a monotonically increasing integer. Bubblewrap stores it in `twa-manifest.json`. Don't reuse a number.

---

## Production checklist

Before promoting to production:

- [ ] `assetlinks.json` serves correctly with the production app-signing-key fingerprint (the Play one, not just the upload key)
- [ ] Internal test build verified by 5+ testers across at least 2 device types (Pixel + Samsung min)
- [ ] Data Safety form complete and matches actual behavior
- [ ] Privacy policy URL works, is in Hebrew/Arabic if you serve those audiences (you already have hreflang)
- [ ] Designed for Families review approved
- [ ] At least 14-day Closed testing track with ≥12 testers (Play requires this for personal developer accounts as of Nov 2023; organizational accounts may not need it — confirm in Console)
- [ ] Crash-free rate ≥ 99% in Closed testing
- [ ] Listing screenshots in EN at minimum (HE/AR optional — Play supports localized listings per language)
- [ ] You have access to the Play signing key recovery info (Play App Signing console)

---

## Cost / time estimate

| Task | Time |
|---|---|
| PWA gaps (manifest, assetlinks, icon polish) | 2–3 hours |
| Bubblewrap install + first build | 1–2 hours |
| Listing assets (icon, feature graphic, 4 screenshots, copy) | 4–6 hours (or 1 day if you outsource to a designer) |
| Play Console setup + Data Safety form | 2 hours |
| Internal testing iteration | 2–5 days elapsed |
| Designed for Families review wait | 2–4 weeks elapsed |
| Closed testing 14-day window | 2 weeks elapsed |
| **Total: web work + 4–6 weeks of Google-side review** |

Spinup cost: $0 beyond the $25 developer-account fee you already paid.

---

## References

- [Bubblewrap docs](https://github.com/GoogleChromeLabs/bubblewrap)
- [Trusted Web Activities overview](https://developer.chrome.com/docs/android/trusted-web-activity)
- [Digital Asset Links setup](https://developers.google.com/digital-asset-links/v1/getting-started)
- [Play Console Designed for Families](https://support.google.com/googleplay/android-developer/answer/9285070)
- [Data Safety form fields reference](https://support.google.com/googleplay/android-developer/answer/10787469)
- [maskable.app icon previewer](https://maskable.app/)

---

## Open questions to resolve before publishing

- [ ] Should we ship with Play App Signing (recommended) or self-managed keystore?
- [ ] Who designs the feature graphic + screenshots (you, a designer, AI mock)?
- [ ] HE / AR localized Play listings on launch, or English-only first?
- [ ] Pilot cohort for Closed testing — which 10–50 teachers?
- [ ] Production privacy email — currently `support@vocaband.com`? Confirm before publishing (it shows on the Play listing).
