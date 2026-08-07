# Quick Play 🆘 Help Button — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating 🆘 help button to the Quick Play gameplay view so students can self-serve (replay audio / force reconnect / toggle translation) or raise a hand to the teacher — teacher sees per-student 🙋 badges + a header counter and taps to acknowledge.

**Architecture:** Non-protected additions (locale strings, rate-limit helper, hook, button component, view mount, teacher UI updates) land first and are independently testable. The two protected-zone touches (`src/core/quickPlayProtocol.ts`, `server.ts`) are quarantined into their own tasks with explicit pause-points that require operator approval before any edit.

**Tech Stack:** React 19, TypeScript, Vitest (Node + jsdom projects), motion/react, socket.io-client + server, Tailwind CSS, `useLanguage` hook for i18n.

**Spec:** [`docs/superpowers/specs/2026-08-07-quick-play-help-button-design.md`](../specs/2026-08-07-quick-play-help-button-design.md)

## Global Constraints

- **Rate limit:** max 5 `raiseHand` attempts per student per rolling 60-second window; excess dropped server-side with no error to the student.
- **Auto-expire:** raised-hand state self-clears client-side after 60 seconds if the teacher does not acknowledge.
- **Languages:** every user-facing string ships in EN + HE + AR + RU (mirrors existing `src/locales/student/quick-play.ts` coverage).
- **Protected zones:** edits to `src/core/quickPlayProtocol.ts` and `server.ts` require explicit per-file operator approval; Tasks 3 and 4 pause and wait.
- **Placement:** button appears **only** during the gameplay phase of Quick Play — not on join, Get Ready, or endgame screens.
- **One raised hand per student at a time** — the "Show my teacher" option is a no-op while the student's hand is already up.
- **No sound alerts** on the teacher side.
- **Not currently a git repo:** the extracted-zip context has no `.git`. If executed there, `git commit` steps error out — either run `git init` first, or replay the plan inside a proper clone. Commit steps below assume a real repo.

---

### Task 1: Locale strings

**Files:**
- Modify: `src/locales/student/quick-play.ts`
- Test: `src/__tests__/quick-play-help-locale.test.ts`

**Interfaces:**
- Consumes: none (foundational task, runs first)
- Produces: 10 new keys on the `quickPlayT[lang]` object, each present in all four language records: `helpButtonAria`, `helpMenuTitle`, `helpCantHearWord`, `helpCantHearTip`, `helpGameFrozen`, `helpReconnecting`, `helpCantRead`, `helpShowTeacher`, `helpHandRaisedToast`, `helpHandRaisedStatePill`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/__tests__/quick-play-help-locale.test.ts
import { describe, it, expect } from 'vitest';
import { quickPlayT } from '../locales/student/quick-play';

const HELP_KEYS = [
  'helpButtonAria', 'helpMenuTitle',
  'helpCantHearWord', 'helpCantHearTip',
  'helpGameFrozen', 'helpReconnecting',
  'helpCantRead', 'helpShowTeacher',
  'helpHandRaisedToast', 'helpHandRaisedStatePill',
] as const;

