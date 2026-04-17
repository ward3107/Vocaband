# Vocab cleanup pipeline

Four-phase cleanup for `src/data/vocabulary.ts`. Each phase writes to `tmp/`
— **nothing touches the real vocabulary file** until you manually promote
the output.

## Quick start

```powershell
cd C:\Users\Waseem\Vocaband

# Phase 1: strip POS tags + parenthetical content
npx tsx scripts/vocab-cleanup/01-strip-parens.ts

# Phase 2: deduplicate
npx tsx scripts/vocab-cleanup/02-dedupe.ts

# Phase 3: expand phrases (keep phrases + add standalone content words)
#   — uses Gemini to translate the new words (needs GOOGLE_AI_API_KEY in .env.local)
npx tsx scripts/vocab-cleanup/03-expand-phrases.ts

# Phase 4: review all translations with Gemini (flags mismatches)
npx tsx scripts/vocab-cleanup/04-review-translations.ts
```

Each phase reads the previous phase's output. Skip any phase if you don't
need it — phase 4 falls back to the latest available output.

## Files written

| File | Purpose |
|---|---|
| `tmp/vocabulary-01-cleaned.ts` | After phase 1 |
| `tmp/vocabulary-02-deduped.ts` | After phase 2 |
| `tmp/vocabulary-03-expanded.ts` | After phase 3 |
| `tmp/translation-issues.csv` | After phase 4 — open in Excel |
| `tmp/report-0X-*.txt` | Human-readable report per phase |

## Reviewing the output

**After phases 1-3**, open the `.ts` file in Cursor and spot-check a few
entries. Read `report-0X-*.txt` for a summary.

**After phase 4**, open `tmp/translation-issues.csv` in Excel:
1. Add a filter (Data → Filter)
2. Filter `hebrew_ok` column to `FALSE` OR `arabic_ok` column to `FALSE`
3. You'll see only the flagged rows — maybe 50-200 out of 9000
4. For each, decide: keep yours, accept Gemini's suggestion, or write your own
5. Apply the chosen fixes back to the vocabulary file

## Promoting the cleaned file to production

When you're satisfied with `tmp/vocabulary-03-expanded.ts`:

1. **Back up the original:**
   ```powershell
   Copy-Item src\data\vocabulary.ts src\data\vocabulary.backup.ts
   ```
2. **Move the cleaned file into place:**
   ```powershell
   Move-Item tmp\vocabulary-03-expanded.ts src\data\vocabulary.ts -Force
   ```
3. **Fix the import path in the new file.** The tmp files import
   `Word` from `'../src/data/vocabulary'` — once moved to `src/data/`, change
   that import to `export interface Word { ... }` OR just `import type { Word } from './vocabulary'` — adjust for the new location.
4. **Regenerate audio for NEW entries only:**
   ```powershell
   npx tsx scripts/generate-audio.ts
   npx tsx scripts/upload-audio.ts
   ```
   The `generate-audio.ts` script is idempotent — skips existing MP3s,
   only generates new ones.
5. **Commit:**
   ```powershell
   git add src/data/vocabulary.ts src/data/vocabulary.backup.ts
   git commit -m "cleanup: vocab phase 1-3 applied"
   git push
   ```

## Cost estimates

- Phase 1 + 2: free (no API calls)
- Phase 3: ~$0.01–0.05 (translates a few hundred new words via Gemini)
- Phase 4: ~$0.30–0.80 (reviews all 9K translations via Gemini Flash)
- New-word audio after promoting: free if you're still inside the Studio
  voice monthly quota (100K chars / month)

## Safety notes

- **IDs are preserved** through phases 1-3. Student progress records
  referencing old IDs keep working as long as the words still exist.
- **Phase 2 drops duplicate IDs.** The `dropped IDs` list is in the
  phase 2 report — if any students have progress records tied to a
  dropped ID, you'd need to manually migrate those to the kept ID. In
  practice, a duplicate English word has the same meaning, so progress
  for the dropped ID represents the same learning as the kept one —
  minor data loss worst case.
- **Phase 3 assigns new IDs by incrementing from the max** — no collisions.
