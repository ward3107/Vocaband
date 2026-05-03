# Vocaband

> **Vocabulary learning that actually sticks** — a gamified classroom platform for Israeli EFL students (grades 4–9) and their teachers.

[🌐 www.vocaband.com](https://www.vocaband.com) · [📜 License](./LICENSE) · [🔐 Security Policy](./SECURITY.md) · [📨 contact@vocaband.com](mailto:contact@vocaband.com)

---

> ⚠️ **Source-available, not open-source.**
> This code is published under **MIT License with Commons Clause** — see [LICENSE](./LICENSE) for the full text.
>
> ✅ You may read, study, and learn from this code
> ✅ You may fork it for **non-commercial educational use**
> ❌ You may **not** sell it, host a paid service derived from it, or rebrand it as your own product
>
> For commercial licensing inquiries: **contact@vocaband.com**

---

## What it does

Vocaband turns vocabulary drills into a short, competitive classroom experience. Students join a class with a 6-character code (or scan a QR code for a Quick Play session — no account needed), pick from **11 interactive game modes**, and their progress streams live to the teacher's dashboard.

Every word is available in **English + Hebrew + Arabic** so the UI fits Israel's two dominant first languages, fully RTL-aware. Curriculum-aligned across **Set 1 / Set 2 / Set 3** (CEFR A1 → B2).

No app store. No personal data required for students. Works on any device with a browser.

---

## Table of contents

- [Screenshots](#screenshots)
- [Why Vocaband](#why-vocaband)
- [Features](#features)
  - [Game modes](#-10-game-modes)
  - [For teachers](#-for-teachers)
  - [For students](#-for-students)
  - [Quick Play](#-quick-play--qr-scan-no-login)
  - [Live Challenge](#-live-challenge--classroom-competition)
  - [Analytics](#-analytics-that-matter)
- [Accessibility](#accessibility)
- [Privacy & security](#privacy--security)
- [Getting started (users)](#getting-started-users)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## Screenshots

<table>
  <tr>
    <td align="center"><b>Landing page — meet Vocaband</b></td>
  </tr>
  <tr>
  </tr>
</table>

<table>
  <tr>
    <td align="center"><b>Teacher dashboard — Quick Play, Classroom, Approvals</b></td>
  </tr>
  <tr>
  </tr>
</table>

<table>
  <tr>
    <td align="center"><b>Student experience — pick a mode, pick a language, play</b></td>
  </tr>
  <tr>
  </tr>
</table>

> More screenshots in [`docs/screenshots/`](./docs/screenshots/) — accessibility toolbar, high-contrast mode, classroom analytics panels, and more.

---

## Why Vocaband

| Feature | Vocaband | Typical vocab apps |
|---|---|---|
| Trilingual (English / Hebrew / Arabic) | ✅ Built-in, RTL-aware | ❌ Rarely |
| Quick Play — QR scan, no login | ✅ Yes | ❌ No |
| Live classroom competition | ✅ Real-time leaderboard | ❌ No |
| No student account needed | ✅ Join by class code + name | ❌ Registration required |
| Game modes | ✅ 11 built-in (each with its own visual identity) | ❌ 1–2 max |
| Smart word matching (paste, OCR, AI translate) | ✅ Deep | ❌ Manual only |
| Teacher analytics (per-word mistakes) | ✅ Per-student, per-word | ❌ Basic |
| Accessibility (WCAG 2.0 AA, IS 5568) | ✅ 10-feature toolbar | ❌ Limited |
| Aligned to Israeli MoE curriculum | ✅ Set 1 / Set 2 / Set 3 | ❌ Generic |
| Adjustable display size for teachers | ✅ A / A / A toolbar control | ❌ Browser zoom only |

---

## Recent improvements (April–May 2026)

- **Per-mode visual identity** — each of the 11 modes redesigned with its own colour theme, mechanic-specific layout, and bigger mobile tap targets (88px+).  No more generic stone/blue tiles.  See the modes table below for the per-mode theme.
- **NEW MODE: Memory Flip** — face-down card flip game that reuses the Matching word pool but tests memory + meaning.
- **Matching → drag-line** — two-column layout with finger-drag SVG line drawing instead of flat tap-tap.  Tap-tap fallback preserved for accessibility.
- **Scramble → tap-to-assemble** — letter tiles in a tray instead of an on-screen keyboard.  No more typing on a phone keyboard that eats half the screen.
- **Spelling letter slots** — see the word's shape before typing.  Positional feedback on submit (green for matching letter, rose for wrong).
- **Quick Play language picker** — students pick EN/HE/AR right after entering nickname + avatar.  Mode-selection screen also has an inline picker bar so the language can be switched mid-session.
- **Tabbed avatar picker for Quick Play** — ~30 emojis × 6 themed groups + 30 lucide vector icons (Crown, Star, Rocket, etc.) for kids who want a non-cartoon identity.
- **Saved word groups across auth methods** — re-keyed by email so a teacher who signs in with magic link AND Google OAuth sees the same groups (Supabase otherwise treats those as separate users).
- **Resend SMTP integration** — magic-link + teacher-OTP emails now deliver via Resend instead of Supabase's rate-limited demo SMTP.  Operator setup walkthrough at [docs/RESEND-SMTP-SETUP.md](./docs/RESEND-SMTP-SETUP.md).

---

## Features

### 🎮 11 game modes

Every mode has its own visual identity (colour theme, mechanic-specific layout, dedicated mode pill). The full list:

| Mode | Theme | Description |
|---|---|---|
| **Flashcards** | cyan | Self-paced review — true 3D flip card with English on the front, target language on the back |
| **Classic** | emerald | See the English word, hear it pronounced, choose the correct translation |
| **Fill-in-the-Blank** | lime | A sentence with one word missing — pick the word that fits (sentence card has a real visible slot box, not inline underscores) |
| **Listening** | emerald | Audio only — no text shown. Trains the ear |
| **Spelling** | violet | Hear the word, type it in English. Letter slots show the word's shape; positional feedback on submit |
| **Matching** | amber | Two-column drag-line — drag a finger from a left tile to a right tile to draw a match (tap-tap fallback for non-touch) |
| **Memory Flip** | pink | Cards face-down — flip two at a time to find pairs. Same word pool as Matching, classic memory mechanic |
| **True / False** | rose ↔ emerald | Decide if the word–translation pair is correct. Big swipe-friendly buttons + paired colours for instant judgement |
| **Word Scramble** | indigo | Tap-to-assemble letter tiles from a tray instead of typing. No on-screen keyboard eating half the phone screen |
| **Reverse** | emerald | See the Hebrew/Arabic word, pick the English translation |
| **Letter Sounds** | violet | Phonics — each letter lights up + sounds out, then type the full word |
| **Sentence Builder** | teal | Listen to an audio sentence, then tap word tiles in order to build it. Big speaker hero so the audio prompt is unmissable |

Teachers can restrict which modes are available per assignment or Quick Play session.

---

### 👩‍🏫 For teachers

- **Quick Play** — Generate a QR code for instant vocabulary sessions. Students scan and play; no login required. Live podium with leader-change celebration chime, kick-student control, and a final-results modal.
- **Class management** — Create classes with shareable 6-character codes (WhatsApp-friendly). Rename classes and pick curated avatars any time without disturbing students or progress.
- **Assignment builder** — Pick from thousands of curriculum words, upload a `.docx`, paste a list, snap a photo (OCR), or pick from **46 curated topic packs** (Animals, Food, Family, Weather, Sports, House Rooms, Opposites, At the Doctor, Money & Shopping, Daily Routine, In the City, Holidays & Celebrations, Tools & Gadgets, Question Words, Greetings, and 31 more).
- **Saved templates** — Tick "Save as template" on any assignment and reuse the exact words + modes + settings in one tap from the dashboard.
- **Saved word groups** — Saving a template also saves its words to "Saved Groups" so future assignments can pick them up instantly.
- **Smart paste** — Paste words from any source. Exact matches auto-add; fuzzy matches show as click-to-add suggestions. Hebrew + Arabic paste supported.
- **AI translation** — Custom teacher words are automatically translated to Hebrew and Arabic.
- **Word families** — Toggle to see related forms (happy → happier, happiness) as suggestions.
- **Mode control** — Choose which of the 10 modes each assignment includes.
- **Sentence Builder config** — 4 difficulty levels with auto-generated sentences from your vocabulary.
- **Approvals queue** — New students sign up with "Request Account"; teacher approves from the dashboard tray (auto-refreshed so new requests appear without reloading).
- **Display-size control** — A / A / A buttons in the top bar scale the entire interface up to 138% for older eyes or projector view. Persists per device.
- **First-time guide** — Step-by-step onboarding tour highlights every dashboard feature for new teachers.

---

### 🎓 For students

- **Join instantly** — Class code + name + emoji avatar. No email, no password. Or sign up with a Google OAuth or magic-link email — both work, both share saved word groups (saved-groups are keyed by email so identity follows the teacher across auth methods).
- **Returning or new** — Clear "I'm returning / I'm new" toggle on the login screen.
- **Tabbed avatar picker** — ~30 emojis × 6 themed groups (Animals / Faces / Food / Sports / Space / Vehicles) plus a Geometric tab with 30 vector icons. Identity choice without collisions even when 30+ students join the same Quick Play session.
- **Language choice** — Inline EN/HE/AR picker bar at the top of the mode-selection screen. Tap to switch instantly; every mode tile + tooltip + intro re-renders in the chosen language. Quick Play students also see a dedicated language-pick step right after entering their nickname + avatar.
- **11 game modes** — Each assignment can include any subset of the 11.
- **XP, streaks, badges** — "Perfect Score", "Streak Master", "XP Hunter" and more.
- **Mode intro screens** — Brief instructions in English, Hebrew, or Arabic before each game.
- **Cumulative session scoring** — Quick Play sessions accumulate points across multiple modes for a fair leaderboard. Score restored on rescan-the-QR (90-min TTL) so kids who walk away don't lose their lead.
- **Motivational feedback** — Audio + visual encouragement on correct answers.

---

### ⚡ Quick Play — QR scan, no login

Teachers pick words, hit Launch, and students scan a QR code to join instantly. What's shipped:

- 6-character session code + QR code side by side
- All 11 game modes selectable per session (teacher's choice is respected end-to-end)
- Real-time teacher monitor with live podium
- **Join flow**: scan QR → pick avatar (tabbed picker, 6 themed emoji groups + 30 lucide vector icons) → enter nickname → pick UI language (EN/HE/AR) → join. Game UI from the moment of join is in the picked language.
- **QR collapses to a 64px floating icon** when the teacher hides it, with a live-joined badge. Tap to re-expand.
- **All teacher actions in one place** — Words list + End Session buttons live inside the QR card, no fixed footer competing for screen space
- Leader-change celebration chime + auto-music shuffle every 2 minutes (8 background tracks, teacher-selectable theme)
- Live connection indicator so teachers know if updates are instant or fallback
- Polling fallback keeps the podium fresh even if real-time is degraded
- Teacher can kick a student mid-session (top-3 podium kick affordance + rank-4+ inline kick)
- **Same-nickname re-join** — if a student loses connection or accidentally closes the tab, rescanning the QR with the same nickname adopts their old slot with score preserved (server-side); the local "Welcome back!" banner offers Resume in-place for up to 90 minutes
- Final-results screen for students — rank + top-3 mini podium highlighting "(you)"
- Custom teacher-added words supported alongside curriculum words (with AI translation)
- Per-session cumulative scoring — students keep their points across the modes they play

---

### 🏆 Live Challenge — classroom competition

A real-time competition mode for whole classes. Students join their class channel, the teacher broadcasts a word set, and the leaderboard updates live as answers come in.

- Ranked top-3 podium with crown animation and medal badges
- Leader-change chime
- Final-results modal when the teacher clicks "End Challenge"
- Connection-status pill + auto-reconnect with jittered back-off

---

### 📊 Analytics that matter

- **Reports dashboard** — Per-week trend chart, top struggling words across roster, plays-per-day histogram, attendance grid (✓/· per student per day for the last 14 days).
- **Performance matrix** — Every student × every assignment, color-coded by score. Click any cell to see details.
- **Most-missed words** — Which words students get wrong most, with Hebrew/Arabic translations and which students missed each one.
- **Students needing attention** — Auto-identifies students scoring below 70% or with high mistake rates.
- **Score by game mode** — Bar chart of average performance per mode, so you know what to practice next.
- **Student profiles** — Score trend chart, class average comparison, most challenging words, full attempt history.
- **Gradebook** — All students with expandable score details, mistake counts, and last-active dates.
- **CSV + PDF export** — Full reports in either format. CSV is UTF-8 with BOM (renders Hebrew/Arabic correctly in Excel); PDF embeds Noto Sans fonts so non-Latin names render correctly with right-aligned RTL.

---

## Accessibility

Vocaband meets **WCAG 2.0 Level AA** and **Israeli Standard IS 5568**:

- 10-feature accessibility toolbar (font size, high contrast, grayscale, inverted colors, dyslexia font, line spacing, reduce motion, underline links, highlight focus, reading guide)
- Full keyboard navigation with skip links and visible focus indicators
- Screen reader support: ARIA landmarks, labels, live regions
- Full RTL support for Hebrew and Arabic (layout mirrors, text aligns right, bidirectional safe)
- Accessibility statement in English, Hebrew, and Arabic at `/accessibility-statement`
- Teacher display-size control (A / A / A) for projector / older-eyes use

---

## Privacy & security

- **No personal data required for students** — class code + first name + emoji is enough.
- **Teacher accounts are allowlisted** — applications are reviewed manually before access is granted.
- **Trilingual privacy policy** at [/privacy-policy](https://www.vocaband.com/privacy-policy) (English, Hebrew, Arabic).
- **Vulnerability disclosure** — see [SECURITY.md](./SECURITY.md). Responsible disclosure encouraged; report privately to [contact@vocaband.com](mailto:contact@vocaband.com).
- **Public audit summary (redacted)** — [SECURITY_AUDIT.md](./SECURITY_AUDIT.md).

Specific operational and infrastructure details are intentionally omitted from public documentation. For commercial integrations or detailed security questions, please reach out via [contact@vocaband.com](mailto:contact@vocaband.com).

---

## Getting started (users)

**Teachers:** visit [www.vocaband.com](https://www.vocaband.com), sign in with Google (your email must be allowlisted — contact us at [contact@vocaband.com](mailto:contact@vocaband.com) for access), create a class, and share the 6-character code with your students.

**Students:** go to [www.vocaband.com](https://www.vocaband.com), tap "I'm a student", enter the class code your teacher gave you, pick your name (or tap "I'm new" to request a new account — your teacher approves it), then start playing.

**Quick Play (no account, no class):** when your teacher launches Quick Play, scan the QR code they show on their screen, pick a name, and start playing immediately.

---

## License

[MIT License with Commons Clause](./LICENSE).

Source-available for personal, educational, and non-commercial use. Commercial use, resale, hosting as a paid service, or integrating into a proprietary product requires a separate commercial license — reach out to [contact@vocaband.com](mailto:contact@vocaband.com).

---

## Acknowledgments

- Vocabulary lists derived from the **Israeli Ministry of Education English curriculum** (Sets 1–3)
- Hebrew + Arabic font support powered by Google's **Noto Sans** family
- Every teacher and student who has tested the app and told us what to fix next
