# TypeScript backlog

> 72 known TS errors, grandfathered in by `.typecheck-baseline`.  CI
> blocks any PR that increases the count.  This doc is the punch list
> for grinding the count down.
>
> **Process:** pick a file → fix its errors → run
> `./scripts/typecheck-ratchet.sh --update` → commit the new baseline
> alongside the fix in the same PR.  The ratchet only goes down.

> Last updated 2026-05-04 (App.tsx cleared from 13 → 0).

---

## How to use this list

1. **Ordered roughly by leverage** — files where a single root-cause
   fix unblocks many errors are at the top; one-off TypeScript trivia
   is at the bottom.
2. **Each row** has a quick description so you can pattern-match
   without opening the file.  Dig into the actual errors with
   `npx tsc --noEmit -p tsconfig.ci.json 2>&1 | grep <file>`.
3. **Some fixes are big** (vocabulary type drift cascades through 3
   files — fix those together).  Others are tiny.  The "type" column
   tells you which.

---

## Active backlog (72 errors)

### High leverage — same root cause, multiple files

#### **Word type drift** (24 errors across 4 files) — fix once, unblock everything
- `src/data/sentence-bank.ts` — 6 errors.  Reads `word.sentences` (was renamed to `sentence`); also reads `word.pos` which was removed.
- `src/data/vocabulary-matching.ts` — 9 errors.  Reads `word.core` and `word.pos` (both removed); plus `filters.X` undefined narrowing missing.
- `src/components/setup/WordInputStep.tsx` — 8 errors.  Reads `word.isCore` and `word.pos` (removed).
- `src/components/setup/WordInputStep2026.tsx` — 1 of 2.  Reads `word.isPhrase` (removed).

**Fix**: open `src/data/vocabulary.ts` to see the current `Word`
shape, then update each consumer.  Most of these are simple field
renames; some require deciding what the old data meant (`isCore` vs
which level set, etc.).

#### **GameMode union missing `'review'`** (5 errors across 2 files)
- `src/locales/student/mode-intro.ts` — 4 errors.  Three `Record<GameMode, ...>` literals missing the `review` key.
- `src/views/GameModeIntroView.tsx` — 1 error.  Same missing-key shape.

**Fix**: add the `review` mode entries (intro text + step list +
gradient/colour theme).  Pattern from one of the other modes (e.g.
`classic`) is a 4-line copy.

### Single-file, focused fixes

#### `src/views/FreeResourcesView.tsx` — 8 errors
- 5×: `(Word | undefined)[]` not assignable to `Word[]` — `.find()` returning undefined that needs filtering.
- 1×: `Html2PdfOptions` shape mismatch — the wrapper config object's `html2canvas` / `jsPDF` keys don't match the lib's typedef.
- 2×: inline `style={{ textAlign: 'right' as 'right' | 'left' }}` — string literal needs cast or type narrowing.

#### `src/hooks/useAudio.ts` — 5 errors
All TS2349 (`This expression is not callable.  Type '{...}' has no call signatures.`).  Some helper is typed as a config object but called as a function.  Real fix needs reading the audio module — likely a tagged union that lost discrimination.

#### `src/views/AnalyticsView.tsx` — 3 errors
All `'word' is possibly 'undefined'` from a `.find()` result.  Add `if (!word) continue;` or `?.` chaining.

#### `src/components/LandingPage.tsx` — 3 errors
All `Type '"out"' is not assignable to type 'Easing | Easing[]'`.  motion/react v12 removed the bare-string easing literals.  Replace `ease: "out"` with `ease: "easeOut"` or `[0, 0, 0.58, 1]` cubic-bezier tuple.

#### `src/__tests__/ErrorBoundary.test.tsx` — 3 errors
`'ThrowingChild' cannot be used as a JSX component.  Its type
'({ message }) => void' is not assignable to type '(props: any) =>
ReactNode'`.  The test helper component returns `void` (it throws);
should return `null` or use `never`.

### Single-error files (grind through)

| File | Error | Fix sketch |
|---|---|---|
| `src/views/FaqView.tsx` (×2) | `string` not assignable to `TextAlign` | Cast: `as React.CSSProperties['textAlign']` |
| `src/views/StatusView.tsx` (×2) | Same | Same |
| `src/components/setup/SetupWizard.tsx` (×2) | `class.id` doesn't exist on `{name, code, studentCount?}` | Either add `id` to the type or read the class differently |
| `src/components/setup/WordInputStep2026.tsx` (×1 of 2) | `WordWithStatus` translate-batch return type mismatch | Align return shape with caller's expectation |
| `src/views/GameActiveView.tsx` | `Cannot find name 'RelationsGame'` | Probably a missing import or a renamed export |
| `src/views/GradebookView.tsx` | `Property 'children' is missing` on `<HelpTooltip />` | Add a child or make `children` optional in HelpTooltip |
| `src/components/SubjectRequestModal.tsx` | Duplicate JSX attribute | Same shape as the FeatureRequestModal bug fixed in PR #460 |
| `src/components/dashboard/SavedTasksSection.tsx` | `Expected 2 arguments, but got 1` | Update call site |
| `src/components/dashboard/TeacherRewardModal.tsx` | Duplicate JSX attribute | Same shape as above |
| `src/components/game/ScrambleGame.tsx` | `Cannot find namespace 'JSX'` | Replace `JSX.Element[]` with `React.ReactElement[]` |
| `src/components/LottieAnimation.tsx` | `RefObject` vs CSSProperties | Wrong prop slot — `style` shouldn't take a ref |
| `src/config/translations/legalTranslations.ts` | `Cannot find module '../hooks/useLanguage'` | Wrong relative path — file moved? |
| `src/core/supabase.ts` | `Cannot find module './vocabulary'` | Module resolution from src/core to src/data/vocabulary |
| `src/data/vocabulary.pre-compress.ts` | Union type too complex | Likely a generated file; mark `// @ts-nocheck` if it's pre-build only |
| `src/hooks/useGameModeSetup.ts` | `'auto'` not in `'audio'\|'tts'` union | Add `'auto'` or change the call site |
| `src/hooks/useGameModeActions.ts` | `'manual'` not in `'audio'\|'tts'` union | Same |
| `src/__tests__/vocabulary-matching.test.ts` | `Cannot find module '../vocabulary'` | Path issue — test imports from `../vocabulary` instead of `../data/vocabulary` |
| `vite.config.ts` | `Not all code paths return a value` | `manualChunks` callback needs an `else return undefined` |

---

## Deeply unhealthy patterns to NOT add more of

These are how the backlog accumulated; treat them as antipatterns:

1. **Casting away type errors with `as any`** — silences TS but hides bugs.  The PR #458 duplicate-`className` bug rendered fine until a user clicked through it; a real type would have caught it.
2. **Letting Word's shape drift while consumers point at the old fields** — `vocabulary-matching.ts` and `WordInputStep.tsx` are still on a 6-month-old shape.  When you rename a field on a high-traffic type, grep for all consumers in the same PR.
3. **Locales declared as `Record<GameMode, X>` then forgotten when a new mode lands** — when `review` was added, three locale files needed updating.  Adding a new mode should be a checklist item: types, locales, intro view, theme map.

---

## Cleanup wins (closed entries)

| Date | File | Errors removed | PR |
|---|---|---|---|
| 2026-05-04 | `src/App.tsx` | 13 → 0 | (this PR) |

When you fix a file, move it from "Active backlog" to here with the
date + PR number.  Watching this list grow is the win.
