# Vocaband

A gamified vocabulary learning app for EFL (English as a Foreign Language) students, built around the Israeli English curriculum — Band 2 vocabulary.

Students join classes with a 6-digit code and practice vocabulary through 8 interactive game modes. Teachers create classes, assign word lists, and track student progress through a built-in gradebook and analytics dashboard.

## Features

### For Students
- **8 Game Modes**: Classic, Listening, Spelling, Matching, True/False, Flashcards, Word Scramble, Reverse
- **Live Challenges**: Real-time leaderboard competitions with classmates
- **Progress Tracking**: XP, streaks, badges, and per-assignment completion
- **Trilingual Support**: English, Hebrew, and Arabic translations
- **Avatar Selection**: Choose from fun emoji avatars
- **Global Leaderboard**: Compete across all classes

### For Teachers
- **Class Management**: Create classes with shareable 6-digit codes (WhatsApp integration)
- **Assignment Builder**: Select words from Band 2 vocabulary or upload custom word lists via CSV
- **OCR Word Detection**: Upload a photo of a textbook page to auto-detect vocabulary words
- **Gradebook**: View all student scores filtered by class
- **Analytics Dashboard**: Difficulty heatmap, daily progress trends, mode performance breakdown
- **Live Challenge Mode**: Run real-time competitions in class

### Vocabulary Bank
- 1,000+ words from the Israeli English curriculum (Band 2)
- Core I and Core II word sets
- Part-of-speech and receptive/productive tagging

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion (animations)
- **Backend**: Express + Socket.IO (real-time leaderboard)
- **Database**: Cloud Firestore with offline persistence
- **Auth**: Firebase Authentication (Google sign-in for teachers, anonymous auth for students)
- **PWA**: Installable via vite-plugin-pwa
- **OCR**: Tesseract.js for textbook image scanning

## Getting Started

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```
   npm install
   ```

2. Create `firebase-applet-config.json` from the example:
   ```
   cp firebase-applet-config.example.json firebase-applet-config.json
   ```
   Fill in your Firebase project credentials.

3. Deploy Firestore security rules and indexes to your Firebase project:
   ```
   firebase deploy --only firestore
   ```

4. Run the dev server:
   ```
   npm run dev
   ```

## Required Firestore Indexes

This app requires composite indexes on the `progress` collection. Deploy them with:

```
firebase deploy --only firestore:indexes
```

Required indexes (defined in `firestore.indexes.json`):

| Collection | Fields | Purpose |
|---|---|---|
| `progress` | `classCode` ASC + `studentName` ASC | Student login progress lookup |
| `progress` | `assignmentId` ASC + `mode` ASC + `studentName` ASC + `classCode` ASC | Score deduplication |
| `progress` | `classCode` ASC + `completedAt` DESC | Gradebook (sorted, paginated) |

Without these indexes, student login and gradebook queries will fail with a Firestore index error.

## Environment Variables

See `.env.example` for available configuration:

| Variable | Description | Default |
|---|---|---|
| `ALLOWED_ORIGIN` | CORS origin for WebSocket server | `http://localhost:3000` |
| `PORT` | Server port | `3000` |

## Security Notes

- Live challenge sockets are server-authorized:
  - `join-challenge` requires a valid auth token and class membership/ownership checks.
  - `observe-challenge` is restricted to authenticated teachers who own the class.
- Rate limiting for live challenge joins uses a time window and does not reset on disconnect.
- `npm audit --omit=dev` is the production security baseline and is currently clean.
- Current `npm audit` (including dev/build tooling) may still report advisories in the PWA/workbox chain. These affect build-time tooling, not runtime phone access.
- PWA is kept enabled. Students can use the app on phones with or without PWA:
  - Without PWA: app works via mobile browser URL.
  - With PWA: install-to-home-screen and offline caching improve UX.

## Project Structure

```
├── server.ts                  # Express + Socket.IO server
├── src/
│   ├── App.tsx                # Main application component
│   ├── ErrorBoundary.tsx      # Error boundary with Firestore error parsing
│   ├── firebase.ts            # Firebase SDK initialization and helpers
│   ├── vocabulary.ts          # Band 2 vocabulary word bank
│   ├── main.tsx               # React entry point
│   └── index.css              # Tailwind CSS entry
├── firebase-blueprint.json    # Firestore schema documentation
├── vite.config.ts             # Vite + Tailwind + PWA config
└── package.json
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | TypeScript type checking |
