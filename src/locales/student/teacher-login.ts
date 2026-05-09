/**
 * Locale file for the teacher-login screen.
 *
 * Two auth paths share this screen:
 *  - "Sign in with Google" (existing OAuth flow)
 *  - Email + 6-digit OTP code (new, for shared classroom PCs where
 *    teachers don't want their personal Google session left behind)
 *
 * See docs/I18N-MIGRATION.md for the pattern.
 */
import type { Language } from "../../hooks/useLanguage";

export interface TeacherLoginT {
  heading: string;
  signInWithGoogle: string;
  signInWithMicrosoft: string;
  divider: string;
  emailLabel: string;
  emailPlaceholder: string;
  sendCodeButton: string;
  sending: string;
  /** Headline shown after we send the code, before they enter it. */
  checkEmailHeading: string;
  /** "We sent a 6-digit code to {email}" */
  codeSentTo: (email: string) => string;
  enterCodeLabel: string;
  verifyButton: string;
  verifying: string;
  /** "Didn't get it? Resend in {seconds}s" */
  resendIn: (seconds: number) => string;
  resendButton: string;
  useDifferentEmail: string;
  /** Surfaced when verifyOtp fails (bad/expired code). */
  errorInvalidCode: string;
  /** Surfaced when sendOtp fails (bad email, rate limit, etc.). */
  errorSendFailed: string;
  /** When the email isn't on the allowlist after successful verify. */
  errorNotAllowlisted: string;
  /** Tiny print explaining what the code is for. */
  helpText: string;
  /** Checkbox label below the email input. */
  rememberMe: string;
  /** Hint shown next to the checkbox so teachers on shared classroom
   *  PCs know to leave it unchecked. */
  rememberMeHint: string;
  // Two-pane layout — left brand pane copy.
  welcomeHeading: string;
  welcomeSubtitle: string;
  subtitleHint: string;
  trustOrigin: string;
  trustEu: string;
  trustCurriculum: string;
  /** Smaller Microsoft fallback link under the dominant Google button. */
  microsoftFallback: string;
}

