# VocaHebrew Parity — Remaining Work

Snapshot of what's still pending after the 2026-05-10 / 2026-05-11 dashboard parity sweep. Items grouped by category, each with concrete next steps and acceptance criteria.

For the architecture decisions and patterns the sweep established, see `~/.claude/projects/.../memory/project_vocahebrew_parity.md` and `feedback_hebrew_parity_patterns.md`.

For per-issue status with diagnosis, see `docs/open-issues.md`.

---

## Operator actions (no code work — your input needed)

### 1. Apply Quick Play subject migration

- **File:** `supabase/migrations/20260510120000_quick_play_subject.sql`
- **Why:** Without this, `HebrewQuickPlaySetupView` calls `create_quick_play_session(p_subject='hebrew')` and the RPC rejects the unknown parameter. Hebrew QP throws "Failed to create session" toast on every attempt.
- **How:** Apply via Supabase dashboard SQL editor or `supabase db push`. Migration is idempotent (`IF NOT EXISTS`, `DO $$...$$`) so safe to re-run.
- **Verify:** Create a Hebrew QP session in production. Should succeed and produce a 6-character session code.

### 2. Generate Hebrew TTS MP3s

- **Pipeline:** Pre-niqqud each Hebrew lemma via Dicta-Nakdan API → run through Azure HilaNeural (recommended, ~$16/M chars) or Google Cloud TTS Wavenet (you already have `GOOGLE_CLOUD_API_KEY`).
- **Output:** Upload to Supabase Storage at `sound-hebrew/<lemmaId>.mp3` (the bucket the `useAudio` Hebrew branch is wired to read from).
- **Pattern:** Mirror of `scripts/generate-audio.ts` for English. New script `scripts/generate-audio-hebrew.ts` would loop over `HEBREW_LEMMAS`, call the niqqud + TTS pipelines, upload via supabase-js.
- **Until done:** Hebrew students hear the browser's built-in voice (iOS Carmit is OK; Android/Windows quality varies wildly).

### 3. Expand Hebrew lemma bank from 30 to 1500+

- **Tool:** `scripts/generate-hebrew-lemmas.py` (already shipped). Pipeline: input → Dicta Nakdan (niqqud) → Gemini (morphology + translations + theme) → TS rows.
- **Inputs needed:** A real Hebrew frequency list (top 1500–3000 words). Sources: OpenSubtitles he frequency list, or the Israeli MoE official curriculum vocabulary if you can source the data.
- **Run:** `GOOGLE_CLOUD_API_KEY=... python scripts/generate-hebrew-lemmas.py --input scripts/hebrew-frequency-list.txt --output src/data/vocabulary-hebrew.generated.ts --start-id 31`
- **Output is gitignored.** Review by hand (Hebrew speaker for niqqud accuracy spot-check on first ~200), then merge into `vocabulary-hebrew.ts`.
- **Cost estimate:** ~$3 in Gemini Flash for 3000 lemmas.

---

## Engineering — multi-session refactors

### 4. Full FreeResourcesView fold

- **Current state:** `HebrewWorksheetView` (stop-gap) ships 2 of FreeResourcesView's 14 templates (Word List, Match the Words). Hebrew classes route to it from the dashboard's Worksheet tile.
- **Goal:** Make `FreeResourcesView` (3614 lines, English-only) subject-aware so all 14 templates work for Hebrew.
- **Order:** (a) word picker accepts `HebrewLemma` source, (b) layout generators parametric on data shape, (c) RTL render passes per template.
- **Risk:** PDF templates have hardcoded English assumptions in CSS strings; need careful per-template review.
- **Acceptance:** A Hebrew class teacher clicks Worksheet → sees all 14 templates available; each renders Hebrew lemmas with correct RTL + niqqud handling.
- **Estimate:** 3+ commits, dedicated session.

### 5. Full ClassShowView fold

