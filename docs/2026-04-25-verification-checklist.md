# Vocaband — Verification Checklist (2026-04-25 session)

> Paste this whole file into a new Notion page.  Notion auto-converts
> `- [ ]` to checkboxes, headings, bullets, and code blocks.

---

## 🚨 Operator actions (do these first — most fixes are blocked behind them)

- [ ] **Redeploy Render** (`api.vocaband.com`).  Server commits depending on this: `33c719f`, `5ab3578`, `2b71cf9`, `da0ed58`.  Until you redeploy, NONE of the QP server-side fixes are live.
- [ ] **Re-run the failing GitHub Action** (Supabase migrations).  Should now pass with `--include-all` flag.  Confirm green.
- [ ] **Apply migration** `20260514_hot_path_indexes.sql` (composite indexes).
- [ ] **Apply migration** `20260515_save_progress_mistakes_array.sql` (mistakes column fix).
- [ ] **Apply migration** `20260516_qp_sessions_select_anon.sql` (anon RLS for QP session reads).
- [ ] **Cloudflare → Pages env**: confirm `VITE_STRUCTURE_UX` is **deleted** (caused the student-dashboard crash).

---

## 🟢 Quick Play — verify each on a real device

- [ ] **Two students on the SAME phone**, different nicknames → both appear on the teacher's dashboard separately.
- [ ] **30+ students on the same school Wi-Fi** → all appear on the teacher dashboard (not just the first ~5).
- [ ] **A student loses Wi-Fi briefly during play** → reconnects with their score intact (no reset to 0).
- [ ] **Teacher refreshes the monitor mid-game** → leaderboard shows everyone's current scores, not empty.
- [ ] **Teacher clicks "End session"** → teacher lands on **teacher dashboard**, NOT the public landing page.
- [ ] **Teacher clicks "End session"** → after a few seconds, run `SELECT * FROM progress WHERE assignment_id = '<sessionId>'` and confirm one row per student got persisted.
- [ ] **Teacher clicks "Kick"** on a student → that student is actually evicted (their game stops).
- [ ] **QR code share button** → produces a join URL with `/quick-play?session=...`.
- [ ] **Teacher monitor on mobile** → QR card stacks vertically, "Share join link" button is visible and tappable.

---

## 🟢 Classroom (Teacher V2)

- [ ] **Open Classroom** → 4 tabs visible (Today / Students / Assignments / Reports), no cutoff at top.
- [ ] **Click each tab** → URL updates to `?tab=...`.
- [ ] **Mobile back button** on phone → walks tabs in reverse before exiting to teacher dashboard (not a one-shot exit).
- [ ] **Today tab** → 3 stat chips (active / avg score / plays), denser, no redundant ENROLLED tile.
- [ ] **Today tab avg-score 58%** → renders **amber**, not fire-alarm rose.
- [ ] **Reports tab** → "Export CSV" + "Export PDF" buttons visible at the top.
- [ ] **CSV export** → downloads a file with 2 tables (per-play + per-student summary).
- [ ] **PDF export** → downloads a file with branded header, summary page, full table, page numbers.
- [ ] **Today tab does NOT show** "Suggestions for today" anymore.
- [ ] **AnalyticsView class filter** → labelled "Filter by class", smaller pills (not big tabs).
- [ ] **`vocaband.com/?tab=reports` URL pasted directly** → loads correctly (no "site can't be reached").

---

## 🟢 Student dashboard

- [ ] **Student equips a Title** ("Champion", "Final Boss", "GOATed", etc.) → the **whole hero rectangle recolours** to that title's gradient.
- [ ] **Equipped title** → renders as a **big white banner above the greeting**, with two crowns.
- [ ] **Badges strip** → previously-locked badges that the student has earned (Perfect Score / Streak Master / XP Hunter / XP Champion) now show as **unlocked with their emoji**, not locked icons.
- [ ] **Overall Progress bar** → moves with each game completed, not stuck at 0% until everything is done.
- [ ] **Student loads dashboard** → no "Failed to load component" error (NAME_TITLES + structure-prop crashes fixed).
- [ ] **Student equips a Frame** in the shop → real error toast if it fails (not a silent green-checkmark lie).

---

## 🟢 Assignment builder

- [ ] **Open "Create assignment"** → Step 1 is the mode picker (no longer collapsed).
- [ ] **All modes selected by default** EXCEPT Sentence Builder.
- [ ] **Tap a mode** → small ↓ "next: name it" nudge appears below.
- [ ] **Step 2 (Title + Instructions)** → only shows once at least one mode is picked, otherwise dashed placeholder.
- [ ] **Title + instructions auto-fill** from the chosen mode (editable).
- [ ] **Mobile**: scroll through Configure step → "Review" button is sticky at the bottom of the screen.
- [ ] **Mobile**: scroll through Review step → "Assign to Class" / "Generate QR Code" button is sticky and visible without scrolling.

---

## 🟢 AI translate

- [ ] **Edit a Set 1/2/3 word** in the assignment builder → modal has an "✨ Auto-translate with AI" button.
- [ ] **Click it** → Hebrew + Arabic populate from Gemini.
- [ ] **Save** → the next time you edit the SAME word in any other assignment, the translation is already filled in (persisted to `word_corrections` table).
- [ ] **Paste a list of words with the paste flow** → AI translation uses Gemini (not the old mymemory.translated.net).

---

## 🟢 Database / cost

- [ ] Run `SELECT calls, ROUND(mean_exec_time::numeric, 1) AS avg_ms, LEFT(query, 150) AS query FROM pg_stat_statements WHERE query NOT LIKE '%pg_stat_statements%' ORDER BY calls DESC LIMIT 10;` after 24 hours of normal usage.  Top entry should NOT be `student_profiles SELECT` anymore.
- [ ] **Supabase Dashboard → Reports → API** chart: requests/minute should bend down compared to before the polling fixes.
- [ ] **Anon-user table check**: `SELECT count(*) FROM auth.users WHERE COALESCE(is_anonymous, FALSE) = TRUE AND created_at < now() - INTERVAL '30 days';` — should stay low (cleanup cron).

---

## 🟢 Security alerts

- [ ] **Dependabot postcss alert** → goes green after next deploy + Dependabot rescan.
- [ ] **Dependabot `@xmldom/xmldom` alert** → already green from prior fix.

---

## 🟡 Items still pending (pick which to tackle next)

- [ ] **A** Save-queue batching (cuts per-game DB writes by ~95% in busy classrooms).
- [ ] **B** Replace polling with Realtime push (drops steady-state polling toward 0).
- [ ] **C** Real Reports dashboard content (per-week trend chart, top struggling words across roster, plays/day histogram, attendance table).
- [ ] **D** Backfill the poisoned `progress.mistakes` rows (one SQL UPDATE; old assignment plays auto-heal on replay otherwise).
