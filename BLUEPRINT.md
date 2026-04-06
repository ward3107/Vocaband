# Vocaband Development Blueprint
> Comprehensive architecture, UX audit, and phased roadmap
> Last updated: 2026-04-06

---

## 1. Current Architecture Overview

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Tailwind CSS 4 + Framer Motion |
| Backend | Express.js + Socket.IO (real-time) |
| Database | Supabase (PostgreSQL) with RLS |
| Auth | Supabase Auth (Google OAuth + PKCE + PIN-based) |
| Audio | Howler.js + Cloudflare R2 CDN |
| Build | Vite 6 + PWA (vite-plugin-pwa) |
| Hosting | Render (server) + Cloudflare (CDN/DNS) |

### User Roles
| Role | Auth Method | Capabilities |
|------|------------|--------------|
| Teacher | Google OAuth (allowlisted emails) | Create classes, assignments, monitor progress, Quick Play |
| Student | PIN (class code + name) or Google OAuth | Join classes, play games, earn XP, shop |
| Guest | No auth (URL/QR join) | Quick Play only, no persistence |
| Admin | Database-level | Full access, data cleanup |

### Database Schema (11 tables)
| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| users | All user profiles & progression | PK: uid |
| student_profiles | OAuth + PIN student registration | FK: class_code -> classes.code |
| classes | Teacher-owned classrooms | FK: teacher_uid -> users.uid |
| assignments | Word lists + game mode configs | FK: class_id -> classes.id |
| progress | Student game completion records | FK: assignment_id, student_uid |
| quick_play_sessions | Temporary QR game sessions | FK: teacher_uid -> users.uid |
| quick_play_joins | Realtime student join tracking | FK: session_code |
| quick_play_custom_words | Teacher-defined vocab for QP | FK: session_code |
| teacher_allowlist | Pre-approved teacher emails | Admin-only |
| consent_log | GDPR consent tracking | FK: uid |
| audit_log | Security/compliance log | FK: actor_uid |

### Current Screens (22 views)
| # | View | Role | Description |
|---|------|------|-------------|
| 1 | public-landing | All | Hero + feature showcase |
| 2 | public-terms | All | Terms of Service |
| 3 | public-privacy | All | Privacy Policy |
| 4 | student-account-login | Student | PIN login (class code + name) |
| 5 | student-dashboard | Student | XP, streak, assignments, shop access |
| 6 | game | Student | Active game session (10 modes) |
| 7 | shop | Student | Avatar/theme/power-up store |
| 8 | privacy-settings | Student | GDPR data export/delete |
| 9 | teacher-dashboard | Teacher | Class management hub |
| 10 | create-assignment | Teacher | Multi-step assignment wizard |
| 11 | teacher-approvals | Teacher | Approve/reject student join requests |
| 12 | students | Teacher | Enrolled student list |
| 13 | analytics | Teacher | Performance charts |
| 14 | gradebook | Teacher | Score grid + CSV export |
| 15 | live-challenge-class-select | Teacher | Select class for live game |
| 16 | live-challenge | Both | Real-time competition |
| 17 | global-leaderboard | Both | Top performers across classes |
| 18 | quick-play-setup | Teacher | Create QR session |
| 19 | quick-play-teacher-monitor | Teacher | Monitor live QP session |
| 20 | quick-play-student | Guest | Join & play via QR |
| 21 | onboarding-tour | Teacher | First-time dashboard walkthrough |
| 22 | accessibility-statement | All | WCAG/IS 5568 compliance |

### Game Modes (10)
| Mode | Mechanic | Input |
|------|----------|-------|
| Classic | 4-option multiple choice (EN -> HE/AR) | Tap |
| Listening | Audio + blurred word, 4 options | Tap |
| Spelling | See translation, type English | Keyboard |
| Matching | Pair English with translations | Tap pairs |
| True/False | Binary: is this translation correct? | Tap |
| Flashcards | Flip card, self-assess | Tap |
| Scramble | Unscramble letters | Keyboard |
| Reverse | See HE/AR, pick English | Tap |
| Letter-Sounds | Phonetic reveal, then type | Keyboard |
| Sentence-Builder | Arrange words into sentence | Tap words |

---

## 2. UX Gaps & Missing Features

### A. Critical (Blocks core user journeys)

| # | Gap | Impact | Effort |
|---|-----|--------|--------|
| A1 | **No password reset / account recovery** for students | Students locked out if they forget name/class code | Medium |
| A2 | **No offline mode** - app unusable without internet | Schools with poor WiFi lose entire sessions | High |
| A3 | **No notification system** - students don't know about new assignments | Teachers must tell students verbally | Medium |
| A4 | **App.tsx is 8,700 lines** - unmaintainable monolith | Any change risks breaking unrelated features | High |
| A5 | **No loading states for game transitions** | Perceived freeze between questions on slow devices | Low |

