/**
 * dashboard-onboarding.ts — i18n strings for DashboardOnboarding
 * (the first-run spotlight tour that walks a new teacher through
 * the dashboard in 6 steps).
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../../hooks/useLanguage";

export interface DashboardOnboardingStrings {
  steps: Array<{ title: string; description: string }>;
  stepCounter: (current: number, total: number) => string;
  skipTour: string;
  skipAll: string;
  next: string;
  gotIt: string;
}

export const dashboardOnboardingT: Record<Language, DashboardOnboardingStrings> = {
  en: {
    steps: [
      {
        title: "Quick Online Challenge",
        description: "Create a QR code for instant vocabulary games — students scan and play, no login needed.",
      },
      {
        title: "Classroom Analytics",
        description: "See scores, trends, most-missed words, and which students need extra help.",
      },
      {
        title: "Students & Grades",
        description: "Track every student's progress, scores, and detailed mistake history.",
      },
      {
        title: "Student Approvals",
        description: "When students sign up with your class code, approve or reject them here.",
      },
      {
        title: "Your Classes",
        description: "Create classes, get shareable codes, assign vocabulary, and manage students.",
      },
      {
        title: "Create Your First Class",
        description: "Start here — create a class to get a code you can share with your students.",
      },
    ],
    stepCounter: (cur, total) => `Step ${cur} of ${total}`,
    skipTour: "Skip tour",
    skipAll: "Skip All",
    next: "Next",
    gotIt: "Got it!",
  },
  he: {
    steps: [
      {
        title: "אתגר מהיר אונליין",
        description: "צרו קוד QR למשחק מילים מיידי — התלמידים סורקים ומשחקים, ללא צורך בהתחברות.",
      },
      {
        title: "ניתוח כיתתי",
        description: "צפו בציונים, מגמות, מילים שמפספסים הכי הרבה, ואילו תלמידים זקוקים לעזרה נוספת.",
      },
      {
        title: "תלמידים וציונים",
        description: "עקבו אחר ההתקדמות של כל תלמיד, הציונים, וההיסטוריה המפורטת של הטעויות.",
      },
      {
        title: "אישור תלמידים",
        description: "כשתלמידים נרשמים עם קוד הכיתה שלכם, אשרו או דחו אותם כאן.",
      },
      {
        title: "הכיתות שלכם",
        description: "צרו כיתות, קבלו קודי שיתוף, הקצו אוצר מילים, ונהלו תלמידים.",
      },
      {
        title: "צרו את הכיתה הראשונה שלכם",
        description: "התחילו כאן — צרו כיתה כדי לקבל קוד שתוכלו לשתף עם התלמידים שלכם.",
      },
    ],
    stepCounter: (cur, total) => `שלב ${cur} מתוך ${total}`,
    skipTour: "דלגו על הסיור",
    skipAll: "דלגו על הכול",
    next: "הבא",
    gotIt: "הבנתי!",
  },
  ar: {
    steps: [
      {
        title: "تحدٍّ سريع عبر الإنترنت",
        description: "أنشئ رمز QR لألعاب مفردات فورية — يمسحه الطلاب ويلعبون، بلا تسجيل دخول.",
      },
      {
        title: "تحليلات الصف",
        description: "اطّلع على النقاط، الاتجاهات، أكثر الكلمات تخطّياً، وأي الطلاب يحتاج مساعدة إضافية.",
      },
      {
        title: "الطلاب والعلامات",
        description: "تتبّع تقدّم كل طالب، علاماته، وسجلّ أخطائه المفصّل.",
      },
      {
        title: "الموافقة على الطلاب",
        description: "عندما يسجّل الطلاب باستخدام رمز صفّك، وافق عليهم أو ارفضهم هنا.",
      },
      {
        title: "صفوفك",
        description: "أنشئ صفوفاً، احصل على رموز قابلة للمشاركة، عيّن المفردات، وأدِر الطلاب.",
      },
      {
        title: "أنشئ صفّك الأول",
        description: "ابدأ من هنا — أنشئ صفّاً للحصول على رمز يمكنك مشاركته مع طلابك.",
      },
    ],
    stepCounter: (cur, total) => `الخطوة ${cur} من ${total}`,
    skipTour: "تخطّي الجولة",
    skipAll: "تخطّي الكل",
    next: "التالي",
    gotIt: "فهمت!",
  },
};
