/**
 * arenaStrings — i18n + metadata shared by the Word Hunt Arena host +
 * student views. Kept in one place so both screens name the modes, sets,
 * and UI copy identically across en / he / ar (same pattern as
 * speedRoundStrings, which it complements: the buzzer overlay itself
 * reuses SPEED_STUDENT_STRINGS via the shared SpeedBuzzer component).
 */
import type { QpSpeedMode } from "../core/quickPlayProtocol";
import type { SpeedSet } from "./speedRoundStrings";

type ModeNames = Record<QpSpeedMode, string>;
type SetNames = Record<SpeedSet, string>;

interface ArenaHostStrings {
  title: string; joinHeading: string; code: string;
  setHeading: string; modeHeading: string; timerHeading: string;
  start: string; arenaLive: string; restart: string;
  leaderboard: string; noStudents: string;
  end: string; endArena: string;
  seconds: (n: number) => string; players: (n: number) => string;
  copy: string; copied: string; enlarge: string; hide: string;
  present: string; controls: string;
  tfTrue: string; tfFalse: string;
  buildError: string; loadingWords: string; pickMode: string;
  wordsLeft: (n: number) => string;
  modeNames: ModeNames; setNames: SetNames;
}

export const ARENA_HOST_STRINGS: Record<"en" | "he" | "ar", ArenaHostStrings> = {
  en: {
    title: "Word Hunt Arena", joinHeading: "Students join here", code: "Class code",
    setHeading: "Word set", modeHeading: "Question modes", timerHeading: "Time per word",
    start: "Start arena", arenaLive: "Arena live", restart: "New arena",
    leaderboard: "Leaderboard", noStudents: "Waiting for students to join…",
    end: "End game", endArena: "End arena",
    seconds: (n) => `${n}s`, players: (n) => `${n} playing`,
    copy: "Copy link", copied: "Copied!", enlarge: "Enlarge", hide: "Hide",
    present: "Present", controls: "Controls",
    tfTrue: "True", tfFalse: "False",
    buildError: "Couldn't build questions — try another set or mode mix.",
    loadingWords: "Loading words…", pickMode: "Pick at least one mode.",
    wordsLeft: (n) => `${n} words left`,
    modeNames: {
      "true-false": "True / False", "classic": "Classic", "reverse": "Reverse",
      "listening": "Listening", "idiom": "Idioms", "letter-sounds": "Letter Sounds",
    },
    setNames: { "Set 1": "Set 1", "Set 2": "Set 2", "Set 3": "Set 3" },
  },
  he: {
    title: "זירת ציד מילים", joinHeading: "התלמידים מצטרפים כאן", code: "קוד כיתה",
    setHeading: "מאגר מילים", modeHeading: "סוגי שאלות", timerHeading: "זמן לכל מילה",
    start: "התחל זירה", arenaLive: "זירה פעילה", restart: "זירה חדשה",
    leaderboard: "טבלת מובילים", noStudents: "ממתינים שתלמידים יצטרפו…",
    end: "סיים משחק", endArena: "סיים זירה",
    seconds: (n) => `${n} שנ'`, players: (n) => `${n} משחקים`,
    copy: "העתק קישור", copied: "הועתק!", enlarge: "הגדל", hide: "הסתר",
    present: "מצגת", controls: "פקדים",
    tfTrue: "נכון", tfFalse: "לא נכון",
    buildError: "לא ניתן לבנות שאלות — נסו מאגר או שילוב מצבים אחר.",
    loadingWords: "טוען מילים…", pickMode: "בחרו לפחות מצב אחד.",
    wordsLeft: (n) => `נותרו ${n} מילים`,
    modeNames: {
      "true-false": "נכון / לא נכון", "classic": "קלאסי", "reverse": "הפוך",
      "listening": "האזנה", "idiom": "ביטויים", "letter-sounds": "צלילי אותיות",
    },
    setNames: { "Set 1": "מאגר 1", "Set 2": "מאגר 2", "Set 3": "מאגר 3" },
  },
  ar: {
    title: "ساحة صيد الكلمات", joinHeading: "ينضم الطلاب هنا", code: "رمز الصف",
    setHeading: "مجموعة الكلمات", modeHeading: "أنواع الأسئلة", timerHeading: "الوقت لكل كلمة",
    start: "ابدأ الساحة", arenaLive: "الساحة نشطة", restart: "ساحة جديدة",
    leaderboard: "لوحة المتصدرين", noStudents: "في انتظار انضمام الطلاب…",
    end: "إنهاء اللعبة", endArena: "إنهاء الساحة",
    seconds: (n) => `${n} ث`, players: (n) => `${n} يلعبون`,
    copy: "نسخ الرابط", copied: "تم النسخ!", enlarge: "تكبير", hide: "إخفاء",
    present: "عرض", controls: "أدوات",
    tfTrue: "صحيح", tfFalse: "خطأ",
    buildError: "تعذّر إنشاء الأسئلة — جرّب مجموعة أو مزيجًا آخر.",
    loadingWords: "جارٍ تحميل الكلمات…", pickMode: "اختر وضعًا واحدًا على الأقل.",
    wordsLeft: (n) => `تبقّى ${n} كلمات`,
    modeNames: {
      "true-false": "صح / خطأ", "classic": "كلاسيكي", "reverse": "عكسي",
      "listening": "استماع", "idiom": "تعابير", "letter-sounds": "أصوات الحروف",
    },
    setNames: { "Set 1": "المجموعة 1", "Set 2": "المجموعة 2", "Set 3": "المجموعة 3" },
  },
};

