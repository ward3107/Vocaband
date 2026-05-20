# 10 — i18n & RTL (Hebrew, Arabic, English)

> Trilingual UI with full Hebrew + Arabic right-to-left support. Student-facing screens fully translated; teacher flows partial.
>
> Key files: `src/hooks/useLanguage.tsx`, `src/hooks/useTranslate.ts`, `src/locales/`, `src/components/LanguageSwitcher.tsx`, `src/components/NavLanguageToggle.tsx`, `src/components/LandingLanguageToggle.tsx`, `docs/I18N-MIGRATION.md`, `docs/TRANSLATIONS-PENDING.md`.

---

## 1. Purpose of Module

- **What:** Cross-cutting i18n layer. Provides translation maps, language switcher, RTL/LTR direction handling, locale persistence.
- **Who:** Every user. Default language often Hebrew for Israeli pilot.
- **Why:** Many students cannot use English-only UIs; MoE requires Hebrew support; Arabic for Arab-Israeli schools.
- **Criticality:** **S1** for student-facing screens. **S2** for teacher screens.

---

## 2. User Flow Mapping

```
App boots → useLanguage initializes
→ reads stored lang from localStorage OR `navigator.language` OR fallback (he)
→ provides { language, setLanguage, isRTL, textAlign, dir, t }
→ html element dir attribute set; body class set; CSS logical properties
→ user switches language via NavLanguageToggle
   → state updated → localStorage updated → re-render
→ child components consume `t(key)` returning string for current language
```

---

## 3. Functional QA Scenarios

| ID            | Scenario                                              | Steps                                                       | Expected                                                                  | Severity | Priority |
|---------------|-------------------------------------------------------|-------------------------------------------------------------|----------------------------------------------------------------------------|----------|----------|
| I18N-FUNC-001 | Default language for new visitor                      | Open landing in incognito                                   | Defaults to HE (per product decision) or browser-detected                 | S2       | P0       |
| I18N-FUNC-002 | Switch EN → HE                                        | Toggle in nav                                               | All visible text translated; layout flips RTL                              | S2       | P0       |
| I18N-FUNC-003 | Switch HE → AR                                        | Toggle                                                      | All text becomes Arabic; layout stays RTL                                 | S2       | P0       |
| I18N-FUNC-004 | Persist language across refresh                       | Switch, refresh                                             | Language retained                                                          | S2       | P1       |
| I18N-FUNC-005 | Mid-game language switch                              | In Classic mode, switch lang                                | UI flips immediately; game state preserved                                | S3       | P1       |
| I18N-FUNC-006 | Missing translation falls back to English             | Force a key missing in HE                                   | English shown; logged to observability; no "undefined"                    | S2       | P1       |
| I18N-FUNC-007 | Plurals                                               | "1 word" vs "2 words"                                       | Locale-aware Intl.PluralRules                                              | S3       | P2       |
| I18N-FUNC-008 | Date / time format                                    | Show due-date for assignment                                | DD/MM/YYYY for HE/AR; per locale                                          | S3       | P2       |
| I18N-FUNC-009 | Numbers                                               | XP "1,000"                                                  | Locale-formatted; HE/AR may use Western digits                            | S3       | P2       |
| I18N-FUNC-010 | Direction-aware icons                                  | "Back" arrow                                                 | Flipped in RTL                                                            | S3       | P1       |
| I18N-FUNC-011 | Mixed-direction text                                   | English word in HE sentence                                  | Bidi correct; no mirroring                                                | S3       | P1       |
| I18N-FUNC-012 | Vocabulary game with English target word in HE UI    | Game round                                                  | Target word LTR even in RTL surrounding UI                                | S2       | P1       |

---

## 4. Edge Cases & Failure Injection

### 4.1 Data edge cases

| ID            | Input                                                          | Expected                                                  |
|---------------|----------------------------------------------------------------|-----------------------------------------------------------|
| I18N-EDGE-001 | Translation contains HTML entities                            | Render as text                                            |
| I18N-EDGE-002 | Translation longer than English (German-like)                  | Layout doesn't break                                      |
| I18N-EDGE-003 | Translation missing → English fallback                        | Yes; warn in dev                                          |
| I18N-EDGE-004 | RTL override characters in user content                        | Stripped                                                   |
| I18N-EDGE-005 | Word "OK" in HE/AR                                             | Translated, not transliterated                            |
| I18N-EDGE-006 | Number "1st" / "2nd"                                            | Locale ordinals via Intl                                  |

### 4.2 User-behavior edge cases

| ID            | Behavior                                                                 | Expected                                                  |
|---------------|--------------------------------------------------------------------------|-----------------------------------------------------------|
| I18N-EDGE-101 | Rapid lang switch (5x in 2s)                                            | Final state correct; no flicker                           |
| I18N-EDGE-102 | Lang switch during route transition                                       | Both apply correctly                                      |
| I18N-EDGE-103 | LocalStorage cleared                                                     | Falls back to browser locale                              |

### 4.3 Infrastructure edge cases

| ID            | Failure                                                | Expected                                                          |
|---------------|--------------------------------------------------------|-------------------------------------------------------------------|
| I18N-EDGE-201 | Web font subset missing for HE/AR                     | System font fallback retains legibility                          |
| I18N-EDGE-202 | Network blocks font CDN                                | System font fallback                                              |
| I18N-EDGE-203 | Locale JSON build size grows past budget               | CI fails the build                                                |

---

## 5. Security QA

