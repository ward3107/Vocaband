# Pending Operator Tasks

These are actions the human needs to take — no code change will cover them.

> **Last reconciled with production:** 2026-05-07. The April-28 security
> migration backlog is closed; pen-test passes 9/9. Remaining items are
> the May/June feature migrations (with collision-investigation needed)
> and the operational tasks #2–#4 below.

---

## ✅ DONE 2026-05-07 — April-28 security migration backlog

Applied to production via MCP, in order:

```
20260428120000_teacher_dashboard_theme
20260428130000_security_high_save_progress_auth
20260428131000_security_high_quick_play_joins
20260428132000_security_high_award_reward
20260428133000_security_med_teacher_profiles
20260428134000_security_high_revoke_anon_after_recreate
20260428140000_first_rating_columns
20260428141000_security_med_quick_play_sessions
20260428142000_security_med_class_rpc_admin
20260428150000_quick_play_ratings
20260430073933_saved_word_groups
20260501022528_saved_word_groups_by_email
```

12 migrations total. All idempotent. Pen-test passed 9/9 (`scripts/security-pen-test.sh`). No new advisors flagged.

---

## ✅ DONE 2026-05-07 — June collision investigation

Verified via DB introspection that the 3 local June files (`20260609_vocabagrut`, `20260610_school_inquiries`, `20260611_teacher_plan_and_trial`) were pure duplicates of earlier-applied versions (`20260506130131_vocabagrut`, `20260507104138_school_inquiries`, `20260507121937_teacher_plan_and_trial`). Deleted the duplicates from local repo (commit `f07b76d`).

## ⚠️ PENDING — June feature migrations (no collisions)

Five June migrations are unambiguous and safe to apply once you're ready:

```
20260605_cleanup_expired_data_cron
20260605_daily_missions
20260606_pet_evolution
20260607_spaced_repetition
20260608_teacher_onboarded_at
```

These are feature additions (cron job, daily missions, pet evolution system, spaced repetition, teacher onboarding timestamp). Lower urgency than security — defer until ready to ship those features.

---

## 1. (OPTIONAL) Regenerate + re-upload motivational audio

If phrase audio is still mismatched:

```bash
npx tsx scripts/generate-motivational.ts
npx tsx scripts/upload-motivational.ts   # needs .env.local with service_role key
```

---

## 2. Configure Supabase email + magic-link template for teacher OTP

**Authentication → Providers → Email:** enable + Email OTP length = **6** digits (default 8 won't validate).

**Authentication → Email Templates → Magic Link:** paste styled template from OTP shipping notes — must include `{{ .Token }}`. Subject: `Vocaband sign-in code: {{ .Token }}`.

---

## 3. (OPTIONAL) UptimeRobot ping

Fly Starter has no cold starts but still good belt-and-suspenders.

---

## ✅ DONE earlier — `claude/fix-points-display-9Q4Dw` merged to main

Branch no longer exists in remote (verified 2026-05-07 via `git branch -r`). All 2026-04-29/30 work (OCR final fix via in-page camera, PWA install banner, 3 new dashboard themes, teacher OTP login, full student i18n) shipped.
