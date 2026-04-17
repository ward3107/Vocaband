# Assignment Creation UI — Redesign Proposal

## Current Issues Summary

| Element | Issue | Impact |
|---------|-------|--------|
| Difficulty dots (w-2 h-2) | Too small (8px) | Hard to see, can't tap |
| Checkmark badges | Negative positioning | Can be cut off on small screens |
| Stepper "Optional" label | 10px text | Barely readable |
| Sentence tooltips | No boundary checks | Overflows on mobile |

---

## Proposed Redesign

### Option A: Clean & Minimal
**Philosophy:** Larger touch targets, more breathing room, higher contrast

**Changes:**
1. Difficulty dots → 12px circular swatches with labels inline
2. Checkmark badges → Larger, safer positioning with shadow depth
3. Stepper → Bolder typography, step labels below circles
4. Color consistency → Use existing gradient palette

### Option B: Card-Based
**Philosophy:** Each mode is a "big card" like shop redesign

**Changes:**
1. Game modes → Larger cards (3-4 per row max)
2. Difficulty → Full-width pill badges
3. Stepper → Card-style progress indicator
4. More prominent icons/emoji

### Option C: Interactive & Playful
**Philosophy:** Celebrate the game aspect with animations

**Changes:**
1. Selected modes → Confetti burst on selection
2. Difficulty → Animated progress bar style
3. Stepper → Animated path fill
4. Haptic feedback on mobile

---

## Detailed Component Proposals

### 1. Difficulty Legend (Currently: tiny dots)

**Current:**
```tsx
<div className="flex items-center gap-1">
  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
  <span>Beginner</span>
</div>
```

**Proposed:**
```tsx
<div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
  <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></div>
  <span className="text-xs font-bold text-emerald-800">Beginner</span>
</div>
```

**Benefits:**
- 3x larger dot (12px vs 8px)
- Colored background for better contrast
- Pill shape matches design system
- Touch-friendly (44px min height)

### 2. Game Mode Checkmark Badge

**Current positioning issue:**
```tsx
className="absolute -top-1.5 -right-1.5 w-6 h-6"
```

**Proposed safer positioning:**
```tsx
className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-lg border-3 border-primary z-10"
```

**Benefits:**
- Positive margins prevent overflow
- Thicker border (border-3) for visibility
- z-index ensures layering

### 3. Stepper Enhancement

**Proposed additions:**
```tsx
<div className="flex flex-col items-center">
  <div className="relative">
    <div className={/* step circle styles */}>
      {isCompleted ? '✓' : step}
    </div>
    {/* Step label BELOW circle for clarity */}
    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-bold text-stone-500 whitespace-nowrap">
      {stepLabels[stepNum]}
    </span>
  </div>
</div>
```

### 4. Color Scheme Alignment

Match existing gradients:
- **Beginner** → emerald-teal (existing)
- **Intermediate** → indigo-violet (existing)
- **Advanced** → amber-orange (existing)
- **Mastery** → rose-fuchsia (existing)

---

## Visual Mockup Description

### Before vs After

**BEFORE:**
- 5-column grid, cramped
- 8px dots, hard to see
- Checkmarks can clip
- Tiny 10px labels

**AFTER (Option A - Clean Minimal):**
- 4-column max (lg:grid-cols-4)
- 12px dots in pill badges with labels
- Safe checkmark positioning
- Readable 11-12px text

**AFTER (Option B - Card Based):**
- 3-column grid, big touch targets
- Full-width difficulty cards
- Card-style stepper
- More prominent emoji (4xl)

---

## Responsive Considerations

| Breakpoint | Grid Columns | Dot Size | Checkmark Size |
|------------|--------------|----------|----------------|
| Mobile (< 640px) | 2 | 12px | 24px |
| Tablet (640-1024px) | 3 | 12px | 28px |
| Desktop (> 1024px) | 4 (Option A) / 3 (Option B) | 12px | 28px |

---

## Implementation Priority

1. **High Impact, Low Risk:**
   - Fix difficulty dots (lines 382-398)
   - Fix checkmark positioning (line 359)

2. **Medium Impact:**
   - Add step labels to stepper
   - Improve sentence tooltip boundaries

3. **Polish:**
   - Add entrance animations
   - Consistent padding/margins

---

## Questions for Decision

1. **Grid density:** Do you prefer 4 modes per row (more compact) or 3 per row (bigger cards)?
2. **Difficulty display:** Inline pills (horizontal) or stacked pills (vertical)?
3. **Animation level:** Subtle transitions or full bounce/scale effects?
4. **Color treatment:** Keep existing gradients or simplify to flat colors with shadows?
