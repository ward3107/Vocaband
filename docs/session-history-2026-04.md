# Session History — April 2026

Historical record of the `claude/fix-points-display-9Q4Dw` branch workstream. Shipped 31+ commits on 2026-04-28 + follow-up marathon on 2026-04-29/30.

---

## 2026-04-29/30 follow-up session

| Commit | What |
|---|---|
| `3cef114` | OCR — final fix. Replaced `<input type="file" capture="environment">` with in-page `getUserMedia()` camera (`src/components/InPageCamera.tsx`). Old approach launched OS camera app, which let Android Chrome evict Vocaband tab to free RAM on memory-constrained phones. In-page stream sidesteps it entirely. |
| `21df8c8` | i18n: GameModeIntroView + GameActiveView translated EN/HE/AR. Added per-game-mode title + step strings + CTA labels. |
| `a6749de` | i18n: student-login + student-dashboard + shop translated EN/HE/AR. 9 dashboard sub-components touched. ALL student-facing screens now translate. |
| `f2a97be` | PwaInstallBanner — mobile install nudge. Android: capture beforeinstallprompt. iOS: step-by-step Share → Add to Home Screen. 20s warm-up + 14-day cooldown. |
| `f2a97be` | 3 new teacher dashboard themes — Ocean, Berry, Autumn. Brings picker total from 5 → 8. |
| `292612d` | Teacher OTP login — alternative to Google OAuth for shared classroom PCs. Email + 6-digit code. All logic in `src/hooks/useTeacherOtpAuth.ts` + `src/components/TeacherLoginCard.tsx`. |
| `868e287` | OCR — selectedWords ref-wrapper rendered unconditionally for scrollIntoView() target. |
| `4e4b24d` | OCR — SetupWizard's initial-seed useEffect latched with useRef so it only fires once on mount. |
| `81a5f53` | UI — dialed back 2xl: Tailwind variants on QuickPlayMonitor + LiveChallengeView (was sized for 4K, caught every 1080p+). |

---

## 2026-04-28 marathon

### Security (3 HIGH + 3 MED + CodeQL + TLS)

| Migration / commit | Closes |
|---|---|
| `20260428130000_security_high_save_progress_auth.sql` | HIGH: save_progress lacked auth check + scope validation |
| `20260428131000_security_high_quick_play_joins.sql` | HIGH: qp_joins RLS allowed anon enumeration |
| `20260428132000_security_high_award_reward.sql` | HIGH: award_reward missing class-ownership + XP bounds |
| `20260428133000_security_med_teacher_profiles.sql` | MED: teacher_profiles enumerable |
| `20260428134000_security_high_revoke_anon_after_recreate.sql` | followup: re-REVOKE anon after DROP+CREATE |
| `20260428141000_security_med_quick_play_sessions.sql` | MED: quick_play_sessions readable by anon |
| `20260428142000_security_med_class_rpc_admin.sql` | MED: get_class_activity / get_class_mastery missing OR is_admin() |
| `20260428140000_first_rating_columns.sql` | NEW: in-app rating prompt for authenticated users |
| `20260428150000_quick_play_ratings.sql` | NEW: ratings table for QP guests |
| `808462b` | CSP: dropped 'unsafe-eval', added upgrade-insecure-requests |
| `4abd736` | CodeQL HIGH: tainted-format-string — passed req.method/req.path as discrete args |

Plus: SSL Labs grade B → A+ (TLS 1.0/1.1 disabled, HSTS preload submitted).

### Product

| Commit | What |
|---|---|
| `0db465f` | Vocab lazy-load — 376 KB chunk out of landing-page. Desktop PageSpeed 56 → 98. |
| `42a5463` + `d47ad49` | Dashboard UX: Midnight theme text, wider StudentProfile, tooltips, "Struggled with" chips |
| `36caf13` | Reports tab restructure: Top Struggling Words → Assignments tab; Attendance → Students tab |
| `1e18449` | In-app rating prompt: 5★ for teachers, 5-emoji for students |
| `a6cea24` | QP guest rating channel |
| `23df71a` + `fd0988d` | iPhone OCR fix: server stops lying about HEIC; client always converts HEIC → JPEG |
| `e02144f` | OCR diagnostic surface: real error message in modal + console + toast |
| `4ca30ff` + `1b4058b` | Projector clarity: 2xl: variants on QuickPlayMonitor + LiveChallengeView |
| `53e829d` | QP same-nickname re-join: score preserved, kicks inherit |
| `fe88784` | QP redesign: bigger QR (3×), vertical numbered list for rank 4+ |
| `c647951` | NEW /security public page + trust strip |
| `066c217` | Landing redesign: worldwide voice + power-tool cards + Voca Family roadmap |
| `6f8bc5f` | Footer redesigned to 4-column |
| `4447f43` | Privacy/Terms HE+AR de-Israeled; effective date bumped |
| `1e11dbe` | CI: extended phantom-migration repair list |
| `7251146` | i18n: GameModeSelectionView translated (proof of pattern) |

---

## Related docs from this session

| Doc | Purpose |
|---|---|
| `docs/SECURITY-OVERVIEW.md` | Master security posture; threat model; verification |
| `docs/security-audit-2026-04-28.md` | Phase 1+2 findings (deps + RLS) |
| `docs/security-phase3-2026-04-28.md` | Phase 3 findings (CSP / secrets / errors) |
| `docs/db-cost-audit-2026-04-28.md` | DB cost audit |
| `docs/PUBLIC-PAGES-AUDIT-2026-04-28.md` | Privacy/Terms/Security/Accessibility audit |
| `docs/PRICING-MODEL.md` | Schools-first hybrid pricing |
| `docs/GO-TO-MARKET.md` | Zero-cost 90-day playbook |
| `docs/VOCA-FAMILY-ROADMAP.md` | 6 future Vocas planned |
| `docs/I18N-MIGRATION.md` | Pattern for student-page translations |
