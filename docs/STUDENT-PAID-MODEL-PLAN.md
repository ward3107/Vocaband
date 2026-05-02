# Student-Paid Model — Plan

> **Status:** Strategic spec / not yet built. Captures the design we
> discussed in early-May 2026 for letting students buy and use
> Vocaband independently of a teacher. Doc survives session resets;
> revisit when ready to start.

## Context — why this exists

Today Vocaband is **teacher-driven**: a teacher curates words, creates
assignments, and students play those. The student is a passive
recipient; the teacher is the "curriculum brain."

Several promising audiences ask whether they can use Vocaband WITHOUT
a teacher:

- **Parents** of school-age kids who want extra at-home practice
- **Bagrut prep** students cramming for the Israeli matriculation exam
- **Adult learners** picking up English on their own
- **Arab-sector students** who don't have a Vocaband-using teacher but want HE/EN/AR vocab

If we keep saying "you need a teacher first," we leave that audience
on the table. This doc lays out the path to add a **student-paid
self-directed mode** — without breaking the existing teacher product.

---

## The core problem to solve

Without a teacher telling them what to study, the student has no idea
**what to play**. Solve that and 80% of the work is done. Three
feasible engines:

| Engine | How it works | Effort |
|---|---|---|
| **Curriculum-based** | Student picks "I'm in 7th grade" → app feeds Set 2 in chapter order. Israeli MoE structure already encoded in `level: "Set 1" | "Set 2" | "Set 3"`. | ~1 week |
| **Diagnostic + adaptive** | 5-min placement test → app picks level (A1/A2/B1/B2) → daily lesson queue ranked by past performance + spaced repetition | ~3 weeks |
| **Theme-based** | Student picks "Travel" / "Food" / "School" / "Sports" → AI Lesson Builder generates a session on demand. Pairs naturally with `docs/AI-LESSON-BUILDER-PLAN.md`. | ~2 weeks (assuming AI Lesson Builder Phase 1 has shipped) |

**Recommendation:** layer all three. Diagnostic up front to set the
level; curriculum as the default backbone; themes as an "I'm bored,
give me something different" escape hatch.

---

## Engagement loop (replaces teacher accountability)

A teacher's job is partly content, partly accountability. Without
one, the app needs to fill the accountability gap. Some pieces
already exist; others are new:

| Mechanism | Status | Notes |
|---|---|---|
| Daily streaks | ✅ already shipped | Becomes the central retention hook |
| XP + levels + achievements | ✅ already shipped | Already wired in `student-dashboard.ts` |
| Daily goal | partial | Today the teacher sets it; for self-study, app picks a default ("Master 5 new words") |
| Spaced repetition | ❌ not built | Re-test wrong-answer words at increasing intervals (1d → 3d → 7d → 30d). Anki-style. Critical for long-term vocab retention. ~2 weeks |
| Push notifications | ❌ not built | PWA `Notification` API + service-worker push. ~1 week |
| Email reminders | partial | Resend already wired for OTP; reuse for daily reminders |
| Goals + missions | ❌ not built | "Master 100 weather words this month" | ~1 week |
| Leaderboard (global) | partial | Exists for Quick Play / classes; could expand to global / friends-based for self-study |

Spaced repetition is the single biggest one to build — it's what
moves Vocaband from "fun game" to "actually learn vocabulary." Every
serious language app has it; teachers don't need it because they
control the assignment cadence, but solo learners depend on it.

---

## Payment layer

Four pricing models worth considering:

| Model | Pricing | How it works | Best for |
|---|---|---|---|
| **Subscription** | $5-10/mo or $40/yr | Recurring; unlocks all content + premium modes | Most predictable revenue, industry standard (Duolingo Plus, Babbel, Memrise) |
| **Family plan** | $15/mo for up to 5 students | Parent pays once, multiple kids access | Strong fit for Israeli families with multiple school-age kids |
| **Freemium** | Free tier with ads or limited modes; paid tier removes limits | Lowest friction, most users, but lowest conversion | Mass-market plays |
| **One-time** | $30 lifetime | Single payment, lifetime access | Simple but caps revenue; rare in language apps |

**Recommendation:** subscription + family plan combined. Solo student
pays $7/mo; parents who want to cover up to 3 kids pay $15/mo. Yearly
discount (~20% off) to lock in commitment.

**Tech:** Stripe handles all of this. Estimated wire-up:

- Stripe Checkout integration: ~1 week
- New `subscriptions` table in Supabase + RLS gates: ~3 days
- "Manage subscription" page in dashboard: ~2 days
- Webhook handlers for subscription events (renewed / cancelled / failed payment): ~3 days

Total: ~2 weeks of backend work.

---

## Onboarding for a self-arriving student

A student arriving without a class code needs to feel productive in
**90 seconds**, or they bounce.