- **Current state:** `HebrewClassShowView` (stop-gap) ships 5 of 6 English-equivalent modes (Niqqud, Translation, Reverse, Listening, Flashcards) plus Hebrew-unique Niqqud mode.
- **Goal:** Make `ClassShowView` (234 lines) subject-aware so it shares the same 6 mode renderers between English and Hebrew, with subject-specific question builders (`buildClassicQuestion` etc.).
- **Acceptance:** Single `ClassShowView` component handling both subjects; `HebrewClassShowView` deleted.
- **Estimate:** 1–2 commits, dedicated session.

### 6. Real Hebrew Live Challenge

- **Current state:** Both `live-challenge` and `live-challenge-class-select` routes show `HebrewComingSoonView` for Hebrew classes.
- **Goal:** Real socket session that carries `subject` flag (mirror of `quick_play_subject` migration), Hebrew-aware leaderboard render, Hebrew student-side play surface.
- **Order:** (a) DB migration adds `subject` to `live_challenge_sessions`, (b) socket payload threads `subject`, (c) student bootstrap branches by subject like `useQuickPlayUrlBootstrap` does, (d) Hebrew-aware podium copy.
- **Estimate:** 2–3 commits, dedicated session.

---

## Engineering — small incremental wins

### 7. Add 3rd Hebrew worksheet template

- **Current:** Word List + Match the Words.
- **Candidates:** Flashcard cut-out sheets (foldable cards), translation quiz (Hebrew left, blank line right), scramble (rearrange Hebrew letters — needs special handling for sofit forms).
- **File:** `src/views/HebrewWorksheetView.tsx` — add another `Template` union member, render branch in the preview area.
- **Estimate:** 1 commit, ~80 lines.

### 8. Add audio-quiz mode to Hebrew Class Show

- **Current:** 5 modes; English Listening mode includes a 4-option multiple choice quiz that Hebrew Listening doesn't.
- **Goal:** "Listening Quiz" mode that plays the lemma + shows 4 niqqud variants, only one matching what was spoken.
- **File:** `src/views/HebrewClassShowView.tsx` — add to `Mode` union, render branch.
- **Estimate:** 1 commit, ~50 lines.

### 9. Hebrew-aware bulk word-list importer

- **Current:** `HebrewAssignmentWizard` step-1 source picker has Packs / Camera / Upload / Library. No "paste a list" option (English wizard has it).
- **Goal:** Add "הדבקת רשימה" (paste list) tab that accepts Hebrew text, splits on whitespace/newlines, matches against `HEBREW_LEMMAS` by `lemmaPlain`, surfaces matched + unmatched.
- **File:** `src/components/HebrewAssignmentWizard.tsx` — add to `WordSource` union, render a textarea + match button.
- **Estimate:** 1 commit, ~120 lines.

### 10. Wire 6 coming-soon Hebrew game modes

- **Current:** `HEBREW_MODE_OPTIONS` lists 10 modes; 6 are flagged `comingSoon: true` (classic translate, spelling, matching, memory-flip, flashcards, scramble) and can't be selected in the wizard.
- **Goal:** Build each game component, route from the View names to the new components, remove `comingSoon` flag.
- **Order of priority** (by Hebrew teaching value): Classic Translate → Matching → Flashcards → Spelling → Memory-Flip → Scramble.
- **Estimate:** Each mode ~150–300 lines (component + scoring + audio integration). One per commit.

---

## Documentation / hygiene

### 11. Promote stop-gap views to follow-up tasks once full folds land

- When `FreeResourcesView` becomes subject-aware, **delete** `HebrewWorksheetView` and remove its branch in `App.tsx` worksheet route.
- When `ClassShowView` becomes subject-aware, **delete** `HebrewClassShowView` and remove its branch.
- Don't let stop-gap files outlive their purpose — they're explicitly transitional per the parity-patterns memory.

### 12. Replace HebrewComingSoonView for Live Challenge once shipped

- When real Hebrew Live Challenge ships (item 6), remove the two `if (activeVoca === "hebrew")` / `if (selectedClass.subject === "hebrew")` guards in `App.tsx` for `live-challenge` and `live-challenge-class-select`.
- Keep `HebrewComingSoonView` itself — still used as the Vocabagrut URL guard, and useful for any future English-only feature that ships before its Hebrew variant.
