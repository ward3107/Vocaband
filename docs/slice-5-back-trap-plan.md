# Slice 5 — Reconcile the back-button trap with real URLs

> **Status:** **Implemented behind a build-time flag** (`URL_ROUTING_PUSH`,
> `src/utils/urlRouting.ts`) — **OFF in prod, so it ships dark**. The trap
> attaches the canonical path on in-app navigation (§3A), and the parametric
> sub-views push their `?id=` URL from their nav handlers (§3B). Only the
> **mandatory real-device QA** remains before the flag is enabled in production.
> This slice edits a **safety-critical, treat-as-protected** file
> (`src/hooks/useBackButtonTrap.ts`) and **cannot be fully validated in CI** —
> Android Chrome edge-swipe + iOS PWA testing is required before flipping the
> flag on (see §6).
>
> **Done (flag-gated, merged-safe):**
> - `URL_ROUTING_PUSH` build flag; the auth e2e build sets it ON.
> - §3A — trap view-change push attaches `pathForView(view)` for non-parametric
>   authed views; path-less views pass `undefined` (unchanged URL).
> - §3B — `class-show` / `worksheet` (`TeacherDashboardSection`) and
>   `create-assignment` (`startAssignClassFlow`) push their `?id=` URL before
>   `setView`; the trap skips its own push (state.view already matches). These
>   are the parametric views the trap deliberately leaves alone.
> - e2e: `url-push.auth.spec.ts` (in-app nav → URL + refresh-stable); the floor
>   net (`back-button.auth.spec.ts`) re-runs **with the flag ON** → no regression
>   (32/32). Note: the §3B teacher-nav push is logic-verified + regression-safe
>   but not click-driven in e2e (the teacher action cards are awkward to drive);
>   the real-device checklist covers it.
>
> **Still TODO:** the real-device checklist (§6), then flip the flag on + remove it.

Parent: [`url-routing-migration-plan.md`](./url-routing-migration-plan.md) (Fix 2).

---

## 1. Where we are (Slices 1–4 shipped the READ side)

The URL → view direction is done and merged:

- **`resolveInitialView`** maps a path/param to the initial `view` (gated by
  `hasRestorableSession()` for authed views).
- **`shouldPreserveView`** (`authViews.ts`) keeps that view through
  auth-restore instead of forcing the dashboard.
- **Re-hydration** restores transient state from the URL:
  `useAssignmentViewDeepLink` (`class-show`/`worksheet` ← `?assignmentId=`) and
  `useViewGuards` Guard 4 (`create-assignment` ← `?classId=`).

So a **deep-link / hard refresh** of a real URL already lands correctly.

## 2. The one remaining gap — the PUSH side (view → URL)

`useBackButtonTrap`'s view-change effect pushes history **without a URL**:

```ts
// useBackButtonTrap.ts — view-change effect (today)
window.history.pushState({ view }, '');   // 3rd arg (url) omitted → address bar frozen
```

Consequence: when a logged-in user navigates **in-app** (dashboard → shop →
class-show), the address bar stays stale. A refresh then re-resolves the stale
URL and `useAuthRestore` drops them on the dashboard — so the Slice 1–4
re-hydration only pays off for externally-shared links, not for in-app nav +
refresh. Closing this is Slice 5.

> The reverse direction was deliberately deferred here because the trap owns
> the mobile/PWA back-button **kid-safety floor** (20 padding entries, the
> dashboard floor, popstate re-trapping, role-aware double-back). Touching its
> history writes is the highest-risk change in the migration.

## 3. Recommended approach — extend, don't rewrite

**Do NOT** replace the trap with a router (react-router etc.). The floor +
pad + popstate logic is bespoke, device-tuned, and the only thing standing
between a 9-year-old mashing Back and an accidental logout. A rewrite's blast
radius is unacceptable for a feature CI can't fully test.

**Instead**, make the trap's existing pushes carry the canonical URL, and reuse
the **proven Slice 1 handler-push pattern** (`handlePublicNavigate`) for the
parametric routes. Three small, additive changes:

### A. `useBackButtonTrap.ts` — attach the URL to the view-change push

```ts
import { pathForView } from '../utils/routes';
// ...
// view-change effect — was: pushState({ view }, '')
const url = pathForView(view) ?? undefined;   // undefined ⇒ URL unchanged (today's behavior)
window.history.pushState({ view }, '', url);
```

- Views **with** a registry path (shop, leaderboard, class-show, …) now update
  the address bar on in-app nav.
- Views **without** one (`game`, live views, the dashboards) pass `undefined`
  → URL unchanged → byte-for-byte today's behavior. Zero regression there.
- `pushDashboardTrap` keeps its pad/floor entries; the **dashboard floor URL is
  intentionally left as-is** (the dashboards have no registry path yet — giving
  them one is Slice 6, tied to auth-restore). The pads can stay URL-less.

### B. Parametric routes — push the URL+param in the nav handler (Slice 1 pattern)

