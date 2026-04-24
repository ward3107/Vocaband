# Dash Podium — Multiplayer Game Upgrade (Future Plan)

**Status:** Captured 2026-04-23. Not yet built. Document to revisit when ready.

---

## What this is

The current **Quick Play** mode lets a teacher share a QR code, students join
and play vocabulary games on their phones, and the teacher sees a **live
scoreboard / podium** on the big screen. It works but feels like a list, not
a game.

The ambition: turn the teacher's live screen into a **shared multiplayer
scene** where every student's avatar is visible and moving — a race, a
garden, a space highway, a mountain climb — with a proper podium reveal at
the end. Make it feel like a game the students *want* to play, not a quiz
that happens to be multiplayer.

This plan captures the full menu of options, the recommended path, and the
decisions that need to be made before a build kicks off.

---

## What we have today

- **Teacher side (QuickPlayMonitor):** A styled leaderboard card with each
  joined student's name, avatar emoji, current score, and mode they just
  finished. Updates via Supabase Realtime (with 5s polling fallback).
- **Student side:** Standard game modes on their phones — multiple choice,
  spelling, matching, etc. No awareness of other students beyond the final
  podium on the teacher screen.
- **Backend:** Supabase Realtime for live `progress` row inserts; Socket.io
  on Render for live-challenge events; `quick_play_sessions` + `progress`
  tables on Supabase.

**Gap:** no shared visual space, no feel of competition-in-real-time, no
animated celebration of positions. It's functionally there but
emotionally flat.

---

## The five options considered

Laid out from cheapest / most pragmatic to most ambitious.

### Option A — Animated 2D race track *(recommended starting point)*

- **What:** Transform the teacher podium from a list into a side-scrolling
  animated scene. Each student is an emoji avatar on a track. Correct
  answers sprint the avatar forward; wrong answers stumble. At the end,
  an animated 1st/2nd/3rd podium slides in with confetti. Students also
  see the podium on their phones.
- **Tech:** React + `motion/react` (already in the project). No new
  libraries. No new server code.
- **Dev time:** 1–2 days.
- **Cost:** $0.
- **Mobile:** Perfect — still just DOM/CSS.
- **Limitation:** Each student only sees other students on the teacher's
  big screen, not their own phone.

### Option B — Real 2D game engine (Pixi.js or Phaser.js)

- **What:** Avatars in a shared tile-based garden/space/castle. They
  actually move around a game world, collect "word coins," see each other
  in real time on every device.
- **Tech:** Phaser.js **or** Pixi.js. +~500 KB bundle. Sprite art
  (commission or asset pack).
- **Dev time:** 1–2 weeks.
- **Cost:** $20–500 for art assets. Server cost unchanged.
- **Mobile:** Good — these engines run well on most classroom devices.
- **Feel:** Looks like a solid 2D Nintendo-style game.
- **Pitfall:** Real-time position sync for 30 concurrent students
  requires careful throttling (otherwise server ops/sec spike).

### Option C — True 3D (Three.js + React Three Fiber)

- **What:** 3D avatars in a garden / planet / castle. Camera pans,
  shadows, physics, proper animations.
- **Tech:** `three.js` + `@react-three/fiber` + `@react-three/drei`.
  +~800 KB – 1 MB bundle. 3D GLTF models (Sketchfab/CGTrader).
- **Dev time:** 3–6 weeks *realistically* (3D is harder than it looks).
- **Cost:** $100–1,000 for 3D assets. Possible Supabase Realtime tier bump.
- **Mobile:** Rough on phones older than iPhone 11 / 2019 Android.
  Significant battery drain.
- **Feel:** Modern, impressive. But the gap between "basic 3D" and
  "Roblox-quality 3D" is huge — and kids have already seen Roblox.

### Option D — Unity WebGL embedded

- **What:** Build the game in Unity, export to WebGL, embed via iframe.
- **Tech:** Unity (free at this scale). WebGL build + hosting.
- **Dev time:** 6–10 weeks.
- **Cost:** Unity free under $200 K/yr revenue. Art assets $100–1,000+.
- **Mobile:** **Poor.** Unity WebGL builds are 30–80 MB and slow to load.
  Classroom Wi-Fi will suffer. Not recommended for our audience.
- **Feel:** Best possible quality IF you have Unity expertise.

### Option E — Licence an existing multiplayer layer

- **What:** Integrate Gimkit / Blooket / Quizizz API. Feed Vocaband's
  vocabulary data as questions; they supply the multiplayer game layer.
