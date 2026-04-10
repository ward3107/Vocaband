# Unified Setup Wizard Design

**Date:** 2026-04-07
**Status:** Draft
**Scope:** Merge Quick Play Setup and Create Assignment into a unified wizard with shared components and identical visual design.

## Problem

Teachers see two completely different UIs for similar tasks:

- **Quick Play Setup** (`view === "quick-play-setup"` in App.tsx, ~550 lines of inline JSX): single flat page, no game mode selection, no stepper, unique card styles.
- **Create Assignment Wizard** (`CreateAssignmentWizard.tsx`, ~2300 lines): 3-step wizard with sub-steps, game mode picker, templates, deadlines, different visual patterns.

Both flows do the same core thing: select words, configure how students interact with them, and launch. Teachers should not see two different interfaces for this.

## Goal

1. **Game mode selection** in Quick Play (not just Assignment)
2. **Identical visual design** — same cards, layout, colors, stepper, transitions
3. **Similar speed** — Quick Play stays fast via defaults/skippable steps; Assignment stays detailed

## Approach: Shared Step Components

Keep both entry points separate in the dashboard, but extract common steps into reusable components under `src/components/setup/`.

Both flows become a 3-step wizard using the same components. The difference is configuration via props.

## File Structure

```
src/components/setup/
  SetupWizard.tsx         — Shell: stepper, transitions, orchestrates steps
  WordInputStep.tsx       — Step 1: Add words (paste, browse, search, OCR)
  ConfigureStep.tsx       — Step 2: Game modes + optional settings
  ReviewStep.tsx          — Step 3: Review summary + launch action
  types.ts                — Shared types (WizardMode, WizardState, etc.)
```

**Existing dependencies used by step components:**
- `PastePreviewModal` — used by WordInputStep for paste & preview flow
- `analyzePastedText` — utility for word analysis from pasted text
- `GAME_MODE_LEVELS` — game mode definitions (moved from CreateAssignmentWizard to `types.ts` or constants)
- `TOPIC_PACKS` — topic pack definitions (passed via props)

## Step 1: Word Input

Merges Quick Play's search-based input with Assignment's paste/browse/topic-packs sub-steps into one component.

**Shared UI:**
- Landing with 3 options: Paste words, Browse vocabulary, Topic packs
- Word chips display with remove buttons
- Drag-to-merge word chips (drag one chip onto another to create a phrase, e.g., "ice" + "cream" → "ice cream")
- Custom word translation (AI auto-translate + manual Hebrew/Arabic inputs)
- PastePreviewModal integration (paste text → analyze → preview matches → confirm)
- OCR upload button (Pro feature badge for Quick Play, enabled for Assignment)
- Search with auto-match from database
- "Select All / Clear All" controls
- Match count summary (exact matches, partial, need translation)

**Differences via props:**

| Prop | Quick Play | Assignment |
|------|-----------|------------|
| `autoMatchPartial` | `true` (starts-with matches shown) | `false` (exact only) |
| `showTopicPacks` | `true` | `true` |
| `showOcr` | `true` (disabled, Pro badge) | `true` (enabled) |
| `wordPool` | `ALL_WORDS` | Filtered by `selectedLevel`: `BAND_1_WORDS`, `BAND_2_WORDS`, or all |
| `showLevelFilter` | `false` | `true` (Band 1 / Band 2 / Custom selector) |
| `showDragToMerge` | `true` | `true` |

## Step 2: Configure

Game mode picker moves from `CreateAssignmentWizard` into `ConfigureStep.tsx`. Quick Play gains this step.

**Shared UI:**
- Game mode grid (same `GAME_MODE_LEVELS` — beginner/intermediate/advanced/mastery)
- Select All / Clear All toggle
- Difficulty legend dots
- Animated selection cards with emoji + name + check badge

**Quick Play differences (via props):**
- `showTitle`: `false`
- `showDeadline`: `false`
- `showTemplates`: `false`
- `showSentenceConfig`: `false`
- `defaultModes`: all modes selected by default
- `skippable`: `true` — shows "Skip to QR" button
- Step label: "Choose game modes (optional)"

**Assignment differences:**
- `showTitle`: `true`
- `showDeadline`: `true`
- `showTemplates`: `true` (template selector dropdown)
- `showSentenceConfig`: `true`
- `defaultModes`: `['flashcards']`
- `skippable`: `false`
- Step label: "Configure assignment"

**Sentence Builder Configuration (Assignment only):**

