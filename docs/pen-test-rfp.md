# בקשה להצעת מחיר — מבחן חדירה (Penetration Test)

מסמך מוכן לשליחה לחברת אבטחה או לבודק/ת חדירה עצמאי/ת, הכולל בקשה ל**הצעה ולהצעת
מחיר**. מלאו את ה-`<…>` לפני השליחה.

---

## עברית (מייל / הודעה)

> **נושא: בקשה להצעת מחיר — מבחן חדירה לאפליקציית ווב בתחום החינוך**
>
> שלום <שם / צוות>,
>
> אנחנו מחפשים מבחן חדירה בהיקף מוגדר ל-**Vocaband**, אפליקציית ווב שמשמשת בתי
> ספר. נשמח לקבל **הצעה מפורטת והצעת מחיר**.
>
> **על המוצר**
> - משחק ללימוד אוצר מילים באנגלית לבתי ספר בישראל (כיתות ד׳–ט׳). המשתמשים הם
>   **מורים וקטינים (תלמידים)**, ולכן פרטיות מידע של ילדים היא קריטית.
> - שני סוגי משתמשים: מורים (התחברות דרך Google / Microsoft OAuth + קוד חד-פעמי
>   במייל) ותלמידים (קוד כיתה + PIN). קיימת תקופת ניסיון בת 14 יום למורים ותוכניות
>   בתשלום.
>
> **מחסנית טכנולוגית / משטח תקיפה**
> - צד לקוח: אפליקציית React (SPA) המוגשת דרך Cloudflare Worker.
> - צד שרת: Node/Express + WebSocket‏ (socket.io) על Fly.io; ממשק REST תחת ‎/api/*‎.
> - מסד נתונים: Supabase‏ (Postgres עם Row-Level Security ו-Storage), באזור האיחוד
>   האירופי (פרנקפורט).
> - מודל ההרשאות נשען במידה רבה על **RLS ב-Postgres** ועל פונקציות SECURITY DEFINER.
> - יכולות AI: ‏OCR של תמונות ויצירת משפטים דרך מפתח Google (בצד השרת).
> - דומיין התחברות ייעודי; אפליקציית PWA; צפי לעשרות אלפי משתמשים.
>
> **היקף מבוקש**
> 1. **אימות והרשאות**: תהליכי OAuth ו-OTP, ניהול session, נתיב קוד-כיתה/PIN של
>    תלמידים, והסלמת הרשאות (תלמיד→מורה, חציית גבולות בין משתמשים/כיתות).
> 2. **בידוד נתונים ב-RLS**: האם מורה/תלמיד יכול לקרוא או לכתוב נתונים של כיתה /
>    בית ספר / משתמש אחר? יש לבדוק את ה-RPC ישירות, לא רק דרך הממשק.
> 3. **OWASP Top 10** על נקודות הקצה של REST ו-WebSocket (הזרקות, IDOR, בקרת גישה
>    שבורה, SSRF בנתיב העלאת התמונה ל-OCR, הגבלות קצב וניצול לרעה).
> 4. **פרטיות ומידע קטינים**: חשיפת מידע אישי (PII) של תלמידים, ותהליכי ייצוא/מחיקה.
> 5. **צד לקוח**: ‏XSS, סודות בתוך ה-bundle, ‏CSP, וסיכוני תלויות (dependencies).
> 6. *(אופציונלי)* סקירה קלה של תצורת התשתית (Cloudflare / Fly / Supabase).
>
> **מה נספק**
> - סביבת staging + חשבונות בדיקה (מורה, תלמיד, מנהל), סקירת ארכיטקטורה קצרה, וגישה
>   לנתיבי הקוד הרלוונטיים תחת NDA.
>
> **מה נבקש שיופיע בהצעה**
> - מתודולוגיה ותקנים שאתם פועלים לפיהם (למשל OWASP WSTG, ‏PTES).
> - הצוות, ניסיון רלוונטי (EdTech / SaaS) והסמכות (OSCP, ‏CREST וכד׳).
> - גישת black-box מול grey-box ואיזו גישה תזדקקו לה.
> - לוח זמנים + **הצעת מחיר קבועה** כוללת (ותעריף יומי אם ההיקף יתרחב).
> - תוצרים: דוח עם דירוגי חומרה (CVSS), שלבי שחזור, והמלצות לתיקון; **בדיקה חוזרת
>   חינם** לאחר תיקון הממצאים.
> - ביטוח, ‏NDA, וטיפול בנתונים בהתאם ל-GDPR ולחוק הגנת הפרטיות הישראלי.
> - אישור הרשאה/היקף (authorization) וכללי התקשרות (rules of engagement).
>
> תוכלו לשלוח הצעה והצעת מחיר, ולעדכן מהי הזמינות המוקדמת ביותר שלכם? אשמח גם לשיחה
> קצרה של כ-20 דקות.
>
> תודה,
> <שם> — <תפקיד> — <טלפון / מייל>

---

## English version (optional)

> **Subject: Request for proposal — penetration test of an EdTech web app**
>
> Hi <name / team>,
>
> We're looking for a fixed-scope penetration test of **Vocaband**, a web app used
> by schools. I'd like a **proposal and a quote**.
>
> **Product:** English-vocabulary learning game for Israeli schools (grades 4–9).
> Users are **teachers and minors (students)**, so child-data privacy matters.
> Teachers sign in via Google/Microsoft OAuth + email OTP; students via class code
> + PIN. 14-day teacher trial / paid plans.
>
> **Stack / surface:** React SPA via a Cloudflare Worker; Node/Express + WebSocket
> (socket.io) on Fly.io with REST `/api/*`; Supabase (Postgres + RLS, Storage), EU.
> AuthZ leans heavily on Postgres **RLS** + SECURITY DEFINER RPCs. AI: image OCR +
> sentence generation via a server-side Google AI key.
>
> **Scope:** (1) AuthN/AuthZ — OAuth/OTP, sessions, student PIN path, privilege
> escalation (student→teacher, cross-tenant); (2) RLS / data isolation — test RPCs
> directly, not just the UI; (3) OWASP Top 10 on REST + WebSocket (injection, IDOR,
> broken access control, SSRF via OCR upload, rate-limit/abuse); (4) privacy /
> minors' PII + export/delete; (5) client-side — XSS, secrets in bundle, CSP, deps;
> (6) optional infra review.
>
> **We'll provide:** staging + test accounts (teacher/student/admin), an
> architecture overview, and relevant repo paths under NDA.
>
> **Please include in your proposal:** methodology + standards (OWASP WSTG, PTES);
> team, EdTech/SaaS references, certs (OSCP, CREST); black-box vs grey-box and
> access needed; timeline + **fixed-price quote** (and day rate); deliverables with
> CVSS severities, repro steps, remediation, and a **free re-test**; insurance, NDA,
> GDPR + Israeli Privacy Law compliance; authorization + rules of engagement.
>
> Could you send a proposal and quote, plus your earliest availability? Happy to do
> a 20-min call.
>
> Thanks, <name> — <role> — <phone / email>

---

## איפה למצוא בודקי חדירה

- **פלטפורמות**: Cobalt, ‏HackerOne‏ (pentest-as-a-service), ‏Bugcrowd, ‏Synack.
- **חברות**: חברות AppSec מקומיות — בקשו ניסיון ספציפי ב-**EdTech / SaaS וב-
  Supabase/RLS**.
- **עצמאיים**: סננו לפי הסמכות **OSCP / CREST / OSWE** ודוחות web-app עדכניים.
- תמיד דרשו מסמך **אישור / כללי התקשרות (authorization / rules of engagement)** חתום
  לפני כל בדיקה — ראו `docs/SECURITY-OVERVIEW.md` ואת `scripts/security-pen-test.sh`
  (בדיקת ה-RLS הפנימית שלנו, 4 בדיקות) כהקשר למסירה לבודק/ת.
