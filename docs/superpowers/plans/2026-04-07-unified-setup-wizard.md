# Unified Setup Wizard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Quick Play Setup and Create Assignment Wizard with shared step components that provide identical visual design, game mode selection in both flows, and consistent speed.

**Architecture:** Extract 3 shared step components (`WordInputStep`, `ConfigureStep`, `ReviewStep`) into `src/components/setup/`. A `SetupWizard` shell orchestrates them with a stepper UI. Quick Play and Create Assignment both render `<SetupWizard>` with different props. The existing `CreateAssignmentWizard.tsx` becomes a thin prop-passing wrapper. The inline Quick Play JSX in `App.tsx` (~828 lines, 6551-7379) is replaced entirely.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Framer Motion (motion/react), Supabase, Lucide icons

**Spec:** `docs/superpowers/specs/2026-04-07-unified-setup-wizard-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/setup/types.ts` | Create | Shared types: `WizardMode`, `WizardResult`, `GameModeDef`, `GAME_MODE_LEVELS` |
| `src/components/setup/SetupWizard.tsx` | Create | Shell: stepper, transitions, step orchestration |
| `src/components/setup/WordInputStep.tsx` | Create | Step 1: word input (paste, browse, search, OCR, drag-to-merge) |
| `src/components/setup/ConfigureStep.tsx` | Create | Step 2: game mode picker + optional title/deadline/templates |
| `src/components/setup/ReviewStep.tsx` | Create | Step 3: review card + launch action |
| `src/components/CreateAssignmentWizard.tsx` | Modify | Thin wrapper delegating to SetupWizard |
| `src/App.tsx` | Modify | Replace inline Quick Play JSX with `<SetupWizard mode="quick-play" />` |

---

## Chunk 1: Types and Shared Constants

### Task 1: Create shared types file

**Files:**
- Create: `src/components/setup/types.ts`

- [ ] **Step 1: Create `types.ts` with shared types and constants**

```typescript
import { Word } from '../../data/vocabulary';
import { SentenceDifficulty } from '../../constants/game';

// --- Wizard Mode ---
export type WizardMode = 'quick-play' | 'assignment';

// --- Game Mode Definitions ---
export interface GameModeDef {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export const GAME_MODE_LEVELS: Record<string, GameModeDef[]> = {
  beginner: [
    { id: 'flashcards', name: 'Flashcards', emoji: '📇', color: 'from-emerald-400 to-emerald-500' },
    { id: 'matching', name: 'Matching', emoji: '🃏', color: 'from-teal-400 to-teal-500' },
    { id: 'classic', name: 'Classic', emoji: '🎯', color: 'from-blue-400 to-blue-500' },
  ],
  intermediate: [
    { id: 'listening', name: 'Listening', emoji: '👂', color: 'from-violet-400 to-violet-500' },
    { id: 'true-false', name: 'True/False', emoji: '✅', color: 'from-purple-400 to-purple-500' },
    { id: 'letter-sounds', name: 'Letter Sounds', emoji: '🔊', color: 'from-fuchsia-400 to-fuchsia-500' },
  ],
  advanced: [
    { id: 'spelling', name: 'Spelling', emoji: '✍️', color: 'from-orange-400 to-orange-500' },
    { id: 'reverse', name: 'Reverse', emoji: '🔁', color: 'from-amber-400 to-amber-500' },
    { id: 'scramble', name: 'Scramble', emoji: '🔤', color: 'from-yellow-400 to-yellow-500' },
  ],
  mastery: [
    { id: 'sentence-builder', name: 'Sentence Builder', emoji: '📝', color: 'from-rose-400 to-rose-500' },
  ],
};

export const ALL_GAME_MODE_IDS = Object.values(GAME_MODE_LEVELS).flat().map(m => m.id);

// --- Wizard Result ---
export interface WizardResult {
  words: Word[];
  modes: string[];
}

// --- Assignment Data (for edit flow) ---
export interface AssignmentData {
  id: string;
  title: string;
  wordIds: number[];
  words?: Word[];
  deadline?: string | null;
  allowedModes?: string[];
  classId: string;
  sentences?: string[];
  sentenceDifficulty?: number;
  createdAt?: string;
}

// --- Sub-steps for word input ---
export type WordInputSubStep = 'landing' | 'paste' | 'editor' | 'browse' | 'saved-groups' | 'topic-packs';

// --- Helper: look up game mode display config by ID ---
export function getGameModeConfig(modeId: string): GameModeDef | undefined {
  return Object.values(GAME_MODE_LEVELS).flat().find(m => m.id === modeId);
}
```

