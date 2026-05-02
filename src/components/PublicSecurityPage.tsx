import React from "react";
import { Shield, Lock, Globe, Server, KeyRound, FileText, ExternalLink, CheckCircle2 } from "lucide-react";
import PublicNav from "./PublicNav";
import FloatingButtons from "./FloatingButtons";
import BackButton from "./BackButton";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "../hooks/useLanguage";

interface PublicSecurityPageProps {
  onNavigate: (page: "home" | "terms" | "privacy" | "security") => void;
  onGetStarted: () => void;
  onBack?: () => void;
}

// Inline translations — the security page is small (one-time read for
// IT / parents) so it doesn't need its own file in legalTranslations.
// EN/HE/AR mirror the same shape: title, intro, 5 sections, footer.
const t = {
  en: {
    title: "Security",
    titleHighlight: "& Trust",
    badge: "Independently verified",
    intro: "How we protect your students' data, written in plain English. For the full technical detail, see our open-source security docs in the codebase.",
    sslLabsBadge: "SSL Labs A+",
    sslLabsLink: "View live report",
    encrypted: "Encrypted with TLS 1.3",
    eu: "Data hosted in the EU (Frankfurt)",
    sections: {
      transit: {
        title: "Encrypted in transit",
        body: "Every connection between your device and Vocaband uses TLS 1.2 or TLS 1.3 — the same encryption banks use. Older insecure versions (TLS 1.0, TLS 1.1) are blocked. Verified A+ by SSL Labs (a public industry standard).",
      },
      rest: {
        title: "Encrypted at rest",
        body: "Your data lives on Supabase's PostgreSQL servers in the EU (Frankfurt region). Disks are encrypted at the storage layer; backups are encrypted automatically.",
      },
      access: {
        title: "Strict access rules",
        body: "Every database table has Row-Level Security policies — students can only read their own progress, teachers can only read their own classes, no cross-account access is possible. Verified by automated tests + manual penetration tests.",
      },
      auth: {
        title: "Secure sign-in",
        body: "Teachers sign in with Google OAuth — Vocaband never sees or stores teacher passwords. Students join classes via a 6-character code; their accounts are scoped to that class only.",
      },
      audit: {
        title: "Regular audits",
        body: "We run a full security review every quarter: dependency vulnerabilities, RLS policy drift, TLS configuration, and penetration tests. Our most recent audit (April 2026) closed 3 HIGH + 3 MED findings, plus a CodeQL alert; SSL Labs grade improved from B to A+.",
      },
    },
    contact: {
      title: "Found a vulnerability?",
      body: "We welcome responsible disclosure. Email",
      cta: "View security.txt",
    },
    bottomLinks: {
      privacy: "Privacy Policy",
      terms: "Terms of Service",
    },
  },
  he: {
    title: "אבטחה",
    titleHighlight: "ואמון",
    badge: "מאומת באופן עצמאי",
    intro: "כיצד אנו מגנים על נתוני התלמידים שלכם, בשפה פשוטה. לפרטים טכניים מלאים, ראו את מסמכי האבטחה במאגר הקוד הפתוח שלנו.",
    sslLabsBadge: "SSL Labs A+",
    sslLabsLink: "צפה בדוח חי",
    encrypted: "מוצפן עם TLS 1.3",
    eu: "הנתונים מאוחסנים באיחוד האירופי (פרנקפורט)",
    sections: {
      transit: {
        title: "מוצפן במהלך התעבורה",
        body: "כל חיבור בין המכשיר שלכם ל-Vocaband משתמש ב-TLS 1.2 או TLS 1.3 — אותה הצפנה שבנקים משתמשים בה. גרסאות ישנות ולא מאובטחות (TLS 1.0, TLS 1.1) חסומות. מאומת A+ על ידי SSL Labs (תקן תעשייה ציבורי).",
      },
      rest: {
        title: "מוצפן במנוחה",
        body: "הנתונים שלכם נמצאים על שרתי PostgreSQL של Supabase באיחוד האירופי (אזור פרנקפורט). הדיסקים מוצפנים ברמת האחסון; גיבויים מוצפנים אוטומטית.",
      },
      access: {
        title: "כללי גישה קפדניים",
        body: "לכל טבלה במסד הנתונים יש מדיניות Row-Level Security — תלמידים יכולים לקרוא רק את ההתקדמות שלהם, מורים יכולים לקרוא רק את הכיתות שלהם, ואין אפשרות לגישה בין חשבונות. מאומת על ידי בדיקות אוטומטיות + בדיקות חדירה ידניות.",
      },
      auth: {
        title: "כניסה מאובטחת",
        body: "מורים נכנסים עם Google OAuth — Vocaband לעולם לא רואה או שומרת סיסמאות של מורים. תלמידים מצטרפים לכיתות באמצעות קוד בן 6 תווים; החשבונות שלהם מוגבלים לכיתה זו בלבד.",
      },
      audit: {
        title: "ביקורות סדירות",
        body: "אנו עורכים סקירת אבטחה מלאה כל רבעון: פגיעויות תלויות, סחיפת מדיניות RLS, תצורת TLS, ובדיקות חדירה. הביקורת האחרונה שלנו (אפריל 2026) סגרה 3 ממצאים בחומרה גבוהה ועוד 3 בחומרה בינונית, וכן התראת CodeQL; דירוג SSL Labs עלה מ-B ל-A+.",
      },
    },
    contact: {
      title: "מצאתם פגיעות?",
      body: "אנו מקדמים בברכה גילוי אחראי. אימייל",
      cta: "צפה ב-security.txt",
    },
    bottomLinks: {
      privacy: "מדיניות פרטיות",
      terms: "תנאי שימוש",
    },
  },
  ar: {
    title: "الأمان",
    titleHighlight: "والثقة",
    badge: "تم التحقق منه بشكل مستقل",
    intro: "كيف نحمي بيانات طلابكم، بلغة بسيطة. للحصول على التفاصيل التقنية الكاملة، راجعوا مستندات الأمان مفتوحة المصدر في قاعدة الكود الخاصة بنا.",
    sslLabsBadge: "SSL Labs A+",
    sslLabsLink: "عرض التقرير المباشر",
    encrypted: "مشفر بـ TLS 1.3",
    eu: "البيانات مستضافة في الاتحاد الأوروبي (فرانكفورت)",
    sections: {
      transit: {
        title: "مشفر أثناء النقل",
        body: "كل اتصال بين جهازك و-Vocaband يستخدم TLS 1.2 أو TLS 1.3 — نفس التشفير الذي تستخدمه البنوك. الإصدارات القديمة غير الآمنة (TLS 1.0، TLS 1.1) محظورة. تم التحقق منها بدرجة A+ من قبل SSL Labs (معيار صناعي عام).",
      },
      rest: {
        title: "مشفر في حالة السكون",
        body: "بياناتكم تعيش على خوادم PostgreSQL الخاصة بـ Supabase في الاتحاد الأوروبي (منطقة فرانكفورت). الأقراص مشفرة على طبقة التخزين؛ النسخ الاحتياطية مشفرة تلقائيًا.",
      },
      access: {
        title: "قواعد وصول صارمة",
        body: "لكل جدول في قاعدة البيانات سياسات أمان على مستوى الصف — الطلاب يمكنهم قراءة تقدمهم فقط، المعلمون يمكنهم قراءة فصولهم فقط، لا يمكن الوصول عبر الحسابات. تم التحقق منه بواسطة اختبارات آلية + اختبارات اختراق يدوية.",
      },
      auth: {
        title: "تسجيل دخول آمن",
        body: "المعلمون يسجلون الدخول باستخدام Google OAuth — Vocaband لا ترى أو تخزن كلمات مرور المعلمين أبدًا. الطلاب ينضمون إلى الفصول عبر رمز مكون من 6 أحرف؛ حساباتهم محصورة في ذلك الفصل فقط.",
      },
      audit: {
        title: "عمليات تدقيق منتظمة",
        body: "نقوم بمراجعة أمنية كاملة كل ربع سنة: ثغرات التبعيات، انحراف سياسة RLS، تكوين TLS، واختبارات الاختراق. أغلق آخر تدقيق لنا (أبريل 2026) 3 نتائج عالية الخطورة و 3 متوسطة الخطورة، بالإضافة إلى تنبيه CodeQL؛ ارتفعت درجة SSL Labs من B إلى A+.",
      },
    },
    contact: {
      title: "هل وجدت ثغرة أمنية؟",
      body: "نرحب بالإفصاح المسؤول. البريد الإلكتروني",
      cta: "عرض security.txt",
    },
    bottomLinks: {
      privacy: "سياسة الخصوصية",
      terms: "شروط الخدمة",
    },
  },
} as const;

