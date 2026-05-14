/**
 * app-toasts.ts — i18n strings for App.tsx top-level toasts (auth,
 * session restore, assignment delete/restore, class setup, Quick
 * Play session create).
 *
 * App.tsx pulls the active locale once at the top of its render and
 * uses these strings inside callbacks that fire later — DB-error
 * branches, sign-in failures, assignment teardown.
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../hooks/useLanguage";

export interface AppToastStrings {
  // Session restore + sign-in
  couldNotRestoreSession: string;
  signInFailed: string;
  signInTakingTooLong: string;

  // Assignment teardown / restore
  failedDeleteFromDb: (message: string) => string;
  assignmentRestored: string;
  failedDeleteAssignment: (message: string) => string;
  assignmentDeleted: string;

  // Class setup
  couldNotSetupClass: string;

  // Quick Play / Live session
  failedCreateSession: (message: string) => string;
}

export const appToastsT: Record<Language, AppToastStrings> = {
  en: {
    couldNotRestoreSession: "Could not restore session. Please sign in again.",
    signInFailed: "Sign-in failed. Please try again.",
    signInTakingTooLong: "Sign-in is taking too long. Please try again.",
    failedDeleteFromDb: (m) => `Failed to delete from database: ${m}`,
    assignmentRestored: "Assignment restored!",
    failedDeleteAssignment: (m) => `Failed to delete assignment: ${m}`,
    assignmentDeleted: "Assignment deleted successfully",
    couldNotSetupClass: "Couldn't set up your class — please try again.",
    failedCreateSession: (m) => `Failed to create session: ${m}`,
  },
  he: {
    couldNotRestoreSession: "לא ניתן לשחזר את ההתחברות. אנא היכנסו שוב.",
    signInFailed: "ההתחברות נכשלה. נסו שוב.",
    signInTakingTooLong: "ההתחברות לוקחת יותר מדי זמן. נסו שוב.",
    failedDeleteFromDb: (m) => `מחיקה מהמסד נתונים נכשלה: ${m}`,
    assignmentRestored: "המטלה שוחזרה!",
    failedDeleteAssignment: (m) => `מחיקת המטלה נכשלה: ${m}`,
    assignmentDeleted: "המטלה נמחקה בהצלחה",
    couldNotSetupClass: "לא הצלחנו להקים את הכיתה — נסו שוב.",
    failedCreateSession: (m) => `יצירת המשחק נכשלה: ${m}`,
  },
  ar: {
    couldNotRestoreSession: "تعذّر استعادة الجلسة. الرجاء تسجيل الدخول مرة أخرى.",
    signInFailed: "فشل تسجيل الدخول. حاول مرة أخرى.",
    signInTakingTooLong: "تسجيل الدخول يستغرق وقتاً طويلاً جداً. حاول مرة أخرى.",
    failedDeleteFromDb: (m) => `فشل الحذف من قاعدة البيانات: ${m}`,
    assignmentRestored: "تمت استعادة المهمة!",
    failedDeleteAssignment: (m) => `فشل حذف المهمة: ${m}`,
    assignmentDeleted: "تم حذف المهمة بنجاح",
    couldNotSetupClass: "تعذّر إعداد صفّك — حاول مرة أخرى.",
    failedCreateSession: (m) => `فشل إنشاء الجلسة: ${m}`,
  },
};
