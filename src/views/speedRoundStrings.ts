/**
 * speedRoundStrings — i18n + mode metadata shared by the Speed Round
 * host + student views. Kept in one place so both screens name the modes
 * and UI copy identically across en / he / ar.
 */
import type { QpSpeedMode } from "../core/quickPlayProtocol";

/** Emoji per mode — non-translated, used in both host + student chrome. */
export const SPEED_MODE_META: Record<QpSpeedMode, { emoji: string }> = {
  "true-false": { emoji: "✅" },
  "classic": { emoji: "🎯" },
  "reverse": { emoji: "🔁" },
  "listening": { emoji: "🔊" },
  "idiom": { emoji: "💬" },
  "letter-sounds": { emoji: "🔤" },
};

type ModeNames = Record<QpSpeedMode, string>;

interface HostStrings {
  title: string; joinHeading: string; code: string;
  wordsHeading: string; searchPlaceholder: string;
  wordsCount: (n: number) => string; needWords: (min: number) => string;
  clearWords: string; noResults: string; savedListsHeading: string;
  autoPlayLabel: string; autoNextIn: (n: number) => string;
  modeHeading: string; modeHint: string; timerHeading: string;
  repeatsHeading: string; repeatsHint: string; repeatsLabel: (n: number) => string;
  start: string; nextWord: string; wordLive: string;
  roundDone: string; playAgain: string;
  wordsPlayed: (done: number, total: number) => string;
  leaderboard: string; noStudents: string;
  end: string; endRound: string;
  seconds: (n: number) => string; players: (n: number) => string;
  copy: string; copied: string; enlarge: string; hide: string;
  present: string; controls: string;
  tfTrue: string; tfFalse: string;
  buildError: string; loadingWords: string;
  firstWinner: (name: string) => string;
  modeNames: ModeNames;
}

