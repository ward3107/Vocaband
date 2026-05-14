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

Vocaband turns vocabulary drills into a short, competitive classroom experience. Students join a class with a short class code (or scan a QR code for a Quick Play session — no account needed), pick from a wide library of interactive game modes, and their progress streams live to the teacher's dashboard.

Every word is available in **English + Hebrew + Arabic** so the UI fits Israel's two dominant first languages, fully RTL-aware. Curriculum-aligned to the Israeli Ministry of Education English vocabulary (CEFR A1 → B2).

No app store. No personal data required for students. Works on any device with a browser.

---

## Table of contents

- [Why Vocaband](#why-vocaband)
- [What's new (2026)](#whats-new-2026)
- [Features](#features)
  - [Game modes](#-game-modes)
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

## Why Vocaband

| Feature | Vocaband | Typical vocab apps |
|---|---|---|
| Trilingual (English / Hebrew / Arabic) | ✅ Built-in, RTL-aware | ❌ Rarely |
| Quick Play — QR scan, no login | ✅ Yes | ❌ No |
| Live classroom competition | ✅ Real-time leaderboard | ❌ No |
| No student account needed | ✅ Join by class code + name | ❌ Registration required |
| Game modes | ✅ Multiple modes, each with its own visual identity | ❌ 1–2 max |
| Smart word input (paste, OCR, AI translate) | ✅ Deep | ❌ Manual only |
| Teacher analytics (per-word, per-student) | ✅ | ❌ Basic |
| Accessibility (WCAG 2.0 AA, IS 5568) | ✅ 10-feature toolbar | ❌ Limited |
| Aligned to Israeli MoE curriculum | ✅ | ❌ Generic |
| Adjustable display size for teachers | ✅ A / A / A toolbar control | ❌ Browser zoom only |

---

## What's new (2026)

The platform has matured significantly in 2026. Headline improvements:

- **Trilingual UI everywhere** — every student-facing screen, every teacher-facing screen, every dashboard module, every onboarding flow, every privacy/cookie banner, every live-challenge / setup wizard / Quick Play monitor, and every analytics/gradebook view now renders cleanly in English, Hebrew, and Arabic with full RTL mirroring.
- **Streamlined teacher dashboard** — assignment building, Quick Play, and roster tools were consolidated into a single "New Activity" surface. Fewer clicks, no hunting for buttons.
- **Per-mode visual identity** — each game mode has its own colour theme, mechanic-specific layout, and bigger mobile tap targets (88px+).
- **Memory Flip** — a face-down card flip game that reuses the Matching word pool but tests memory + meaning.
- **Matching → drag-line** — two-column layout with finger-drag SVG line drawing. Tap-tap fallback preserved for accessibility.
- **Scramble → tap-to-assemble** — letter tiles in a tray instead of an on-screen keyboard.
- **Spelling letter slots** — see the word's shape before typing; positional feedback on submit.
- **Quick Play language picker** — students pick EN/HE/AR right after entering nickname + avatar; switchable mid-session.
- **Tabbed avatar picker** — themed emoji groups + vector icons for kids who want a non-cartoon identity.
- **Roster-based student login** — teachers can pre-create a roster; students sign in with a short PIN — no Google account, no email required.
- **Interactive worksheets** — assign self-paced worksheets; attempts are recorded and surfaced in the teacher dashboard.
- **Certificate v2** — class certificates now include a "words mastered" stat.
- **Friendly soft-exit for students** — accidental back-button presses get a confirmation instead of yanking kids out of a session.
- **Email reliability** — magic-link and OTP emails now route through a production-grade SMTP provider.

---

## Features

### 🎮 Game modes

Vocaband ships a deep library of game modes — each with its own visual theme, mechanic, and pacing:

- **Flashcards** — self-paced review with a true 3D flip card.
- **Classic** — see the English word, hear it, choose the correct translation.
- **Fill-in-the-Blank** — a sentence with one word missing; pick the word that fits.
- **Listening** — audio only, no text. Trains the ear.
- **Spelling** — hear the word, type it. Letter slots reveal the word's shape; positional feedback on submit.
- **Matching** — two-column drag-line, finger-drag to match (tap-tap fallback).
- **Memory Flip** — face-down card flips, classic memory mechanic on the Matching pool.
- **True / False** — decide if a word–translation pair is correct.
- **Word Scramble** — tap-to-assemble letter tiles from a tray.
- **Reverse** — see the Hebrew/Arabic word, pick the English translation.
- **Letter Sounds** — phonics-driven: each letter lights up and sounds out.
- **Sentence Builder** — listen to a sentence, tap word tiles in order to build it.

Teachers can restrict which modes are available per assignment or Quick Play session.

---

### 👩‍🏫 For teachers

- **Quick Play** — Generate a QR code for instant vocabulary sessions. Students scan and play; no login required. Live podium with leader-change celebration chime, kick-student control, and a final-results modal.
- **Class management** — Create classes with shareable, WhatsApp-friendly codes. Rename classes and pick curated avatars any time without disturbing students or progress.
- **Roster + PIN login** — Pre-create your students; they sign in with a short PIN. No Google accounts, no email collection.
- **Assignment builder** — Pick from thousands of curriculum words, upload a `.docx`, paste a list, snap a photo (OCR), or pick from **dozens of curated topic packs** (Animals, Food, Family, Weather, Sports, House Rooms, Opposites, At the Doctor, Money & Shopping, Daily Routine, In the City, Holidays & Celebrations, Tools & Gadgets, Question Words, Greetings, and many more).
- **Saved templates** — Tick "Save as template" on any assignment and reuse the exact words + modes + settings in one tap.
- **Saved word groups** — Saving a template also saves its words to "Saved Groups" for instant reuse.
- **Smart paste** — Paste words from any source. Exact matches auto-add; fuzzy matches show as click-to-add suggestions. Hebrew + Arabic paste supported.
- **AI translation** — Custom teacher words are automatically translated to Hebrew and Arabic.
- **Word families** — Toggle to see related forms (happy → happier, happiness) as suggestions.
- **Interactive worksheets** — Assign printable / interactive worksheets; student submissions stream back to the dashboard.
- **Mode control** — Choose which modes each assignment includes.
- **Sentence Builder config** — Multiple difficulty levels with auto-generated sentences from your vocabulary.
- **Approvals queue** — New students sign up with "Request Account"; teacher approves from the dashboard tray (auto-refreshes).
- **Analytics & gradebook** — Per-student trend charts, top struggling words, class-average comparisons, mistake patterns by mode.
- **Class certificates** — One-click PDF certificates that include a "words mastered" stat and render Hebrew/Arabic names correctly.
- **Display-size control** — A / A / A buttons scale the interface for older eyes or projector view. Persists per device.
- **First-time guide** — Step-by-step onboarding tour highlights every dashboard feature for new teachers.

---

### 🎓 For students

- **Join instantly** — Class code + name + emoji avatar. No email, no password. Or sign up with Google OAuth, magic-link email, or a teacher-issued PIN — whatever your teacher configured.
- **Returning or new** — Clear "I'm returning / I'm new" toggle on the login screen.
- **Tabbed avatar picker** — Themed emoji groups (Animals / Faces / Food / Sports / Space / Vehicles) plus a Geometric tab with vector icons.
- **Language choice** — Inline EN/HE/AR picker at the top of the mode-selection screen. Switches everything — tiles, tooltips, intros — instantly.
- **A library of game modes** — Each assignment can include any subset.
- **XP, streaks, badges** — "Perfect Score", "Streak Master", "XP Hunter", and more.
- **Mode intro screens** — Brief instructions in English, Hebrew, or Arabic before each game.
- **Cumulative session scoring** — Quick Play sessions accumulate points across multiple modes for a fair leaderboard. Score restored on rescan so kids who walk away don't lose their lead.
- **Friendly back-button** — Accidental back-button presses prompt for confirmation instead of dropping you mid-session.
- **Motivational feedback** — Audio + visual encouragement on correct answers.

---

### ⚡ Quick Play — QR scan, no login

Teachers pick words, hit Launch, and students scan a QR code to join instantly:

- Short session code + QR code side by side
- All game modes selectable per session (teacher's choice is respected end-to-end)
- Real-time teacher monitor with live podium
- **Join flow**: scan → pick avatar (themed emoji groups + vector icons) → enter nickname → pick UI language → join.
- QR collapses to a small floating icon when the teacher hides it, with a live-joined badge.
- All teacher actions (Words list + End Session) live inside the QR card.
- Leader-change celebration chime + auto-music shuffle every 2 minutes (multiple background tracks, teacher-selectable theme).
- Live connection indicator + polling fallback so the podium stays fresh.
- Teacher can kick a student mid-session.
- **Same-nickname re-join** — if a student loses connection, rescanning with the same nickname adopts their old slot with score preserved.
- Final-results screen for students — rank + top-3 mini podium highlighting "(you)".
- Custom teacher-added words supported alongside curriculum words (with AI translation).
- Per-session cumulative scoring across the modes played.

---

### 🏆 Live Challenge — classroom competition

A real-time competition mode for whole classes. Students join their class channel, the teacher broadcasts a word set, and the leaderboard updates live as answers come in.

- Ranked top-3 podium with crown animation and medal badges
- Leader-change chime
- Final-results modal when the teacher clicks "End Challenge"
- Connection-status pill + auto-reconnect with jittered back-off

---

### 📊 Analytics that matter

- **Reports dashboard** — Per-week trend chart, top struggling words across roster, plays-per-day histogram, attendance grid.
- **Performance matrix** — Every student × every assignment, color-coded by score. Click any cell to see details.
- **Most-missed words** — Which words students get wrong most, with Hebrew/Arabic translations and which students missed each one.
- **Students needing attention** — Auto-identifies students scoring below threshold or with high mistake rates.
- **Score by game mode** — Bar chart of average performance per mode.
- **Student profiles** — Score trend chart, class average comparison, most challenging words, full attempt history.
- **Gradebook** — All students with expandable score details, mistake counts, and last-active dates.
- **CSV + PDF export** — UTF-8 CSV that renders Hebrew/Arabic correctly in Excel; PDF embeds Noto Sans fonts so non-Latin names render correctly with right-aligned RTL.

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
- **Teacher accounts are gated** — applications are reviewed manually before access is granted.
- **Trilingual privacy policy** at [/privacy-policy](https://www.vocaband.com/privacy-policy) (English, Hebrew, Arabic).
- **Vulnerability disclosure** — see [SECURITY.md](./SECURITY.md). Responsible disclosure encouraged; report privately to [contact@vocaband.com](mailto:contact@vocaband.com).

Operational, infrastructure, and implementation details are intentionally kept out of public documentation. For commercial integrations or specific security questions under NDA, please reach out via [contact@vocaband.com](mailto:contact@vocaband.com).

---

## Getting started (users)

**Teachers:** visit [www.vocaband.com](https://www.vocaband.com), request access (your email must be approved — contact us at [contact@vocaband.com](mailto:contact@vocaband.com)), create a class, and share the class code with your students.

**Students:** go to [www.vocaband.com](https://www.vocaband.com), tap "I'm a student", enter the class code your teacher gave you, pick your name (or tap "I'm new" to request a new account — your teacher approves it), then start playing.

**Quick Play (no account, no class):** when your teacher launches Quick Play, scan the QR code they show on their screen, pick a name, and start playing immediately.

---

## License

[MIT License with Commons Clause](./LICENSE).

Source-available for personal, educational, and non-commercial use. Commercial use, resale, hosting as a paid service, or integrating into a proprietary product requires a separate commercial license — reach out to [contact@vocaband.com](mailto:contact@vocaband.com).

---

## Acknowledgments

- Vocabulary lists derived from the **Israeli Ministry of Education English curriculum**
- Hebrew + Arabic font support powered by Google's **Noto Sans** family
- Every teacher and student who has tested the app and told us what to fix next
