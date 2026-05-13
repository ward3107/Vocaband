/**
 * student-pin-login.ts — i18n strings for StudentPinLoginCard.
 *
 * The PIN flow inside StudentAccountLoginView: pick-your-name grid →
 * 6-character PIN entry. Primary student login path (Path C), used when
 * the teacher has pre-created students with PINs.
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../../hooks/useLanguage";

export interface StudentPinLoginStrings {
  // Pick step
  pickYourName: string;
  loading: string;
  findYourName: string;
  noMatches: (filter: string) => string;
  emptyRosterTitle: string;
  emptyRosterBody: string;
  useDifferentMethod: string;

  // PIN step
  notMe: string;
  signingInAs: string;
  typeYourPin: string;
  letsGo: string;
  signingIn: string;

  // Errors
  loadFailed: string;
  invalidPinFormat: string;
  wrongPin: string;
  genericSignInError: string;
}

export const studentPinLoginT: Record<Language, StudentPinLoginStrings> = {
  en: {
    pickYourName: "Pick your name",
    loading: "Loading class list…",
    findYourName: "Find your name…",
    noMatches: (filter) => `No names match "${filter}".`,
    emptyRosterTitle: "No students yet in this class",
    emptyRosterBody: "Ask your teacher to add you to the class roster, then come back. Or use a different sign-in method below.",
    useDifferentMethod: "I don't see my name — use a different sign-in method",
    notMe: "Not me",
    signingInAs: "Signing in as",
    typeYourPin: "Type your PIN",
    letsGo: "Let's go",
    signingIn: "Signing in…",
    loadFailed: "Could not load class list",
    invalidPinFormat: "PIN must be 6 characters (letters A–Z and digits 2–9, no I/L/O/0/1).",
    wrongPin: "That PIN doesn't match. Ask your teacher to check it, or to reset your PIN.",
    genericSignInError: "Sign-in failed. Try again.",
  },
  he: {
    pickYourName: "בחרו את השם שלכם",
    loading: "טוען את רשימת הכיתה…",
    findYourName: "חפשו את השם שלכם…",
    noMatches: (filter) => `אין שמות שתואמים ל-"${filter}".`,
    emptyRosterTitle: "אין עדיין תלמידים בכיתה הזו",
    emptyRosterBody: "בקשו מהמורה להוסיף אתכם לרשימת הכיתה, ואז חזרו. או השתמשו בשיטת התחברות אחרת למטה.",
    useDifferentMethod: "לא רואים את השם שלכם? השתמשו בשיטת התחברות אחרת",
    notMe: "לא אני",
    signingInAs: "מתחברים בתור",
    typeYourPin: "הקלידו את ה-PIN שלכם",
    letsGo: "יאללה",
    signingIn: "מתחברים…",
    loadFailed: "לא ניתן לטעון את רשימת הכיתה",
    invalidPinFormat: "PIN חייב להיות 6 תווים (אותיות A–Z וספרות 2–9, בלי I/L/O/0/1).",
    wrongPin: "ה-PIN לא תואם. בקשו מהמורה לבדוק או לאפס לכם PIN.",
    genericSignInError: "ההתחברות נכשלה. נסו שוב.",
  },
  ar: {
    pickYourName: "اختر اسمك",
    loading: "جارٍ تحميل قائمة الصف…",
    findYourName: "ابحث عن اسمك…",
    noMatches: (filter) => `لا توجد أسماء تطابق "${filter}".`,
    emptyRosterTitle: "لا يوجد طلاب بعد في هذا الصف",
    emptyRosterBody: "اطلب من معلمك إضافتك إلى قائمة الصف ثم عُد. أو استخدم طريقة تسجيل دخول أخرى أدناه.",
    useDifferentMethod: "لا أرى اسمي — استخدم طريقة تسجيل دخول أخرى",
    notMe: "لست أنا",
    signingInAs: "تسجيل الدخول بصفة",
    typeYourPin: "اكتب رمز PIN",
    letsGo: "هيا بنا",
    signingIn: "جارٍ تسجيل الدخول…",
    loadFailed: "تعذّر تحميل قائمة الصف",
    invalidPinFormat: "يجب أن يتكوّن PIN من 6 أحرف (حروف A–Z وأرقام 2–9، بدون I/L/O/0/1).",
    wrongPin: "رمز PIN غير صحيح. اطلب من معلمك التحقق أو إعادة تعيين رمزك.",
    genericSignInError: "فشل تسجيل الدخول. حاول مرة أخرى.",
  },
};
