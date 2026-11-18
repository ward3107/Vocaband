import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../core/supabase';
import type { Language } from '../../hooks/useLanguage';

const strings = {
  he: {
    support: 'פנייה לגבי המנוי',
    cancelPending: 'בקשת הביטול התקבלה. כאן יופיע אישור כשהחידוש יופסק.',
    other: 'התחלת תשלום למסלול אחר. אפשר לחזור אליו עכשיו או לבחור מסלול חדש בעוד 30 דקות.',
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
    once: '12 חודשי Pro בתשלום אחד',
    monthly: 'בכל חודש, עד ביטול',
    annually: 'בכל שנה, עד ביטול',
    prepaid: 'תשלום אחד, ללא חידוש אוטומטי',
    sale: 'המבצע עד ',
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
    other: 'بدأت دفعًا لخطة أخرى. يمكنك إكماله أو اختيار خطة جديدة بعد 30 دقيقة.',
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
    once: '12 شهرًا بدفعة واحدة',
    monthly: 'كل شهر حتى الإلغاء',
    annually: 'كل سنة حتى الإلغاء',
    prepaid: 'دفعة واحدة دون تجديد تلقائي',
    sale: 'العرض حتى ',
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
    other:
      'You started checkout for a different plan. Return to that plan or choose another in 30 minutes.',
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
    once: '12 months of prepaid Pro',
    monthly: 'Every month until canceled',
    annually: 'Every year until canceled',
    prepaid: 'One payment, no automatic renewal',
    sale: 'Offer ends ',
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
type Offer = {
  code: string;
  agorot: number;
  months: 1 | 12;
  recurring: boolean;
  endsAt: string | null;
};
type State = {
  offers: Offer[];
  covered: boolean;
  until: string | null;
  trialEndsAt: string | null;
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
}: {
  language: Language;
  onClose: () => void;
  onAccess: (until: string | null) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const access = useRef(onAccess);
  access.current = onAccess;
  const [state, setState] = useState<State | null>(null);
  const [lang, setLang] = useState(language);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState<
    '' | 'saved' | 'pending' | 'confirmed' | 'other' | 'error'
  >('');
  const [busy, setBusy] = useState(false);
  const [load, setLoad] = useState(0);
  const t = strings[lang];
  const date = (s: string) =>
    new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeZone: 'Asia/Jerusalem' }).format(
      new Date(s)
    );
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  useEffect(() => {
    let current = true;
    async function start() {
      try {
        const url = new URL(location.href);
        const payment = url.searchParams.get('og-paymentid'),
          order = url.searchParams.get('og-externalidentifier');
        if (payment && order) {
          const verified = await request<{ state: 'confirmed' | 'pending' }>('/confirm', {
            payment,
            order,
          });
          if (current) setMessage(verified.state);
        }
        const data = await request<State>('');
        if (!current) return;
        setState(data);
        setLang(data.language ?? language);
        setEnabled(data.emailEnabled);
        access.current(data.until);
      } catch {
        if (current) setMessage('error');
      }
    }
    void start();
    return () => {
      current = false;
    };
  }, [language, load]);
  const action = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await fn();
    } catch (error) {
      setMessage(
        error instanceof Error && error.message === 'Other checkout pending' ? 'other' : 'error'
      );
    } finally {
      setBusy(false);
    }
  };
  const close = () => {
    const url = new URL(location.href);
    for (const k of [...url.searchParams.keys()])
      if (k === 'billing' || k.startsWith('og-')) url.searchParams.delete(k);
    history.replaceState(history.state, '', url);
    onClose();
  };
  const hasPaid = Date.parse(state?.until ?? '') > Date.now();
  const renewing = !!state?.subscription?.recurring && !state.subscription.canceled_at;
  const button = 'min-h-11 rounded-xl border px-4 py-2 font-semibold';
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
          {t.title}
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
            {state.covered
              ? t.covered
              : hasPaid
                ? t.paid + date(state.until!)
                : Date.parse(state.trialEndsAt ?? '') > Date.now()
                  ? t.trial + date(state.trialEndsAt!)
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
          {!state.covered &&
            !hasPaid &&
            !renewing &&
            (state.offers.length ? (
              state.offers.map((o) => (
                <section key={o.code} className="my-3 rounded-xl border p-3">
                  <h3 className="font-bold">
                    {o.recurring ? (o.months === 1 ? t.month : t.year) : t.once}
                  </h3>
                  <p>
                    {new Intl.NumberFormat(lang, { style: 'currency', currency: 'ILS' }).format(
                      o.agorot / 100
                    )}{' '}
                    · {o.recurring ? (o.months === 1 ? t.monthly : t.annually) : t.prepaid}
                  </p>
                  {o.endsAt && (
                    <p>
                      {t.sale}
                      {date(o.endsAt)}
                    </p>
                  )}
                  <button
                    className={button}
                    disabled={busy}
                    onClick={() =>
                      void action(async () => {
                        const { url } = await request<{ url: string }>('/checkout', {
                          offer: o.code,
                        });
                        location.assign(url);
                      })
                    }
                  >
                    {t.buy}
                  </button>
                </section>
              ))
            ) : (
              <p className="my-3">{t.off}</p>
            ))}
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
      {((!state && message === 'error') ||
        (state &&
          !state.covered &&
          (!state.offers.length || state.subscription?.cancel_requested_at))) && (
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