interface ArenaStudentStrings {
  joinTitle: string; joinSub: string;
  namePlaceholder: string; joinBtn: string; joining: string;
  nameTaken: string; kicked: string; joinFailed: string; badName: string;
  lobbyTitle: string; lobbySub: string;
  hudScore: string;
  deniedLocked: string; deniedRange: string; deniedCooldown: string; deniedGone: string;
  arenaOverTitle: string; arenaOverSub: string;
  endedTitle: string; endedSub: string; backHome: string;
  yourScore: string;
  points: (n: number) => string; rank: (n: number) => string;
}

export const ARENA_STUDENT_STRINGS: Record<"en" | "he" | "ar", ArenaStudentStrings> = {
  en: {
    joinTitle: "Word Hunt Arena", joinSub: "Type your name and get ready to run!",
    namePlaceholder: "Your name", joinBtn: "Join", joining: "Joining…",
    nameTaken: "That name is taken — try another.", kicked: "You were removed from this game.",
    joinFailed: "Couldn't join. Check the code and try again.", badName: "Please pick a different name.",
    lobbyTitle: "You're in!", lobbySub: "Get ready — the teacher opens the arena…",
    hudScore: "Score",
    deniedLocked: "Too late — someone grabbed it!", deniedRange: "Get closer!",
    deniedCooldown: "Catch your breath…", deniedGone: "That word is gone.",
    arenaOverTitle: "Arena over!", arenaOverSub: "Waiting for the teacher…",
    endedTitle: "Game over!", endedSub: "Thanks for playing.", backHome: "Back to home",
    yourScore: "Your score",
    points: (n) => `${n} pts`, rank: (n) => `#${n}`,
  },
  he: {
    joinTitle: "זירת ציד מילים", joinSub: "כתבו את השם והתכוננו לרוץ!",
    namePlaceholder: "השם שלך", joinBtn: "הצטרפו", joining: "מצטרפים…",
    nameTaken: "השם תפוס — נסו שם אחר.", kicked: "הוסרת מהמשחק.",
    joinFailed: "ההצטרפות נכשלה. בדקו את הקוד ונסו שוב.", badName: "בחרו שם אחר בבקשה.",
    lobbyTitle: "אתם בפנים!", lobbySub: "התכוננו — המורה פותח את הזירה…",
    hudScore: "ניקוד",
    deniedLocked: "מאוחר מדי — מישהו תפס אותה!", deniedRange: "תתקרבו!",
    deniedCooldown: "קחו נשימה…", deniedGone: "המילה הזו כבר נתפסה.",
    arenaOverTitle: "הזירה הסתיימה!", arenaOverSub: "ממתינים למורה…",
    endedTitle: "המשחק הסתיים!", endedSub: "תודה ששיחקתם.", backHome: "חזרה לבית",
    yourScore: "הניקוד שלך",
    points: (n) => `${n} נק'`, rank: (n) => `#${n}`,
  },
  ar: {
    joinTitle: "ساحة صيد الكلمات", joinSub: "اكتب اسمك واستعد للركض!",
    namePlaceholder: "اسمك", joinBtn: "انضم", joining: "جارٍ الانضمام…",
    nameTaken: "الاسم مأخوذ — جرّب اسمًا آخر.", kicked: "تمت إزالتك من اللعبة.",
    joinFailed: "تعذّر الانضمام. تحقق من الرمز وحاول مجددًا.", badName: "اختر اسمًا مختلفًا من فضلك.",
    lobbyTitle: "أنت في اللعبة!", lobbySub: "استعد — المعلم يفتح الساحة…",
    hudScore: "النقاط",
    deniedLocked: "فات الأوان — أحدهم أمسك بها!", deniedRange: "اقترب أكثر!",
    deniedCooldown: "التقط أنفاسك…", deniedGone: "هذه الكلمة اختفت.",
    arenaOverTitle: "انتهت الساحة!", arenaOverSub: "في انتظار المعلم…",
    endedTitle: "انتهت اللعبة!", endedSub: "شكرًا للعب.", backHome: "العودة للرئيسية",
    yourScore: "نتيجتك",
    points: (n) => `${n} نقطة`, rank: (n) => `#${n}`,
  },
};
