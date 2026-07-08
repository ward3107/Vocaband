/**
 * TeacherSignupView — self-serve teacher onboarding shown after a Google
 * sign-in whose email is NOT on the teacher allowlist (see the early gate in
 * useAuthRestore.ts). Instead of bouncing a would-be teacher, we offer a
 * deliberate "I'm a teacher → pick your school → confirm" step:
 *
 *   - the explicit "I'm a teacher" confirmation is an intent gate (a casual
 *     student won't tick it), and
 *   - the school dropdown is the official Ministry of Education registry
 *     (data/israel-schools.ts), so signup feels school-verified and we capture
 *     which school is adopting Vocaband.
 *
 * Submit calls the self_register_teacher SECURITY DEFINER RPC (which enforces
 * the real guards server-side: non-anonymous session, not a known student),
 * then re-reads the canonical profile and routes to the teacher dashboard.
 */
import {
  type ReactNode,
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { motion } from 'motion/react';
import { GraduationCap, School, Search, Check } from 'lucide-react';
import { supabase, fetchUserProfile, type AppUser } from '../core/supabase';
import { useLanguage, type Language } from '../hooks/useLanguage';
import { useSchoolsLazy } from '../hooks/useSchoolsLazy';
import type { IsraelSchool } from '../data/israel-schools';
import type { View } from '../core/views';

interface TeacherSignupViewProps {
  setView: Dispatch<SetStateAction<View>>;
  setUser: Dispatch<SetStateAction<AppUser | null>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  cookieBannerOverlay: ReactNode;
}

const T: Record<
  Language,
  {
    title: string;
    subtitle: string;
    nameLabel: string;
    namePlaceholder: string;
    schoolLabel: string;
    schoolPlaceholder: string;
    noResults: string;
    notListed: string;
    confirm: string;
    submit: string;
    submitting: string;
    signedInAs: string;
    mustConfirm: string;
    success: string;
    errStudent: string;
    errGeneric: string;
  }
> = {
  en: {
    title: 'Sign up as a teacher',
    subtitle: "Confirm you're a teacher and find your school to get started.",
    nameLabel: 'Your name',
    namePlaceholder: 'e.g. Sarah Cohen',
    schoolLabel: 'Your school',
    schoolPlaceholder: 'Type your school or city…',
    noResults: 'No matching school — you can still continue.',
    notListed: "My school isn't listed",
    confirm: 'I confirm I am a teacher / educator',
    submit: 'Create my teacher account',
    submitting: 'Creating your account…',
    signedInAs: 'Signed in as',
    mustConfirm: 'Please confirm you are a teacher first.',
    success: 'Welcome! Your teacher account is ready.',
    errStudent:
      'This email is registered as a student. Students sign in with a class code and PIN.',
    errGeneric: "Couldn't create your account. Please try again.",
  },
  he: {
    title: 'הרשמה כמורה',
    subtitle: 'אשרו שאתם מורים ובחרו את בית הספר שלכם כדי להתחיל.',
    nameLabel: 'השם שלכם',
    namePlaceholder: 'לדוגמה: שרה כהן',
    schoolLabel: 'בית הספר שלכם',
    schoolPlaceholder: 'הקלידו שם בית ספר או עיר…',
    noResults: 'לא נמצא בית ספר תואם — אפשר להמשיך בכל זאת.',
    notListed: 'בית הספר שלי לא ברשימה',
    confirm: 'אני מאשר/ת שאני מורה / איש חינוך',
    submit: 'צרו לי חשבון מורה',
    submitting: 'יוצרים את החשבון שלכם…',
    signedInAs: 'מחוברים כ',
    mustConfirm: 'אנא אשרו תחילה שאתם מורים.',
    success: 'ברוכים הבאים! חשבון המורה שלכם מוכן.',
    errStudent: 'האימייל הזה רשום כתלמיד. תלמידים מתחברים עם קוד כיתה וקוד אישי (PIN).',
    errGeneric: 'לא הצלחנו ליצור את החשבון. נסו שוב.',
  },
  ar: {
    title: 'التسجيل كمعلّم',
    subtitle: 'أكّد أنك معلّم واختر مدرستك للبدء.',
    nameLabel: 'اسمك',
    namePlaceholder: 'مثال: سارة كوهين',
    schoolLabel: 'مدرستك',
    schoolPlaceholder: 'اكتب اسم المدرسة أو المدينة…',
    noResults: 'لا توجد مدرسة مطابقة — يمكنك المتابعة على أي حال.',
    notListed: 'مدرستي غير مدرجة',
    confirm: 'أؤكّد أنني معلّم / تربوي',
    submit: 'أنشئ حساب المعلّم',
    submitting: 'جارٍ إنشاء حسابك…',
    signedInAs: 'مسجّل الدخول باسم',
    mustConfirm: 'يرجى تأكيد أنك معلّم أولاً.',
    success: 'أهلاً بك! حساب المعلّم جاهز.',
    errStudent: 'هذا البريد مسجّل كطالب. يسجّل الطلاب الدخول برمز الصف والرقم السري (PIN).',
    errGeneric: 'تعذّر إنشاء حسابك. حاول مرة أخرى.',
  },
};

export default function TeacherSignupView({
  setView,
  setUser,
  showToast,
  cookieBannerOverlay,
}: TeacherSignupViewProps) {
  const { language, dir, isRTL, textAlign } = useLanguage();
  const t = T[language];
  const schools = useSchoolsLazy(true);

  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<IsraelSchool | null>(null);
  const [notListed, setNotListed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Prefill name + email from the Google session.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setEmail(data.user?.email ?? null);
      const full =
        (data.user?.user_metadata?.full_name as string | undefined) ??
        (data.user?.user_metadata?.name as string | undefined) ??
        '';
      setDisplayName((prev) => prev || full);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => {
    if (picked || notListed || !schools) return [];
    return schools.searchSchools(query, 30);
  }, [picked, notListed, schools, query]);

  async function handleSubmit() {
    if (!confirmed) {
      showToast(t.mustConfirm, 'error');
      return;
    }
    setSubmitting(true);
    try {
      const {
        data: { user: au },
      } = await supabase.auth.getUser();
      if (!au) throw new Error('no session');

      const schoolName = picked
        ? picked.city
          ? `${picked.name} — ${picked.city}`
          : picked.name
        : query.trim() || null;

      const { error } = await supabase.rpc('self_register_teacher', {
        p_display_name: displayName.trim(),
        p_school_semel: picked?.id ?? null,
        p_school_name: schoolName,
        p_subject: 'english',
      });
      if (error) throw error;

      const profile = await fetchUserProfile(au.id);
      if (!profile) throw new Error('profile not found after signup');
      setUser(profile);
      showToast(t.success, 'success');
      setView('teacher-dashboard');
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? '';
      showToast(msg.includes('registered as a student') ? t.errStudent : t.errGeneric, 'error');
      setSubmitting(false);
    }
  }

  return (
    <div
      dir={dir}
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl bg-white shadow-xl shadow-indigo-500/10 p-6 sm:p-8"
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">{t.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{t.subtitle}</p>
          {email && (
            <p className="mt-2 text-xs text-gray-400">
              {t.signedInAs} <span className="font-medium text-gray-600">{email}</span>
            </p>
          )}
        </div>

        {/* Name */}
        <label className={`block text-sm font-medium text-gray-700 mb-1 ${textAlign}`}>
          {t.nameLabel}
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t.namePlaceholder}
          dir={dir}
          className={`w-full rounded-xl border border-gray-200 px-4 py-3 mb-4 text-gray-900 focus:border-violet-400 focus:ring-2 focus:ring-violet-200 outline-none ${textAlign}`}
        />

        {/* School picker */}
        <label className={`block text-sm font-medium text-gray-700 mb-1 ${textAlign}`}>
          <School className="inline w-4 h-4 mb-0.5 me-1" />
          {t.schoolLabel}
        </label>

        {picked ? (
          <button
            type="button"
            onClick={() => {
              setPicked(null);
              setQuery('');
            }}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            className={`w-full rounded-xl border-2 border-violet-400 bg-violet-50 px-4 py-3 mb-4 flex items-center justify-between gap-2 ${
              isRTL ? 'flex-row-reverse' : ''
            }`}
          >
            <span className={`font-medium text-violet-900 ${textAlign}`}>
              {picked.name}
              {picked.city ? ` — ${picked.city}` : ''}
            </span>
            <Check className="w-5 h-5 text-violet-600 shrink-0" />
          </button>
        ) : notListed ? (
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.schoolPlaceholder}
            dir={dir}
            className={`w-full rounded-xl border border-gray-200 px-4 py-3 mb-4 text-gray-900 focus:border-violet-400 focus:ring-2 focus:ring-violet-200 outline-none ${textAlign}`}
          />
        ) : (
          <div className="mb-4">
            <div className="relative">
              <Search
                className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${
                  isRTL ? 'right-3' : 'left-3'
                }`}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.schoolPlaceholder}
                dir={dir}
                className={`w-full rounded-xl border border-gray-200 py-3 text-gray-900 focus:border-violet-400 focus:ring-2 focus:ring-violet-200 outline-none ${
                  isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'
                }`}
              />
            </div>

            {query.trim() && (
              <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50">
                {results.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setPicked(s)}
                    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                    className={`w-full px-4 py-2.5 hover:bg-violet-50 ${textAlign}`}
                  >
                    <div className="text-sm font-medium text-gray-900">{s.name}</div>
                    {s.city && <div className="text-xs text-gray-400">{s.city}</div>}
                  </button>
                ))}
                {results.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-400">{t.noResults}</div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setNotListed(true);
                setQuery('');
              }}
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              className={`mt-2 text-xs text-violet-600 hover:underline ${textAlign} w-full`}
            >
              {t.notListed}
            </button>
          </div>
        )}

        {/* Confirmation */}
        <label
          className={`flex items-start gap-2 mb-5 cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded accent-violet-600 shrink-0"
          />
          <span className={`text-sm text-gray-700 ${textAlign}`}>{t.confirm}</span>
        </label>

        {/* Submit */}
        <motion.button
          type="button"
          whileHover={{ scale: confirmed && !submitting ? 1.02 : 1 }}
          whileTap={{ scale: confirmed && !submitting ? 0.97 : 1 }}
          onClick={handleSubmit}
          disabled={!confirmed || submitting}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-4 py-3.5 font-semibold text-white shadow-lg shadow-violet-500/30 disabled:opacity-50 disabled:shadow-none"
        >
          {submitting ? t.submitting : t.submit}
        </motion.button>
      </motion.div>
      {cookieBannerOverlay}
    </div>
  );
}