const PublicSecurityPage: React.FC<PublicSecurityPageProps> = ({
  onNavigate,
  onGetStarted,
  onBack,
}) => {
  const { language, dir } = useLanguage();
  const tt = t[language];

  const sections: Array<{ key: keyof typeof t.en.sections; icon: React.ReactNode; gradient: string }> = [
    { key: "transit", icon: <Lock size={20} />,        gradient: "from-emerald-500 to-teal-600" },
    { key: "rest",    icon: <Server size={20} />,      gradient: "from-blue-500 to-indigo-600" },
    { key: "access",  icon: <Shield size={20} />,      gradient: "from-violet-500 to-fuchsia-600" },
    { key: "auth",    icon: <KeyRound size={20} />,    gradient: "from-amber-500 to-orange-600" },
    { key: "audit",   icon: <FileText size={20} />,    gradient: "from-rose-500 to-pink-600" },
  ];

  return (
    <div className="min-h-screen bg-surface" dir={dir}>
      <PublicNav
        currentPage="privacy"
        onNavigate={(p) => onNavigate(p as "home" | "terms" | "privacy")}
        onGetStarted={onGetStarted}
      />

      <main className="max-w-4xl mx-auto px-6 pt-32 pb-24 mb-20 md:mb-0">
        {/* Back + language */}
        <div className="flex items-center gap-4 mb-6">
          {onBack && <BackButton onClick={onBack} />}
          <LanguageSwitcher />
        </div>

        {/* Header */}
        <section className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tight mb-4 font-headline">
            {tt.title} <span className="text-primary italic">{tt.titleHighlight}</span>
          </h1>
          <p className="text-lg text-on-surface-variant max-w-2xl mb-6">
            {tt.intro}
          </p>

          {/* Trust badges row */}
          <div className="flex flex-wrap gap-3">
            <a
              href="https://www.ssllabs.com/ssltest/analyze.html?d=vocaband.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold text-sm transition-colors"
            >
              <CheckCircle2 size={16} />
              <span>{tt.sslLabsBadge}</span>
              <ExternalLink size={12} className="opacity-60" />
            </a>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30 font-bold text-sm">
              <Lock size={16} />
              {tt.encrypted}
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/30 font-bold text-sm">
              <Globe size={16} />
              {tt.eu}
            </span>
          </div>
        </section>

        {/* 5 cards, one per section */}
        <div className="space-y-4">
          {sections.map(({ key, icon, gradient }) => (
            <section
              key={key}
              className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant"
            >
              <h2 className="text-lg font-black text-on-surface mb-2 flex items-center gap-3">
                <span className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shrink-0`}>
                  {icon}
                </span>
                {tt.sections[key].title}
              </h2>
              <p className="text-on-surface-variant leading-relaxed pl-12">
                {tt.sections[key].body}
              </p>
            </section>
          ))}
        </div>

        {/* Vulnerability disclosure — uses the indigo→violet hero
            gradient that anchors the rest of the app's "premium / trust"
            surfaces (same family as PublicPrivacyPage.tsx:62 + the
            shop's hero cards). Keeps a single visual language across
            the legal/info pages instead of an isolated stone-grey card. */}
        <section className="mt-10 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white p-8 rounded-2xl shadow-lg shadow-violet-500/20">
          <h3 className="text-2xl font-black mb-3">{tt.contact.title}</h3>
          <p className="text-white/85 mb-4">
            {tt.contact.body}{" "}
            <a href="mailto:contact@vocaband.com" className="underline font-bold text-white">
              contact@vocaband.com
            </a>
          </p>
          <a
            href="/.well-known/security.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-stone-900 font-black text-sm hover:bg-stone-100 transition-colors"
          >
            <FileText size={16} />
            {tt.contact.cta}
          </a>
        </section>

        {/* Bottom cross-links */}
        <nav className="mt-10 flex flex-wrap justify-center gap-3 text-sm" aria-label="Related pages">
          <button
            type="button"
            onClick={() => onNavigate("privacy")}
            className="px-4 py-2 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-bold transition-colors"
          >
            {tt.bottomLinks.privacy}
          </button>
          <button
            type="button"
            onClick={() => onNavigate("terms")}
            className="px-4 py-2 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-bold transition-colors"
          >
            {tt.bottomLinks.terms}
          </button>
        </nav>
      </main>

      <FloatingButtons />
    </div>
  );
};

export default PublicSecurityPage;
