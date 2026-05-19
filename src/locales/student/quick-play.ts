/**
 * quick-play.ts — i18n strings for the Quick Play join + resume surface.
 *
 * Covers everything the student sees on `QuickPlayStudentView` BEFORE
 * gameplay starts (header, loader, resume card, error toasts), plus a
 * few mid-session events (teacher ended, kicked, reconnecting).
 *
 * Tone is "kid speak": short, emoji-prefixed, no jargon. A 9-year-old
 * Hebrew or Arabic speaker who can't read English should still
 * understand what's wrong and what to do next.
 *
 * Pattern: see docs/I18N-MIGRATION.md. Inline ternaries elsewhere in
 * this file are being replaced by `qpT[language].key` calls one PR at
 * a time — this file is the destination for those moves.
 */
import type { Language } from "../../hooks/useLanguage";

export interface QuickPlayStrings {
  // Header
  back: string;
  reconnecting: string;

  // Loading + escape
  loadingSession: string;
  cancelAndGoBack: string;

  // Resume card — prefix is rendered with `<bdi>{name}</bdi>!` appended
  // inline so the LTR nickname doesn't bidi-flip the punctuation in
  // Hebrew/Arabic. The prefix already includes the trailing ", ".
  welcomeBackPrefix: string;
  sessionStillActive: string;
  continuePlaying: string;
  leaveQuickPlay: string;
  /** Shown on the resume card when the rejoin attempt times out. */
  resumeFailedTitle: string;
  resumeFailedBody: string;
  scanNewQr: string;

  // Toasts (kid-speak)
  toastTypeNameFirst: string;
  toastPickDifferentName: string;
  toastNameTaken: string;
  toastNameRemovedByTeacher: string;
  toastNoWordsInSession: string;
  toastSessionExpired: string;
  toastTooManyJoining: string;
  toastCantReachGame: string;
  toastGenericJoinFail: string;
  toastTeacherEnded: string;
  toastConnectionLost: string;
  toastCantJoinLeaderboard: string;
}

