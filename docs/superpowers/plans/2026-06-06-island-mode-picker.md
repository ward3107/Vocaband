# Island Mode-Picker with Explorer Pet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the student mode picker's "hero card + list" with a scattered-island world where the pet is the explorer that walks between mode-islands.

**Architecture:** New presentational components in `src/components/arcade/` (`IslandMap`, `ModeIsland`, `IslandDetailSheet`, `TravelingPet`) plus two pure helpers (`islandLayout.ts`, `petTravel.ts`). `GameModeSelectionView` keeps all its existing mode/round/mastery derivation and only swaps what it renders. Pet data is threaded from `App.tsx` → `GameRoutes` → the view so it can render the same `PetCompanion` card used on the home screen.

**Tech Stack:** React 19 + TypeScript, motion/react, Tailwind, vitest + @testing-library/react.

---

## File structure

**Create:**
- `src/components/arcade/islandLayout.ts` — `computeIslandPositions(count)` + `mapHeight(count)` (pure).
- `src/components/arcade/petTravel.ts` — `advancePetTravel(assignmentId, toIndex, storage?)` (sessionStorage transition).
- `src/components/arcade/ModeIsland.tsx` — one island medallion.
- `src/components/arcade/TravelingPet.tsx` — pet sprite that animates between island coordinates.
- `src/components/arcade/IslandDetailSheet.tsx` — the rich bottom sheet.
- `src/components/arcade/IslandMap.tsx` — composes background + islands + pet.
- `src/__tests__/islandLayout.test.ts`
- `src/__tests__/petTravel.test.ts`
- `src/__tests__/ModeIsland.test.tsx`
- `src/__tests__/GameModeSelectionView.islands.test.tsx`

**Modify:**
- `src/views/GameModeSelectionView.tsx` — render the island world; accept pet props; render `PetCompanion`.
- `src/views/GameRoutes.tsx` — add pet deps to `GameRoutesDeps`; pass them through.
- `src/App.tsx` — supply the new pet deps (display name, pet stages, claimable milestone, claim handler, evolutionPending) to `renderGameRoute`.

---

## Task 1: Island layout helper

**Files:**
- Create: `src/components/arcade/islandLayout.ts`
- Test: `src/__tests__/islandLayout.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/islandLayout.test.ts
import { describe, it, expect } from "vitest";
import { computeIslandPositions, mapHeight } from "../components/arcade/islandLayout";

describe("computeIslandPositions", () => {
  it("returns one position per island", () => {
    expect(computeIslandPositions(6)).toHaveLength(6);
    expect(computeIslandPositions(0)).toHaveLength(0);
  });

  it("is deterministic — same count gives identical positions", () => {
    expect(computeIslandPositions(13)).toEqual(computeIslandPositions(13));
  });

  it("keeps x within the 0–100% band", () => {
    for (const p of computeIslandPositions(13)) {
      expect(p.xPct).toBeGreaterThanOrEqual(0);
      expect(p.xPct).toBeLessThanOrEqual(100);
    }
  });

  it("places each island strictly below the previous (no vertical overlap)", () => {
    const ys = computeIslandPositions(13).map((p) => p.y);
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i]).toBeGreaterThan(ys[i - 1]);
    }
  });

  it("mapHeight clears the last island", () => {
    const pos = computeIslandPositions(5);
    expect(mapHeight(5)).toBeGreaterThan(pos[4].y);
    expect(mapHeight(0)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/islandLayout.test.ts`
Expected: FAIL — cannot find module `../components/arcade/islandLayout`.

- [ ] **Step 3: Write the implementation**

```ts
// src/components/arcade/islandLayout.ts
/**
 * Deterministic layout for the mode-island map. Islands are placed down a
 * scrollable column in alternating lanes with a fixed per-index vertical
 * nudge, producing a "scattered archipelago" look that is identical on
 * every render (no randomness) so islands never jump between frames.
 */
export interface IslandPos {
  /** Horizontal centre as a % of the map width. */
  xPct: number;
  /** Vertical centre in px from the top of the scrollable map. */
  y: number;
}

// Lanes (% width) cycled per index to scatter the islands left/centre/right.
const LANES = [24, 70, 44, 78, 32, 60];
// Deterministic vertical nudge per index (range ±12, well under GAP so the
// strict top-to-bottom ordering is preserved).
const JITTER = [0, -12, 8, -8, 12, -4];
const TOP = 100; // px below the fixed header before the first island
const GAP = 118; // vertical spacing between consecutive islands
const BOTTOM_PAD = 150; // space below the last island (pet + label clearance)

export function computeIslandPositions(count: number): IslandPos[] {
  const out: IslandPos[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      xPct: LANES[i % LANES.length],
      y: TOP + i * GAP + JITTER[i % JITTER.length],
    });
  }
  return out;
}

export function mapHeight(count: number): number {
  if (count <= 0) return 0;
  const pos = computeIslandPositions(count);
  return pos[count - 1].y + BOTTOM_PAD;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/islandLayout.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/arcade/islandLayout.ts src/__tests__/islandLayout.test.ts
git commit -m "feat(student): deterministic island-map layout helper"
```

---

## Task 2: Pet-travel sessionStorage helper