export const SPEED_HOST_STRINGS: Record<"en" | "he" | "ar", HostStrings> = {
  en: {
    title: "Speed Round", joinHeading: "Students join here", code: "Class code",
    wordsHeading: "Your words", searchPlaceholder: "Type a word to add it\u2026",
    wordsCount: (n) => `${n} words ready`, needWords: (min) => `Add at least ${min} words to start`,
    clearWords: "Clear all", noResults: "No matching words in the library",
    savedListsHeading: "Your saved lists",
    autoPlayLabel: "Auto-play words", autoNextIn: (n) => `Next word in ${n}\u2026`,
    modeHeading: "Question modes",
    modeHint: "Pick one or more \u2014 each word gets a random mode from your picks.",
    timerHeading: "Time per word",
    repeatsHeading: "Repeats",
    repeatsHint: "Cycle the whole list this many times — e.g. 10 words ×2 = 20 rounds.",
    repeatsLabel: (n) => `×${n}`,
    start: "Start word", nextWord: "Next word", wordLive: "Word live",
    roundDone: "All words played!", playAgain: "Play again",
    wordsPlayed: (done, total) => `${done}/${total} words played`,
    leaderboard: "Leaderboard", noStudents: "Waiting for students to join…",
    end: "End game", endRound: "End word",
    seconds: (n) => `${n}s`, players: (n) => `${n} playing`,
    copy: "Copy link", copied: "Copied!", enlarge: "Enlarge", hide: "Hide",
    present: "Present", controls: "Controls",
    tfTrue: "True", tfFalse: "False",
    buildError: "Couldn't build a question for that mode — try another set or mode.",
    loadingWords: "Loading words…",
    firstWinner: (name) => `${name} was first!`,
    modeNames: {
      "true-false": "True / False", "classic": "Classic", "reverse": "Reverse",
      "listening": "Listening", "idiom": "Idioms", "letter-sounds": "Letter Sounds",
    },
  },
  he: {
    title: "סבב מהיר", joinHeading: "התלמידים מצטרפים כאן", code: "קוד כיתה",
    wordsHeading: "המילים שלך", searchPlaceholder: "הקלידו מילה כדי להוסיף\u2026",
    wordsCount: (n) => `${n} מילים מוכנות`, needWords: (min) => `הוסיפו לפחות ${min} מילים כדי להתחיל`,
    clearWords: "נקה הכל", noResults: "אין מילים תואמות במאגר",
    autoPlayLabel: "ניגון אוטומטי", autoNextIn: (n) => `המילה הבאה בעוד ${n}\u2026`,
    savedListsHeading: "הרשימות השמורות שלך",
    modeHeading: "סוגי שאלות",
    modeHint: "בחרו אחד או יותר — כל מילה מקבלת סוג אקראי מהבחירה שלכם.",
    timerHeading: "זמן לכל מילה",
    repeatsHeading: "חזרות",
    repeatsHint: "מחזירים את כל הרשימה כמספר הזה — לדוגמה 10 מילים ×2 = 20 סבבים.",
    repeatsLabel: (n) => `×${n}`,
    start: "התחל מילה", nextWord: "מילה הבאה", wordLive: "מילה פעילה",
    roundDone: "כל המילים שוחקו!", playAgain: "שחקו שוב",
    wordsPlayed: (done, total) => `${done}/${total} מילים שוחקו`,
    leaderboard: "טבלת מובילים", noStudents: "ממתינים שתלמידים יצטרפו…",
    end: "סיים משחק", endRound: "סיים מילה",
    seconds: (n) => `${n} שנ'`, players: (n) => `${n} משחקים`,
    copy: "העתק קישור", copied: "הועתק!", enlarge: "הגדל", hide: "הסתר",
    present: "מצגת", controls: "פקדים",
    tfTrue: "נכון", tfFalse: "לא נכון",
    buildError: "לא ניתן לבנות שאלה למצב הזה — נסו מאגר או מצב אחר.",
    loadingWords: "טוען מילים…",
    firstWinner: (name) => `${name} הראשון!`,
    modeNames: {
      "true-false": "נכון / לא נכון", "classic": "קלאסי", "reverse": "הפוך",
      "listening": "האזנה", "idiom": "ביטויים", "letter-sounds": "צלילי אותיות",
    },
  },
  ar: {
    title: "جولة سريعة", joinHeading: "ينضم الطلاب هنا", code: "رمز الصف",
    wordsHeading: "كلماتك", searchPlaceholder: "اكتبوا كلمة لإضافتها\u2026",
    wordsCount: (n) => `${n} كلمات جاهزة`, needWords: (min) => `أضيفوا ${min} كلمات على الأقل للبدء`,
    clearWords: "مسح الكل", noResults: "لا توجد كلمات مطابقة في المكتبة",
    autoPlayLabel: "تشغيل تلقائي", autoNextIn: (n) => `الكلمة التالية خلال ${n}\u2026`,
    savedListsHeading: "قوائمك المحفوظة",
    modeHeading: "أنواع الأسئلة",
    modeHint: "اختر نوعًا واحدًا أو أكثر — كل كلمة تحصل على نوع عشوائي من اختيارك.",
    timerHeading: "الوقت لكل كلمة",
    repeatsHeading: "التكرارات",
    repeatsHint: "كرّر القائمة كاملة بهذا العدد — مثال: 10 كلمات ×2 = 20 جولة.",
    repeatsLabel: (n) => `×${n}`,
    start: "ابدأ الكلمة", nextWord: "الكلمة التالية", wordLive: "كلمة نشطة",
    roundDone: "تم لعب كل الكلمات!", playAgain: "العب مرة أخرى",
    wordsPlayed: (done, total) => `${done}/${total} كلمات لُعبت`,
    leaderboard: "لوحة المتصدرين", noStudents: "في انتظار انضمام الطلاب…",
    end: "إنهاء اللعبة", endRound: "إنهاء الكلمة",
    seconds: (n) => `${n} ث`, players: (n) => `${n} يلعبون`,
    copy: "نسخ الرابط", copied: "تم النسخ!", enlarge: "تكبير", hide: "إخفاء",
    present: "عرض", controls: "أدوات",
    tfTrue: "صحيح", tfFalse: "خطأ",
    buildError: "تعذّر إنشاء سؤال لهذا الوضع — جرّب مجموعة أو وضعًا آخر.",
    loadingWords: "جارٍ تحميل الكلمات…",
    firstWinner: (name) => `${name} كان الأول!`,
    modeNames: {
      "true-false": "صح / خطأ", "classic": "كلاسيكي", "reverse": "عكسي",
      "listening": "استماع", "idiom": "تعابير", "letter-sounds": "أصوات الحروف",
    },
  },
};

