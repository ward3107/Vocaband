# Supabase GoTrue auth — rate limits + CAPTCHA walkthrough

> 10-minute operator checklist. Project ref: `ilbeskwldyrleltnxyrp` (vocaband-eu, eu-central-1).
> Companion to `docs/operator-tasks.md` §5 and the threat-model table in `docs/SECURITY-OVERVIEW.md`.

---

## TL;DR

The current Supabase defaults are appropriate for Vocaband. **Verify, don't tighten.**
hCaptcha is NOT safe to enable right now — see §3.

| Setting | Dashboard tab | Current value | Action |
|---|---|---|---|
| Emails sent / hour (project) | Auth → Rate Limits | 30 emails/h | ✅ verify, keep |
| SMS sent / hour (project) | Auth → Rate Limits | 30 sms/h | ✅ verify, keep (we don't use SMS) |
| Token refreshes / 5 min / IP | Auth → Rate Limits | 150 (= 1800/h) | ✅ verify, keep |
| Token (OTP) verifications / 5 min / IP | Auth → Rate Limits | 30 (= 360/h) | ✅ verify, keep |
| Anonymous sign-ins / hour / IP | Auth → Rate Limits | 30 | ✅ verify, keep |
| Sign-ins + sign-ups / 5 min / IP | Auth → Rate Limits | 30 (= 360/h) | ✅ verify, keep |
| Web3 sign-ups + sign-ins / 5 min / IP | Auth → Rate Limits | 30 | ✅ verify, keep (we don't use Web3) |
| Access-token (JWT) expiry | Auth → Sessions | 3600 s (1 h) | ✅ verify, keep |
| Refresh-token expiry | Auth → Sessions | 1 week | ✅ verify, keep |
| hCaptcha on signup/signin | Auth → Attack Protection | OFF | ⛔ DO NOT enable yet — see §3 |

---

## 1. Walkthrough — verify rate limits (5 min)

Open: <https://supabase.com/dashboard/project/ilbeskwldyrleltnxyrp/auth/rate-limits>

Confirm each row matches the **"Current value"** column in the TL;DR. If anything has drifted higher, set it back to the default — the defaults are already at the conservative end for a public app.

Why we don't go lower:
- **Sign-ins / 5 min / IP = 30 (= 360/h)** — a class of 30 students all using PIN login (`signInWithPassword`) at 09:00 from the same school NAT sits exactly at the 5-min ceiling. One retry per student = limit tripped. The share-invite PR analysis (`docs/teacher-share-invites-plan.md` §6) deliberately rejected stricter lockouts for the same reason. **If a school reports "we can't all log in at once", come back here BEFORE blaming the app — and raise this to 60/5min rather than tightening.**
- **OTP verifications / 5 min / IP = 30** — students with email-OTP login on the same school NAT have the same issue.
- **Emails / hour = 30** — only relevant if a project switches off Resend / SES and falls back to Supabase's built-in SMTP. We use Resend, so this never bites.

If a school reports "we can't all log in at once", come back here BEFORE blaming the app.

## 2. Walkthrough — verify JWT + refresh expiry (1 min)

Open: <https://supabase.com/dashboard/project/ilbeskwldyrleltnxyrp/auth/sessions>

Confirm:
- **JWT expiry (access token)**: `3600` seconds (1 hour). Don't extend — a leaked JWT is valid until it expires; longer = bigger blast radius.
- **Refresh token reuse interval**: `10` seconds (default; tolerates network double-fires).
- **Inactivity timeout**: empty / off (we don't force daily re-login).
- **Time-box**: empty / off.

## 3. hCaptcha — ⛔ do NOT enable yet

The dashboard makes hCaptcha sound like a one-click toggle. It is not, for this codebase.

When you enable hCaptcha (Auth → **Attack Protection** → "Enable Captcha protection"), Supabase requires every `signInWithPassword`, `signInWithOtp`, `verifyOtp`, and `signUp` call to include a `captchaToken` in the options. **None of our auth call sites pass that token today** (verified — `grep -r captchaToken src/` returns zero hits as of 2026-05-16).

Flipping it on will immediately break:

| Call site | File | Flow impacted |
|---|---|---|
| `signInWithOtp` | `src/hooks/useTeacherOtpAuth.ts:111` | Teacher email OTP login |
| `verifyOtp` | `src/hooks/useTeacherOtpAuth.ts:141` | Teacher email OTP verification |
| `signInWithPassword` | `src/components/StudentPinLoginCard.tsx:148` | Student PIN login (every student) |
| `signInWithOtp` (student) | `src/components/StudentEmailOtpCard.tsx` | Student email-OTP login |

OAuth flows (`signInWithOAuth` — Google + Microsoft) are **not** affected; Supabase exempts them.

### To enable safely later (engineering task, not operator)

1. Add an hCaptcha widget to `TeacherLoginCard.tsx` and `StudentPinLoginCard.tsx` (and Student email-OTP card).
2. Pass the resolved token into every `signInWith*` / `verifyOtp` call: `options: { captchaToken }`.
3. Add the **hCaptcha site key** to the env (`VITE_HCAPTCHA_SITE_KEY`) and the **secret key** in the Supabase dashboard.
4. Test end-to-end on a staging project before flipping the switch in prod.
5. Estimated effort: ~1–2 hours dev + cross-language i18n strings + RTL layout check.

Until then: **leave hCaptcha OFF**. The current per-IP throttles are doing the work bots would otherwise bypass with stolen credentials anyway.

---

## 4. After verification

1. If anything was drifted and you reset it, paste the screenshot into the Notion *Vocaband — Security* page with the date.
2. Mark `docs/operator-tasks.md` §5 as DONE (or update the values column if you tightened anything).
3. No code change required by this checklist — purely a dashboard verification.