Note: Copy `GAME_MODE_LEVELS` values from `src/components/CreateAssignmentWizard.tsx` lines 91-110. They are identical — this just moves them to a shared location. The `AssignmentData` interface replaces the duplicate in `CreateAssignmentWizard.tsx` lines 66-84 — remove that duplicate after creating this file and import from here instead.

- [ ] **Step 2: Verify types compile**

Run: `cd "C:\Users\Waseem\Downloads\version1\Vocaband" && npx tsc --noEmit src/components/setup/types.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/setup/types.ts
git commit -m "feat: add shared wizard types and game mode constants"
```

---

## Chunk 2: ConfigureStep Component

### Task 2: Extract ConfigureStep

This is the game mode picker that currently lives in `CreateAssignmentWizard.tsx` lines 1729-1794. Extract it into a standalone component that both Quick Play and Assignment can use.

**Files:**
- Create: `src/components/setup/ConfigureStep.tsx`
- Reference: `src/components/CreateAssignmentWizard.tsx:1729-1794` (game mode grid)

- [ ] **Step 1: Create `ConfigureStep.tsx`**

The component renders:
1. Back button + "Step 2 of 3" header
2. Step title (varies by mode: "Choose game modes (optional)" vs "Configure assignment")
3. **Quick Play only skips:** title field, deadline picker, template selector, sentence config
4. Game mode grid — same card design as CreateAssignmentWizard lines 1752-1775
5. Select All / Clear All toggle
6. Difficulty legend dots
7. **Assignment only:** title input, instructions textarea, deadline picker, template dropdown, sentence config section
8. Next button (or "Skip to QR" for Quick Play)

Props interface:

```typescript
interface ConfigureStepProps {
  mode: WizardMode;
  selectedModes: string[];
  onModesChange: (modes: string[]) => void;
  onNext: () => void;
  onBack: () => void;

  // Assignment-only
  assignmentTitle?: string;
  onTitleChange?: (title: string) => void;
  assignmentDeadline?: string;
  onDeadlineChange?: (date: string) => void;
  assignmentInstructions?: string;
  onInstructionsChange?: (instructions: string) => void;
  assignmentSentences?: string[];
  onSentencesChange?: (sentences: string[]) => void;
  sentenceDifficulty?: SentenceDifficulty;
  onSentenceDifficultyChange?: (level: SentenceDifficulty) => void;
  selectedWords?: Word[];
  editingAssignment?: AssignmentData | null;
}
```

Implementation details:
- Copy the game mode grid JSX from `CreateAssignmentWizard.tsx` lines 1752-1775 (the `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5` layout with emoji cards)
- Copy the `toggleGameMode` logic (toggles a mode in/out of the array)
- Copy the difficulty legend from lines 1778-1794
- For Assignment fields (title, deadline, templates, sentences), copy from `renderStep2()` in CreateAssignmentWizard
- Wrap everything in `motion.div` with `initial/animate/exit` for transitions
- Stepper uses same design as CreateAssignmentWizard lines 2256-2275

- [ ] **Step 2: Verify component compiles**

