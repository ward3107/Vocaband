# Teacher Share Invites — design plan

**Status:** Draft for review · 2026-05-14
**Branch:** `claude/fix-nav-points-display-JVzjT`
**Out of scope until approved:** any code changes.

---

## 1. Goal

Let teachers send each student a one-tap invite that pre-fills the class
code + selects the student's name on the login screen, while sending the
student's PIN through a **separate channel** so a single screenshot can't
hand over the account.

### Design decisions (locked in chat 2026-05-14)

| Decision | Choice | Reason |
|---|---|---|
| Per-student PIN | **Keep** | Teacher needs to know who is whom (rejected Kahoot mode) |
| Class code format | **Keep 6 alphanumeric** (`ABC123`) | Stronger than Kahoot's 7-digit numeric, still readable |
| Delivery model | **Two separate buttons** per student | Link and PIN travel on different channels |
| Auth flow | **Unchanged** | Student still picks name on landing + types PIN |
| Rate limiting | **Deferred** — relies on GoTrue's per-IP defaults + a 3-fail UX hint in `StudentPinLoginCard`. See §6. | Per-account lockout would have created a trivial class-wide DoS (anyone with a class code can fetch all student emails). Tightening GoTrue defaults is a separate operator task. |
| Invite URL host | **bare `vocaband.com`** (no `www`) | Matches the existing print template at `ClassRosterModal.tsx:251` |
| Button labels | **Short text + icon** — "Link" / "PIN" | Distinct labels prevent a teacher tapping the wrong button and leaking the PIN through the wrong channel |
| PIN message tone | **"It's like your secret password — keep it private."** | Concrete metaphor 4th-graders and parents both understand |

---

## 2. UX — where the buttons go

The existing `ClassRosterModal` (`src/components/ClassRosterModal.tsx:391-451`)
already renders a row per student with avatar / name / "Reveal PIN" /
"Reset PIN" / "Delete". We add **two new icon buttons** to that same row
controls cluster (after the eye/reveal, before reset/delete):

```
[avatar] [name + last-seen]   [PIN: •••• / 7H3K9P]  [🔗 Share link]  [🔢 Share PIN]  [↻ Reset]  [🗑 Delete]
```

- **🔗 Share invite link** — opens `navigator.share()` with a pre-filled
  message: greeting + invite URL. No PIN inside.
- **🔢 Share PIN** — opens `navigator.share()` with a separate message
  containing just the PIN and a reminder to send via a different channel.

Both buttons fall back to `navigator.clipboard.writeText` + a toast if
`navigator.share` is unavailable (desktop Chrome without HTTPS, older
browsers). Same fallback pattern as `handleCopyAll` at
`ClassRosterModal.tsx:192-212`.

**No new modals.** Both actions hand off to the OS share sheet.

---

## 3. URL schema

```
https://www.vocaband.com/student?class=ABC123&s=<student_id>
```

| Param | Source | Behaviour on landing |
|---|---|---|
| `class` | The class's `code` column (already supported in App.tsx:216) | Pre-fills the class-code input |
| `s` | `roster_student.id` (UUID from `teacher_view_roster`) | Auto-selects this student in the roster picker → jumps to PIN entry |

**Why `s=<uuid>` and not `name=<urlencoded-name>`:**
- Display names are not unique within a class (two "Sara"s is common).
- UUIDs make the link insensitive to teacher renames.
- UUID alone is *not* a credential — picking a name still requires the
  PIN to actually sign in.

**Existing infrastructure to extend:**
- `src/App.tsx:216` already reads `?class=` and routes to the student
  login flow.
- `src/components/StudentPinLoginCard.tsx:34-44` exposes the
  `step: "pick" | "pin"` state machine — we add `selected` from a URL
  param to skip the picker step when `?s=...` is present.

---

## 4. Share message templates

Three languages × two messages = **6 new translation keys**. Templates
embed `{className}`, `{studentName}`, `{classCode}`, `{pin}`, `{url}`.

### Invite link (sent to class WhatsApp group / parent chat)

```
EN: Hi {studentName}! Your Vocaband class "{className}" is waiting 🎮
    Tap to join: {url}
    Your teacher will share your secret PIN separately.

HE: היי {studentName}! הכיתה שלכם ב-Vocaband "{className}" מחכה 🎮
    הקליקו להצטרפות: {url}
    המורה תשלח לכם את ה-PIN בנפרד.

AR: مرحباً {studentName}! صف Vocaband "{className}" بانتظارك 🎮
    اضغط للانضمام: {url}
    سيرسل لك معلمك رمز PIN بشكل منفصل.
```