When `showSentenceConfig` is `true`, ConfigureStep renders a collapsible section below the game modes with:
- Sentence auto-generation toggle (auto-generates from selected words)
- Difficulty selector (Easy / Medium / Hard via `SentenceDifficulty` enum)
- Preview of generated sentences

This uses `assignmentSentences`, `setAssignmentSentences`, `sentenceDifficulty`, `setSentenceDifficulty` — passed as props.

**Assignment Welcome Screen:**

The existing `showAssignmentWelcome` overlay in CreateAssignmentWizard is replaced by the wizard's Step 1 landing. No separate welcome screen is needed — the 3-option landing (Paste / Browse / Topic Packs) serves the same purpose.

## Step 3: Review & Launch

Same review card layout. Summary shows word count, mode count, and selected words as chips.

**Shared UI:**
- Stats row: word count + mode count with icons
- Word chips scroll area
- Mode badges showing selected game types
- Back button to edit

**Quick Play ending:** "Generate QR Code" button (green gradient) → creates `quick_play_sessions` record → navigates to monitor view.

**Quick Play shortcut:** The existing "Add All & Generate QR" button from the old flat layout is preserved as a shortcut. On Step 3, if all defaults are accepted, the review step shows a prominent "Quick Start" banner above the review card that combines "Add all words + use all modes + Generate QR" in one click. This preserves the speed of the original Quick Play.

**Assignment ending:** "Assign to Class" button (blue gradient) → creates `assignments` record → navigates to dashboard.

**Edit flow:** When `editingAssignment` is provided, Step 3 shows "Update Assignment" instead of "Assign to Class", and all steps are pre-populated with the existing assignment data.

## SetupWizard Shell

The shell component manages:
- Current step state (1, 2, 3)
- Stepper UI (3 dots with connecting lines)
- AnimatePresence transitions between steps
- Core shared state: `selectedWords` (always `Word[]`), `selectedModes` (always `string[]`)

Props:

```typescript
interface SetupWizardProps {
  mode: 'quick-play' | 'assignment';
  allWords: Word[];
  onComplete: (result: WizardResult) => void;
  onBack: () => void;

  // Word pool filtering
  band1Words?: Word[];
  band2Words?: Word[];

  // Assignment-specific
  selectedClass?: { name: string; code: string; studentCount?: number };
  assignmentTitle?: string;
  setAssignmentTitle?: (title: string) => void;
  assignmentDeadline?: string;
  setAssignmentDeadline?: (date: string) => void;
  assignmentInstructions?: string;
  setAssignmentInstructions?: (instructions: string) => void;
  assignmentSentences?: string[];
  setAssignmentSentences?: (sentences: string[]) => void;
  sentenceDifficulty?: SentenceDifficulty;
  setSentenceDifficulty?: (level: SentenceDifficulty) => void;
  editingAssignment?: AssignmentData | null;
  setEditingAssignment?: (a: AssignmentData | null) => void;

  // Quick Play-specific
  onGenerateQR?: (words: Word[], modes: string[]) => void;

  // Shared utilities
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  onPlayWord?: (wordId: number, fallbackText?: string) => void;

  // Topic packs
  topicPacks?: Array<{ name: string; icon: string; ids: number[] }>;

  // OCR
  onOcrUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isOcrProcessing?: boolean;
  ocrProgress?: number;

  // Word document upload
  onDocxUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;

  // Translation
  onTranslateWord?: (word: string) => Promise<{ hebrew: string; arabic: string } | null>;
}
```

**Type standardization:** The shared steps use `Word[]` for selected words throughout. For Assignment, the conversion to `number[]` happens only at the `onComplete` boundary when saving to Supabase. This avoids maintaining two parallel representations.

## Stepper Design

Same 3-step indicator for both:

```
  ●───────○───────○
  1       2       3
```

- Completed steps: filled gradient circle with check
- Current step: gradient circle, larger
- Future steps: gray circle
- Connecting lines: green (completed) or gray (pending)
- Step labels below each dot

Quick Play step 2 shows a subtle "Optional" badge and a "Skip" shortcut.

## State Flow

```
WordInputStep
  ↓ selectedWords: Word[]
ConfigureStep
  ↓ selectedModes: string[]
ReviewStep
  ↓ action: generate QR or create assignment
```

State lives in `SetupWizard`. Each step receives what it needs via props and calls `onNext()`, `onBack()` to navigate.

## State Ownership

Quick Play state variables and their new locations:

