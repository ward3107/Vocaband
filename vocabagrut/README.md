# VocaBagrut 🎓

**English Bagrut prep for Israeli high-school students.** A standalone web app
(React 19 + TypeScript + Vite + Tailwind v4) covering the four pillars of the
matriculation exam — **vocabulary, reading comprehension, writing, and a
past-exam bank** — for **3, 4 and 5 units**, with a trilingual UI (English /
עברית / العربية, full RTL).

This project is a *spin-off* of [Vocaband](../) but shares **no code at
runtime** — it only borrows proven patterns (i18n + RTL, gradient-card UI,
the gamified study loop). It lives in the `vocabagrut/` subfolder for now so it
can be developed under the existing repo's access, and is designed to be lifted
into its **own repository** (see below).

---

## Quick start

```bash
cd vocabagrut
npm install
npm run dev      # http://localhost:5180
npm run build    # type-check + production build
```

No environment variables or backend are required to run it — AI writing
feedback is stubbed locally (see [AI grading](#ai-grading)).

---

## What's here (v0.1 — foundation)

| Feature | File(s) | Status |
|---|---|---|
| **🏗️ Build your Bagrut** | `src/views/BuildBagrutView.tsx` | **Headline flow.** Click `+`/`−` to assemble a full mock exam from word-flow + reading + writing blocks, see a live preview + total points, then take the whole thing end-to-end with a progress bar and final score. |
| **Vocabulary (word flow)** | `src/components/WordFlow.tsx`, `src/views/VocabularyView.tsx`, `src/data/vocabulary.ts` | Continuous flip → self-mark flashcard flow, trilingual + level + exam-frequency tags. Shared by the Vocabulary pillar **and** the builder. |
| **Reading** | `src/views/ReadingView.tsx`, `src/data/reading.ts` | Exam-style passages with auto-checked multiple-choice + open/HOTS questions with model answers. |
| **Writing** | `src/views/WritingView.tsx`, `src/data/writing.ts`, `src/lib/aiGrading.ts` | Prompt editor with live word count + **rubric-based feedback** (heuristic stub; swap for a real model). |
| **Past exams** | `src/views/ExamBankView.tsx`, `src/data/exams.ts` | Browsable bank of recent papers by year/level, section breakdown, official-PDF links. |
| **Domain model** | `src/core/types.ts` | `UnitLevel`, `VocabWord`, `ReadingPassage`, `WritingPrompt`, `ExamPaper`, … |
| **i18n + RTL** | `src/hooks/useLanguage.tsx`, `src/i18n/strings.ts` | EN/HE/AR with `dir`/RTL flipping. |

Everything renders and works offline. The data files contain **a few realistic
samples each** — they show the shape; real content drops straight in.

---

## AI grading

`src/lib/aiGrading.ts` currently returns a **deterministic heuristic** score so
the app is fully usable with zero secrets. To make it a real Bagrut-rubric
assessment, replace the body of `gradeWriting()` with a call to a serverless
endpoint that holds the model API key **server-side** (never in the browser):

```
POST /api/grade-writing   { promptId, text }   ->   WritingFeedback
```

A Supabase Edge Function, Cloudflare Worker, or Fly route prompting Claude or
Gemini with the prompt's `rubric` is the natural fit (the same stack Vocaband
already uses).

---

## Moving this into its own repo

GitHub access in the generating session was scoped to the Vocaband repo and the
integration is **not allowed to create new repos** (the API returns 403), so this
was scaffolded as a subfolder. Promoting it to its own repository is **one manual
step on your side**, then it's fully independent:

1. On GitHub, create a new **empty** repo (no README/license): e.g. `ward3107/vocabagrut`.
2. From the Vocaband repo root, with a clean working tree, run the helper:

   ```bash
   bash vocabagrut/scripts/extract-to-own-repo.sh git@github.com:ward3107/vocabagrut.git
   ```

   It splits `vocabagrut/` into its own history and pushes it to `main` of the new
   repo. After that, `git clone` the new repo and develop there directly.

Or simply copy the `vocabagrut/` folder into a fresh `git init` project — it has
no parent-repo dependencies.

---

## Roadmap (post-foundation)

1. **Real content** — frequency-derived word lists per level; a larger reading
   bank tagged to past papers; verified official PDF links.
2. **Accounts & progress** — Supabase auth + per-student XP/streaks (reuse the
   Vocaband gamification economy).
3. **Real AI grading** — wire `gradeWriting` to a server endpoint.
4. **Listening & speaking** — add the two remaining Bagrut skills (TTS + mic
   capture + AI pronunciation/fluency feedback).
5. **Teacher mode** — assign passages/prompts, see class analytics.
6. **PWA + deploy** — installable, served from its own domain.
