# Guided class entry and live lessons

## Teacher and student flow

1. The teacher creates a class, opens **Students & entry cards**, adds students and gives each child their own PIN card. Both roster versions print separate cut-out cards with a personal QR and a separately printed PIN. QR links contain no credentials.
2. **Invite students** and the new-class screen explain preparation, sharing and what to tell students. WhatsApp preserves assignment and Class Minute destinations. Hebrew-subject classes keep Hebrew instructions, including when the teacher's UI is English.
3. A shared `/student?class=...` link skips class-code entry. A personal `s=` link also preselects the profile. Otherwise the student enters the class code/link, selects a name or student code, and uses the existing PIN authentication card.
4. After creating a live game, the teacher chooses a class and presses **Open for this class**. This action is available on Quick Play's success screen and the Quick Play, Category Race, Speed Round and Arena host screens. Publication is announced only after the database confirms it. A single class is selected by default.
5. Student home shows **Your teacher opened a lesson! — Join the lesson**. The tap rechecks current membership and the current lesson, reuses the student's name/avatar, and waits for the existing game-server JOIN acknowledgement. Registered users keep their identity and return to their classroom when leaving. Live scores stay on the game podium instead of being written under a synthetic assignment id.
6. Waiting, loading, network failure and ended-lesson states explain the next action. Manual game-code and QR entry remain available. **Switch student** uses the existing exit confirmation.

Native EN/HE/AR controls explain the flow in all three languages. Teachers can choose the explanation language directly inside the invitation and live-class card, even though the English teacher dashboard has no global language switcher. This also selects the shared student instructions; it does not change the learning-product UI. A language choice carries across SPA mounts; a new full-page load retains the existing English default. Existing six-to-twenty-character class codes remain valid. Exact parsing prevents classroom codes from being truncated into game codes. Last-class storage contains only the class code and label.

## Approved database change

`supabase/migrations/20261019175511_class_live_entry.sql` replaces the review draft after explicit approval. It adds one current game per class (closed entries can be reassigned), with a six-hour expiry, owner checks for both class and session, subject matching, and approved student membership derived from `users` plus `student_profiles`. `get_my_live_class_session` accepts no class argument and returns the approved classroom even when no game is open, so PIN students do not depend on teacher-only class state. Closed sessions return no join details. Functions use invoker rights and explicit grants; RLS remains active.

The bridge is included in the existing Realtime publication. Student home uses one visible, class-filtered subscription, rechecks on subscribe/focus/online, aborts stale requests and unsubscribes while hidden. There is no database polling. Closing a game updates the bridge through an invoker trigger so subscribers invalidate their card. Class-entry lookup or publication failures leave the manual game/QR path available.

The repository's existing **Apply Supabase migrations** workflow applies the additive migration after merge to `main`. The frontend tolerates the migration arriving after the asset deployment. No auth, server, proxy, shared-contract or workflow implementation was changed.

## Verification

- Isolated PostgreSQL (PGlite) executes the actual migration and ownership/membership RLS: same-class discovery, foreign teacher/session denial, subject mismatch, unauthenticated access, pending or inconsistent profiles, expiration, closing, replacement, ownership transfer, and teacher/service-role game ending.
- Component tests cover publication acknowledgement and rejection; student waiting/error/end states; registered identity reuse; JOIN acknowledgement; stale account responses; subscription visibility/reconnect; no polling; and live-score routing without synthetic progress writes.
- Updated browser tests assert the new student CTA and native-language entry controls, including the existing horizontal-overflow checks.
- CI TypeScript, unit tests, production build and entry-closure checks are required before merge. Runtime deployment and workflow results are recorded in the PR.

Browser/device acceptance: invite two classes belonging to the same teacher; publish to only one; join a PIN-authenticated student from that class without entering a game code/name; verify the other class cannot discover it; close/reopen the game; background/reconnect the student tab; leave and confirm that the student remains signed in. Check EN/HE/AR on a narrow phone, and scan a printed personal card before entering its PIN.
