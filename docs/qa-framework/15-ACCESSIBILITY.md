# 15 — Accessibility (WCAG 2.1 AA)

> System-wide accessibility audit and test plan. Companion to `docs/WCAG_COMPLETION_SUMMARY.md` and `docs/AccessibilityStatement`.
>
> Key files: `src/components/AccessibilityWidget.tsx`, `src/components/AccessibilityStatement.tsx`, `src/components/Landmarks.tsx`, `src/hooks/useUiScale.ts`.

---

## 1. Purpose

- **What:** Make Vocaband usable by students and teachers with vision, motor, cognitive, and auditory disabilities.
- **Who:** Every user — but disproportionately important for inclusive classrooms.
- **Why:** Legal requirement in Israel (IS 5568); WCAG 2.1 AA target for MoE. Pedagogical inclusion is a brand pillar.
- **Criticality:** **S1** for the AccessibilityWidget and core navigation; **S2** for game-specific affordances.

---

## 2. WCAG 2.1 AA criteria coverage matrix

### Perceivable

| Criterion                    | Coverage                                  | Test scenarios                                  |
|------------------------------|-------------------------------------------|--------------------------------------------------|
| 1.1.1 Non-text content        | Alt text on all images / icons            | A11Y-FUNC-001                                    |
| 1.2.1 Audio-only (Prerecorded)| Captions for any teacher video            | A11Y-FUNC-002                                    |
| 1.3.1 Info and relationships  | Semantic HTML; landmarks                  | A11Y-FUNC-003                                    |
| 1.3.2 Meaningful sequence     | Logical reading order                     | A11Y-FUNC-004                                    |
| 1.3.3 Sensory characteristics | Don't rely on color/shape only            | A11Y-FUNC-005                                    |
| 1.3.4 Orientation             | Works in both                              | A11Y-FUNC-006                                    |
| 1.3.5 Input purpose           | autocomplete attributes                   | A11Y-FUNC-007                                    |
| 1.4.1 Use of color            | Non-color indicator (icon)                | A11Y-FUNC-008                                    |
| 1.4.3 Contrast (Min)          | 4.5:1 text / 3:1 large                     | A11Y-FUNC-009                                    |
| 1.4.4 Resize text             | 200% no loss of content                   | A11Y-FUNC-010                                    |
| 1.4.5 Images of text          | Avoid                                      | A11Y-FUNC-011                                    |
| 1.4.10 Reflow                 | 320px width no horizontal scroll          | A11Y-FUNC-012                                    |
| 1.4.11 Non-text contrast       | 3:1 for UI controls                       | A11Y-FUNC-013                                    |
| 1.4.12 Text spacing            | Override-safe                             | A11Y-FUNC-014                                    |
| 1.4.13 Content on hover/focus | Dismissible, hoverable, persistent       | A11Y-FUNC-015                                    |

### Operable

| Criterion                    | Coverage                                  | Test scenarios                                  |
|------------------------------|-------------------------------------------|--------------------------------------------------|
| 2.1.1 Keyboard               | All interactive accessible by keyboard    | A11Y-FUNC-101                                    |
| 2.1.2 No keyboard trap        | No infinite traps                         | A11Y-FUNC-102                                    |
| 2.1.4 Character key shortcuts | Configurable                              | A11Y-FUNC-103                                    |
| 2.2.1 Timing adjustable       | Game timers configurable / extendable     | A11Y-FUNC-104                                    |
| 2.2.2 Pause, stop, hide       | Auto-playing content                      | A11Y-FUNC-105                                    |
| 2.3.1 Three flashes            | No content flashing > 3x/s                 | A11Y-FUNC-106                                    |
| 2.4.1 Bypass blocks            | Skip-to-content link                       | A11Y-FUNC-107                                    |
| 2.4.2 Page titled              | Unique titles per route                   | A11Y-FUNC-108                                    |
| 2.4.3 Focus order              | Logical                                    | A11Y-FUNC-109                                    |
| 2.4.4 Link purpose             | Descriptive                                | A11Y-FUNC-110                                    |
| 2.4.5 Multiple ways            | Search + navigation                        | A11Y-FUNC-111                                    |
| 2.4.6 Headings and labels      | Descriptive                                | A11Y-FUNC-112                                    |
| 2.4.7 Focus visible            | All focusable items                       | A11Y-FUNC-113                                    |
| 2.5.1 Pointer gestures         | Single-pointer alternative                | A11Y-FUNC-114                                    |
| 2.5.2 Pointer cancellation     | Up-event activation                       | A11Y-FUNC-115                                    |
| 2.5.3 Label in name            | Visible label matches accessible name     | A11Y-FUNC-116                                    |
| 2.5.4 Motion actuation         | Alternative                               | A11Y-FUNC-117                                    |

### Understandable

