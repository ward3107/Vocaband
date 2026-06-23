/**
 * PushSettingsToggle — the durable on/off control for push notifications,
 * shown in Privacy Settings. This is the "easy opt-out" the compliance
 * package requires: one tap soft-revokes the device subscription and logs
 * a withdrawal.
 *
 * Self-hides unless the `push_notifications` flag is on for the student's
 * class and the browser supports Web Push.
 */
import type { AppUser } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import { useFeatureFlag } from "../hooks/useFeatureFlags";
import { usePushNotifications } from "../hooks/usePushNotifications";

const COPY = {
  en: { title: "Notifications", on: "On — you'll be notified about new tasks, rewards, and live challenges.", off: "Off — turn on to get notified about new tasks.", blocked: "Blocked in your browser settings. Re-enable notifications for this site to use them.", turnOn: "Turn on", turnOff: "Turn off" },
  he: { title: "התראות", on: "פעיל — תקבל התראות על משימות חדשות, פרסים ואתגרים חיים.", off: "כבוי — הפעל כדי לקבל התראות על משימות חדשות.", blocked: "חסום בהגדרות הדפדפן. אפשר התראות לאתר הזה כדי להשתמש בהן.", turnOn: "הפעל", turnOff: "כבה" },
  ar: { title: "الإشعارات", on: "مُفعّل — ستتلقى إشعارات بالمهام الجديدة والمكافآت والتحديات المباشرة.", off: "متوقف — فعّله لتلقي إشعارات بالمهام الجديدة.", blocked: "محظور في إعدادات المتصفح. اسمح بالإشعارات لهذا الموقع لاستخدامها.", turnOn: "تفعيل", turnOff: "إيقاف" },
  ru: { title: "Уведомления", on: "Включены — вы будете получать уведомления о новых заданиях, наградах и соревнованиях.", off: "Выключены — включите, чтобы получать уведомления о новых заданиях.", blocked: "Заблокировано в настройках браузера. Разрешите уведомления для этого сайта.", turnOn: "Включить", turnOff: "Выключить" },
} as const;

export default function PushSettingsToggle({ user }: { user: AppUser }) {
  const { language } = useLanguage();
  const { isOn } = useFeatureFlag();
  const flagOn = isOn("push_notifications", user.classCode);
  const { state, subscribe, unsubscribe } = usePushNotifications({ uid: user.uid, lang: language });

  if (!flagOn || !state.supported) return null;

  const t = COPY[language];
  const blocked = state.permission === "denied";
  const status = blocked ? t.blocked : state.subscribed ? t.on : t.off;

  return (
    <div
      className="bg-white rounded-2xl p-5 mb-4 border border-indigo-500/[0.10]"
      style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.7) inset, 0 18px 40px -22px rgba(60,40,120,0.20)" }}
    >
      <h2 className="text-[15px] font-extrabold tracking-[-0.005em] text-[#1F1147] mb-3 pb-2 border-b border-indigo-500/[0.10]">
        {t.title}
      </h2>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-stone-600 flex-1">{status}</p>
        {!blocked && (
          <button
            type="button"
            disabled={state.busy}
            onClick={() => { if (state.subscribed) void unsubscribe(); else void subscribe(); }}
            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-60 ${state.subscribed ? "bg-stone-400" : "signature-gradient shadow-lg"}`}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          >
            {state.subscribed ? t.turnOff : t.turnOn}
          </button>
        )}
      </div>
    </div>
  );
}
