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

  // Language-picker step (shown before gameplay starts).
  pickLanguage: string;
  pickLanguageSubtitle: string;

  // Loading + escape
  loadingSession: string;
  cancelAndGoBack: string;

  // Join form (single screen: avatar + name + language)
  headline: string;
  subheadWords: (count: number) => string;
  yourNameLabel: string;
  namePlaceholder: string;
  /** "You already joined as " — `<strong><bdi>{name}</bdi></strong>` is
   *  appended inline so the LTR nickname stays bidi-isolated in HE/AR. */
  alreadyJoinedAsPrefix: string;
  joining: string;
  startPlaying: string;
  guestModeNote: string;

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
  /** QR-scan bootstrap failed mid-load (timeout / chunk fetch / auth
   *  hiccup) — distinct from "expired" because re-scanning usually fixes it. */
  toastCantLoadGame: string;
  toastGenericJoinFail: string;
  toastTeacherEnded: string;
  toastConnectionLost: string;
  toastCantJoinLeaderboard: string;

  // QuickPlayKickedScreen
  kickedTitle: string;
  kickedBody: string;
  /** Appended (with a leading space) only when a rejoin path exists. */
  kickedRejoinHint: string;
  rejoinDifferentName: string;
  backToHomePage: string;

  // QuickPlaySessionEndScreen
  sessionComplete: string;
  /** Builds the celebratory headline incl. the localized rank ordinal
   *  (English "1st/2nd/3rd", HE/AR "place N"). */
  youFinishedRank: (rank: number) => string;
  /** "Great job, " — the LTR-isolated name + "!" is appended inline. */
  greatJobPrefix: string;
  rankOfTotal: (rank: number, total: number) => string;
  yourFinalScore: string;
  points: string;
  topOfClass: string;
  /** "(you)" marker next to the current player on the mini podium. */
  youMarker: string;
  signUpToSave: string;
}

