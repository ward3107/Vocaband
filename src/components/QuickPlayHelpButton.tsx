import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LifeBuoy, X } from "lucide-react";
import { useLanguage, type Language } from "../hooks/useLanguage";

interface Props {
  /** Optional — when wired, the help sheet shows "🆘 Get teacher" and
   *  fires a reaction emoji to the projector. Use the existing
   *  sendReaction from useQuickPlaySocket. */
  onAlertTeacher?: () => void;
  /** Optional — when present, leaves the game and returns to the
   *  landing screen. Without it, the "Leave" option hides. */
  onLeave?: () => void;
}

interface Copy {
  open: string;
  title: string;
  subtitle: string;
  refresh: string;
  refreshDesc: string;
  teacher: string;
  teacherDesc: string;
  leave: string;
  leaveDesc: string;
  close: string;
  teacherSent: string;
}

const COPY: Record<Language, Copy> = {
  en: {
    open: "Need help?",
    title: "Need help?",
    subtitle: "Tap one of the buttons below",
    refresh: "🔄 Refresh the game",
    refreshDesc: "Reloads the page",
    teacher: "👋 Get my teacher",
    teacherDesc: "Sends a flag to the teacher's screen",
    leave: "🚪 Leave the game",
    leaveDesc: "Go back to the start",
    close: "Close",
    teacherSent: "Sent! Your teacher will see it 👍",
  },
  he: {
    open: "צריכים עזרה?",
    title: "צריכים עזרה?",
    subtitle: "לחצו על אחד הכפתורים למטה",
    refresh: "🔄 רענון המשחק",
    refreshDesc: "טוען מחדש את הדף",
    teacher: "👋 קראו למורה",
    teacherDesc: "שולח התראה למסך של המורה",
    leave: "🚪 יציאה מהמשחק",
    leaveDesc: "חזרה להתחלה",
    close: "סגירה",
    teacherSent: "נשלח! המורה יראה את ההתראה 👍",
  },
  ar: {
    open: "بحاجة إلى مساعدة؟",
    title: "بحاجة إلى مساعدة؟",
    subtitle: "اضغط على أحد الأزرار أدناه",
    refresh: "🔄 تحديث اللعبة",
    refreshDesc: "إعادة تحميل الصفحة",
    teacher: "👋 نادِ المعلم",
    teacherDesc: "يرسل إشعارًا إلى شاشة المعلم",
    leave: "🚪 الخروج من اللعبة",
    leaveDesc: "العودة إلى البداية",
    close: "إغلاق",
    teacherSent: "تم الإرسال! سيراها معلمك 👍",
  },
  ru: {
    open: "Нужна помощь?",
    title: "Нужна помощь?",
    subtitle: "Нажмите одну из кнопок ниже",
    refresh: "🔄 Обновить игру",
    refreshDesc: "Перезагружает страницу",
    teacher: "👋 Позвать учителя",
    teacherDesc: "Отправляет сигнал учителю",
    leave: "🚪 Выйти из игры",
    leaveDesc: "Вернуться к началу",
    close: "Закрыть",
    teacherSent: "Отправлено! Учитель увидит 👍",
  },
};

export default function QuickPlayHelpButton({ onAlertTeacher, onLeave }: Props) {
  const { language, dir, isRTL } = useLanguage();
  const c = COPY[language] ?? COPY.en;
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const fireConfirmation = (msg: string) => {
    setConfirmation(msg);
    setTimeout(() => setConfirmation(null), 2200);
  };

  const handleRefresh = () => {
    setOpen(false);
    // Small delay so the close animation doesn't get cut by the reload.
    setTimeout(() => window.location.reload(), 120);
  };

  const handleTeacher = () => {
    onAlertTeacher?.();
    fireConfirmation(c.teacherSent);
  };

  return (
    <>
      <motion.button
        type="button"
        aria-label={c.open}
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
        className={`fixed bottom-4 z-40 w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/40 flex items-center justify-center ${isRTL ? "left-4" : "right-4"}`}
      >
        <LifeBuoy className="w-6 h-6" strokeWidth={2.5} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              dir={dir}
              role="dialog"
              aria-modal="true"
              aria-label={c.title}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-surface rounded-2xl shadow-2xl p-5 sm:p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-on-surface">{c.title}</h2>
                  <p className="text-xs sm:text-sm text-on-surface-variant font-bold mt-1">{c.subtitle}</p>
                </div>
                <button
                  type="button"
                  aria-label={c.close}
                  onClick={() => setOpen(false)}
                  className="p-2 -mr-2 -mt-1 text-on-surface-variant hover:text-on-surface"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <HelpRow
                  label={c.refresh}
                  desc={c.refreshDesc}
                  onClick={handleRefresh}
                />
                {onAlertTeacher && (
                  <HelpRow
                    label={c.teacher}
                    desc={c.teacherDesc}
                    onClick={handleTeacher}
                  />
                )}
                {onLeave && (
                  <HelpRow
                    label={c.leave}
                    desc={c.leaveDesc}
                    onClick={() => { setOpen(false); onLeave(); }}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmation && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            role="status"
            aria-live="polite"
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 rounded-full bg-emerald-500 text-emerald-950 font-bold text-sm shadow-lg"
          >
            {confirmation}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function HelpRow({ label, desc, onClick }: { label: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
      className="w-full text-start py-3 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high active:scale-[0.98] transition-all border-2 border-surface-container-highest"
    >
      <div className="font-black text-base text-on-surface">{label}</div>
      <div className="text-xs text-on-surface-variant font-bold mt-0.5">{desc}</div>
    </button>
  );
}
