import { Check } from 'lucide-react';
import { useLanguage, type Language } from '../../hooks/useLanguage';
import { useOfflineReady } from '../../hooks/useOfflineReady';

// Small green pill that appears next to a header when the app is wired
// for offline use (service worker controlling the page).  Counterpart to
// OfflineIndicator, which only surfaces during an outage — this one is
// the proactive "you're safe if Wi-Fi drops" signal kids and teachers
// see while everything is still fine.
//
// Renders nothing until the SW takes control, so on first visit it stays
// hidden instead of showing a misleading badge.

const STRINGS: Record<Language, string> = {
  en: 'Works offline',
  he: 'עובד גם בלי חיבור',
  ar: 'يعمل دون اتصال',
  ru: 'Works offline',
};

export default function OfflineReadyBadge() {
  const ready = useOfflineReady();
  const { language } = useLanguage();
  if (!ready) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700"
      aria-label={STRINGS[language]}
    >
      <Check size={12} aria-hidden="true" />
      {STRINGS[language]}
    </span>
  );
}