### B. Important (Standard UX conventions missing)

| # | Gap | Impact | Effort |
|---|-----|--------|--------|
| B1 | **No onboarding for students** | Students confused by dashboard on first visit | Medium |
| B2 | **No "undo" on assignment deletion** | Accidental delete is permanent | Low |
| B3 | **No assignment duplication** | Teachers recreate similar assignments from scratch | Low |
| B4 | **No word pronunciation in assignment preview** | Teachers can't verify audio before assigning | Low |
| B5 | **No bulk student management** (approve all, remove multiple) | Teachers with 30+ students do one-by-one | Low |
| B6 | **No assignment reordering** | Assignments show in creation order only | Low |
| B7 | **No "try again" after game completion** | Students must navigate back and re-select | Low |
| B8 | **No progress on individual words** | Students don't know which words they struggle with | Medium |
| B9 | **No teacher-to-student messaging** | No way to send hints, encouragement, or instructions | Medium |
| B10 | **No dark mode in game screen** | Game ignores active theme/dark mode preference | Low |

### C. Nice-to-have (Polish & engagement)

| # | Gap | Impact | Effort |
|---|-----|--------|--------|
| C1 | **No daily challenge / word of the day** | No reason for students to return daily | Medium |
| C2 | **No achievement badges with visual flair** | Badges are just strings, no unlock animations | Low |
| C3 | **No sound effects for correct/wrong** (beyond motivational) | Game feels silent on wrong answers | Low |
| C4 | **No multiplayer matching game** | All modes are solo | High |
| C5 | **No parent progress reports** | Parents have no visibility | Medium |
| C6 | **No teacher analytics export** (PDF/email) | Analytics only viewable in-app | Medium |
| C7 | **No confetti/celebration on streak milestones** | Streaks feel unrewarded | Low |
| C8 | **No haptic feedback on mobile** | Missed engagement opportunity | Low |

### D. Accessibility Gaps

| # | Gap | WCAG Rule | Effort |
|---|-----|-----------|--------|
| D1 | **Game timer/auto-advance has no pause** | 2.2.1 Timing Adjustable | Low |
| D2 | **Keyboard navigation incomplete in game modes** | 2.1.1 Keyboard | Medium |
| D3 | **No skip-to-content link** | 2.4.1 Bypass Blocks | Low |
| D4 | **Color-only feedback** (green=correct, red=wrong) | 1.4.1 Use of Color | Low |
| D5 | **No reduced-motion support** | 2.3.3 Animation from Interactions | Low |
| D6 | **RTL layout incomplete** for Hebrew/Arabic UI text | Global | Medium |

### E. Technical Debt

| # | Issue | Risk | Effort |
|---|-------|------|--------|
| E1 | **App.tsx monolith (8,700 lines)** | Merge conflicts, slow IDE, hard to test | High |
| E2 | **47 useState variables in one component** | State bugs, re-render waterfalls | High |
| E3 | **No error boundary per feature** | One crash takes down entire app | Medium |
| E4 | **WAV music files (29MB total)** | Slow load on mobile data | Low |
| E5 | **No TypeScript strict mode** | Runtime type errors possible | Medium |
| E6 | **Socket.IO polling fallback not monitored** | Silent degradation in live challenges | Low |
| E7 | **No database migrations CI check** | Schema drift between environments | Medium |
| E8 | **Vocabulary data bundled in JS (267KB)** | Large initial bundle, can't update without deploy | Medium |

---

## 3. Proposed Phased Roadmap

### Phase 1: Stability & Mobile Polish (Current Sprint)
> Goal: Make the existing app rock-solid on mobile

| Task | Priority | Status |
|------|----------|--------|
| Fix mobile game layout (tap targets, spacing, overflow) | Critical | DONE |
| Convert music WAV -> MP3 (29MB -> ~3MB) | Important | Pending (user has files) |
| Add loading states between game questions | Important | Todo |
| Fix game theme/dark mode consistency | Important | Todo |
| Add "Try Again" button on game completion | Quick win | Todo |
| Add reduced-motion support (`prefers-reduced-motion`) | A11y | Todo |
| Add color + icon feedback (not color-only) | A11y | Todo |

### Phase 2: Teacher Quality of Life
> Goal: Reduce teacher friction for daily use