Run: `cd "C:\Users\Waseem\Downloads\version1\Vocaband" && npx tsc --noEmit src/components/setup/ConfigureStep.tsx`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/setup/ConfigureStep.tsx
git commit -m "feat: extract ConfigureStep with shared game mode picker"
```

---

## Chunk 3: WordInputStep Component

### Task 3: Create WordInputStep

This is the largest extraction. It combines:
- Quick Play's search-based word input (App.tsx lines 6580-6643)
- Quick Play's custom word translation UI (App.tsx lines 6832-6973)
- Quick Play's word selection grid (App.tsx lines 6978-7050)
- Quick Play's word editor modal with drag-to-merge (App.tsx lines 7180-7375)
- Create Assignment's paste/browse/topic-packs landing (CreateAssignmentWizard.tsx lines 758-1020)
- Create Assignment's word editor with translation editing

**Files:**
- Create: `src/components/setup/WordInputStep.tsx`
- Reference: `src/App.tsx:6580-7375` (Quick Play word input)
- Reference: `src/components/CreateAssignmentWizard.tsx:758-1620` (Assignment word input)

- [ ] **Step 1: Create `WordInputStep.tsx`**

Props interface:

```typescript
interface WordInputStepProps {
  mode: WizardMode;
  allWords: Word[];
  band1Words?: Word[];
  band2Words?: Word[];
  selectedWords: Word[];
  onSelectedWordsChange: (words: Word[]) => void;
  onNext: () => void;
  onBack: () => void;

  // Word input config
  autoMatchPartial: boolean;  // true for Quick Play, false for Assignment
  showLevelFilter: boolean;   // false for Quick Play, true for Assignment

  // External services
  onTranslateWord: (word: string) => Promise<{ hebrew: string; arabic: string } | null>;
  onOcrUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isOcrProcessing?: boolean;
  ocrProgress?: number;
  onDocxUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPlayWord?: (wordId: number, fallbackText?: string) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;

  // Topic packs
  topicPacks?: Array<{ name: string; icon: string; ids: number[] }>;

  // Custom words (Assignment)
  customWords?: Word[];
  onCustomWordsChange?: (words: Word[]) => void;
n  // TopAppBar props (both modes)
  user?: { displayName?: string; avatar?: string } | null;
  onLogout?: () => void;

  // Edit mode
  editingAssignment?: AssignmentData | null;
}
```

Internal state (moved from App.tsx, scoped to this component):
- `searchQuery` (was `quickPlaySearchQuery`)
- `customWordMap` (was `quickPlayCustomWords`)
- `addingCustom` (was `quickPlayAddingCustom`)
- `translating` (was `quickPlayTranslating`)
- `wordEditorOpen` (was `quickPlayWordEditorOpen`)
- `draggedWord` (was `draggedWord` in App.tsx)
- `showPreview` (was `showQuickPlayPreview`)
- `previewAnalysis` (was `quickPlayPreviewAnalysis`)
- `subStep`: `'landing' | 'paste' | 'editor' | 'browse' | 'topic-packs'`
- `searchTerms` (computed from searchQuery, was a memo in App.tsx line 466)
- `searchResults` (computed from searchTerms + allWords)

Sub-steps:
1. **Landing** — 4 cards: "Paste from anywhere" (indigo gradient), "Use saved group" (emerald), "Topic packs" (amber), "Upload image / OCR" (stone, PRO badge). Copy from CreateAssignmentWizard lines 780-900.
2. **Paste** — Textarea + "Paste from clipboard" button + PastePreviewModal. Copy from CreateAssignmentWizard lines 870-1020 for the paste UI, and from App.tsx lines 7280-7375 for the preview modal.
3. **Editor** — Word editor with translation editing, drag-to-merge, AI translate. Copy from App.tsx lines 7180-7280 (word editor modal).
4. **Browse** — Level filter + word grid. Copy from CreateAssignmentWizard browse sub-step.
5. **Saved Groups** — Saved group cards with word counts and load functionality. Copy from CreateAssignmentWizard lines 1382-1470. State: `savedGroups` loaded from localStorage, `groupNameInput`, `showSaveGroup`.
6. **Topic packs** — Topic pack cards with word counts. Copy from CreateAssignmentWizard.

The search-based flow from Quick Play (type words → auto-match → add chips → translate unmatched) is integrated into the paste sub-step. When `autoMatchPartial` is true, it also shows partial matches.

- [ ] **Step 2: Verify component compiles**

Run: `cd "C:\Users\Waseem\Downloads\version1\Vocaband" && npx tsc --noEmit src/components/setup/WordInputStep.tsx`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/setup/WordInputStep.tsx
git commit -m "feat: extract WordInputStep combining search, paste, browse, OCR"
```

