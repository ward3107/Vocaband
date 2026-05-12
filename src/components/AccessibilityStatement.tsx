import React from 'react';
import { ArrowLeft, Shield, Keyboard, Eye, Globe, Palette, Volume2, AlertTriangle, CheckCircle2, Mail } from 'lucide-react';
import PublicNav from './PublicNav';
import LanguageSwitcher from './LanguageSwitcher';
import FloatingButtons from './FloatingButtons';
import { useLanguage } from '../hooks/useLanguage';
import { accessibilityTranslations } from '../config/translations/legalTranslations';

interface Props {
  onNavigate: (page: "home" | "terms" | "privacy") => void;
  onGetStarted: () => void;
  /** Teacher signup — drives PublicNav's "Start free" CTA. */
  onTeacherLogin?: () => void;
  onBack: () => void;
}

export default function AccessibilityStatement({ onNavigate, onGetStarted, onTeacherLogin, onBack }: Props) {
  const { language, isRTL } = useLanguage();
  const t = accessibilityTranslations[language];

  // Light readable cards on a dark gradient page bg (Option A theme).
  const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <section className="bg-white rounded-2xl p-5 sm:p-6 shadow-2xl shadow-violet-950/20 ring-1 ring-slate-200/60">
      <h2 className="text-lg font-black text-slate-900 mb-3 flex items-center gap-2">{icon} {title}</h2>
      {children}
    </section>
  );

  const List = ({ items }: { items: string[] }) => (
    <ul className={`list-disc space-y-1.5 text-slate-600 text-sm leading-relaxed ${isRTL ? 'pr-5' : 'pl-5'}`}>
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 font-body" dir={isRTL ? 'rtl' : 'ltr'}>
      <PublicNav currentPage="accessibility" onNavigate={onNavigate} onGetStarted={onGetStarted} onTeacherLogin={onTeacherLogin} />

      <main id="main-content" className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-24">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="flex items-center gap-2 text-violet-300 hover:text-violet-200 font-bold hover:underline">
            <ArrowLeft size={18} className={isRTL ? 'rotate-180' : ''} /> {t.back}
          </button>
          <div className="flex-1" />
          <LanguageSwitcher />
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white mb-1 drop-shadow-lg">{t.title}</h1>
        <p className="text-white/70 text-sm">{t.lastUpdated}</p>

        {/* Top metadata strip — WCAG conformance level + last audit
            date + designated coordinator.  Required by IS 5568 / Israeli
            Equal Rights for People with Disabilities Act (2013 amend.). */}
        <div className="mt-3 mb-8 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-400/30 font-bold">
            <CheckCircle2 size={12} />
            {language === 'en' ? 'WCAG 2.1 Level AA' : language === 'he' ? 'WCAG 2.1 רמה AA' : 'WCAG 2.1 المستوى AA'}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/15 text-violet-200 border border-violet-400/30 font-bold">
            <Shield size={12} />
            {language === 'en' ? 'IS 5568 (Israel)' : language === 'he' ? 'תקן ישראלי 5568' : 'المعيار الإسرائيلي 5568'}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 text-sky-200 border border-sky-400/30 font-bold">
            {language === 'en' ? 'Last audit: 2026-05-08' : language === 'he' ? 'ביקורת אחרונה: 08/05/2026' : 'آخر تدقيق: 2026-05-08'}
          </span>
        </div>

        <div className="space-y-5">
          {/* Commitment */}
          <Section icon={<Shield size={20} className="text-violet-600" />} title={t.commitment.title}>
            <p className="text-slate-600 text-sm leading-relaxed">{t.commitment.text}</p>
            <p className="mt-3 text-sm text-slate-700 font-semibold leading-relaxed">
              {language === 'en'
                ? 'Vocaband conforms to WCAG 2.1 Level AA and Israeli Standard 5568, except where noted in the Limitations section.'
                : language === 'he'
                ? 'Vocaband עומדת בדרישות WCAG 2.1 רמה AA ובתקן הישראלי 5568, למעט במקומות המצוינים בסעיף המגבלות.'
                : 'تتوافق Vocaband مع WCAG 2.1 المستوى AA والمعيار الإسرائيلي 5568، باستثناء ما هو مذكور في قسم القيود.'}
            </p>
          </Section>

          {/* Features */}
          <Section icon={<CheckCircle2 size={20} className="text-emerald-600" />} title={t.features.title}>
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">{t.features.toolbar.title}</h3>
                <p className="text-slate-600 text-sm mb-2">{t.features.toolbar.intro}</p>
                <List items={t.features.toolbar.items} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5"><Keyboard size={14} /> {t.features.keyboard.title}</h3>
                <List items={t.features.keyboard.items} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5"><Eye size={14} /> {t.features.screenReader.title}</h3>
                <List items={t.features.screenReader.items} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5"><Globe size={14} /> {t.features.rtl.title}</h3>
                <List items={t.features.rtl.items} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5"><Palette size={14} /> {t.features.visual.title}</h3>
                <List items={t.features.visual.items} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5"><Volume2 size={14} /> {t.features.audio.title}</h3>
                <List items={t.features.audio.items} />
              </div>
            </div>
          </Section>

          {/* Standards */}
          <Section icon={<Shield size={20} className="text-blue-600" />} title={t.standards.title}>
            <List items={t.standards.items} />
          </Section>

          {/* Limitations */}
          <Section icon={<AlertTriangle size={20} className="text-amber-600" />} title={t.limitations.title}>
            <List items={t.limitations.items} />
          </Section>

          {/* Testing */}
          <Section icon={<CheckCircle2 size={20} className="text-violet-600" />} title={t.testing.title}>
            <p className="text-slate-600 text-sm mb-2">{t.testing.intro}</p>
            <List items={t.testing.items} />
            <p className="mt-4 text-xs text-slate-500 italic">
              {language === 'en'
                ? 'Last accessibility audit: 2026-05-08.'
                : language === 'he'
                ? 'ביקורת נגישות אחרונה: 08 במאי 2026.'
                : 'آخر تدقيق لإمكانية الوصول: 8 مايو 2026.'}
            </p>
          </Section>

          {/* Accessibility Coordinator — required by Israeli Equal
              Rights for People with Disabilities Act (1998, 2013 amend.). */}
          <Section
            icon={<Shield size={20} className="text-violet-600" />}
            title={
              language === 'en'
                ? 'Accessibility Coordinator'
                : language === 'he'
                ? 'רכז נגישות'
                : 'منسق إمكانية الوصول'
            }
          >
            <p className="text-slate-600 text-sm leading-relaxed mb-3">
              {language === 'en'
                ? 'Under Israeli law, we have designated an accessibility coordinator to receive feedback, complaints, and requests for accommodations:'
                : language === 'he'
                ? 'על פי החוק הישראלי, מינינו רכז נגישות לקבלת משוב, תלונות ובקשות להתאמות:'
                : 'بموجب القانون الإسرائيلي، لقد عيّنّا منسقًا لإمكانية الوصول لتلقي الملاحظات والشكاوى وطلبات التسهيلات:'}
            </p>
            <ul className="space-y-1.5 text-sm text-slate-700">
              <li>
                <strong>{language === 'en' ? 'Name:' : language === 'he' ? 'שם:' : 'الاسم:'}</strong>{' '}
                Waseem
              </li>
              <li>
                <strong>{language === 'en' ? 'Role:' : language === 'he' ? 'תפקיד:' : 'الدور:'}</strong>{' '}
                {language === 'en'
                  ? 'Accessibility Coordinator'
                  : language === 'he'
                  ? 'רכז נגישות'
                  : 'منسق إمكانية الوصول'}
              </li>
              <li>
                <strong>{language === 'en' ? 'Email:' : language === 'he' ? 'אימייל:' : 'البريد الإلكتروني:'}</strong>{' '}
                <a href="mailto:contact@vocaband.com" className="text-violet-600 hover:underline">
                  contact@vocaband.com
                </a>
              </li>
              <li>
                <strong>{language === 'en' ? 'Response time:' : language === 'he' ? 'זמן תגובה:' : 'وقت الاستجابة:'}</strong>{' '}
                {language === 'en'
                  ? 'We aim to respond within 5 business days.'
                  : language === 'he'
                  ? 'אנו שואפים להגיב תוך 5 ימי עסקים.'
                  : 'نسعى للرد خلال 5 أيام عمل.'}
              </li>
            </ul>
          </Section>

          {/* Contact */}
          <Section icon={<Mail size={20} className="text-violet-600" />} title={t.contact.title}>
            <p className="text-slate-600 text-sm mb-2">{t.contact.intro}</p>
            <p className="text-sm font-bold text-slate-900">{t.contact.email}</p>
            <p className="text-slate-600 text-sm mt-2">{t.contact.response}</p>
          </Section>
        </div>
      </main>

      <FloatingButtons showBackToTop={true} />
    </div>
  );
}
