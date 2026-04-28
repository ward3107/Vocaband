# Vocaband — Zero-Cost Go-To-Market

> Marketing playbook for the first 100 paying teachers.  **Total budget: 0 NIS.**
> Time investment: ~6-8 hours/week for 90 days.
>
> Everything in this doc is opportunity cost only — no cash spent.
> Drafted 2026-04-28.

## TL;DR

Skip paid ads until you have proof of product-market fit (≥30
paying teachers retained for 30+ days).  Until then, your three
weapons are:

1. **Israeli teacher Facebook groups** (organic posts)
2. **SEO content + landing pages** (Hebrew + Arabic)
3. **Direct outreach** to 5-6 teacher influencers + Israeli MoE
   EdTech events

## The single highest-leverage channel: Facebook groups

Israeli teacher culture lives in Facebook groups.  These are the ones
that matter:

| Group | Approx. members |
|---|---|
| מורים לאנגלית בישראל | ~10,000 |
| מורי ומורות אנגלית | ~5,000 |
| Teachers Israel | ~3,000 |
| מורים ומורות באנגלית - שיתוף, תמיכה ועזרה | ~7,000 |
| גני אנגלית - גן ילדים מדבר אנגלית | ~3,000 (younger grades) |

**The rule: be useful for two weeks before you mention Vocaband.**
Algorithms and humans both punish drive-by self-promotion.

### Week 1-2 — build trust

- Answer 3-5 teacher questions per day across these groups.
  Keep it short, no links to your site.
- Share a teaching tip per week (not Vocaband-related).  Examples:
  "How I get students to use new vocab words in their own
  sentences", "A free worksheet template that worked for me".
- Upvote / react to other people's good posts.

By week 2 your name is recognised in the groups.

### Week 3 — soft launch

Post ONE content piece per group, spread over 5 days:

> *"Hey everyone — I built a vocabulary game for my grade-7 ESL
> class because I couldn't find anything that worked with the
> Israeli MoE Set 1 / Set 2 / Set 3 lists.  Wanted to share it free
> in case it's useful to anyone here.  10 game modes, Hebrew +
> Arabic translations, students play on their phones.  No signups
> for students — they join with a class code.  Link below if you
> want to try.  Happy to answer any questions."*

Pin a comment with the link.  Reply to every question that day
within 1 hour — group algorithms reward fast engagement.

### Week 4+ — share student wins

Once 5-10 teachers are using it, weekly:

- Screenshot of a class leaderboard ("Look at this 7th-grade class
  in Haifa — they played 1,200 rounds in 2 weeks").
- Quote from a teacher who's loving it (with permission).
- "Before/after" engagement stats.

Never repost the same content twice in the same group.  Rotate
between the 4-5 groups so each gets fresh material.

**Realistic outcome of 90 days of this**: 50-150 sign-ups, 20-60
active teachers, 5-15 paying.

## Hebrew + Arabic SEO content

You already have `/answers` pages.  Keep adding 2 new pages per
month, targeted at Hebrew + Arabic search queries.

**Topic ideas (write in Hebrew first, then Arabic):**

- "איך ללמד אוצר מילים בכיתה ה'" (how to teach vocabulary in 5th grade)
- "אפליקציות ESL לבית ספר יסודי" (ESL apps for elementary school)
- "תרגילי אוצר מילים אנגלית לכיתה ז'" (English vocabulary exercises for 7th grade)
- "מילים מ-Set 1 - רשימה מלאה" (Set 1 word list — full list)
- "כללי משחק אנגלית לכיתה" (English game rules for the classroom)

Each page should:
- Be at least 1500 words.
- Mention Vocaband once near the end ("If you want a digital game
  for these words, Vocaband has all of Set 1 built-in.  [Try it
  free]").
- Link internally to 2-3 other `/answers` pages.

**Realistic outcome**: 100-300 monthly organic visitors after 6
months.  Compounds for years.

## Direct outreach to teacher influencers

Find 5-6 Israeli English teachers with 5,000+ Facebook followers.

**The ask:**
- Free Pro lifetime
- "Founding Teacher" badge on a public wall
- One sponsored post is OPTIONAL — for now, ask for nothing in
  return except feedback

**The pitch (DM):**
> Hi [name], I really like your post on [specific recent post].
> I'm building a vocabulary game for Israeli ESL classrooms — Set 1/2/3
> aligned, Hebrew + Arabic translations, no student signups.  I'd
> love to give you a free Pro account forever and get your feedback.
> No commitment to post about it — just want to know what would
> make it actually useful for your students.  Free trial link if
> you're curious: [link].

Roughly 2-3 of every 6 will respond.  At least 1 will end up
posting about it on their own once their students get hooked.

## Israeli MoE EdTech events

Free booth slots at:
- **EduForum** (annual, usually March)
- **Innovation in Education** (annual, varies)
- **Israeli ESL Teachers Association conference** (annual)

Apply 6 months in advance — slots fill fast.  Once you're in:
- 8-foot table, laptop running the demo, A4 sign with QR to
  vocaband.com
- Hand out 100 cards with "First teacher in your school gets free
  Pro lifetime" — built-in viral loop

Each event yields 30-80 signups + 2-5 schools that want a demo.

## Content channels — defer for now

| Channel | Defer reason |
|---|---|
| TikTok | Skip until you have 3 viral-worthy gameplay clips.  Posting bad clips wastes the launch. |
| YouTube | Compounds well but slow.  Add 1 short Hebrew tutorial per month max. |
| Twitter/X | Israeli teachers aren't there.  Skip entirely. |
| LinkedIn | Useful only for the school-license sales motion later.  Wait. |

## Free tools you'll want

- **Linktree** (free) for one shareable link in FB bios
- **Canva** (free) for FB post graphics — use the same template
  for brand consistency
- **Google Search Console** (free) — see what keywords are sending
  traffic
- **Plausible Analytics** or **Cloudflare Web Analytics** (free) —
  track which group posts drive sign-ups without compromising
  student privacy

## Metrics to watch (free dashboards)

| Metric | Where to find |
|---|---|
| Weekly sign-ups | Supabase users table count |
| Active teachers (MAU) | Users who logged in within 30 days |
| Paying teachers | Stripe dashboard (after pricing ships) |
| Average plays per class | Analytics view in the app |
| Share of FB sign-ups | UTM tag your FB links: `?utm_source=fb&utm_campaign=group_post_april` |

## When to start spending money

You're ready for paid ads when:
- 50+ teachers signed up organically
- 20+ are using it weekly
- 5+ are paying
- You have 3-5 testimonials

Until then, every NIS spent on ads is wasted — you don't know yet
which messaging converts.  Your first 100 customers tell you what
to put in the ads.

## 90-day calendar at a glance

| Weeks | Focus | Hours/week | Cost |
|---|---|---|---|
| 1-2 | Be useful in 4-5 FB groups, no links | 4 | 0 |
| 3-4 | Soft launch posts in groups | 6 | 0 |
| 5-8 | Reply, iterate, write 2 SEO pages | 6 | 0 |
| 9-10 | DM 6 teacher influencers | 4 | 0 |
| 11-13 | Apply to 1 EdTech event, write 2 more SEO pages | 5 | 0 |
| **Total** | | **~70 hours** | **0 NIS** |

If you spend nothing else but those 70 hours, the realistic outcome
at day 90 is 50-150 active teachers, 5-15 paying.  Then you decide
whether to scale via paid ads or keep grinding organic.
