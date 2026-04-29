# Student-Page i18n Migration Plan

> Pattern for translating student-facing pages into Hebrew + Arabic
> WITHOUT bloating App.tsx.  One locale file per screen, dropped into
> `src/locales/student/`.  Migrate one screen at a time across multiple
> sessions — this is a multi-day project.
>
> Status: GameModeSelectionView migrated as the proof-of-pattern
> (commit shipped 2026-04-28).  Remaining screens listed below.

## Why this matters

Israeli ESL students often need the UI chrome itself in their first
language to understand what the screen is asking them to do.  Today
the GAME content (vocabulary words) ships with EN+HE+AR translations
baked in, but the surrounding UI text — buttons, instructions, error
messages — is English-only on most student pages.  A grade-4 Arabic-
first student opening "Choose Your Mode" sees:

  - Mode names in English
  - Mode descriptions in English
  - Tooltips in English

…then taps in the dark.  The fix: every visible string flows through a
`useLanguage()` + locale-file lookup, so UI chrome translates
automatically when the student picks their language in the switcher.

## The pattern (one paragraph)

Every student-facing component has a sibling locale file under
`src/locales/student/<page-name>.ts` that exports a single
`Record<Language, T>` object with all of that screen's visible
strings.  The component imports the file directly, calls
`const t = thisModuleT[language]` once at the top of the render, and
reads strings off `t` everywhere instead of hardcoding English in
JSX.  No central translation file, no App.tsx growth.

## File layout

```
src/locales/
  ├── student/
  │   ├── game-modes.ts       ✅ DONE (GameModeSelectionView)
  │   ├── game-finished.ts    ⏳ TODO
  │   ├── game-active.ts      ⏳ TODO  (in-game UI: Check, Next, Skip…)
  │   ├── mode-intro.ts       ⏳ TODO
  │   ├── student-dashboard.ts ⏳ TODO
  │   ├── shop.ts             ⏳ TODO
  │   └── student-login.ts    ⏳ TODO
  └── teacher/
      └── (later — teacher-facing pages stay English-only for now)
```

`src/config/translations/legalTranslations.ts` already exists for
Privacy/Terms/Accessibility — leave it as-is.  The new
`src/locales/` tree is for the student gameplay surface.

## Reference implementation

See `src/locales/student/game-modes.ts` and how
`src/views/GameModeSelectionView.tsx` consumes it:

```tsx
import { useLanguage } from "../hooks/useLanguage";
import { gameModesT, type GameModeId } from "../locales/student/game-modes";

export default function GameModeSelectionView({ ... }) {
  const { language } = useLanguage();
  const t = gameModesT[language];

  // Layout-only metadata stays in the view (icons, colors).
  const modesMeta: Array<{ id: GameMode; color: string; icon: ReactNode }> = [
    { id: "classic", color: "emerald", icon: <BookOpen size={24} /> },
    // …
  ];

  // Visible strings come from `t.modes[id]`.
  const modes = modesMeta.map(m => ({
    ...m,
    name: t.modes[m.id as GameModeId].name,
    desc: t.modes[m.id as GameModeId].desc,
    tooltip: t.modes[m.id as GameModeId].tooltip,
  }));

  return (
    <>
      <h2>{t.chooseYourMode}</h2>
      <p>{t.tagline}</p>
      {/* … */}
    </>
  );
}
```

## Locale-file shape

```ts
import type { Language } from "../../hooks/useLanguage";

export interface MyPageT {
  heading: string;
  ctaButton: string;
  // … nested as needed
}

export const myPageT: Record<Language, MyPageT> = {
  en: { /* … */ },
  he: { /* … */ },
  ar: { /* … */ },
};
```

TypeScript ensures every language has every key.  Adding a 4th
language (e.g. Russian) = add `'ru'` to the `Language` union in
`src/hooks/useLanguage.tsx` and TypeScript surfaces every missing
translation across every locale file at build time.

## Migration checklist (per screen)

For each student-facing component:

1. **Audit visible English strings.**  Grep for `>[A-Z][a-z]` and
   `"[A-Z]"` to find JSX text + string literals.  Don't include
   props that are only passed (those are decoupled), look for
   anything rendered into the DOM.

2. **Create `src/locales/student/<page>.ts`** with the EN/HE/AR
   translations.  Use kid-friendly language; we're talking to
   grade-4-to-9 ESL students.

3. **Import + consume:**

   ```tsx
   import { useLanguage } from "../hooks/useLanguage";
   import { myPageT } from "../locales/student/<page>";
   // ...
   const { language } = useLanguage();
   const t = myPageT[language];
   ```

4. **Replace every hardcoded English string** with `t.someKey`.
   Aria labels and titles count too.

5. **RTL handling:** the existing `dir={dir}` pattern from
   `useLanguage()` already handles bidi text.  Ensure the page
   wrapper has `dir={dir}` so HE/AR layouts mirror correctly.
   (Most existing student pages already do.)

6. **Test**: switch language in the LanguageSwitcher and verify
   nothing reverts to English.

7. **One screen per commit.**  Don't batch — bigger commits make
   regressions harder to bisect.

## Not all strings need translating

These stay in English on purpose:

  - **Vocabulary words themselves** (the "english" field on Word).
    The whole point of the app is teaching English, so the target
    word is always shown in English by design.

  - **Mode IDs** in code (`'classic'`, `'spelling'`).  Internal
    keys, never visible.

  - **CSS class names**, debug logs, dev-only text.

  - **Translations of the target word** that the game shows the
    student.  Those come from `vocabulary.ts` per word, not from a
    locale file.

## Translation quality bar

- Use the language a teacher would speak to a 10-year-old, not formal
  bureaucratic Hebrew/Arabic.
- Keep technical terms (XP, Pro, Bagrut) in their original form.
- Don't translate brand terms (Vocaband, Quick Play, Live Challenge).
- For Arabic, use Modern Standard Arabic (MSA) for educational
  context, not regional dialects — that's what schools teach.
- For Hebrew, use plain modern Hebrew without religious idioms.
- ASCII punctuation for code-style strings (em-dashes for prose).

## Rough effort estimate per screen

| Screen | Lines of strings | Effort |
|---|---|---|
| GameModeSelectionView | ~50 strings | ✅ Done (~1 hr) |
| GameModeIntroView | ~30 strings | ~30 min |
| GameActiveView | ~20 strings | ~30 min |
| GameFinishedView | ~25 strings | ~45 min |
| StudentDashboardView | ~80 strings | ~1.5 hrs |
| ShopView | ~150 strings | ~2 hrs |
| StudentAccountLoginView | ~20 strings | ~30 min |

**Total remaining**: ~6-7 hours of focused work, spread across 5-6
sessions.  Not all in one session — don't burn out.

## Operator action

None.  Locale files are pure code; no DB / Supabase changes needed.