The trap only knows `view`, not the assignment/class id. So the handlers that
set the transient object push the full URL **before** `setView`, and the trap's
existing `if (currentStateView === view) return;` guard skips its own push (no
double entry). Handlers to update (all in teacher-dashboard wiring, **not** the
trap):

| Handler | File | Push |
|---|---|---|
| `onProjectAssignmentToClass` | `TeacherDashboardSection.tsx` | `/class-show?assignmentId=<a.id>` |
| `onPrintAssignmentWorksheet` | `TeacherDashboardSection.tsx` | `/worksheet?assignmentId=<a.id>` |
| `startAssignClassFlow` | `handlers/teacherDashboardActions.ts` | `/create-assignment?classId=<c.id>` |

Mirror `handlePublicNavigate` exactly: `history.pushState({ view }, '', url)`
then `setView(view)`. (A tiny `navigateToAuthedView(view, params)` helper in
`src/utils/` would DRY these — optional.)

### C. Back / forward (popstate) — already correct

On Back, the browser restores the previous entry's URL itself; the trap's
**CASE C** then `setView(prevView)`. The re-hydration effects (2A) fire from the
now-active URL params, so walking back/forward through `class-show?assignmentId=…`
restores state. **No new code in CASE C.** The floor (CASE A) and login-block
(CASE B) are untouched.

## 4. Invariants that MUST NOT change (kid-safety)

These are state-based, not URL-based, so 3A/3B leave them intact — but every one
must be **re-verified on real devices**:

1. Back at the dashboard **floor** → exit-confirm modal, **never** an immediate
   logout or app exit.
2. **Students**: second Back at the floor = "Stay" (no signout). Only the
   explicit "Switch class" affordance leaves.
3. **20 padding entries** + aggressive re-trap survive Android edge-swipe
   chain-pops without escaping to `accounts.google.com` / Supabase callback.
4. Logout refills the pad buffer (the `user → null` effect).
5. A logged-out user can't Back into a pre-logout private view.

## 5. Ship behind a feature flag

Gate the URL push (3A + 3B) behind a flag (`useFeatureFlag('url_push')` or a
build-time `VITE_*`) so it can ship **dark**, be enabled for device QA, and be
killed instantly if a device regression appears — without a revert/redeploy.
Remove the flag once it's been stable on real devices.

## 6. Test plan

### Automated — extend the existing auth e2e harness
`e2e/playwright.auth.config.ts` + `back-button.auth.spec.ts` already pin the
floor. Add to the authed matrix:
- In-app nav (dashboard → shop → class-show) **updates `page.url()`** at each step.
- **Back** from an authed sub-view returns to the previous view, URL reverts,
  still logged in.
- **Refresh after in-app nav** to a sub-view stays on it (the payoff).
- **Regression**: the existing floor tests (Back at dashboard → no logout, no
  landing) still pass with the flag ON.
- Forward button re-enters the sub-view and re-hydrates.

### Real-device checklist (MANDATORY — CI cannot cover this)
- [ ] **Android Chrome** — tap Back through authed views; URL tracks; returns to dashboard; floor asks before exit.
- [ ] **Android Chrome edge-swipe** (both edges), including rapid mashing at the floor → no logout, no escape to OAuth origin.
- [ ] **iOS Safari** + **installed PWA (standalone)** — back gesture; no URL bar but history correct; no exit/logout at floor.
- [ ] Post-login OAuth: Back across the Google redirect entry does not re-auth-loop.
- [ ] Deep-link + refresh of each authed/sub-view URL (re-confirm Slices 3–4 with the flag ON).
- [ ] Language RTL (HE/AR) sanity on the same flows.

## 7. Risks & mitigations
| Risk | Mitigation |
|---|---|
| Double history entry (handler push + trap push) | Trap's `currentStateView === view` skip (already there); covered by the "no double-back" e2e. |
| Floor regression / accidental logout | Feature flag; floor regression e2e; real-device checklist gating release. |
| Stale param after leaving a sub-view | Re-hydration effects already guard on `current == null` + view match; params are read, not trusted blindly. |
| Dashboard URL ambiguity (role) | Out of scope — dashboards stay URL-less until Slice 6 (auth-restore). |

## 8. Protected-zone sign-off checklist
- [ ] **`src/hooks/useBackButtonTrap.ts`** — treat-as-protected (safety-critical). Owner approval required for 3A.
- [ ] `src/hooks/useAppController.ts` / `TeacherDashboardSection.tsx` / `handlers/teacherDashboardActions.ts` — the handler pushes (3B). Not protected, but part of the same review.
- [ ] Confirm the feature-flag default (recommend **off** until device QA passes).
- [ ] After sign-off + green device checklist: flip the flag on, then remove it in a follow-up.

> **Slice 6** (after this): `useAuthRestore` (PROTECTED) hydrates to the URL's
> view instead of forcing the dashboard, which also unlocks real dashboard
> URLs. Separate sign-off.
