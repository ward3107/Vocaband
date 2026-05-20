# 02 — Class Management Module

> Teacher-facing class CRUD, roster, class-code rotation, archive, and dashboard cards. Builds on auth module and is upstream of assignments + live challenge.
>
> Key files: `src/views/TeacherDashboardView.tsx`, `src/views/TeacherDashboardSection.tsx`, `src/components/ClassCard.tsx`, `src/components/ClassRosterModal.tsx`, `src/components/AvatarPicker.tsx`, `src/views/ClassroomView.tsx`, `src/views/ClassShowView.tsx`, `src/hooks/useTeacherActions.ts`, `src/hooks/useTeacherData.ts`, `src/hooks/useClassSwitch.ts`.

---

## 1. Purpose of Module

- **What:** CRUD operations on classes; manage student roster (add, rename, remove, restore); rotate class codes; archive/unarchive classes; view roster + per-student progress.
- **Who:** Teachers; school admins via teacher role.
- **Why:** A class is the unit of organization — students, assignments, live challenges all belong to one. Mismanaged classes leak data across cohorts.
- **Criticality:** **S1** — class-code rotation must be authoritative and immediate; orphaned students must not appear in someone else's class.

---

## 2. User Flow Mapping

### 2.1 Create class (happy)

```
TeacherDashboardView mounts
→ "+ New class" tapped → ClassCard wizard opens
→ form: name, grade, subject, color, avatar
→ submit → useTeacherActions.createClass
→ POST /rest/v1/classes via supabase-js (RLS: teacher_id = auth.uid())
→ server generates class_code (5-char A–Z+digits, ambiguous chars excluded)
→ realtime refresh of dashboard list (useDashboardPolling)
→ new card animates in
```

### 2.2 Add students manually

```
Teacher opens ClassRosterModal
→ "+ Add students" → enters newline-separated names or paste from spreadsheet
→ useTeacherActions.addStudentsBulk
→ RPC adds students with role=student, class_id, display_name normalized
→ list refreshes; duplicates flagged
```

### 2.3 Student self-join with class code

(Covered in `01-AUTH-MODULE.md` §2.3.) Teacher sees new students appear in roster within polling interval (currently ~30s) or via Supabase realtime if subscribed.

### 2.4 Rotate class code

```
Teacher → ClassCard menu → "Rotate code"
→ Confirmation modal: "All students will need the new code"
→ useTeacherActions.rotateClassCode
→ RPC mutates classes.class_code (transactional)
→ active student sessions remain (existing JWTs valid)
→ teacher sees new code; can copy
```

### 2.5 Archive / unarchive

```
Teacher → ClassCard menu → "Archive"
→ Confirmation modal
→ useTeacherActions.archiveClass
→ Soft-delete: classes.archived = true
→ removed from dashboard list; restoration available in "Archived classes"
```

### 2.6 Remove a student

```
Teacher → ClassRosterModal → student row → "Remove"
→ Confirmation modal
→ RPC: student.class_id = null OR moved to archived class
→ Student still has account (if they have one) but no class
→ Their open sessions show "Class not found" or banner
```

### 2.7 Failure paths

| Path                                        | Detection                                          | Recovery                                                                              |
|---------------------------------------------|----------------------------------------------------|---------------------------------------------------------------------------------------|
| Duplicate class code (1-in-a-billion)        | DB UNIQUE violation                                | Auto-retry with new code; transparent to user                                          |
| Network failure during create                | Promise reject from supabase-js                    | Toast + retry; card not added optimistically (or rolled back)                          |
| Teacher tries to add 1000 students at once   | Slow request                                       | Chunked (50 at a time); progress bar                                                   |
| Two teachers editing same class (rare)       | Last-write-wins                                    | Realtime sync corrects; surface "Updated by another teacher" toast if conflict        |

---

## 3. Functional QA Scenarios