**Files:**
- Create: `src/components/arcade/petTravel.ts`
- Test: `src/__tests__/petTravel.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/petTravel.test.ts
import { describe, it, expect } from "vitest";
import { advancePetTravel } from "../components/arcade/petTravel";

// Minimal in-memory Storage stand-in so the test never touches the real
// sessionStorage and stays isolated between cases.
function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    key: (i) => Array.from(m.keys())[i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, v),
  };
}

describe("advancePetTravel", () => {
  it("returns from=null on the first visit and records the island", () => {
    const s = fakeStorage();
    expect(advancePetTravel("a1", 2, s)).toEqual({ from: null, to: 2 });
    expect(s.getItem("vb_pet_island_a1")).toBe("2");
  });

  it("returns the previous island as `from` on the next visit", () => {
    const s = fakeStorage();
    advancePetTravel("a1", 2, s);
    expect(advancePetTravel("a1", 4, s)).toEqual({ from: 2, to: 4 });
  });

  it("scopes the memory per assignment", () => {
    const s = fakeStorage();
    advancePetTravel("a1", 2, s);
    expect(advancePetTravel("a2", 5, s)).toEqual({ from: null, to: 5 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/petTravel.test.ts`
Expected: FAIL — cannot find module `../components/arcade/petTravel`.

- [ ] **Step 3: Write the implementation**

```ts
// src/components/arcade/petTravel.ts
/**
 * Remembers which island the explorer pet was last sitting on, per
 * assignment, so the map can animate it from the old island to the new
 * recommended one after a mode is completed. First visit returns
 * `from: null` so the caller places the pet without a walk animation.
 */
export interface PetTravel {
  from: number | null;
  to: number;
}

const key = (assignmentId: string) => `vb_pet_island_${assignmentId}`;

export function advancePetTravel(
  assignmentId: string,
  toIndex: number,
  storage: Storage = sessionStorage,
): PetTravel {
  const raw = storage.getItem(key(assignmentId));
  const parsed = raw == null ? null : Number(raw);
  const from = parsed != null && Number.isFinite(parsed) ? parsed : null;
  storage.setItem(key(assignmentId), String(toIndex));
  return { from, to: toIndex };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/petTravel.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/arcade/petTravel.ts src/__tests__/petTravel.test.ts
git commit -m "feat(student): per-assignment pet-travel memory helper"
```

---

## Task 3: ModeIsland component

**Files:**
- Create: `src/components/arcade/ModeIsland.tsx`
- Test: `src/__tests__/ModeIsland.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/__tests__/ModeIsland.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ModeIsland from "../components/arcade/ModeIsland";

const base = {
  name: "Classic",
  emoji: <span>📖</span>,
  gradient: "from-emerald-400 to-teal-500",
  pos: { xPct: 50, y: 120 },
  reduced: true,
};

describe("ModeIsland", () => {
  it("labels the button with the mode name and state", () => {
    render(<ModeIsland {...base} state="done" mastery={2} onTap={() => {}} />);
    expect(screen.getByRole("button", { name: /Classic/ })).toBeTruthy();
  });

  it("fires onTap when not locked", () => {
    const onTap = vi.fn();
    render(<ModeIsland {...base} state="todo" mastery={0} onTap={onTap} />);
    fireEvent.click(screen.getByRole("button", { name: /Classic/ }));
    expect(onTap).toHaveBeenCalledOnce();
  });

  it("does not fire onTap when locked", () => {
    const onTap = vi.fn();
    render(<ModeIsland {...base} state="locked" mastery={0} onTap={onTap} />);
    fireEvent.click(screen.getByRole("button", { name: /Classic/ }));
    expect(onTap).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/ModeIsland.test.tsx`
Expected: FAIL — cannot find module `../components/arcade/ModeIsland`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/arcade/ModeIsland.tsx
/**
 * One mode-island medallion on the picker map. Pure presentation — the
 * parent decides position and state. Keeps each mode's own gradient per
 * the project's "each item gets its own gradient" rule.
 */
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Check, Lock, Star } from "lucide-react";
import type { IslandPos } from "./islandLayout";
import { ARCADE_BUTTON_TOUCH } from "./theme";

export type IslandState = "done" | "next" | "todo" | "locked";

interface ModeIslandProps {
  name: string;
  emoji: ReactNode;
  gradient: string;
  state: IslandState;
  mastery: number; // 0..3
  pos: IslandPos;
  onTap: () => void;
  reduced: boolean;
}

