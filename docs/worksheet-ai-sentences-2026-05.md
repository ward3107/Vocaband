# Worksheet AI Sentence Generation Feature

**Date:** 2026-05-02
**Commit:** `7b82018`
**Scope:** Worksheet view enhancement with AI-powered sentence generation

---

## Summary

Enhanced the Worksheet view with AI sentence generation capabilities for sentence-based worksheet types (specifically Fill in the Blank). Teachers can now generate contextually appropriate example sentences for their vocabulary words with a single click.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/views/WorksheetView.tsx` | Added AI state, generate button, API integration |
| `src/components/worksheet/Worksheet.tsx` | Added `aiSentences` prop, passed through to FillBlankSheet |
| `src/components/worksheet/sheets/FillBlankSheet.tsx` | Added `aiSentences` prop with fallback logic |

---

## Feature Details

### User Flow

1. Teacher selects "Fill in the Blank" sheet type
2. AI Sentence Generation card appears below sheet type picker
3. Teacher clicks "Generate Sentences" button
4. Sentences are generated and stored in component state
5. Preview updates with AI-generated sentences
6. Print includes AI sentences in both worksheet and answer key

### UI Components

**AI Generation Card:**
- Shows icon based on state: `Sparkles` (idle) → `Loader2` (generating) → `Check` (success)
- Displays status text: "Generating..." / "N sentences generated"
- Button: "Generate Sentences" → "Generating..." → "Regenerate"
- Disabled when: AI unavailable, already generating, or no words selected

### API Integration

**Check AI Availability:**
```typescript
GET /api/features
Authorization: Bearer {token}
→ { aiSentences: true | false }
```

**Generate Sentences:**
```typescript
POST /api/generate-sentences
Authorization: Bearer {token}
Body: { words: string[], difficulty: 2 }
→ { sentences: string[] }
```

### State Management

```typescript
const [aiSentences, setAiSentences] = useState<Record<number, string>>({});
const [isGeneratingSentences, setIsGeneratingSentences] = useState(false);
const [aiEnabled, setAiEnabled] = useState(false);
```

- Sentences keyed by word ID for O(1) lookup
- Cleared when word source changes (`useEffect` on `sourceIdx`)
- AI availability checked once on mount

---

## Code Patterns

### Fallback Hierarchy (FillBlankSheet)

```typescript
const raw = aiSentences?.[w.id] ?? w.sentence ?? w.example;
```

Priority:
1. AI-generated sentence (if available)
2. Word's stored `sentence` field
3. Word's stored `example` field
4. Generic "Write a sentence using ____" prompt

### Derivation Order

Important: Functions that reference derived values must be defined **after** those values:

```typescript
// ✅ Correct order
const source = effectiveSources[sourceIdx];
const wordsForSheet = source?.words ?? [];

const generateSentences = async () => {
  // Can safely use wordsForSheet here
};
```

---

## Worksheet Types Configuration

```typescript
const SHEET_TYPES = [
  { id: 'word-list',  needsSentences: false },
  { id: 'scramble',   needsSentences: false },
  { id: 'fill-blank', needsSentences: true },   // ← AI button shows
  { id: 'match-up',   needsSentences: false },
];
```

The AI button condition:
```tsx
{sheetType !== 'word-list' && sheetType !== 'scramble' && sheetType !== 'match-up' && (
  // AI generation card
)}
```

---

## Related Commits

This session included several related changes:

| Commit | Description |
|--------|-------------|
| `d35c05b` | Move AI Lesson Builder to ConfigureStep, remove Phase 2 |
| `4ce1331` | Add tab toggle UI for Game Modes vs AI Text Generator |
| `50f8c40` | Fix centering of option cards grid |
| `912131a` | Hide AI Text Generator from Quick Play mode |
| `7b82018` | **Add AI sentence generation to Worksheet** |

---

## Future Enhancements

Potential improvements:
- Add more worksheet types (Sentence Builder, Word Search, etc.)
- Persist AI-generated sentences to database
- Allow manual editing of AI sentences before printing
- Add sentence difficulty selector
- Bulk regenerate for all sentence-based sheets
