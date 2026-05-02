# Pending Operator Tasks

These are actions the human needs to take — no code change will cover them.

---

## 1. Apply pending Supabase migrations

Paste each into **Supabase → SQL Editor**:

```
20260428134000_security_high_revoke_anon_after_recreate.sql
20260428140000_first_rating_columns.sql
20260428141000_security_med_quick_play_sessions.sql
20260428142000_security_med_class_rpc_admin.sql
20260428150000_quick_play_ratings.sql
```

Each is idempotent (safe to re-run). First four close audit findings; last enables QP guest ratings.

---

## 2. Verify all migrations live

Run verification SQL in `docs/SECURITY-OVERVIEW.md` (4-row CTE). Should return all-green.

---

## 3. Run live pen-test

```bash
./scripts/security-pen-test.sh   # needs .env.local or env vars
```

Expected: 4 passed, 0 failed.

---

## 4. (Optional) UptimeRobot ping

Fly Starter has no cold starts but still good belt-and-suspenders.

---

## 5. Regenerate + re-upload motivational audio

If phrase audio is still mismatched:

```bash
npx tsx scripts/generate-motivational.ts
npx tsx scripts/upload-motivational.ts   # needs .env.local with service_role key
```

---

## 6. Configure Supabase email + magic-link template for teacher OTP

**Authentication → Providers → Email:** enable + Email OTP length = **6** digits (default 8 won't validate).

**Authentication → Email Templates → Magic Link:** paste styled template from OTP shipping notes — must include `{{ .Token }}`. Subject: `Vocaband sign-in code: {{ .Token }}`.

---

## 7. Merge `claude/fix-points-display-9Q4Dw` → `main`

All 2026-04-29/30 work (OCR final fix via in-page camera, PWA install banner, 3 new dashboard themes, teacher OTP login, full student i18n) only ships on this branch's preview deploy until merged.
