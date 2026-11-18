import type { Language } from '../../hooks/useLanguage';

const messages = {
  en: {
    classes: 'Free includes one active class. View plans to add more classes.',
    students: 'Your plan has reached its student limit. View plans for more places.',
    assignments: 'Free includes three open assignments. Close one in the dashboard or choose a Teacher plan.',
  },
  he: {
    classes: 'המסלול החינמי כולל כיתה פעילה אחת. אפשר להוסיף כיתות במסלול מורה.',
    students: 'הגעת למכסת התלמידים במסלול שלך. במסך המסלולים אפשר להגדיל את המכסה.',
    assignments: 'המסלול החינמי כולל שלוש משימות פתוחות. אפשר לסגור משימה בלוח המורה או לבחור מסלול מורה.',
  },
  ar: {
    classes: 'تشمل الخطة المجانية صفًا نشطًا واحدًا. اختر خطة المعلّم لإضافة صفوف.',
    students: 'بلغت الحدّ الأقصى للطلاب في خطتك. اعرض الخطط لإضافة مقاعد.',
    assignments: 'تشمل الخطة المجانية ثلاثة واجبات مفتوحة. أغلق واجبًا من لوحة المعلّم أو اختر خطة المعلّم.',
  },
} satisfies Record<Language, { classes: string; students: string; assignments: string }>;

export function billingLimitMessage(error: unknown, language: Language): string | undefined {
  const message = error && typeof error === 'object' && 'message' in error ? error.message : error;
  if (typeof message !== 'string') return undefined;
  const copy = messages[language];
  if (message === 'free_tier_class_cap') return copy.classes;
  if (message === 'free_tier_assignment_cap') return copy.assignments;
  if (['plan_student_cap', 'free_tier_student_cap', 'free_tier_cap'].includes(message)) return copy.students;
  return undefined;
}
