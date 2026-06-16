# Penetration test — request for proposal (RFP)

A ready-to-send brief for a security firm or freelance pentester, asking for a
**proposal + quote**. Fill the `<…>` placeholders before sending.

---

## English (email / message)

> **Subject: Request for proposal — penetration test of an EdTech web app**
>
> Hi <name / team>,
>
> We're looking for a fixed-scope penetration test of **Vocaband**, a web app
> used by schools. I'd like a **proposal and a quote**.
>
> **About the product**
> - English-vocabulary learning game for Israeli schools (grades 4–9). Users are
>   **teachers and minors (students)**, so child-data privacy matters.
> - Two user types: teachers (Google / Microsoft OAuth + email one-time-code) and
>   students (class code + PIN). There's a 14-day teacher trial / paid plans.
>
> **Tech stack / surface**
> - Frontend: React SPA served via a Cloudflare Worker.
> - Backend: Node/Express + WebSocket (socket.io) on Fly.io; REST `/api/*`.
> - Data: Supabase (Postgres with Row-Level Security, Storage), EU/Frankfurt.
> - AuthZ model leans heavily on **Postgres RLS** + SECURITY DEFINER RPCs.
> - AI features: image OCR + sentence generation via a Google AI key (server-side).
> - Custom auth domain; PWA; ~tens of thousands of users expected.
>
> **Scope we'd like covered**
> 1. **AuthN/AuthZ**: OAuth + OTP flows, session handling, the student
>    class-code/PIN path, privilege escalation (student→teacher, cross-tenant).
> 2. **RLS / data isolation**: can a teacher/student read or write another
>    class's, school's, or user's data? Test the RPCs directly, not just the UI.
> 3. **OWASP Top 10** on the REST + WebSocket endpoints (injection, IDOR, broken
>    access control, SSRF via the OCR/AI upload path, rate-limit/abuse).
> 4. **Privacy / minors' data**: exposure of student PII, export/delete flows.
> 5. **Client-side**: XSS, secrets in the bundle, CSP, dependency risks.
> 6. *(optional)* A light infra review of the Cloudflare/Fly/Supabase config.
>
> **What we'll provide**
> - A staging environment + test accounts (teacher, student, admin), a brief
>   architecture overview, and the relevant repo paths under NDA.
>
> **What we'd like in your proposal**
> - Methodology + standards you follow (e.g. OWASP WSTG, PTES).
> - Team, relevant EdTech / SaaS references, and certifications (OSCP, CREST, etc.).
> - Black-box vs grey-box approach and what access you need.
> - Timeline + total **fixed-price quote** (and day rate if scope grows).
> - Deliverables: report with severity ratings (CVSS), reproduction steps, and
>   remediation guidance; a **free re-test** of fixed issues.
> - Insurance, NDA, and data-handling / GDPR + Israeli Privacy Law compliance.
> - Authorization/scope sign-off and rules of engagement.
>
> Could you send a proposal and quote, and let me know your earliest availability?
> Happy to do a 20-min call.
>
> Thanks,
> <your name> — <role> — <phone / email>

---

## Hebrew (קצר)

> **נושא: בקשה להצעת מחיר — מבחן חדירה (Penetration Test) לאפליקציית EdTech**
>
> שלום <שם>,
>
> אנחנו מחפשים מבחן חדירה בהיקף מוגדר ל-**Vocaband**, אפליקציית ווב לבתי ספר
> (משחק אוצר מילים באנגלית, כיתות ד׳–ט׳). המשתמשים הם **מורים וקטינים**, ולכן
> פרטיות מידע של ילדים קריטית. נשמח **להצעה ולהצעת מחיר**.
>
> **סטאק:** React (SPA) דרך Cloudflare Worker; שרת Node/Express + WebSocket ב-Fly.io;
> מסד נתונים Supabase (Postgres עם RLS + Storage), אזור האיחוד האירופי. הרשאות
> מבוססות במידה רבה על RLS ו-RPC מסוג SECURITY DEFINER. תכונות AI (OCR + יצירת
> משפטים) דרך מפתח Google בצד השרת. התחברות: מורים ב-Google/Microsoft + קוד חד-פעמי
> במייל; תלמידים בקוד כיתה + PIN.
>
> **היקף מבוקש:** אימות והרשאות, בידוד נתונים ב-RLS (גישה חוצת-משתמשים/כיתות/בתי ספר),
> OWASP Top 10 ל-REST ו-WebSocket (כולל IDOR ו-SSRF בנתיב העלאת תמונה ל-OCR),
> פרטיות מידע קטינים, ובדיקות צד-לקוח (XSS/CSP/סודות ב-bundle). אופציונלי: סקירת
> תצורת התשתית.
>
> **נספק:** סביבת בדיקות, חשבונות בדיקה (מורה/תלמיד/מנהל), סקירת ארכיטקטורה, וגישה
> רלוונטית תחת NDA.
>
> **נבקש בהצעה:** מתודולוגיה ותקנים (OWASP WSTG / PTES), ניסיון והסמכות (OSCP/CREST),
> גישה נדרשת, לוח זמנים, **הצעת מחיר קבועה**, דוח עם דירוגי חומרה (CVSS) והמלצות
> תיקון, **בדיקה חוזרת חינם**, ביטוח ו-NDA, ועמידה ב-GDPR ובחוק הגנת הפרטיות.
>
> אשמח להצעה + הצעת מחיר וזמינות מוקדמת. נשמח גם לשיחה קצרה.
>
> תודה, <שם> — <תפקיד> — <טלפון/מייל>

---

## Where to find pentesters

- **Marketplaces**: Cobalt, HackerOne (pentest-as-a-service), Bugcrowd, Synack.
- **Firms**: regional/local AppSec shops; ask for **EdTech / SaaS + Supabase/RLS**
  experience specifically.
- **Freelance**: filter for **OSCP / CREST / OSWE** and recent web-app reports.
- Always require a signed **authorization / rules-of-engagement** doc before any
  testing — see `docs/SECURITY-OVERVIEW.md` and `scripts/security-pen-test.sh`
  (our own 4-check RLS smoke test) for context to hand the tester.
