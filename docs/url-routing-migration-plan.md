# URL routing migration plan (Fix 2)

> Goal: make the **browser URL the single source of truth** for the current
> screen, across the whole app — so every page is bookmarkable, shareable,
> refresh-stable, and the address bar always matches what's on screen.
>
> Strategy: ship it in **safe slices**, smallest-blast-radius first. The
> riskiest pieces (the kid-safety back-button trap, the auth-restore flow)
> are isolated into their own late slices with explicit human sign-off and
> real-phone testing — never bundled with mechanical edits.

---

## Why the app isn't already like this

Vocaband grew from a single-screen word game. Navigation was added as a
React state variable (`view: View` in `useAppController.ts`), and the
"routers" (`AppViewRouter.tsx`, `*Routes.tsx`) just switch on that string.
The URL was never wired in. Two systems now actively depend on the URL
*not* driving navigation:

1. **`useBackButtonTrap.ts`** — deliberately keeps the mobile/PWA back
   button from ever leaving the app or logging a student out mid-game
   (20 padding history entries, a dashboard "floor", popstate re-trapping).
   It pushes history entries **without a URL**, so the address bar freezes.
2. **`useAuthRestore.ts`** (PROTECTED) — on load it *force-routes* logged-in
   users to their dashboard, ignoring the URL.

Real URLs were added piecemeal only where there was clear value:
`/student`, `/teacher`, `?class=`, `?session=`, `/w/<slug>`, `/privacy`,
`/terms`. Everything else stayed state-only.

## Agreed back-button behavior (role-aware)

Decided with the product owner (2026-06-13):

- **Everyone** gets real, bookmarkable, refresh-stable URLs.
- **Students (kids 9–14):** keep the safety guard. Back can **never** log
  them out or drop them out of a game by accident.
- **Teachers:** Back walks naturally between dashboard screens via real
  URLs (dashboard → class → assignment); only at the dashboard "home" does
  it ask before leaving, and it **never** auto-logs-out.

## Infra note (already in our favor)

`wrangler.jsonc` sets `not_found_handling: "single-page-application"`, so the
Cloudflare Worker already serves `index.html` (HTTP 200) for any unknown
path. **New client-side routes need no Worker change to survive a refresh.**
(SEO `?lang=` edge-localization only covers `/`, `/student`,
`/accessibility-statement` — new public paths render English metadata, which
is acceptable and not a regression.)

---

## Slices

### Slice 1 — Public marketing pages ✅ DONE
Give the landing-reachable public pages real paths. No protected files, no
back-trap interaction.
- `PUBLIC_PAGE_PATH` added (`src/utils/publicNavigation.ts`).
- `/security`, `/free-resources`, `/status` path→view rules added
  (`src/utils/resolveInitialView.ts`); `/terms`, `/privacy`,
  `/accessibility-statement` already existed.
- `handlePublicNavigate` now pushes the page's real URL
  (`src/hooks/useAppController.ts`), mirroring `navigateToStudentLogin`.
- Tests: round-trip coverage in `src/__tests__/studentShell.test.tsx`.

### Slice 2 — Central view ⇄ path registry ✅ DONE
One source of truth mapping View ⇄ path, replacing the scattered string
checks in `resolveInitialView`.
- `src/utils/routes.ts` — `VIEW_PATH` + `pathForView` / `viewForPath`. Kept
  in `src/utils` (NOT `src/core`) so it stays out of the protected zone — no
  sign-off needed.
- `resolveInitialView` resolves static public paths via `viewForPath` (the
  per-path `if` ladder is gone); parametric / conditional routes (`?session`,
  `?class`, `/w/`, the shell remaps of `/student` & `/teacher`) stay
  imperative — a static table can't express them.
- `PUBLIC_PAGE_PATH` removed from `publicNavigation.ts`;
  `handlePublicNavigate` now reads `pathForView`. One source of truth.
- Pure refactor, no behavior change. Tests: registry round-trip +
  path→view resolution in `studentShell.test.tsx`.

### Slice 3 — "Landable" authenticated views (IN PROGRESS)
Views that need only data the auth flow already loads (no transient
in-memory object). It splits into two halves:
  - **READ (URL → view on fresh load / deep link)** — add the view to the
    `VIEW_PATH` registry; `resolveInitialView` resolves it, gated behind
    `hasRestorableSession()` so a logged-OUT deep link falls through to the
    landing instead of a dataless screen. Auth-restore already KEEPS these
    views via `shouldPreserveView`'s keep-sets (`authViews.ts`) — **no
    protected file touched.** ✅ This is what Slice 3 ships.
  - **PUSH (view → URL as you navigate in-app)** — requires
    `useBackButtonTrap` to push the path on a view change. That's the
    safety-critical trap, so it's **deferred to Slice 5** (real-phone
    tested). Until then the URL reflects these views on a deep-link /
    refresh, but not after in-app navigation.
- ✅ DONE (8 views): student — `shop` → `/shop`, `global-leaderboard` →
  `/leaderboard`, `privacy-settings` → `/privacy-settings`; teacher —
  `vocabulary-library` → `/vocabulary-library`, `vocabagrut` → `/vocabagrut`;
  admin/manager — `developer-dashboard` → `/developer`, `admin-security` →
  `/admin-security`, `manager-dashboard` → `/manager`. Coverage: registry
  round-trip + logged-in/out gating (`studentShell.test.tsx`) and deep-link
  e2e (`landable-views.auth.spec.ts`, 8 views × 2 viewports). The harness
  gained `adminPage` / `managerPage` fixtures (`auth.fixture.ts` +
  `supabase-mock.ts` admin/manager scenarios).
