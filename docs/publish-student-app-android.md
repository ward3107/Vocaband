# Publishing the student app to Google Play — step by step

This is the **students-only** app: `com.vocaband.student`. It opens straight to
the "join your classroom" login (no marketing page, no teacher screens) and
loads the live site, so every web update reaches students instantly — you only
re-upload to Play for icon/splash/shell changes.

> ⚠️ This is a **different app** from the `com.vocaband.app` Draft you started
> earlier. Leave that Draft alone — we create a fresh Play listing for
> `com.vocaband.student`. A Play app's package name can never be changed, so
> they have to be separate listings.

You never need Android Studio. GitHub builds the app file for you.

---

## Part A — One-time setup (do these once)

### A1. Make the signing key (no software to install)
1. Go to your repo on GitHub → **Actions** tab.
2. Left side, click **Build Student Android App**.
3. Click **Run workflow** → set **mode = generate-keystore** → **Run workflow**.
4. Wait ~1 minute, open the finished run, scroll to **Artifacts**, download
   **vocaband-upload-keystore-KEEP-PRIVATE**.
5. Inside the zip:
   - `SECRETS-README.txt` — the 4 values you need next.
   - `upload.jks` — **save this in your password manager.** It's your upload key.

### A2. Add the 4 secrets
GitHub repo → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**, add each of these (values from `SECRETS-README.txt`):
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEYSTORE_BASE64`  (paste the whole contents of `upload.jks.base64`)

Then **delete the downloaded artifact** from the workflow run (it held the key).

---

## Part B — Build the app file

1. Actions → **Build Student Android App** → **Run workflow** →
   **mode = build** → **Run workflow**.
2. Wait ~5–10 minutes. Open the finished run → **Artifacts** →
   download **vocaband-student-aab**. Inside is `app-release.aab` — that's the
   file Google Play wants.

Re-run this any time you need a fresh build (e.g. after changing the icon).

---

## Part C — Create the Play listing & upload

1. Play Console → **Create app** (a NEW app, not your old Draft).
   - Name: `Vocaband` · Language: English (US) · App · Free.
2. Left menu → **Test and release → Testing → Internal testing** →
   **Create new release** → upload `app-release.aab`.
3. First upload: accept **Play App Signing** (recommended — Google holds the
   real key; your upload key is recoverable if lost).
4. **Testers** tab → create an email list with your own email → save → roll out.
5. Install on your phone via the tester opt-in link.

---

## Part D — Required before public launch (Google-side, takes weeks)

- **App content** forms: Privacy policy (`https://www.vocaband.com/privacy.html`),
  Data Safety, Content rating, Ads (none).
- **Target audience = ages 9–12 / 13–15** → triggers Google's *Designed for
  Families* review (~2–4 weeks). Required because some students are under 13.
- **Closed testing**: personal developer accounts need ~12 testers for 14 days
  before production is unlocked.

Full detail on the forms lives in `docs/google-play-publishing-guide.md`
(written for the older TWA app, but the listing/Data-Safety/Families sections
apply identically to the student app).
