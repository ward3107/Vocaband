# Google Play "App content" forms — student app answer sheet

Copy-paste-ready answers for the **student** app `com.vocaband.student`
(the Capacitor shell that opens straight to student login and loads
`https://www.vocaband.com/student`).

Use this after the `.aab` is uploaded to a testing track, to clear the
**Play Console → Policy → App content** section (the wall that blocks
sending a release for review).

> ⚠️ **This app serves minors (ages 9–15).** These answers are engineering's
> best reading of actual app behaviour. Before you submit, have whoever owns
> legal sign-off (see `docs/legal/`) confirm the Data Safety + Target-audience
> answers — Google audits these and a mismatch pulls the listing.

Forms appear in Play Console in roughly this order. Do them top to bottom.

---

## 0. Before you touch the forms — App access (the #1 blocker)

The student app **requires login** (Google sign-in + class code). Google's
reviewer lands on the login screen and can go no further, so you **must**
give them a way in or the review fails.

**Play Console → App content → App access:**

- Choose **"All or some functionality is restricted"**.
- Add an instruction set:
  - **Name:** `Student login`
  - **Username / any other identifier:** a real, working demo student account
    (a Google account you control that is already enrolled in a live class),
    OR the class code + student email/PIN for a throwaway test student.
  - **Password:** that account's password (if it's a Google account, note
    that sign-in is via Google OAuth — see the "Notes" box below).
  - **Notes for reviewer:**
    ```
    This is the students-only app. On launch it opens the student login.
    Sign in with the Google account above, then enter class code: <CODE>.
    You will land on the student dashboard (games, XP, join-a-game).
    Teacher/marketing screens are intentionally not reachable in this app.
    ```

> If you don't already have a stable demo student, create one in a real test
> class now and keep it alive — you'll reuse it for every future review.

---

## 1. Privacy policy

**Play Console → App content → Privacy policy → Privacy policy URL:**

```
https://www.vocaband.com/privacy.html
```

Already live, covers minors, lists `privacy@vocaband.com` and a data-export /
deletion path. (Hebrew/Arabic/Russian parent notices exist too:
`/parents.html`, `/parents-he.html`, `/parents-ar.html`, `/parents-ru.html` —
not required by the form, but good to have linked from the listing.)

---

## 2. Ads

**App content → Ads → "Does your app contain ads?":** **No.**

Vocaband has no ads, no ad SDKs. (This matters extra under the Families
policy.)

---

## 3. Content ratings (IARC questionnaire)

**App content → Content ratings → Start questionnaire.**

- **Email:** `privacy@vocaband.com` (or your developer contact).
- **Category:** **Reference, News, or Educational** → **Education**.
- Then answer every content question **No**: no violence, no sexuality, no
  profanity, no controlled substances, no gambling/simulated gambling, no
  user-to-user open communication of personal info, no unrestricted internet
  browser.
- **Does the app share the user's current physical location?** No.
- **Does the app let users interact / exchange content?** In-class
  leaderboards show display names + scores to classmates; there is **no** open
  chat or DMs. If asked about user interaction, answer honestly that there is
  **no free-form user-to-user messaging** — shared content is limited to
  game scores/names within a teacher-created class.

Expected result: **Everyone / PEGI 3 / ESRB Everyone.** Submit to get the
ratings assigned.

---

## 4. Target audience and content (triggers "Designed for Families")

**App content → Target audience and content.**

- **Target age groups:** tick **Ages 9–12** and **13–15** (and 16–17/18+ only
  if you also market to older students; 9–12 is the one that triggers the
  stricter review).
- Because a selected age band is under 13, Play enrols the app in the
  **Designed for Families / Teacher Approved** track and adds several
  child-safety questions:
  - **Do you want the app to be eligible for the Teacher Approved / Families
    program?** Yes (recommended for a school app).
  - **Store presence / appeal to children:** Yes, the app is designed for
    children.
  - **Ads shown to children:** None.
  - **Uses an approved/certified ads SDK for Families:** N/A (no ads).
  - Confirm compliance with the **Families Policy Requirements** and
    **COPPA/GDPR-K**.

> This is the step that adds **~2–4 weeks** of Google review. Nothing you do
> in the app speeds it up — submit it early.

---

## 5. Data safety

**App content → Data safety.** This is the parent-facing form. Answer it to
match what the **student app** actually does (narrower than the teacher app —
no Gemini OCR of documents here; the camera is used only to scan a game QR
code, decoded on-device).

### Overview answers
- **Does your app collect or share any of the required user data types?**
  **Yes.**
- **Is all of the user data encrypted in transit?** **Yes** (HTTPS/TLS
  everywhere; Cloudflare + Supabase + Fly.io).
- **Do you provide a way for users to request that their data is deleted?**
  **Yes** — `privacy@vocaband.com` and the in-app export/delete path; parents
  can act on a child's behalf.