| ID            | Scenario                                                                | Steps                                                                                          | Expected                                                                                                              | Severity | Priority |
|---------------|--------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------|----------|----------|
| CLASS-FUNC-001 | Create class — happy                                                    | Open dashboard → + New → fill fields → submit                                                  | New card appears; class_code visible; teacher can copy to clipboard                                                    | S2       | P0       |
| CLASS-FUNC-002 | Class name 50+ chars                                                    | Submit `"X" * 200`                                                                              | Validation error or server truncation; no UI breakage                                                                  | S3       | P2       |
| CLASS-FUNC-003 | Class name with emoji + RTL                                             | `"כיתה ה1 🎉"`                                                                                    | Persisted as UTF-8; renders correctly in HE                                                                            | S3       | P2       |
| CLASS-FUNC-004 | Duplicate class names                                                   | Create "5A" twice                                                                              | Allowed (different codes); UI distinguishes by code or color                                                           | S4       | P3       |
| CLASS-FUNC-005 | Bulk add 30 students                                                    | Paste 30 newline-separated names                                                               | All added; duplicates flagged; UI updates progressively                                                                | S2       | P1       |
| CLASS-FUNC-006 | Bulk add with duplicate name                                            | Paste "Yael\nYael"                                                                              | Two distinct rows; teacher warned                                                                                      | S3       | P2       |
| CLASS-FUNC-007 | Rotate class code                                                       | Existing class → Rotate → confirm                                                              | New code shown immediately; old code rejected on next student login attempt within 60s                                 | S2       | P0       |
| CLASS-FUNC-008 | Active students continue with old session after rotation                | Rotate while student is mid-game                                                               | Game completes; student does not get logged out (JWT independent of class_code)                                        | S2       | P1       |
| CLASS-FUNC-009 | Archive class                                                           | Class menu → Archive                                                                            | Card removed from main list; reappears in Archived section                                                             | S3       | P1       |
| CLASS-FUNC-010 | Unarchive class                                                         | Archived list → Restore                                                                         | Card returns; all students still associated; assignments intact                                                        | S3       | P1       |
| CLASS-FUNC-011 | Remove single student                                                   | Roster → Remove on a row                                                                       | Student moved off class; their progress retained                                                                        | S2       | P1       |
| CLASS-FUNC-012 | Rename student                                                          | Roster → student row → rename                                                                  | Updated; appears in leaderboard with new name on next refresh                                                          | S3       | P1       |
| CLASS-FUNC-013 | Move student between classes                                            | (If feature exists) drag or select target class                                                | Foreign key updated; old class roster loses entry; new class roster gains it                                           | S3       | P2       |
| CLASS-FUNC-014 | Class avatar change                                                     | Class settings → pick new avatar                                                                | Avatar replaces across cards, ClassroomView, leaderboards                                                              | S4       | P2       |
| CLASS-FUNC-015 | Class color change                                                      | Class settings → pick new color gradient                                                       | Gradient updates everywhere within one render                                                                          | S4       | P2       |
| CLASS-FUNC-016 | Click class card                                                        | Tap on a class card                                                                            | Routes to ClassShowView with roster + assignments                                                                      | S2       | P0       |
| CLASS-FUNC-017 | Copy class code button                                                  | Tap copy icon on class card                                                                    | Code copied; toast "Copied"; `useClipboardFeedback` triggers                                                            | S3       | P1       |
| CLASS-FUNC-018 | QR code for class                                                       | Class details → Show QR                                                                         | QR encodes class_code or join URL; rescannable                                                                          | S3       | P2       |
| CLASS-FUNC-019 | Switch class context (teacher with many classes)                        | `useClassSwitch` toggles                                                                        | Dashboard shows correct active class; assignments filtered                                                              | S3       | P1       |
| CLASS-FUNC-020 | Empty state                                                             | Teacher has 0 classes                                                                           | Empty state with "Create your first class" CTA                                                                          | S3       | P1       |

---

## 4. Edge Cases & Failure Injection

### 4.1 Data edge cases

| ID            | Input                                                                | Expected                                                                  |
|---------------|----------------------------------------------------------------------|---------------------------------------------------------------------------|
| CLASS-EDGE-001 | Class name = `<img src=x onerror=alert(1)>`                          | Stored as text; never rendered as HTML                                    |
| CLASS-EDGE-002 | Class name pure whitespace                                            | Validation rejects                                                        |
| CLASS-EDGE-003 | Class name with RTL override unicode                                  | Stripped / displayed neutrally                                            |
| CLASS-EDGE-004 | Class with 200 students                                               | UI virtualizes roster; no jank                                            |
| CLASS-EDGE-005 | Class with 0 students                                                 | Empty state                                                               |
| CLASS-EDGE-006 | Class code generation collision                                       | DB unique constraint → auto-retry                                         |
| CLASS-EDGE-007 | Student names with leading/trailing whitespace                        | Normalized; not duplicate-detected against trimmed version                |
| CLASS-EDGE-008 | Student names that look identical but different unicode (`е` vs `e`) | Treat as distinct or warn teacher                                         |

### 4.2 User-behavior edge cases