---

## Chunk 4: ReviewStep Component

### Task 4: Create ReviewStep

**Files:**
- Create: `src/components/setup/ReviewStep.tsx`
- Reference: `src/components/CreateAssignmentWizard.tsx:1991-2100` (review card)
- Reference: `src/App.tsx:6748-6830` (Quick Start banner)

- [ ] **Step 1: Create `ReviewStep.tsx`**

Props interface:

```typescript
interface ReviewStepProps {
  mode: WizardMode;
  selectedWords: Word[];
  selectedModes: string[];
  onBack: () => void;
  onLaunch: () => void;

  // Quick Play-specific
  onQuickStart?: () => void;  // "Add All & Generate QR" shortcut

  // Assignment-specific
  assignmentTitle?: string;
  assignmentDeadline?: string;
  assignmentInstructions?: string;
  selectedClassName?: string;
  editingAssignment?: AssignmentData | null;
}
```

UI structure:
1. Back button + "Step 3 of 3" header
2. Review card with:
   - Stats row: word count (BookOpen icon) + mode count (Target icon)
   - Word chips in scrollable area
   - Mode badges (emoji + name)
   - Assignment-only: title, deadline, class name display
3. **Quick Play shortcut:** Green gradient "Quick Start" banner (from App.tsx lines 6748-6830) — "Add All & Generate QR" in one click
4. Action button: "Generate QR Code" (green) or "Assign to Class" / "Update Assignment" (blue)

Copy the review card design from `CreateAssignmentWizard.tsx` lines 2022-2085 for consistency.

- [ ] **Step 2: Verify component compiles**

Run: `cd "C:\Users\Waseem\Downloads\version1\Vocaband" && npx tsc --noEmit src/components/setup/ReviewStep.tsx`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/setup/ReviewStep.tsx
git commit -m "feat: extract ReviewStep with shared review card design"
```

---

## Chunk 5: SetupWizard Shell

### Task 5: Create SetupWizard orchestrator

**Files:**
- Create: `src/components/setup/SetupWizard.tsx`
- Reference: `src/components/CreateAssignmentWizard.tsx:2252-2285` (stepper + AnimatePresence)

- [ ] **Step 1: Create `SetupWizard.tsx`**

This is the shell that orchestrates the 3 steps. It manages:
- Current step state (1, 2, 3)
- Core shared state: `selectedWords: Word[]`, `selectedModes: string[]`
- Stepper UI (identical to CreateAssignmentWizard lines 2256-2275)
- AnimatePresence transitions between steps

```typescript
interface SetupWizardProps {
  mode: WizardMode;
  allWords: Word[];
  band1Words?: Word[];
  band2Words?: Word[];
  onComplete: (result: WizardResult) => void;
  onBack: () => void;

  // Word input config
  autoMatchPartial: boolean;
  showLevelFilter: boolean;

  // Assignment-specific
  selectedClass?: { name: string; code: string; studentCount?: number };
  assignmentTitle?: string;
  onTitleChange?: (title: string) => void;
  assignmentDeadline?: string;
  onDeadlineChange?: (date: string) => void;
  assignmentInstructions?: string;
  onInstructionsChange?: (instructions: string) => void;
  assignmentSentences?: string[];
  onSentencesChange?: (sentences: string[]) => void;
  sentenceDifficulty?: SentenceDifficulty;
  onSentenceDifficultyChange?: (level: SentenceDifficulty) => void;
  editingAssignment?: AssignmentData | null;
  setEditingAssignment?: (a: AssignmentData | null) => void;