### Data types — COLLECTED (all linked to the user, none sold)
For each: **Collected = Yes, Shared = No** (Supabase/Fly are processors acting
on your behalf, which Google does **not** count as "sharing"), **Processed
ephemerally = No**, **Required (not optional)**, and the purposes listed.

| Category | Data type | Purposes |
|---|---|---|
| Personal info | **Name** (student display name) | App functionality, Account management |
| Personal info | **Email address** (from Google sign-in) | App functionality, Account management |
| Personal info | **User IDs** (Supabase user UUID) | App functionality |
| App activity | **App interactions** (XP, streaks, progress, game results) | App functionality, Analytics |

### Data types — NOT collected (declare these as "No")
- **Location** (approximate or precise) — No.
- **Financial info** — No (app is free, no purchases).
- **Health & fitness** — No.
- **Photos & videos** — **No.** The camera is used only for the in-app QR
  scanner; frames are decoded on-device (jsQR) and **never stored or
  transmitted**. Requesting the camera *permission* is not data *collection*.
- **Audio** (voice/sound recordings) — No (the app plays TTS; it does not
  record).
- **Contacts, Calendar, Messages** — No.
- **Files & docs** — No.
- **Web browsing history** — No.
- **Device or other IDs** — No (unless/until native push is enabled — see
  note).

### Third-party "sharing"
Declare **no data sharing**. Supabase (database) and Fly.io (API/WebSocket)
are **service providers/processors** under a DPA, which Play treats as
"processing on your behalf," not sharing. (The Gemini OCR path is a
teacher-app feature and is **not** in this student build.)

> **Push-notification note:** `google-services.json` is present so FCM *can*
> work, but the push feature ships **OFF** behind a flag pending legal
> sign-off (`docs/legal/PUSH-NOTIFICATIONS-COMPLIANCE.md`). While it is off,
> the app collects no FCM device token, so leave "Device or other IDs" = No.
> **When you turn push on**, come back and add: Device IDs (or the FCM token)
> collected for App functionality → "Send notifications," and re-declare.

### Security practices to tick
- Data is encrypted in transit: **Yes.**
- Users can request data deletion: **Yes.**
- Committed to follow the **Play Families Policy**: **Yes.**
- Independent security review: **Yes** (you have `docs/security-audit-*.md`,
  `docs/pentest-*.md`).

---

## 6. The remaining small declarations

These usually sit in the same App-content list; answer and save each:

- **Government apps** — No.
- **Financial features** — No (free, no payments, no crypto).
- **Health apps** — No.
- **News app** — No.
- **COVID-19 contact tracing/status** — No.
- **Data deletion (account deletion URL)** — if Play asks for a web URL where
  users can request account + data deletion, use
  `https://www.vocaband.com/privacy.html` (it documents the
  `privacy@vocaband.com` deletion route). A dedicated
  `/delete-account` page is a nice-to-have if Play insists on a direct link.

---

## 7. Store listing copy (Main store listing, not App content — but you'll need it)

- **App name:** `Vocaband`
- **Short description (≤80):**
  `Gamified English vocabulary for Israeli classrooms — join your class and play.`
- **Full description (≤4000):** pull the student angle:
  ```
  Vocaband turns English vocabulary practice into a game students actually
  want to play. Sign in, enter your class code, and dive into 15 game modes
  built around your teacher's word lists — with Hebrew and Arabic support so
  every student can follow along.

  • 15 game modes — matching, listening, sentence building, and more
  • Earn XP, streaks, avatars and titles as you learn
  • Join live class challenges and climb the leaderboard
  • Hebrew & Arabic translations, full right-to-left support
  • Built for Israeli Ministry of Education vocabulary sets (grades 4–9)

  No ads. Made for schools.
  ```
- **App category:** Education. **Tags:** Education, Educational.
- **Contact email:** `privacy@vocaband.com` (or a support address you monitor
  — it shows publicly on the listing).

Assets still needed for the listing (not the App-content forms): a 512×512
icon (reuse `public/icon-512.png`), a 1024×500 feature graphic, and 2–8 phone
screenshots. One iOS-sized shot exists at
`store-assets/screenshots/student-login-1290x2796.png`; Play wants its own
phone screenshots (9:16, e.g. 1080×1920).

---

## After the forms are green

1. All App-content sections show a green check → your testing-track release
   can be **sent for review**.
2. First release on a track with an under-13 age band starts the
   **Designed for Families** review (~2–4 weeks).
3. Personal developer accounts must run **Closed testing with ≥12 testers for
   14 continuous days** before Production unlocks (org accounts may not — check
   your Console).
4. Web/content changes ship via the normal Cloudflare deploy — **no new
   `.aab`** unless you change the icon, splash, or native shell config. Rebuild
   with Actions → **Build Student Android App** → `build` when you do.