interface StudentStrings {
  joinTitle: string; joinSub: string;
  namePlaceholder: string; joinBtn: string; joining: string;
  nameTaken: string; kicked: string; joinFailed: string; badName: string;
  lobbyTitle: string; lobbySub: string;
  tapToHear: string; locked: string; waitingNext: string;
  correct: string; incorrect: string; first: string;
  yourScore: string; correctAnswer: string;
  endedTitle: string; endedSub: string; backHome: string;
  points: (n: number) => string; rank: (n: number) => string;
  speedLabel: string;
}

export const SPEED_STUDENT_STRINGS: Record<"en" | "he" | "ar", StudentStrings> = {
  en: {
    joinTitle: "Speed Round", joinSub: "Type your name and get ready!",
    namePlaceholder: "Your name", joinBtn: "Join", joining: "Joining…",
    nameTaken: "That name is taken — try another.", kicked: "You were removed from this game.",
    joinFailed: "Couldn't join. Check the code and try again.", badName: "Please pick a different name.",
    lobbyTitle: "You're in!", lobbySub: "Get ready — the teacher starts each word…",
    tapToHear: "Tap to hear", locked: "Locked in! Waiting…", waitingNext: "Waiting for the next word…",
    correct: "Correct!", incorrect: "Not quite", first: "First! ⚡",
    yourScore: "Your score", correctAnswer: "Correct answer",
    endedTitle: "Game over!", endedSub: "Thanks for playing.", backHome: "Back to home",
    points: (n) => `${n} pts`, rank: (n) => `#${n}`, speedLabel: "speed bonus",
  },
  he: {
    joinTitle: "סבב מהיר", joinSub: "כתבו את השם והתכוננו!",
    namePlaceholder: "השם שלך", joinBtn: "הצטרפו", joining: "מצטרפים…",
    nameTaken: "השם תפוס — נסו שם אחר.", kicked: "הוסרת מהמשחק.",
    joinFailed: "ההצטרפות נכשלה. בדקו את הקוד ונסו שוב.", badName: "בחרו שם אחר בבקשה.",
    lobbyTitle: "אתם בפנים!", lobbySub: "התכוננו — המורה מתחיל כל מילה…",
    tapToHear: "הקישו כדי לשמוע", locked: "ננעל! ממתינים…", waitingNext: "ממתינים למילה הבאה…",
    correct: "נכון!", incorrect: "כמעט", first: "ראשונים! ⚡",
    yourScore: "הניקוד שלך", correctAnswer: "התשובה הנכונה",
    endedTitle: "המשחק הסתיים!", endedSub: "תודה ששיחקתם.", backHome: "חזרה לבית",
    points: (n) => `${n} נק'`, rank: (n) => `#${n}`, speedLabel: "בונוס מהירות",
  },
  ar: {
    joinTitle: "جولة سريعة", joinSub: "اكتب اسمك واستعد!",
    namePlaceholder: "اسمك", joinBtn: "انضم", joining: "جارٍ الانضمام…",
    nameTaken: "الاسم مأخوذ — جرّب اسمًا آخر.", kicked: "تمت إزالتك من اللعبة.",
    joinFailed: "تعذّر الانضمام. تحقق من الرمز وحاول مجددًا.", badName: "اختر اسمًا مختلفًا من فضلك.",
    lobbyTitle: "أنت في اللعبة!", lobbySub: "استعد — المعلم يبدأ كل كلمة…",
    tapToHear: "اضغط للاستماع", locked: "تم التثبيت! في الانتظار…", waitingNext: "في انتظار الكلمة التالية…",
    correct: "صحيح!", incorrect: "ليس تمامًا", first: "الأول! ⚡",
    yourScore: "نتيجتك", correctAnswer: "الإجابة الصحيحة",
    endedTitle: "انتهت اللعبة!", endedSub: "شكرًا للعب.", backHome: "العودة للرئيسية",
    points: (n) => `${n} نقطة`, rank: (n) => `#${n}`, speedLabel: "مكافأة السرعة",
  },
};
