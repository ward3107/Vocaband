/**
 * PushOptInCard — contextual pre-prompt to turn on push notifications.
 *
 * Deliberately NOT shown on first load: it only renders once the student
 * is on their dashboard, and only when ALL of these hold:
 *   - the `push_notifications` flag is on for their class,
 *   - the browser supports Web Push + a VAPID key is configured,
 *   - permission hasn't been decided yet (`default`),
 *   - they aren't already subscribed,
 *   - they haven't dismissed this card before.
 *
 * "Yes" calls the browser permission prompt (via usePushNotifications);
 * "Not now" hides it without ever touching the permission API, so we never
 * burn the one-shot prompt against a student who isn't ready.
 */
import { useState } from "react";
import { motion } from "motion/react";
import { Bell, X } from "lucide-react";
import type { AppUser } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import { useFeatureFlag } from "../hooks/useFeatureFlags";
import { usePushNotifications } from "../hooks/usePushNotifications";

const DISMISS_KEY = "vocaband_push_optin_dismissed";

const COPY = {
  en: { title: "Get a ping when your teacher sends a task?", body: "We'll notify you about new assignments, rewards, and live challenges. No ads — turn it off anytime in Privacy Settings.", yes: "Yes, notify me", no: "Not now" },
  he: { title: "לקבל התראה כשהמורה שולח משימה?", body: "נעדכן אותך על משימות חדשות, פרסים ואתגרים חיים. בלי פרסומות — אפשר לכבות בכל רגע בהגדרות הפרטיות.", yes: "כן, עדכנו אותי", no: "לא עכשיו" },
  ar: { title: "هل تريد تنبيهًا عندما يرسل معلمك مهمة؟", body: "سننبهك بالمهام الجديدة والمكافآت والتحديات المباشرة. بدون إعلانات — يمكنك إيقافه في إعدادات الخصوصية.", yes: "نعم، أبلغني", no: "ليس الآن" },
  ru: { title: "Получать уведомление, когда учитель отправляет задание?", body: "Мы сообщим вам о новых заданиях, наградах и живых соревнованиях. Без рекламы — отключить можно в настройках конфиденциальности.", yes: "Да, уведомлять", no: "Не сейчас" },
} as const;

export default function PushOptInCard({ user }: { user: AppUser }) {
  const { language, isRTL } = useLanguage();
  const { isOn } = useFeatureFlag();
  const flagOn = isOn("push_notifications", user.classCode);
  const { state, subscribe } = usePushNotifications({ uid: user.uid, lang: language });
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });

  if (!flagOn || !state.supported || state.subscribed || state.permission !== "default" || dismissed) {
    return null;
  }

  const t = COPY[language];
  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* private mode */ }
    setDismissed(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      dir={isRTL ? "rtl" : "ltr"}
      className="relative mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 p-5 text-white shadow-lg shadow-violet-500/20"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label={t.no}
        className="absolute top-3 end-3 rounded-full bg-white/15 p-1.5"
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      >
        <X size={16} />
      </button>

      <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
          <Bell size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-extrabold leading-tight">{t.title}</h3>
          <p className="mt-1 text-sm text-white/90">{t.body}</p>
        </div>
      </div>

      <div className={`mt-4 flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          disabled={state.busy}
          onClick={() => { void subscribe(); }}
          className="flex-1 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-violet-700 disabled:opacity-60"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          {t.yes}
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={dismiss}
          className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-bold text-white"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          {t.no}
        </motion.button>
      </div>
    </motion.div>
  );
}
