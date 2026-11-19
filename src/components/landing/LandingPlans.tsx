import { Check } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { FREE_OPEN_ASSIGNMENTS, MONTHLY_WORK_QUOTA, PERSONAL_BILLING, SCHOOL_BILLING } from '../../core/billingCatalog';

const copy = {
  he: {
    title: 'מסלולים ומחירים', year: 'לשנה', month: 'לחודש', or: 'או', free: 'חינמי', teacher: 'מורה', pro: 'מורה Pro',
    school: 'צוות אנגלית', start: 'פתיחת חשבון מורה', schoolAction: 'קבלת הצעה לבית הספר',
    launch: 'כיתה אחת ועד 30 תלמידים', activities: `עד ${FREE_OPEN_ASSIGNMENTS} משימות פתוחות`,
    play: 'משחקים, הצטרפות ב־QR ותוצאות לכל פעילות',
    personal: 'רשימות מילים אישיות ומשימות ללא מכסת משימות פתוחות', reports: 'מעקב התקדמות בכיתות שלך',
    students: (n: number) => `עד ${n} תלמידים בכיתות שלך`,
    ai: `הקצאה לכמה כיתות ועד ${MONTHLY_WORK_QUOTA} פעולות AI וסריקה בחודש`,
    team: `עד ${SCHOOL_BILLING.staff} מורים ו־${SCHOOL_BILLING.seats} תלמידים`,
    shared: 'חשבונות Pro, ספריית צוות והקצאת משימות לשכבה', admin: 'דוחות לרכזת, הדרכת פתיחה וחשבונית אחת',
    pilot: 'פיילוט לשישה שבועות לשני מורים. התשלום מתקזז מהרישיון השנתי.',
    extra: 'כל 50 תלמידים נוספים', afterCredit: 'לשנה הראשונה לאחר קיזוז הפיילוט',
    intro: '14 ימי ניסיון למורה. תלמידים מצטרפים דרך הכיתה.',
  },
  en: {
    title: 'Plans and pricing', year: 'per year', month: 'per month', or: 'or', free: 'Free', teacher: 'Teacher', pro: 'Teacher Pro',
    school: 'School English team', start: 'Open a teacher account', schoolAction: 'Request a school quote',
    launch: 'One class with up to 30 pupils', activities: `Up to ${FREE_OPEN_ASSIGNMENTS} open assignments`,
    play: 'Games, QR entry and activity results',
    personal: 'Personal word lists and as many open assignments as you need', reports: 'Track progress across your classes',
    students: (n: number) => `Up to ${n} pupils across your classes`,
    ai: `Multi-class assignment and ${MONTHLY_WORK_QUOTA} AI or scan requests per month`,
    team: `Up to ${SCHOOL_BILLING.staff} teachers and ${SCHOOL_BILLING.seats} pupils`,
    shared: 'Pro accounts, shared library and group assignments', admin: 'Coordinator reports, onboarding and one invoice',
    pilot: 'Six-week pilot for two teachers. The payment counts toward the annual license.',
    extra: 'Each additional 50 pupils', afterCredit: 'for the first year after pilot credit',
    intro: '14-day teacher trial. Students join through their class.',
  },
  ar: {
    title: 'الخطط والأسعار', year: 'سنويًا', month: 'شهريًا', or: 'أو', free: 'مجاني', teacher: 'معلّم', pro: 'معلّم Pro',
    school: 'طاقم الإنجليزية', start: 'افتح حساب معلّم', schoolAction: 'اطلب عرضًا للمدرسة',
    launch: 'صف واحد حتى 30 طالبًا', activities: `حتى ${FREE_OPEN_ASSIGNMENTS} واجبات مفتوحة`,
    play: 'ألعاب، دخول عبر QR ونتائج لكل نشاط',
    personal: 'قوائم كلمات شخصية وواجبات مفتوحة بلا حد', reports: 'تتبّع تقدّم الطلاب في صفوفك',
    students: (n: number) => `حتى ${n} طالبًا في صفوفك`,
    ai: `إسناد لعدة صفوف وحتى ${MONTHLY_WORK_QUOTA} عملية ذكاء اصطناعي أو مسح شهريًا`,
    team: `حتى ${SCHOOL_BILLING.staff} معلّمين و${SCHOOL_BILLING.seats} طالب`,
    shared: 'حسابات Pro ومكتبة مشتركة وواجبات جماعية', admin: 'تقارير للمنسّق وتدريب وفاتورة واحدة',
    pilot: 'تجربة لستة أسابيع لمعلّمين. يُخصم المبلغ من الاشتراك السنوي.',
    extra: 'لكل 50 طالبًا إضافيًا', afterCredit: 'للسنة الأولى بعد خصم مبلغ التجربة',
    intro: 'تجربة للمعلّم لمدة 14 يومًا. ينضم الطلاب عبر صفهم.',
  },
};

