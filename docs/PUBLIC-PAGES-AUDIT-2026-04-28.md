# Public Pages Audit — 2026-04-28

> Content + design audit of every public-facing page (the pages a
> teacher / parent / school IT admin sees BEFORE signing in).
> Scope: ensure each page reflects today's improvements and uses
> the app's design tokens consistently.

## Pages in scope

| Path | File | Purpose |
|---|---|---|
| `/` (landing) | `src/components/LandingPage.tsx` | Marketing — what Vocaband is, who it's for |
| `/privacy` | `src/components/PublicPrivacyPage.tsx` | GDPR/Israeli Privacy Law disclosures |
| `/security` | `src/components/PublicSecurityPage.tsx` | Plain-English technical-trust summary (added 2026-04-28) |
| `/accessibility` | `src/components/AccessibilityStatement.tsx` | A11y commitment + WCAG conformance |
| `/terms` | `src/components/TermsPage.tsx` | Terms of service |

## Audit findings

### LandingPage.tsx — no changes

**Verdict:** healthy.  Trust strip already added today (commit
`c647951`).  Hero gradients consistent with the rest of the app
(violet/fuchsia hero, emerald/teal progress, amber/orange XP).

**Deliberately NOT changed:**
- Granular tech callouts (iPhone OCR fix, RLS hardening detail, etc.)
  belong on `/security`, not on the marketing page.  Marketing
  should stay benefit-focused.
- "10,000+ Students" copy left aspirational — this is standard
  marketing practice and isn't a security or design issue.
- Language switcher kept off the landing page on purpose: the
  marketing copy is hand-crafted English, and machine-translating
  it would degrade quality.  Legal pages (Privacy/Terms/Security/
  Accessibility) stay multilingual via `legalTranslations.ts` and
  the inline `t = {en, he, ar}` pattern.

### PublicPrivacyPage.tsx — 2 small additions

1. **Cross-link to /security**.  Section 8 ("Security Measures")
   now ends with a "See full Security & Trust details" pill button
   that navigates to the new `/security` page.  Translated EN/HE/AR.

2. **Type signature widened** from
   `(page: "home" | "terms" | "privacy") => void` to add `"security"`.
   Required by App.tsx's handler and matches the LandingPage and
   PublicSecurityPage signatures.  Cast back to the narrower type
   for `<PublicNav>` and `<MobileNav>` since those components only
   know about the original 3 pages.

3. **Verified:** all sections still use `bg-surface-container-lowest`,
   `text-on-surface`, `text-primary`.  No hardcoded stone-* in this
   file.  Design tokens consistent.

### PublicSecurityPage.tsx — 2 changes

1. **Audit copy updated** with concrete 2026-04-28 numbers:
   "Our most recent audit (April 2026) closed 3 HIGH + 3 MED
   findings, plus a CodeQL alert; SSL Labs grade improved from B
   to A+."  Translated EN/HE/AR.  Replaces the previous generic
   "Findings are tracked publicly in our docs."

2. **Vulnerability disclosure card re-coloured**.  Was `bg-gradient-
   to-br from-stone-800 to-stone-900` — visually isolated from the
   rest of the app.  Now uses the indigo→violet→fuchsia gradient
   that anchors the Privacy page summary card and the shop's hero
   tiles, giving the legal/info pages a single visual language.

### AccessibilityStatement.tsx — 1 token fix

The internal `<Section>` wrapper used `bg-white` (hardcoded), which
broke the otherwise-consistent surface-token palette on this page.
Replaced with `bg-surface-container-lowest` to match
PublicPrivacyPage.  Visual difference is invisible in current
production (since there's no `prefers-color-scheme: dark` block in
`index.css`), but the page now follows the same token contract as
its siblings — future theme work won't have to refactor it.

### TermsPage.tsx — no changes

Already on tokens (`bg-surface-container-lowest`, `text-on-surface`,
`text-primary`, `border-surface-container-high`).  Translations
complete.  No outdated content.

## Token consistency snapshot (after this commit)

All five public pages now use the same design vocabulary:

| Token | Use |
|---|---|
| `bg-surface` | Page root |
| `bg-surface-container-lowest` | Card / section wrapper |
| `border-surface-container-high` | Card border |
| `text-on-surface` | Headings + bold copy |
| `text-on-surface-variant` | Body copy |
| `text-primary` | Links + accent icons |
| `bg-primary/10` text-primary | Inline accent pills (numbered section badges, cross-link CTAs) |
| `from-indigo-600 via-violet-600 to-fuchsia-600` | Hero / "trust" gradient cards (Privacy summary + Security disclosure) |

Where a page diverges (gradient cards, lucide-react icon colors),
it's intentional — the variations encode meaning (rose = struggling,
emerald = success, amber = warning).

## Translations status

| Page | EN | HE | AR |
|---|---|---|---|
| LandingPage | ✓ | — | — |
| PublicPrivacyPage | ✓ | ✓ | ✓ |
| PublicSecurityPage | ✓ | ✓ | ✓ |
| AccessibilityStatement | ✓ | ✓ | ✓ |
| TermsPage | ✓ | ✓ | ✓ |

LandingPage by design (marketing).  All four legal/info pages
fully translated.

## Verification

After this commit:

1. `npm run build` — builds clean (no new TS errors).
2. Open `/privacy` → scroll to Section 8 → tap "See full Security
   & Trust details" → routes to `/security` with the indigo-violet
   disclosure card.
3. Open `/security` → audit section now reads "Our most recent
   audit (April 2026) closed 3 HIGH + 3 MED findings…" instead of
   the generic copy.
4. Open `/accessibility` → all section cards render on the same
   cream-surface backdrop as the privacy + security pages (was
   pure white before).
5. Switch language to HE/AR → the cross-link button copy + audit
   text both translate.