```
[Landing page]
    ↓ click "Start learning" / "I'm a student"
[Sign up]   ← Google OAuth one-tap or email
    ↓
[5-question quick setup]
    - I'm in: [Grade 4-5 / 6-7 / 8-9 / Adult learner]
    - My goal: [Pass Bagrut / School grades / Travel / Just curious]
    - I prefer: [Hebrew translations / Arabic translations / Both]
    - Daily time: [5 min / 15 min / 30 min]
    - Skip placement test? [Yes — start now / No — let's calibrate first]
    ↓
[Optional 2-min placement test]   — 20 quick multi-choice questions across A1-B2
    ↓
[First lesson]   ← Already 90 seconds in
```

Drop-off in any of these steps means lost revenue. UX matters huge
here. If the student doesn't see something fun within 90 seconds,
they don't pay.

---

## What you keep for free (already built)

| Asset | Reusable? |
|---|---|
| All 12 game modes | ✅ |
| 6,500-word curriculum | ✅ |
| HE + AR translations baked in | ✅ |
| Audio (TTS + Neural2 word audio) | ✅ |
| 18 dashboard themes | ✅ |
| Auth + Supabase backend | ✅ |
| PWA install path (Android + iOS) | ✅ |
| Class Show / Worksheet (teacher mode features) | ❌ teacher-only — no port needed |

That's ~80% of what you'd build from scratch for a B2C app. The
self-paid layer sits **on top of** existing infrastructure.

---

## Three strategic options

### Option A — Add a "Learner" role to the existing app

Same Vocaband, same brand. New sign-up path that bypasses the
class-code requirement. Self-directed mode coexists with
teacher-driven mode. A student can have BOTH: belong to their
teacher's class AND do extra solo practice.

- **Pro:** lowest risk, leverages everything you already have
- **Con:** UI gets cluttered (two paths to support); marketing
  message muddies ("are we B2B or B2C?")

### Option B — Spin off "Vocaband Home" (separate consumer app)

Same gameplay engine, different brand, different domain (e.g.
`vocaband.app` or `vocaband-home.com`), different App Store listing.
Pure consumer focus, no teacher chrome.

- **Pro:** clean message, can charge premium without alienating
  teachers
- **Con:** ~2-3 months of new build (app shell, marketing site,
  billing, support) before any revenue

### Option C — "Self-Study" mode inside the teacher-driven app (recommended)

A student in a teacher's class can also tap **"Self Study"** → goes
into self-directed mode. Charge for self-study access ($5/mo or
unlocked by parent purchase). Validates demand without launching a
separate brand.

- If self-study sees 5%+ of student users subscribing → spin off
  Option B with confidence
- If it doesn't → kill the experiment, ~3 weeks lost instead of
  3 months

- **Pro:** test the market for ~3 weeks of work, not 3 months
- **Con:** still mixed message in the UI; some students won't realise
  they CAN use Vocaband without their teacher

---

## Recommended path

**Start with Option C.** Specifically:

1. **Build Self-Study mode** for students who already have an account
   through a teacher
2. **Gate it** behind a $5/month subscription via Stripe
3. **Pilot with a Bagrut-prep cohort** (high motivation, low price
   sensitivity for exam-bound students)
4. **Watch the numbers for 3 months:**
   - Subscription rate ≥ 5% of active students → validation, scale
     to Option B
   - Subscription rate < 2% → kill the experiment, focus on B2B

**Total experiment cost:** ~3 weeks engineering + ~$200 Stripe
infrastructure + ~$500 marketing test (Facebook ads to Bagrut prep
groups in Israel) = ~$700 + 3 weeks. Cheapest market validation
possible.

---

## Effort + cost rough estimates

| Path | Time | Cost (if outsourced @ $150/hr) |
|---|---|---|
| **C** — Self Study inside existing app, Stripe wired in, curriculum-based engine, basic spaced repetition | 3-4 weeks | $5-8K |
| **A** — Full Learner role + diagnostic test + adaptive engine + push notifications + family plans | 2-3 months | $20-30K |
| **B** — Separate consumer brand from scratch (new domain, marketing site, native app wrappers, dedicated support) | 3-4 months | $40-60K |

---

## Differentiation — why bother when Duolingo exists?

Vocaband's strongest moat right now is **HE + AR curriculum + Israeli
school alignment**. That's where you can charge teachers more (B2B).
For B2C language apps globally, you're up against Duolingo's $7B
valuation and 80M monthly users — a hard market.

**But for Israeli + Arab consumers specifically:**

- Parents who want their kids to ace Bagrut English — Duolingo doesn't teach to that curriculum
- Arab students learning English through Arabic — Duolingo's Arabic learner experience is weaker than Vocaband's
- Israeli students learning English through Hebrew — Vocaband's translations are tuned to Israeli school context (slang, idioms, common errors)