### PIN (sent to a different channel)

```
EN: 🔐 Your Vocaband PIN: {pin}
    Class: {className} ({classCode})
    It's like your secret password — keep it private.

HE: 🔐 ה-PIN שלכם ב-Vocaband: {pin}
    כיתה: {className} ({classCode})
    זה כמו הסיסמה הסודית שלכם — שמרו עליה בסוד.

AR: 🔐 رمز PIN الخاص بك في Vocaband: {pin}
    الصف: {className} ({classCode})
    إنها مثل كلمة سرّك السرّية — احتفظ بها لنفسك.
```

**Where the strings live:** add to
`src/locales/teacher/roster.ts` (already houses ClassRosterModal
strings). Follow the existing pattern at
`src/locales/student/student-pin-login.ts:36-91` — `Strings` interface
+ `Record<Language, …>` map.

---

## 5. Security analysis

### Threat model

| Attacker | Capability | Mitigation |
|---|---|---|
| Sibling looks over shoulder at WhatsApp | Sees invite link only | Link without PIN is useless |
| Classmate forwards screenshot of class group | Has invite link only | Same |
| Parent forwards a phishing-style link to wrong WhatsApp | Has invite link only | Same |
| Sophisticated peer with **both** link **and** PIN | Full account access | Same as today — we're not making this worse |
| Brute-force PIN guesser with leaked invite link | 31^6 ≈ 887M PIN space; capped by GoTrue rate limit | See §6 |

### Channel separation = primary defense

If teachers follow the recommended workflow — link in class group,
PIN to parent's private chat — then a single compromised channel
(screenshot leaks the class group) does not yield credentials. This is
the entire point of the two-button design.

**Failure mode:** lazy teacher pastes both in the same WhatsApp message.
We can't prevent this. We mitigate with:
- Plain-text reminder in the link message ("teacher will share your PIN
  separately") so the teacher reads it before sending.
- Per-PIN rate limit (next section) so brute force is bounded even on
  full compromise.

### What we are NOT changing

- Per-student PINs stay.
- The `processStudentProfile` session-check at
  `src/hooks/useStudentLogin.ts:128-140` stays — the impersonation hole
  fixed on 2026-04-21 is unaffected by this change. URL params can
  preselect a name but cannot bypass the session-uid match.

---

## 6. Rate limiting — gap analysis (DECISION 2026-05-14: defer)

**Original plan:** ship a `student_pin_attempts` table + RPC wrapper
in this PR that locks an account out after N wrong PINs.

**Why we changed our mind mid-implementation:** the invite link reveals
the class code. The class code lets *anyone* call
`class_roster_for_login` and get the **full list of student emails in
that class**. With per-account lockout, an attacker with a single
invite link could lock out every student in the class by recording
fake failures against each email — trivial class-wide DoS.

**What we shipped instead:**
1. **A 3-fail UX hint** in `StudentPinLoginCard` — after 3 wrong PINs
   in the current session, the error swaps from *"That PIN doesn't
   match"* to *"That PIN still doesn't match — ask your teacher to
   check it or reset your PIN."* Pure UX softening, in-memory only,
   reset on refresh. No security claim.
2. **Operator task** in `docs/operator-tasks.md` §5 to verify +
   tighten GoTrue dashboard rate limits (per-IP) and document them.

### Why this is "good enough"

| Threat | Mitigation today |
|---|---|
| Sibling guesses 5 PINs | GoTrue per-IP default + 3-fail UX hint |
| Determined brute force, single IP | 31⁶ ≈ 887M ÷ 30 attempts/5min ≈ 5M years |
| Determined brute force, botnet | Still bounded (per-IP scales with attacker IPs) |
| Class-wide DoS via lockout | **Avoided** — no lockout exists |

### Background — why we even considered it

PIN auth goes **directly** from the client to Supabase GoTrue via
`supabase.auth.signInWithPassword`
(`src/components/StudentPinLoginCard.tsx:110-113`).

Our Express middleware in `server.ts:29-150` does NOT see PIN attempts.
The only protection is whatever Supabase GoTrue enforces server-side:
roughly **30 requests per 5 minutes per IP** by default.

6-char PIN over the 31-char `[A-HJ-KM-NP-Z2-9]` alphabet → search space
31⁶ ≈ 887 million combinations. At 30 attempts/5min from one IP that's
~5 million years; from a 1000-IP botnet, ~5000 years. **Bounded.**

The gap we considered closing: a distributed attacker targeting a
specific student is only rate-limited in aggregate, not per-account.
And we have no audit trail of which student is being targeted.

### Why we deferred

Adding per-account lockout requires the client to be able to tell the
server "this attempt failed". Either:
- **Anyone can record fails** (`anon` execute) → trivial DoS, anyone
  with a class code locks out every student
- **Only authenticated callers** → fails can't be recorded (the
  attacker has no session), defeats the purpose

