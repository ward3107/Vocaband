/**
 * competitions.ts — i18n strings for the classroom-competition feature.
 *
 * Shared between teacher and student surfaces because the strings are
 * short and largely symmetric (badge labels, leaderboard headers, the
 * teacher toggle).  Follows the same Record<Language, Strings> pattern
 * documented in docs/I18N-MIGRATION.md.
 */
import type { Language } from '../hooks/useLanguage';

export interface CompetitionStrings {
  // Teacher toggle on the assignment Review step
  enableLabel: string;
  enableHelp: string;
  needsDeadline: string;

  // Status pills / badges
  badgeLive: string;
  badgeEnded: string;
  endsAt: (when: string) => string;
  endedAt: (when: string) => string;

  // Leaderboard modal
  modalTitleLive: string;
  modalTitleEnded: string;
  modalEmpty: string;
  modalCloseButton: string;
  viewStandings: string;
  endNow: string;
  endNowConfirm: string;

  // Column headers / footer
  rankColumn: string;
  studentColumn: string;
  scoreColumn: string;
  finishedFirstNote: string;
  youLabel: string;
}

export const competitionsT: Record<Language, CompetitionStrings> = {
  en: {
    enableLabel: 'Make this a competition',
    enableHelp:
      'Students will see a live leaderboard. The competition ends at the assignment deadline.',
    needsDeadline: 'Set a deadline above to enable competition mode.',

    badgeLive: '🏆 Competition',
    badgeEnded: '🏁 Competition ended',
    endsAt: (when) => `Ends ${when}`,
    endedAt: (when) => `Ended ${when}`,

    modalTitleLive: 'Live standings',
    modalTitleEnded: 'Final standings',
    modalEmpty: 'No scores yet — be the first to play!',
    modalCloseButton: 'Close',
    viewStandings: 'View standings',
    endNow: 'End competition now',
    endNowConfirm: 'End this competition now? The leaderboard will freeze.',

    rankColumn: '#',
    studentColumn: 'Student',
    scoreColumn: 'Score',
    finishedFirstNote: 'Ties go to whoever reached that score first.',
    youLabel: 'You',
  },
  he: {
    enableLabel: 'הפוך לתחרות',
    enableHelp: 'התלמידים יראו טבלת דירוג חיה. התחרות מסתיימת במועד ההגשה של המטלה.',
    needsDeadline: 'יש לקבוע מועד הגשה למעלה כדי להפעיל מצב תחרות.',

    badgeLive: '🏆 תחרות',
    badgeEnded: '🏁 התחרות הסתיימה',
    endsAt: (when) => `מסתיים ב־${when}`,
    endedAt: (when) => `הסתיים ב־${when}`,

    modalTitleLive: 'דירוג חי',
    modalTitleEnded: 'דירוג סופי',
    modalEmpty: 'אין עדיין תוצאות — היו הראשונים לשחק!',
    modalCloseButton: 'סגירה',
    viewStandings: 'הצג דירוג',
    endNow: 'סיים תחרות עכשיו',
    endNowConfirm: 'לסיים את התחרות עכשיו? טבלת הדירוג תקופא.',

    rankColumn: '#',
    studentColumn: 'תלמיד/ה',
    scoreColumn: 'ניקוד',
    finishedFirstNote: 'שוויון מוכרע לפי מי שהגיע ראשון לניקוד.',
    youLabel: 'את/ה',
  },
  ar: {
    enableLabel: 'حوّل هذا إلى مسابقة',
    enableHelp: 'سيرى الطلاب لوحة صدارة حية. تنتهي المسابقة عند الموعد النهائي للمهمة.',
    needsDeadline: 'حدّد موعدًا نهائيًا أعلاه لتفعيل وضع المسابقة.',

    badgeLive: '🏆 مسابقة',
    badgeEnded: '🏁 انتهت المسابقة',
    endsAt: (when) => `تنتهي في ${when}`,
    endedAt: (when) => `انتهت في ${when}`,

    modalTitleLive: 'الترتيب المباشر',
    modalTitleEnded: 'الترتيب النهائي',
    modalEmpty: 'لا توجد نتائج بعد — كن الأول في اللعب!',
    modalCloseButton: 'إغلاق',
    viewStandings: 'عرض الترتيب',
    endNow: 'إنهاء المسابقة الآن',
    endNowConfirm: 'إنهاء هذه المسابقة الآن؟ ستتجمد لوحة الصدارة.',

    rankColumn: '#',
    studentColumn: 'الطالب',
    scoreColumn: 'النتيجة',
    finishedFirstNote: 'في حالة التعادل يفوز من وصل إلى النتيجة أولًا.',
    youLabel: 'أنت',
  },
};