  // Quick Play-specific
  onGenerateQR?: (words: Word[], modes: string[]) => void;

  // External services
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  onPlayWord?: (wordId: number, fallbackText?: string) => void;
  onTranslateWord?: (word: string) => Promise<{ hebrew: string; arabic: string } | null;
  topicPacks?: Array<{ name: string; icon: string; ids: number[] }>;
  onOcrUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isOcrProcessing?: boolean;
  ocrProgress?: number;
  onDocxUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;

  // Custom words (Assignment)
  customWords?: Word[];
  onCustomWordsChange?: (words: Word[]) => void;
n  // TopAppBar props (both modes)
  user?: { displayName?: string; avatar?: string } | null;
  onLogout?: () => void;
}
```

Render structure:

```tsx
<div className="min-h-screen bg-surface pt-16 sm:pt-24 pb-6 sm:pb-8 px-3 sm:px-4 md:px-6">
  <TopAppBar title={...} subtitle={...} showBack onBack={onBack} ... />
  <div className="max-w-2xl mx-auto">
    {/* Stepper */}
    <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6">
      {[1, 2, 3].map(s => (
        // Same stepper as CreateAssignmentWizard lines 2257-2275
      ))}
    </div>
    <AnimatePresence mode="wait">
      {step === 1 && <WordInputStep ... />}
      {step === 2 && <ConfigureStep ... />}
      {step === 3 && <ReviewStep ... />}
    </AnimatePresence>
  </div>
</div>
```

The `TopAppBar` is shared from the existing component. Title varies:
- Quick Play: "Quick Play Setup" / "SELECT WORDS • GENERATE QR CODE"
- Assignment: "Create Assignment" / "SELECT WORDS • ASSIGN TO CLASS"

Default modes:
- Quick Play: `ALL_GAME_MODE_IDS` (all selected)
- Assignment: `['flashcards']` (minimal, teacher must choose)

- [ ] **Step 2: Verify component compiles**

Run: `cd "C:\Users\Waseem\Downloads\version1\Vocaband" && npx tsc --noEmit src/components/setup/SetupWizard.tsx`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/setup/SetupWizard.tsx
git commit -m "feat: add SetupWizard shell with stepper and step orchestration"
```

---

## Chunk 6: Wire Quick Play

### Task 6: Replace inline Quick Play JSX with SetupWizard

This replaces App.tsx lines 6551-7379 (~828 lines) with a single `<SetupWizard>` render.

**Files:**
- Modify: `src/App.tsx:6551-7379` (replace inline JSX)

- [ ] **Step 1: Add SetupWizard import to App.tsx**

At the top of App.tsx, add:
```typescript
import SetupWizard from "./components/setup/SetupWizard";
```

- [ ] **Step 2: Replace the Quick Play setup block**

Replace lines 6551-7379 with:

```tsx
if (view === "quick-play-setup") {
  return (
    <SetupWizard
      mode="quick-play"
      allWords={ALL_WORDS}
      onComplete={async (result) => {
        const dbWords = result.words.filter(w => w.id >= 0);
        const customWords = result.words.filter(w => w.id < 0);
        const wordIds = dbWords.map(w => w.id);
        const customWordsJson = customWords.length > 0
          ? JSON.stringify(customWords.map(w => ({ english: w.english, hebrew: w.hebrew, arabic: w.arabic })))
          : null;
        const { data, error } = await supabase.rpc('create_quick_play_session', {
          p_word_ids: wordIds.length > 0 ? wordIds : null,
          p_custom_words: customWordsJson
        });
        if (error) { showToast("Failed to create session: " + error.message, "error"); return; }
        const session = data as { id: string; session_code: string };
        setQuickPlaySessionCode(session.session_code);
        const newSession = { id: session.id, sessionCode: session.session_code, wordIds, words: result.words };
        setQuickPlayActiveSession(newSession);
        try { localStorage.setItem('vocaband_quick_play_session', JSON.stringify({ id: session.id, words: result.words })); } catch {}
        setView("quick-play-teacher-monitor");
      }}
      onBack={() => setView("teacher-dashboard")}
      autoMatchPartial={true}
      showLevelFilter={false}
      showToast={showToast}
      onPlayWord={(wordId, fallbackText) => speakWord(wordId, fallbackText)}
      onTranslateWord={translateWord}
      topicPacks={TOPIC_PACKS}
      user={user}
      onLogout={() => supabase.auth.signOut()}
    />
  );
}
```