| ID            | Behavior                                              | Expected                                                          |
|---------------|--------------------------------------------------------|-------------------------------------------------------------------|
| CLASS-EDGE-101 | Double-click "Create class" submit                    | Single class created; idempotency via in-flight ref               |
| CLASS-EDGE-102 | Refresh during bulk add                                | Resumed students saved; partial batch identifiable                |
| CLASS-EDGE-103 | Two tabs editing same roster                          | Realtime sync within 5s; conflicts surfaced                       |
| CLASS-EDGE-104 | Archive class while student is mid-game               | Student finishes current round; no further assignments visible    |
| CLASS-EDGE-105 | Rotate code, then immediately rotate again            | Second rotation succeeds with new code; old codes both invalid    |
| CLASS-EDGE-106 | Add student → undo immediately                        | Soft revert if possible, else explicit delete                     |

### 4.3 Infrastructure edge cases

| ID            | Failure                                  | Expected                                                       |
|---------------|------------------------------------------|----------------------------------------------------------------|
| CLASS-EDGE-201 | Supabase RLS misconfig (regression)     | Pen-test catches: another teacher reads class                  |
| CLASS-EDGE-202 | RPC `rotate_class_code` 500              | Old code remains active; toast surfaced; safe state            |
| CLASS-EDGE-203 | Save queue stalls (`useSaveQueue`)       | Pending edits surface as "Saving..." indicator; eventually flush |
| CLASS-EDGE-204 | Realtime channel disconnect              | Polling fallback (`useDashboardPolling`)                       |

### 4.4 AI edge cases

> Class management module does not call AI. Custom avatar generation (if added) would inherit rules from AI safety section in `14-SECURITY-RLS.md`.

---

## 5. Security QA

| ID           | Attack                                                         | Exploit path                                                                                          | Expected secure behavior                                                                       |
|--------------|----------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|
| CLASS-SEC-001 | Teacher A reads Teacher B's class                              | PostgREST: `GET /rest/v1/classes?id=eq.<B-class-id>` with A's JWT                                    | RLS returns 0 rows                                                                              |
| CLASS-SEC-002 | Teacher A modifies Teacher B's class                           | `PATCH /rest/v1/classes?id=eq.<B-class-id>` with A's JWT                                              | RLS rejects; 0 rows updated                                                                     |
| CLASS-SEC-003 | Student listing other class's roster                           | Direct `GET /rest/v1/users?class_id=eq.<other-class>`                                                 | RLS only returns own class members' name/avatar; no PII fields beyond minimum                  |
| CLASS-SEC-004 | Stale JWT after class deletion                                 | Student keeps using JWT after class archived                                                          | Server-side check via `is_class_active` returns 403 on writes                                  |
| CLASS-SEC-005 | XSS in class name on dashboard                                 | Inject `<svg onload=...>`                                                                             | Rendered as text node only                                                                      |
| CLASS-SEC-006 | Mass enumeration of class codes by teacher (rogue)             | Loop GET `/api/student/login` from teacher account                                                    | Rate limit applies regardless of role                                                           |
| CLASS-SEC-007 | Bulk add students with crafted names containing JS payloads    | Paste names with HTML                                                                                 | All stored as plaintext; CSP blocks inline scripts even if served                              |
| CLASS-SEC-008 | Teacher attempting to assign role=admin to themselves          | `PATCH users.role`                                                                                    | RLS prevents writes to `role` for non-service-role; only admin RPC may                          |
| CLASS-SEC-009 | Side-channel via class color/avatar                            | Storage URLs do not contain user-identifiable paths                                                   | Avatars stored under randomized keys                                                            |
| CLASS-SEC-010 | Rate limit on class create                                     | Spam create 1000 classes                                                                              | Limit (e.g. 50/hr/teacher); excess returns 429                                                  |

---

## 6. Accessibility QA

| ID             | Check                                                                 | Expected                                                       |
|----------------|----------------------------------------------------------------------|----------------------------------------------------------------|
| CLASS-A11Y-001 | Each class card has `aria-label` with class name + grade             | "Class 5A grade 5, 24 students, open"                          |
| CLASS-A11Y-002 | Keyboard nav: Tab through cards, Enter opens                          | All interactive elements focusable                              |
| CLASS-A11Y-003 | Modal focus trap on roster modal                                      | Focus stays inside; Esc closes                                  |
| CLASS-A11Y-004 | Screen reader on confirmation dialogs                                 | Verbatim dialog text read out                                   |
| CLASS-A11Y-005 | Color-coded class cards have non-color identifier                     | Icon or letter, not gradient alone                              |
| CLASS-A11Y-006 | High-contrast mode                                                    | Borders and text remain legible                                 |
| CLASS-A11Y-007 | RTL layout flips card actions correctly                               | "More" menu on left in HE/AR                                    |

