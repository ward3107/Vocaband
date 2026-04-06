# Vocaband

> **Vocabulary learning that actually sticks** — a gamified classroom platform for EFL students and their teachers.

---

> ⚠️ **Copyright Notice**
>
> This project is protected under the **MIT License with Commons Clause**.
>
> - ✅ You may view and learn from this code
> - ❌ You may **NOT** use this code for commercial purposes or sell products based on it
> - ❌ You may **NOT** copy, redistribute, or claim this code as your own
>
> For commercial licensing inquiries, contact: **contact@vocaband.com**

---

Vocaband turns vocabulary drills into a competitive, engaging experience. Students join with a simple 6-digit class code and choose from **10 interactive game modes**. Teachers get real-time analytics, a smart assignment builder with AI-powered translation, and Quick Play QR-code sessions — all aligned to the **Israeli English curriculum (Bands 1–3)** in **English, Hebrew, and Arabic**.

No app store. No personal data required. Works on any device.

---

## Screenshots

### Landing Page
![Vocaband landing page](./docs/screenshots/landing.png)

### Teacher Dashboard
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

### Student Experience
<table>
  <tr>
    <td align="center"><b>Choose a Game Mode</b></td>
    <td align="center"><b>Classic Mode — Gameplay</b></td>
    <td align="center"><b>Language Selection</b></td>
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
    <td align="center"><b>Quick Play — QR Code</b></td>
    <td align="center"><b>Smart Paste Analysis</b></td>
    <td align="center"><b>Topic Packs</b></td>
  </tr>
  <tr>
    <td><img src="./docs/screenshots/quick-play.png" width="220" alt="Quick Play QR code for students to scan"/></td>
    <td><img src="./docs/screenshots/paste-analysis.png" width="220" alt="Paste analysis with matched, suggested, and custom words"/></td>
    <td><img src="./docs/screenshots/topic-packs.png" width="220" alt="28 curated topic packs for quick word selection"/></td>
  </tr>
</table>

---

## Why Vocaband?

| Feature | Vocaband | Typical Vocab Apps |
|---|---|---|
| Trilingual (English / Hebrew / Arabic) | ✅ Built-in | ❌ Rarely |
| Quick Play — QR scan, no login | ✅ Yes | ❌ No |
| Live classroom competition | ✅ Real-time leaderboard | ❌ No |
| Israeli curriculum aligned (Bands 1–3) | ✅ Full coverage | ❌ No |
| No student account needed | ✅ Join by code + name | ❌ Registration required |
| 10 game modes | ✅ All built-in | ❌ 1–2 modes max |
| Smart word matching (paste, AI translate) | ✅ Deep | ❌ Manual only |
| Teacher analytics & mistake tracking | ✅ Per-word, per-student | ❌ Basic |
| Accessibility (WCAG 2.0 AA, IS 5568) | ✅ 10-feature toolbar | ❌ Limited |

---

## Features

### 🎮 10 Game Modes — Something for Every Learner

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
| **Letter Sounds** | Learn phonics — each letter lights up and sounds out |
| **Sentence Builder** | Tap words in correct order to build sentences from vocabulary |

---

### 👩‍🏫 For Teachers

- **Quick Play** — Generate a QR code for instant vocabulary sessions. Students scan and play — no login required
- **Class Management** — Create classes with shareable 6-digit codes (WhatsApp-friendly)
- **Assignment Builder** — Search 5,156 curriculum words by English, Hebrew, or Arabic
- **28 Topic Packs** — Pre-curated word groups (Family, School, Animals, Food, Travel, Sports, Technology, and 21 more). Add or remove entire packs with one click
- **Smart Paste** — Paste words from any source. Exact matches auto-added, fuzzy/starts-with shown as click-to-add suggestions. Supports Hebrew and Arabic paste
- **AI Translation** — Custom words automatically translated to Hebrew and Arabic via MyMemory API
- **Word Families** — Toggle to see related forms (happy → happier, happiness) as suggestions
- **Mode Control** — Choose which of the 10 game modes each assignment includes
- **Sentence Builder** — 4 difficulty levels with auto-generated sentences from your vocabulary
- **Assignment Preview** — Play the assignment yourself before assigning
- **First-Time Guide** — 6-step onboarding tour highlights every dashboard feature for new teachers

---

### 📊 Analytics That Matter

- **Performance Matrix** — Every student × every assignment, color-coded by score. Click any cell to see details
- **Most Missed Words** — Shows which words students get wrong most, with Hebrew/Arabic translations and which students missed each word
- **Students Needing Attention** — Auto-identifies students scoring below 70% or with high mistake rates
- **Score by Game Mode** — Bar chart showing average performance per mode — helps decide what to practice next
- **Student Profiles** — Average score vs. class average, score trend chart, most challenging words, full attempt history
- **Gradebook** — All students with expandable score details, mistake counts, and activity dates

---

### 🎓 For Students

- **Join instantly** — Class code + name + emoji avatar. No email, no password
- **Language choice** — Choose Hebrew or Arabic on first game (remembered for future sessions)
- **10 game modes** — Each assignment can have up to 10 modes to complete
- **XP & Streaks** — Earn XP per answer; maintain streaks across sessions
- **Badges** — "Perfect Score", "Streak Master", "XP Hunter"
- **Mode intro screens** — Brief instructions in English, Hebrew, or Arabic before each game
- **Progress tracking** — See which modes are done per assignment
- **Motivational feedback** — Audio + visual encouragement on correct answers

---

### ⚡ Quick Play Mode

Teachers select words, click "Generate QR Code", and students scan to join instantly. No login, no class code needed. Features:
- QR code + 6-character session code
- All 10 game modes available
- Real-time teacher monitor with student scores
- Supports both curriculum words and custom teacher-added words with AI translation

---

## Vocabulary Bank

- **5,156 words** from the Israeli English curriculum
  - Band 1 / Core I and Band 2 / Core II
- Each word includes: English, Hebrew, Arabic
- Multi-language search (search by any of the three languages)
- **28 topic packs** with curated word selections (Family, Animals, Food, Nature, Travel, Sports, Technology, and more)

---

## Accessibility

Vocaband meets **WCAG 2.0 Level AA** and **Israeli Standard IS 5568**:

- 10-feature accessibility toolbar (font size, contrast, dyslexia font, reduce motion, and more)
- Full keyboard navigation with skip links and focus indicators
- Screen reader support with ARIA landmarks and labels
- RTL support for Hebrew and Arabic
- Accessibility statement available in English, Hebrew, and Arabic at `/accessibility-statement`

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Framer Motion
- **Backend**: Express + Socket.IO (real-time live challenge server)
- **Database**: Supabase (PostgreSQL) with Row-Level Security and Realtime subscriptions
- **Auth**: Supabase Auth — Google OAuth for teachers, anonymous PKCE for students
- **Hosting**: Render (backend) + Cloudflare (CDN/protection)
- **AI Translation**: MyMemory Translation API (Hebrew + Arabic)
- **Accessibility**: WCAG 2.0 AA compliant with 10-feature accessibility toolbar

---

## Getting Started

Visit [www.vocaband.com](https://www.vocaband.com/)
