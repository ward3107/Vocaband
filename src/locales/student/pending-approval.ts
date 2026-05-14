/**
 * pending-approval.ts — i18n strings for PendingApprovalScreen
 * (shown while a newly-signed-up student waits for their teacher's
 * approval click before being logged in).
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../../hooks/useLanguage";

export interface PendingApprovalStrings {
  waitingForApproval: string;
  bodyLead: string;
  inClass: (cls: string) => string;
  beforeYouCanPlay: string;
  whatToDoLabel: string;
  step1: string;
  step2: string;
  step3: string;
  checking: string;
  checkNow: string;
  useDifferentAccount: string;
  /** Auto-fires on approval. */
  approvedLoggingIn: string;
  notApprovedYet: string;
  couldNotCheck: string;
}

export const pendingApprovalT: Record<Language, PendingApprovalStrings> = {
  en: {
    waitingForApproval: "Waiting for approval",
    bodyLead: "Your teacher needs to approve",
    inClass: (cls) => `in class ${cls}`,
    beforeYouCanPlay: "before you can play.",
    whatToDoLabel: "What to do:",
    step1: "Tell your teacher you signed up",
    step2: "They'll approve you from their dashboard",
    step3: "This screen will update automatically",
    checking: "Checking...",
    checkNow: "Check now",
    useDifferentAccount: "Use a different account",
    approvedLoggingIn: "You've been approved! Logging in...",
    notApprovedYet: "Not approved yet. Ask your teacher!",
    couldNotCheck: "Could not check. Try again.",
  },
  he: {
    waitingForApproval: "ממתינים לאישור",
    bodyLead: "המורה צריך לאשר את",
    inClass: (cls) => `בכיתה ${cls}`,
    beforeYouCanPlay: "לפני שתוכלו לשחק.",
    whatToDoLabel: "מה לעשות:",
    step1: "ספרו למורה שנרשמתם",
    step2: "הוא יאשר אתכם מלוח המורה",
    step3: "המסך הזה יתעדכן אוטומטית",
    checking: "בודק...",
    checkNow: "בדקו עכשיו",
    useDifferentAccount: "השתמשו בחשבון אחר",
    approvedLoggingIn: "אושרתם! מתחבר...",
    notApprovedYet: "עדיין לא אושרתם. בקשו מהמורה!",
    couldNotCheck: "הבדיקה נכשלה. נסו שוב.",
  },
  ar: {
    waitingForApproval: "بانتظار الموافقة",
    bodyLead: "يحتاج معلّمك إلى الموافقة على",
    inClass: (cls) => `في الصف ${cls}`,
    beforeYouCanPlay: "قبل أن تتمكّن من اللعب.",
    whatToDoLabel: "ماذا تفعل:",
    step1: "أخبر معلّمك أنك سجّلت",
    step2: "سيوافق عليك من لوحة التحكم",
    step3: "ستتحدّث هذه الشاشة تلقائياً",
    checking: "جارٍ التحقّق...",
    checkNow: "تحقّق الآن",
    useDifferentAccount: "استخدم حساباً آخر",
    approvedLoggingIn: "تمت الموافقة عليك! جارٍ تسجيل الدخول...",
    notApprovedYet: "لم تتم الموافقة بعد. اسأل معلّمك!",
    couldNotCheck: "تعذّر التحقّق. حاول مرة أخرى.",
  },
};
