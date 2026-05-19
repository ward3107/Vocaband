import { motion } from "motion/react";
import { useLanguage, type Language } from "../hooks/useLanguage";

export type QuickPlayErrorKind =
  | "session-ended"      // Teacher closed the session (or it expired server-side)
  | "session-not-found"  // QR points to a session that never existed / was wiped
  | "kicked"             // Teacher removed this student
  | "connection-lost"    // Socket failed to reach the backend at all
  | "generic";           // Fallback

interface Props {
  kind: QuickPlayErrorKind;
  /** Primary action: usually "scan another QR" / "back to landing". */
  onPrimary: () => void;
  /** Optional secondary action: "Try again" — fires a fresh join attempt. */
  onRetry?: () => void;
}

interface Copy {
  emoji: string;
  title: string;
  body: string;
  primary: string;
  retry: string;
}

const COPY: Record<QuickPlayErrorKind, Record<Language, Copy>> = {
  "session-ended": {
    en: { emoji: "🎮", title: "This game already ended", body: "Your teacher closed this Quick Play. Ask them for a new code or scan a new QR.", primary: "Back to home", retry: "Try again" },
    he: { emoji: "🎮", title: "המשחק הזה כבר הסתיים", body: "המורה סגר את המשחק. בקשו ממנו קוד חדש או סרקו QR חדש.", primary: "חזרה לדף הבית", retry: "ניסיון נוסף" },
    ar: { emoji: "🎮", title: "انتهت هذه اللعبة بالفعل", body: "أغلق معلمك هذه اللعبة. اطلب رمزًا جديدًا أو امسح رمز QR جديدًا.", primary: "العودة إلى الصفحة الرئيسية", retry: "حاول مرة أخرى" },
    ru: { emoji: "🎮", title: "Игра уже окончена", body: "Учитель закрыл эту игру. Попросите новый код или отсканируйте новый QR.", primary: "На главную", retry: "Повторить" },
  },
  "session-not-found": {
    en: { emoji: "❓", title: "We can't find this game", body: "The QR code might be old, or the teacher hasn't started a new game yet.", primary: "Back to home", retry: "Try again" },
    he: { emoji: "❓", title: "לא מצאנו את המשחק הזה", body: "ייתכן שה־QR ישן, או שהמורה עוד לא פתח משחק חדש.", primary: "חזרה לדף הבית", retry: "ניסיון נוסף" },
    ar: { emoji: "❓", title: "لم نتمكن من العثور على هذه اللعبة", body: "قد يكون رمز QR قديمًا، أو لم يبدأ المعلم لعبة جديدة بعد.", primary: "العودة إلى الصفحة الرئيسية", retry: "حاول مرة أخرى" },
    ru: { emoji: "❓", title: "Игра не найдена", body: "QR-код может быть старым, или учитель ещё не начал новую игру.", primary: "На главную", retry: "Повторить" },
  },
  "kicked": {
    en: { emoji: "🚪", title: "Your teacher removed you", body: "Don't worry — ask your teacher and they can let you back in.", primary: "Back to home", retry: "Try again" },
    he: { emoji: "🚪", title: "המורה הסיר אותך מהמשחק", body: "אל תדאגו — בקשו מהמורה והוא יוכל להחזיר אתכם.", primary: "חזרה לדף הבית", retry: "ניסיון נוסף" },
    ar: { emoji: "🚪", title: "أزالك معلمك من اللعبة", body: "لا تقلق — اطلب من معلمك وسيتمكن من إعادتك.", primary: "العودة إلى الصفحة الرئيسية", retry: "حاول مرة أخرى" },
    ru: { emoji: "🚪", title: "Учитель удалил вас", body: "Не волнуйтесь — попросите учителя, и он вас вернёт.", primary: "На главную", retry: "Повторить" },
  },
  "connection-lost": {
    en: { emoji: "📡", title: "The internet went away", body: "Check your Wi-Fi and try again. Your name will be remembered.", primary: "Back to home", retry: "Try again" },
    he: { emoji: "📡", title: "האינטרנט נעלם", body: "בדקו את ה־Wi-Fi ונסו שוב. השם שלכם יישמר.", primary: "חזרה לדף הבית", retry: "ניסיון נוסף" },
    ar: { emoji: "📡", title: "انقطع الإنترنت", body: "تحقق من Wi-Fi وحاول مرة أخرى. سيتم حفظ اسمك.", primary: "العودة إلى الصفحة الرئيسية", retry: "حاول مرة أخرى" },
    ru: { emoji: "📡", title: "Интернет пропал", body: "Проверьте Wi-Fi и попробуйте снова. Ваше имя сохранится.", primary: "На главную", retry: "Повторить" },
  },
  "generic": {
    en: { emoji: "🤔", title: "Something went wrong", body: "Try again, or ask your teacher for help.", primary: "Back to home", retry: "Try again" },
    he: { emoji: "🤔", title: "משהו השתבש", body: "נסו שוב, או בקשו עזרה מהמורה.", primary: "חזרה לדף הבית", retry: "ניסיון נוסף" },
    ar: { emoji: "🤔", title: "حدث خطأ ما", body: "حاول مرة أخرى، أو اطلب المساعدة من معلمك.", primary: "العودة إلى الصفحة الرئيسية", retry: "حاول مرة أخرى" },
    ru: { emoji: "🤔", title: "Что-то пошло не так", body: "Попробуйте снова или обратитесь к учителю.", primary: "На главную", retry: "Повторить" },
  },
};

export default function QuickPlayErrorScreen({ kind, onPrimary, onRetry }: Props) {
  const { language, dir } = useLanguage();
  const c = COPY[kind][language] ?? COPY[kind].en;

  return (
    <div
      dir={dir}
      role="alert"
      className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-10 text-center"
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 18 }}
        className="text-7xl sm:text-8xl mb-5 select-none"
        aria-hidden
      >
        {c.emoji}
      </motion.div>
      <h1 className="text-2xl sm:text-3xl font-black text-on-surface mb-3 max-w-md">
        {c.title}
      </h1>
      <p className="text-sm sm:text-base text-on-surface-variant font-bold max-w-sm mb-8">
        {c.body}
      </p>

      <div className="w-full max-w-xs space-y-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
            className="w-full py-3 sm:py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-black text-base sm:text-lg shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
          >
            🔄 {c.retry}
          </button>
        )}
        <button
          type="button"
          onClick={onPrimary}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
          className={
            onRetry
              ? "w-full py-3 bg-surface-container hover:bg-surface-container-high rounded-xl font-bold text-base text-on-surface active:scale-[0.98] transition-all border-2 border-surface-container-highest"
              : "w-full py-3 sm:py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-black text-base sm:text-lg shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
          }
        >
          {c.primary}
        </button>
      </div>
    </div>
  );
}
