import { useLanguage } from '../hooks/useLanguage';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

// Subtle pill at the top of the viewport when the browser reports
// the network is down.  Communicates that work is being preserved
// locally so teachers/students don't think the app has frozen on
// weak school Wi-Fi.
//
// Companion to the saveQueue (writes) + readCache (reads) layers.

const STRINGS: Record<'en' | 'he' | 'ar', string> = {
  en: 'Offline — your work is being saved locally',
  he: 'אופליין — העבודה שלך נשמרת מקומית',
  ar: 'غير متصل — يتم حفظ عملك محلياً',
};

export function OfflineIndicator() {
  const online = useOnlineStatus();
  const { language, isRTL } = useLanguage();

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      dir={isRTL ? 'rtl' : 'ltr'}
      className="pointer-events-none fixed top-2 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50/95 px-3 py-1.5 text-sm text-amber-900 shadow-sm backdrop-blur"
    >
      <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" aria-hidden="true" />
      <span>{STRINGS[language]}</span>
    </div>
  );
}
