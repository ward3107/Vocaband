import React from "react";
import { Shield, School, Lock, Mail, Database, Gavel, Globe, Clock, Users, AlertTriangle, FileText, ExternalLink, ArrowLeft } from "lucide-react";
import PublicNav from "./PublicNav";
import MobileNav from "./MobileNav";
import FloatingButtons from "./FloatingButtons";
import BackButton from "./BackButton";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "../hooks/useLanguage";
import { privacyTranslations, uiTranslations } from "../config/translations/legalTranslations";

interface PublicPrivacyPageProps {
  onNavigate: (page: "home" | "terms" | "privacy") => void;
  onGetStarted: () => void;
  onBack?: () => void;
}

const PublicPrivacyPage: React.FC<PublicPrivacyPageProps> = ({
  onNavigate,
  onGetStarted,
  onBack,
}) => {
  const { language, dir, isRTL } = useLanguage();
  const t = privacyTranslations[language];
  const ui = uiTranslations[language];

  return (
    <div className="min-h-screen bg-surface" dir={dir}>
      <PublicNav
        currentPage="privacy"
        onNavigate={onNavigate}
        onGetStarted={onGetStarted}
      />

      <main className="max-w-4xl mx-auto px-6 pt-32 pb-24 mb-20 md:mb-0">
        {/* Back Button & Language Switcher */}
        <div className={`flex items-center gap-4 mb-6`}>
          {onBack && <BackButton onClick={onBack} />}
          <LanguageSwitcher />
        </div>

        {/* Header */}
        <section className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tight mb-4 font-headline">
            {t.title} <span className="text-primary italic">{t.titleHighlight}</span>
          </h1>
          <div className={`flex flex-wrap gap-4 text-sm text-on-surface-variant font-medium`}>
            <span className="flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              {t.effective}
            </span>
            <span className="flex items-center gap-2">
              <Shield size={16} className="text-primary" />
              {t.version}
            </span>
          </div>
          <p className={`mt-4 text-lg text-on-surface-variant max-w-2xl`}>
            <strong>{language === 'en' ? 'Legal Basis:' : language === 'he' ? 'בסיס חוקי:' : 'الأساس القانوني:'}</strong> {t.legalBasis}
          </p>
        </section>

        {/* Summary Card */}
        <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-900 rounded-2xl p-8 text-white mb-8 relative overflow-hidden">
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
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className={`text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3`}>
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">1</span>
              {language === 'en' ? 'Data Controller (בעל המאגר)' : language === 'he' ? 'בעל המאגר' : 'مراقب البيانات (בעל המאגר)'}
            </h2>
            <div className={`text-on-surface-variant leading-relaxed space-y-4`}>
              <p>
                {language === 'en' ? 'Under the Israeli Privacy Protection Law (Amendment 13), the data controller for Vocaband is:' :
                 language === 'he' ? 'לפי חוק הגנת הפרטיות (תיקון 13), בעל מאגר הנתונים של Vocaband הוא:' :
                 'بموجب قانون حماية الخصوصية الإسرائيلي (التعديل 13)، مراقب بيانات Vocaband هو:'}
              </p>
              <ul className={`space-y-2`}>
                <li><strong>{language === 'en' ? 'Entity:' : language === 'he' ? 'גוף:' : 'الكيان:'}</strong> Vocaband Educational Technologies</li>
                <li><strong>{language === 'en' ? 'Address:' : language === 'he' ? 'כתובת:' : 'العنوان:'}</strong> {language === 'en' ? 'Israel' : language === 'he' ? 'ישראל' : 'إسرائيل'}</li>
                <li><strong>{language === 'en' ? 'Privacy Contact:' : language === 'he' ? 'יצירת קשר לפרטיות:' : 'جهة اتصال الخصوصية:'}</strong> <span className="text-primary">contact@vocaband.com</span></li>
              </ul>
              <p>
                {language === 'en' ? 'For privacy inquiries, data access requests, or complaints, contact us at the email above. We will respond within 30 days as required by law.' :
                 language === 'he' ? 'לפניות פרטיות, בקשות גישה לנתונים או תלונות, צרו איתנו קשר בכתובת למעלה. נשיב תוך 30 יום כנדרש על פי חוק.' :
                 'لاستفسارات الخصوصية أو طلبات الوصول إلى البيانات أو الشكاوى، تواصل معنا عبر البريد أعلاه. سنرد خلال 30 يومًا كما يقتضي القانون.'}
              </p>
            </div>
          </section>

          {/* Section 2: What We Collect */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className={`text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3`}>
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">2</span>
              <Database size={20} className="text-primary" />
              {ui.forStudents === 'For Students' ? 'Data We Collect' : language === 'he' ? 'נתונים שאנו אוספים' : 'البيانات التي نجمعها'}
            </h2>

            <div className={`grid md:grid-cols-2 gap-6 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
              <div className="bg-surface-container-low p-5 rounded-xl">
                <div className={`flex items-center gap-2 mb-3`}>
                  <Users size={18} className="text-primary" />
                  <h3 className="font-bold text-on-surface">{ui.forStudents}</h3>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">{ui.anonymous}</span>
                </div>
                <ul className={`space-y-2 text-sm text-on-surface-variant`}>
                  {language === 'en' ? (
                    <>
                      <li>• <strong>Display name</strong> — chosen by student</li>
                      <li>• <strong>Avatar</strong> — emoji selection</li>
                      <li>• <strong>Class code</strong> — 6-digit code</li>
                      <li>• <strong>Progress</strong> — scores, streaks, XP</li>
                      <li>• <strong>Badges</strong> — achievements earned</li>
                    </>
                  ) : language === 'he' ? (
                    <>
                      <li>• <strong>שם תצוגה</strong> — נבחר על ידי התלמיד</li>
                      <li>• <strong>אווטר</strong> — בחירת אימוג'י</li>
                      <li>• <strong>קוד כיתה</strong> — קוד בן 6 ספרות</li>
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
              </div>

              <div className="bg-surface-container-low p-5 rounded-xl">
                <div className={`flex items-center gap-2 mb-3`}>
                  <School size={18} className="text-primary" />
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
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className={`text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3`}>
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">3</span>
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
            <div className="mt-4 p-4 bg-red-50 rounded-xl">
              <p className={`text-sm text-red-700 font-medium`}>
                {language === 'en' ? 'We do NOT: Sell data • Show ads • Create profiles • Share with brokers • Use tracking cookies' :
                 language === 'he' ? 'איננו: מוכרים נתונים • מציגים פרסומות • יוצרים פרופילים • משתפים עם מתווכים • משתמשים בעוגיות מעקב' :
                 'نحن لا: نبيع البيانات • نعرض الإعلانات • ننشئ ملفات تعريف • نشارك مع الوسطاء • نستخدم ملفات تعريف الارتباط للتتبع'}
              </p>
            </div>
          </section>

          {/* Section 4: Third Parties */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className={`text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3`}>
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">4</span>
              <Globe size={20} className="text-primary" />
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
                    <td className="py-2 pr-4">{language === 'en' ? 'Database, authentication' : language === 'he' ? 'מסד נתונים, אימות' : 'قاعدة البيانات، المصادقة'}</td>
                    <td className="py-2 pr-4">EU (Frankfurt) / US</td>
                  </tr>
                  <tr className="border-b border-surface-container/50">
                    <td className="py-2 pr-4 font-medium">Google OAuth</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'Teacher sign-in only' : language === 'he' ? 'כניסת מורים בלבד' : 'تسجيل دخول المعلمين فقط'}</td>
                    <td className="py-2 pr-4">US</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">Render</td>
                    <td className="py-2 pr-4">{language === 'en' ? 'Application hosting' : language === 'he' ? 'אירוח אפליקציה' : 'استضافة التطبيق'}</td>
                    <td className="py-2 pr-4">US</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5: Retention */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className={`text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3`}>
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">5</span>
              <Clock size={20} className="text-primary" />
              {language === 'en' ? 'Data Retention' : language === 'he' ? 'שמירת נתונים' : 'الاحتفاظ بالبيانات'}
            </h2>
            <ul className="space-y-3 text-on-surface-variant">
              <li className={`flex items-center justify-between py-2 border-b border-surface-container/50`}>
                <span>{ui.dataRetention.studentProgress}</span>
                <span className="font-bold text-on-surface">{language === 'en' ? '365 days' : language === 'he' ? '365 יום' : '365 يوم'}</span>
              </li>
              <li className={`flex items-center justify-between py-2 border-b border-surface-container/50`}>
                <span>{ui.dataRetention.orphanedAccounts}</span>
                <span className="font-bold text-on-surface">{language === 'en' ? '90 days' : language === 'he' ? '90 יום' : '90 يوم'}</span>
              </li>
              <li className={`flex items-center justify-between py-2 border-b border-surface-container/50`}>
                <span>{ui.dataRetention.teacherAccounts}</span>
                <span className="font-bold text-on-surface">{language === 'en' ? 'Active + 2 years' : language === 'he' ? 'פעיל + 2 שנים' : 'نشط + 2 سنة'}</span>
              </li>
              <li className={`flex items-center justify-between py-2`}>
                <span>{ui.dataRetention.auditLogs}</span>
                <span className="font-bold text-on-surface">{language === 'en' ? '2 years' : language === 'he' ? '2 שנים' : '2 سنة'}</span>
              </li>
            </ul>
          </section>

          {/* Section 6: Your Rights */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className={`text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3`}>
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">6</span>
              <Gavel size={20} className="text-primary" />
              {language === 'en' ? 'Your Rights (Data Subject Rights)' : language === 'he' ? 'הזכויות שלך (זכויות נושא הנתונים)' : 'حقوقك (حقوق موضوع البيانات)'}
            </h2>
            <p className={`text-on-surface-variant leading-relaxed mb-4`}>
              {language === 'en' ? 'Under Israeli Privacy Protection Law (Amendment 13), you have the right to:' :
               language === 'he' ? 'לפי חוק הגנת הפרטיות (תיקון 13), יש לך את הזכות:' :
               'بموجب قانون حماية الخصوصية الإسرائيلي (التعديل 13)، لديك الحق في:'}
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-surface-container-low p-4 rounded-xl text-center">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Database size={18} className="text-primary" />
                </div>
                <h4 className="font-bold text-on-surface text-sm">{ui.rights.access}</h4>
                <p className={`text-xs text-on-surface-variant mt-1`}>{ui.rights.accessDesc}</p>
              </div>
              <div className="bg-surface-container-low p-4 rounded-xl text-center">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Lock size={18} className="text-primary" />
                </div>
                <h4 className="font-bold text-on-surface text-sm">{ui.rights.deletion}</h4>
                <p className={`text-xs text-on-surface-variant mt-1`}>{ui.rights.deletionDesc}</p>
              </div>
              <div className="bg-surface-container-low p-4 rounded-xl text-center">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <FileText size={18} className="text-primary" />
                </div>
                <h4 className="font-bold text-on-surface text-sm">{ui.rights.portability}</h4>
                <p className={`text-xs text-on-surface-variant mt-1`}>{ui.rights.portabilityDesc}</p>
              </div>
            </div>
          </section>

          {/* Section 7: Children's Privacy */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className={`text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3`}>
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">7</span>
              <Users size={20} className="text-primary" />
              {language === 'en' ? "Children's Privacy" : language === 'he' ? 'פרטיות ילדים' : 'خصوصية الأطفال'}
            </h2>
            <p className={`text-on-surface-variant leading-relaxed mb-4`}>
              {language === 'en' ? 'Vocaband is designed for students in Israeli schools. The educational institution (school) authorizes student use. By providing a class code, the teacher (on behalf of the school) authorizes student access.' :
               language === 'he' ? 'Vocaband מיועד לתלמידים בבתי ספר בישראל. המוסד החינוכי (בית הספר) מאשר שימוש תלמידים. על ידי מתן קוד כיתה, המורה (מטעם בית הספר) מאשר גישת תלמידים.' :
               'Vocaband مصمم للطلاب في المدارس الإسرائيلية. المؤسسة التعليمية (المدرسة) تصرح باستخدام الطلاب. من خلال تقديم رمز الفصل، يصرح المعلم (نيابة عن المدرسة) بوصول الطلاب.'}
            </p>
            <div className="bg-green-50 p-4 rounded-xl">
              <p className={`text-sm text-green-800 font-medium`}>
                {language === 'en' ? 'We minimize data collection from students: No email required • No real name required • No location tracking • No behavioral advertising' :
                 language === 'he' ? 'אנו ממזערים איסוף נתונים מתלמידים: ללא דוא"ל • ללא שם אמיתי • ללא מעקב מיקום • ללא פרסום התנהגותית' :
                 'نحن نقلل من جمع البيانات من الطلاب: لا بريد إلكتروني • لا اسم حقيقي • لا تتبع للموقع • لا إعلانات سلوكية'}
              </p>
            </div>
          </section>

          {/* Section 8: Security */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className={`text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3`}>
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">8</span>
              <Lock size={20} className="text-primary" />
              {language === 'en' ? 'Security Measures' : language === 'he' ? 'אמצעי אבטחה' : 'تدابير الأمان'}
            </h2>
            <ul className={`grid md:grid-cols-2 gap-3 text-on-surface-variant`}>
              {ui.securityMeasures.map((item, i) => (
                <li key={i} className={`flex items-center gap-2`}>
                  <span className="text-primary">✓</span> {item}
                </li>
              ))}
            </ul>
          </section>

          {/* Section 9: Complaints */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <h2 className={`text-xl font-black text-on-surface mb-4 font-headline flex items-center gap-3`}>
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-black">9</span>
              <AlertTriangle size={20} className="text-amber-500" />
              {language === 'en' ? 'Complaints' : language === 'he' ? 'תלונות' : 'الشكاوى'}
            </h2>
            <p className={`text-on-surface-variant leading-relaxed mb-4`}>
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
          <section className="bg-surface-container-high/50 p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className={isRTL ? 'text-right' : ''}>
              <h3 className="text-xl font-black font-headline mb-2">{t.footer.haveQuestions}</h3>
              <p className="text-on-surface-variant">{t.footer.responseTime}</p>
            </div>
            <a
              href="mailto:contact@vocaband.com"
              className={`inline-flex items-center gap-3 bg-on-background text-background px-6 py-3 rounded-xl font-black hover:scale-105 transition-all`}
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
          <button
            onClick={onGetStarted}
            className="signature-gradient px-8 py-3 rounded-full font-black text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            {t.footer.acceptButton}
          </button>
        </footer>
      </main>

      <MobileNav currentPage="privacy" onNavigate={onNavigate} />
      <FloatingButtons />
    </div>
  );
};

export default PublicPrivacyPage;