describe('quick-play help locale keys', () => {
  it.each(['en', 'he', 'ar', 'ru'] as const)('has all help keys populated in %s', (lang) => {
    for (const key of HELP_KEYS) {
      const value = (quickPlayT[lang] as Record<string, unknown>)[key];
      expect(value, `${lang}.${key} missing`).toBeTypeOf('string');
      expect((value as string).length, `${lang}.${key} empty`).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/quick-play-help-locale.test.ts`
Expected: all four `it.each` cases FAIL with "helpButtonAria missing" (or similar).

- [ ] **Step 3: Add the 10 keys to each language block**

Edit `src/locales/student/quick-play.ts`. In the `Strings` interface (near the top), add these 10 optional-free lines alongside the existing `toast*` fields:

```typescript
helpButtonAria: string;
helpMenuTitle: string;
helpCantHearWord: string;
helpCantHearTip: string;
helpGameFrozen: string;
helpReconnecting: string;
helpCantRead: string;
helpShowTeacher: string;
helpHandRaisedToast: string;
helpHandRaisedStatePill: string;
```

Then add the following block to each of the four language records (`en`, `he`, `ar`, `ru`) at the end of the `toast*` group:

```typescript
// English (en)
helpButtonAria: 'Get help',
helpMenuTitle: 'How can I help? 🤔',
helpCantHearWord: "🔊  I can't hear the word",
helpCantHearTip: 'Turn off silent mode if you still can\'t hear!',
helpGameFrozen: '⏳  The game looks frozen',
helpReconnecting: 'Reconnecting…',
helpCantRead: "🌍  I can't read this",
helpShowTeacher: '🙋  Show my teacher',
helpHandRaisedToast: 'Your teacher will see this soon!',
helpHandRaisedStatePill: '✓ Waiting for teacher',
```

```typescript
// Hebrew (he)
helpButtonAria: 'קבל עזרה',
helpMenuTitle: 'איך אפשר לעזור? 🤔',
helpCantHearWord: '🔊  אני לא שומע/ת את המילה',
helpCantHearTip: 'כבו את מצב השקט אם עדיין לא שומעים!',
helpGameFrozen: '⏳  המשחק נראה תקוע',
helpReconnecting: 'מתחבר מחדש…',
helpCantRead: '🌍  אני לא מבין/ה מה כתוב',
helpShowTeacher: '🙋  הראה למורה',
helpHandRaisedToast: 'המורה תראה את זה בקרוב!',
helpHandRaisedStatePill: '✓ מחכה למורה',
```

```typescript
// Arabic (ar)
helpButtonAria: 'اطلب المساعدة',
helpMenuTitle: 'كيف يمكنني المساعدة؟ 🤔',
helpCantHearWord: '🔊  لا أسمع الكلمة',
helpCantHearTip: 'أوقف الوضع الصامت إذا كنت لا تسمع بعد!',
helpGameFrozen: '⏳  اللعبة تبدو متجمدة',
helpReconnecting: 'إعادة الاتصال…',
helpCantRead: '🌍  لا أستطيع القراءة',
helpShowTeacher: '🙋  أظهر لمعلّمي',
helpHandRaisedToast: 'سيرى معلّمك ذلك قريباً!',
helpHandRaisedStatePill: '✓ في انتظار المعلّم',
```

```typescript
// Russian (ru)
helpButtonAria: 'Получить помощь',
helpMenuTitle: 'Чем помочь? 🤔',
helpCantHearWord: '🔊  Я не слышу слово',
helpCantHearTip: 'Выключи беззвучный режим, если всё ещё не слышишь!',
helpGameFrozen: '⏳  Игра зависла',
helpReconnecting: 'Переподключение…',
helpCantRead: '🌍  Не могу прочитать',
helpShowTeacher: '🙋  Показать учителю',
helpHandRaisedToast: 'Учитель скоро это увидит!',
helpHandRaisedStatePill: '✓ Ждём учителя',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/quick-play-help-locale.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/locales/student/quick-play.ts src/__tests__/quick-play-help-locale.test.ts
git commit -m "feat(qp-help): add 10 locale keys × 4 languages for help menu"
```

---

### Task 2: Rate-limit helper (pure function)

**Files:**
- Create: `src/utils/rateLimit.ts`
- Test: `src/__tests__/rateLimit.test.ts`

**Interfaces:**
- Consumes: none
- Produces: `createRateLimiter(maxCalls: number, windowMs: number) → { tryConsume(key: string, now: number): boolean }`. `tryConsume` returns `true` when the call is allowed (and records it), `false` when the key has hit its cap within the current window. Timestamps are passed in explicitly for deterministic testing.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/__tests__/rateLimit.test.ts
import { describe, it, expect } from 'vitest';
import { createRateLimiter } from '../utils/rateLimit';

describe('createRateLimiter', () => {
  it('allows calls under the cap', () => {
    const rl = createRateLimiter(5, 60_000);
    for (let i = 0; i < 5; i++) {
      expect(rl.tryConsume('u1', 1000 + i)).toBe(true);
    }
  });

  it('rejects the 6th call within the window', () => {
    const rl = createRateLimiter(5, 60_000);
    for (let i = 0; i < 5; i++) rl.tryConsume('u1', 1000 + i);
    expect(rl.tryConsume('u1', 1005)).toBe(false);
  });

  it('re-allows after the window slides', () => {
    const rl = createRateLimiter(5, 60_000);
    for (let i = 0; i < 5; i++) rl.tryConsume('u1', 1000 + i);
    expect(rl.tryConsume('u1', 61_100)).toBe(true);
  });

  it('tracks keys independently', () => {
    const rl = createRateLimiter(2, 60_000);
    rl.tryConsume('u1', 1000);
    rl.tryConsume('u1', 1001);
    expect(rl.tryConsume('u1', 1002)).toBe(false);
    expect(rl.tryConsume('u2', 1003)).toBe(true);
  });

  it('is empty-history-safe', () => {
    const rl = createRateLimiter(5, 60_000);
    expect(rl.tryConsume('new', 1000)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/rateLimit.test.ts`
Expected: FAIL — module `../utils/rateLimit` not found.

- [ ] **Step 3: Implement the helper**

```typescript
// src/utils/rateLimit.ts

// Simple rolling-window rate limiter. Pure function factory — pass `now`
// explicitly so tests are deterministic and callers can inject their own
// clock (server-side uses Date.now(); tests use fixed integers).
export function createRateLimiter(maxCalls: number, windowMs: number) {
  const hits = new Map<string, number[]>();

  function tryConsume(key: string, now: number): boolean {
    const cutoff = now - windowMs;
    const history = (hits.get(key) ?? []).filter((t) => t > cutoff);
    if (history.length >= maxCalls) {
      hits.set(key, history);
      return false;
    }
    history.push(now);
    hits.set(key, history);
    return true;
  }

  return { tryConsume };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/rateLimit.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/rateLimit.ts src/__tests__/rateLimit.test.ts
git commit -m "feat(qp-help): add rolling-window rate-limit helper (5/60s)"
```

---

### Task 3: ⚠️ Protocol constants (PROTECTED FILE — pause for approval)

**Files:**
- Modify: `src/core/quickPlayProtocol.ts` ⚠️ **PROTECTED** — do not edit without explicit operator approval.
- Test: `src/__tests__/quick-play-help-protocol.test.ts`

**Interfaces:**
- Consumes: existing `QP_EVENTS` and `QP_SERVER_EVENTS` maps + Task 1's locale keys (indirectly — payload contains no i18n).
- Produces: 4 new event constants and their payload types, exported so `server.ts`, the client hook, and `QuickPlayMonitor` can all consume them.
  - `QP_EVENTS.STUDENT_RAISE_HAND = 'qp:studentRaiseHand'` — payload `{ sessionCode: string; studentUid: string }`
  - `QP_SERVER_EVENTS.STUDENT_HAND_RAISED = 'qp:studentHandRaised'` — payload `{ studentUid: string; name: string; raisedAt: number }`
  - `QP_EVENTS.TEACHER_ACK_HELP = 'qp:teacherAckHelp'` — payload `{ sessionCode: string; studentUid: string | 'all' }`
  - `QP_SERVER_EVENTS.STUDENT_HAND_CLEARED = 'qp:studentHandCleared'` — payload `{ studentUid: string }`

- [ ] **Step 1: 🛑 PAUSE — request operator approval**

Post the following to the operator, verbatim:

> "Task 3 needs to edit `src/core/quickPlayProtocol.ts` — a protected file per CLAUDE.md. Change: add 4 event constants (`STUDENT_RAISE_HAND`, `STUDENT_HAND_RAISED`, `TEACHER_ACK_HELP`, `STUDENT_HAND_CLEARED`) and their payload types to the existing `QP_EVENTS` / `QP_SERVER_EVENTS` maps. No existing constants are removed or renamed. Approve to proceed?"

Wait for explicit "yes, edit that file" before continuing. If they say no, stop here and flag which specific concern needs resolving.

- [ ] **Step 2: Write the failing test**

```typescript
// src/__tests__/quick-play-help-protocol.test.ts
import { describe, it, expect } from 'vitest';
import { QP_EVENTS, QP_SERVER_EVENTS } from '../core/quickPlayProtocol';

describe('quick-play help protocol constants', () => {
  it('exports the 2 student→server event names', () => {
    expect(QP_EVENTS.STUDENT_RAISE_HAND).toBe('qp:studentRaiseHand');
    expect(QP_EVENTS.TEACHER_ACK_HELP).toBe('qp:teacherAckHelp');
  });

  it('exports the 2 server→client event names', () => {
    expect(QP_SERVER_EVENTS.STUDENT_HAND_RAISED).toBe('qp:studentHandRaised');
    expect(QP_SERVER_EVENTS.STUDENT_HAND_CLEARED).toBe('qp:studentHandCleared');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/__tests__/quick-play-help-protocol.test.ts`
Expected: FAIL — `Cannot read properties of undefined (reading 'STUDENT_RAISE_HAND')`.

- [ ] **Step 4: Add the 4 constants and payload types**

In `src/core/quickPlayProtocol.ts`, extend `QP_EVENTS` (student→server, near line 35) with:

```typescript
STUDENT_RAISE_HAND: 'qp:studentRaiseHand',
TEACHER_ACK_HELP: 'qp:teacherAckHelp',
```

Extend `QP_SERVER_EVENTS` (server→client, near line 138) with:

```typescript
STUDENT_HAND_RAISED: 'qp:studentHandRaised',
STUDENT_HAND_CLEARED: 'qp:studentHandCleared',
```

Then add the 4 payload interfaces (alongside the other `sessionCode`-carrying payloads):

```typescript
export interface StudentRaiseHandPayload {
  sessionCode: string;
  studentUid: string;
}

export interface StudentHandRaisedPayload {
  studentUid: string;
  name: string;
  raisedAt: number;
}

export interface TeacherAckHelpPayload {
  sessionCode: string;
  /** Specific student uid, or 'all' to clear every raised hand in the session. */
  studentUid: string | 'all';
}

export interface StudentHandClearedPayload {
  studentUid: string;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/quick-play-help-protocol.test.ts`
Expected: 2 tests pass.

- [ ] **Step 6: Run the full CI check locally to catch typecheck regressions**

Run: `./scripts/typecheck-ratchet.sh`
Expected: exits 0 (baseline typecheck failures unchanged).

- [ ] **Step 7: Commit**

```bash
git add src/core/quickPlayProtocol.ts src/__tests__/quick-play-help-protocol.test.ts
git commit -m "feat(qp-help): add protocol constants + payloads for raise-hand flow

Protected-file edit — operator-approved 2026-08-07."
```

---

### Task 4: ⚠️ server.ts socket handlers (PROTECTED FILE — pause for approval)

**Files:**
- Modify: `server.ts` ⚠️ **PROTECTED** — do not edit without explicit operator approval.
- Test: covered by the Task 2 unit test for the rate-limit helper; no direct `server.ts` unit test (integration surface).

**Interfaces:**
- Consumes: `QP_EVENTS.STUDENT_RAISE_HAND`, `QP_EVENTS.TEACHER_ACK_HELP` from Task 3; `createRateLimiter` from Task 2; existing session/teacher-socket lookup helpers already present in `server.ts`.
- Produces: server-side event handlers that (a) validate the sender, (b) apply rate-limit on raise, (c) broadcast `STUDENT_HAND_RAISED` to the teacher's socket only, (d) broadcast `STUDENT_HAND_CLEARED` to the affected student socket(s) on teacher ack. No new HTTP endpoints.

- [ ] **Step 1: 🛑 PAUSE — request operator approval**

Post to the operator, verbatim:

> "Task 4 needs to edit `server.ts` — protected file. Additions: (1) import `createRateLimiter` + the 4 protocol payload types from Task 3; (2) create a module-scoped `raiseHandLimiter = createRateLimiter(5, 60_000)`; (3) add 2 socket.on handlers (`STUDENT_RAISE_HAND`, `TEACHER_ACK_HELP`) inside the existing Quick Play namespace block. No existing handlers removed or renamed. ~80 lines added. Approve to proceed?"

Wait for explicit "yes." Same rule as Task 3.

- [ ] **Step 2: Locate the Quick Play socket namespace block**

Read `server.ts` and search (Grep for `QP_EVENTS.STUDENT_JOIN` or the existing quick-play `io.of` / namespace assignment) to find the block where existing Quick Play socket handlers are registered. All new handlers land inside that same block for locality — do not create a new namespace.

- [ ] **Step 3: Add the imports + limiter at the top of the file**

Add near the existing protocol imports:

```typescript
import {
  QP_EVENTS,
  QP_SERVER_EVENTS,
  type StudentRaiseHandPayload,
  type TeacherAckHelpPayload,
  type StudentHandRaisedPayload,
  type StudentHandClearedPayload,
} from './src/core/quickPlayProtocol';
import { createRateLimiter } from './src/utils/rateLimit';

// Rolling-window guard: max 5 raise attempts per student per 60s.
// Excess attempts are silently dropped (no error emitted to student).
const raiseHandLimiter = createRateLimiter(5, 60_000);
```

- [ ] **Step 4: Add the `STUDENT_RAISE_HAND` handler inside the Quick Play namespace block**

```typescript
socket.on(QP_EVENTS.STUDENT_RAISE_HAND, (payload: StudentRaiseHandPayload) => {
  const { sessionCode, studentUid } = payload ?? {};
  if (!sessionCode || !studentUid) return;

  const session = quickPlaySessions.get(sessionCode);
  if (!session) return;

  const student = session.students.get(studentUid);
  if (!student) return;

  if (!raiseHandLimiter.tryConsume(studentUid, Date.now())) return;

  const teacherSocket = session.teacherSocketId
    ? io.of('/quick-play').sockets.get(session.teacherSocketId)
    : null;
  if (!teacherSocket) return;

  const broadcast: StudentHandRaisedPayload = {
    studentUid,
    name: student.name,
    raisedAt: Date.now(),
  };
  teacherSocket.emit(QP_SERVER_EVENTS.STUDENT_HAND_RAISED, broadcast);
});
```

- [ ] **Step 5: Add the `TEACHER_ACK_HELP` handler**

```typescript
socket.on(QP_EVENTS.TEACHER_ACK_HELP, (payload: TeacherAckHelpPayload) => {
  const { sessionCode, studentUid } = payload ?? {};
  if (!sessionCode || !studentUid) return;

  const session = quickPlaySessions.get(sessionCode);
  if (!session) return;

  if (socket.id !== session.teacherSocketId) return;

  const targets = studentUid === 'all'
    ? Array.from(session.students.values())
    : [session.students.get(studentUid)].filter(Boolean);

  for (const student of targets) {
    if (!student?.socketId) continue;
    const studentSocket = io.of('/quick-play').sockets.get(student.socketId);
    if (!studentSocket) continue;
    const clearPayload: StudentHandClearedPayload = { studentUid: student.uid };
    studentSocket.emit(QP_SERVER_EVENTS.STUDENT_HAND_CLEARED, clearPayload);
  }
});
```

*(Field names like `quickPlaySessions`, `session.students`, `session.teacherSocketId`, `student.socketId`, and `student.uid` MUST match the actual names already used inside `server.ts` for the Quick Play namespace — read the surrounding code and rename any mismatches. If names differ, adjust these three code blocks accordingly; the shape (session lookup → member validation → limiter → broadcast) does not change.)*

- [ ] **Step 6: Typecheck + build to catch drift**

Run:
```bash
./scripts/typecheck-ratchet.sh
npm run build
```
Expected: both exit 0. If typecheck fails, the field-name mismatch note above is where to look.

- [ ] **Step 7: Commit**

```bash
git add server.ts
git commit -m "feat(qp-help): add raise-hand + teacher-ack socket handlers

Protected-file edit — operator-approved 2026-08-07. Broadcasts scoped to
the session's teacher socket only; student attempts rate-limited to
5 per 60s (excess silently dropped)."
```

---

### Task 5: `useQuickPlayHelp` hook

**Files:**
- Create: `src/hooks/useQuickPlayHelp.ts`
- Test: `src/__tests__/useQuickPlayHelp.test.tsx`

**Interfaces:**
- Consumes: `QP_EVENTS`, `QP_SERVER_EVENTS`, `StudentHandClearedPayload` from Task 3; a `socket` reference and a `session` object (both already passed around by existing Quick Play code).
- Produces:

```typescript
export function useQuickPlayHelp(
  socket: Socket | null,
  session: { sessionCode: string; studentUid: string } | null,
): {
  handRaised: boolean;
  handAckExpiresAt: number | null;
  onRaiseHand: () => void;
};
```

The three self-service action callbacks (replay audio / force reconnect / toggle translation) are NOT wrapped by this hook — they exist in the caller's scope and are passed straight to the button as props.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/__tests__/useQuickPlayHelp.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuickPlayHelp } from '../hooks/useQuickPlayHelp';
import { QP_EVENTS, QP_SERVER_EVENTS } from '../core/quickPlayProtocol';

function makeMockSocket() {
  const listeners = new Map<string, ((p: unknown) => void)[]>();
  return {
    emit: vi.fn(),
    on: vi.fn((event: string, cb: (p: unknown) => void) => {
      const arr = listeners.get(event) ?? [];
      arr.push(cb);
      listeners.set(event, arr);
    }),
    off: vi.fn((event: string, cb: (p: unknown) => void) => {
      const arr = (listeners.get(event) ?? []).filter((c) => c !== cb);
      listeners.set(event, arr);
    }),
    __fire(event: string, payload: unknown) {
      (listeners.get(event) ?? []).forEach((cb) => cb(payload));
    },
  };
}

describe('useQuickPlayHelp', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('starts un-raised', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() =>
      useQuickPlayHelp(socket as never, { sessionCode: 'ABC', studentUid: 'u1' }),
    );
    expect(result.current.handRaised).toBe(false);
    expect(result.current.handAckExpiresAt).toBeNull();
  });

  it('emits the raise event and sets state', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() =>
      useQuickPlayHelp(socket as never, { sessionCode: 'ABC', studentUid: 'u1' }),
    );
    act(() => result.current.onRaiseHand());
    expect(socket.emit).toHaveBeenCalledWith(QP_EVENTS.STUDENT_RAISE_HAND, {
      sessionCode: 'ABC',
      studentUid: 'u1',
    });
    expect(result.current.handRaised).toBe(true);
    expect(result.current.handAckExpiresAt).not.toBeNull();
  });

  it('is a no-op when already raised', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() =>
      useQuickPlayHelp(socket as never, { sessionCode: 'ABC', studentUid: 'u1' }),
    );
    act(() => result.current.onRaiseHand());
    act(() => result.current.onRaiseHand());
    expect(socket.emit).toHaveBeenCalledTimes(1);
  });

  it('auto-clears after 60s', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() =>
      useQuickPlayHelp(socket as never, { sessionCode: 'ABC', studentUid: 'u1' }),
    );
    act(() => result.current.onRaiseHand());
    act(() => { vi.advanceTimersByTime(60_100); });
    expect(result.current.handRaised).toBe(false);
  });

  it('clears when server emits STUDENT_HAND_CLEARED for this student', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() =>
      useQuickPlayHelp(socket as never, { sessionCode: 'ABC', studentUid: 'u1' }),
    );
    act(() => result.current.onRaiseHand());
    act(() => socket.__fire(QP_SERVER_EVENTS.STUDENT_HAND_CLEARED, { studentUid: 'u1' }));
    expect(result.current.handRaised).toBe(false);
  });

  it('ignores clears for other students', () => {
    const socket = makeMockSocket();
    const { result } = renderHook(() =>
      useQuickPlayHelp(socket as never, { sessionCode: 'ABC', studentUid: 'u1' }),
    );
    act(() => result.current.onRaiseHand());
    act(() => socket.__fire(QP_SERVER_EVENTS.STUDENT_HAND_CLEARED, { studentUid: 'other' }));
    expect(result.current.handRaised).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/useQuickPlayHelp.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

```typescript
// src/hooks/useQuickPlayHelp.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import {
  QP_EVENTS,
  QP_SERVER_EVENTS,
  type StudentHandClearedPayload,
  type StudentRaiseHandPayload,
} from '../core/quickPlayProtocol';

const AUTO_EXPIRE_MS = 60_000;

export function useQuickPlayHelp(
  socket: Socket | null,
  session: { sessionCode: string; studentUid: string } | null,
) {
  const [handRaised, setHandRaised] = useState(false);
  const [handAckExpiresAt, setHandAckExpiresAt] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setHandRaised(false);
    setHandAckExpiresAt(null);
  }, []);

  const onRaiseHand = useCallback(() => {
    if (!socket || !session || handRaised) return;
    const payload: StudentRaiseHandPayload = {
      sessionCode: session.sessionCode,
      studentUid: session.studentUid,
    };
    socket.emit(QP_EVENTS.STUDENT_RAISE_HAND, payload);
    const expiresAt = Date.now() + AUTO_EXPIRE_MS;
    setHandRaised(true);
    setHandAckExpiresAt(expiresAt);
    timerRef.current = setTimeout(clear, AUTO_EXPIRE_MS);
  }, [socket, session, handRaised, clear]);

  useEffect(() => {
    if (!socket || !session) return;
    const onCleared = (payload: StudentHandClearedPayload) => {
      if (payload?.studentUid !== session.studentUid) return;
      clear();
    };
    socket.on(QP_SERVER_EVENTS.STUDENT_HAND_CLEARED, onCleared);
    return () => { socket.off(QP_SERVER_EVENTS.STUDENT_HAND_CLEARED, onCleared); };
  }, [socket, session, clear]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { handRaised, handAckExpiresAt, onRaiseHand };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/useQuickPlayHelp.test.tsx`
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useQuickPlayHelp.ts src/__tests__/useQuickPlayHelp.test.tsx
git commit -m "feat(qp-help): student-side raise-hand hook with 60s auto-expire"
```

---

### Task 6: `QuickPlayHelpButton` component

**Files:**
- Create: `src/components/QuickPlayHelpButton.tsx`
- Test: `src/__tests__/QuickPlayHelpButton.test.tsx`

**Interfaces:**
- Consumes: Task 1's locale keys via the `qpT` object (imported from `../locales/student/quick-play`), the `Language` type from `../hooks/useLanguage`.
- Produces: a React component with this prop shape:

```typescript
interface Props {
  language: Language;
  handRaised: boolean;
  onRaiseHand: () => void;
  onReplayAudio: () => void;
  onForceReconnect: () => void;
  onToggleTranslation: () => void;
}
```

- [ ] **Step 1: Write the failing tests**

```tsx
// src/__tests__/QuickPlayHelpButton.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickPlayHelpButton } from '../components/QuickPlayHelpButton';

const noop = () => {};

function makeProps(overrides = {}) {
  return {
    language: 'en' as const,
    handRaised: false,
    onRaiseHand: vi.fn(),
    onReplayAudio: vi.fn(),
    onForceReconnect: vi.fn(),
    onToggleTranslation: vi.fn(),
    ...overrides,
  };
}

describe('QuickPlayHelpButton', () => {
  it('renders the button with aria-label', () => {
    render(<QuickPlayHelpButton {...makeProps()} />);
    expect(screen.getByRole('button', { name: /get help/i })).toBeTruthy();
  });

  it('opens the menu on click', () => {
    render(<QuickPlayHelpButton {...makeProps()} />);
    fireEvent.click(screen.getByRole('button', { name: /get help/i }));
    expect(screen.getByText(/how can i help/i)).toBeTruthy();
  });

  it('fires onReplayAudio when the audio option is tapped', () => {
    const props = makeProps();
    render(<QuickPlayHelpButton {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /get help/i }));
    fireEvent.click(screen.getByText(/can't hear the word/i));
    expect(props.onReplayAudio).toHaveBeenCalledOnce();
  });

  it('fires onForceReconnect when frozen option is tapped', () => {
    const props = makeProps();
    render(<QuickPlayHelpButton {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /get help/i }));
    fireEvent.click(screen.getByText(/game looks frozen/i));
    expect(props.onForceReconnect).toHaveBeenCalledOnce();
  });

  it('fires onToggleTranslation when read option is tapped', () => {
    const props = makeProps();
    render(<QuickPlayHelpButton {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /get help/i }));
    fireEvent.click(screen.getByText(/can't read this/i));
    expect(props.onToggleTranslation).toHaveBeenCalledOnce();
  });

  it('fires onRaiseHand when show-teacher is tapped', () => {
    const props = makeProps();
    render(<QuickPlayHelpButton {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /get help/i }));
    fireEvent.click(screen.getByText(/show my teacher/i));
    expect(props.onRaiseHand).toHaveBeenCalledOnce();
  });

  it('renders the ✓ waiting pill when handRaised', () => {
    render(<QuickPlayHelpButton {...makeProps({ handRaised: true })} />);
    expect(screen.getByText(/waiting for teacher/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/QuickPlayHelpButton.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
// src/components/QuickPlayHelpButton.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { quickPlayT } from '../locales/student/quick-play';
import type { Language } from '../hooks/useLanguage';

interface Props {
  language: Language;
  handRaised: boolean;
  onRaiseHand: () => void;
  onReplayAudio: () => void;
  onForceReconnect: () => void;
  onToggleTranslation: () => void;
}

export function QuickPlayHelpButton({
  language, handRaised,
  onRaiseHand, onReplayAudio, onForceReconnect, onToggleTranslation,
}: Props) {
  const [open, setOpen] = useState(false);
  const t = quickPlayT[language] ?? quickPlayT.en;

  const doAction = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };

  return (
    <div data-quick-play-help className="fixed bottom-4 right-4 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20 }}
            className="absolute bottom-16 right-0 w-64 rounded-2xl bg-white p-3 shadow-2xl"
          >
            <div className="mb-2 px-2 text-sm font-black text-stone-800">
              {t.helpMenuTitle}
            </div>
            <button
              type="button"
              onClick={doAction(onReplayAudio)}
              className="mb-1 w-full rounded-xl bg-amber-100 px-3 py-2 text-left text-sm font-bold text-amber-900"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              {t.helpCantHearWord}
            </button>
            <button
              type="button"
              onClick={doAction(onForceReconnect)}
              className="mb-1 w-full rounded-xl bg-blue-100 px-3 py-2 text-left text-sm font-bold text-blue-900"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              {t.helpGameFrozen}
            </button>
            <button
              type="button"
              onClick={doAction(onToggleTranslation)}
              className="mb-1 w-full rounded-xl bg-emerald-100 px-3 py-2 text-left text-sm font-bold text-emerald-900"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              {t.helpCantRead}
            </button>
            <button
              type="button"
              onClick={doAction(onRaiseHand)}
              disabled={handRaised}
              className="w-full rounded-xl bg-pink-100 px-3 py-2 text-left text-sm font-bold text-pink-900 disabled:opacity-50"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              {handRaised ? t.helpHandRaisedStatePill : t.helpShowTeacher}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        aria-label={t.helpButtonAria}
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl font-black text-white shadow-lg ${
          handRaised
            ? 'bg-gradient-to-br from-stone-400 to-stone-500'
            : 'bg-gradient-to-br from-red-500 to-rose-600'
        }`}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      >
        {handRaised ? '✓' : '🆘'}
      </motion.button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/QuickPlayHelpButton.test.tsx`
Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/QuickPlayHelpButton.tsx src/__tests__/QuickPlayHelpButton.test.tsx
git commit -m "feat(qp-help): floating 🆘 button + 4-option menu component"
```

---

### Task 7: Wire the button into the gameplay view

> **⚠️ 2026-08-07 DISCOVERY (during execution attempt) — plan was wrong on file target and scope.** After reading the code the correct picture is:
>
> - `src/views/QuickPlayStudentView.tsx` is the **join** screen (renders name/avatar/language picker + resume card + error screens). When the student joins successfully it calls `setView("game")` at line ~353 and unmounts. It never renders gameplay, so the button doesn't belong here.
> - `src/views/GameActiveView.tsx` (723 lines) is the actual **gameplay** renderer. It already reads `quickPlayActiveSession` from `useGameRoute()` (line 103, and the branch `gameInProgress && !quickPlayActiveSession` at line 258 proves it already gates behavior on Quick Play vs. regular play). The 🆘 button belongs here, gated on `quickPlayActiveSession != null`.
> - `useGameRoute()` (see `src/views/GameRouteContext.tsx`) exposes `quickPlayActiveSession`, `language`, and `currentWord` — but it does NOT expose the Quick Play `socket`, a `studentUid`, an audio-replay callback, a force-reconnect method, or a translation-toggle state.
> - Real scope for a proper integration: extend `GameRoutesDeps` with 4–5 new fields, thread them from wherever `<GameRouteProvider>` is instantiated (probably `App.tsx` or `AppViewRouter`) through to the provider, then mount in `GameActiveView`. ~1.5–2 hours, not 15–20 min.
> - **Also discovered:** `src/components/QuickPlayGetReady.tsx` exists but has ZERO callers (`grep -r "QuickPlayGetReady"` finds only its own file). The earlier audit that claimed "Get Ready screen shipped" was wrong — the component was written but never wired in. Not blocking this mission, but worth flagging.

**Files (revised):**
- Modify: `src/views/GameActiveView.tsx` — mount the button, gated on `quickPlayActiveSession != null`
- Modify: `src/views/GameRouteContext.tsx` — add new fields to `GameRoutesDeps` (see below)
- Modify: wherever `<GameRouteProvider>` is instantiated (likely `App.tsx` or `AppViewRouter.tsx`) — supply the new values

**New fields to add to `GameRoutesDeps`:**
- `quickPlaySocket: Socket | null` — the socket the hook needs to emit + subscribe
- `quickPlayStudentUid: string | null` — the student identity (derive from `clientId` or `user?.uid`; needs to match what the server side of Task 4 will use to key rate-limits and route broadcasts — coordinate with Task 4)
- `replayCurrentWordAudio: () => void` — closes over `useAudio` + `currentWord`
- `forceQuickPlayReconnect: () => void` — calls `socket.disconnect().connect()`
- `showTranslation: boolean` + `setShowTranslation: React.Dispatch<React.SetStateAction<boolean>>` — new state that `GameActiveView` reads to render translation overlay

**Interfaces (revised):**
- Consumes: `QuickPlayHelpButton` (Task 6), `useQuickPlayHelp` (Task 5), the 5 new context fields above, and existing `useGameRoute()`.
- Produces: no new exports. Wire-up only.

- [ ] **Step 1: Locate the gameplay-phase render branch**

Read `src/views/QuickPlayStudentView.tsx` around the block that renders the actual game surface (grep for `QuickPlayGetReady` or the `hasStartedPlaying` / `phase === 'gameplay'` guard already in that file). New JSX lands **inside** that branch only, so the button never appears on join / Get Ready / endgame screens.

- [ ] **Step 2: Add the imports at the top of the file**

```typescript
import { QuickPlayHelpButton } from '../components/QuickPlayHelpButton';
import { useQuickPlayHelp } from '../hooks/useQuickPlayHelp';
```

- [ ] **Step 3: Instantiate the hook near the other hooks at the top of the component body**

```typescript
const helpSession = quickPlayActiveSession && quickPlayStudentUid
  ? { sessionCode: quickPlayActiveSession.sessionCode, studentUid: quickPlayStudentUid }
  : null;
const { handRaised, onRaiseHand } = useQuickPlayHelp(quickPlaySocket, helpSession);
```

*(Field names like `quickPlayActiveSession`, `quickPlayStudentUid`, `quickPlaySocket` must match what already exists in this component's scope — if the local names differ, adjust.)*

- [ ] **Step 4: Mount the button inside the gameplay branch**

Inside the JSX branch that renders the active game, near the end (so it sits above other siblings in DOM order):

```tsx
<QuickPlayHelpButton
  language={qpLanguage}
  handRaised={handRaised}
  onRaiseHand={onRaiseHand}
  onReplayAudio={() => audio.play(currentWord?.id)}
  onForceReconnect={() => quickPlaySocket?.disconnect().connect()}
  onToggleTranslation={() => setShowTranslation((v) => !v)}
/>
```

*(If `showTranslation` state does not already exist in this view, add `const [showTranslation, setShowTranslation] = useState(false);` near the other useState calls and pipe it through to the game surface. `audio.play` and `currentWord` similarly must match the existing names — read the file and adjust.)*

- [ ] **Step 5: Typecheck**

Run: `./scripts/typecheck-ratchet.sh`
Expected: exit 0.

- [ ] **Step 6: Manual smoke — dev server**

Run: `npm run dev`, open Quick Play as a student in a browser, join a fake session, get into gameplay. Verify:
- 🆘 button appears bottom-right during gameplay only.
- Tap opens menu with 4 options.
- Tap "I can't hear the word" → word audio plays again + menu closes.
- Tap "The game looks frozen" → socket briefly disconnects and reconnects.
- Tap "I can't read this" → translation shows/hides.
- Tap "Show my teacher" → button greys to ✓; 60s later returns to 🆘.

- [ ] **Step 7: Commit**

```bash
git add src/views/QuickPlayStudentView.tsx
git commit -m "feat(qp-help): mount 🆘 help button in gameplay phase"
```

---

### Task 8: Teacher-side badges + counter in `QuickPlayMonitor`

**Files:**
- Modify: `src/components/QuickPlayMonitor.tsx`
- Test: `src/__tests__/QuickPlayMonitor.raiseHand.test.tsx` (targeted — tests only the new badge + counter behavior, not the whole 2363-line component)

**Interfaces:**
- Consumes: `QP_SERVER_EVENTS.STUDENT_HAND_RAISED`, `QP_EVENTS.TEACHER_ACK_HELP` from Task 3; the existing `Student` type inside `QuickPlayMonitor` and its socket connection.
- Produces: no exports change. Internal Student type gains a `handRaisedAt: number | null` field; new sub-component `RaisedHandBadge` and helper `handRaisedCount(students)` land inside the file for encapsulation.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/__tests__/QuickPlayMonitor.raiseHand.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RaisedHandBadge, handRaisedCount } from '../components/QuickPlayMonitor';

describe('QuickPlayMonitor raise-hand pieces', () => {
  describe('handRaisedCount', () => {
    it('counts only students whose handRaisedAt is a number', () => {
      const students = [
        { handRaisedAt: null },
        { handRaisedAt: 1000 },
        { handRaisedAt: null },
        { handRaisedAt: 2000 },
      ];
      expect(handRaisedCount(students as never)).toBe(2);
    });

    it('returns 0 for an empty list', () => {
      expect(handRaisedCount([])).toBe(0);
    });
  });

  describe('RaisedHandBadge', () => {
    it('renders the emoji when count > 0', () => {
      render(<RaisedHandBadge count={3} onClear={() => {}} />);
      expect(screen.getByText(/3/)).toBeTruthy();
      expect(screen.getByText(/🙋/)).toBeTruthy();
    });

    it('renders nothing when count is 0', () => {
      const { container } = render(<RaisedHandBadge count={0} onClear={() => {}} />);
      expect(container.firstChild).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/QuickPlayMonitor.raiseHand.test.tsx`
Expected: FAIL — `RaisedHandBadge` and `handRaisedCount` are not exported.

- [ ] **Step 3: Extend the internal `Student` type**

In `src/components/QuickPlayMonitor.tsx`, find the existing `Student` type (grep for `interface Student` or `type Student`). Add:

```typescript
handRaisedAt: number | null;
```

Initialize new students with `handRaisedAt: null` in whatever helper builds Student objects.

- [ ] **Step 4: Add the helper + badge sub-component (exported for tests)**

Near the top of `QuickPlayMonitor.tsx`, after imports:

```tsx
export function handRaisedCount(students: Array<{ handRaisedAt: number | null }>): number {
  return students.filter((s) => typeof s.handRaisedAt === 'number').length;
}

interface RaisedHandBadgeProps {
  count: number;
  onClear: () => void;
}

export function RaisedHandBadge({ count, onClear }: RaisedHandBadgeProps) {
  if (count <= 0) return null;
  return (
    <button
      type="button"
      onClick={onClear}
      className="rounded-full bg-pink-100 px-3 py-1 text-xs font-bold text-pink-900"
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
    >
      🙋 {count} need help
    </button>
  );
}
```

- [ ] **Step 5: Wire the socket listeners inside `QuickPlayMonitor`**

Add a `useEffect` alongside the existing socket subscriptions:

```typescript
useEffect(() => {
  if (!socket || !sessionCode) return;
  const onRaised = (p: StudentHandRaisedPayload) => {
    setStudents((prev) => prev.map((s) =>
      s.studentUid === p.studentUid ? { ...s, handRaisedAt: p.raisedAt } : s,
    ));
  };
  socket.on(QP_SERVER_EVENTS.STUDENT_HAND_RAISED, onRaised);
  return () => { socket.off(QP_SERVER_EVENTS.STUDENT_HAND_RAISED, onRaised); };
}, [socket, sessionCode]);

const clearOne = (studentUid: string) => {
  socket?.emit(QP_EVENTS.TEACHER_ACK_HELP, { sessionCode, studentUid });
  setStudents((prev) => prev.map((s) =>
    s.studentUid === studentUid ? { ...s, handRaisedAt: null } : s,
  ));
};

const clearAll = () => {
  socket?.emit(QP_EVENTS.TEACHER_ACK_HELP, { sessionCode, studentUid: 'all' });
  setStudents((prev) => prev.map((s) => ({ ...s, handRaisedAt: null })));
};
```

*(Field / setter names must match what already exists in `QuickPlayMonitor` — `setStudents`, `sessionCode`, and `socket` are placeholders; read the file's existing state hooks and adjust.)*

- [ ] **Step 6: Render the badge in the header + the emoji on each raised student's card**

In the header JSX block (near where the class name / student count already render):

```tsx
<RaisedHandBadge count={handRaisedCount(students)} onClear={clearAll} />
```

Inside each student's leaderboard card, add:

```tsx
{student.handRaisedAt !== null && (
  <button
    type="button"
    onClick={() => clearOne(student.studentUid)}
    aria-label="Clear raised hand"
    className="ml-2 text-2xl"
    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
  >
    🙋
  </button>
)}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/QuickPlayMonitor.raiseHand.test.tsx`
Expected: 4 tests pass.

- [ ] **Step 8: Typecheck**

Run: `./scripts/typecheck-ratchet.sh`
Expected: exit 0.

- [ ] **Step 9: Commit**

```bash
git add src/components/QuickPlayMonitor.tsx src/__tests__/QuickPlayMonitor.raiseHand.test.tsx
git commit -m "feat(qp-help): teacher-side raised-hand badge + counter + ack handlers"
```

---

### Task 9: End-to-end smoke test

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Open two browser windows**

- Window A (teacher): navigate to a teacher account, create a Quick Play session, open the `QuickPlayMonitor` view.
- Window B (student): scan/type the session code, join as a student, get through Get Ready into gameplay.

- [ ] **Step 3: Walk the full flow**

Verify each in order:

1. 🆘 button visible bottom-right in Window B during gameplay.
2. Tap 🆘 → menu opens with all 4 options localized to the student's picked language.
3. Tap "I can't hear the word" → word audio plays again in Window B.
4. Tap "The game looks frozen" → Window B briefly disconnects (banner flashes) and rejoins.
5. Tap "I can't read this" → translation appears / disappears.
6. Tap "🙋 Show my teacher" → in Window B the button greys to ✓; in Window A the student's card gains a 🙋 badge and the header shows "🙋 1 need help".
7. Rapidly tap "Show my teacher" 6+ times in Window B — Window A's badge count stays at 1 (rate limit working; excess dropped silently).
8. In Window A, tap the 🙋 emoji on the student's card → in Window B the ✓ pill disappears, 🆘 button returns.
9. Raise hand again in Window B, wait 60 s without touching Window A → button auto-returns to 🆘.

- [ ] **Step 4: Run the full CI checks**

Run:
```bash
npm test
./scripts/typecheck-ratchet.sh
npm run build
npm run check:entry-closure
```
Expected: all four exit 0.

- [ ] **Step 5: Commit any small fix-ups discovered during smoke**

```bash
git add -p # inspect and stage only fix hunks
git commit -m "fix(qp-help): smoke-test fixes"
```
