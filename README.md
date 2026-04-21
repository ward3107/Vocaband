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

Vocaband turns vocabulary drills into a short, competitive classroom experience. Students join a class with a 6-character code (or scan a QR code for a Quick Play session — no account needed), pick from **10 interactive game modes**, and their progress streams live to the teacher's dashboard.

Every word is available in **English + Hebrew + Arabic** so the UI fits Israel's two dominant first languages.  across **Set 1 / Set 2 / Set 3** (A1 → B2).

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
- [Tech stack](#tech-stack)
- [Architecture overview](#architecture-overview)
- [Getting started (users)](#getting-started-users)
- [Security](#security)
- [License](#license)

---

## Screenshots

### Landing page
![Vocaband landing page](./docs/screenshots/landing.png)

### Teacher dashboard
<table>
  <tr>
    <td align="center"><b>Dashboard — Quick Actions</b></td>
    <td align="center"><b>Classroom Analytics</b></td>
    <td align="center"><b>Students & Grades</b></td>
  </tr>
  <tr>
    <td><img src="./docs/screenshots/teacher-dashboard.png" width="280" alt="Teacher dashboard with Quick Play, Analytics, Gradebook cards"/></td>
    <td><img src="./docs/screenshots/analytics.png" width="280" alt="Score distribution, weekly activity, most missed words"/></td>
    <td><img src="./docs/screenshots/gradebook.png" width="280" alt="Student scores with expandable details"/></td>
  </tr>
</table>

### Student experience
<table>
  <tr>
    <td align="center"><b>Choose a game mode</b></td>
    <td align="center"><b>Classic mode — gameplay</b></td>
    <td align="center"><b>Language selection</b></td>
  </tr>
  <tr>
    <td><img src="./docs/screenshots/mode-selection.png" width="220" alt="10 game mode cards with icons"/></td>
    <td><img src="./docs/screenshots/gameplay.png" width="220" alt="Classic mode with word and answer options"/></td>
    <td><img src="./docs/screenshots/language-picker.png" width="220" alt="Hebrew or Arabic language choice"/></td>
  </tr>
</table>

### Quick Play & Assignment Builder
<table>
  <tr>
    <td align="center"><b>Quick Play — QR code</b></td>
    <td align="center"><b>Smart paste analysis</b></td>
    <td align="center"><b>Topic packs</b></td>
  </tr>
  <tr>
    <td><img src="./docs/screenshots/quick-play.png" width="220" alt="Quick Play QR code for students to scan"/></td>
    <td><img src="./docs/screenshots/paste-analysis.png" width="220" alt="Paste analysis with matched, suggested, and custom words"/></td>
    <td><img src="./docs/screenshots/topic-packs.png" width="220" alt="28 curated topic packs for quick word selection"/></td>
  </tr>
</table>

---

## Why Vocaband

| Feature | Vocaband | Typical vocab apps |
|---|---|---|
| Trilingual (English / Hebrew / Arabic) | ✅ Built-in, RTL-aware | ❌ Rarely |
| Quick Play — QR scan, no login | ✅ Yes | ❌ No |
| Live classroom competition | ✅ Real-time leaderboard | ❌ No |
| No student account needed | ✅ Join by class code + name | ❌ Registration required |
| Game modes | ✅ 10 built-in | ❌ 1–2 max |
| Smart word matching (paste, OCR, AI translate) | ✅ Deep | ❌ Manual only |
| Teacher analytics (per-word mistakes) | ✅ Per-student, per-word | ❌ Basic |
| Accessibility (WCAG 2.0 AA, IS 5568) | ✅ 10-feature toolbar | ❌ Limited |
| Aligned to Israeli MoE curriculum | ✅ Set 1 / Set 2 / Set 3 | ❌ Generic |

---

## Features

### 🎮 10 game modes

| Mode | Description |
|---|---|
| **Classic** | See the English word, hear it pronounced, choose the correct translation |
| **Listening** | Audio only — no text shown. Trains the ear |
| **Spelling** | Hear the word and type it correctly in English |
| **Matching** | Connect Hebrew/Arabic words to their English translations |
| **True / False** | Quick reflexes: decide if the word–translation pair is correct |
| **Flashcards** | Self-paced review — flip cards to see answers, no scoring pressure |
| **Word Scramble** | Unscramble mixed-up letters to form the English word |
| **Reverse** | See the Hebrew/Arabic word, pick the English translation |
| **Letter Sounds** | Phonics — each letter lights up and sounds out |
| **Sentence Builder** | Tap words in the correct order to build sentences from the vocabulary |

Teachers can restrict which modes are available per assignment or Quick Play session.

---

### 👩‍🏫 For teachers

- **Quick Play** — Generate a QR code for instant vocabulary sessions. Students scan and play; no login required. Kahoot-grade monitor with live podium, leader-change chime, and a final-results modal.
- **Class management** — Create classes with shareable 6-character codes (WhatsApp-friendly). Rename classes and pick curated avatars any time without disturbing students or progress.
- **Assignment builder** — Pick from 6,482 curriculum words, upload a `.docx`, paste a list, or snap a photo (OCR). Exact/fuzzy/starts-with matching surfaces candidates.
- **28 topic packs** — Pre-curated word groups (Family, School, Animals, Food, Travel, Sports, Technology, and 21 more). Add or remove entire packs with one click.
- **Smart paste** — Paste words from any source. Exact matches auto-add; fuzzy matches show as click-to-add suggestions. Supports Hebrew and Arabic paste.
- **AI translation** — Custom teacher words are automatically translated to Hebrew and Arabic.
- **Word families** — Toggle to see related forms (happy → happier, happiness) as suggestions.
- **Mode control** — Choose which of the 10 modes each assignment includes.
- **Sentence Builder config** — 4 difficulty levels with auto-generated sentences from your vocabulary.
- **Approvals queue** — New students sign up with "Request Account"; teacher approves from the dashboard tray (auto-refreshed every 10s so new requests appear without reloading).
- **First-time guide** — 6-step onboarding tour highlights every dashboard feature for new teachers.

---

### 🎓 For students

- **Join instantly** — Class code + name + emoji avatar. No email, no password.
- **Returning or new** — Clear "I'm returning / I'm new" toggle on the login screen so students know which path to pick.
- **Language choice** — Hebrew or Arabic, chosen on first game, remembered thereafter.
- **10 game modes** — Each assignment can include any subset of the 10.
- **XP, streaks, badges** — "Perfect Score", "Streak Master", "XP Hunter" and more.
- **Mode intro screens** — Brief instructions in English, Hebrew, or Arabic before each game.
- **Progress tracking** — See which modes are done per assignment.
- **Motivational feedback** — Audio + visual encouragement on correct answers.

---

### ⚡ Quick Play — QR scan, no login

Teachers pick words, hit Launch, and students scan a QR code to join instantly. What's shipped:

- 6-character session code + QR code side by side
- All 10 game modes selectable per session (teacher's choice is respected end-to-end)
- Real-time teacher monitor with live podium
- Leader-change celebration chime (WebAudio C-major triad)
- **Realtime connection indicator** — green "Live" / amber "Polling" / grey "Connecting" dot so teachers know if updates are instant or polling-fallback
- Polling fallback (every 5s) keeps the podium fresh even if the realtime subscription is degraded
- Teacher can kick a student mid-session; kicked students see a "Rejoin with a different name" button
- Final-results screen for students — rank + top-3 mini podium highlighting "(you)"
- Custom teacher-added words supported alongside curriculum words (with AI translation)

---

### 🏆 Live Challenge — classroom competition

A socket.io-powered real-time competition mode for whole classes. Students join their class channel, the teacher broadcasts a word set, and the leaderboard updates live as answers come in.

- Ranked top-3 podium with crown animation and medal badges
- Leader-change chime (same WebAudio pattern as Quick Play)
- Final-results modal when the teacher clicks "End Challenge"
- Connection-status pill + auto-reconnect with jittered back-off (up to 10s max delay, indefinite retries)

---

### 📊 Analytics that matter

- **Performance matrix** — Every student × every assignment, color-coded by score. Click any cell to see details.
- **Most-missed words** — Which words students get wrong most, with Hebrew/Arabic translations and which students missed each one.
- **Students needing attention** — Auto-identifies students scoring below 70% or with high mistake rates.
- **Score by game mode** — Bar chart of average performance per mode, so you know what to practice next.
- **Student profiles** — Score trend chart, class average comparison, most challenging words, full attempt history.
- **Gradebook** — All students with expandable score details, mistake counts, and last-active dates.

---

## Accessibility

Vocaband meets **WCAG 2.0 Level AA** and **Israeli Standard IS 5568**:

- 10-feature accessibility toolbar (font size, high contrast, grayscale, inverted colors, dyslexia font, line spacing, reduce motion, underline links, highlight focus, reading guide)
- Full keyboard navigation with skip links and visible focus indicators
- Screen reader support: ARIA landmarks, labels, live regions
- Full RTL support for Hebrew and Arabic (layout mirrors, text aligns right, bidirectional safe)
- Accessibility statement in English, Hebrew, and Arabic at `/accessibility-statement`

---

## Tech stack

### Frontend
- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS v4** (utility-first; no custom stylesheets)
- **motion/react** (Framer Motion successor) for animations
- **lucide-react** for icons
- **Howler.js** for background music + sound effects
- **Web Audio API** for short celebration chimes (no external audio assets)
- **socket.io-client** for Live Challenge real-time

### Backend
- **Cloudflare Worker** (`worker/index.ts`) — serves the SPA from `dist/client/` and proxies `/api/*` + `/socket.io/*` to the Render service (keeps everything same-origin, no CORS preflight)
- **Node + Express + socket.io** on Render — REST endpoints at `/api/*` and the live WebSocket server at `/socket.io/*`

### Database
- **Supabase (PostgreSQL)** — all tables protected by Row-Level Security
- **Supabase Auth** — Google OAuth for teachers, anonymous PKCE for students
- **Supabase Realtime** — for the Quick Play teacher monitor (student-progress INSERTs) and approval-wait auto-login
- **Supabase Storage** — word TTS audio + 74 motivational praise phrases

### AI / external
- **Google Cloud (Gemini)** — OCR for photo-to-vocabulary uploads + AI-generated sentences for Sentence Builder
- **MyMemory Translation API** — fallback translation for custom teacher words

---

## Architecture overview

```
Student / Teacher browser
       │
       ▼
Cloudflare Worker  ──  serves /dist/client/  (static SPA)
       │
       ├──  /api/*       ────────────►  Render (Node + Express)
       ├──  /socket.io/* ────────────►  Render (socket.io)
       │
       ▼
Supabase
 ├── Postgres + RLS (users, classes, assignments, progress,
 │                   student_profiles, quick_play_sessions, ...)
 ├── Supabase Auth
 ├── Supabase Realtime (Quick Play monitor, approval-wait)
 └── Supabase Storage   (word audio, motivational phrases)
```

---

## Getting started (users)

**Teachers:** visit [www.vocaband.com](https://www.vocaband.com), sign in with Google (your email must be allowlisted — contact us at [contact@vocaband.com](mailto:contact@vocaband.com) for access), create a class, and share the 6-character code with your students.

**Students:** go to [www.vocaband.com](https://www.vocaband.com), tap "I'm a student", enter the class code your teacher gave you, pick your name (or tap "I'm new" to request a new account — your teacher approves it), then start playing.

**Quick Play (no account, no class):** when your teacher launches Quick Play, scan the QR code they show on their screen, pick a name, and start playing immediately.

---

## Security

- Vulnerability disclosure policy: [SECURITY.md](./SECURITY.md)
- Public audit summary (redacted): [SECURITY_AUDIT.md](./SECURITY_AUDIT.md)
- Report a vulnerability privately: [contact@vocaband.com](mailto:contact@vocaband.com)

---

## License

[MIT License with Commons Clause](./LICENSE).

Source-available for personal, educational, and non-commercial use. Commercial use, resale, hosting as a paid service, or integrating into a proprietary product requires a separate commercial license — reach out to [contact@vocaband.com](mailto:contact@vocaband.com).

---

## Acknowledgments

- Vocabulary lists derived from the **Israeli Ministry of Education English curriculum** (Sets 1–3)
- Google OAuth + Gemini API for auth and AI features
- Supabase for the Postgres + Realtime + Auth stack
- MyMemory for fallback translation
- Every teacher and student who has tested the app and told us what to fix next
