# Beta invite + tester feedback

How to let a known group (e.g. a WhatsApp chat of coders) try Vocaband as real
teachers — with a 14-day Pro trial — **without collecting their emails**, and how
to gather structured feedback.

---

## 1. How the invite code works

A shared code lets a holder self-grant teacher access. Redeeming it adds **their
own** email to `teacher_allowlist` (+ `ai_allowlist`), after which the normal
sign-up flow mints a `role='teacher'` row with the standard **14-day trial**.

- It is **not** the public "anyone can sign up" door — only people who hold the
  code get in, and you can disable / expire / cap it anytime.
- Students can't be silently promoted: the code is a deliberate action, bounded
  to the people you share it with.
- RLS on `public.users` is untouched — a redeemed account still has to satisfy
  `users_insert` (free plan, trial ≤ now()+31d, no school).

Code path: `?invite=` link → captured to localStorage (`utils/betaInvite.ts`) →
survives the OAuth redirect → redeemed by `useAuthRestore` via the
`redeem_beta_invite` RPC. There's also an optional **Invite code** field on the
teacher login card for people who paste just the code.

### The share link (easiest for testers)

```
https://www.vocaband.com/?invite=VOCABAND-BETA
```

They open it → tap **Sign in with Google** → they're in. No email collection, no
admin step.

### Managing codes (Supabase dashboard → SQL editor)

```sql
-- Add / rotate a code
INSERT INTO public.beta_invite_codes (code, label, max_uses, expires_at)
VALUES ('CODERS-JUNE', 'WhatsApp coders, June 2026', 100, now() + interval '30 days')
ON CONFLICT (code) DO NOTHING;

-- See usage
SELECT code, label, active, uses, max_uses, expires_at FROM public.beta_invite_codes;

-- Close the door when the beta ends
UPDATE public.beta_invite_codes SET active = false WHERE code = 'VOCABAND-BETA';
```

> The migration seeds one starter code `VOCABAND-BETA` (200 uses, 60 days).
> Rotate it before wider sharing.

---

## 2. The message to send the group

> ⚠️ Replace the link with your live invite link before sending.

### English

```
🎮 Help me test Vocaband (2 min to start)

Vocaband is an English-vocabulary game for Israeli schools (grades 4–9) — teachers
build word sets, students play 15 game modes, earn XP & streaks. Hebrew + Arabic built in.

I'd love your eyes on it as a *teacher*. You get full Pro free for 14 days.

👉 Open: https://www.vocaband.com/?invite=VOCABAND-BETA
   Tap "Sign in with Google" — that's it.

Try this:
1. Create a class + an assignment (pick words or upload a list)
2. Play a couple of game modes as if you were a student
3. Poke the AI bits (sentence generator / photo→words OCR)
4. Try it on your phone too

Then drop your honest feedback here (5 min): <FEEDBACK_FORM_LINK>

Break it, roast it, tell me what's confusing. 🙏
```

### Hebrew

```
🎮 עזרו לי לבדוק את Vocaband (2 דקות להתחיל)

Vocaband היא משחק אוצר מילים באנגלית לבתי ספר בישראל (כיתות ד׳–ט׳) — המורה בונה
רשימות מילים, התלמידים משחקים ב-15 מצבי משחק, צוברים נקודות ורצפים. עברית וערבית מובנות.

אשמח שתסתכלו עליה בתור *מורים*. מקבלים Pro מלא בחינם ל-14 יום.

👈 כניסה: https://www.vocaband.com/?invite=VOCABAND-BETA
   לוחצים "התחבר עם Google" וזהו.

נסו:
1. ליצור כיתה + מטלה (לבחור מילים או להעלות רשימה)
2. לשחק כמה מצבי משחק כאילו אתם תלמידים
3. לבדוק את ה-AI (מחולל משפטים / צילום→מילים OCR)
4. לנסות גם בנייד

ואז כתבו לי משוב כן (5 דק׳): <FEEDBACK_FORM_LINK>

תשברו, תבקרו, תגידו לי מה מבלבל. 🙏
```

---

## 3. Feedback form (Google Form questions)

Create a Google Form, paste these in, then put the form link in the message above
and (optionally) link it from the app.

**Intro:** *Thanks for testing Vocaband! ~5 minutes. Be brutally honest — that's
the whole point.*

1. **Your role / background** — short text (e.g. frontend dev, teacher, both)
2. **First impression** — *How clear was it what to do in the first minute?* —
   linear scale 1–5
3. **What confused you at the start?** — long text
4. **Creating a class + assignment** — *How easy was it?* — linear scale 1–5
5. **What got in the way when setting up?** — long text
6. **Game modes** — *Which did you try, and which felt fun vs weak?* — long text
7. **AI features** *(sentence generator, photo→words OCR, worksheets)* — *Did they
   work and feel useful?* — long text
8. **Performance** — *Anything slow, janky, or laggy? Where?* — long text
9. **Mobile / phone** — *Did you try it on a phone? How did it feel?* —
   multiple choice (Didn't try / Great / OK / Rough) + comment
10. **Hebrew / Arabic + right-to-left** — *Anything broken or awkward in HE/AR?* —
    long text
11. **Bugs you hit** — long text (ask for steps + device/browser)
12. **Most valuable thing** — *What's the one feature you'd actually use/keep?* —
    short text
13. **Biggest missing thing** — short text
14. **Would you recommend it to a teacher?** — linear scale 0–10 (NPS)
15. **Anything else?** — long text
16. *(optional)* **Email if you're open to a follow-up** — short text

---

## 4. After the beta

- `UPDATE public.beta_invite_codes SET active = false ...` to close signups.
- Trialing testers naturally drop to Free when their 14 days lapse.
- To keep someone on as a real teacher, nothing more is needed — their email is
  already on the allowlist.