This moves session creation logic (from App.tsx lines 6793-6820) into the `onComplete` callback.

Note: The `quickPlaySelectedWords` state in App.tsx is no longer needed for the setup view — it's managed internally by `SetupWizard`. But keep it for the teacher monitor view which reads from it. The `onComplete` callback sets it after session creation.

- [ ] **Step 3: Verify the app compiles and Quick Play renders**

Run: `cd "C:\Users\Waseem\Downloads\version1\Vocaband" && npm run build 2>&1 | head -30`
Expected: Build succeeds with no errors

- [ ] **Step 4: Manual test — Quick Play flow**

1. Navigate to http://localhost:3000
2. Log in as teacher
3. Click "Quick Online Challenge" → "Create"
4. Verify the 3-step wizard renders with stepper
5. Paste words in Step 1
6. Verify Step 2 shows game mode picker with all modes selected by default
7. Verify "Skip to QR" button works
8. Verify Step 3 shows review card with "Generate QR Code" button
9. Generate QR and verify monitor view loads

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: replace inline Quick Play JSX with SetupWizard component"
```

---

## Chunk 7: Wire Create Assignment

### Task 7: Refactor CreateAssignmentWizard to use SetupWizard

**Files:**
- Modify: `src/components/CreateAssignmentWizard.tsx` (thin wrapper)

- [ ] **Step 1: Refactor CreateAssignmentWizard**

Replace the entire component body with a thin wrapper that passes props through to `SetupWizard`:

```tsx
import SetupWizard from './setup/SetupWizard';
import { Word } from '../data/vocabulary';
import { SentenceDifficulty } from '../constants/game';
import type { AssignmentData } from './setup/types';

interface CreateAssignmentWizardProps {
  // Keep all existing props — same interface as before
  selectedClass: { name: string; code: string; studentCount?: number };
  allWords: Word[];
  band1Words: Word[];
  band2Words: Word[];
  customWords: Word[];
  setCustomWords: React.Dispatch<React.SetStateAction<Word[]>>;
  assignmentTitle: string;
  setAssignmentTitle: (title: string) => void;
  assignmentDeadline: string;
  setAssignmentDeadline: (date: string) => void;
  assignmentModes: string[];
  setAssignmentModes: React.Dispatch<React.SetStateAction<string[]>>;
  selectedWords: number[];
  setSelectedWords: React.Dispatch<React.SetStateAction<number[]>>;
  selectedLevel: string;
  setSelectedLevel: (level: "Band 1" | "Band 2" | "Custom") => void;
  tagInput: string;
  setTagInput: (input: string) => void;
  pastedText: string;
  setPastedText: (text: string) => void;
  showPasteDialog: boolean;
  setShowPasteDialog: (show: boolean) => void;
  pasteMatchedCount: number;
  pasteUnmatched: string[];
  handlePasteSubmit: () => void;
  handleAddUnmatchedAsCustom: () => void;
  handleSkipUnmatched: () => void;
  handleTagInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleDocxUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleOcrUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveAssignment: () => void;
  assignmentSentences: string[];
  setAssignmentSentences: (sentences: string[]) => void;
  sentenceDifficulty: SentenceDifficulty;
  setSentenceDifficulty: (level: SentenceDifficulty) => void;
  isOcrProcessing?: boolean;
  ocrProgress?: number;
  showTopicPacks: boolean;
  setShowTopicPacks: (show: boolean) => void;
  onBack: () => void;
  editingAssignment: AssignmentData | null;
  setEditingAssignment: (assignment: AssignmentData | null) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  onPlayWord?: (wordId: number, fallbackText?: string) => void;
}

