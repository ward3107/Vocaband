# Refactor test plan — `refactor/extract-views-on-main` → `main`

This branch extracts all 19 views out of `App.tsx` (6,559 → 5,407 lines, App chunk
247 kB → 168 kB). No intended behaviour changes. Every item below must pass before
merge.

## 0. Pre-flight

- [ ] Tag current `main` as `pre-view-extraction-refactor` and push (one-command rollback)
- [ ] Deploy this branch to a staging / preview URL (not production)
- [ ] Test on **both desktop Chrome** and **Android Chrome on a real phone** — the mobile back-button work this grew out of can only be verified on hardware
- [ ] Clear local storage + sessionStorage before starting each test run

## 1. Student golden path

- [ ] Open app, enter class code + display name → lands on `student-dashboard`
- [ ] Dashboard renders: avatar, greeting, class code (tap copies), XP badge, streak badge (if > 0), earned badges
- [ ] "Overall Progress" bar visible when assignments exist, shows correct N / total
- [ ] Each assignment card shows title, word count, deadline (if set), per-assignment progress bar, correct CTA text ("Start Learning" / "Play Again")
- [ ] Tap "Start Learning" → mode selection appears → pick a mode → gameplay begins
- [ ] Play one word correctly, one incorrectly — feedback states (correct/wrong/show-answer) render as expected
- [ ] Finish the assignment → GameFinished view shows score, XP, streak, accuracy
- [ ] "Try Again" replays same mode + words
- [ ] "Review N Missed Words" button appears + works if mistakes > 0
- [ ] "Back to Dashboard" returns to student dashboard
- [ ] "Privacy" top-bar button → privacy settings view → back works
- [ ] "🛍️ Shop" button → shop view → tabs (Avatars / Themes / Power-ups / Titles / Frames / Boosters) work → purchase flow works
- [ ] "Logout" button signs out cleanly → lands on public landing

## 2. Teacher golden path

- [ ] Click "Teacher Login" → Google OAuth flow completes → lands on `teacher-dashboard` **on the first attempt** (no "login twice" regression)
- [ ] Dashboard renders top app bar, 4 action cards (Quick Play, Analytics, Gradebook, Approvals), My Classes section
- [ ] Pending approvals badge shows correct count on Approvals card
- [ ] Click "New Class" → modal opens → type name → Create → success modal shows code + Copy + WhatsApp buttons → Done closes
- [ ] Tap class code → copied (icon flips to check for 2s)
- [ ] WhatsApp button opens `wa.me/...` in new tab
- [ ] Class dropdown menu (three dots) opens/closes correctly, only one at a time
- [ ] "New Assignment" → SetupWizard opens with class pre-selected → complete wizard → assignment appears on dashboard
- [ ] "Edit Assignment" from class card → SetupWizard opens in edit mode with existing values filled
- [ ] "Duplicate Assignment" → wizard opens with title suffixed " (copy)"
- [ ] "Delete Assignment" → confirmation modal → Delete → assignment removed optimistically → undo toast appears → tap Undo → assignment restored
- [ ] "Delete Class" with confirmation → class removed
- [ ] Analytics card → analytics view loads without crashing → class filter + score heatmap work
- [ ] Gradebook card → students list + per-student scores load
- [ ] Approvals card → pending students list → Approve / Reject work → Reject opens confirmation modal first
- [ ] Logout → public landing

## 3. Quick Play flow

- [ ] Teacher: Quick Play card → setup wizard → pick words + modes → Generate
- [ ] QR code / session code appears on teacher monitor view
- [ ] "End Session" button works (previously a modal, now handled in monitor view)
- [ ] Student: open session URL on phone → name prompt → gameplay starts
- [ ] Multiple students can join the same session
- [ ] "Back" button during Quick Play student flow cleans up session data (does not leave a stale session in localStorage)

## 4. Mobile back button (the original ticket)

Test on **real Android Chrome**:

- [ ] Teacher OAuth → press back on dashboard → "Leave Vocaband?" modal appears → Stay = stay, Leave = exit
- [ ] Rapid back presses (5 in quick succession) at dashboard → still on dashboard (no escape to Google/Supabase OAuth URLs)
- [ ] Android edge-swipe-back gesture at dashboard → same exit modal
- [ ] In-app back works during assignment wizard (goes to previous wizard step, not out of app)
- [ ] In-app back works during game (goes to mode selection / dashboard, not out of app)
- [ ] Student dashboard back button has same exit-modal behaviour
- [ ] Logged-out public pages: back button behaves normally (exits site), not trapped

## 5. Gameplay across all modes

- [ ] Classic (multiple choice) — answer options, 50/50 power-up, Skip power-up
- [ ] Listening (word blurred) — pronunciation button works, answers visible
- [ ] Reverse (English → translation) — dir="ltr" on prompt, answer options correct direction
- [ ] Matching — pair cards, matched pairs disappear, can't tap while processing
- [ ] True / False — True/False buttons disable after answer, touch works on mobile
- [ ] Flashcards — flip button toggles, Still Learning / Got It buttons work, disabled during processing
- [ ] Spelling — input focus, Check Answer works, "Hint" power-up reveals first letter
- [ ] Letter-sounds — letters reveal one by one, spelling check appears when all revealed
- [ ] Scramble — scrambled word shows, answer check works
- [ ] Sentence-builder — tap words to build, Clear resets, Check validates

## 6. Regression checks on non-golden paths

- [ ] Global leaderboard view renders
- [ ] Live Challenge view still loads (even if feature is hidden from dashboard)
- [ ] Toast notifications appear during teacher actions (delete, undo, etc.)
- [ ] Confirmation dialog fires and works (e.g., delete class)
- [ ] OCR Image Crop Modal opens when uploading a worksheet picture
- [ ] Error Tracking Panel appears in debug mode (toggle via console)
- [ ] Consent modal shows on first-run + re-shows after privacy settings change

## 7. Build + performance sanity

- [ ] `npm run build` completes without errors
- [ ] Bundle sizes: `App-*.js ≈ 168 kB`, each view in its own `<ViewName>-*.js` lazy chunk
- [ ] `npm run test:e2e` passes (Playwright navigation suite)
- [ ] No new browser console errors on staging vs current production
- [ ] Initial page load on slow 3G (Chrome DevTools throttle): first paint < 2s, interactive < 5s — same or better than current

## 8. If any step fails

1. Identify which batch introduced the regression (commits `64286f0` through `82997af`)
2. Most batches are independently revertible — `git revert <commit>` then re-push
3. If issue is in the View type fix (`bb18e79`), revert just that commit
4. If issue is in multiple batches, merge `pre-view-extraction-refactor` tag back to main and reopen the refactor on a fresh branch

## 9. PR description suggested structure

```markdown
## Summary
Extracts all 19 views from App.tsx into `src/views/*.tsx` + 25+ focused
sub-components in `src/components/game/*` and `src/components/dashboard/*`.
Pure refactor — no intended behaviour changes.

## Size reduction
- App.tsx: 6,559 → 5,407 lines (-17.5% this PR; -44% vs pre-refactor main)
- App chunk: 247 kB → 168 kB (-32%)
- 17 new lazy-loaded route chunks

## Test plan
See [REFACTOR_TEST_PLAN.md](./REFACTOR_TEST_PLAN.md). Manually
smoke-tested on staging: all golden paths pass on desktop Chrome and
Android Chrome.

## Commits
Each batch is a reversible unit — see commit history `64286f0..bb18e79`
for the per-batch structure.
```