The only DoS-safe design is server-side auth (Supabase Edge Function
between client and GoTrue), which is a substantial infrastructure
change. Out of scope for this PR.

### Follow-up work (see `docs/operator-tasks.md` §5)

- Verify + tighten GoTrue dashboard rate limits (operator task)
- Add passive `student_pin_attempts` logging table (engineering
  follow-up) — no auto-lockout, just visibility for teachers

---

## 7. Files that changed (shipped 2026-05-14)

- `src/locales/teacher/roster.ts` — 12 new keys (button labels,
  tooltips, share-sheet titles + bodies, toasts) × 3 languages.
- `src/locales/student/student-pin-login.ts` — new `wrongPinPersistent`
  key (× 3 langs) for the 3-fail UX hint.
- `src/components/ClassRosterModal.tsx`
  - New imports: `KeyRound`, `Link2`.
  - New state: `shareCopied`.
  - New helpers: `buildInviteUrl`, `tryShare`, `flashCopied`,
    `handleShareLink`, `handleSharePin`.
  - Two new buttons (Link / PIN) in each roster row, between the
    show-PIN toggle and the reset/delete cluster.
  - "Copied" toast above the footer (only fires on clipboard fallback).
- `src/views/StudentAccountLoginView.tsx`
  - New `prefilledStudentId` state captured from `?s=<uuid>` on mount.
  - Passed to `StudentPinLoginCard` as new prop.
- `src/components/StudentPinLoginCard.tsx`
  - New `prefilledStudentId?: string | null` prop.
  - New `consumedPrefillRef` + auto-select effect: when roster loads
    and the prefilled id matches, jump straight to the PIN step.
  - New `wrongPinCount` state. After 3 fails the error swaps to
    `wrongPinPersistent`. Resets on `handlePick`.

### Files NOT changed (out of scope this PR)
- `server.ts` — PIN auth bypasses Express.
- `worker/index.ts` — same.
- `src/App.tsx` — existing `?class=` parser at line 216 was sufficient;
  `?s=` is captured directly in `StudentAccountLoginView` where it's
  actually used.
- No new Supabase migration — rate limiting deferred (see §6).
- `src/views/QuickPlayStudentView.tsx` — Quick Play is a different flow
  (live challenge), unaffected.

---

## 8. Implementation status

| Phase | Status |
|---|---|
| Locale strings (EN/HE/AR) | ✅ Shipped |
| UI buttons in `ClassRosterModal` | ✅ Shipped |
| Share handlers (navigator.share + clipboard fallback) | ✅ Shipped |
| URL schema `?s=` + auto-prefill | ✅ Shipped |
| 3-fail UX hint | ✅ Shipped (replaces deferred rate-limit) |
| Per-account rate limit | ❌ Deferred (see §6) |
| Manual testing on iOS Safari + Android Chrome | ⏳ Operator |
| GoTrue rate-limit verification | ⏳ Operator (see operator-tasks.md §5) |

---

## 9. Out of scope / future

- QR code in the share sheet (Phase 2 — currently link only).
- Per-student "regenerate invite URL" with a single-use token. Useful
  if a teacher accidentally pastes a link in the wrong WhatsApp and
  wants to invalidate it. Real complexity (token storage, expiry,
  redemption flow) — defer.
- SMS delivery — teachers should not be paying per-message rates;
  channels are user's responsibility.
- Email delivery from Vocaband — adds SMTP cost and spam complaints.

---

## 10. Open questions — resolved 2026-05-14

All four open questions confirmed by the user. See the decisions table
in §1. Ready to start implementation.
