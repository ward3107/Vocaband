# Vocaband — Platform Improvement Ideas

> **Status:** Brainstorm / strategic backlog. Captured in early-May 2026 so
> ideas survive session resets. Not all of these will ship — the doc is
> for choosing, not committing. Pick items by priority when capacity
> allows.
>
> Companion to:
> - `docs/AI-LESSON-BUILDER-PLAN.md`
> - `docs/STUDENT-PAID-MODEL-PLAN.md`
> - `docs/VOCA-FAMILY-ROADMAP.md`

---

## 1. Special needs / accessibility

The Israeli education system has roughly 8-10% of students with diagnosed
learning differences, plus more undiagnosed.  Vocaband already has the
bones for many of these — surfacing them as toggles is a moral and
commercial win.

| Feature | What it does | Effort |
|---|---|---|
| **Dyslexia font** | OpenDyslexic / Lexend toggle in settings — proven to reduce reading effort for ~30% of dyslexic readers | ~1 day |
| **Audio playback speed** | 0.5× / 0.75× / 1× / 1.25× / 1.5× on every audio button.  Critical for ESL learners + slow processors | ~1 day per game mode that uses audio |
| **Reading ruler** | Horizontal highlight bar on the current line in reading-heavy modes (Fill-Blank, Sentence Builder) | ~2 days |
| **Color overlay tints** | Blue / yellow / green tinted overlay (Irlen-style) reduces visual stress for some students | ~3 hours (sits on top of Pillar D theme tokens) |
| **Phonetic transcription** | `/ˈæp.əl/` shown next to every English word — speech-disorder students depend on this | ~1 day (data already in IPA dictionaries; API or static lookup) |
| **Reduced visual noise mode** | Strips animations, removes celebrations, calmer palette.  Important for ADHD + autism spectrum. | ~30 min (already have `prefers-reduced-motion`; just add an in-app toggle) |
| **Voice input fallback** | Speak the word instead of typing it (Web Speech API).  For motor-disabled students | ~3 days |
| **Repeat-audio button always visible** | Currently audio replay sometimes disappears between modes — make it persistent | ~1 hour per mode |
| **Larger tap targets toggle** | Min 56px hit area for everything.  Helps motor-impaired + young learners | ~2 days (audit + CSS) |
| **One-question-at-a-time mode** | Hide progress bar + question count to remove pressure.  ADHD/anxiety win | ~1 day |
| **Vibration on success/wrong** | Phones — haptic feedback for hearing-impaired students | ~2 hours |

**Recommendation:** bundle the cheap wins as a **"Learning Differences"
settings panel**.  Total ~3 weeks of work for a feature set that
materially expands your addressable market and is easy to market to
schools / Ministry of Education.

---

## 2. New game modes

You have 12 already.  Strongest additions, ranked by ROI:

| Mode | Why | Effort |
|---|---|---|
| **Pronunciation Challenge** | Student speaks word, browser scores accuracy via Web Speech API.  Uniquely engaging, not in Duolingo's free tier | ~1 week |
| **Spelling Bee** | Letter-by-letter dictation, audio plays the word, student types.  Bridge between Listening + Spelling | ~3 days |
| **Antonym / Synonym** | "Find the opposite of *brave* in these 4 options."  Uses your existing word + AI to generate pairs | ~3 days (with AI Lesson Builder Phase 1) |
| **Word Chains** | "Find a word starting with the last letter of *apple*."  Engaging, builds vocabulary breadth | ~3 days |
| **Collocations** | "Heavy ___" → rain / homework / metal?  Common word pairs are how natives speak.  Bagrut tests this heavily | ~1 week (needs collocation data — could AI-generate from sentence bank) |
| **Speed Round** | 60 seconds, max words answered, no penalty for skipping.  High-engagement leaderboard fuel | ~3 days |
| **Idiom mode** | "Break a leg" = good luck.  Israeli students LOVE these and they appear on Bagrut | ~1 week (data + UI) |
| **Drawing mode** | Student draws what the word means, peer or teacher reviews.  Creative kids dominate | ~2 weeks (canvas drawing + review queue) |
| **Story mode** | Read a passage with target words, answer comprehension questions.  **Already in the AI Lesson Builder plan** as Phase 2-3 | covered |

---

## 3. Engagement / retention loops

The current shop, eggs, streaks, pets cover the basics well.  Less
obvious wins:

- **Daily missions** — "Master 5 new words today" with a 50 XP bonus.  Drives daily return.
- **Weekly themed challenges** — "Animals week — top 3 students get a unique avatar"
- **Pet evolution** — Tamagotchi-style: pets level up when you study, look sad if you skip a day.  Already have pets; just add the time-decay loop.
- **Personal-best tracker** — "Fastest True/False round," "Longest streak in Sentence Builder."  Per-mode trophies.
- **Achievement badges** — "Mastered Set 1," "30-day streak," "Beat 10 classmates this month"
- **Friends + 1-on-1 duels** — students invite a friend to a quick match.  Adds social hook.  Heavy build (~3 weeks) but big retention payoff.
- **Word of the day** — daily push notification with one new word.  PWA already supports notifications.

---

## 4. Teacher-side power-ups

- **Class heat map** — at-a-glance "which words is the class struggling with?"  Already partially have it in the Classroom view; could become the primary teacher dashboard.
- **Differentiated assignments** — same topic, AI auto-adjusts difficulty per student based on past performance.  Massive teacher-time saver.
- **Parent reports** — auto-generated weekly email to parents: "Sarah practiced 4 days this week, mastered 18 new words.  Areas to encourage: weather vocabulary."
- **Curriculum scope-and-sequence** — visual term planner.  "We'll cover Set 2 chapters 4-7 in November."
- **Co-teaching mode** — two teachers share a class.  Currently one-teacher-per-class.
- **Lesson timer** — assignments with budgeted class-period time ("this should take 15 minutes").  Helps teachers plan.
- **Substitute-teacher temp access** — assign a sub to a class for one day without giving them full account access.

---

## 5. Content additions (zero code, pure curriculum)

- **More Topic Packs** — animals, food, weather, jobs, hobbies, sports, family, school subjects, body parts, clothes, transport, technology, emotions.  ~30 packs, each ~30 words.
- **Bagrut prep pack** — exam-themed words.  High commercial value.
- **CEFR granularity** — A1.1 / A1.2 / A2.1 / A2.2 instead of just Set 1 / 2 / 3.  Lets adaptive engines pick more precisely.
- **Holiday packs** — Israeli holidays explained in English (Pesach, Rosh Hashanah).  Arab holidays in English (Eid, Ramadan).  Curriculum + cultural bridge.
- **Career packs** — Medical, Tech, Travel, Business.  For adult learners + high-school career-prep.

---

## 6. Cross-language expansion

- **Russian translations** — your `Word` interface already has an optional `russian` field.  ~15% of Israeli students speak Russian at home.
- **French UI** — for Belgian / Swiss / French-Canadian markets if you go international.
- **HE → AR / AR → HE bridge mode** — Israeli Hebrew speakers learning Arabic, or vice versa.  Same engine, just swap which column is the "answer."
- **Generic English-to-X** — Vocaband becomes a vocabulary platform that any school in any country can use to teach English-from-their-mother-tongue.

---

## 7. Quality-of-life

- **Audio-only mode** — students learn while commuting, screen off.  Big for older students.
- **Cross-device sync** — start a session on phone, continue on laptop.  Currently each device is a separate session.
- **Print-mode for parents** — flashcards / study guides parents can print and quiz at home.  Worksheet feature already gets you 80% there.
- **Bookmark / personal review list** — students mark tricky words for later review.  Spaced repetition feeds from this.
- **Voice search for assignments** — teacher says "show me all my Set 2 assignments."  Tiny, fun.

---

## 8. Top-7 prioritization (my pick)

If forced to pick the next 7 things to ship in priority order:

| # | Feature | Effort | Reasoning |
|---|---|---|---|
| 1 | **Audio playback speed control** | 1-2 days | Universal win.  Helps every student, especially ESL + slow processors + dyslexic. |
| 2 | **"Learning Differences" settings panel** | 2-3 weeks | OpenDyslexic font + reduced motion + larger tap targets + color overlay + reduced visual noise.  Bundle into one toggle screen.  Marketing win for schools. |
| 3 | **AI Lesson Builder Phase 1** (already planned) | 6-8 hr | Vocab-from-topic generator.  Foundation for Phases 2-3. |
| 4 | **Daily missions** | 3-5 days | Drives daily return without big mechanics overhaul. |
| 5 | **Spaced repetition** | 1-2 weeks | Single biggest retention upgrade.  Critical for the student-paid model later. |
| 6 | **Pronunciation Challenge mode** | 1 week | Differentiated from Duolingo; uses Web Speech API; high engagement. |
| 7 | **More Topic Packs (content, not code)** | 1 week of writing | Scales the value without engineering.  Plus Bagrut prep pack opens revenue. |

---

## How to use this doc

When ready to build something from this list:

1. **Pick an item** based on current priorities
2. **Validate with one or two real teachers** — does this solve a real pain?  If not, kill or shelve
3. **Branch from main**, build it, ship behind a feature flag if it's customer-facing
4. **Update CLAUDE.md** with anything new the next session should know about
5. **Move the entry from this doc to a "Shipped" section at the bottom** so the doc evolves