export const quickPlayT: Record<Language, QuickPlayStrings> = {
  en: {
    back: "Back",
    reconnecting: "Reconnecting…",
    pickLanguage: "Pick a language",
    pickLanguageSubtitle: "Buttons + mode names will be in this language",
    loadingSession: "Loading Quick Play session…",
    cancelAndGoBack: "Cancel and go back",
    headline: "Quick Play!",
    subheadWords: (count) => `${count} words • No login needed`,
    yourNameLabel: "YOUR NAME",
    namePlaceholder: "Enter your nickname...",
    alreadyJoinedAsPrefix: "You already joined as ",
    joining: "Joining…",
    startPlaying: "Start playing",
    guestModeNote: "ℹ️ Your progress won't be saved (guest mode). Create an account to track your XP and unlock features!",
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
    toastCantLoadGame: "🤔 Couldn't load the game. Scan the QR code again.",
    toastGenericJoinFail: "🤔 Couldn't join the game. Please try again.",
    toastTeacherEnded: "🎉 Your teacher ended the game. Nice playing!",
    toastConnectionLost: "📡 Can't reach the game. Refresh the page and try again.",
    toastCantJoinLeaderboard: "🤔 Couldn't join the scoreboard. Tap to try again.",
    kickedTitle: "You've been removed",
    kickedBody: "Your teacher removed you from this Quick Play session.",
    kickedRejoinHint: " If this was a mistake, you can rejoin with a different name.",
    rejoinDifferentName: "Rejoin with a different name",
    backToHomePage: "Back to Home Page",
    sessionComplete: "Session Complete!",
    youFinishedRank: (rank) => `You finished ${rank === 1 ? "1st" : rank === 2 ? "2nd" : rank === 3 ? "3rd" : `${rank}th`}!`,
    greatJobPrefix: "Great job, ",
    rankOfTotal: (rank, total) => `Rank ${rank} of ${total}`,
    yourFinalScore: "Your Final Score",
    points: "points",
    topOfClass: "Top of the class",
    youMarker: "(you)",
    signUpToSave: "Sign up to save your progress, earn XP, and climb the leaderboard!",
  },
  he: {
    back: "חזרה",
    reconnecting: "מתחבר מחדש…",
    pickLanguage: "בחרו שפה",
    pickLanguageSubtitle: "הכפתורים ושמות המצבים יוצגו בשפה זו",
    loadingSession: "טוען את המשחק…",
    cancelAndGoBack: "ביטול וחזרה",
    headline: "משחק מהיר!",
    subheadWords: (count) => `${count} מילים · אין צורך בהתחברות`,
    yourNameLabel: "השם שלך",
    namePlaceholder: "הכניסו כינוי...",
    alreadyJoinedAsPrefix: "כבר הצטרפת בשם ",
    joining: "מצטרפים…",
    startPlaying: "בואו נתחיל",
    guestModeNote: "ℹ️ ההתקדמות שלך לא תישמר (מצב אורח). פתחו חשבון כדי לעקוב אחר הנקודות ולפתוח אפשרויות נוספות!",
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
    toastCantLoadGame: "🤔 לא הצלחנו לטעון את המשחק. סרקו שוב את קוד ה-QR.",
    toastGenericJoinFail: "🤔 לא הצלחנו להתחבר. נסו שוב.",
    toastTeacherEnded: "🎉 המורה סיים את המשחק. כל הכבוד!",
    toastConnectionLost: "📡 אין חיבור למשחק. רעננו את הדף ונסו שוב.",
    toastCantJoinLeaderboard: "🤔 לא הצלחנו להוסיף ללוח המובילים. נסו שוב.",
    kickedTitle: "הוסרת מהמשחק",
    kickedBody: "המורה הסיר אותך ממשחק המהיר הזה.",
    kickedRejoinHint: " אם זו הייתה טעות, אפשר להצטרף מחדש עם שם אחר.",
    rejoinDifferentName: "הצטרפות מחדש עם שם אחר",
    backToHomePage: "חזרה לדף הבית",
    sessionComplete: "המשחק הסתיים!",
    youFinishedRank: (rank) => `סיימת במקום ${rank}!`,
    greatJobPrefix: "כל הכבוד, ",
    rankOfTotal: (rank, total) => `מקום ${rank} מתוך ${total}`,
    yourFinalScore: "הניקוד הסופי שלך",
    points: "נקודות",
    topOfClass: "מובילי הכיתה",
    youMarker: "(אתה)",
    signUpToSave: "הירשמו כדי לשמור את ההתקדמות, לצבור XP ולטפס בלוח המובילים!",
  },
  ar: {
    back: "رجوع",
    reconnecting: "يتم إعادة الاتصال…",
    pickLanguage: "اختر لغة",
    pickLanguageSubtitle: "ستظهر الأزرار وأسماء الأوضاع بهذه اللغة",
    loadingSession: "يتم تحميل اللعب السريع…",
    cancelAndGoBack: "إلغاء والرجوع",
    headline: "لعب سريع!",
    subheadWords: (count) => `${count} كلمات · لا حاجة لتسجيل الدخول`,
    yourNameLabel: "اسمك",
    namePlaceholder: "أدخل اسمك المستعار...",
    alreadyJoinedAsPrefix: "لقد انضممت بالفعل باسم ",
    joining: "ينضم…",
    startPlaying: "لنبدأ",
    guestModeNote: "ℹ️ لن يتم حفظ تقدمك (وضع الضيف). أنشئ حسابًا لتتبع نقاطك وفتح ميزات إضافية!",
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
    toastCantLoadGame: "🤔 تعذّر تحميل اللعبة. امسح رمز QR مرة أخرى.",
    toastGenericJoinFail: "🤔 تعذّر الانضمام. حاول مرة أخرى.",
    toastTeacherEnded: "🎉 أنهى معلّمك اللعبة. أحسنت!",
    toastConnectionLost: "📡 تعذّر الوصول إلى اللعبة. حدّث الصفحة وحاول مجددًا.",
    toastCantJoinLeaderboard: "🤔 تعذّر الانضمام إلى لوحة النتائج. حاول مجددًا.",
    kickedTitle: "تمت إزالتك",
    kickedBody: "أزالك معلّمك من جلسة اللعب السريع هذه.",
    kickedRejoinHint: " إذا كان ذلك خطأً، يمكنك الانضمام مجددًا باسم مختلف.",
    rejoinDifferentName: "انضم مجددًا باسم مختلف",
    backToHomePage: "العودة إلى الصفحة الرئيسية",
    sessionComplete: "انتهت الجلسة!",
    youFinishedRank: (rank) => `أنهيت في المركز ${rank}!`,
    greatJobPrefix: "أحسنت، ",
    rankOfTotal: (rank, total) => `المركز ${rank} من ${total}`,
    yourFinalScore: "نتيجتك النهائية",
    points: "نقاط",
    topOfClass: "متصدّرو الصف",
    youMarker: "(أنت)",
    signUpToSave: "سجّل لحفظ تقدّمك وكسب نقاط الخبرة والصعود في لوحة المتصدّرين!",
  },
  ru: {
    back: "Назад",
    reconnecting: "Переподключение…",
    pickLanguage: "Pick a language",
    pickLanguageSubtitle: "Buttons + mode names will be in this language",
    loadingSession: "Загрузка быстрой игры…",
    cancelAndGoBack: "Отменить и вернуться",
    headline: "Быстрая игра!",
    subheadWords: (count) => `${count} слов • Без входа в аккаунт`,
    yourNameLabel: "ТВОЁ ИМЯ",
    namePlaceholder: "Введи никнейм...",
    alreadyJoinedAsPrefix: "Ты уже присоединился как ",
    joining: "Подключение…",
    startPlaying: "Начать игру",
    guestModeNote: "ℹ️ Твой прогресс не сохранится (гостевой режим). Создай аккаунт, чтобы копить XP и открывать новое!",
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
    toastCantLoadGame: "🤔 Не удалось загрузить игру. Отсканируй QR-код снова.",
    toastGenericJoinFail: "🤔 Не удалось подключиться. Попробуй ещё раз.",
    toastTeacherEnded: "🎉 Учитель завершил игру. Молодец!",
    toastConnectionLost: "📡 Нет связи с игрой. Обнови страницу и попробуй снова.",
    toastCantJoinLeaderboard: "🤔 Не удалось присоединиться к таблице. Попробуй ещё раз.",
    kickedTitle: "You've been removed",
    kickedBody: "Your teacher removed you from this Quick Play session.",
    kickedRejoinHint: " If this was a mistake, you can rejoin with a different name.",
    rejoinDifferentName: "Rejoin with a different name",
    backToHomePage: "Back to Home Page",
    sessionComplete: "Session Complete!",
    youFinishedRank: (rank) => `You finished ${rank === 1 ? "1st" : rank === 2 ? "2nd" : rank === 3 ? "3rd" : `${rank}th`}!`,
    greatJobPrefix: "Great job, ",
    rankOfTotal: (rank, total) => `Rank ${rank} of ${total}`,
    yourFinalScore: "Your Final Score",
    points: "points",
    topOfClass: "Top of the class",
    youMarker: "(you)",
    signUpToSave: "Sign up to save your progress, earn XP, and climb the leaderboard!",
  },
};