export const teacherLoginT: Record<Language, TeacherLoginT> = {
  en: {
    heading: "Sign in to Vocaband",
    signInWithGoogle: "Sign in with Google",
    signInWithMicrosoft: "Sign in with Microsoft",
    divider: "or sign in with email",
    emailLabel: "Email",
    emailPlaceholder: "teacher@school.edu",
    sendCodeButton: "Send me a sign-in code",
    sending: "Sending…",
    checkEmailHeading: "Check your email",
    codeSentTo: (email) => `We sent a 6-digit code to ${email}`,
    enterCodeLabel: "Enter the code",
    verifyButton: "Verify and sign in",
    verifying: "Verifying…",
    resendIn: (s) => `Resend in ${s}s`,
    resendButton: "Resend code",
    useDifferentEmail: "← Use a different email",
    errorInvalidCode: "That code didn't work. Try again or request a new one.",
    errorSendFailed: "We couldn't send the code. Check the email and try again.",
    errorNotAllowlisted: "That email isn't approved as a teacher account yet. Ask the admin to add it.",
    helpText: "We never store passwords. The code expires in 10 minutes.",
    rememberMe: "Remember my email on this device",
    rememberMeHint: "Leave unchecked on shared / classroom computers.",
    welcomeHeading: "Welcome back, teacher.",
    welcomeSubtitle: "Curriculum-aligned vocabulary games for Israeli classrooms. Loved by students. Zero prep for teachers.",
    subtitleHint: "Single sign-on. We never share your email.",
    trustOrigin: "Built in Israel",
    trustEu: "EU-hosted",
    trustCurriculum: "MoE Set 1 / 2 / 3",
    microsoftFallback: "Sign in with Microsoft instead",
  },
  he: {
    heading: "התחברות ל-Vocaband",
    signInWithGoogle: "התחבר עם Google",
    signInWithMicrosoft: "התחבר עם Microsoft",
    divider: "או התחבר באמצעות אימייל",
    emailLabel: "אימייל",
    emailPlaceholder: "teacher@school.edu",
    sendCodeButton: "שלח לי קוד התחברות",
    sending: "שולח…",
    checkEmailHeading: "בדוק את האימייל שלך",
    codeSentTo: (email) => `שלחנו קוד בן 6 ספרות אל ${email}`,
    enterCodeLabel: "הזן את הקוד",
    verifyButton: "אמת והתחבר",
    verifying: "מאמת…",
    resendIn: (s) => `שלח שוב בעוד ${s} שניות`,
    resendButton: "שלח שוב",
    useDifferentEmail: "← השתמש באימייל אחר",
    errorInvalidCode: "הקוד אינו תקף. נסה שוב או בקש קוד חדש.",
    errorSendFailed: "לא הצלחנו לשלוח את הקוד. בדוק את האימייל ונסה שוב.",
    errorNotAllowlisted: "האימייל הזה עדיין לא מאושר כחשבון מורה. בקש מהמנהל להוסיף אותו.",
    helpText: "אנחנו לא שומרים סיסמאות. הקוד יפוג תוך 10 דקות.",
    rememberMe: "זכור את האימייל שלי במכשיר זה",
    rememberMeHint: "השאר לא מסומן במחשבים משותפים / כיתתיים.",
    welcomeHeading: "ברוכים השבים, מורים.",
    welcomeSubtitle: "משחקי אוצר מילים בהתאמה לתוכנית הלימודים, מותאמים לכיתות ישראליות. אהובים על תלמידים. אפס הכנה למורים.",
    subtitleHint: "כניסה אחת. לא נחלוק את האימייל שלכם לעולם.",
    trustOrigin: "מיוצר בישראל",
    trustEu: "מאוחסן באירופה",
    trustCurriculum: "משרד החינוך 1 / 2 / 3",
    microsoftFallback: "התחברו עם Microsoft במקום",
  },
  ar: {
    heading: "تسجيل الدخول إلى Vocaband",
    signInWithGoogle: "تسجيل الدخول بحساب Google",
    signInWithMicrosoft: "تسجيل الدخول بحساب Microsoft",
    divider: "أو سجل الدخول عبر البريد الإلكتروني",
    emailLabel: "البريد الإلكتروني",
    emailPlaceholder: "teacher@school.edu",
    sendCodeButton: "أرسل لي رمز تسجيل الدخول",
    sending: "جارٍ الإرسال…",
    checkEmailHeading: "تحقق من بريدك الإلكتروني",
    codeSentTo: (email) => `أرسلنا رمزًا من 6 أرقام إلى ${email}`,
    enterCodeLabel: "أدخل الرمز",
    verifyButton: "تحقق وسجل الدخول",
    verifying: "جارٍ التحقق…",
    resendIn: (s) => `إعادة الإرسال خلال ${s} ث`,
    resendButton: "إعادة إرسال الرمز",
    useDifferentEmail: "← استخدم بريدًا إلكترونيًا مختلفًا",
    errorInvalidCode: "الرمز غير صحيح. حاول مرة أخرى أو اطلب رمزًا جديدًا.",
    errorSendFailed: "لم نتمكن من إرسال الرمز. تحقق من البريد الإلكتروني وحاول مرة أخرى.",
    errorNotAllowlisted: "هذا البريد الإلكتروني غير معتمد بعد كحساب معلم. اطلب من المسؤول إضافته.",
    helpText: "نحن لا نخزن كلمات المرور أبدًا. ينتهي الرمز خلال 10 دقائق.",
    rememberMe: "تذكر بريدي الإلكتروني على هذا الجهاز",
    rememberMeHint: "اترك بدون تحديد على أجهزة الكمبيوتر المشتركة / الصفية.",
    welcomeHeading: "مرحبًا بعودتك، أيها المعلم.",
    welcomeSubtitle: "ألعاب مفردات متوافقة مع المنهج للصفوف الإسرائيلية. يحبها الطلاب. صفر تحضير للمعلمين.",
    subtitleHint: "تسجيل دخول موحد. لن نشارك بريدك الإلكتروني أبدًا.",
    trustOrigin: "صُنع في إسرائيل",
    trustEu: "مستضاف في الاتحاد الأوروبي",
    trustCurriculum: "وزارة التربية 1 / 2 / 3",
    microsoftFallback: "سجّل الدخول بحساب Microsoft بدلاً من ذلك",
  },
};