| Task | Priority |
|------|----------|
| Assignment duplication ("Copy Assignment") | High |
| Bulk approve students | High |
| "Undo" on assignment/class deletion (soft delete + 30s toast) | High |
| Word pronunciation preview in assignment wizard | Medium |
| Assignment reordering (drag or manual sort) | Medium |
| Analytics export (CSV/PDF) | Medium |
| Teacher notes per student | Low |

### Phase 3: Student Engagement
> Goal: Increase daily active usage and retention

| Task | Priority |
|------|----------|
| Student onboarding tour (first-time flow) | High |
| "Word Mastery" per-word progress tracking | High |
| Daily challenge / word of the day | High |
| Streak milestone celebrations (confetti at 7, 30, 100) | Medium |
| Achievement unlock animations | Medium |
| Wrong-answer sound effect | Medium |
| "Try Again" with focus on missed words only | Medium |

### Phase 4: Architecture Refactor
> Goal: Make the codebase maintainable and testable

| Task | Priority |
|------|----------|
| Split App.tsx into feature modules | Critical |
| Extract game engine to useGame() hook | Critical |
| Extract auth flow to useAuth() hook | High |
| Add per-feature error boundaries | High |
| Move vocabulary to Supabase (dynamic, no deploy needed) | Medium |
| Add E2E tests (Playwright) | Medium |
| TypeScript strict mode | Medium |

### Phase 5: Advanced Features
> Goal: Differentiate from competitors

| Task | Priority |
|------|----------|
| Notification system (new assignment, streak at risk) | High |
| Offline mode (service worker + IndexedDB cache) | High |
| Parent progress reports (email digest) | Medium |
| Multiplayer matching game mode | Medium |
| RTL-first layout for Hebrew/Arabic UI | Medium |
| Teacher-to-student messaging | Low |
| AI-generated practice sentences | Low |

---

## 4. API Endpoints (Current)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | /api/health | None | Health check |
| POST | /api/translate | Teacher JWT | Translate custom words (MyMemory API) |
| POST | /api/ocr | Teacher JWT | Extract text from uploaded image |
| GET | /sitemap.xml | None | SEO |
| GET | /.well-known/security.txt | None | Security disclosure |

### Socket.IO Events
| Event | Direction | Purpose |
|-------|-----------|---------|
| JOIN_CHALLENGE | Client -> Server | Student joins live game |
| OBSERVE_CHALLENGE | Client -> Server | Teacher watches live game |
| UPDATE_SCORE | Client -> Server | Student reports score change |
| LEADERBOARD_UPDATE | Server -> Client | Broadcast updated rankings |
| CHALLENGE_ENDED | Server -> Client | Teacher ends session |

---

## 5. Environment Variables

### Required
| Variable | Purpose |
|----------|---------|
| SUPABASE_URL | Supabase project URL |
| SUPABASE_SERVICE_ROLE_KEY | Server-side admin key |
| VITE_SUPABASE_URL | Client-side Supabase URL |
| VITE_SUPABASE_ANON_KEY | Client-side anon key (RLS-protected) |

### Optional
| Variable | Purpose | Default |
|----------|---------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment | development |
| ALLOWED_ORIGIN | CORS origin | http://localhost:3000 |
| VITE_CLOUDFLARE_URL | CDN for audio files | (local fallback) |
| GOOGLE_TRANSLATE_API_KEY | Translation API | (503 if missing) |

---

## 6. Security Checklist

| Area | Status |
|------|--------|
| RLS on all user-facing tables | Done |
| JWT verification on Socket.IO | Done |
| Rate limiting on API endpoints | Done |
| PKCE OAuth flow | Done |
| Teacher email allowlist | Done |
| CSP headers | Done |
| HSTS | Done (auth.vocaband.com) |
| Audit logging | Done |
| GDPR data export/delete | Done |
| Input validation (server-side) | Done |
| XSS prevention | Done (CSP + React) |
| SQL injection prevention | Done (Supabase parameterized queries) |
| File upload size limits | Done (5MB OCR) |
| Consent tracking | Done |

---

## 7. Performance Targets

| Metric | Current | Target |
|--------|---------|--------|
| First Contentful Paint | ~1.5s | < 1.5s |
| JS Bundle (main) | 500KB gzip | < 300KB (after split) |
| Vocabulary data | 267KB bundled | Dynamic load from DB |
| Music files | 29MB (WAV) | ~3MB (MP3) |
| Game mode switch | ~200ms | < 100ms |
| Socket latency | ~50ms | < 100ms |
| Lighthouse Mobile | ~75 | > 90 |

---

*This blueprint is a living document. Update it as features are completed or priorities shift.*
