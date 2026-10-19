# Guided class entry

## Implemented in this change

- Student entry at `/student` has two steps: class, then the existing name/code + PIN card. A teacher link skips the class-code step, including personal `s=` invites. Assignment and Class Minute parameters remain in the address bar for the existing post-login handlers.
- The EN / HE / AR buttons display each language's native name. A selected language is inherited by subsequently mounted components in the same SPA session. A full page load still starts in English as required by the existing product decision.
- The student never loads the roster for each partial code keystroke. A class must be selected or a complete class code submitted first. Existing six-to-twenty-character class codes remain supported; explicit `?class=` links resolve the legacy six-character ambiguity without an extra step.
- Class codes and game codes are matched exactly. A class code pasted into the game dialog offers class entry rather than truncating it into a different game code. A game code in class entry offers the game dialog.
- A successful PIN login can remember the last class. This new shortcut stores only class code and display label, not student name, profile id, PIN or auth tokens. Existing Supabase session restoration is reused.
- Teacher class cards expose **Invite students** and **Students & entry cards** as text on mobile. Classroom invitation, new-class success and assignment sharing use the same guided dialog.
- Invitation explains preparation, sharing and exactly what to tell students. WhatsApp includes the personal-PIN step and preserves assignment/drill destinations. It only opens after the teacher presses the share link; this change sends no messages automatically.
- Individual printable cards replace the all-PIN table. Each card contains a profile-prefilled QR/link and a separately printed PIN. No PIN is encoded into a QR or URL.
- Student home shows the class and a prominent live-game join action, plus **Switch student** using the existing exit confirmation. At this stage the live-game action still asks for the teacher's game code.
- Modal focus, Escape and browser-back handling reuse `ModalShell`. The PWA precache follows the new entry chunk name.

## Automatic live-class joining is not enabled

The repository's `docs/live-classroom-sessions-design.md` is still a draft, and the current Quick Play records have no class binding. Finding every session belonging to a teacher would incorrectly show a room to the teacher's other classes.

`proposals/class-live-entry.sql` is a concrete database review draft. It is outside `supabase/migrations/`, is not executed and makes no production schema changes. It adds one current session per class, teacher ownership checks for both sides of the binding, approved-student membership checks, and a student lookup with no client-supplied class parameter. All functions are SECURITY INVOKER; RLS remains active.

After explicit approval under `CLAUDE.md`:

1. Verify the deployed schema and RLS against this draft in an isolated test database, then generate the real migration with `supabase migration new class_live_entry`.
2. Add a class selector to live activity setup. After existing session creation, call `set_class_live_session` and verify success before announcing the room. Guests still use the existing QR path.
3. Fetch `get_my_live_class_session` when student home opens, on focus and on network recovery. Use one shared subscription or a low-frequency, visible-page-only fallback, with cancellation and retry. Do not poll from hidden tabs or once per game component.
4. Replace the current manual-code hero with **Your teacher opened a lesson — Join** when the authenticated lookup succeeds. Reuse the current identity and avatar without an extra nickname step. Do not transition to “joined” until the server acknowledges the join.
5. Verify same-class join, wrong-class denial, guest behavior, session expiration/end, refresh/reconnect, shared-device sign-out and duplicate announcements before enabling it.

The existing authentication/session files, `server.ts`, shared `src/core/` contracts, existing migrations and production database are unchanged by this PR. `StudentAuthRoutes.tsx` only switches the lazy presentation component; the PIN card and auth callbacks are unchanged. That route is a CODEOWNERS review path.

## Validation

- Regression tests cover exact class/game routing, personal invites, post-login destinations, last-class privacy, denied storage/clipboard, escaping printed names, EN/HE/AR entry and modal dismissal.
- Passed CI typecheck, 684 unit tests (11 environment/integration skips), production build and the static entry-closure budget (75.1 kB gzip across four chunks).
- A normal `npm run build` hit this workspace's Unix-socket restriction in the `tsx` CLI. Running the same two generators with `node --import tsx`, followed by Vite's build entry point, avoids the CLI IPC listener and preserves the build steps.
- No usable browser executable is available in this workspace. Browser screenshots, physical-device entry, printer layout and real authenticated live-class checks are not claimed as verified.

## Human acceptance check

Give a teacher the app without oral instructions. They should find their class, prepare a student, distribute the entry card/link and create an activity. Give a student only that card/link. They should choose a readable language, reach the correct class, use their personal PIN and identify the next action. Repeat with an anonymous student code and a shared classroom device.
