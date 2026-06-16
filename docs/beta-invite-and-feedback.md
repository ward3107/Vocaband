# Beta invite + tester feedback (הזמנה למשתמשי בטא + טופס משוב)

How to let a known group (e.g. a WhatsApp chat of coders) try Vocaband as real
teachers — with a 14-day Pro trial — **without collecting their emails**, plus the
ready-to-send Hebrew message and feedback form.

---

## 1. How the invite code works

A shared code lets a holder self-grant teacher access. Redeeming it adds **their
own** email to `teacher_allowlist` (+ `ai_allowlist`), after which the normal
sign-up flow mints a `role='teacher'` row with the standard **14-day trial**.

- It is **not** the public "anyone can sign up" door — only people who hold the
  code get in, and you can disable / expire / cap it anytime.
- Students can't be silently promoted: redeeming is a deliberate action you scope
  to the people you share the code with.
- RLS on `public.users` is untouched (free plan, trial ≤ now()+31d, no school).

Code path: `?invite=` link → captured to localStorage (`utils/betaInvite.ts`) →
survives the OAuth redirect → redeemed by `useAuthRestore` via the
`redeem_beta_invite` RPC. There's also an optional **Invite code** field on the
teacher login card.

### The share link (easiest for testers)

```
https://www.vocaband.com/?invite=VOCABAND-BETA
```

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

## 2. ההודעה לקבוצה (עברית — מוכן לשליחה)

> ⚠️ החליפו את הקישור בקישור ההזמנה החי שלכם, ואת `<קישור_לטופס>` בקישור לטופס המשוב, לפני השליחה.

```
🎮 עזרו לי לבדוק את Vocaband (2 דקות ומתחילים)

Vocaband היא אפליקציית משחק ללימוד אוצר מילים באנגלית לבתי ספר בישראל (כיתות ד׳–ט׳).
המורה בונה רשימות מילים, התלמידים משחקים ב-15 מצבי משחק, צוברים נקודות (XP) ורצפים.
תמיכה מובנית בעברית ובערבית.

אשמח שתסתכלו עליה בתור *מורים* ותגידו לי מה דעתכם. מקבלים גרסת Pro מלאה בחינם ל-14 יום.

👈 כניסה: https://www.vocaband.com/?invite=VOCABAND-BETA
   לוחצים "התחבר עם Google" — וזהו, אתם בפנים.

מה כדאי לנסות:
1. ליצור כיתה + מטלה (לבחור מילים או להעלות רשימה משלכם)
2. לשחק כמה מצבי משחק כאילו אתם תלמידים
3. לבדוק את יכולות ה-AI (מחולל המשפטים / צילום תמונה → מילים ב-OCR)
4. לנסות גם מהנייד

ואז כתבו לי משוב כן ופתוח (5 דקות): <קישור_לטופס>

תשברו, תבקרו, ותגידו לי מה היה מבלבל 🙏
```

### English version (optional)

```
🎮 Help me test Vocaband (2 min to start)

Vocaband is an English-vocabulary game for Israeli schools (grades 4–9) — teachers
build word sets, students play 15 game modes, earn XP & streaks. Hebrew + Arabic built in.

I'd love your eyes on it as a *teacher*. You get full Pro free for 14 days.

👉 Open: https://www.vocaband.com/?invite=VOCABAND-BETA  — tap "Sign in with Google".

Try this: create a class + assignment, play a couple of game modes, poke the AI
(sentence gen / photo→words OCR), and try it on your phone.

Then drop honest feedback (5 min): <FEEDBACK_FORM_LINK>  — break it, roast it 🙏
```

---

## 3. טופס משוב (שאלות לטופס Google בעברית)

צרו טופס Google, הדביקו את השאלות, ואז שימו את קישור הטופס בהודעה למעלה.

**פתיח:** *תודה שאתם בודקים את Vocaband! זה ייקח כ-5 דקות. תהיו כנים לחלוטין — זו כל המטרה.*

1. **התפקיד / הרקע שלך** — טקסט קצר (למשל: מפתח/ת frontend, מורה, שניהם)
2. **רושם ראשוני** — *עד כמה היה ברור מה לעשות בדקה הראשונה?* — סולם 1–5
3. **מה בלבל אותך בהתחלה?** — טקסט ארוך
4. **יצירת כיתה + מטלה** — *עד כמה היה קל?* — סולם 1–5
5. **מה הפריע לך בהקמה?** — טקסט ארוך
6. **מצבי המשחק** — *באילו שיחקת, ואילו היו כיפיים מול חלשים?* — טקסט ארוך
7. **יכולות ה-AI** *(מחולל משפטים, צילום→מילים OCR, דפי עבודה)* — *עבדו והרגישו שימושיים?* — טקסט ארוך
8. **ביצועים** — *משהו איטי, תקוע או מקרטע? איפה?* — טקסט ארוך
9. **נייד / טלפון** — *ניסית בטלפון? איך זה הרגיש?* — בחירה (לא ניסיתי / מצוין / סביר / מחוספס) + הערה
10. **עברית / ערבית ו-RTL (ימין לשמאל)** — *משהו שבור או מסורבל בעברית/ערבית?* — טקסט ארוך
11. **באגים שנתקלת בהם** — טקסט ארוך (בקשו צעדים לשחזור + מכשיר/דפדפן)
12. **הדבר הכי בעל ערך** — *איזו תכונה אחת באמת היית משאיר/משתמש בה?* — טקסט קצר
13. **מה הכי חסר** — טקסט קצר
14. **האם תמליץ על זה למורה?** — סולם 0–10 (NPS)
15. **עוד משהו?** — טקסט ארוך
16. *(אופציונלי)* **אימייל אם אתה פתוח לשיחת המשך** — טקסט קצר

---

## 4. After the beta

- `UPDATE public.beta_invite_codes SET active = false …` to close signups.
- Trialing testers naturally drop to Free when their 14 days lapse.
- To keep someone on as a real teacher, nothing more is needed — their email is
  already on the allowlist.