- **Tech:** Their SDK/API.
- **Dev time:** 1–2 weeks.
- **Cost:** Recurring per-teacher licence ($5–$15/month/teacher typical).
- **Mobile:** Excellent (they've already solved this).
- **Pitfall:** Loss of control over visual identity; ongoing cost; platform
  lock-in.

---

## Recommended path

**Start with Option A. Then maybe Option B. Skip C/D/E unless circumstances change.**

Rationale:
1. Option A ships in 2 days and is a genuine visible upgrade over the
   current list-style podium.
2. It costs nothing — no new libraries, no art budget, no server changes.
3. It gives real-world data on whether "more visual engagement" actually
   lifts student retention in classrooms, before any larger investment.
4. If the data says yes, Option B becomes justifiable. If it says no,
   the investigation stops cheap.
5. Options C/D require multi-week commitment plus art spend plus a mobile
   performance investigation — not worth starting without validating the
   cheap version first.
6. Option E trades control + margin forever, with no clear upside once
   the underlying game exists in Vocaband's own stack.

---

## Option A — the detailed flow (if/when we build)

### Setup *(no change)*
- Teacher taps "Quick Online Challenge" → QR code on big screen.
- Students scan, pick name + avatar emoji (🦊 🐸 🦁 🐼 🐨 …).

### The race begins
**Teacher's big screen:**
- Horizontal track appears. Every joined student is an emoji avatar at the
  starting line, labelled with their name.
- Current word flashes above the track.

**Each student's phone:** *(unchanged)* — standard vocabulary game.

### Live action
- **Correct answer** → avatar sprints forward a few steps with a +XP burst
  animation.
- **Wrong answer** → avatar stumbles / pauses for ~0.5 s. Gentle, not
  punishing.
- **Fast + correct** → extra speed boost + brief "⚡ SPEED!" badge.
- Whole class watches overtakes play out. Optional sound effects (whoosh on
  overtake, cheer at checkpoints).

### Finish rule
Pick **one**:
- **Last question wins** (recommended) — everyone plays full length, highest
  score wins. Best for learning.
- **First to the finish** — race ends when one student crosses the line.
  Shorter, more tense, worse for even-pacing learners.

### Podium reveal
Animated podium slides in on the teacher screen:

```
           🥇
          ┌──┐
    🥈    │1st│    🥉
   ┌──┐   │  │   ┌──┐
   │2nd│  │  │   │3rd│
   └──┘   └──┘   └──┘
   dodo   Emad   was
```

- Avatars bounce onto their spots.
- Confetti.
- Positions 4–10 listed below the podium in smaller text.

### Students see the podium too
- Every student's phone auto-swaps from game screen to a **podium screen**.
- Top-3 finishers see a "You made the podium!" celebration.
- Everyone else sees "You finished #N — nice run!" with their XP + share
  button.

### Teacher review
- Summary view: per-student accuracy, hardest words, total XP awarded.
- One tap: "Share class report" / "Start another round".

---

## Decisions needed before Option A build starts

These need answers from the teacher/product side; the build waits on them.

1. **Scene theme** — pick one to start; more can come later:
   - Classic race track
   - Garden path (matches Structure UX garden metaphor)
   - Space highway
   - Mountain climb

2. **Finish rule:**
   - Last question wins *(recommended)*
   - First across the line

3. **Wrong-answer penalty:**
   - Small pause / stumble *(recommended — gentle)*
   - Step backward *(harsher, more game-like)*
   - Nothing (only correct answers move you)

4. **Audio:** sound effects yes/no; background music yes/no.

5. **Per-student view:** should each student's phone also show the race
   animation in real time (like the teacher screen) or stay on the game
   view? Showing both costs more performance + more sync traffic; staying
   on game is simpler.

---

## Roadmap if we go further than Option A

| Phase | Builds on | New stuff | When |
|---|---|---|---|
| 0 (today) | Current list podium | — | Live |
| A | Option A | Animated 2D race, same stack | 1–2 days after decisions locked |
| A+ | A + mobile race view | Per-phone race rendering | Optional, +2 days |
| B-prototype | Phaser or Pixi slice | One scene, 5 avatars, no art polish | ~1 week |
| B | B-prototype + art + scenes | Real 2D game, 3 scenes, sprite pack | ~2 weeks |
| B+ | B + social layer | Friend lists, rematch button, class records | +1 week |
| C | Three.js 3D port | ~4–6 weeks, only if B validates |

---

## Risks and watch-outs

1. **Engagement-vs-learning tension.** More game-like can mean more
   distraction. A 3D world students enjoy for its own sake can become a
   playground, not a learning tool. Kahoot solved this by keeping the
   "game" extremely minimal (just the scoreboard). Any upgrade should be
   A/B-tested against learning outcomes, not just "kids liked it".

2. **Classroom Wi-Fi.** A full 3D WebGL build is 30–80 MB. On a school
   network with 30 kids downloading simultaneously, that's a disaster.
   Anything heavier than Option B has to be served very carefully.

3. **Old phones.** Israel's classrooms have mixed devices — many kids on
   hand-me-down Android 9 devices. Anything GPU-heavy fails silently.
   Budget 1–2 weeks for perf tuning on top of any 3D build.

4. **Art budget.** The single biggest cost of any tier above A is the
   art. Assume $100 for a solid 2D sprite pack, $500+ for commissioned 3D
   characters. Can start with free/cheap packs and upgrade later.

5. **Server scale.** Live position sync for 30 students at 10 Hz = 300
   msg/sec per class. A school with 10 concurrent classes = 3 000 msg/sec.
   Supabase Realtime can handle it but at the Pro tier; may push us into
   higher billing.

6. **Sound policy.** Many schools ban sound in classrooms. Any audio
   features must be easy to mute both per-session and per-school.

---

## Files this will touch (when built)

**Option A changes:**
- `src/components/QuickPlayMonitor.tsx` — current podium; replace internals
  with the race scene component.
- `src/components/QuickPlayMonitor/RaceScene.tsx` *(new)* — animated track
  + avatars.
- `src/components/QuickPlayMonitor/PodiumReveal.tsx` *(new)* — end-of-session
  podium with confetti.
- `src/views/QuickPlayStudentView.tsx` — student phone view; add podium
  screen at session-end.
- No new backend / DB changes.

---

## What to do next

When ready to build:
1. Revisit this doc.
2. Answer the five decisions above (scene theme, finish rule,
   wrong-answer penalty, audio, per-phone view).
3. Spin up a branch (e.g., `claude/dash-podium-race`).
4. Build Option A over 1–2 sessions.
5. Ship behind a feature flag (`VITE_DASH_PODIUM_RACE=true`) so old
   list podium stays default until validated.
6. A/B test across 2–3 real classes.
7. Decide whether to invest in Option B based on engagement data.

Until then — no code changes required. The current list podium keeps
working as it does today.