| Criterion                    | Coverage                                  | Test scenarios                                  |
|------------------------------|-------------------------------------------|--------------------------------------------------|
| 3.1.1 Language of page       | html[lang]                                 | A11Y-FUNC-201                                    |
| 3.1.2 Language of parts       | lang on snippets                          | A11Y-FUNC-202                                    |
| 3.2.1 On focus                | No context change on focus               | A11Y-FUNC-203                                    |
| 3.2.2 On input                | No context change on input               | A11Y-FUNC-204                                    |
| 3.2.3 Consistent nav          | Yes                                        | A11Y-FUNC-205                                    |
| 3.2.4 Consistent identification | Same icons mean same                    | A11Y-FUNC-206                                    |
| 3.3.1 Error identification    | Inline                                     | A11Y-FUNC-207                                    |
| 3.3.2 Labels or instructions  | Yes                                        | A11Y-FUNC-208                                    |
| 3.3.3 Error suggestion        | When known                                | A11Y-FUNC-209                                    |
| 3.3.4 Error prevention         | For destructive actions                  | A11Y-FUNC-210                                    |

### Robust

| Criterion                    | Coverage                                  | Test scenarios                                  |
|------------------------------|-------------------------------------------|--------------------------------------------------|
| 4.1.1 Parsing                | Valid HTML                                 | A11Y-FUNC-301                                    |
| 4.1.2 Name, role, value       | All custom widgets                        | A11Y-FUNC-302                                    |
| 4.1.3 Status messages         | aria-live regions                         | A11Y-FUNC-303                                    |

---

## 3. Accessibility widget

`AccessibilityWidget.tsx` provides on-the-fly controls. Required:

- Text size scaler (90% → 130%)
- High-contrast mode
- Reduce motion
- Hide animations entirely
- Larger touch targets
- Read-aloud toggle (TTS for UI)
- Keyboard-shortcut help

| ID            | Check                                                              | Expected                                                          |
|---------------|--------------------------------------------------------------------|-------------------------------------------------------------------|
| A11Y-WIDGET-001 | Widget reachable from every screen                                 | Yes                                                               |
| A11Y-WIDGET-002 | State persists across reload                                       | localStorage                                                      |
| A11Y-WIDGET-003 | Applies CSS via classes on `<html>`                                | Yes                                                               |
| A11Y-WIDGET-004 | All sub-controls keyboard-operable                                 | Yes                                                               |
| A11Y-WIDGET-005 | Doesn't interfere with games                                       | Verified                                                          |
| A11Y-WIDGET-006 | Hidden from non-applicable screens (per PR #825)                   | Verified                                                          |

---

## 4. Screen reader matrix

| OS / SR                       | Tested for         | Notes                                          |
|-------------------------------|--------------------|------------------------------------------------|
| iOS / VoiceOver               | Student paths      | RTL voice switching                            |
| Android / TalkBack            | Student paths      | Same                                           |
| macOS / VoiceOver             | Teacher paths      | OAuth, dashboard, wizard                       |
| Windows / NVDA                | Teacher paths      | Same                                           |
| Windows / JAWS                | Sampling           | Critical flows                                 |

---

## 5. Manual audit checklist (per release)

- [ ] Tab through every screen — focus visible always.
- [ ] Skip-to-content works.
- [ ] All forms submit via Enter on focused submit button.
- [ ] All buttons reachable; no traps.
- [ ] Modals capture focus; Esc closes.
- [ ] Live region updates announce.
- [ ] No autoplay audio/video without user consent.
- [ ] No flashing > 3 per second.
- [ ] Color contrast on every text + icon.
- [ ] Page title unique per route.
- [ ] Headings hierarchical (h1 once, then h2/h3).
- [ ] Lang attribute correct.
- [ ] Touch targets ≥ 44×44px.
- [ ] Works at 200% zoom.

---

## 6. Automation

| Tool          | Coverage                                                       |
|---------------|----------------------------------------------------------------|
| axe-core (Playwright) | Automated WCAG checks per route                         |
| Pa11y CI       | URLs in CI                                                     |
| Lighthouse    | Accessibility category in PR builds                            |
| Storybook a11y addon | Component-level                                       |

**P0**: axe-core in CI on every route; fail PR on new violations. **P1**: manual VoiceOver pass per release.

---

## 7. Production readiness

| Dimension              | Score |
|------------------------|-------|
| Coverage of WCAG 2.1 AA | 3     |
| Automated tests         | 2     |
| Manual audit            | 3     |
| Accessibility statement | 4     |
| Widget                  | 4     |

**Module readiness: 3.2 / 5.**

---

## 8. Success metrics

| KPI                                | Acceptable | Warning  | Critical |
|------------------------------------|------------|----------|----------|
| axe-core violations / route         | 0          | 1–3      | > 3      |
| Lighthouse a11y score               | ≥ 95       | 80–95    | < 80     |
| Manual audit issues / release        | 0 critical | 1 critical | > 1 |
| Inclusivity complaints              | 0          | 1        | > 1      |

---

## 9. Self-QA Validation

**Missed initially:**
1. **Mixed-direction reading order** — added via I18N-FUNC-011 cross-reference.
2. **Read-aloud TTS toggle** — added to widget requirements.
3. **Page title uniqueness per route** — added to checklist.

**Dangerous assumptions:**
- "axe-core is enough" — it misses ~30% of issues; manual + SR critical.
- "All teachers use a desktop" — not in pilot; tablet TalkBack matters.

**Hidden failures:**
- Animations triggered by new features without reduced-motion respect.
- Color tokens drifting from contrast targets when designers add new gradients.
