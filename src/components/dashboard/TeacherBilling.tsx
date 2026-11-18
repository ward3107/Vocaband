import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { supabase } from '../../core/supabase';
import { SCHOOL_BILLING, PERSONAL_BILLING, type BillingQuote, type BillingEntitlement } from '../../core/billingCatalog';
import type { Language } from '../../hooks/useLanguage';

const strings = {
  he: {
    support: 'פנייה לגבי המנוי',
    cancelPending: 'בקשת הביטול התקבלה. כאן יופיע אישור כשהחידוש יופסק.',
    other: 'כבר פתוח עבורך קישור לתשלום. אפשר להשלים אותו או לנסות שוב כשיפוג.',
    prepare: 'קישור התשלום בהכנה. אפשר לנסות שוב בעוד רגע.',
    updated: 'מספר התלמידים השתנה. בדקו את המחיר המעודכן לפני המעבר לתשלום.',
    verify: 'כדי לקבל קבלה, יש לאמת את כתובת המייל בחשבון.',
    title: 'המנוי שלי',
    close: 'סגירה',
    loading: 'טוענים את פרטי המנוי…',
    error: 'לא הצלחנו להשלים את הפעולה.',
    retry: 'נסו שוב',
    free: 'מסלול חינמי',
    covered: 'החשבון מכוסה ברישיון קיים.',
    trial: 'תקופת הניסיון מסתיימת ב־',
    paid: 'הגישה בתשלום זמינה עד ',
    year: 'Pro שנתי',
    month: 'Pro חודשי',
    students: 'תלמידים מאושרים בכיתות שלך',
    monthly: 'לחודש',
    annually: 'לשנה',
    perStudent: 'לתלמיד',
    cap: 'תקרה שנתית לכל הכיתות יחד',
    saveAmount: 'חיסכון לעומת 12 תשלומים חודשיים',
    prepaid: 'תשלום אחד לתקופה שבחרת. אפשר לחדש בסופה לפי מספר התלמידים שיהיה אז.',
    buyAfterTrial: 'אפשר לבחור ולשלם כשהניסיון החינמי מסתיים.',
    noStudents: 'אחרי שתאשרו תלמיד בכיתה, יופיע כאן המחיר.',
    buy: 'המשך לתשלום',
    off: 'רכישה עצמאית תיפתח לאחר חיבור הסליקה.',
    cancel: 'ביטול החידוש',
    confirm: 'להפסיק את החידוש האוטומטי? הגישה תישמר עד סוף התקופה ששולמה.',
    canceled: 'החידוש האוטומטי בוטל.',
    pending: 'התשלום בבדיקה. ניתן לחזור לכאן כדי לראות את סטטוס המנוי.',
    confirmed: 'התשלום אושר.',
    email: 'אני רוצה לקבל במייל חדשות למורים, תזכורות על הניסיון ומבצעים. אפשר להסיר בכל עת.',
    lang: 'שפה',
    save: 'שמירת העדפות',
    saved: 'ההעדפות נשמרו.',
  },
  ar: {
    support: 'تواصل بخصوص الاشتراك',
    cancelPending: 'استلمنا طلب الإلغاء. سيظهر التأكيد هنا عند إيقاف التجديد.',
    other: 'لديك رابط دفع مفتوح. يمكنك إتمام الدفع عبره أو المحاولة بعد انتهاء صلاحيته.',
    prepare: 'يجري إعداد رابط الدفع. حاول مرة أخرى بعد قليل.',
    updated: 'تغيّر عدد الطلاب. راجع السعر المحدّث قبل متابعة الدفع.',
    verify: 'أكّد عنوان البريد الإلكتروني في حسابك لاستلام الإيصال.',
    title: 'اشتراكي',
    close: 'إغلاق',
    loading: 'جارٍ تحميل الاشتراك…',
    error: 'تعذّر إكمال العملية.',
    retry: 'إعادة المحاولة',
    free: 'الخطة المجانية',
    covered: 'يغطي حسابك ترخيص قائم.',
    trial: 'تنتهي الفترة التجريبية في ',
    paid: 'الاشتراك مدفوع حتى ',
    year: 'Pro سنوي',
    month: 'Pro شهري',
    students: 'طالبًا معتمدًا في صفوفك',
    monthly: 'شهريًا',
    annually: 'سنويًا',
    perStudent: 'لكل طالب',
    cap: 'الحد السنوي لجميع الصفوف',
    saveAmount: 'التوفير مقارنةً بـ 12 دفعة شهرية',
    prepaid: 'دفعة واحدة للفترة التي تختارها. يمكنك التجديد حسب عدد الطلاب عند انتهائها.',
    buyAfterTrial: 'يمكنك اختيار الخطة والدفع بعد انتهاء الفترة التجريبية المجانية.',
    noStudents: 'سيظهر السعر هنا بعد اعتماد طالب في أحد صفوفك.',
    buy: 'متابعة الدفع',
    off: 'سيُتاح الشراء بعد ربط خدمة الدفع.',
    cancel: 'إلغاء التجديد',
    confirm: 'هل تريد إيقاف التجديد؟ سيبقى الاشتراك حتى نهاية الفترة المدفوعة.',
    canceled: 'تم إلغاء التجديد التلقائي.',
    pending: 'نعمل على التحقق من الدفع. يمكنك العودة لرؤية حالة اشتراكك.',
    confirmed: 'تم تأكيد الدفع.',
    email:
      'أرغب بتلقي أخبار المعلّمين وتذكيرات الفترة التجريبية والعروض عبر البريد الإلكتروني. يمكن إلغاء الاشتراك في أي وقت.',
    lang: 'اللغة',
    save: 'حفظ التفضيلات',
    saved: 'تم حفظ التفضيلات.',
  },
  en: {
    support: 'Contact us about your subscription',
    cancelPending:
      'We received your cancellation request. Confirmation will appear here when renewal stops.',
    other: 'You already have an open payment link. Complete it or try again after it expires.',
    prepare: 'Your payment link is being prepared. Try again in a moment.',
    updated: 'Your student count changed. Review the updated price before continuing.',
    verify: 'Verify your account email address to receive a receipt.',
    title: 'My subscription',
    close: 'Close',
    loading: 'Loading your subscription…',
    error: 'We could not complete that action.',
    retry: 'Try again',
    free: 'Free plan',
    covered: 'Your account is covered by an existing license.',
    trial: 'Your trial ends on ',
    paid: 'Paid access through ',
    year: 'Yearly Pro',
    month: 'Monthly Pro',
    students: 'approved students in your classes',
    monthly: 'per month',
    annually: 'per year',
    perStudent: 'per student',
    cap: 'Yearly cap across all your classes',
    saveAmount: 'Savings compared with 12 monthly payments',
    prepaid:
      'One payment for the period you choose. You can renew based on your student count when it ends.',
    buyAfterTrial: 'You can choose and pay when your free trial ends.',
    noStudents: 'Your price will appear here once you approve a student in one of your classes.',
    buy: 'Continue to checkout',
    off: 'Self-service checkout opens once the merchant account is connected.',
    cancel: 'Cancel renewal',
    confirm: 'Stop automatic renewal? Access continues through the paid period.',
    canceled: 'Automatic renewal is canceled.',
    pending: 'Your payment is being verified. You can return here to see your subscription status.',
    confirmed: 'Your payment is confirmed.',
    email: 'Email me teacher news, trial reminders and offers. I can unsubscribe at any time.',
    lang: 'Language',
    save: 'Save preferences',
    saved: 'Preferences saved.',
  },
};
const packageLabels = {
  he: {
    schoolTitle: 'רישיון בית הספר', teacher: 'מורה', pro: 'מורה Pro', school: 'צוות אנגלית בבית ספר',
    pilot: 'פיילוט לשישה שבועות', seats: 'תלמידים', staff: 'מורים',
    add: 'הוספת 50 מקומות', remove: 'הפחתת 50 מקומות', credit: 'קיזוז הפיילוט',
    upgrade: 'עלות השדרוג עד סוף התקופה', current: 'מקומות במנוי הנוכחי',
    tooMany: 'המסלול קטן ממספר המשתתפים הנוכחי.', largeSchool: 'לקבלת הצעה לצוות גדול יותר אפשר לפנות אלינו.',
    details: 'תשלום אחד לתקופה הנבחרת. ניתן לבחור מועד חידוש בסיום התקופה.',
    pilotUsed: 'הפיילוט מיועד להתחלה חד־פעמית של צוות חדש.',
    selectTerm: 'תקופת מנוי', abovePilot: 'כולל חשבונות Pro, ספריית צוות, משימות משותפות ודוחות לרכזת.',
  },
  en: {
    schoolTitle: 'School subscription', teacher: 'Teacher', pro: 'Teacher Pro', school: 'School English team',
    pilot: 'Six-week school pilot', seats: 'students', staff: 'teachers',
    add: 'Add 50 places', remove: 'Remove 50 places', credit: 'Pilot credit',
    upgrade: 'Upgrade through the end of this term', current: 'Places in your current plan',
    tooMany: 'Current enrollment exceeds this plan’s capacity.', largeSchool: 'Contact us for a larger team.',
    details: 'One payment for the selected period. Choose whether to renew when the period ends.',
    pilotUsed: 'The six-week pilot is a one-time offer for a new team.',
    selectTerm: 'Billing period', abovePilot: 'Includes Pro accounts, a shared library, shared assignments and coordinator reports.',
  },
  ar: {
    schoolTitle: 'اشتراك المدرسة', teacher: 'معلّم', pro: 'معلّم Pro', school: 'طاقم الإنجليزية في المدرسة',
    pilot: 'تجربة مدرسية لستة أسابيع', seats: 'طالبًا', staff: 'معلّمين',
    add: 'إضافة 50 مكانًا', remove: 'تقليل 50 مكانًا', credit: 'خصم قيمة التجربة',
    upgrade: 'تكلفة الترقية حتى نهاية الفترة', current: 'الأماكن في خطتك الحالية',
    tooMany: 'عدد المشاركين الحالي أكبر من سعة الخطة.', largeSchool: 'تواصلوا معنا لعرض يناسب طاقمًا أكبر.',
    details: 'دفعة واحدة للفترة المختارة. يمكن اختيار التجديد عند انتهائها.',
    pilotUsed: 'التجربة لستة أسابيع عرض لمرة واحدة للطاقم الجديد.',
    selectTerm: 'مدة الاشتراك', abovePilot: 'يشمل حسابات Pro ومكتبة مشتركة وواجبات مشتركة وتقارير للمنسّق.',
  },
};
type State = {
  quote: BillingQuote;
  checkoutEnabled: boolean;
  emailEnabled: boolean;
  language: Language | null;
  subscription: {
    recurring: boolean;
    cancel_requested_at?: string | null;
    canceled_at: string | null;
  } | null;
};
async function request<T>(path: string, body?: object): Promise<T> {
  const session = await supabase.auth.getSession();
  if (!session.data.session) throw new Error('Sign in required');
  const result = await fetch('/api/teacher/billing' + path, {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    headers: {
      Authorization: 'Bearer ' + session.data.session.access_token,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!result.ok) {
    const data = await result.json().catch(() => null);
    throw new Error(data?.error ?? 'Request failed');
  }
  return result.status === 204 ? (undefined as T) : result.json();
}
export default function TeacherBilling({
  language,
  onClose,
  onAccess,
  institution = false,
}: {
  language: Language;
  onClose: () => void;
  onAccess?: (entitlement: BillingEntitlement) => void;
  institution?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const initialLoad = useRef(true);
  const access = useEffectEvent((plan: BillingEntitlement) => onAccess?.(plan));
  const [state, setState] = useState<State | null>(null);
  const [quotedAt, setQuotedAt] = useState(0);
  const [lang, setLang] = useState(language);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState<
    '' | 'saved' | 'pending' | 'confirmed' | 'other' | 'prepare' | 'updated' | 'verify' | 'error'
  >('');
  const [busy, setBusy] = useState(false);
  const [load, setLoad] = useState(0);
  const [extra, setExtra] = useState(0);
  const [period, setPeriod] = useState<1 | 12>(12);
  const [quotedExtra, setQuotedExtra] = useState(0);
  const t = strings[lang];
  const labels = packageLabels[lang];
  const date = (s: string) =>
    new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeZone: 'Asia/Jerusalem' }).format(
      new Date(s)
    );
  const money = (agorot: number) =>
    new Intl.NumberFormat(lang, {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: agorot % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(agorot / 100);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  useEffect(() => {
    let current = true;
    async function start() {
      try {
        const params = new Map(
          [...new URL(location.href).searchParams].map(([key, value]) => [key.toLowerCase(), value])
        );
        const payment = params.get('og-paymentid'),
          order = params.get('og-externalidentifier');
        if (payment && order) {
          const verified = await request<{ state: 'confirmed' | 'pending' }>('/confirm', {
            payment,
            order,
          });
          if (current) setMessage(verified.state);
        }
        const data = await request<State>('?extra=' + extra);
        if (!current) return;
        setState(data);
        setQuotedAt(Date.now());
        setQuotedExtra(extra);
        if (initialLoad.current) {
          initialLoad.current = false;
          setLang(data.language ?? language);
          setEnabled(data.emailEnabled);
          setPeriod(data.quote.entitlement.months === 1 ? 1 : 12);
        }
        access(data.quote.entitlement);
      } catch {
        if (current) setMessage('error');
      }
    }
    void start();
    return () => {
      current = false;
    };
  }, [extra, language, load]);
  const action = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await fn();
    } catch (error) {
      switch (error instanceof Error ? error.message : '') {
        case 'Different checkout pending':
          setMessage('other');
          break;
        case 'Checkout being prepared':
          setMessage('prepare');
          break;
        case 'Quote changed':
        case 'Offer unavailable':
          setMessage('updated');
          setLoad((n) => n + 1);
          break;
        case 'Verify your email':
          setMessage('verify');
          break;
        default:
          setMessage('error');
      }
    } finally {
      setBusy(false);
    }
  };
  const close = () => {
    const url = new URL(location.href);
    for (const k of [...url.searchParams.keys()])
      if (k === 'billing' || k.toLowerCase().startsWith('og-')) url.searchParams.delete(k);
    history.replaceState(history.state, '', url);
    onClose();
  };
  const quote = state?.quote;
  const hasPaid = Date.parse(quote?.until ?? '') > quotedAt;
  const trialing = Date.parse(quote?.trialEndsAt ?? '') > quotedAt;
  const renewing = !!state?.subscription?.recurring && !state.subscription.canceled_at;
  const button = 'min-h-11 rounded-xl border px-4 py-2 font-semibold';
  const offers = quote?.offers.filter((offer) => institution || offer.months === period) ?? [];
  return (
    <dialog
      ref={ref}
      aria-labelledby="teacher-billing-title"
      dir={lang === 'en' ? 'ltr' : 'rtl'}
      onCancel={close}
      className="m-auto max-h-[85dvh] w-[min(92vw,32rem)] overflow-y-auto rounded-3xl border-0 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-black/50"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="teacher-billing-title" className="text-xl font-bold">
          {institution ? labels.schoolTitle : t.title}
        </h2>
        <button className={button} onClick={close}>
          {t.close}
        </button>
      </div>
      <label className="my-3 flex items-center gap-2">
        {t.lang}
        <select
          className={button}
          value={lang}
          onChange={(e) => setLang(e.target.value as Language)}
        >
          <option value="he">עברית</option>
          <option value="ar">العربية</option>
          <option value="en">English</option>
        </select>
      </label>
      {!state && !message && <p role="status">{t.loading}</p>}
      {state && (
        <>
          <p>
            {quote?.covered
              ? t.covered
              : hasPaid
                ? t.paid + date(quote!.until!)
                : trialing
                  ? t.trial + date(quote!.trialEndsAt!)
                  : t.free}
          </p>
          {state.subscription?.canceled_at && <p>{t.canceled}</p>}
          {renewing && state.subscription?.cancel_requested_at && (
            <p role="status">{t.cancelPending}</p>
          )}
          {renewing && !state.subscription?.cancel_requested_at && (
            <button
              className={button}
              disabled={busy}
              onClick={() => {
                if (window.confirm(t.confirm))
                  void action(async () => {
                    await request('/cancel', {});
                    setLoad((n) => n + 1);
                  });
              }}
            >
              {t.cancel}
            </button>
          )}
          {quote && !quote.covered && !renewing && (
            <div className="my-4 space-y-3">
              <p className="font-semibold">
                {quote.schoolName && <span className="block">{quote.schoolName}</span>}
                {quote.students} {labels.seats}
                {institution && <span> · {quote.staff} {labels.staff}</span>}
              </p>
              {hasPaid && quote.capacity && <p>{labels.current} · {quote.capacity}</p>}
              {!institution && !hasPaid && (
                <div role="group" aria-label={labels.selectTerm} className="flex gap-2">
                  {([12, 1] as const).map((months) => (
                    <button type="button" key={months} className={button} aria-pressed={period === months}
                      onClick={() => setPeriod(months)}>
                      {months === 12 ? t.annually : t.monthly}
                    </button>
                  ))}
                </div>
              )}
              {offers.map((offer) => {
                const annual = offer.months === 12;
                const pilot = offer.code === 'school_pilot';
                const label = pilot ? labels.pilot : labels[offer.tier];
                const minimum = Math.max(0, Math.ceil((Math.max(quote.students, institution ? 0 : quote.capacity ?? 0) - PERSONAL_BILLING.pro.seats) / PERSONAL_BILLING.proExtension.seats));
                const oversubscribed = offer.seatLimit < quote.students ||
                  (offer.staffLimit !== null && (quote.staff ?? 0) > offer.staffLimit);
                return (
                  <section key={offer.code} className={`space-y-2 rounded-xl border p-3 ${annual ? 'border-violet-300 bg-violet-50' : ''}`}>
                    <h3 className="font-bold">{label}</h3>
                    <p><strong className="text-2xl">{money(offer.upgrade && offer.available ? offer.amount : offer.fullAmount)}</strong>
                      {' '}{offer.upgrade && offer.available ? labels.upgrade : pilot ? '' : annual ? t.annually : t.monthly}</p>
                    <p className="text-sm">{offer.seatLimit} {labels.seats}
                      {offer.staffLimit !== null && <span> · {offer.staffLimit} {labels.staff}</span>}
                    </p>
                    {institution && <p className="text-sm">{labels.abovePilot}</p>}
                    {offer.credit > 0 && (
                      <p className="text-sm font-semibold">{labels.credit} {money(offer.credit)} · {t.buy} {money(offer.amount)}</p>
                    )}
                    {offer.tier === 'pro' && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" className={button} aria-label={labels.remove}
                          disabled={busy || extra !== quotedExtra || quote.blocks <= minimum}
                          onClick={() => setExtra(quote.blocks - 1)}>−</button>
                        <button type="button" className={button}
                          disabled={busy || extra !== quotedExtra || quote.blocks >= 100}
                          onClick={() => setExtra(quote.blocks + 1)}>
                          {labels.add} · {money(annual ? PERSONAL_BILLING.proExtension.annual : PERSONAL_BILLING.proExtension.monthly)}
                        </button>
                      </div>
                    )}
                    {oversubscribed && <p role="status" className="text-sm">{labels.tooMany}</p>}
                    {pilot && !offer.available && !oversubscribed && <p className="text-sm">{labels.pilotUsed}</p>}
                    {state.checkoutEnabled && offer.available && (
                      <button type="button" className={button} disabled={busy || extra !== quotedExtra}
                        onClick={() => void action(async () => {
                          const result = await request<{ url: string }>('/checkout', {
                            offer: offer.code, students: quote.students, amount: offer.amount, extra,
                          });
                          location.assign(result.url);
                        })}>{t.buy}</button>
                    )}
                  </section>
                );
              })}
              {institution && ((quote.staff ?? 0) > SCHOOL_BILLING.staff || quote.students > SCHOOL_BILLING.seats) &&
                <p>{labels.largeSchool}</p>}
              <p className="text-sm">{labels.details}</p>
              {trialing ? <p>{t.buyAfterTrial}</p> : !state.checkoutEnabled && <p>{t.off}</p>}
            </div>
          )}
          {!institution && (
            <>
          <label className="my-4 flex items-start gap-2">
            <input
              className="mt-1"
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            {t.email}
          </label>
          <button
            className={button}
            disabled={busy}
            onClick={() =>
              void action(async () => {
                await request('/preferences', { enabled, language: lang });
                setMessage('saved');
              })
            }
          >
            {t.save}
          </button>
            </>
          )}
        </>
      )}
      {((!state && message === 'error') ||
        (state &&
          !quote?.covered &&
          (!state.checkoutEnabled || state.subscription?.cancel_requested_at))) && (
        <a
          className="my-3 inline-block underline"
          href="mailto:contact@vocaband.com?subject=Vocaband%20Pro"
        >
          {t.support}
        </a>
      )}
      {message && (
        <p role="status" className="my-3">
          {t[message]}
        </p>
      )}
      {(message === 'error' || message === 'pending') && (
        <button
          className={button}
          onClick={() => {
            setMessage('');
            setLoad((n) => n + 1);
          }}
        >
          {t.retry}
        </button>
      )}
    </dialog>
  );
}