---

## 7. Responsive & Device QA

| ID             | Viewport / Device                          | Check                                                                  |
|----------------|--------------------------------------------|------------------------------------------------------------------------|
| CLASS-RESP-001 | iPhone SE (320px)                          | Class card visible without horizontal scroll                            |
| CLASS-RESP-002 | iPad portrait                              | 2-column grid                                                           |
| CLASS-RESP-003 | Desktop                                    | 3+ column grid; gap consistent                                          |
| CLASS-RESP-004 | Teacher dashboard with 30 classes          | Scroll smooth; lazy-render past the fold                                 |
| CLASS-RESP-005 | Roster modal at 320px                      | Search input + list both visible                                        |
| CLASS-RESP-006 | Long class names truncate with ellipsis    | Tooltip on hover reveals full                                            |
| CLASS-RESP-007 | Avatar picker drag-to-scroll on touch      | Works on iOS Safari                                                      |

---

## 8. Performance QA

| Metric                          | Target          | Critical    |
|---------------------------------|-----------------|-------------|
| Dashboard initial render        | < 1s LCP        | > 3s        |
| Class card animate-in           | < 16ms frame    | > 32ms      |
| Bulk add 50 students            | < 2s            | > 5s        |
| Roster modal open               | < 200ms         | > 500ms     |
| Realtime dashboard refresh      | < 5s after action| > 30s      |
| `useTeacherData` cold fetch     | < 700ms         | > 1.5s      |
| Polling interval                | 30s default     | < 10s seen  |

---

## 9. Database Integrity QA

| ID           | Check                                                                                  | Expected                                                              |
|--------------|----------------------------------------------------------------------------------------|-----------------------------------------------------------------------|
| CLASS-DB-001 | `classes.class_code` UNIQUE                                                            | Verified                                                              |
| CLASS-DB-002 | `classes.teacher_id` FK to `users(id)` with ON DELETE behavior                          | If teacher deleted, classes archived not dropped                      |
| CLASS-DB-003 | RLS: `classes` SELECT only when `teacher_id = auth.uid()` OR student is enrolled       | Verified                                                              |
| CLASS-DB-004 | Index on `users(class_id)`                                                              | Roster lookup fast at 100k students                                   |
| CLASS-DB-005 | Soft-delete via `archived` boolean                                                      | No row deletes — preserves history                                    |
| CLASS-DB-006 | Audit on `class_code` rotations                                                         | `class_code_history` table or audit_log entry                         |
| CLASS-DB-007 | Cascade: archive class → assignments hidden, progress preserved                         | Verified                                                              |
| CLASS-DB-008 | Concurrency: two teachers create class same second                                      | Each gets unique code; no collision                                   |

---

## 10. API QA

### Supabase PostgREST (via supabase-js)

Endpoints typically used: `GET /rest/v1/classes`, `POST /rest/v1/classes`, `PATCH /rest/v1/classes`, `POST /rest/v1/rpc/rotate_class_code`, `POST /rest/v1/rpc/add_students_bulk`.

| ID           | Check                                                                          | Expected                                                            |
|--------------|---------------------------------------------------------------------------------|---------------------------------------------------------------------|
| CLASS-API-001 | RPC `add_students_bulk` validates each name (length, charset)                 | Invalid items returned with index, valid ones inserted              |
| CLASS-API-002 | RPC `rotate_class_code` is `SECURITY DEFINER` with strict caller check        | Only the class's teacher can call                                   |
| CLASS-API-003 | Schema validation on class create (name required, grade enum)                 | 400 on invalid                                                       |
| CLASS-API-004 | Pagination on roster                                                          | Default 50, max 200                                                  |
| CLASS-API-005 | Sort order stable                                                              | `(display_name COLLATE "C", id)`                                    |
| CLASS-API-006 | Errors masked                                                                  | No internal stacktraces leak to client                              |

---

## 11. State Management QA

| ID             | Check                                                                                    | Expected                                                                 |
|----------------|------------------------------------------------------------------------------------------|--------------------------------------------------------------------------|
| CLASS-STATE-001 | Optimistic create rolls back on failure                                                  | Card removed; toast surfaced                                              |
| CLASS-STATE-002 | `useTeacherData` cache invalidated on class create/delete/archive                         | Refetch within 1s                                                         |
| CLASS-STATE-003 | `useClassSwitch` persists last active class to localStorage                              | Restored on reload                                                        |
| CLASS-STATE-004 | Stale roster from previous class not shown when switching                                | Skeleton until new data arrives                                           |
| CLASS-STATE-005 | Polling stops when tab hidden, resumes on focus                                          | `document.visibilityState` aware                                          |