export const CreateAssignmentWizard: React.FC<CreateAssignmentWizardProps> = (props) => {
  const {
    selectedClass, allWords, band1Words, band2Words,
    customWords, setCustomWords,
    assignmentTitle, setAssignmentTitle,
    assignmentDeadline, setAssignmentDeadline,
    assignmentModes, setAssignmentModes,
    selectedWords, setSelectedWords,
    handleSaveAssignment, onBack,
    assignmentSentences, setAssignmentSentences,
    sentenceDifficulty, setSentenceDifficulty,
    isOcrProcessing, ocrProgress,
    TOPIC_PACKS, editingAssignment, setEditingAssignment,
    showToast, onPlayWord,
    handleDocxUpload, handleOcrUpload,
  } = props;

  return (
    <SetupWizard
      mode="assignment"
      allWords={allWords}
      band1Words={band1Words}
      band2Words={band2Words}
      onComplete={() => handleSaveAssignment()}
      onBack={onBack}
      autoMatchPartial={false}
      showLevelFilter={true}
      selectedClass={selectedClass}
      assignmentTitle={assignmentTitle}
      onTitleChange={setAssignmentTitle}
      assignmentDeadline={assignmentDeadline}
      onDeadlineChange={setAssignmentDeadline}
      assignmentSentences={assignmentSentences}
      onSentencesChange={setAssignmentSentences}
      sentenceDifficulty={sentenceDifficulty}
      onSentenceDifficultyChange={setSentenceDifficulty}
      editingAssignment={editingAssignment}
      setEditingAssignment={setEditingAssignment}
      showToast={showToast}
      onPlayWord={onPlayWord}
      topicPacks={TOPIC_PACKS}
      onOcrUpload={handleOcrUpload}
      isOcrProcessing={isOcrProcessing}
      ocrProgress={ocrProgress}
      onDocxUpload={handleDocxUpload}
      customWords={customWords}
      onCustomWordsChange={setCustomWords}
      user={user}
      onLogout={onLogout}
    />
  );
};
```

Note: `handleSaveAssignment` is kept as the completion handler — it handles the Supabase call. The wizard just calls `onComplete` when the teacher clicks "Assign to Class".

Note: The `selectedWords` prop change from `number[]` to `Word[]` means we need to convert at the boundary. The `handleSaveAssignment` function in App.tsx already works with `selectedWords` as `number[]`, so we keep the conversion in the wrapper. `SetupWizard` passes `Word[]` in the result, and the wrapper converts to `number[]` before calling `handleSaveAssignment`.

- [ ] **Step 2: Update App.tsx Create Assignment rendering**

Add `user` and `onLogout` props to the `CreateAssignmentWizard` render in App.tsx (lines 5992-6043):

```tsx
<CreateAssignmentWizard
  // ... existing props ...
  user={user}
  onLogout={() => supabase.auth.signOut()}
