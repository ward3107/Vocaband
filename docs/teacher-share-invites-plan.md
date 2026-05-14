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
    Don't share this with anyone — it's how Vocaband knows it's you.

HE: 🔐 ה-PIN שלכם ב-Vocaband: {pin}
    כיתה: {className} ({classCode})
    אל תשתפו את זה עם אף אחד — ככה Vocaband יודעת שזה אתם.

AR: 🔐 رمز PIN الخاص بك في Vocaband: {pin}
    الصف: {className} ({classCode})
    لا تشاركه مع أحد — هكذا تتعرّف عليك Vocaband.
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

## 6. Rate limiting — gap analysis

### Current state

PIN auth goes **directly** from the client to Supabase GoTrue via
`supabase.auth.signInWithPassword`
(`src/components/StudentPinLoginCard.tsx:110-113`).

This means **our Express middleware does not see PIN attempts.**
`express-rate-limit` in `server.ts:29-150` protects `/api/ocr`,
`/api/translate`, `/socket.io/*` — but NOT auth.

The only rate limiting currently applied to PIN attempts is whatever
**Supabase GoTrue** enforces server-side.

### GoTrue defaults (verify on dashboard)

GoTrue's default token-endpoint rate limit is roughly **30 requests per
5 minutes per IP**. Per-email throttling exists but is laxer.

### Why this is "probably fine" but not great

With a 6-char PIN over the 31-char `[A-HJ-KM-NP-Z2-9]` alphabet:
- Search space: 31⁶ ≈ 887 million
- At 30 attempts/5min from one IP: ~5 million years to exhaust
- At 30 attempts/5min from 1000 botnet IPs: ~5000 years

So a casual attacker is bounded. Our gap is:
1. **No per-account counter** — a distributed attacker targeting a
   specific student is rate-limited only on aggregate, not on Sara's
   account specifically.
2. **No audit trail** — we can't tell the teacher "5 wrong PIN attempts
   on Sara's account in the last hour".
3. **No CAPTCHA / lockout escalation** — GoTrue just returns the same
   error indefinitely.

### Recommendation (phased)

| Phase | Change | Effort |
|---|---|---|
| **0 (now)** | Verify Supabase dashboard rate-limit settings; document the numbers in `docs/SECURITY-OVERVIEW.md` | 15 min |
| **1 (with this feature)** | Add a `student_pin_attempts` table + RPC that wraps `signInWithPassword`. Track per-account failures, lock out for 30s after 5 fails, 5min after 10. | 1 day |
| **2 (later)** | Surface the attempt counter to teachers in `ClassRosterModal` (red badge on a student with recent fail spikes). | 2-3 hours |

**Open question for the user:** ship Phase 1 in the same PR, or in a
follow-up? (My recommendation: same PR. Without it, the new invite
links materially increase brute-force exposure because the link reveals
which email to attack.)

---

## 7. Files that need to change

### Edits
- `src/components/ClassRosterModal.tsx`
  - Add two new buttons (Share link, Share PIN) to the per-row controls
    (lines 408-448).
  - Add `handleShareLink(student)` and `handleSharePin(student)`
    methods near `handleCopyAll` (line 192).
- `src/locales/teacher/roster.ts`
  - Add 6 new keys (3 langs × 2 messages) + button labels.
- `src/App.tsx`
  - Extend the existing `?class=` parser at line 216 to also read `?s=`
    and forward it to `StudentPinLoginCard` via prop.
- `src/components/StudentPinLoginCard.tsx`
  - Accept optional `prefilledStudentId?: string` prop.
  - On mount, if `prefilledStudentId` is present **and** roster is
    loaded, auto-call `handlePick(matchingStudent)` to skip the picker
    step.

### New (only if Phase 1 rate limiting is approved)
- `supabase/migrations/<timestamp>_student_pin_rate_limit.sql`
  - Table: `student_pin_attempts(profile_id, ts, ok)` with a TTL index.
  - RPC: `student_pin_attempt_check(p_profile_id)` → returns
    `{locked_until: timestamp | null}`.
  - RPC: `student_pin_attempt_record(p_profile_id, p_ok bool)`.
- Update `StudentPinLoginCard.tsx` to call the check before
  `signInWithPassword` and the record after.

### No changes needed
- `server.ts` — PIN auth bypasses Express.
- `worker/index.ts` — same.
- `src/views/QuickPlayStudentView.tsx` — Quick Play is a different flow
  (live challenge), unaffected.

---

## 8. Implementation phases

1. **Locale strings + UI buttons** in `ClassRosterModal` (no behaviour
   change yet, buttons stub to `console.log`). Visual review.
2. **Share handlers** with `navigator.share` + clipboard fallback +
   toast. Manual test on iOS Safari, Android Chrome, desktop Chrome.
3. **URL schema** — `?s=` parsing in App.tsx, prefill prop in
   StudentPinLoginCard. End-to-end test: click own invite link in
   incognito → land on PIN step preselected.
4. **(If approved)** Rate-limit migration + RPCs + client wiring.
5. **i18n review** — read EN/HE/AR strings aloud to catch awkward
   phrasing, esp. the "share PIN separately" reminder.
6. **Commit + push** to `claude/fix-nav-points-display-JVzjT`. Wait for
   review before merging.

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

## 10. Open questions for the user

1. **Include Phase 1 rate limiting in the same PR?** Recommended yes.
2. **PIN-message reminder line** — is "Don't share with anyone — it's
   how Vocaband knows it's you" the right tone, or too tech-jargony for
   4th graders' parents?
3. **Invite URL host** — production is `vocaband.com`. Do we want to
   support `www.vocaband.com` or both? (Current print template uses
   bare `vocaband.com` at `ClassRosterModal.tsx:251`.)
4. **Button labels** — "Share link" / "Share PIN" or icons only? Hebrew
   "שתפו" + Arabic "شارك" are short enough either way.
