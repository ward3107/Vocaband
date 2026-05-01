# Gameplay redesign — 2026-04-30

Complete rundown of the student-mobile gameplay redesign initiative.
Each phase ships on its own git branch (per the per-branch workflow
established mid-session).  None of the Phase 3 branches are merged to
`main` yet — they're each previewable independently.

Source plan: `/root/.claude/plans/i-want-to-add-silly-spark.md`

---

## Why we did this

Two pain points reported by the teacher:

1. **Post-game friction.**  Finished screen had FOUR buttons (Try
   Again, Choose Another Mode, Review Missed Words, Back to
   Dashboard).  Kids didn't know where to tap.  Two of the four
   (Choose Another Mode + Back to Dashboard) both did effectively
   the same thing — back to mode picker.

2. **Game screens looked primitive on mobile.**  Of 11 modes, only 2
   had any visual identity (True/False's emerald/rose, Letter
   Sounds' colored letters).  The other 9 used a generic stone /
   blue palette with `text-sm` mobile labels and 56px tap targets.
   Content top-aligned with empty dead space below.  Kids tapped
   small targets, missed, lost flow.

Goal: every mode feels distinct, large, and tap-friendly on a phone,
plus a single obvious "Back to Modes" affordance after each round.

---

## Phase summary

| Phase | Mode(s) | Theme | Branch | Status |
|---|---|---|---|---|
| 1 | Post-game nav fix | — | (earlier on `fix-points-display-9Q4Dw`) | ✅ shipped |
| 2 | Shared primitives | — | (earlier on `fix-points-display-9Q4Dw`) | ✅ shipped |
| 3a | Classic / Listening / Reverse | emerald | `claude/game-redesign-classic` | ✅ shipped |
| 3b | True / False | rose ↔ emerald | `claude/game-redesign-true-false` | ✅ shipped |
| 3c | Spelling | violet | `claude/game-redesign-spelling` | ✅ shipped |
| 3d | Letter Sounds | violet | `claude/game-redesign-letter-sounds` | ✅ shipped |
| 3e | Flashcards | cyan | `claude/game-redesign-flashcards` | ✅ shipped |
| 3f | Matching | amber | `claude/game-redesign-matching` | ✅ shipped |
| 3g | Scramble | indigo | — | ⏳ next |
| 3h | Sentence Builder | teal | — | pending |
| 3i | Fill-in-the-Blank | lime | — | pending |

---

## Phase 1 — Navigation fix

**Files:** `src/views/GameFinishedView.tsx`,
`src/views/GameActiveView.tsx`,
`src/locales/student/game-finished.ts`

- Collapsed 4 post-game buttons → 1 primary "Back to Modes →" + a
  small "Exit to dashboard" text link below + optional "Review
  Missed Words" ghost button when `mistakes.length > 0`.
- Removed "Try Again" entirely (kids re-play by tapping Back to
  Modes → tap same mode again).
- Quick Play guests get the same shape — primary "Play Another
  Mode" + tiny "Exit Quick Play" link.
- Added `min-h-[55vh] flex items-center justify-center` wrapper on
  the non-matching branch in `GameActiveView` so every mode sits at
  the visual centre of the viewport on mobile (matching mode kept
  its own `min-h-[60vh]` for the larger pair grid).
- New i18n keys: `backToModes`, `exitToDashboard` (EN/HE/AR).

---

## Phase 2 — Shared primitives

**Files:** NEW `src/components/game/GameShell.tsx`,
`src/components/AnswerOptionButton.tsx`,
`src/components/game/WordPromptCard.tsx`

- **`GameShell.tsx`** — exports `GameThemeColor` union type +
  `THEME_TABLE` with literal Tailwind class strings (JIT needs
  literals — string-built names won't get picked up).
  `getThemeColors(color)` helper consumed by every Phase-3 mode
  component.
- **`AnswerOptionButton.tsx`** — bumped mobile tap target
  `py-3 px-3 min-h-[56px] text-sm` → `py-5 px-5 min-h-[88px] text-xl`.
  Added optional `themeColor` prop for theme-tinted idle state.
- **`WordPromptCard.tsx`** — bumped word `text-3xl → text-4xl`
  mobile, image `w-20 → w-28`, pronunciation button `p-1.5 → p-3`.
  Added optional `themeColor` prop for hero card tint.

No mode visuals changed in Phase 2 — only the shared chrome got
bigger.  Phase 3 commits adopt these.

---

## Phase 3a — Classic / Listening / Reverse (emerald)

**Files:** `src/components/ClassicModeGame.tsx`,
`src/components/game/WordPromptCard.tsx`,
`src/views/GameActiveView.tsx`

- Adopted `themeColor="emerald"` via the new `MODE_THEME` map in
  `GameActiveView`.
- Mode-label pill ("CLASSIC" / "LISTENING" / "REVERSE") at top of
  the answer card.
- Hero `WordPromptCard` painted with emerald tint.
- `AnswerOptionButton` instances in `ClassicModeGame` get
  emerald-tinted idle state.
- Listening keeps its existing `blur-xl select-none opacity-20` on
  the word so the kid can't read the answer.
- Reverse keeps its existing prompt-direction swap (HE/AR prompt,
  EN options).

The classic mode is the "reference" design — every other mode
follows this template, swapping only the theme colour and one
mechanic-specific layout twist.

---

## Phase 3b — True / False (rose ↔ emerald)

**Files:** `src/components/game/TrueFalseGame.tsx`,
`src/locales/student/game-active.ts`

- Theme: `rose` (negative) paired with `emerald` (positive) — the
  binary judgement mode keeps its existing two-colour palette.
- Added "Is this the right translation?" question label above the
  candidate card.
- Hero candidate card with rose-tinted background and a swipe-tilt
  animation (rotate slightly when dragged).
- Order swap: **False (left/rose) ← → True (right/emerald)** — left
  thumb defaults to "no", right thumb defaults to "yes".
- Touch-swipe gesture: ≥80px horizontal delta with <60px vertical
  triggers the answer.
- Stacked emoji ✗/✓ above the label inside each button.
- Hint text only shows on touch devices via
  `[@media(hover:none)]` Tailwind variant.
- 4 new i18n keys: `isThisTrue`, `trueLabel`, `falseLabel`,
  `swipeHint` (EN/HE/AR).

---

## Phase 3c — Spelling (violet)

**Files:** `src/components/game/SpellingGame.tsx`,
`src/views/GameActiveView.tsx`

- Theme: `violet`.
- Added letter slots above the input — one box per letter, gaps for
  spaces — so the kid can see the WORD SHAPE before they type
  (helps young spellers with letter count).
- On submit: positional letter feedback colours the slots —
  green for matching letter, rose for mismatch, amber when the
  show-answer fallback fired.
- Hero translation card with violet tint sits above the input.
- Bigger violet→fuchsia gradient "Check Answer" button.
- Scramble mode skips the slots (will get its own redesign in 3g).

---

## Phase 3d — Letter Sounds (violet)

**Files:** `src/components/game/LetterSoundsGame.tsx`,
`src/views/GameActiveView.tsx`

- Theme: `violet` (paired with Spelling — both are letter-typing
  modes, sibling visual family makes sense).
- Bumped letter blocks `w-9 h-11 → w-12 h-14` mobile, `w-12 h-14 →
  w-16 h-20` desktop.
- Spring-pop reveal via Framer Motion: each letter scales 0.5 → 1
  and rotates -10° → 0° as it gets revealed.
- Pulsing "?" on un-revealed letters (scale 1 → 1.15 → 1 infinite)
  so the kid sees the letter is *waiting* to be revealed.
- Hero translation card with violet tint above the letter row.
- Same violet→fuchsia gradient Check button as Spelling.

---

## Phase 3e — Flashcards (cyan)

**Files:** `src/components/game/FlashcardsGame.tsx` (rewrite),
`src/views/GameActiveView.tsx`

- Theme: `cyan`.
- Replaced the old "WordPromptCard + Show Translation toggle" stack
  with a TRUE 3D flip card — CSS perspective +
  `transform-style: preserve-3d` + `backface-visibility: hidden` +
  Framer Motion rotateY 0 → 180 with spring (stiffness 200, damping
  22).
- **Front face** (cyan-tinted): big English word, big 🔊 button,
  "Show Translation ↻" hint at the bottom.
- **Back face** (teal gradient): big target-language word, "Show
  English ↻" hint.
- Tap card to flip; 🔊 button calls `e.stopPropagation()` so it
  doesn't accidentally trigger a flip.
- Below the card: two big response buttons (`min-h-[88px]`) with
  stacked emoji + label — "🤔 Still Learning" rose / "✓ Got It!"
  emerald.  Cyan theme drives the card itself; binary palette
  stays for the buttons since the judgement is binary.
- `WordPromptCard` is SKIPPED for flashcards (the flip card IS the
  prompt — rendering both would double-show the word).
- New props on `FlashcardsGame`: `currentWord`, `targetLanguage`,
  `speakWord`, `themeColor`.

---

## Phase 3f — Matching (amber)

**Files:** `src/components/game/MatchingModeGame.tsx` (rewrite),
`src/views/GameActiveView.tsx`

- Theme: `amber`.
- **Pair differentiation** — English tiles get `bg-amber-50 +
  border-amber-200 + text-amber-900`; target-language tiles get
  `bg-orange-50 + border-orange-200 + text-orange-900`.  Same warm
  family (kid sees the mode as a coherent yellow/orange theme), but
  visually distinct enough that "amber pairs with orange" reads at
  a glance.  Without this the grid is a wall of identical white
  cards.
- Selected state: `bg-amber-500 text-white shadow-xl ring-4
  ring-amber-200` (was generic blue-600).
- Tile size bumps: `h-20 → h-24` mobile (96px tap target), `h-32 →
  h-36` desktop, `p-3 → p-4` mobile, `gap-1.5 → gap-2`,
  `rounded-xl → rounded-2xl`, `shadow-sm → shadow-md`.
- **Celebratory match-out** — keyframed `scale [1 → 1.18 → 0]` +
  `rotate [0 → 6° → 0]` + `opacity [1 → 1 → 0]` in 0.4s.  Pops the
  tile briefly before it shrinks (was a flat `scale 0.4 + fade`).
- Mode-label pill renders inside `MatchingModeGame` itself —
  matching bypasses the standard answer card path in
  `GameActiveView` so the pill rides along with the component.

---

## What's left (Phase 3g–3i)

| Mode | Theme | Planned twist |
|---|---|---|
| Scramble | indigo | Letter tiles draggable on mobile, tap-to-place fallback |
| Sentence Builder | teal | Built-sentence area centred, word bank at bottom, tap-to-lift / tap-to-drop |
| Fill-in-the-Blank | lime | Sentence in a hero card with a big visible blank slot, options as 2×2 grid |

Each ships on its own `claude/game-redesign-<mode>` branch.

---

## Per-branch workflow

Established mid-session: **every Phase 3 mode redesign ships on its
own branch from `main`.**  None merged automatically.  This lets the
teacher review each mode in isolation, reject any that don't feel
right, and merge the rest at their own pace.

Branch naming: `claude/game-redesign-<mode-slug>`.

---

## Pending operator items (from CLAUDE.md §6)

1. Apply the 5 pending Supabase migrations (security + ratings)
2. Verify migrations live + run pen-test script
3. Configure Supabase Email OTP length = 6 + magic-link template
   with `{{ .Token }}`
4. Merge `claude/fix-points-display-9Q4Dw` → `main` (carries Phase
   1 + 2)
5. Merge each `claude/game-redesign-*` branch when reviewed

---

## Verification checklist (per phase)

For each Phase 3 mode, on the branch's preview deploy:

- Open an assignment that includes the mode
- Play through 2–3 words
- Confirm:
  - Mode-label pill at the top, theme colour matches the table
    above
  - Tap targets feel ≥88px on mobile
  - Hero/prompt card uses the theme's `cardBg`
  - Mode-specific twist works (3D flip / pop-out match / etc.)
  - No regression in other modes (smoke-test 1–2)
- Type-check via `npm run build` — should be clean
