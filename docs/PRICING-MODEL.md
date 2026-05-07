# Vocaband — Pricing Model

> Hybrid go-to-market pricing for Vocaband's first 12-24 months.
> Public face = schools-first.  Private channel = individual teachers.
> No published prices — every deal negotiated.
>
> Drafted 2026-04-28.  Last revised 2026-05-07.  Living document —
> revisit quarterly.

## Why "schools-first public" is the right call

Most Israeli schools have **3-6 English teachers** (revised 2026-05-07
based on market check), not 30.  That matters for two reasons:

1. **Volume-discount tiers don't make sense yet.**  6 teachers ×
   25 NIS = 150 NIS/mo would be a tiny school deal — not worth the
   procurement cycle on either side.  Real school-license value
   only emerges after **multi-subject Voca-family** ships (English
   + History + Civics + Science teachers all at the same school =
   15-25 teachers).
2. **Public per-teacher pricing anchors the conversation low.**  If
   the landing page says "39 NIS / teacher", any school you talk to
   computes "6 × 39 = 234/mo" in their head — and starts the
   negotiation from there, not from a real school-license figure.
3. **The "let teachers self-pay" arbitrage gets worse with low
   per-teacher pricing.**  At 6 teachers × 290 NIS/year personal =
   1,740 NIS, a stingy principal will refuse the school plan
   entirely.  Hiding the per-teacher number forces the conversation
   onto school-license value (central billing, principal dashboard,
   training, DPA), which is where school plans actually justify
   their price.

**Therefore**: don't publish prices.  Every deal is a conversation,
which lets us price by school size + subject mix + relationship.

## The 3-mechanism hybrid

| Audience | Public message | Private reality |
|---|---|---|
| **Schools (default public face)** | "Vocaband for Schools — annual licenses for whole departments. Custom pricing based on subjects + size." → mailto: contact@vocaband.com?subject=School%20Plan%20Inquiry | Negotiated per school. Target 25-35K NIS/year for premium private schools, 10-15K for public schools. AVERAGE = ~20K/year. |
| **Individual teachers (private channel)** | Hidden CTA in the footer: "Individual teacher? Get in touch." → mailto: contact@vocaband.com?subject=Individual%20Teacher | Personal email exchange → quote 250-300 NIS/year (≈ 25 NIS/mo equivalent).  Casual, no public commitment. |
| **Founding 100 teachers (limited campaign)** | Explicit landing page tile: "Free Pro for the first 100 teachers — Founding Teacher badge + lifetime preferred pricing." | Free Pro for 12 months, then ~14.50 NIS/mo (50% off) forever. Existing plan from `docs/GO-TO-MARKET.md`. |

## Internal pricing playbook (private — never publish)

When a principal / IT manager / department head reaches out:

### School plan ladder