/>
```

Update the `CreateAssignmentWizardProps` interface to accept these new props.

- [ ] **Step 3: Verify the app compiles**

Run: `cd "C:\Users\Waseem\Downloads\version1\Vocaband" && npm run build 2>&1 | head -30`
Expected: Build succeeds

- [ ] **Step 4: Manual test — Assignment flow**

1. Navigate to teacher dashboard
2. Select a class → "Create Assignment"
3. Verify the 3-step wizard renders with same stepper as Quick Play
4. Paste words in Step 1
5. Verify Step 2 shows title, deadline, templates, game modes
6. Verify Step 3 shows "Assign to Class" button
7. Create assignment and verify it appears in student dashboard

- [ ] **Step 5: Commit**

```bash
git add src/components/CreateAssignmentWizard.tsx src/App.tsx
git commit -m "feat: refactor CreateAssignmentWizard to use shared SetupWizard"
```

---

## Chunk 8: Cleanup and Visual Consistency

### Task 8: Remove dead code and verify visual parity

**Files:**
- Modify: `src/App.tsx` (remove unused Quick Play state if fully migrated)
- Verify: `src/components/setup/` (all components)

- [ ] **Step 1: Remove Quick Play state variables that moved into WordInputStep**

After confirming the Quick Play flow works end-to-end, remove these state variables from App.tsx (lines 292-309) since they're now internal to `WordInputStep`:
- `quickPlaySearchQuery` / `setQuickPlaySearchQuery`
- `quickPlayCustomWords` / `setQuickPlayCustomWords`
- `quickPlayAddingCustom` / `setQuickPlayAddingCustom`
- `quickPlayTranslating` / `setQuickPlayTranslating`
- `quickPlayWordEditorOpen` / `setQuickPlayWordEditorOpen`
- `draggedWord` / `setDraggedWord`
- `showQuickPlayPreview` / `setShowQuickPlayPreview`
- `quickPlayPreviewAnalysis` / `setQuickPlayPreviewAnalysis`

Keep these (still needed for teacher monitor view):
- `quickPlaySessionCode` / `setQuickPlaySessionCode`
- `quickPlaySelectedWords` / `setQuickPlaySelectedWords`
- `quickPlayActiveSession` / `setQuickPlayActiveSession`
- `quickPlayStudentName` / `setQuickPlayStudentName`
- `quickPlayAvatar` / `setQuickPlayAvatar`
- `quickPlayJoinedStudents` / `setQuickPlayJoinedStudents`
- `quickPlayKicked` / `setQuickPlayKicked`
- `quickPlaySessionEnded` / `setQuickPlaySessionEnded`
- `quickPlayCompletedModes` / `setQuickPlayCompletedModes`
- `quickPlayStatusMessage` / `setQuickPlayStatusMessage`

Also remove the `searchTerms` memo (line 466) and the auto-add exact matches effect (lines 707-730) since they move into `WordInputStep`.

- [ ] **Step 2: Remove duplicate GAME_MODE_LEVELS from CreateAssignmentWizard**

Since `GAME_MODE_LEVELS` now lives in `types.ts`, remove the duplicate definition from `CreateAssignmentWizard.tsx` lines 91-110. Import from `./setup/types` instead.

- [ ] **Step 3: Visual consistency check**

Open both flows side-by-side in the browser and verify:
1. Same stepper dots and connecting lines
2. Same card styles (rounded corners, shadows, borders)
3. Same color scheme (gradients, backgrounds, text colors)
4. Same transitions (AnimatePresence with fade/slide)
5. Same font sizes and weights
6. Same spacing (padding, margins, gaps)

- [ ] **Step 4: Run full typecheck**

Run: `cd "C:\Users\Waseem\Downloads\version1\Vocaband" && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "cleanup: remove dead Quick Play state and duplicate constants"
```

---

## Chunk 9: Edit Assignment Flow Verification

### Task 9: Verify edit assignment still works

**Files:**
- Verify: `src/App.tsx` (editing assignment flow)
- Verify: `src/components/setup/SetupWizard.tsx` (pre-populate from editingAssignment)

- [ ] **Step 1: Test edit assignment flow**

1. Navigate to teacher dashboard
2. Find an existing assignment → click "Edit"
3. Verify `editingAssignment` is passed to `CreateAssignmentWizard`
4. Verify SetupWizard pre-populates:
   - Step 1: words from the assignment
   - Step 2: title, modes, deadline from the assignment
   - Step 3: shows "Update Assignment" instead of "Assign to Class"
5. Make a change and save
6. Verify the assignment is updated

- [ ] **Step 2: Test Quick Play QR generation**

1. Quick Play → paste words → Skip to QR (or Step 2 → Step 3 → Generate QR)
2. Verify QR code is generated
3. Verify monitor view loads with correct session
4. Scan QR with another browser tab
5. Verify student can join and play

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: verify edit assignment and Quick Play QR flows work with unified wizard"
```
