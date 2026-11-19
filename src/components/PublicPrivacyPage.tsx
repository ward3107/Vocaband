import React from "react";
import { Shield, School, Lock, Mail, Database, Gavel, Globe, Clock, Users, AlertTriangle, FileText, ArrowLeft } from "lucide-react";
import PublicNav from "./PublicNav";
import FloatingButtons from "./FloatingButtons";
import BackButton from "./BackButton";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "../hooks/useLanguage";
import { privacyTranslations, uiTranslations } from "../config/translations/legalTranslations";
import { DATA_CONTROLLER, DATA_PROTECTION_OFFICER } from "../config/privacy-config";

interface PublicPrivacyPageProps {
  onNavigate: (page: "home" | "terms" | "privacy" | "security") => void;
  onGetStarted: () => void;
  /** Teacher signup — drives PublicNav's "Start free" CTA. */
  onTeacherLogin?: () => void;
  onBack?: () => void;
}

const PublicPrivacyPage: React.FC<PublicPrivacyPageProps> = ({
  onNavigate,
  onGetStarted,
  onTeacherLogin,
  onBack,
}) => {
  const { language, dir, isRTL } = useLanguage();
  const t = privacyTranslations[language];
  const ui = uiTranslations[language];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900" dir={dir}>
      <PublicNav
        currentPage="privacy"
        onNavigate={(p) => onNavigate(p as "home" | "terms" | "privacy")}
        onGetStarted={onGetStarted}
        onTeacherLogin={onTeacherLogin}
      />

      <main id="main-content" className="max-w-4xl mx-auto px-6 pt-32 pb-24 mb-20 md:mb-0">
        {/* Back Button & Language Switcher */}
        <div className={`flex items-center gap-4 mb-6`}>
          {onBack && <BackButton onClick={onBack} />}
          <LanguageSwitcher />
        </div>

        {/* Header */}
        <section className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 font-headline drop-shadow-lg">
            {t.title} <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent italic">{t.titleHighlight}</span>
          </h1>
          <div className={`flex flex-wrap gap-4 text-sm text-white/70 font-medium`}>
            <span className="flex items-center gap-2">
              <FileText size={16} className="text-violet-300" />
              {t.effective}
            </span>
            <span className="flex items-center gap-2">
              <Shield size={16} className="text-violet-300" />
              {t.version}
            </span>
          </div>
          <p className={`mt-4 text-lg text-white/75 max-w-2xl`}>
            <strong>{language === 'en' ? 'Legal Basis:' : language === 'he' ? 'בסיס חוקי:' : 'الأساس القانوني:'}</strong> {t.legalBasis}
          </p>
        </section>

        {/* Summary Card */}
        <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-900 rounded-xl p-8 text-white mb-8 relative overflow-hidden">
          <div className="relative z-10">
            <div className={`inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full mb-4`}>
              <Shield size={14} />
              <span className="text-xs font-black uppercase tracking-wider">{t.summary.badge}</span>
            </div>
            <p className={`text-lg text-blue-100 font-medium leading-relaxed`}>
              {t.summary.text}
            </p>
          </div>
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {/* Section 1: Data Controller */}
          <section className="bg-white p-8 rounded-xl shadow-2xl shadow-violet-950/20 ring-1 ring-slate-200/60">
            <h2 className={`text-xl font-black text-slate-900 mb-4 font-headline flex items-center gap-3`}>
              <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-violet-700 text-sm font-black">1</span>
              {language === 'en' ? 'Data controller' : language === 'he' ? 'בעל השליטה במידע' : 'مراقب البيانات (בעל המאגר)'}
            </h2>
            <div className={`text-slate-600 leading-relaxed space-y-4`}>
              <p>
                {language === 'en' ? 'Under the Israeli Privacy Protection Law (Amendment 13), the data controller for Vocaband is:' :
                 language === 'he' ? 'לפי חוק הגנת הפרטיות (תיקון 13), בעל מאגר הנתונים של Vocaband הוא:' :
                 'بموجب قانون حماية الخصوصية الإسرائيلي (التعديل 13)، مراقب بيانات Vocaband هو:'}
              </p>
              <ul className={`space-y-2`}>
                <li><strong>{language === 'en' ? 'Entity:' : language === 'he' ? 'גוף:' : 'الكيان:'}</strong> {DATA_CONTROLLER.name}</li>
                <li><strong>{language === 'en' ? 'Address:' : language === 'he' ? 'כתובת:' : 'العنوان:'}</strong> {language === 'en' ? 'Israel' : language === 'he' ? 'ישראל' : 'إسرائيل'}</li>
                <li><strong>{language === 'en' ? 'Privacy Contact:' : language === 'he' ? 'יצירת קשר לפרטיות:' : 'جهة اتصال الخصوصية:'}</strong> <span className="text-violet-600">contact@vocaband.com</span></li>
              </ul>
              <p>
                {language === 'en' ? 'For privacy questions, to access or correct your information, or to request deletion, contact us here:' :
                 language === 'he' ? 'לפנייה בנושא פרטיות, לעיון ולתיקון מידע או לבקשת מחיקה, כתבו לנו:' :
                 'للاستفسارات، أو للاطلاع على معلوماتك وتصحيحها أو طلب حذفها، راسلنا:'}{' '}
                <a href={`mailto:${DATA_PROTECTION_OFFICER.email}`} className="font-semibold text-violet-800 underline">
                  {DATA_PROTECTION_OFFICER.email}
                </a>
              </p>
            </div>
          </section>

          {/* Section 2: What We Collect */}
          <section className="bg-white p-8 rounded-xl shadow-2xl shadow-violet-950/20 ring-1 ring-slate-200/60">
            <h2 className={`text-xl font-black text-slate-900 mb-4 font-headline flex items-center gap-3`}>
              <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-violet-700 text-sm font-black">2</span>
              <Database size={20} className="text-violet-600" />
              {ui.forStudents === 'For Students' ? 'Data We Collect' : language === 'he' ? 'נתונים שאנו אוספים' : 'البيانات التي نجمعها'}
            </h2>

            <div className={`grid md:grid-cols-2 gap-6 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
              <div className="bg-surface-container-low p-5 rounded-lg">
                <div className={`flex items-center gap-2 mb-3`}>
                  <Users size={18} className="text-violet-600" />
                  <h3 className="font-bold text-on-surface">{ui.forStudents}</h3>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">{ui.anonymous}</span>
                </div>
                <ul className={`space-y-2 text-sm text-on-surface-variant`}>
                  {language === 'en' ? (
                    <>
                      <li>• <strong>Display name</strong> — chosen by student</li>
                      <li>• <strong>Avatar</strong> — emoji selection</li>
                      <li>• <strong>Class code</strong> — code assigned to your class</li>
                      <li>• <strong>Progress</strong> — scores, streaks, XP</li>
                      <li>• <strong>Badges</strong> — achievements earned</li>
                    </>
                  ) : language === 'he' ? (
                    <>
                      <li>• <strong>שם תצוגה</strong> — נבחר על ידי התלמיד</li>
                      <li>• <strong>אווטר</strong> — בחירת אימוג'י</li>
                      <li>• <strong>קוד כיתה</strong> — הקוד שניתן לכיתה</li>
                      <li>• <strong>התקדמות</strong> — ציונים, רצפים, XP</li>
                      <li>• <strong>תגים</strong> — הישגים שהושגו</li>
                    </>
                  ) : (
                    <>
                      <li>• <strong>اسم العرض</strong> — اختاره الطالب</li>
                      <li>• <strong>الصورة الرمزية</strong> — اختيار الإيموجي</li>
                      <li>• <strong>رمز الفصل</strong> — رمز من 6 أرقام</li>
                      <li>• <strong>التقدم</strong> — الدرجات، التتابعات، XP</li>
                      <li>• <strong>الشارات</strong> — الإنجازات المكتسبة</li>
                    </>
                  )}
                </ul>
                <p className={`text-xs text-red-500 mt-3 font-medium`}>
                  {language === 'en' ? 'We do NOT collect: email, phone, address, photos, IDs' :
                   language === 'he' ? 'איננו אוספים: דוא"ל, טלפון, כתובת, תמונות, תעודות זהות' :
                   'لا نجمع: البريد الإلكتروني، الهاتف، العنوان، الصور، الهويات'}
                </p>
                {/* Synthetic placeholder email disclosure — required so a reviewer
                    reading the auth schema (which shows a student-*@class-*.vocaband.local
                    address) understands it's a non-deliverable internal identifier,
                    not a real student inbox. */}
                <p className={`text-xs text-slate-500 mt-2 leading-relaxed`}>
                  {language === 'en' ? (
                    <>
                      <strong>Note:</strong> For class-code login, the auth system creates an internal placeholder address like <code className="bg-slate-100 px-1 rounded text-[10px]">student-&lt;id&gt;@class-&lt;code&gt;.vocaband.local</code>. It is never delivered to a real inbox — it exists only to satisfy the authentication system's unique-identifier requirement.
                    </>
                  ) : language === 'he' ? (
                    <>
                      <strong>הערה:</strong> בכניסה עם קוד כיתה, מערכת האימות יוצרת כתובת מציין מקום פנימית כמו <code className="bg-slate-100 px-1 rounded text-[10px]">student-&lt;id&gt;@class-&lt;code&gt;.vocaband.local</code>. היא לעולם לא נשלחת לתיבת דואר אמיתית — היא משמשת רק כדי לעמוד בדרישת המזהה הייחודי של מערכת האימות.
                    </>
                  ) : (
                    <>
                      <strong>ملاحظة:</strong> لتسجيل الدخول برمز الفصل، ينشئ نظام المصادقة عنوانًا مؤقتًا داخليًا مثل <code className="bg-slate-100 px-1 rounded text-[10px]">student-&lt;id&gt;@class-&lt;code&gt;.vocaband.local</code>. لا يُرسل أبدًا إلى صندوق بريد حقيقي — يُستخدم فقط لتلبية متطلب المعرف الفريد لنظام المصادقة.
                    </>
                  )}
                </p>
              </div>

              <div className="bg-surface-container-low p-5 rounded-lg">
                <div className={`flex items-center gap-2 mb-3`}>
                  <School size={18} className="text-violet-600" />
                  <h3 className="font-bold text-on-surface">{ui.forTeachers}</h3>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{ui.googleOAuth}</span>
                </div>
                <ul className={`space-y-2 text-sm text-on-surface-variant`}>
                  {language === 'en' ? (
                    <>
                      <li>• <strong>Email</strong> — for verification</li>
                      <li>• <strong>Display name</strong> — from Google</li>
                      <li>• <strong>Classes</strong> — created class codes</li>
                      <li>• <strong>Assignments</strong> — vocabulary lists</li>
                    </>
                  ) : language === 'he' ? (
                    <>
                      <li>• <strong>דוא"ל</strong> — לאימות</li>
                      <li>• <strong>שם תצוגה</strong> — מ-Google</li>
                      <li>• <strong>כיתות</strong> — קודי כיתות שנוצרו</li>
                      <li>• <strong>מטלות</strong> — רשימות אוצר מילים</li>
                    </>
                  ) : (
                    <>
                      <li>• <strong>البريد الإلكتروني</strong> — للتحقق</li>
                      <li>• <strong>اسم العرض</strong> — من Google</li>
                      <li>• <strong>الفصول</strong> — رموز الفصول المنشأة</li>
                      <li>• <strong>المهام</strong> — قوائم المفردات</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3: How We Use Data */}
          <section className="bg-white p-8 rounded-xl shadow-2xl shadow-violet-950/20 ring-1 ring-slate-200/60">
            <h2 className={`text-xl font-black text-slate-900 mb-4 font-headline flex items-center gap-3`}>
              <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-violet-700 text-sm font-black">3</span>
              {language === 'en' ? 'How We Use Your Data' : language === 'he' ? 'כיצד אנו משתמשים בנתונים שלך' : 'كيف نستخدم بياناتك'}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-container-high">
                    <th className={`py-2 pr-4 font-bold text-on-surface ${isRTL ? 'text-right' : 'text-left'}`}>{ui.purpose}</th>
                    <th className={`py-2 pr-4 font-bold text-on-surface ${isRTL ? 'text-right' : 'text-left'}`}>{ui.legalBasis}</th>
                  </tr>
                </thead>
                <tbody className="text-on-surface-variant">
                  {language === 'en' ? (
                    <>
                      <tr className="border-b border-surface-container/50">
                        <td className="py-2 pr-4">Provide vocabulary games</td>
                        <td className="py-2 pr-4">Contract performance</td>
                      </tr>
                      <tr className="border-b border-surface-container/50">
                        <td className="py-2 pr-4">Show teachers student progress</td>
                        <td className="py-2 pr-4">Contract performance</td>
                      </tr>
                      <tr className="border-b border-surface-container/50">
                        <td className="py-2 pr-4">Authenticate teachers</td>
                        <td className="py-2 pr-4">Contract + Security</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4">Prevent abuse</td>
                        <td className="py-2 pr-4">Legitimate interest</td>
                      </tr>
                    </>
                  ) : language === 'he' ? (
                    <>
                      <tr className="border-b border-surface-container/50">
                        <td className="py-2 pr-4">ספק משחקי אוצר מילים</td>
                        <td className="py-2 pr-4">ביצוע חוזה</td>
                      </tr>
                      <tr className="border-b border-surface-container/50">
                        <td className="py-2 pr-4">הצגת התקדמות תלמידים למורים</td>
                        <td className="py-2 pr-4">ביצוע חוזה</td>
                      </tr>
                      <tr className="border-b border-surface-container/50">
                        <td className="py-2 pr-4">אימות מורים</td>
                        <td className="py-2 pr-4">חוזה + אבטחה</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4">מניעת שימוש לרעה</td>
                        <td className="py-2 pr-4">אינטרס לגיטימי</td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr className="border-b border-surface-container/50">
                        <td className="py-2 pr-4">توفير ألعاب المفردات</td>
                        <td className="py-2 pr-4">تنفيذ العقد</td>
                      </tr>
                      <tr className="border-b border-surface-container/50">
                        <td className="py-2 pr-4">عرض تقدم الطلاب للمعلمين</td>
                        <td className="py-2 pr-4">تنفيذ العقد</td>
                      </tr>
                      <tr className="border-b border-surface-container/50">
                        <td className="py-2 pr-4">مصادقة المعلمين</td>
                        <td className="py-2 pr-4">العقد + الأمان</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4">منع الإساءة</td>
                        <td className="py-2 pr-4">المصلحة المشروعة</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-lg bg-slate-100 p-4 text-sm text-slate-800">
              <p>{language === 'en' ? 'Device storage keeps your sign-in and preferences. Optional browser diagnostics send error and performance information only after you enable analytics. You can change that choice at any time.' :
                language === 'he' ? 'נשמרים במכשיר פרטי התחברות והעדפות. אבחון תקלות וביצועים בדפדפן נשלח רק אם בחרתם לאפשר מדידה. אפשר לשנות את הבחירה בכל עת.' :
                'يحفظ الجهاز تسجيل الدخول والتفضيلات. لا تُرسل تشخيصات الأخطاء والأداء من المتصفح إلا عند تفعيل التحليلات. يمكنك تغيير هذا الاختيار في أي وقت.'}</p>
              <button type="button" className="mt-2 min-h-11 font-semibold text-violet-800 underline"
                onClick={() => window.dispatchEvent(new Event('vocaband:open-cookie-settings'))}>
                {language === 'he' ? 'שינוי העדפות מדידה' : language === 'ar' ? 'تغيير تفضيلات التحليلات' : 'Change analytics preferences'}
              </button>
            </div>
          </section>

          {/* Section 4: Third Parties */}
          <section className="bg-white p-8 rounded-xl shadow-2xl shadow-violet-950/20 ring-1 ring-slate-200/60">
            <h2 className={`text-xl font-black text-slate-900 mb-4 font-headline flex items-center gap-3`}>
              <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-violet-700 text-sm font-black">4</span>
              <Globe size={20} className="text-violet-600" />
              {language === 'en' ? 'Third-Party Processors' : language === 'he' ? 'מעבדי צד שלישי' : 'معالجات الطرف الثالث'}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-container-high">
                    <th className={`py-2 pr-4 font-bold text-on-surface ${isRTL ? 'text-right' : 'text-left'}`}>{ui.service}</th>
                    <th className={`py-2 pr-4 font-bold text-on-surface ${isRTL ? 'text-right' : 'text-left'}`}>{ui.purpose}</th>
                    <th className={`py-2 pr-4 font-bold text-on-surface ${isRTL ? 'text-right' : 'text-left'}`}>{ui.location}</th>
                  </tr>
                </thead>
                <tbody className="text-on-surface-variant">
                  <tr className="border-b border-surface-container/50">
                    <td className="py-2 pr-4 font-medium">Supabase</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'Database, authentication, file storage' : language === 'he' ? 'מסד נתונים, אימות, אחסון קבצים' : 'قاعدة البيانات، المصادقة، تخزين الملفات'}</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'EU (Frankfurt)' : language === 'he' ? 'אירופה (פרנקפורט)' : 'الاتحاد الأوروبي (فرانكفورت)'}</td>
                  </tr>
                  <tr className="border-b border-surface-container/50">
                    <td className="py-2 pr-4 font-medium">Fly.io</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'Application server (REST API + WebSocket)' : language === 'he' ? 'שרת היישום (REST API + WebSocket)' : 'خادم التطبيق (REST API + WebSocket)'}</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'EU (Amsterdam)' : language === 'he' ? 'אירופה (אמסטרדם)' : 'الاتحاد الأوروبي (أمستردام)'}</td>
                  </tr>
                  <tr className="border-b border-surface-container/50">
                    <td className="py-2 pr-4 font-medium">Cloudflare</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'CDN, DNS, TLS, DDoS protection' : language === 'he' ? 'CDN, DNS, TLS, הגנה מפני DDoS' : 'CDN، DNS، TLS، الحماية من DDoS'}</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'Global edge' : language === 'he' ? 'קצה גלובלי' : 'الحافة العالمية'}</td>
                  </tr>
                  <tr className="border-b border-surface-container/50">
                    <td className="py-2 pr-4 font-medium">Google OAuth</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'Teacher sign-in only' : language === 'he' ? 'כניסת מורים בלבד' : 'تسجيل دخول المعلمين فقط'}</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'Global (US)' : language === 'he' ? 'גלובלי (ארה"ב)' : 'عالمي (الولايات المتحدة)'}</td>
                  </tr>
                  <tr className="border-b border-surface-container/50">
                    <td className="py-2 pr-4 font-medium">Anthropic (Claude)</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'AI sentence generation (teacher-triggered, vocabulary words only)' : language === 'he' ? 'יצירת משפטים בבינה מלאכותית (יזום ע"י מורה, מילים בלבד)' : 'إنشاء جمل بالذكاء الاصطناعي (يبدأها المعلم، كلمات فقط)'}</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'United States' : language === 'he' ? 'ארצות הברית' : 'الولايات المتحدة'}</td>
                  </tr>
                  <tr className="border-b border-surface-container/50">
                    <td className="py-2 pr-4 font-medium">Google Cloud (Gemini)</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'Vocabulary images uploaded by teachers and questions submitted to the teacher help assistant' :
                      language === 'he' ? 'עיבוד תמונות אוצר מילים שמורים מעלים ושאלות שנשלחות לכלי העזרה למורים' :
                      'معالجة صور المفردات التي يرفعها المعلمون والأسئلة المرسلة إلى مساعد المعلمين'}</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'Depends on the configured Google service. Processing may occur outside Europe.' :
                      language === 'he' ? 'תלוי בשירות Google שמוגדר. המידע עשוי להיות מעובד מחוץ לאירופה.' :
                      'يتوقف على خدمة Google المُعدّة. قد تُعالج البيانات خارج أوروبا.'}</td>
                  </tr>
                  <tr className="border-b border-surface-container/50">
                    <td className="py-2 pr-4 font-medium">Google Cloud (Text-to-Speech)</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'MP3 audio synthesis for vocabulary words' : language === 'he' ? 'יצירת MP3 לאוצר מילים' : 'تحويل المفردات إلى صوت MP3'}</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'Google-global' : language === 'he' ? 'גלובלי (Google)' : 'عالمي (Google)'}</td>
                  </tr>
                  <tr className="border-b border-surface-container/50">
                    <td className="py-2 pr-4 font-medium">Sentry</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'Error tracking (PII scrubbed before send)' : language === 'he' ? 'מעקב שגיאות (PII מוסר לפני שליחה)' : 'تتبع الأخطاء (يتم تنقية PII قبل الإرسال)'}</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'EU (Germany)' : language === 'he' ? 'אירופה (גרמניה)' : 'الاتحاد الأوروبي (ألمانيا)'}</td>
                  </tr>
                  <tr className="border-b border-surface-container/50">
                    <td className="py-2 pr-4 font-medium">Google Fonts</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'Web font delivery' : language === 'he' ? 'אספקת גופנים' : 'تسليم الخطوط'}</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'Global edge' : language === 'he' ? 'קצה גלובלי' : 'الحافة العالمية'}</td>
                  </tr>
                  <tr className="border-b border-surface-container/50">
                    <td className="py-2 pr-4 font-medium">Google FCM</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'Push notification delivery to Chrome/Android (opt-in only, no name/score)' : language === 'he' ? 'משלוח התראות ל-Chrome/Android (בהסכמה בלבד, ללא שם/ציון)' : 'إرسال الإشعارات إلى Chrome/Android (بالموافقة فقط، بدون اسم/درجة)'}</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'Global (US)' : language === 'he' ? 'גלובלי (ארה"ב)' : 'عالمي (الولايات المتحدة)'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">Mozilla autopush</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'Push notification delivery to Firefox (opt-in only, no name/score)' : language === 'he' ? 'משלוח התראות ל-Firefox (בהסכמה בלבד, ללא שם/ציון)' : 'إرسال الإشعارات إلى Firefox (بالموافقة فقط، بدون اسم/درجة)'}</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'Global (US)' : language === 'he' ? 'גלובלי (ארה"ב)' : 'عالمي (الولايات المتحدة)'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <dl className="mt-4 space-y-3 text-sm text-slate-700">
              <div><dt className="font-bold">SUMIT</dt><dd>{language === 'he' ?
                'כשהסליקה מופעלת, פרטי כרטיס האשראי מוזנים אצל SUMIT. ל־Vocaband נמסרים פרטי הזמנה ותוצאות תשלום וקבלה.' :
                language === 'ar' ? 'عند تفعيل الدفع تُدخل بيانات البطاقة لدى SUMIT، وتتلقّى Vocaband مراجع الطلب والدفع والإيصال.' :
                'When checkout is enabled, card details are entered on SUMIT. Vocaband receives order, payment and receipt references.'}</dd></div>
              <div><dt className="font-bold">Resend</dt><dd>{language === 'he' ?
                'כאשר המשלוח מופעל, ספק הדיוור מקבל את כתובת המורה ותוכן ההודעה לצורך משלוח שהמורה אישר.' :
                language === 'ar' ? 'عند تفعيل المراسلات يتلقّى مزوّد البريد عنوان المعلّم ومحتوى الرسالة لإرسال الرسائل التي اختارها المعلّم.' :
                'When email delivery is enabled, the provider receives the teacher’s email address and message content to send notices the teacher opted in to.'}</dd></div>
              <div><dt className="font-bold">Sentry</dt><dd>{language === 'he' ?
                'פרטי אבחון של השרת ומדידת שגיאות וביצועים בדפדפן לפי ההעדפה שבחרתם.' :
                language === 'ar' ? 'تشخيصات الخادم وأخطاء المتصفح وأداؤه وفق تفضيلات التحليلات.' :
                'Server diagnostics and optional browser error and performance information, according to your analytics preference.'}</dd></div>
            </dl>

            {/* Notifications disclosure (push). Co-located with the processor
                table because the push transit services above (FCM, Mozilla)
                exist only for this feature. Functional-only, opt-in, PII-free,
                one-tap off — mirrors Paper 7 of the compliance package. */}
            <div className="mt-6 rounded-lg bg-violet-50 ring-1 ring-violet-100 p-5">
              <h3 className="font-bold text-slate-900 mb-2">
                {language === 'en' ? 'Notifications' : language === 'he' ? 'התראות' : 'الإشعارات'}
              </h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                {language === 'en'
                  ? 'If you choose to turn on notifications, we store a push "subscription" for your device so we can alert you when your teacher assigns new work, sends a reward, or starts a live challenge. These messages are delivered through your browser or operating system’s push service (e.g. Google or Mozilla) and never contain your name, class, or scores. We send only functional notifications — never advertising. You can turn notifications off at any time in Privacy Settings, which deletes the stored subscription for that device.'
                  : language === 'he'
                  ? 'אם תבחרו להפעיל התראות, נשמור "מנוי" התראות עבור המכשיר שלכם כדי שנוכל להודיע לכם כשהמורה מוסיף משימה חדשה, שולח פרס או מתחיל אתגר חי. ההודעות נשלחות דרך שירות ההתראות של הדפדפן או מערכת ההפעלה (למשל Google או Mozilla) ולעולם אינן כוללות את השם, הכיתה או הציונים שלכם. אנו שולחים רק התראות פונקציונליות — לעולם לא פרסומות. אפשר לכבות התראות בכל רגע בהגדרות הפרטיות, מה שמוחק את המנוי השמור עבור אותו מכשיר.'
                  : 'إذا اخترت تشغيل الإشعارات، فإننا نخزّن "اشتراك" دفع لجهازك حتى نتمكن من تنبيهك عندما يكلّفك معلمك بعمل جديد أو يرسل مكافأة أو يبدأ تحديًا مباشرًا. تُسلَّم هذه الرسائل عبر خدمة الدفع في متصفحك أو نظام تشغيلك (مثل Google أو Mozilla) ولا تحتوي أبدًا على اسمك أو صفك أو درجاتك. نرسل إشعارات وظيفية فقط — وليست إعلانات أبدًا. يمكنك إيقاف الإشعارات في أي وقت من إعدادات الخصوصية، مما يحذف الاشتراك المخزَّن لذلك الجهاز.'}
              </p>
            </div>
          </section>

          {/* Section 5: Retention */}
          <section className="bg-white p-8 rounded-xl shadow-2xl shadow-violet-950/20 ring-1 ring-slate-200/60">
            <h2 className={`text-xl font-black text-slate-900 mb-4 font-headline flex items-center gap-3`}>
              <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-violet-700 text-sm font-black">5</span>
              <Clock size={20} className="text-violet-600" />
              {language === 'en' ? 'Data Retention' : language === 'he' ? 'שמירת נתונים' : 'الاحتفاظ بالبيانات'}
            </h2>
            <ul className="space-y-3 text-on-surface-variant">
              <li className={`flex flex-wrap items-start justify-between gap-2 py-2 border-b border-surface-container/50`}>
                <span>{ui.dataRetention.studentProgress}</span>
                <span className="font-bold text-on-surface">{language === 'en' ? '365 days' : language === 'he' ? '365 יום' : '365 يوم'}</span>
              </li>
              <li className={`flex flex-wrap items-start justify-between gap-2 py-2 border-b border-surface-container/50`}>
                <span>{ui.dataRetention.orphanedAccounts}</span>
                <span className="font-bold text-on-surface">{language === 'en' ? '90 days' : language === 'he' ? '90 יום' : '90 يوم'}</span>
              </li>
              <li className={`flex flex-wrap items-start justify-between gap-2 py-2 border-b border-surface-container/50`}>
                <span>{ui.dataRetention.teacherAccounts}</span>
                <span className="font-bold text-on-surface">{language === 'en' ? 'While needed for the account or a documented obligation' : language === 'he' ? 'כל עוד נדרש לניהול החשבון או לחובה מתועדת' : 'ما دام مطلوبًا للحساب أو لالتزام موثّق'}</span>
              </li>
              <li className={`flex flex-wrap items-start justify-between gap-2 py-2`}>
                <span>{ui.dataRetention.auditLogs}</span>
                <span className="font-bold text-on-surface">{language === 'en' ? '2 years' : language === 'he' ? '2 שנים' : '2 سنة'}</span>
              </li>
            </ul>
          </section>

          {/* Section 6: Your Rights */}
          <section className="bg-white p-8 rounded-xl shadow-2xl shadow-violet-950/20 ring-1 ring-slate-200/60">
            <h2 className={`text-xl font-black text-slate-900 mb-4 font-headline flex items-center gap-3`}>
              <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-violet-700 text-sm font-black">6</span>
              <Gavel size={20} className="text-violet-600" />
              {language === 'en' ? 'Your Rights (Data Subject Rights)' : language === 'he' ? 'הזכויות שלך (זכויות נושא הנתונים)' : 'حقوقك (حقوق موضوع البيانات)'}
            </h2>
            <p className={`text-slate-600 leading-relaxed mb-4`}>
              {language === 'en' ? 'Under Israeli Privacy Protection Law (Amendment 13), you have the right to:' :
               language === 'he' ? 'לפי חוק הגנת הפרטיות (תיקון 13), יש לך את הזכות:' :
               'بموجب قانون حماية الخصوصية الإسرائيلي (التعديل 13)، لديك الحق في:'}
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-surface-container-low p-4 rounded-lg text-center">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Database size={18} className="text-violet-600" />
                </div>
                <h4 className="font-bold text-on-surface text-sm">{ui.rights.access}</h4>
                <p className={`text-xs text-on-surface-variant mt-1`}>{ui.rights.accessDesc}</p>
              </div>
              <div className="bg-surface-container-low p-4 rounded-lg text-center">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Lock size={18} className="text-violet-600" />
                </div>
                <h4 className="font-bold text-on-surface text-sm">{ui.rights.deletion}</h4>
                <p className={`text-xs text-on-surface-variant mt-1`}>{ui.rights.deletionDesc}</p>
              </div>
              <div className="bg-surface-container-low p-4 rounded-lg text-center">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <FileText size={18} className="text-violet-600" />
                </div>
                <h4 className="font-bold text-on-surface text-sm">{ui.rights.portability}</h4>
                <p className={`text-xs text-on-surface-variant mt-1`}>{ui.rights.portabilityDesc}</p>
              </div>
            </div>
          </section>

          {/* Section 7: Children's Privacy */}
          <section className="bg-white p-8 rounded-xl shadow-2xl shadow-violet-950/20 ring-1 ring-slate-200/60">
            <h2 className={`text-xl font-black text-slate-900 mb-4 font-headline flex items-center gap-3`}>
              <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-violet-700 text-sm font-black">7</span>
              <Users size={20} className="text-violet-600" />
              {language === 'en' ? "Children's Privacy" : language === 'he' ? 'פרטיות ילדים' : 'خصوصية الأطفال'}
            </h2>
            <p className={`text-slate-600 leading-relaxed mb-4`}>
              {language === 'en' ? 'Schools arrange classroom use and inform families. A class code is used to reach the class and a PIN identifies the student’s account. A parent or guardian can ask the school or contact our privacy team about student information.' :
               language === 'he' ? 'בית הספר מסדיר את השימוש בכיתה ומיידע משפחות. קוד הכיתה מוביל לכיתה והקוד האישי משמש לכניסה לחשבון התלמיד. הורים או אפוטרופוסים יכולים לפנות לבית הספר או לאיש הקשר שלנו לפרטיות.' :
               'تنظّم المدرسة الاستخدام في الصف وتُبلغ العائلات. يقود رمز الصف إلى الصف ويتيح رمز PIN الدخول إلى حساب الطالب. يمكن للأهل أو الأوصياء التواصل مع المدرسة أو جهة الخصوصية لدينا.'}
            </p>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className={`text-sm text-green-800 font-medium`}>
                {language === 'en' ? 'We minimize data collection from students: No email required • No real name required • No location tracking • No behavioral advertising' :
                 language === 'he' ? 'אנו ממזערים איסוף נתונים מתלמידים: ללא דוא"ל • ללא שם אמיתי • ללא מעקב מיקום • ללא פרסום התנהגותית' :
                 'نحن نقلل من جمع البيانات من الطلاب: لا بريد إلكتروني • لا اسم حقيقي • لا تتبع للموقع • لا إعلانات سلوكية'}
              </p>
            </div>
          </section>

          {/* Section 8: Security */}
          <section className="bg-white p-8 rounded-xl shadow-2xl shadow-violet-950/20 ring-1 ring-slate-200/60">
            <h2 className={`text-xl font-black text-slate-900 mb-4 font-headline flex items-center gap-3`}>
              <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-violet-700 text-sm font-black">8</span>
              <Lock size={20} className="text-violet-600" />
              {language === 'en' ? 'Security Measures' : language === 'he' ? 'אמצעי אבטחה' : 'تدابير الأمان'}
            </h2>
            <ul className={`grid md:grid-cols-2 gap-3 text-on-surface-variant`}>
              {ui.securityMeasures.map((item, i) => (
                <li key={i} className={`flex items-center gap-2`}>
                  <span className="text-violet-600">✓</span> {item}
                </li>
              ))}
            </ul>
            {/* Cross-link to /security — the technical-trust page added
                in 2026-04-28 covers TLS/RLS/audit detail too granular
                for the privacy policy itself.  Keeps the legal doc
                short while still letting curious IT readers drill in. */}
            <button
              type="button"
              onClick={() => onNavigate("security")}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-bold text-sm transition-colors"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as never }}
            >
              <Lock size={14} />
              {language === 'en' ? 'See full Security & Trust details →' :
               language === 'he' ? 'ראו פרטי אבטחה ואמון מלאים ←' :
               'اطلع على تفاصيل الأمان والثقة ←'}
            </button>
          </section>

          {/* Section 9: Complaints */}
          <section className="bg-white p-8 rounded-xl shadow-2xl shadow-violet-950/20 ring-1 ring-slate-200/60">
            <h2 className={`text-xl font-black text-slate-900 mb-4 font-headline flex items-center gap-3`}>
              <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-violet-700 text-sm font-black">9</span>
              <AlertTriangle size={20} className="text-amber-500" />
              {language === 'en' ? 'Complaints' : language === 'he' ? 'תלונות' : 'الشكاوى'}
            </h2>
            <p className={`text-slate-600 leading-relaxed mb-4`}>
              {language === 'en' ? 'If you believe your privacy rights have been violated, you may:' :
               language === 'he' ? 'אם אתה סבור שזכויות הפרטיות שלך הופרו, אתה רשאי:' :
               'إذا كنت تعتقد أن حقوق خصوصيتك قد انتهكت، يمكنك:'}
            </p>
            <ol className={`list-decimal list-inside space-y-2 text-on-surface-variant`}>
              <li>
                {language === 'en' ? 'Contact us at ' : language === 'he' ? 'לפנות אלינו בכתובת ' : 'الاتصال بنا على '}
                <span className="text-primary font-medium">contact@vocaband.com</span>
              </li>
              <li>
                {language === 'en' ? 'File a complaint with the Israeli Privacy Protection Authority (הרשות להגנת הפרטיות)' :
                 language === 'he' ? 'להגיש תלונה לרשות להגנת הפרטיות' :
                 'تقديم شكوى إلى سلطة حماية الخصوصية الإسرائيلية'}
              </li>
            </ol>
          </section>

          {/* Section 10: Contact */}
          <section className="bg-surface-container-high/50 p-8 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className={isRTL ? 'text-right' : ''}>
              <h3 className="text-xl font-black font-headline mb-2">{t.footer.haveQuestions}</h3>
              <p className="text-on-surface-variant">{t.footer.responseTime}</p>
            </div>
            <a
              href="mailto:contact@vocaband.com"
              className={`inline-flex items-center gap-3 bg-on-background text-background px-6 py-3 rounded-lg font-black hover:scale-105 transition-all`}
            >
              <Mail size={18} /> contact@vocaband.com
            </a>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t-2 border-surface-container-high pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className={`flex items-center gap-4`}>
            {onBack && (
              <button
                onClick={onBack}
                className={`flex items-center gap-2 text-primary font-bold hover:underline transition-all group`}
              >
                <ArrowLeft size={18} className={`transition-transform ${isRTL ? 'group-hover:translate-x-1' : 'group-hover:-translate-x-1'}`} />
                <span>{t.footer.backButton}</span>
              </button>
            )}
            <p className={`text-sm text-on-surface-variant`}>
              <strong>{t.footer.related}</strong>{" "}
              <button onClick={() => onNavigate("terms")} className="text-primary hover:underline">
                {t.footer.termsLink}
              </button>
            </p>
          </div>
        </footer>
      </main>

      <FloatingButtons />
    </div>
  );
};

export default PublicPrivacyPage;