export default function LandingPlans({ onTeacher, onSchool }: { onTeacher: () => void; onSchool: () => void }) {
  const { language, dir } = useLanguage();
  const t = copy[language];
  const money = (agorot: number) => new Intl.NumberFormat(language, {
    style: 'currency', currency: 'ILS', maximumFractionDigits: 0,
  }).format(agorot / 100);
  const plans = [
    { name: t.free, price: 0, points: [t.launch, t.activities, t.play] },
    { name: t.teacher, price: PERSONAL_BILLING.teacher.annual, monthly: PERSONAL_BILLING.teacher.monthly,
      points: [t.students(PERSONAL_BILLING.teacher.seats), t.personal, t.reports] },
    { name: t.pro, price: PERSONAL_BILLING.pro.annual, monthly: PERSONAL_BILLING.pro.monthly, extra: true,
      points: [t.students(PERSONAL_BILLING.pro.seats), t.personal, t.reports, t.ai] },
    { name: t.school, price: SCHOOL_BILLING.annual, school: true, points: [t.team, t.shared, t.admin] },
  ];

  return (
    <section dir={dir} className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-labelledby="vocaband-pricing">
      <h2 id="vocaband-pricing" className="text-center text-3xl font-bold">{t.title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-sm">{t.intro}</p>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <article key={plan.name} className={`flex flex-col gap-3 rounded-2xl border p-4 ${plan.school ? 'border-violet-400 bg-violet-100 text-slate-900' : 'bg-white text-slate-900'}`}>
            <h3 className="text-lg font-bold">{plan.name}</h3>
            <p><strong className="text-2xl">{money(plan.price)}</strong>{plan.price > 0 ? ` ${t.year}` : ''}</p>
            {plan.monthly && <p className="text-sm">{t.or} {money(plan.monthly)} {t.month}</p>}
            <ul className="space-y-2 text-sm">
              {plan.points.map((line) => <li key={line} className="flex items-start gap-2">
                <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-violet-700" />{line}
              </li>)}
            </ul>
            {plan.extra && (
              <p className="text-sm">{t.extra} · {money(PERSONAL_BILLING.proExtension.annual)} {t.year} {t.or} {money(PERSONAL_BILLING.proExtension.monthly)} {t.month}</p>
            )}
            {plan.school && (
              <p className="text-sm">
                <strong>{money(SCHOOL_BILLING.pilot)}</strong> · {t.pilot}<br />
                <strong>{money(SCHOOL_BILLING.annual - SCHOOL_BILLING.pilot)}</strong> {t.afterCredit}
              </p>
            )}
            <button type="button" className="mt-auto min-h-11 rounded-xl bg-violet-700 px-3 py-2 text-sm font-bold text-white"
              onClick={plan.school ? onSchool : onTeacher}>{plan.school ? t.schoolAction : t.start}</button>
          </article>
        ))}
      </div>
    </section>
  );
}