Vocaband has a real edge that Duolingo doesn't. So **Option C scoped
to the Israeli + Arab-sector audience first** is the realistic play.
Don't try to outcompete Duolingo globally; outcompete it locally.

---

## Items to confirm before building Option C

These are decisions to lock in before writing code:

1. **Pricing** — $5/mo? $7/mo? Family plan at $15? Free tier with limits, or paid-only? Recommendation: **$7/mo individual, $15/mo family (up to 3 kids), no free tier — just a 7-day trial.**
2. **Trial length** — 7 days? 14 days? 30 days? Trade-off: shorter trial = more conversions per signup, longer trial = lower drop-off in week 1. Recommendation: **7 days** (matches Duolingo / industry).
3. **Engine for v1** — start with curriculum-based only? Or add diagnostic + spaced repetition from day 1? Recommendation: **curriculum-based for the first ship, add spaced repetition in a fast follow-up** (~2 weeks after v1).
4. **Pilot cohort** — Bagrut prep is the highest-motivation cohort (paid exam → willingness to pay for prep). Should pilot start there? Recommendation: **yes — Bagrut prep teachers' students for the first 1-2 weeks, then expand.**
5. **Marketing during pilot** — paid Facebook ads in Bagrut-prep groups, or organic only? Recommendation: **$500 paid spend** to ensure the pilot has enough volume to draw conclusions; organic alone is too slow.

---

## Operator items (when Option C ships)

1. **Stripe account** — set up a Stripe account if not already done (https://stripe.com). Connect to your bank for payouts.
2. **Stripe products** — create the products in Stripe dashboard:
   - "Vocaband Self-Study" — $7/mo recurring
   - "Vocaband Family" — $15/mo recurring (up to 3 students)
   - "Vocaband Bagrut Prep" — $7/mo recurring (separate product to track conversion from the pilot cohort)
3. **Webhook secret** — set on Fly: `fly secrets set STRIPE_WEBHOOK_SECRET=... -a vocaband`
4. **Public Stripe key** — set in Cloudflare Workers env: `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...`
5. **Tax / VAT** — Stripe Tax handles this if enabled. Important for Israeli + EU consumers — recommend enabling from day 1.
6. **Refund policy** — write a one-page refund policy (7-day no-questions-asked refund recommended for SaaS) and link from the checkout page. Reduces "where's my money" support tickets.

---

## Out of scope (for v1)

- Native iOS / Android apps (PWA is enough for v1)
- Apple Pay / Google Pay (Stripe Checkout supports these but adds setup time)
- Group / classroom plans purchased by parents for whole classrooms (overlap with B2B)
- Cross-promotion with other Voca subjects (per `docs/VOCA-FAMILY-ROADMAP.md` — defer until those subjects ship)
- AI-personalized lessons per student (deferred to AI Lesson Builder Phase 4 + this Plan's Phase 2)
- Streak insurance / freeze items as in-app purchases (Vocaband already has these in the shop — student-paid mode just unlocks shop access by default)

---

## Why this matters strategically

Today, Vocaband revenue depends entirely on schools / teachers
adopting and renewing. That's:

- **Slow sales cycle** — schools are budget-locked to fiscal years
- **Bumpy revenue** — September / January / September / January
- **Concentrated risk** — losing one large district hurts a lot

Adding a B2C subscription tier:

- **Smooths revenue** — direct-to-consumer is monthly recurring
- **Diversifies risk** — one teacher leaving doesn't kill 30 student
  subscriptions if they pay independently
- **Creates a stronger fundraise / acquisition story** — "we have
  $X MRR from B2C plus $Y from B2B" beats "we depend on schools"

Even if B2C is only 10-20% of revenue long-term, the diversification
itself is valuable. And in the best case (Bagrut prep blows up),
B2C could exceed B2B revenue inside 18 months — particularly during
spring exam season.

---

## When to build this

Order suggestions, in priority:

1. **Now / first half of 2026:** finish current B2B push (translations,
   AI Lesson Builder Phase 1, finish polish from open PRs). B2B is
   your existing revenue line; don't kneecap it for an unproven B2C.
2. **Mid-2026:** ship Option C as a pilot. Run for 3 months.
3. **Late 2026:** based on pilot data, decide between A / B / kill.
4. **2027:** if B2C validates, scale Option B (separate brand) and
   start running paid acquisition seriously.

This isn't urgent. The teacher product is your engine right now.
Self-study is a fork — important to plan, but not at the expense of
the core product getting better.

---

## Why I wrote this down rather than just discussing

Same reason as the AI Lesson Builder plan: **so this survives
context resets**. When you're ready to start, just say "let's start
on the student-paid model" and I'll have full context without
re-deriving the plan from scratch.
