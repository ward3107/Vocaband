# Red vs Blue Teams — implementation plan

> Status: **proposed, awaiting approval.** This feature touches protected
> zones (`server.ts`, `src/core/quickPlayProtocol.ts`, a DB migration), so
> nothing here is built until the repo owner approves the specific files.

---

## What it is, in plain English

Right now every live game is "every kid for themselves" — one big leaderboard.
Teams mode splits the class into **Red** and **Blue**. Every point a kid scores
also adds to their team's total. The projector shows a live **Red vs Blue**
score bar, and the end screen crowns a **winning team** (on top of the existing
individual winner). Works the same way in Category Race, Speed Round, and Word
Hunt Arena.

It's **opt-in per game**: if the teacher doesn't turn teams on, everything works
exactly like today. Solo games are completely unaffected.

---

## Three product decisions (need your call)

**1. How do kids get on a team?**
- **A — Auto-split (recommended):** the server drops each kid onto the smaller
  team as they join, so Red and Blue stay balanced with zero fuss. Fast, fair,
  no extra taps for kids.
- B — Kids choose Red or Blue on the join screen. More ownership, but teams can
  end up lopsided (everyone picks the same color).
- C — Teacher assigns after everyone joins. Most control, most work mid-lesson.

**2. When is teams mode on?**
- **Recommended:** a simple **toggle in the waiting room** — "Solo / Red vs Blue".
  Off by default. Teacher flips it before starting.

**3. What does winning mean?**
- **Recommended:** the team with the **highest total points** wins. The results
  screen shows the winning team first, then the individual podium underneath.

---

## What gets built

### Backend (PROTECTED — needs explicit OK)

| File | Change | Risk |
|---|---|---|
| `src/core/quickPlayProtocol.ts` | Add optional `team?: "red" \| "blue"` to the join payload + to each student entry; add a `teamTotals` field (or a small new event) to the leaderboard broadcast. | Low — additive, optional fields. |
| `server.ts` | On join, if the session is in teams mode, assign a team (auto-split) and store it on the student entry; add a tiny helper that sums Red vs Blue; include totals in the existing 1.5s leaderboard broadcast. | Medium — it's the live socket engine. Changes are additive and guarded by a per-session flag. |
| `supabase/migrations/…` | Add a `team_mode boolean default false` column to the quick-play session row (so the server knows whether to assign teams). | Low — additive column, default off, reversible. |

**Crucially:** scoring, kick, bonus, end-session, and progress-saving paths are
**untouched** — they all read each kid's `score`, which stays the source of truth
whether or not teams are on.

### Frontend (NOT protected — normal work)

- **Waiting room:** a Solo / Red-vs-Blue toggle; medallions tinted by team.
- **In-game:** a live Red vs Blue score bar on the projector (the host views).
- **Results:** show the winning team banner above the existing podium; the
  `GameResults` component already exists — I'd extend it with an optional team
  block.
- Student join hook (`useQuickPlaySocket`) passes the team through.
- All new text in English / Hebrew / Arabic.

---

## Why it's safe

- **Off by default.** A session with `team_mode = false` behaves exactly like
  today; the server never assigns teams and never emits team totals.
- **Additive only.** No existing field, event, or scoring rule is removed or
  changed — we only *add* optional fields.
- **Backwards-compatible.** An old client that doesn't send a team still joins
  fine (it just lands in solo mode); a new client in a solo session works too.

## How I'd verify it

1. Type-check, lint, production build (as with every slice so far).
2. Local two-window test: open a host + a couple of student tabs, turn teams on,
   confirm kids split Red/Blue, points roll up per team, and the results screen
   names the right winning team.
3. Confirm a **solo** game is byte-for-byte unchanged (the regression that
   matters most).

## Rollout order (small, reviewable steps)

1. **Protocol + DB** — add the optional `team` fields + `team_mode` column.
2. **Server** — auto-split on join + team totals in the broadcast (behind the flag).
3. **Frontend** — lobby toggle → live score bar → results team banner.
4. Wire all three competition games (same shared pieces).

Each step is its own PR with a preview screenshot, same as the work so far.