---

## 12. Observability & Monitoring QA

| ID            | Signal                                          | Threshold                                | Indicates                            |
|---------------|--------------------------------------------------|------------------------------------------|--------------------------------------|
| CLASS-OBS-001 | Class create success rate                       | < 99% → alert                            | RLS / DB issue                       |
| CLASS-OBS-002 | Roster mutation latency p95                     | > 2s → alert                             | DB lock / slow RPC                   |
| CLASS-OBS-003 | Class-code rotation count                       | > 10/hr/teacher → review                 | Possible abuse / panic               |
| CLASS-OBS-004 | Archived/unarchived ratio                       | watch for unusual spikes                 | Accidental mass-archive              |
| CLASS-OBS-005 | RLS denial counter                              | spike → investigate                      | Misconfigured policy                 |

---

## 13. QA Automation Strategy

| Layer       | Tool          | Coverage                                                              |
|-------------|---------------|------------------------------------------------------------------------|
| Unit        | Vitest        | `useTeacherActions`, normalizers, code generator                       |
| Integration | Supabase test | RLS policies (positive + negative)                                    |
| E2E         | Playwright    | Create → add students → rotate code → archive → unarchive             |
| Visual      | Playwright    | Class card variants × 4 colors × 3 languages                          |
| Load        | k6            | Simulate 50 teachers creating classes simultaneously                  |
| Security    | OWASP ZAP     | XSS in class name; RLS bypass attempts                                |

Automation priority: **P0** RLS regression tests in CI for `classes`, `users`; **P1** E2E roster lifecycle; **P2** visual class card.

---

## 14. Production Readiness Score (Class Management)

| Dimension       | Score | Notes                                                                                       |
|-----------------|-------|---------------------------------------------------------------------------------------------|
| Functional      | 4     | Mature feature                                                                              |
| Security        | 4     | RLS + audit; rate-limit on class-code rotation not yet verified                              |
| Performance     | 4     | Lazy roster loads, polling, low-cost queries                                                 |
| Accessibility   | 3     | Modal focus traps need review; ARIA labels per card vary                                     |
| Reliability     | 4     | Polling fallback in place                                                                   |
| Observability   | 2     | No formal counters yet                                                                       |
| Data integrity  | 4     | UNIQUE + RLS solid                                                                          |

**Module readiness: 3.6 / 5.**

---

## 15. QA Success Metrics

| KPI                                            | Acceptable | Warning | Critical |
|------------------------------------------------|------------|---------|----------|
| Class create success                           | ≥ 99.5%    | < 99%   | < 95%    |
| Roster mutation p95                            | < 1s       | 1–2s    | > 2s     |
| Realtime refresh delay                         | < 5s       | 5–15s   | > 15s    |
| RLS denial false-positive rate                 | < 0.1%     | 0.1–1%  | > 1%     |
| Polling load on Supabase                       | < 0.5 RPS/teacher | up to 1 | sustained > 1 |
| Defect escape rate / quarter                   | 0 S2       | 1 S2    | any S1   |

---

## 16. Self-QA Validation

**Missed initially:**
1. **Class-code rotation while a Live Challenge is running** — added cross-reference to `05-LIVE-CHALLENGE.md`. The challenge should not use class_code as join key; it uses session id.
2. **Removing the last teacher from a class** — only one teacher per class for now; this assumption deserves a documented constraint.
3. **Audit trail for archive/unarchive** — added CLASS-DB-006 to extend audit_log to class state changes.
4. **Bulk add via CSV file upload** — not in code today; ensure if/when added we test malformed CSV, BOM, encoding.
5. **Avatar URL CSP** — class avatars stored in Supabase Storage; verify Worker CSP allows `img-src https://*.supabase.co`.

**Dangerous assumptions:**
- "Two teachers don't co-own a class" — verify in schema; if false, add concurrency tests.
- "Class code is opaque to students" — students can share their code with anyone; intentional but should be flagged in onboarding for teachers.

**Hidden failures:**
- Polling-only refresh during a busy live challenge could exceed Supabase free-tier read budget; verify with k6 sim.
- Class avatar from Storage could 404 if migrated; UI must fallback gracefully (default avatar).