| School type | Typical English teachers | Annual license target | Notes |
|---|---|---|---|
| **Premium private school** (gymnasia, anglican, international) | 4-8 | **25-35K NIS** | Have edtech budgets, expect to pay, value central billing + training |
| **Standard public school** (Israeli מ"מ / mamlakhti) | **3-6** ⭐ | **10-12K NIS** | The volume tier — most Israeli schools land here.  Anchor at ₪10K (revised 2026-05-07).  Sits below the principal-only approval threshold (~₪10K) so deals close without school-board sign-off. |
| **Public-school floor** | 1-3 | **8K NIS** | Hard floor.  Below this, point them to individual Pro for now. |
| **District deal** (5+ schools) | varies | **80K-150K** | Aggregate negotiation, multi-year contract |

**Why ₪10K is the anchor for standard public schools** (the volume
tier — most schools land here):

- Sits at-or-below the principal-only approval threshold, so deals
  close in 1 meeting instead of waiting for school-board sign-off
- Compares favorably to MorfixSchool (₪5-8K) at +25-100% — defensible
  premium for gamification + Hebrew/Arabic + service
- Per-teacher math: ~₪1,700/teacher/year (~₪140/mo) — feels like a
  proper budget line, not a consumer subscription
- Beats the "let teachers self-pay" loophole: 6 × 290 = ₪1,740 of
  fragmented broken accounts vs ₪10K of a real school deal — the gap
  is justified by central billing + DPA + training

### Individual teacher rate (private channel)

| Term | Rate |
|---|---|
| Annual | **290 NIS / year** (~24 NIS/mo equivalent) |
| Monthly | **29 NIS / month** |
| Founding-100 (after free year) | **14.50 NIS/mo or ~145 NIS/year** lifetime |

Don't publish these.  Quote them in private replies.

### What's included at each level

| Feature | Founding-100 | Individual Pro | Standard School Plan | Premium School Plan |
|---|---|---|---|---|
| All 11 game modes | ✅ | ✅ | ✅ | ✅ |
| AI Sentence Builder | ✅ | ✅ | ✅ | ✅ |
| Camera OCR | ✅ | ✅ | ✅ | ✅ |
| Hebrew + Arabic translations | ✅ | ✅ | ✅ | ✅ |
| Unlimited classes | ✅ | ✅ | ✅ | ✅ |
| **Central billing (1 invoice)** | ❌ | ❌ | ✅ | ✅ |
| **Principal dashboard** | ❌ | ❌ | ✅ | ✅ |
| **SSO / Google Workspace** | ❌ | ❌ | ❌ | ✅ |
| **Training session** (1-2 hrs) | ❌ | ❌ | ❌ | ✅ |
| **Priority support + 24h SLA** | ❌ | ❌ | ✅ | ✅ |
| **Annual contract / NIS invoice** | ❌ | ❌ | ✅ | ✅ |

The school-only features are what closes school deals.  Individual
teachers self-paying don't get them — that's the differentiation.

## The closing pitch (memorize this)

When a principal asks **"Why should we pay X when our teachers could
each pay 29 NIS?"** — your scripted answer:

> "You absolutely could let your teachers self-pay. But you'd lose:
> - **Central billing** — finance has to track 4 separate teacher
>   receipts each month
> - **Principal dashboard** — you can't see school-wide progress in
>   one place
> - **SSO** — teachers reset Google passwords every 90 days; SSO
>   handles that
> - **Annual NIS invoice** — works with school finance offices; teacher
>   self-payments don't
> - **Training session** — your staff onboards together with our team,
>   not piecemeal
>
> Most schools find the school plan saves them money AND gives them
> oversight teachers can't provide individually."

Turn the trap ("we could just have teachers pay") into the close.

## Cash-flow runway analysis

### Phase 1 (months 1-3): foundation building

| Activity | Revenue impact |
|---|---|
| Founding-100 campaign in FB groups | 0 NIS revenue, builds advocates + testimonials |
| First school pipeline conversations | 0 NIS — early discussions only |
| Individual teacher inquiries | 1-3 small deals × 290 NIS = ~870 NIS one-off |

**Months 1-3 revenue**: ~1,000 NIS total.  This phase is a sunk-cost
bet on the founding-teacher network.

### Phase 2 (months 4-6): first paid traction

| Source | Estimated revenue |
|---|---|
| Individual teachers paying privately | 5-10 teachers × 290 NIS/year ≈ 200 NIS/mo monthly equivalent |
| First school conversations advance | 1 school may close in this window — 15-20K NIS one-off |

**Cumulative through month 6**: 15K-22K NIS.

### Phase 3 (months 7-12): pipeline matures

| Source | Estimated revenue |
|---|---|
| Individual teachers (cumulative) | 30-50 paying privately × 290/year = 700-1,200 NIS/mo |
| School deals (1-2 per quarter) | 2-4 deals × 18K avg = 36-72K NIS over 6 months |

**Year 1 total**: **~60K-100K NIS**.

### Year 2 forecast

| Source | Estimated revenue |
|---|---|
| Individual teachers (compounding) | 100-150 × 290/year = 30K-45K NIS/year |
| School deals | 8-12 × 20K avg = 160K-240K NIS/year |
| **Year 2 total** | **190K-285K NIS** |

### Required runway

If you have **6 months of personal runway** going in, the model works.
You'll have meaningful revenue by month 6-9.  If runway is shorter,
prioritize individual-teacher inbox sales hard in months 1-3 to bridge
to the first school close.

## Stripe wiring plan (when you're ready)

For Phase 1 (individual teachers), you don't need a public checkout —
private mailto + Stripe Payment Links is enough:

1. **Create a Stripe account** as an Israeli business entity (Osek
   Murshe / Ltd.).  Charges in NIS; payouts to NIS bank.
2. **Create 2 Payment Links**:
   - "Vocaband Pro Monthly" — 29 NIS/mo subscription
   - "Vocaband Pro Annual" — 290 NIS/year subscription
3. **Reply to teacher inquiries** with the Payment Link.  Stripe
   handles cards, recurring billing, dunning, cancellation flow.
4. **VAT (17%)**: prices are VAT-inclusive.  At quarter-end, remit
   17/117 of revenue to the Tax Authority.
5. **For schools**: use Stripe Invoicing → custom amount, NET-30
   payment terms, NIS invoice with VAT line.  No subscription —
   issue a fresh invoice annually.

Public checkout (3-tier landing pricing card) waits until you have
50+ paying teachers AND a clearer signal on which tier converts best.

## What NOT to put on the landing page (yet)

Until at least 50 paying teachers + 1 closed school deal:

- ❌ **Specific NIS prices** (29, 39, anything)
- ❌ **Tiered pricing cards** (Free / Basic / Pro / School)
- ❌ **"per teacher" anchoring**
- ❌ **Annual vs monthly comparisons**
- ❌ **Stripe checkout buttons**

What stays on the landing today:
- ✅ "Get a quote for your school" mailto button
- ✅ "Individual teacher? Get in touch" smaller mailto in footer
- ✅ Founding-100 teaser when the campaign is active
- ✅ The Voca-family roadmap section (multi-subject teaser)

## Quarterly review checkpoints

Re-read this doc each quarter and validate against reality:

| Quarter | Check |
|---|---|
| Q1 (months 1-3) | Are founding teachers actually using the product? Any inbound from schools? Adjust the founding offer if no traction. |
| Q2 (months 4-6) | First school close — did 18K avg hold? Adjust school ladder if real numbers differ. |
| Q3 (months 7-9) | Is individual teacher inbox sales working? If <5 teachers paying via mailto, consider publishing a public Pro tier at 29 NIS. |
| Q4 (months 10-12) | Time to publish the public 3-tier pricing card?  Decide based on Year 1 numbers. |

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| **No school deals close in 12 months** | Founding-teacher campaign keeps revenue trickling via mailto inbox sales.  If still flat at month 9, switch to public 29 NIS Pro tier as Plan B. |
| **A competitor (Quizlet/Kahoot) launches HE+AR** | Differentiate on AI Sentence Builder + Camera OCR + Voca-family roadmap.  Move on multi-subject expansion FAST. |
| **Stripe rejects Israeli business** | Use PayPlus or Tranzila as fallback (worse dev experience but works). |
| **Schools say "send us a proposal" then ghost** | Set a 2-week follow-up cadence.  After 60 days of silence, archive and move on.  School sales cycle is 3-6 months but ghosting is real. |
| **Teachers price-shop you against Quizlet** | Direct them to /security + the AI/OCR feature cards.  Price isn't a debate — value-per-feature is. |

## Status

| Item | Status |
|---|---|
| Public landing pricing strategy | ✅ Schools-first, no published prices, two mailtos |
| Footer "School plans" mailto (school-inquiry modal) | ✅ Shipped 2026-04-28 |
| Footer "Individual teacher? Get in touch" mailto | ✅ Shipped 2026-05-07 |
| `school_inquiries` table — leads persisted to Supabase | ✅ Shipped 2026-05-07 (migration `20260610_school_inquiries`) |
| Internal price ladder (this doc) | ✅ Revised 2026-05-07 with ₪10-12K standard-public anchor |
| Founding-100 campaign | ⏳ Not started — wait until product is fully production-ready |
| Stripe account + Payment Links | ⏳ Not yet — need first individual-teacher inquiry to justify the setup |
| Year 1 revenue tracking dashboard | ⏳ Defer until first paying teacher |
| Public 3-tier pricing card on landing | ⏳ Quarter 4 decision |