| ID           | Attack                                          | Exploit                                                                     | Expected secure behavior                                       |
|--------------|-------------------------------------------------|-----------------------------------------------------------------------------|----------------------------------------------------------------|
| I18N-SEC-001 | XSS via translation value                       | Translation contains `<script>`                                              | Translations are static, but render via React text             |
| I18N-SEC-002 | Locale switcher that loads external JSON         | Crafted lang code                                                            | Locale code allowlist                                          |
| I18N-SEC-003 | RTL override in display name causing UI spoof    | `name="‮admin‎"`                                                              | Normalize: strip override characters                           |

---

## 6. Accessibility QA

| ID             | Check                                                     | Expected                                                  |
|----------------|-----------------------------------------------------------|-----------------------------------------------------------|
| I18N-A11Y-001  | `<html lang>` matches current language                    | Yes                                                       |
| I18N-A11Y-002  | `dir` attribute on html                                  | Yes                                                       |
| I18N-A11Y-003  | Screen reader switches voice for HE/AR                    | Yes (depends on OS)                                       |
| I18N-A11Y-004  | Focus rings visible in RTL                                | Yes                                                       |
| I18N-A11Y-005  | Tab order natural in RTL                                  | Right-to-left logical                                     |
| I18N-A11Y-006  | Mixed-direction selectable text                            | Selection coherent                                        |

---

## 7. Responsive & Device QA

| ID            | Device                                  | Check                                                                |
|---------------|-----------------------------------------|----------------------------------------------------------------------|
| I18N-RESP-001 | iOS Safari with HE keyboard              | Input correctly typed                                                |
| I18N-RESP-002 | Android with AR keyboard                 | Same                                                                  |
| I18N-RESP-003 | Long HE/AR strings on small screens      | No overflow                                                          |
| I18N-RESP-004 | RTL flex layouts                          | Use `flex-row-reverse` only when `isRTL`                              |

---

## 8. Performance QA

| Metric                                | Target           | Critical    |
|--------------------------------------|------------------|-------------|
| Locale switch render                  | < 200ms          | > 500ms     |
| Locale JSON size (per language)       | < 50KB gz        | > 100KB gz  |
| Initial bundle includes only one locale | yes             | no          |
| Font subset loaded                    | < 80KB gz / lang | > 150KB     |

---

## 9. Database / Data Integrity QA

| ID           | Check                                                                | Expected                                                  |
|--------------|----------------------------------------------------------------------|-----------------------------------------------------------|
| I18N-DB-001  | Locale keys are stable IDs (no English text as key)                  | Yes (preferred)                                           |
| I18N-DB-002  | Missing key audit in CI                                              | Yes                                                       |
| I18N-DB-003  | Locale files committed; no runtime fetch from external CDN            | Yes                                                       |

---

## 10. State Management QA

| ID              | Check                                                                | Expected                                              |
|-----------------|----------------------------------------------------------------------|-------------------------------------------------------|
| I18N-STATE-001  | Language context provides stable references                          | useCallback / useMemo                                 |
| I18N-STATE-002  | Switching language doesn't unmount entire app                        | Reactive re-render                                    |
| I18N-STATE-003  | Direction state synced with language                                  | Yes                                                   |

---

## 11. Observability & Monitoring QA

| ID            | Signal                                          | Threshold              | Indicates                          |
|---------------|--------------------------------------------------|------------------------|------------------------------------|
| I18N-OBS-001  | Missing-key events                              | any in prod → review   | Coverage gap                       |
| I18N-OBS-002  | Distribution of language used                    | watch                  | Product focus                      |

---

## 12. QA Automation Strategy

| Layer       | Tool         | Coverage                                                       |
|-------------|--------------|----------------------------------------------------------------|
| Unit        | Vitest       | useLanguage initial value, switch, persistence                 |
| Data        | Custom script| All locale keys present in en + he + ar                       |
| E2E         | Playwright   | Switch lang, navigate, assert correct text + dir              |
| Visual      | Playwright   | Per-screen snapshots × 3 languages                             |

**P0**: missing-key CI audit. **P1**: visual diff suite per language.

---

## 13. Production Readiness Score (i18n)

| Dimension       | Score | Notes                                                                                       |
|-----------------|-------|---------------------------------------------------------------------------------------------|
| Functional      | 4     | Student paths covered                                                                       |
| Security        | 4     | Static; no UGC                                                                              |
| Performance     | 4     | Locale-split bundles                                                                        |
| Accessibility   | 4     | dir + lang attributes correct                                                               |
| Reliability     | 4     | No runtime deps                                                                             |
| Observability   | 3     | Some logging                                                                                |
| Data integrity  | 4     | CI guard                                                                                    |

**Module readiness: 3.9 / 5.**

---

## 14. QA Success Metrics

| KPI                                | Acceptable | Warning  | Critical |
|------------------------------------|------------|----------|----------|
| Missing-translation log events     | 0          | 1–10/day | > 10/day |
| Visual regressions per release      | 0          | 1–3      | > 3      |
| Locale switch latency               | < 200ms    | 200–500  | > 500ms  |

---

## 15. Self-QA Validation

**Missed initially:**
1. **Mixed-direction text (LTR English word in RTL sentence)** — added I18N-FUNC-011/012; needs explicit BIDI tests.
2. **Date format per locale** — added I18N-FUNC-008.
3. **RTL flex layouts** — covered in I18N-RESP-004.
4. **RTL override character defense** — added I18N-SEC-003.

**Dangerous assumptions:**
- "Browser font fallback is acceptable for HE/AR" — verify legibility on iOS + Android system fonts.
- "Translation count is small" — grows quickly; CI guard required.

**Hidden failures:**
- iOS Safari sometimes ignores `lang` attribute for SR voice — verify.
- Long Arabic strings wrap awkwardly; need explicit `word-break` policy.
