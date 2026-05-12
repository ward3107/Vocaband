import React from "react";
import { ArrowLeft, Printer, FileText, Scale, Users, Shield, AlertTriangle, Gavel, Mail } from "lucide-react";
import PublicNav, { NavPage } from "./PublicNav";
import FloatingButtons from "./FloatingButtons";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "../hooks/useLanguage";
import { termsTranslations, uiTranslations } from "../config/translations/legalTranslations";

interface TermsPageProps {
  onNavigate: (page: NavPage) => void;
  onGetStarted: () => void;
  /** Teacher signup / OAuth — wired into PublicNav so its primary
   *  "Start free" CTA drives the freemium audience (teachers), not
   *  the student class-code flow that onGetStarted points at. */
  onTeacherLogin?: () => void;
  onBack?: () => void;
}

const TermsPage: React.FC<TermsPageProps> = ({ onNavigate, onGetStarted, onTeacherLogin, onBack }) => {
  const { language, isRTL, dir } = useLanguage();
  const t = termsTranslations[language];
  const ui = uiTranslations[language];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900" dir={dir}>
      <PublicNav
        currentPage="terms"
        onNavigate={onNavigate}
        onGetStarted={onGetStarted}
        onTeacherLogin={onTeacherLogin}
      />

      <main className="max-w-4xl mx-auto px-6 pt-32 pb-24 mb-20 md:mb-0">
        {/* Back Button & Language Switcher */}
        <div className="flex items-center gap-4 mb-6">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-violet-300 hover:text-violet-200 font-bold hover:underline transition-all group"
            >
              <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
              <span>{t.footer.backButton}</span>
            </button>
          )}
          <LanguageSwitcher />
        </div>

        {/* Header */}
        <section className="mb-12">
          <h1 className={`text-4xl md:text-5xl font-black text-white tracking-tight mb-4 font-headline drop-shadow-lg ${isRTL ? 'text-right' : ''}`}>
            {t.title} <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent italic">{t.titleHighlight}</span>
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-white/70 font-medium">
            <span className="flex items-center gap-2">
              <FileText size={16} className="text-violet-300" />
              {t.effective}
            </span>
            <span className="flex items-center gap-2">
              <Scale size={16} className="text-violet-300" />
              {t.version}
            </span>
          </div>
          <p className={`mt-4 text-lg text-white/75 max-w-2xl ${isRTL ? 'text-right' : ''}`}>
            {t.intro}
          </p>
        </section>

        {/* Sections */}
        <div className="space-y-8">
          {/* Section 1: Acceptance */}
          <section className="bg-white p-8 rounded-2xl shadow-2xl shadow-violet-950/20 ring-1 ring-slate-200/60">
            <h2 className={`text-xl font-black text-slate-900 mb-4 font-headline flex items-center gap-3 ${isRTL ? 'justify-end' : ''}`}>
              <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-violet-700 text-sm font-black">1</span>
              {language === 'en' ? 'Acceptance of Terms' : language === 'he' ? 'קבלת התנאים' : 'قبول الشروط'}
            </h2>
            <div className={`text-slate-600 leading-relaxed space-y-4 ${isRTL ? 'text-right' : ''}`}>
              <p>
                {language === 'en' ? 'By accessing or using Vocaband ("the Service"), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy. These Terms constitute a legally binding agreement between you and Vocaband Educational Technologies.' :
                 language === 'he' ? 'על ידי גישה או שימוש ב-Vocaband ("השירות"), אתה מאשר שקראת, הבנת ומסכים להיות מחויב על פי תנאי שירות אלה ומדיניות הפרטיות שלנו. תנאים אלה מהווים הסכם מחייב מבחינה משפטית בינך לבין Vocaband טכנולוגיות חינוכיות.' :
                 'بالدخول أو استخدام Vocaband ("الخدمة")، فإنك تقر بأنك قد قرأت وفهمت ووافقت على الالتزام بشروط الخدمة هذه وسياسة الخصوصية الخاصة بنا. تشكل هذه الشروط اتفاقية ملزمة قانونًا بينك وبين Vocaband للتقنيات التعليمية.'}
              </p>
              <p>
                {language === 'en' ? 'We may modify these Terms at any time. Material changes will be communicated through the Service, and your continued use after such changes constitutes acceptance. As required by Israeli Privacy Protection Law (Amendment 13), significant changes will require your explicit consent.' :
                 language === 'he' ? 'אנו רשאים לשנות תנאים אלה בכל עת. שינויים מהותיים יתקשרו דרך השירות, והמשך השימוש שלך לאחר שינויים כאלה מהווה הסכמה. כנדרש על פי חוק הגנת הפרטיות (תיקון 13), שינויים משמעותיים ידרשו את הסכמתך המפורשת.' :
                 'يجوز لنا تعديل هذه الشروط في أي وقت. سيتم إبلاغ التغييرات الجوهرية عبر الخدمة، واستمرارك في الاستخدام بعد هذه التغييرات يشكل قبولاً. كما يقتضي قانون حماية الخصوصية الإسرائيلي (التعديل 13)، ستتطلب التغييرات المهمة موافقتك الصريحة.'}
              </p>
            </div>
          </section>

          {/* Section 2: Description */}
          <section className="bg-white p-8 rounded-2xl shadow-2xl shadow-violet-950/20 ring-1 ring-slate-200/60">
            <h2 className={`text-xl font-black text-slate-900 mb-4 font-headline flex items-center gap-3 ${isRTL ? 'justify-end' : ''}`}>
              <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-violet-700 text-sm font-black">2</span>
              {language === 'en' ? 'Description of Service' : language === 'he' ? 'תיאור השירות' : 'وصف الخدمة'}
            </h2>
            <p className={`text-slate-600 leading-relaxed mb-4 ${isRTL ? 'text-right' : ''}`}>
              {language === 'en' ? 'Vocaband is an educational technology platform that helps students practice English vocabulary through interactive games. The Service is:' :
               language === 'he' ? 'Vocaband היא פלטפורמה טכנולוגית חינוכית שעוזרת לתלמידים לתרגל אוצר מילים באנגלית דרך משחקים אינטראקטיביים. השירות הוא:' :
               'Vocaband هي منصة تكنولوجيا تعليمية تساعد الطلاب على ممارسة المفردات الإنجليزية من خلال ألعاب تفاعلية. الخدمة هي:'}
            </p>
            <ul className={`space-y-2 text-slate-600 ${isRTL ? 'text-right' : ''}`}>
              {ui.serviceDescription.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-violet-600 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Section 3: User Accounts */}
          <section className="bg-white p-8 rounded-2xl shadow-2xl shadow-violet-950/20 ring-1 ring-slate-200/60">
            <h2 className={`text-xl font-black text-slate-900 mb-4 font-headline flex items-center gap-3 ${isRTL ? 'justify-end' : ''}`}>
              <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-violet-700 text-sm font-black">3</span>
              <Users size={20} className="text-primary" />
              {language === 'en' ? 'User Accounts' : language === 'he' ? 'חשבונות משתמש' : 'حسابات المستخدمين'}
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-5 rounded-xl ring-1 ring-slate-200/60">
                <h3 className={`font-bold text-slate-900 mb-3 ${isRTL ? 'text-right' : ''}`}>
                  {language === 'en' ? 'Teacher Accounts' : language === 'he' ? 'חשבונות מורים' : 'حسابات المعلمين'}
                </h3>
                <ul className={`space-y-2 text-sm text-slate-600 ${isRTL ? 'text-right' : ''}`}>
                  {ui.teacherAccountRules.map((rule, i) => (
                    <li key={i}>• {rule}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-slate-50 p-5 rounded-xl ring-1 ring-slate-200/60">
                <h3 className={`font-bold text-slate-900 mb-3 ${isRTL ? 'text-right' : ''}`}>
                  {language === 'en' ? 'Student Accounts' : language === 'he' ? 'חשבונות תלמידים' : 'حسابات الطلاب'}
                </h3>
                <ul className={`space-y-2 text-sm text-slate-600 ${isRTL ? 'text-right' : ''}`}>
                  {ui.studentAccountRules.map((rule, i) => (
                    <li key={i}>• {rule}</li>
                  ))}
                </ul>
              </div>
            </div>

            <p className={`text-slate-600 leading-relaxed mt-4 ${isRTL ? 'text-right' : ''}`}>
              <strong>{language === 'en' ? 'School Authorization:' : language === 'he' ? 'אישור בית ספר:' : 'تفويض المدرسة:'}</strong> {ui.schoolAuthorization}
            </p>
          </section>

          {/* Section 4: Code of Conduct */}
          <section className="bg-white p-8 rounded-2xl shadow-2xl shadow-violet-950/20 ring-1 ring-slate-200/60">
            <h2 className={`text-xl font-black text-slate-900 mb-4 font-headline flex items-center gap-3 ${isRTL ? 'justify-end' : ''}`}>
              <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-violet-700 text-sm font-black">4</span>
              <Shield size={20} className="text-primary" />
              {language === 'en' ? 'Code of Conduct' : language === 'he' ? 'קוד התנהגות' : 'قواعد السلوك'}
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-green-600 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-xs">✓</span>
                  {ui.youAgreeTo}
                </h3>
                <ul className={`space-y-2 text-sm text-slate-600 ${isRTL ? 'text-right' : ''}`}>
                  {ui.acceptableUse.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-red-500 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-xs">✕</span>
                  {ui.youMustNot}
                </h3>
                <ul className={`space-y-2 text-sm text-slate-600 ${isRTL ? 'text-right' : ''}`}>
                  {ui.prohibitedUse.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Section 5: Teacher Responsibilities */}
          <section className="bg-white p-8 rounded-2xl shadow-2xl shadow-violet-950/20 ring-1 ring-slate-200/60">
            <h2 className={`text-xl font-black text-slate-900 mb-4 font-headline flex items-center gap-3 ${isRTL ? 'justify-end' : ''}`}>
              <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-violet-700 text-sm font-black">5</span>
              {language === 'en' ? 'Teacher Responsibilities' : language === 'he' ? 'אחריות מורים' : 'مسؤوليات المعلم'}
            </h2>
            <ul className={`space-y-3 text-slate-600 ${isRTL ? 'text-right' : ''}`}>
              {ui.teacherDuties.map((duty, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-violet-600 font-bold">•</span>
                  <span><strong>{duty.title}</strong> {duty.desc}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Section 6: Intellectual Property */}
          <section className="bg-white p-8 rounded-2xl shadow-2xl shadow-violet-950/20 ring-1 ring-slate-200/60">
            <h2 className={`text-xl font-black text-slate-900 mb-4 font-headline flex items-center gap-3 ${isRTL ? 'justify-end' : ''}`}>
              <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-violet-700 text-sm font-black">6</span>
              {language === 'en' ? 'Intellectual Property' : language === 'he' ? 'קניין רוחני' : 'الملكية الفكرية'}
            </h2>
            <div className={`text-slate-600 leading-relaxed space-y-4 ${isRTL ? 'text-right' : ''}`}>
              <p>
                {language === 'en' ? 'All content on Vocaband—vocabulary lists, game designs, user interface, and software—is the property of Vocaband or its licensors and protected by intellectual property laws.' :
                 language === 'he' ? 'כל התוכן ב-Vocaband - רשימות אוצר מילים, עיצובי משחקים, ממשק משתמש ותוכנה - הוא רכושו של Vocaband או מעניקי הרישיון שלו ומוגן בחוקי קניין רוחני.' :
                 'جميع المحتويات على Vocaband - قوائم المفردات وتصميمات الألعاب وواجهة المستخدم والبرمجيات - هي ملك لـ Vocaband أو المرخصين لها ومحمية بموجب قوانين الملكية الفكرية.'}
              </p>
              <p>
                {language === 'en' ? 'You receive a limited, non-exclusive, non-transferable license to use the Service for educational purposes. You may not copy, reproduce, distribute, or create derivative works without permission.' :
                 language === 'he' ? 'אתה מקבל רישיון מוגבל, בלעדי, בלתי ניתן להעברה לשימוש בשירות למטרות חינוכיות. אינך רשאי להעתיק, לשכפל, להפיץ או ליצור יצירות נגזרות ללא רשות.' :
                 'تحصل على ترخيص محدود وغير حصري وغير قابل للتحويل لاستخدام الخدمة لأغراض تعليمية. لا يجوز لك النسخ أو إعادة الإنتاج أو التوزيع أو إنشاء أعمال مشتقة بدون إذن.'}
              </p>
            </div>
          </section>

          {/* Section 7: Data Protection */}
          <section className="bg-white p-8 rounded-2xl shadow-2xl shadow-violet-950/20 ring-1 ring-slate-200/60">
            <h2 className={`text-xl font-black text-slate-900 mb-4 font-headline flex items-center gap-3 ${isRTL ? 'justify-end' : ''}`}>
              <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-violet-700 text-sm font-black">7</span>
              {language === 'en' ? 'Data Protection' : language === 'he' ? 'הגנת נתונים' : 'حماية البيانات'}
            </h2>
            <p className={`text-slate-600 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
              {language === 'en' ? 'Your use of the Service is governed by our ' :
               language === 'he' ? 'השימוש שלך בשירות כפוף ל-' :
               'يخضع استخدامك للخدمة لـ '}
              <button onClick={() => onNavigate("privacy")} className="text-violet-600 font-bold hover:underline">
                {t.footer.privacyLink}
              </button>
              {language === 'en' ? ', which describes what data we collect, how we use it, your rights under Israeli Privacy Protection Law (Amendment 13), and how to access, correct, or delete your data.' :
               language === 'he' ? ', המתארת אילו נתונים אנו אוספים, כיצד אנו משתמשים בהם, הזכויות שלך על פי חוק הגנת הפרטיות (תיקון 13), וכיצד לגשת, לתקן או למחוק את הנתונים שלך.' :
               '، التي تصف البيانات التي نجمعها، وكيف نستخدمها، حقوقك بموجب قانون حماية الخصوصية الإسرائيلي (التعديل 13)، وكيفية الوصول إلى بياناتك أو تصحيحها أو حذفها.'}
            </p>
          </section>

          {/* Section 8: Limitation of Liability */}
          <section className="bg-white p-8 rounded-2xl shadow-2xl shadow-violet-950/20 ring-1 ring-slate-200/60">
            <h2 className={`text-xl font-black text-slate-900 mb-4 font-headline flex items-center gap-3 ${isRTL ? 'justify-end' : ''}`}>
              <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-violet-700 text-sm font-black">8</span>
              <AlertTriangle size={20} className="text-amber-500" />
              {language === 'en' ? 'Limitation of Liability' : language === 'he' ? 'הגבלת אחריות' : 'تحديد المسؤولية'}
            </h2>
            <p className={`text-slate-600 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
              {language === 'en' ? 'The Service is provided "AS IS" without warranties. We are not liable for indirect, incidental, or consequential damages. Our total liability shall not exceed any amount paid for the Service in the preceding 12 months.' :
               language === 'he' ? 'השירות מסופק "כפי שהוא" ללא אחריות. איננו אחראים לנזקים עקיפים, מקריים או תוצאתיים. סך האחריות שלנו לא יעלה על כל סכום ששולם עבור השירות ב-12 החודשים הקודמים.' :
               'يتم توفير الخدمة "كما هي" بدون ضمانات. نحن غير مسؤولين عن الأضرار غير المباشرة أو العرضية أو الناتجة. مجموع مسؤوليتنا لن يتجاوز أي مبلغ مدفوع مقابل الخدمة في الـ 12 شهرًا السابقة.'}
            </p>
          </section>

          {/* Section 9: Governing Law */}
          <section className="bg-white p-8 rounded-2xl shadow-2xl shadow-violet-950/20 ring-1 ring-slate-200/60">
            <h2 className={`text-xl font-black text-slate-900 mb-4 font-headline flex items-center gap-3 ${isRTL ? 'justify-end' : ''}`}>
              <span className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center text-violet-700 text-sm font-black">9</span>
              <Gavel size={20} className="text-primary" />
              {language === 'en' ? 'Governing Law' : language === 'he' ? 'דין חל' : 'القانون الحاكم'}
            </h2>
            <p className={`text-slate-600 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
              {language === 'en' ? 'These Terms are governed by the laws of the State of Israel, including the Privacy Protection Law 5741-1981 (Amendment 13). Disputes shall be resolved in the competent courts of Tel Aviv, Israel.' :
               language === 'he' ? 'תנאים אלה כפופים לחוקי מדינת ישראל, לרבות חוק הגנת הפרטיות התשמ"א-1981 (תיקון 13). סכסוכים יפתרו בבתי המשפט המוסמכים בתל אביב, ישראל.' :
               'تخضع هذه الشروط لقوانين دولة إسرائيل، بما في ذلك قانون حماية الخصوصية 5741-1981 (التعديل 13). يتم حل النزاعات في المحاكم المختصة في تل أبيب، إسرائيل.'}
            </p>
          </section>

          {/* Section 10: Contact */}
          <section className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 text-white shadow-2xl shadow-violet-900/30">
            <div className={isRTL ? 'text-right' : ''}>
              <h3 className="text-xl font-black font-headline mb-2 text-white">{t.footer.questions}</h3>
              <p className="text-white/90">{t.footer.contact}</p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="mailto:contact@vocaband.com"
                className="inline-flex items-center gap-2 bg-white text-violet-700 px-6 py-3 rounded-xl font-black hover:scale-105 transition-all shadow-lg"
              >
                <Mail size={18} /> contact@vocaband.com
              </a>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t-2 border-white/15 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-violet-300 hover:text-violet-200 font-bold hover:underline transition-all group"
              >
                <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
                <span>{t.footer.backButton}</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-bold rounded-full flex items-center gap-2 border border-white/20 transition-all"
            >
              <Printer size={18} /> {t.footer.print}
            </button>
          </div>
        </footer>
      </main>

      <FloatingButtons />
    </div>
  );
};

export default TermsPage;
