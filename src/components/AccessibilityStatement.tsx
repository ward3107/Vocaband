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
  onBack: () => void;
}

export default function AccessibilityStatement({ onNavigate, onGetStarted, onBack }: Props) {
  const { language, isRTL } = useLanguage();
  const t = accessibilityTranslations[language];

  // Section uses the Material Design surface tokens so it auto-themes
  // with the rest of the app (matches PublicPrivacyPage's
  // bg-surface-container-lowest cards) instead of the hardcoded
  // bg-white that was visually inconsistent on the surface palette.
  const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <section className="bg-surface-container-lowest rounded-2xl p-5 sm:p-6 shadow-sm border border-surface-container-high">
      <h2 className="text-lg font-black text-on-surface mb-3 flex items-center gap-2">{icon} {title}</h2>
      {children}
    </section>
  );

  const List = ({ items }: { items: string[] }) => (
    <ul className={`list-disc space-y-1.5 text-on-surface-variant text-sm leading-relaxed ${isRTL ? 'pr-5' : 'pl-5'}`}>
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );

  return (
    <div className="min-h-screen bg-surface font-body" dir={isRTL ? 'rtl' : 'ltr'}>
      <PublicNav currentPage="home" onNavigate={onNavigate} onGetStarted={onGetStarted} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-24">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="flex items-center gap-2 text-primary font-bold hover:underline">
            <ArrowLeft size={18} className={isRTL ? 'rotate-180' : ''} /> {t.back}
          </button>
          <div className="flex-1" />
          <LanguageSwitcher />
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-on-surface mb-1">{t.title}</h1>
        <p className="text-on-surface-variant text-sm mb-8">{t.lastUpdated}</p>

        <div className="space-y-5">
          {/* Commitment */}
          <Section icon={<Shield size={20} className="text-primary" />} title={t.commitment.title}>
            <p className="text-on-surface-variant text-sm leading-relaxed">{t.commitment.text}</p>
          </Section>

          {/* Features */}
          <Section icon={<CheckCircle2 size={20} className="text-emerald-600" />} title={t.features.title}>
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-on-surface mb-1">{t.features.toolbar.title}</h3>
                <p className="text-on-surface-variant text-sm mb-2">{t.features.toolbar.intro}</p>
                <List items={t.features.toolbar.items} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-on-surface mb-1 flex items-center gap-1.5"><Keyboard size={14} /> {t.features.keyboard.title}</h3>
                <List items={t.features.keyboard.items} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-on-surface mb-1 flex items-center gap-1.5"><Eye size={14} /> {t.features.screenReader.title}</h3>
                <List items={t.features.screenReader.items} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-on-surface mb-1 flex items-center gap-1.5"><Globe size={14} /> {t.features.rtl.title}</h3>
                <List items={t.features.rtl.items} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-on-surface mb-1 flex items-center gap-1.5"><Palette size={14} /> {t.features.visual.title}</h3>
                <List items={t.features.visual.items} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-on-surface mb-1 flex items-center gap-1.5"><Volume2 size={14} /> {t.features.audio.title}</h3>
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
          <Section icon={<CheckCircle2 size={20} className="text-purple-600" />} title={t.testing.title}>
            <p className="text-on-surface-variant text-sm mb-2">{t.testing.intro}</p>
            <List items={t.testing.items} />
          </Section>

          {/* Contact */}
          <Section icon={<Mail size={20} className="text-primary" />} title={t.contact.title}>
            <p className="text-on-surface-variant text-sm mb-2">{t.contact.intro}</p>
            <p className="text-sm font-bold text-on-surface">{t.contact.email}</p>
            <p className="text-on-surface-variant text-sm mt-2">{t.contact.response}</p>
          </Section>
        </div>
      </main>

      <FloatingButtons showBackToTop={true} />
    </div>
  );
}