| State variable | Current location | New location |
|---------------|-----------------|--------------|
| `quickPlaySelectedWords` | App.tsx | `SetupWizard` (as `selectedWords`) |
| `quickPlaySearchQuery` | App.tsx | `WordInputStep` (internal) |
| `quickPlayCustomWords` | App.tsx | `WordInputStep` (internal) |
| `quickPlayAddingCustom` | App.tsx | `WordInputStep` (internal) |
| `quickPlayTranslating` | App.tsx | `WordInputStep` (internal) |
| `quickPlayWordEditorOpen` | App.tsx | `WordInputStep` (internal) |
| `quickPlaySessionCode` | App.tsx | Stays in App.tsx (post-wizard) |
| `quickPlayActiveSession` | App.tsx | Stays in App.tsx (post-wizard) |
| `draggedWord` | App.tsx | `WordInputStep` (internal) |
| `searchTerms` (memo) | App.tsx | `WordInputStep` (computed internally) |
| `searchResults` (memo) | App.tsx | `WordInputStep` (computed internally) |
| `showQuickPlayPreview` | App.tsx | `WordInputStep` (internal) |
| `quickPlayPreviewAnalysis` | App.tsx | `WordInputStep` (internal) |

Computed values (`allFoundWords`, `uniqueFoundWords`, `exactMatchesCount`, `unmatchedTerms`) are computed internally by `WordInputStep` from the search state — not passed as props.

## Validation Rules

| Step | Rule | Error message |
|------|------|--------------|
| Step 1 → Step 2 | At least 1 word selected | "Please select at least one word to continue" |
| Step 2 → Step 3 | At least 1 game mode selected (Assignment only) | "Please choose at least one game mode" |
| Step 2 → Step 3 | Quick Play: always valid (all modes default) | — |
| Step 3 → Launch | Assignment: title required | "Please enter an assignment title" |
| Step 3 → Launch | Assignment: deadline must be in the future (if set) | "Deadline must be in the future" |

Quick Play's Step 2 validation is skipped entirely when using "Skip to QR" shortcut.

## Migration Plan

### Phase 1: Extract shared components

1. Create `src/components/setup/types.ts` with shared types (`WizardMode`, `WizardResult`, `Word`, etc.)
2. Move `GAME_MODE_LEVELS` to shared constants (used by both flows)
3. Extract `ConfigureStep.tsx` — move game mode picker from CreateAssignmentWizard
4. Extract `WordInputStep.tsx` — unify word input UI from both flows. Absorbs: search logic, word chips, custom word translation, drag-to-merge, PastePreviewModal, topic packs, OCR
5. Extract `ReviewStep.tsx` — unified review card

### Phase 2: Build SetupWizard shell

6. Create `SetupWizard.tsx` with stepper, transitions, and step orchestration
7. Wire Quick Play: replace inline JSX in App.tsx with `<SetupWizard mode="quick-play" />`. Move search/translation state into `WordInputStep`. Keep session creation logic in App.tsx via `onComplete` callback.
8. Wire Create Assignment: refactor `CreateAssignmentWizard.tsx` to render `<SetupWizard mode="assignment" />` internally, passing existing props through. Keep the component as a thin wrapper.

### Phase 3: Cleanup

9. Remove inline Quick Play JSX from App.tsx (~550 lines)
10. Remove duplicated word input/mode picker code from CreateAssignmentWizard.tsx
11. Verify both flows work identically visually
12. Test edit assignment flow still works with `editingAssignment` prop

## What Does NOT Change

- Dashboard entry points remain separate cards
- Backend logic (Supabase calls, session creation, assignment creation)
- Student-facing experience
- Socket.IO / real-time monitoring for Quick Play
- Word data, translation API, OCR logic
- `PastePreviewModal` component (used as-is by WordInputStep)
- Assignment edit flow (pre-populates via `editingAssignment`)

## Risks

- **Quick Play regression:** The inline JSX is complex with many state interactions. Moving it into shared components requires careful prop threading. Mitigated by migrating state into step components (not threading through props) and testing both flows end-to-end.
- **Props explosion:** The full `SetupWizardProps` has many fields. Mitigated by grouping into sub-objects (`assignmentConfig`, `ocrConfig`, `translationConfig`) if it grows beyond what's listed above.
- **CreateAssignmentWizard coupling:** It receives 40+ props from App.tsx. The refactor keeps it as a thin wrapper so the prop surface stays the same from App.tsx's perspective — only the internal rendering changes.
- **Type mismatch:** Assignment uses `number[]` for selected words internally. Standardized on `Word[]` in shared components, converting to `number[]` only at the save boundary. Risk is low since the conversion is a simple `.map(w => w.id)`.