- Remaining candidates: `voca-picker` (transient routing state, low value),
  `vocahebrew-*` (gated by Voca entitlement), `student-practice` /
  `student-daily` (not in `shouldPreserveView` yet — would need an
  `authViews.ts` keep-set entry). The dashboards (`teacher-dashboard` /
  `student-dashboard`) are role-dependent and entangled with auth-restore's
  default destination → handle in Slice 6.

### Slice 4 — Stateful sub-views (the real work)
Views that today rely on transient state and are bounced by `useViewGuards`
when it's missing. Each needs a URL param + a re-hydration path (re-fetch
the object from the id in the URL — or find it in an already-loaded array),
**or** an explicit decision to keep the guard-bounce (not deep-linkable).

- ✅ STARTED — `class-show` re-hydrates from `?assignmentId=<id>`
  (`useClassShowDeepLink.ts`): the projector restores its assignment from the
  teacher's already-loaded `teacherAssignments` (no new fetch). READ side
  only — wiring the reverse (view → URL on in-app nav) lands with the
  back-trap rework in Slice 5, the same split used in Slice 3. e2e:
  `rehydrate.auth.spec.ts`. `worksheet` is the next copy-paste (same shape).
- `create-assignment` → `?classId=` → reload class (`useViewGuards.ts:118`)
- `game` → needs `activeAssignment` (`useViewGuards.ts:81`)
- `live-challenge`, `live-challenge-class-select` → need `selectedClass`
- `class-show`, `worksheet` → need an assignment object
- `quick-play-setup`, `quick-play-teacher-monitor` → need QP session/words
- `vocabulary-collection`, `vocabulary-set-detail`, `vocabulary-set-builder`
  → `?id=`
- `hot-seat`, `wheel`, `analytics`, `gradebook`, `students`,
  `worksheet-attempts` → need a class/assignment context — validate each
- Already URL-driven (reuse the pattern): `quick-play-student`,
  `category-race-*`, `speed-round-*`, `word-hunt-arena-*` via `?session=`.

Do this per-view, smallest first. Each view ships independently.

### Slice 5 — Reconcile the back-button trap (SAFETY-CRITICAL)
Re-express `useBackButtonTrap.ts` so it cooperates with real URLs while
preserving the role-aware guarantees above. This is the highest-risk slice.
- Not protected by glob, but treat as protected: **real-phone testing**
  (Android Chrome edge-swipe, iOS PWA) is mandatory — the existing behavior
  is device-specific and not covered by CI.
- ✅ DONE — the authenticated e2e harness is up (`playwright.auth.config.ts`
  + `auth.fixture.ts` + `back-button.auth.spec.ts`), pinning the
  dashboard-floor guarantees BEFORE the trap is touched. Public net
  (`url-routing.spec.ts`) also exists. Still TODO before the trap rework:
  extend the matrix with in-app back BETWEEN authenticated views (CASE C)
  as those views gain URLs in Slices 3–4, and wire `test:e2e:auth` into CI.
- The trap rework itself + mandatory **real-phone testing** (Android
  edge-swipe, iOS PWA) remain the body of this slice.

### Slice 6 — Auth restore respects the URL (PROTECTED)
`useAuthRestore.ts` should hydrate to the URL's view instead of forcing the
dashboard (still falling back to dashboard for non-landable URLs).
- **PROTECTED zone — explicit per-file sign-off required.** A regression
  here locks every teacher and student out.
- Ship last, behind a thorough auth e2e pass.

---

## Files that will need protected-zone sign-off
- `src/core/` — if the route registry lives there (Slice 2).
- `src/hooks/useAuthRestore.ts` — Slice 6.
- `src/hooks/useBackButtonTrap.ts` — not glob-protected, but safety-critical
  (Slice 5); treat as protected.

## Testing strategy
- Unit: view⇄path round-trip (every `View` with a path resolves back) —
  `src/__tests__/studentShell.test.tsx`.
- e2e (Playwright): PUBLIC deep-link + refresh matrix —
  `e2e/tests/url-routing.spec.ts` ✅ added. Asserts every public path is
  deep-linkable and refresh-stable and routes to the right (non-landing)
  view. In-app click → pushState (address-bar-tracks-the-page) is NOT
  covered: the e2e preview build (`VITE_SUPABASE_URL=""`) renders public
  pages in a degraded/config-error mode where SPA history state isn't
  seeded, so click-driven push/pop can't be asserted there — deferred to
  the Slice-5 authenticated harness.
- e2e (authenticated): ✅ harness stood up — `e2e/playwright.auth.config.ts`
  builds a bundle pointed at the mock Supabase URL (the default build falls
  back to *production* when the env is empty, so the mock never intercepts),
  `e2e/fixtures/auth.fixture.ts` seeds a logged-in student/teacher session,
  and `e2e/tests/back-button.auth.spec.ts` asserts the dashboard-floor
  guarantees (session restores to the dashboard; Back never logs the user
  out or bounces them to landing/login). Run: `npm run test:e2e:auth`.
  NOT yet wired into CI (that needs a `.github/` workflow change — owner
  sign-off); opt-in for now, like the WebKit project.
- Manual: real-phone back-button + PWA checklist for Slice 5.

## Rollback
Each slice is independently revertable. Slices 5–6 ship behind their own PRs
so a back-button or auth regression can be reverted without losing the URL
work from earlier slices.