export default function ModeIsland({
  name, emoji, gradient, state, mastery, pos, onTap, reduced,
}: ModeIslandProps) {
  const locked = state === "locked";
  const done = state === "done";
  const next = state === "next";

  const stateWord =
    state === "done" ? "completed" :
    state === "next" ? "recommended next" :
    state === "locked" ? "locked" : "to play";

  return (
    <div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${pos.xPct}%`, top: `${pos.y}px` }}
    >
      <motion.button
        type="button"
        disabled={locked}
        onClick={() => { if (!locked) onTap(); }}
        aria-label={`${name} — ${stateWord}${done ? `, ${mastery} of 3 stars` : ""}`}
        whileTap={reduced || locked ? undefined : { scale: 0.92 }}
        whileHover={reduced || locked ? undefined : { scale: 1.06 }}
        className={`${ARCADE_BUTTON_TOUCH} relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-2xl shadow-lg sm:h-16 sm:w-16 ${
          done ? "ring-[3px] ring-amber-300" :
          next ? "ring-4 ring-amber-300/50 shadow-cyan-500/40" :
          "ring-2 ring-white/25"
        } ${locked ? "opacity-50 grayscale" : ""}`}
      >
        <span aria-hidden className="drop-shadow">{emoji}</span>

        {/* Soft pulse behind the recommended-next island. */}
        {next && !reduced && (
          <span aria-hidden className="absolute inset-0 -z-10 animate-ping rounded-full bg-cyan-400/30" />
        )}

        {/* Earned mastery stars above a completed island. */}
        {done && (
          <span aria-hidden className="absolute -top-3 left-1/2 flex -translate-x-1/2 gap-0.5">
            {[0, 1, 2].map((i) => (
              <Star key={i} size={9} strokeWidth={2}
                className={i < mastery ? "text-amber-300" : "text-white/25"}
                fill={i < mastery ? "currentColor" : "none"} />
            ))}
          </span>
        )}

        {/* Corner status glyph. */}
        {done && <Check aria-hidden size={14} strokeWidth={3} className="absolute -bottom-1 -end-1 rounded-full bg-emerald-500 p-0.5 text-white" />}
        {locked && <Lock aria-hidden size={13} className="absolute -bottom-1 -end-1 text-white/70" />}
      </motion.button>

      {/* Mode name floats below without affecting centring. */}
      <span className="pointer-events-none absolute left-1/2 top-full mt-1.5 w-20 -translate-x-1/2 text-center text-[10px] font-bold leading-tight text-white/90 drop-shadow">
        {name}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/ModeIsland.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/arcade/ModeIsland.tsx src/__tests__/ModeIsland.test.tsx
git commit -m "feat(student): ModeIsland medallion for the picker map"
```

---

## Task 4: TravelingPet component

**Files:**
- Create: `src/components/arcade/TravelingPet.tsx`

No new test (it wraps `CharacterStage`, which is covered by `pet-evolution.test.ts`; behaviour here is positioning/animation, verified visually in Task 8).

- [ ] **Step 1: Write the implementation**

```tsx
// src/components/arcade/TravelingPet.tsx
/**
 * The explorer pet on the mode-island map. Renders the shared
 * CharacterStage (so it looks exactly like the home pet at its current
 * evolution stage) inside a wrapper that sits on — and animates between —
 * island coordinates. `evolutionPending` is forced off here so the
 * evolution confetti only ever fires once, on the home screen.
 */
import { motion } from "motion/react";
import type { PetMilestone } from "../../constants/game";
import type { IslandPos } from "./islandLayout";
import CharacterStage from "./CharacterStage";

interface TravelingPetProps {
  currentStage: PetMilestone;
  nextStage: PetMilestone | null;
  xp: number;
  hasClaimable: boolean;
  displayName: string;
  /** Where the pet is walking to (the recommended island). */
  to: IslandPos;
  /** Where it walked from, or null on first visit (place, don't walk). */
  from: IslandPos | null;
  onTap: () => void;
  reduced: boolean;
}

export default function TravelingPet({
  currentStage, nextStage, xp, hasClaimable, displayName, to, from, onTap, reduced,
}: TravelingPetProps) {
  // Pet sits just above its island; scaled down so CharacterStage's large
  // hub footprint fits the map without colliding with neighbours.
  const target = { left: `${to.xPct}%`, top: `${to.y - 30}px` };
  const start = from ? { left: `${from.xPct}%`, top: `${from.y - 30}px` } : target;

  return (
    <motion.div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
      initial={reduced ? target : start}
      animate={target}
      transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 16 }}
      style={{ left: target.left, top: target.top }}
    >
      <div className="pointer-events-auto origin-center scale-[0.55]">
        <CharacterStage
          currentStage={currentStage}
          nextStage={nextStage}
          xp={xp}
          evolutionPending={false}
          hasClaimable={hasClaimable}
          onTap={onTap}
          displayName={displayName}
        />
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors from `TravelingPet.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/arcade/TravelingPet.tsx
git commit -m "feat(student): TravelingPet explorer sprite for the map"
```

---

## Task 5: IslandDetailSheet component

**Files:**
- Create: `src/components/arcade/IslandDetailSheet.tsx`

No new test (presentational; covered by the view render test in Task 8 and visual verification).

- [ ] **Step 1: Write the implementation**

```tsx
// src/components/arcade/IslandDetailSheet.tsx
/**
 * Rich bottom sheet that rises when a mode-island is tapped: medallion,
 * name, difficulty, best score, the 3-star target, an XP-on-finish chip,
 * and Play. Dialog over a dim backdrop; honours dir/RTL.
 */
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, X } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import type { Language } from "../../hooks/useLanguage";
import { ARCADE_BUTTON_TOUCH } from "./theme";

export interface IslandSheetMode {
  name: string;
  desc: string;
  emoji: ReactNode;
  gradient: string;
  /** Difficulty stars (1..3) + localized label. */
  difficultyStars: number;
  difficultyLabel: string;
  /** Best score 0..100, or null if never played. */
  best: number | null;
}

interface IslandDetailSheetProps {
  open: boolean;
  mode: IslandSheetMode | null;
  onClose: () => void;
  onPlay: () => void;
  reduced: boolean;
}

const STR: Record<Language, {
  play: string; bestNone: string; bestLabel: string; starTarget: string; xpOnFinish: string; close: string;
}> = {
  en: { play: "Play", bestNone: "none yet", bestLabel: "Best", starTarget: "Beat 90% for 3★", xpOnFinish: "+XP on finish", close: "Close" },
  he: { play: "שחק", bestNone: "עדיין אין", bestLabel: "שיא", starTarget: "90% ל-3★", xpOnFinish: "+XP בסיום", close: "סגור" },
  ar: { play: "العب", bestNone: "لا شيء بعد", bestLabel: "الأفضل", starTarget: "90% لـ 3★", xpOnFinish: "+XP عند الإنهاء", close: "إغلاق" },
  ru: { play: "Играть", bestNone: "пока нет", bestLabel: "Рекорд", starTarget: "90% для 3★", xpOnFinish: "+XP в конце", close: "Закрыть" },
};

export default function IslandDetailSheet({ open, mode, onClose, onPlay, reduced }: IslandDetailSheetProps) {
  const { language, dir } = useLanguage();
  const s = STR[language] ?? STR.en;

  return (
    <AnimatePresence>
      {open && mode && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog" aria-label={mode.name} dir={dir}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-xl rounded-t-3xl bg-gradient-to-b from-indigo-950 to-violet-900 p-5 shadow-2xl ring-1 ring-white/10"
            initial={reduced ? { opacity: 0 } : { y: "100%" }}
            animate={reduced ? { opacity: 1 } : { y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            <button
              type="button" onClick={onClose} aria-label={s.close}
              className={`${ARCADE_BUTTON_TOUCH} absolute end-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white`}
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <span className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${mode.gradient} text-2xl shadow`}>
                {mode.emoji}
              </span>
              <div className="min-w-0">
                <p className="text-xl font-black text-white">{mode.name}</p>
                <p className="text-xs font-bold text-amber-300">
                  {"★".repeat(mode.difficultyStars)}{"☆".repeat(Math.max(0, 3 - mode.difficultyStars))} {mode.difficultyLabel}
                </p>
              </div>
            </div>

            <p className="mt-3 text-sm font-medium text-indigo-100/90">{mode.desc}</p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white/10 p-2 text-center text-[11px] font-bold text-cyan-200">🎯 {s.starTarget}</div>
              <div className="rounded-xl bg-white/10 p-2 text-center text-[11px] font-bold text-amber-200">
                ⭐ {s.bestLabel}<br />{mode.best == null ? s.bestNone : `${mode.best}%`}
              </div>
              <div className="rounded-xl bg-white/10 p-2 text-center text-[11px] font-bold text-emerald-200">{s.xpOnFinish}</div>
            </div>

            <button
              type="button" onClick={onPlay}
              className={`${ARCADE_BUTTON_TOUCH} mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-base font-black text-indigo-950 shadow`}
            >
              <Play size={18} className="fill-indigo-950" /> {s.play}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors from `IslandDetailSheet.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/arcade/IslandDetailSheet.tsx
git commit -m "feat(student): rich island detail sheet"
```

---

## Task 6: IslandMap component

**Files:**
- Create: `src/components/arcade/IslandMap.tsx`

No new test here (composition; covered by the view render test in Task 8 and visual verification in Task 9).

- [ ] **Step 1: Write the implementation**

```tsx
// src/components/arcade/IslandMap.tsx
/**
 * The mode-picker map: a night-ocean canvas of mode-islands with the
 * explorer pet sitting on the recommended-next island. Vertically
 * scrollable so it scales from a few islands to all 13. Layout is
 * deterministic (islandLayout); the pet's from→to walk is read once on
 * mount from sessionStorage (petTravel).
 */
import { useRef, type ReactNode } from "react";
import type { PetMilestone } from "../../constants/game";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { computeIslandPositions, mapHeight } from "./islandLayout";
import { advancePetTravel } from "./petTravel";
import ModeIsland, { type IslandState } from "./ModeIsland";
import TravelingPet from "./TravelingPet";

export interface MapIsland {
  id: string;
  name: string;
  emoji: ReactNode;
  gradient: string;
  state: IslandState;
  mastery: number;
}

interface IslandMapProps {
  assignmentId: string;
  islands: MapIsland[];
  /** Index (into `islands`) of the recommended-next island. */
  recommendedIndex: number;
  pet: {
    currentStage: PetMilestone;
    nextStage: PetMilestone | null;
    xp: number;
    hasClaimable: boolean;
    displayName: string;
  };
  onTapIsland: (index: number) => void;
  onTapPet: () => void;
}

export default function IslandMap({
  assignmentId, islands, recommendedIndex, pet, onTapIsland, onTapPet,
}: IslandMapProps) {
  const reduced = useReducedMotion();
  const positions = computeIslandPositions(islands.length);

  // Read the from→to walk ONCE on mount so re-renders don't re-trigger it.
  const travelRef = useRef<{ from: number | null; to: number } | null>(null);
  if (travelRef.current === null && recommendedIndex >= 0) {
    travelRef.current = advancePetTravel(assignmentId, recommendedIndex);
  }
  const travel = travelRef.current;

  return (
    <div className="relative w-full" style={{ height: mapHeight(islands.length) }}>
      {islands.map((isl, i) => (
        <ModeIsland
          key={isl.id}
          name={isl.name}
          emoji={isl.emoji}
          gradient={isl.gradient}
          state={isl.state}
          mastery={isl.mastery}
          pos={positions[i]}
          reduced={reduced}
          onTap={() => onTapIsland(i)}
        />
      ))}

      {travel && positions[travel.to] && (
        <TravelingPet
          currentStage={pet.currentStage}
          nextStage={pet.nextStage}
          xp={pet.xp}
          hasClaimable={pet.hasClaimable}
          displayName={pet.displayName}
          to={positions[travel.to]}
          from={travel.from != null ? positions[travel.from] ?? null : null}
          reduced={reduced}
          onTap={onTapPet}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors from `IslandMap.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/arcade/IslandMap.tsx
git commit -m "feat(student): IslandMap composing islands + explorer pet"
```

---

## Task 7: Thread pet data through GameRoutes and App

**Files:**
- Modify: `src/views/GameRoutes.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add pet fields to `GameRoutesDeps`**

In `src/views/GameRoutes.tsx`, inside the `// Mode-selection branch` group of the `GameRoutesDeps` interface (after `quickPlayCompletedModes: Set<string>;` near line 50), add:

```ts
  // Mode-selection branch — explorer pet (island picker)
  petDisplayName: string;
  petCurrentStage: import('../constants/game').PetMilestone;
  petNextStage: import('../constants/game').PetMilestone | null;
  petClaimableMilestone: import('../constants/game').PetMilestone | null;
  onClaimPetMilestone: (milestone: import('../constants/game').PetMilestone) => void;
```

- [ ] **Step 2: Destructure and forward them**

In `renderGameRoute`, add the five names to the destructuring block (after `quickPlayCompletedModes,` on line 140):

```ts
    petDisplayName, petCurrentStage, petNextStage, petClaimableMilestone, onClaimPetMilestone,
```

Then in the `<GameModeSelectionView ... />` element (around line 183), add the props after `handleExitGame={handleExitGame}`:

```tsx
          petDisplayName={petDisplayName}
          petCurrentStage={petCurrentStage}
          petNextStage={petNextStage}
          petClaimableMilestone={petClaimableMilestone}
          onClaimPetMilestone={onClaimPetMilestone}
```

- [ ] **Step 3: Supply the deps from App.tsx**

In `src/App.tsx`, find the `renderGameRoute({ ... })` call. Add these to the object it passes (the values already exist in App: `retention`, `user`, `onGrantXp`, `onGrantReward` are all in scope — confirm by searching for `retention.currentPetStage` usage which App passes to `StudentDashboardView`). Add:

```tsx
    petDisplayName: user?.displayName ?? "",
    petCurrentStage: retention.currentPetStage,
    petNextStage: retention.nextPetStage,
    petClaimableMilestone: retention.claimablePetMilestone,
    onClaimPetMilestone: (milestone) => {
      // Same claim logic StudentDashboardView uses: grant the reward, then
      // record the claim so it won't re-surface.
      if (milestone.reward.kind === "xp" && typeof milestone.reward.value === "number") {
        onGrantXp(milestone.reward.value, `${milestone.emoji} ${milestone.stage} evolved! ${milestone.reward.label}`);
      } else {
        onGrantReward(milestone.reward.kind, milestone.reward.value);
      }
      retention.claimPetMilestone(milestone);
    },
```

> If `onGrantXp` / `onGrantReward` are not already destructured in App's render scope, reference them via the same source `StudentDashboardView` gets them from (search `onGrantReward={` in App.tsx to find the in-scope name).

- [ ] **Step 4: Type-check (expected to fail on the view until Task 8)**

Run: `npx tsc --noEmit`
Expected: errors ONLY in `GameModeSelectionView.tsx` (it doesn't accept the new props yet). No errors in `GameRoutes.tsx` or `App.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/views/GameRoutes.tsx src/App.tsx
git commit -m "feat(student): thread explorer-pet data into the mode picker"
```

---

## Task 8: Rewrite GameModeSelectionView to the island world

**Files:**
- Modify: `src/views/GameModeSelectionView.tsx`
- Test: `src/__tests__/GameModeSelectionView.islands.test.tsx`

- [ ] **Step 1: Write the failing render test**

```tsx
// src/__tests__/GameModeSelectionView.islands.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LanguageProvider } from "../hooks/useLanguage";
import type { AssignmentData, ProgressData } from "../core/supabase";
import { PET_MILESTONES } from "../constants/game";

// Mock the pet sprite so the test never pulls in canvas-confetti / lottie.
vi.mock("../components/arcade/TravelingPet", () => ({
  default: () => <div data-testid="pet" />,
}));
vi.mock("../components/dashboard/PetCompanion", () => ({
  default: () => null,
}));

import GameModeSelectionView from "../views/GameModeSelectionView";

const assignment = { id: "asg1", title: "Unit 3", allowedModes: ["flashcards", "classic", "fill-blank"] } as unknown as AssignmentData;

function renderView(progress: ProgressData[] = []) {
  return render(
    <LanguageProvider>
      <GameModeSelectionView
        activeAssignment={assignment}
        studentProgress={progress}
        isQuickPlayGuest={false}
        quickPlayCompletedModes={new Set()}
        setGameMode={vi.fn()}
        setShowModeSelection={vi.fn()}
        setShowModeIntro={vi.fn()}
        handleExitGame={vi.fn()}
        petDisplayName="Sam"
        petCurrentStage={PET_MILESTONES[0]}
        petNextStage={PET_MILESTONES[1]}
        petClaimableMilestone={null}
        onClaimPetMilestone={vi.fn()}
      />
    </LanguageProvider>,
  );
}

describe("GameModeSelectionView island world", () => {
  it("renders one island button per allowed mode plus the pet", () => {
    renderView();
    // 3 allowed modes → 3 island buttons (matched by their accessible names).
    expect(screen.getByRole("button", { name: /Flashcards/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Classic/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Fill/ })).toBeTruthy();
    expect(screen.getByTestId("pet")).toBeTruthy();
  });

  it("marks a completed mode's island as completed", () => {
    const progress = [{ assignmentId: "asg1", mode: "classic", score: 95 }] as unknown as ProgressData[];
    renderView(progress);
    expect(screen.getByRole("button", { name: /Classic — completed/ })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/GameModeSelectionView.islands.test.tsx`
Expected: FAIL — the view doesn't accept the new props / doesn't render island buttons yet.

- [ ] **Step 3: Rewrite the view**

Replace the entire contents of `src/views/GameModeSelectionView.tsx` with:

```tsx
import type React from "react";
import { useState } from "react";
import {
  BookOpen, Volume2, PenTool, Zap, Layers, Shuffle, Repeat, X, Brain, Edit3, Check,
} from "lucide-react";
import type { GameMode, PetMilestone } from "../constants/game";
import { MAX_ASSIGNMENT_ROUNDS } from "../constants/game";
import type { AssignmentData, ProgressData } from "../core/supabase";
import { DIFFICULTY_META, getModeDifficulty } from "../components/setup/types";
import { computeRoundsCompleted, sumPlayCountFromProgress } from "../hooks/useAssignmentPlays";
import { useLanguage } from "../hooks/useLanguage";
import type { Language } from "../hooks/useLanguage";
import { gameModesT, type GameModeId } from "../locales/student/game-modes";
import { ARCADE_BG, ARCADE_BUTTON_TOUCH } from "../components/arcade/theme";
import IslandMap, { type MapIsland } from "../components/arcade/IslandMap";
import IslandDetailSheet, { type IslandSheetMode } from "../components/arcade/IslandDetailSheet";
import type { IslandState } from "../components/arcade/ModeIsland";
import PetCompanion from "../components/dashboard/PetCompanion";

// Per-mode medallion gradient, keyed by the mode's colour token.
const MODE_GRADIENTS: Record<string, string> = {
  cyan: "from-cyan-400 to-blue-500", emerald: "from-emerald-400 to-teal-500",
  lime: "from-lime-400 to-green-500", blue: "from-blue-400 to-indigo-500",
  purple: "from-purple-400 to-violet-600", amber: "from-amber-400 to-orange-500",
  pink: "from-pink-400 to-rose-500", rose: "from-rose-400 to-pink-600",
  indigo: "from-indigo-400 to-violet-600", fuchsia: "from-fuchsia-400 to-purple-600",
  violet: "from-violet-400 to-purple-600", teal: "from-teal-400 to-cyan-500",
  red: "from-red-400 to-rose-600",
};

const QUEST_STRINGS: Record<Language, { modesDone: string; round: string }> = {
  en: { modesDone: "modes", round: "Round" },
  he: { modesDone: "מצבים", round: "סבב" },
  ar: { modesDone: "أوضاع", round: "جولة" },
  ru: { modesDone: "режимов", round: "Раунд" },
};

interface GameModeSelectionViewProps {
  activeAssignment: AssignmentData | null;
  studentProgress: ProgressData[];
  isQuickPlayGuest: boolean;
  quickPlayCompletedModes: Set<string>;
  setGameMode: (mode: GameMode) => void;
  setShowModeSelection: (v: boolean) => void;
  setShowModeIntro: (v: boolean) => void;
  handleExitGame: () => void;
  // Explorer pet
  petDisplayName: string;
  petCurrentStage: PetMilestone;
  petNextStage: PetMilestone | null;
  petClaimableMilestone: PetMilestone | null;
  onClaimPetMilestone: (milestone: PetMilestone) => void;
}

export default function GameModeSelectionView({
  activeAssignment, studentProgress, isQuickPlayGuest, quickPlayCompletedModes,
  setGameMode, setShowModeSelection, setShowModeIntro, handleExitGame,
  petDisplayName, petCurrentStage, petNextStage, petClaimableMilestone, onClaimPetMilestone,
}: GameModeSelectionViewProps) {
  const { language, dir, isRTL } = useLanguage();
  const t = gameModesT[language] ?? gameModesT.en;
  const qs = QUEST_STRINGS[language] ?? QUEST_STRINGS.en;

  const modesMeta: Array<{ id: GameMode; color: string; icon: React.ReactNode; isLearnMode?: boolean }> = [
    { id: "flashcards", color: "cyan", icon: <Layers size={22} />, isLearnMode: true },
    { id: "classic", color: "emerald", icon: <BookOpen size={20} /> },
    { id: "fill-blank", color: "lime", icon: <Edit3 size={20} /> },
    { id: "listening", color: "blue", icon: <Volume2 size={20} /> },
    { id: "spelling", color: "purple", icon: <PenTool size={20} /> },
    { id: "matching", color: "amber", icon: <Zap size={20} /> },
    { id: "memory-flip", color: "pink", icon: <Brain size={20} /> },
    { id: "true-false", color: "rose", icon: <Check size={20} /> },
    { id: "scramble", color: "indigo", icon: <Shuffle size={20} /> },
    { id: "reverse", color: "fuchsia", icon: <Repeat size={20} /> },
    { id: "letter-sounds", color: "violet", icon: <span className="text-lg">🔡</span> },
    { id: "sentence-builder", color: "teal", icon: <span className="text-lg">🧩</span> },
    { id: "speed-round", color: "red", icon: <span className="text-lg">⚡</span> },
  ];

  const modes = modesMeta.map((m) => ({
    ...m,
    name: t.modes[m.id as GameModeId].name,
    desc: t.modes[m.id as GameModeId].desc,
  }));

  const allowedModes = activeAssignment?.allowedModes || modes.map((m) => m.id);
  const filteredModes = modes.filter((m) => allowedModes.includes(m.id));
  const learnMode = modes.find((m) => m.isLearnMode && allowedModes.includes(m.id));
  const practiceModes = filteredModes.filter((m) => !m.isLearnMode);

  // --- Per-mode state (unchanged logic) ---
  const rowsFor = (id: string) =>
    studentProgress.filter((p) => p.assignmentId === activeAssignment?.id && p.mode === id);
  const isCompleted = (id: string) => rowsFor(id).length > 0;
  const isLocked = (id: string) => isQuickPlayGuest && quickPlayCompletedModes.has(id);
  const bestScore = (id: string) => {
    const rows = rowsFor(id);
    return rows.length ? Math.max(0, ...rows.map((r) => r.score ?? 0)) : null;
  };
  const masteryStars = (id: string) => {
    const best = bestScore(id);
    if (best == null) return 0;
    return best >= 90 ? 3 : best >= 60 ? 2 : 1;
  };

  // Ordered stops: learn island first, then practice modes.
  const stops = [learnMode, ...practiceModes].filter(Boolean) as typeof modes;

  // Recommended-next: first playable, not-completed stop; else weakest mastery.
  let recommendedId: GameMode | undefined = stops.find((m) => !isLocked(m.id) && !isCompleted(m.id))?.id;
  if (!recommendedId) {
    const playable = practiceModes.filter((m) => !isLocked(m.id));
    recommendedId = [...playable].sort((a, b) => masteryStars(a.id) - masteryStars(b.id))[0]?.id;
  }
  const recommendedIndex = Math.max(0, stops.findIndex((m) => m.id === recommendedId));

  // --- Round / progress pill (unchanged) ---
  const totalModes = practiceModes.length;
  const completedCount = practiceModes.filter((m) => isCompleted(m.id)).length;
  const totalPlays = activeAssignment ? sumPlayCountFromProgress(studentProgress, activeAssignment.id) : 0;
  const currentRound = Math.min(MAX_ASSIGNMENT_ROUNDS, computeRoundsCompleted(totalPlays, totalModes) + 1);
  const showRoundPill = Boolean(activeAssignment) && totalModes > 0;

  // --- Island view-model ---
  const islands: MapIsland[] = stops.map((m, i) => {
    const state: IslandState = isLocked(m.id)
      ? "locked"
      : i === recommendedIndex
        ? "next"
        : isCompleted(m.id)
          ? "done"
          : "todo";
    return {
      id: m.id, name: m.name, emoji: m.icon,
      gradient: MODE_GRADIENTS[m.color] ?? "from-violet-400 to-fuchsia-500",
      state, mastery: masteryStars(m.id),
    };
  });

  const launch = (id: GameMode) => {
    setGameMode(id);
    setShowModeSelection(false);
    setShowModeIntro(true);
  };

  // --- Sheet + pet card state ---
  const [sheetIndex, setSheetIndex] = useState<number | null>(null);
  const [petOpen, setPetOpen] = useState(false);

  const sheetMode: IslandSheetMode | null =
    sheetIndex != null && stops[sheetIndex]
      ? (() => {
          const m = stops[sheetIndex];
          const diff = DIFFICULTY_META[getModeDifficulty(m.id)];
          return {
            name: m.name, desc: m.desc, emoji: m.icon,
            gradient: MODE_GRADIENTS[m.color] ?? "from-violet-400 to-fuchsia-500",
            difficultyStars: diff.stars, difficultyLabel: diff.label,
            best: bestScore(m.id),
          };
        })()
      : null;

  return (
    <div dir={dir} className={`min-h-screen ${ARCADE_BG} relative overflow-hidden`}>
      {/* Night-ocean star layer — continuity with the game canvas. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40" style={{
        backgroundImage: [
          "radial-gradient(circle at 15% 12%, rgba(255,255,255,0.6) 0 1px, transparent 2px)",
          "radial-gradient(circle at 78% 22%, rgba(255,255,255,0.5) 0 1px, transparent 2px)",
          "radial-gradient(circle at 42% 58%, rgba(255,255,255,0.45) 0 1px, transparent 2px)",
          "radial-gradient(circle at 88% 75%, rgba(255,255,255,0.5) 0 1px, transparent 2px)",
        ].join(","),
      }} />

      {/* Fixed header — close + title + round pill. */}
      <header className={`sticky top-0 z-30 flex items-center gap-3 bg-violet-950/40 px-4 py-3 backdrop-blur-md ${isRTL ? "flex-row-reverse" : ""}`}>
        <button
          type="button" onClick={handleExitGame} aria-label={t.closeAria} title={t.closeAria}
          className={`${ARCADE_BUTTON_TOUCH} flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20`}
        >
          <X size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-black text-white">{t.chooseYourMode}</h1>
          {activeAssignment?.title && (
            <p className="truncate text-xs font-semibold text-white/60">{activeAssignment.title}</p>
          )}
        </div>
        {showRoundPill && (
          <span className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-center text-[11px] font-bold text-cyan-100 ring-1 ring-white/20">
            {completedCount}/{totalModes} {qs.modesDone}
            <span className="block text-[10px] text-white/60">{qs.round} {currentRound}/{MAX_ASSIGNMENT_ROUNDS}</span>
          </span>
        )}
      </header>

      {/* The island map. */}
      <div className="relative z-10 mx-auto max-w-xl px-2 pb-20">
        <IslandMap
          assignmentId={activeAssignment?.id ?? "none"}
          islands={islands}
          recommendedIndex={recommendedIndex}
          pet={{
            currentStage: petCurrentStage,
            nextStage: petNextStage,
            xp: 0, // sprite sizing only; the map pet is visual, not the XP source
            hasClaimable: !!petClaimableMilestone,
            displayName: petDisplayName,
          }}
          onTapIsland={(i) => setSheetIndex(i)}
          onTapPet={() => setPetOpen(true)}
        />
      </div>

      <IslandDetailSheet
        open={sheetIndex != null}
        mode={sheetMode}
        onClose={() => setSheetIndex(null)}
        onPlay={() => {
          if (sheetIndex != null && stops[sheetIndex]) launch(stops[sheetIndex].id);
        }}
        reduced={false}
      />

      <PetCompanion
        open={petOpen}
        onClose={() => setPetOpen(false)}
        xp={petCurrentStage.xpRequired}
        displayName={petDisplayName}
        currentStage={petCurrentStage}
        nextStage={petNextStage}
        claimableMilestone={petClaimableMilestone}
        onClaim={(m) => { onClaimPetMilestone(m); setPetOpen(false); }}
      />
    </div>
  );
}
```

> Note on the pet `xp`: `TravelingPet`/`CharacterStage` use `xp` only to size the sprite within its tier, and `PetCompanion` uses it for the progress bar. The real XP isn't threaded into this branch (it's not part of the picker's data), so we pass the current stage's floor (`petCurrentStage.xpRequired`) — the sprite renders at base size and the bar at 0% of the tier, which is acceptable for the picker. If exact XP is wanted later, thread `xp` through `GameRoutesDeps` (it already exists there as `xp`) and pass it in.

- [ ] **Step 4: Run the render test**

Run: `npx vitest run src/__tests__/GameModeSelectionView.islands.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Full type-check + test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/views/GameModeSelectionView.tsx src/__tests__/GameModeSelectionView.islands.test.tsx
git commit -m "feat(student): island-world mode picker with explorer pet"
```

---

## Task 9: Wire real XP into the picker pet (small follow-up)

The picker pet currently sizes off the stage floor. Thread the real `xp` so the sprite and `PetCompanion` bar are accurate.

**Files:**
- Modify: `src/views/GameRoutes.tsx`
- Modify: `src/App.tsx`
- Modify: `src/views/GameModeSelectionView.tsx`

- [ ] **Step 1: Pass `xp` to the view**

`xp` is already in `GameRoutesDeps`. In the `<GameModeSelectionView .../>` element in `GameRoutes.tsx`, add `petXp={xp}`. Add `petXp: number;` to the props interface in `GameModeSelectionView.tsx` and destructure it.

- [ ] **Step 2: Use it**

In `GameModeSelectionView.tsx`, replace `xp: 0,` in the `pet={{ ... }}` object with `xp: petXp,` and replace `xp={petCurrentStage.xpRequired}` on `<PetCompanion>` with `xp={petXp}`.

- [ ] **Step 3: Type-check + tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: pass. (Update the render test's props to include `petXp={150}` if tsc flags the missing prop.)

- [ ] **Step 4: Commit**

```bash
git add src/views/GameRoutes.tsx src/App.tsx src/views/GameModeSelectionView.tsx src/__tests__/GameModeSelectionView.islands.test.tsx
git commit -m "feat(student): use real XP for the picker pet"
```

---

## Task 10: Visual verification

**Files:** none (manual).

- [ ] **Step 1: Run the app**

Run: `npm run dev` and open a student account with an assignment.

- [ ] **Step 2: Walk the checklist**

- [ ] Tap **Play** → island map appears; islands match the assignment's allowed modes.
- [ ] Recommended-next island glows and the 🦊 sits on it.
- [ ] Tap an island → rich sheet rises (name, difficulty, best, 3★ target, +XP, Play). Play launches the correct mode intro.
- [ ] Finish a mode, return → the finished island shows the gold ring + Check; the 🦊 has walked to the new glowing island.
- [ ] Tap the 🦊 → `PetCompanion` card opens (and the Claim button works if a milestone is pending).
- [ ] Try assignments with ~3, ~6, and 13 allowed modes → no overlap, scroll works on a phone viewport.
- [ ] Quick-play guest: a completed mode shows the 🔒 locked island and won't open.
- [ ] Switch to Hebrew and Arabic → header, sheet, and labels read RTL.
- [ ] Enable OS "reduce motion" → pet snaps (no walk), no island pulse/ping.

- [ ] **Step 3: Commit any fixes found, then finish the branch**

Use `superpowers:finishing-a-development-branch` to open the PR.

---

## Self-review notes

- **Spec coverage:** scattered archipelago (Task 6 layout), free-roam states done/next/todo/locked (Task 8 view-model + Task 3 ModeIsland), explorer pet walk via sessionStorage (Tasks 2/4/6), rich tap sheet (Task 5), pet-tap opens PetCompanion (Tasks 7/8), reused round/mastery logic (Task 8), i18n en/he/ar/ru + RTL (Task 5 + view header), reduced-motion (all motion gated). Phase-2 home map explicitly excluded.
- **XP caveat** documented in Task 8 and resolved in Task 9 — no invented per-mode XP number; the sheet shows a label-only "+XP" chip per the approved mockup.
- **Type consistency:** `IslandState`, `MapIsland`, `IslandSheetMode`, `IslandPos`, `PetTravel` are each defined once and imported where used; `advancePetTravel`, `computeIslandPositions`, `mapHeight` names are consistent across tasks.