export const quickPlayT: Record<Language, QuickPlayStrings> = {
  en: {
    back: "Back",
    reconnecting: "Reconnecting…",
    loadingSession: "Loading Quick Play session…",
    cancelAndGoBack: "Cancel and go back",
    welcomeBackPrefix: "Welcome back, ",
    sessionStillActive: "Your Quick Play session is still active.",
    continuePlaying: "Continue Playing",
    leaveQuickPlay: "Leave Quick Play",
    resumeFailedTitle: "Couldn't reconnect",
    resumeFailedBody: "Your teacher may have ended the game. Try scanning a new QR code.",
    scanNewQr: "Scan a new QR code",
    toastTypeNameFirst: "✏️ Type your name first!",
    toastPickDifferentName: "✋ Please pick a different name.",
    toastNameTaken: "✋ That name is taken — try a different one!",
    toastNameRemovedByTeacher: "Your teacher removed this name. Try a different one.",
    toastNoWordsInSession: "🤔 This game has no words yet. Ask your teacher!",
    toastSessionExpired: "⏰ This game ended. Scan the QR code again to start over.",
    toastTooManyJoining: "🐢 Lots of kids joining at once! Wait a second and tap again.",
    toastCantReachGame: "📡 Couldn't reach the game. Check your Wi-Fi and tap to try again.",
    toastGenericJoinFail: "🤔 Couldn't join the game. Please try again.",
    toastTeacherEnded: "🎉 Your teacher ended the game. Nice playing!",
    toastConnectionLost: "📡 Can't reach the game. Refresh the page and try again.",
    toastCantJoinLeaderboard: "🤔 Couldn't join the scoreboard. Tap to try again.",
  },
  he: {
    back: "חזרה",
    reconnecting: "מתחבר מחדש…",
    loadingSession: "טוען את המשחק…",
    cancelAndGoBack: "ביטול וחזרה",
    welcomeBackPrefix: "ברוכים השבים, ",
    sessionStillActive: "המשחק שלך עדיין פעיל.",
    continuePlaying: "המשך לשחק",
    leaveQuickPlay: "יציאה מהמשחק",
    resumeFailedTitle: "לא הצלחנו להתחבר",
    resumeFailedBody: "ייתכן שהמורה סיים את המשחק. נסו לסרוק קוד QR חדש.",
    scanNewQr: "סריקת קוד QR חדש",
    toastTypeNameFirst: "✏️ קודם הקלידו את השם!",
    toastPickDifferentName: "✋ בחרו שם אחר.",
    toastNameTaken: "✋ השם הזה תפוס — נסו שם אחר!",
    toastNameRemovedByTeacher: "המורה הוריד את השם הזה. נסו שם אחר.",
    toastNoWordsInSession: "🤔 אין עדיין מילים במשחק. שאלו את המורה!",
    toastSessionExpired: "⏰ המשחק הסתיים. סרקו שוב את קוד ה-QR.",
    toastTooManyJoining: "🐢 הרבה ילדים מתחברים בבת אחת! חכו רגע ונסו שוב.",
    toastCantReachGame: "📡 אין חיבור למשחק. בדקו את ה-Wi-Fi ונסו שוב.",
    toastGenericJoinFail: "🤔 לא הצלחנו להתחבר. נסו שוב.",
    toastTeacherEnded: "🎉 המורה סיים את המשחק. כל הכבוד!",
    toastConnectionLost: "📡 אין חיבור למשחק. רעננו את הדף ונסו שוב.",
    toastCantJoinLeaderboard: "🤔 לא הצלחנו להוסיף ללוח המובילים. נסו שוב.",
  },
  ar: {
    back: "رجوع",
    reconnecting: "يتم إعادة الاتصال…",
    loadingSession: "يتم تحميل اللعب السريع…",
    cancelAndGoBack: "إلغاء والرجوع",
    welcomeBackPrefix: "مرحبًا بعودتك، ",
    sessionStillActive: "لا تزال جلسة اللعب السريع نشطة.",
    continuePlaying: "متابعة اللعب",
    leaveQuickPlay: "الخروج من اللعب السريع",
    resumeFailedTitle: "تعذّر إعادة الاتصال",
    resumeFailedBody: "ربما أنهى معلّمك اللعبة. جرّب مسح رمز QR جديد.",
    scanNewQr: "مسح رمز QR جديد",
    toastTypeNameFirst: "✏️ اكتب اسمك أولًا!",
    toastPickDifferentName: "✋ اختر اسمًا مختلفًا.",
    toastNameTaken: "✋ هذا الاسم مستخدم — جرّب اسمًا آخر!",
    toastNameRemovedByTeacher: "أزال معلّمك هذا الاسم. جرّب اسمًا آخر.",
    toastNoWordsInSession: "🤔 لا توجد كلمات في اللعبة بعد. اسأل معلّمك!",
    toastSessionExpired: "⏰ انتهت هذه اللعبة. امسح رمز QR مرة أخرى.",
    toastTooManyJoining: "🐢 الكثير من الطلاب ينضمّون الآن! انتظر لحظة وحاول مجددًا.",
    toastCantReachGame: "📡 تعذّر الوصول إلى اللعبة. تحقق من Wi-Fi وحاول مجددًا.",
    toastGenericJoinFail: "🤔 تعذّر الانضمام. حاول مرة أخرى.",
    toastTeacherEnded: "🎉 أنهى معلّمك اللعبة. أحسنت!",
    toastConnectionLost: "📡 تعذّر الوصول إلى اللعبة. حدّث الصفحة وحاول مجددًا.",
    toastCantJoinLeaderboard: "🤔 تعذّر الانضمام إلى لوحة النتائج. حاول مجددًا.",
  },
  ru: {
    back: "Назад",
    reconnecting: "Переподключение…",
    loadingSession: "Загрузка быстрой игры…",
    cancelAndGoBack: "Отменить и вернуться",
    welcomeBackPrefix: "С возвращением, ",
    sessionStillActive: "Ваша игра ещё активна.",
    continuePlaying: "Продолжить игру",
    leaveQuickPlay: "Выйти из быстрой игры",
    resumeFailedTitle: "Не удалось переподключиться",
    resumeFailedBody: "Возможно, учитель завершил игру. Попробуйте отсканировать новый QR-код.",
    scanNewQr: "Отсканировать новый QR-код",
    toastTypeNameFirst: "✏️ Сначала введи имя!",
    toastPickDifferentName: "✋ Пожалуйста, выбери другое имя.",
    toastNameTaken: "✋ Это имя занято — попробуй другое!",
    toastNameRemovedByTeacher: "Учитель убрал это имя. Попробуй другое.",
    toastNoWordsInSession: "🤔 В этой игре пока нет слов. Спроси учителя!",
    toastSessionExpired: "⏰ Эта игра завершилась. Отсканируй QR-код снова.",
    toastTooManyJoining: "🐢 Многие подключаются одновременно! Подожди секунду и попробуй ещё раз.",
    toastCantReachGame: "📡 Не удалось подключиться к игре. Проверь Wi-Fi и попробуй снова.",
    toastGenericJoinFail: "🤔 Не удалось подключиться. Попробуй ещё раз.",
    toastTeacherEnded: "🎉 Учитель завершил игру. Молодец!",
    toastConnectionLost: "📡 Нет связи с игрой. Обнови страницу и попробуй снова.",
    toastCantJoinLeaderboard: "🤔 Не удалось присоединиться к таблице. Попробуй ещё раз.",
  },
};
