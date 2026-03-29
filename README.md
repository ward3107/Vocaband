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
> For commercial licensing inquiries, contact: **vocaband.app@gmail.com**

---

Vocaband turns vocabulary drills into a competitive, engaging experience. Students join with a simple 6-digit class code and choose from **10 interactive game modes**. Teachers get real-time analytics, an OCR-powered assignment builder, and a live leaderboard competition tool — all aligned to the **Israeli English curriculum (Band I, II & III)** in **English, Hebrew, and Arabic**.

No app store. No personal data required. Works offline.

---

## Screenshots



---

## Why Vocaband?

| Feature | Vocaband | Typical Vocab Apps |
|---|---|---|
| Trilingual (English / Hebrew / Arabic) | ✅ Built-in | ❌ Rarely |
| OCR — scan a textbook photo | ✅ Yes | ❌ No |
| Live classroom competition | ✅ Real-time leaderboard | ❌ No |
| Israeli curriculum aligned (Band I, II & III) | ✅ Full coverage | ❌ No |
| No student account needed | ✅ Join by code + name | ❌ Registration required |
| Works offline (PWA) | ✅ Offline-first | ❌ Rarely |
| 10 game modes | ✅ All built-in | ❌ 1–2 modes max |
| Teacher analytics & mistake tracking | ✅ Deep | ❌ Basic |

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
| **Letter Sounds** | Learn phonics by matching letters to their sounds |
| **Sentence Builder** | Construct sentences using vocabulary words in context |

---

### 👩‍🏫 For Teachers

- **Class Management** — Create classes with shareable 6-digit codes (WhatsApp-friendly)
- **Assignment Builder** — Search 2,067 curriculum words by English, Hebrew, or Arabic
- **Smart Paste** — Paste a comma/newline list of words; auto-matches to curriculum vocabulary in seconds
- **OCR Word Detection** — Upload a textbook photo → Tesseract.js extracts text → auto-detects curriculum words
- **CSV Upload** — Import a custom word list (English, Hebrew, Arabic columns)
- **Fuzzy Matching** — Catches typos automatically (e.g. "helo" → "hello")
- **Word Families** — Toggle to include related forms (happy → happier, happiness)
- **Mode Control** — Choose which of the 10 game modes each assignment includes
- **Deadlines** — Set a due date per assignment
- **Assignment Preview** — Play the assignment yourself before assigning to students
- **Live Challenge** — Run a real-time vocabulary competition; watch a live leaderboard with animated podium

---

### 📊 Analytics That Matter

- **Performance Matrix** — Every student × every assignment, color-coded by score
- **Student Profiles** — Average score, trend chart, attempt count, most-missed words
- **Score Levels** — 90%+ (mastered), 70–89% (progressing), <70% (needs attention)
- **Gradebook** — Full score history, filterable by class and sortable by date/score

---

### 🎓 For Students

- **Join instantly** — Class code + name + emoji avatar. No email, no password
- **10 game modes** — Each assignment can have up to 10 modes to complete
- **XP & Streaks** — Earn XP per answer; maintain streaks across high-scoring sessions (🔥)
- **Badges** — "Streak Master" (5+ streak), "XP Hunter" (500+ XP)
- **Live leaderboard** — Compete with classmates in real time during teacher-run challenges
- **Mode intro screens** — Brief instructions before each game mode so students always know what to do
- **Progress tracking** — See which modes are done per assignment; overall progress bar on dashboard
- **Motivational feedback** — Encouraging messages on every correct answer
- **Offline support** — Play without internet; scores sync when back online

---

### ⚡ Live Challenge Mode

Teachers launch a class-wide competition from their dashboard. All students in the class compete simultaneously — scores update live via Socket.IO. A full-screen animated leaderboard shows 🥇🥈🥉 podium positions with sparkle effects, live score counters, and a crown for the leader.

---

## Vocabulary Bank

- **2,067 words** from the Israeli English curriculum
  - Band 1 / Core I: 1,040 words
  - Band 2 / Core II: 1,027 words
- Each word includes: English, Hebrew, Arabic, part of speech, receptive/productive tagging
- Multi-language search index (search by any of the three languages)

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Framer Motion
- **Backend**: Express + Socket.IO (real-time live challenge server)
- **Database**: Supabase (PostgreSQL) with Row-Level Security
- **Auth**: Supabase Auth — Google OAuth for teachers, anonymous PKCE for students
- **PWA**: Installable via vite-plugin-pwa (add to home screen, offline caching)
- **OCR**: Tesseract.js — browser-based textbook image scanning

---

## Getting Started
visit at (https://www.vocaband.com/)
