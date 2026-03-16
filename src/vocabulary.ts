// vocabulary.ts

export interface Word {
  id: number;
  english: string;
  hebrew: string;
  arabic: string;
  imageUrl?: string;
  level?: "Band 1" | "Band 2" | "Band 3" | "Custom";
  core?: "Core I" | "Core II";
  pos?: string; // Part of Speech
  recProd?: "Rec" | "Prod"; // Receptive or Productive
}

// ============================================================================
// BAND 2 - CORE I (Words 1-500)
// ============================================================================
export const BAND_2_CORE_I_WORDS: Word[] = [
  { id: 1, english: "a little bit", hebrew: "קצת", arabic: "قليلاً", level: "Band 2", core: "Core I", recProd: "Prod" },
  { id: 2, english: "a pity", hebrew: "חבל", arabic: "من المؤسف", level: "Band 2", core: "Core I", recProd: "Rec" },
  { id: 3, english: "a shame", hebrew: "בושה", arabic: "عيب", level: "Band 2", core: "Core I", recProd: "Rec" },
  { id: 4, english: "a variety of", hebrew: "מגוון של", arabic: "مجموعة متنوعة من", level: "Band 2", core: "Core I", recProd: "Rec" },
  { id: 5, english: "abroad", hebrew: "בחו\"ל", arabic: "في الخارج", level: "Band 2", core: "Core I", pos: "adv", recProd: "Rec" },
  { id: 6, english: "accent", hebrew: "מבטא", arabic: "لهجة", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 7, english: "accept", hebrew: "לקבל", arabic: "يقبل", level: "Band 2", core: "Core I", pos: "v", recProd: "Rec" },
  { id: 8, english: "accident", hebrew: "תאונה", arabic: "حادث", level: "Band 2", core: "Core I", pos: "n", recProd: "Prod" },
  { id: 9, english: "accompany", hebrew: "ללוות", arabic: "يرافق", level: "Band 2", core: "Core I", pos: "v", recProd: "Rec" },
  { id: 10, english: "according to", hebrew: "לפי", arabic: "وفقاً لـ", level: "Band 2", core: "Core I", recProd: "Prod" },
  { id: 11, english: "ache", hebrew: "כאב", arabic: "ألم", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 12, english: "achieve", hebrew: "להשיג", arabic: "يحقق", level: "Band 2", core: "Core I", pos: "v", recProd: "Prod" },
  { id: 13, english: "achievement", hebrew: "הישג", arabic: "إنجاز", level: "Band 2", core: "Core I", pos: "n", recProd: "Prod" },
  { id: 14, english: "across", hebrew: "מעבר", arabic: "عبر", level: "Band 2", core: "Core I", pos: "adv, prep", recProd: "Prod" },
  { id: 15, english: "activity", hebrew: "פעילות", arabic: "نشاط", level: "Band 2", core: "Core I", pos: "n", recProd: "Prod" },
  { id: 16, english: "adequate", hebrew: "מספק", arabic: "كافٍ", level: "Band 2", core: "Core I", pos: "adj", recProd: "Rec" },
  { id: 17, english: "adjective", hebrew: "שם תואר", arabic: "صفة", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 18, english: "adjust", hebrew: "לכוונן", arabic: "يضبط", level: "Band 2", core: "Core I", pos: "v", recProd: "Rec" },
  { id: 19, english: "adjustment", hebrew: "כוונון", arabic: "تعديل", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 20, english: "admire", hebrew: "להעריץ", arabic: "يعجب بـ", level: "Band 2", core: "Core I", pos: "v", recProd: "Prod" },
  { id: 21, english: "admit", hebrew: "להודות", arabic: "يعترف", level: "Band 2", core: "Core I", pos: "v", recProd: "Prod" },
  { id: 22, english: "advantage", hebrew: "יתרון", arabic: "ميزة", level: "Band 2", core: "Core I", pos: "n", recProd: "Prod" },
  { id: 23, english: "adventure", hebrew: "הרפתקה", arabic: "مغامرة", level: "Band 2", core: "Core I", pos: "n", recProd: "Prod" },
  { id: 24, english: "adventurous", hebrew: "הרפתקני", arabic: "مغامر", level: "Band 2", core: "Core I", pos: "adj", recProd: "Prod" },
  { id: 25, english: "adverb", hebrew: "תואר הפועל", arabic: "حال", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 26, english: "advertise", hebrew: "לפרסם", arabic: "يعلن", level: "Band 2", core: "Core I", pos: "v", recProd: "Prod" },
  { id: 27, english: "advertisement", hebrew: "פרסומת", arabic: "إعلان", level: "Band 2", core: "Core I", pos: "n", recProd: "Prod" },
  { id: 28, english: "affect", hebrew: "להשפיע", arabic: "يؤثر", level: "Band 2", core: "Core I", pos: "v", recProd: "Prod" },
  { id: 29, english: "afraid", hebrew: "מפוחד", arabic: "خائف", level: "Band 2", core: "Core I", pos: "adj", recProd: "Prod" },
  { id: 30, english: "afterwards", hebrew: "אחר כך", arabic: "بعد ذلك", level: "Band 2", core: "Core I", pos: "adv", recProd: "Prod" },
  { id: 31, english: "aim", hebrew: "לכוון", arabic: "يهدف", level: "Band 2", core: "Core I", pos: "v, n", recProd: "Prod" },
  { id: 32, english: "airport", hebrew: "שדה תעופה", arabic: "مطار", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 33, english: "album", hebrew: "אלבום", arabic: "ألبوم", level: "Band 2", core: "Core I", pos: "n", recProd: "Prod" },
  { id: 34, english: "alive", hebrew: "חי", arabic: "حي", level: "Band 2", core: "Core I", pos: "adj", recProd: "Rec" },
  { id: 35, english: "all the best", hebrew: "כל טוב", arabic: "أتمنى لك التوفيق", level: "Band 2", core: "Core I", recProd: "Rec" },
  { id: 36, english: "along", hebrew: "לאורך", arabic: "على طول", level: "Band 2", core: "Core I", pos: "prep", recProd: "Prod" },
  { id: 37, english: "aloud", hebrew: "בקול רם", arabic: "بصوت عالٍ", level: "Band 2", core: "Core I", pos: "adv", recProd: "Rec" },
  { id: 38, english: "alter", hebrew: "לשנות", arabic: "يغير", level: "Band 2", core: "Core I", pos: "v", recProd: "Rec" },
  { id: 39, english: "although", hebrew: "למרות ש", arabic: "على الرغم من", level: "Band 2", core: "Core I", pos: "conj", recProd: "Rec" },
  { id: 40, english: "amazing", hebrew: "מדהים", arabic: "مذهل", level: "Band 2", core: "Core I", pos: "adj", recProd: "Prod" },
  { id: 41, english: "amaze", hebrew: "להדהים", arabic: "يذهل", level: "Band 2", core: "Core I", pos: "v", recProd: "Prod" },
  { id: 42, english: "among", hebrew: "בין", arabic: "بين", level: "Band 2", core: "Core I", pos: "prep", recProd: "Rec" },
  { id: 43, english: "amount", hebrew: "כמות", arabic: "كمية", level: "Band 2", core: "Core I", pos: "n", recProd: "Prod" },
  { id: 44, english: "and", hebrew: "ו", arabic: "و", level: "Band 2", core: "Core I", pos: "conj", recProd: "Rec" },
  { id: 45, english: "announce", hebrew: "להכריז", arabic: "يعلن", level: "Band 2", core: "Core I", pos: "v", recProd: "Rec" },
  { id: 46, english: "announcement", hebrew: "הכרזה", arabic: "إعلان", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 47, english: "anticipate", hebrew: "לצפות", arabic: "يتوقع", level: "Band 2", core: "Core I", pos: "v", recProd: "Rec" },
  { id: 48, english: "anymore", hebrew: "לא עוד", arabic: "لم يعد", level: "Band 2", core: "Core I", pos: "adv", recProd: "Prod" },
  { id: 49, english: "anyway", hebrew: "בכל מקרה", arabic: "على أي حال", level: "Band 2", core: "Core I", pos: "adv", recProd: "Prod" },
  { id: 50, english: "apartment", hebrew: "דירה", arabic: "شقة", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 51, english: "apology", hebrew: "התנצלות", arabic: "اعتذار", level: "Band 2", core: "Core I", pos: "n", recProd: "Prod" },
  { id: 52, english: "apologize", hebrew: "להתנצל", arabic: "يعتذر", level: "Band 2", core: "Core I", pos: "v", recProd: "Prod" },
  { id: 53, english: "appointment", hebrew: "פגישה", arabic: "موعد", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 54, english: "approximately", hebrew: "בקירוב", arabic: "تقريباً", level: "Band 2", core: "Core I", pos: "adv", recProd: "Rec" },
  { id: 55, english: "Arab", hebrew: "ערבי", arabic: "عربي", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 56, english: "area", hebrew: "אזור", arabic: "منطقة", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 57, english: "army", hebrew: "צבא", arabic: "جيش", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 58, english: "around", hebrew: "סביב", arabic: "حول", level: "Band 2", core: "Core I", pos: "adv, prep", recProd: "Prod" },
  { id: 59, english: "arrival", hebrew: "הגעה", arabic: "وصول", level: "Band 2", core: "Core I", pos: "n", recProd: "Prod" },
  { id: 60, english: "article", hebrew: "כתבה", arabic: "مقال", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 61, english: "as soon as", hebrew: "ברגע ש", arabic: "بمجرد أن", level: "Band 2", core: "Core I", recProd: "Prod" },
  { id: 62, english: "as much as possible", hebrew: "כמה שיותר", arabic: "أقدر ما يمكن", level: "Band 2", core: "Core I", recProd: "Prod" },
  { id: 63, english: "as you know", hebrew: "כמו שאתה יודע", arabic: "كما تعلم", level: "Band 2", core: "Core I", recProd: "Prod" },
  { id: 64, english: "ask", hebrew: "לבקש", arabic: "يطلب", level: "Band 2", core: "Core I", pos: "v", recProd: "Rec" },
  { id: 65, english: "at", hebrew: "ב", arabic: "في", level: "Band 2", core: "Core I", pos: "prep", recProd: "Rec" },
  { id: 66, english: "at first", hebrew: "בהתחלה", arabic: "في البداية", level: "Band 2", core: "Core I", recProd: "Rec" },
  { id: 67, english: "at present", hebrew: "כרגע", arabic: "في الوقت الحالي", level: "Band 2", core: "Core I", recProd: "Prod" },
  { id: 68, english: "at the moment", hebrew: "ברגע זה", arabic: "في هذه اللحظة", level: "Band 2", core: "Core I", recProd: "Rec" },
  { id: 69, english: "attention", hebrew: "תשומת לב", arabic: "انتباه", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 70, english: "Attention!", hebrew: "תשומת לב!", arabic: "انتباه!", level: "Band 2", core: "Core I", pos: "exclam", recProd: "Rec" },
  { id: 71, english: "attitude", hebrew: "גישה", arabic: "موقف", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 72, english: "audience", hebrew: "קהל", arabic: "جمهور", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 73, english: "author", hebrew: "מחבר", arabic: "مؤلف", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 74, english: "available", hebrew: "זמין", arabic: "متاح", level: "Band 2", core: "Core I", pos: "adj", recProd: "Prod" },
  { id: 75, english: "awake", hebrew: "ערני", arabic: "مستيقظ", level: "Band 2", core: "Core I", pos: "adj", recProd: "Rec" },
  { id: 76, english: "away", hebrew: "רחוק", arabic: "بعيد", level: "Band 2", core: "Core I", pos: "adv", recProd: "Rec" },
  { id: 77, english: "back", hebrew: "חזרה", arabic: "خلف", level: "Band 2", core: "Core I", pos: "adj", recProd: "Prod" },
  { id: 78, english: "backward", hebrew: "אחורה", arabic: "إلى الخلف", level: "Band 2", core: "Core I", pos: "adj, adv", recProd: "Rec" },
  { id: 79, english: "bad", hebrew: "רע", arabic: "سيء", level: "Band 2", core: "Core I", pos: "adj", recProd: "Prod" },
  { id: 80, english: "baker", hebrew: "אופה", arabic: "خباز", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 81, english: "balloon", hebrew: "בלון", arabic: "بالون", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 82, english: "bar", hebrew: "בר", arabic: "بار", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 83, english: "barbecue", hebrew: "מנגל", arabic: "شواء", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 84, english: "baseball", hebrew: "בייסבול", arabic: "بيسبول", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 85, english: "basket", hebrew: "סל", arabic: "سلة", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 86, english: "battery", hebrew: "סוללה", arabic: "بطارية", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 87, english: "battle", hebrew: "קרב", arabic: "معركة", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
  { id: 88, english: "be able to", hebrew: "יכול", arabic: "يستطيع", level: "Band 2", core: "Core I", recProd: "Rec" },
  { id: 89, english: "be crazy about", hebrew: "משתגע על", arabic: "مجنون بـ", level: "Band 2", core: "Core I", recProd: "Rec" },
  { id: 90, english: "be located in", hebrew: "ממוקם ב", arabic: "يقع في", level: "Band 2", core: "Core I", recProd: "Rec" },
  { id: 91, english: "be made of", hebrew: "עשוי מ", arabic: "مصنوع من", level: "Band 2", core: "Core I", recProd: "Rec" },
  { id: 92, english: "be off", hebrew: "לצאת", arabic: "يغادر", level: "Band 2", core: "Core I", recProd: "Rec" },
  { id: 93, english: "be responsible for", hebrew: "אחראי ל", arabic: "مسؤول عن", level: "Band 2", core: "Core I", recProd: "Rec" },
  { id: 94, english: "be supposed to", hebrew: "אמור", arabic: "من المفترض أن", level: "Band 2", core: "Core I", recProd: "Prod" },
  { id: 95, english: "be unable to", hebrew: "לא מסוגל", arabic: "غير قادر على", level: "Band 2", core: "Core I", recProd: "Rec" },
  { id: 96, english: "be used to", hebrew: "רגיל ל", arabic: "معتاد على", level: "Band 2", core: "Core I", recProd: "Rec" },
  { id: 97, english: "be willing to", hebrew: "מוכן ל", arabic: "مستعد لـ", level: "Band 2", core: "Core I", recProd: "Prod" },
  { id: 98, english: "be worth", hebrew: "שווה", arabic: "يستحق", level: "Band 2", core: "Core I", recProd: "Rec" },
  { id: 99, english: "be wrong", hebrew: "לטעות", arabic: "يخطئ", level: "Band 2", core: "Core I", recProd: "Rec" },
  { id: 100, english: "bear", hebrew: "דב", arabic: "دب", level: "Band 2", core: "Core I", pos: "n", recProd: "Rec" },
];

// ============================================================================
// BAND 2 - CORE II (Words 501-1000)
// ============================================================================
export const BAND_2_CORE_II_WORDS: Word[] = [
  { id: 501, english: "a good/great deal", hebrew: "הרבה", arabic: "كثيراً", level: "Band 2", core: "Core II", recProd: "Rec" },
  { id: 502, english: "a sense of humor", hebrew: "חוש הומור", arabic: "حس الفكاهة", level: "Band 2", core: "Core II", recProd: "Rec" },
  { id: 503, english: "ability", hebrew: "יכולת", arabic: "قدرة", level: "Band 2", core: "Core II", pos: "n", recProd: "Prod" },
  { id: 504, english: "absent", hebrew: "נעדר", arabic: "غائب", level: "Band 2", core: "Core II", pos: "adj", recProd: "Prod" },
  { id: 505, english: "absence", hebrew: "היעדרות", arabic: "غياب", level: "Band 2", core: "Core II", pos: "n", recProd: "Prod" },
  { id: 506, english: "absolutely", hebrew: "בהחלט", arabic: "بشكل مطلق", level: "Band 2", core: "Core II", pos: "adv", recProd: "Rec" },
  { id: 507, english: "absolute", hebrew: "מוחלט", arabic: "مطلق", level: "Band 2", core: "Core II", pos: "adj", recProd: "Rec" },
  { id: 508, english: "abstract", hebrew: "מופשט", arabic: "مجرد", level: "Band 2", core: "Core II", pos: "adj", recProd: "Rec" },
  { id: 509, english: "academic", hebrew: "אקדמי", arabic: "أكاديمي", level: "Band 2", core: "Core II", pos: "adj", recProd: "Rec" },
  { id: 510, english: "acceptable", hebrew: "קביל", arabic: "مقبول", level: "Band 2", core: "Core II", pos: "adj", recProd: "Prod" },
  { id: 511, english: "accommodation", hebrew: "מגורים", arabic: "إقامة", level: "Band 2", core: "Core II", pos: "n", recProd: "Rec" },
  { id: 512, english: "accurate", hebrew: "מדויק", arabic: "دقيق", level: "Band 2", core: "Core II", pos: "adj", recProd: "Rec" },
  { id: 513, english: "accurately", hebrew: "במדויק", arabic: "بدقة", level: "Band 2", core: "Core II", pos: "adv", recProd: "Rec" },
  { id: 514, english: "accuracy", hebrew: "דיוק", arabic: "دقة", level: "Band 2", core: "Core II", pos: "n", recProd: "Rec" },
  { id: 515, english: "act", hebrew: "לפעול", arabic: "يتصرف", level: "Band 2", core: "Core II", pos: "n, v", recProd: "Prod" },
  { id: 516, english: "actor", hebrew: "שחקן", arabic: "ممثل", level: "Band 2", core: "Core II", pos: "n", recProd: "Prod" },
  { id: 517, english: "actress", hebrew: "שחקנית", arabic: "ممثلة", level: "Band 2", core: "Core II", pos: "n", recProd: "Prod" },
  { id: 518, english: "active", hebrew: "פעיל", arabic: "نشط", level: "Band 2", core: "Core II", pos: "adj", recProd: "Prod" },
  { id: 519, english: "actively", hebrew: "באופן פעיל", arabic: "بنشاط", level: "Band 2", core: "Core II", pos: "adv", recProd: "Prod" },
  { id: 520, english: "actual", hebrew: "אמיתי", arabic: "فعلي", level: "Band 2", core: "Core II", pos: "adj", recProd: "Prod" },
  { id: 521, english: "actually", hebrew: "למעשה", arabic: "في الواقع", level: "Band 2", core: "Core II", pos: "adv", recProd: "Prod" },
  { id: 522, english: "adapt", hebrew: "להתאים", arabic: "يتكيف", level: "Band 2", core: "Core II", pos: "v", recProd: "Prod" },
  { id: 523, english: "adaptation", hebrew: "התאמה", arabic: "تكيف", level: "Band 2", core: "Core II", pos: "n", recProd: "Prod" },
  { id: 524, english: "add", hebrew: "להוסיף", arabic: "يضيف", level: "Band 2", core: "Core II", pos: "v", recProd: "Prod" },
  { id: 525, english: "adopt", hebrew: "לאמץ", arabic: "يتبنى", level: "Band 2", core: "Core II", pos: "v", recProd: "Prod" },
  { id: 526, english: "adoption", hebrew: "אימוץ", arabic: "تبني", level: "Band 2", core: "Core II", pos: "n", recProd: "Prod" },
  { id: 527, english: "again and again", hebrew: "שוב ושוב", arabic: "مراراً وتكراراً", level: "Band 2", core: "Core II", recProd: "Rec" },
  { id: 528, english: "against", hebrew: "נגד", arabic: "ضد", level: "Band 2", core: "Core II", pos: "prep", recProd: "Prod" },
  { id: 529, english: "agency", hebrew: "סוכנות", arabic: "وكالة", level: "Band 2", core: "Core II", pos: "n", recProd: "Prod" },
  { id: 530, english: "agent", hebrew: "סוכן", arabic: "وكيل", level: "Band 2", core: "Core II", pos: "n", recProd: "Prod" },
  { id: 531, english: "agree", hebrew: "להסכים", arabic: "يوافق", level: "Band 2", core: "Core II", pos: "v", recProd: "Prod" },
  { id: 532, english: "agreement", hebrew: "הסכם", arabic: "اتفاق", level: "Band 2", core: "Core II", pos: "n", recProd: "Prod" },
  { id: 533, english: "ahead", hebrew: "קדימה", arabic: "إلى الأمام", level: "Band 2", core: "Core II", pos: "adv", recProd: "Rec" },
  { id: 534, english: "aid", hebrew: "עזרה", arabic: "مساعدة", level: "Band 2", core: "Core II", pos: "n", recProd: "Rec" },
  { id: 535, english: "aircraft", hebrew: "כלי טיס", arabic: "طائرة", level: "Band 2", core: "Core II", pos: "n", recProd: "Rec" },
  { id: 536, english: "alcohol", hebrew: "אלכוהול", arabic: "كحول", level: "Band 2", core: "Core II", pos: "n", recProd: "Rec" },
  { id: 537, english: "alcoholic", hebrew: "אלכוהולי", arabic: "كحولي", level: "Band 2", core: "Core II", pos: "adj", recProd: "Rec" },
  { id: 538, english: "alike", hebrew: "דומה", arabic: "متشابه", level: "Band 2", core: "Core II", pos: "adv, adj", recProd: "Rec" },
  { id: 539, english: "all day long", hebrew: "כל היום", arabic: "طوال اليوم", level: "Band 2", core: "Core II", recProd: "Prod" },
  { id: 540, english: "allow", hebrew: "לאפשר", arabic: "يسمح", level: "Band 2", core: "Core II", pos: "v", recProd: "Rec" },
  { id: 541, english: "allowed", hebrew: "מורשה", arabic: "مسموح", level: "Band 2", core: "Core II", pos: "adj", recProd: "Rec" },
  { id: 542, english: "alphabetical", hebrew: "אלפביתי", arabic: "أبجدي", level: "Band 2", core: "Core II", pos: "adj", recProd: "Rec" },
  { id: 543, english: "alphabetically", hebrew: "בסדר אלפביתי", arabic: "ترتيباً أبجدياً", level: "Band 2", core: "Core II", pos: "adv", recProd: "Rec" },
  { id: 544, english: "alternative", hebrew: "חלופה", arabic: "بديل", level: "Band 2", core: "Core II", pos: "n", recProd: "Rec" },
  { id: 545, english: "ancient", hebrew: "עתיק", arabic: "قديم", level: "Band 2", core: "Core II", pos: "adj", recProd: "Rec" },
  { id: 546, english: "and so on", hebrew: "וכו'", arabic: "وهكذا", level: "Band 2", core: "Core II", recProd: "Prod" },
  { id: 547, english: "angel", hebrew: "מלאך", arabic: "ملاك", level: "Band 2", core: "Core II", pos: "n", recProd: "Rec" },
  { id: 548, english: "angry", hebrew: "כועס", arabic: "غاضب", level: "Band 2", core: "Core II", pos: "adj", recProd: "Rec" },
  { id: 549, english: "anger", hebrew: "כעס", arabic: "غضب", level: "Band 2", core: "Core II", pos: "n", recProd: "Rec" },
  { id: 550, english: "ankle", hebrew: "קרסול", arabic: "كاحل", level: "Band 2", core: "Core II", pos: "n", recProd: "Prod" },
];

// ============================================================================
// ALL WORDS - Combined with Spread Operator (FIXED!)
// ============================================================================
export const BAND_1_WORDS: Word[] = [
  { id: 10001, english: "apple", hebrew: "תפוח", arabic: "تفاحة", level: "Band 1", core: "Core I", recProd: "Prod" },
  { id: 10002, english: "boy", hebrew: "ילד", arabic: "ولد", level: "Band 1", core: "Core I", recProd: "Prod" },
  { id: 10003, english: "cat", hebrew: "חתול", arabic: "قطة", level: "Band 1", core: "Core I", recProd: "Prod" },
  { id: 10004, english: "dog", hebrew: "כלב", arabic: "كلب", level: "Band 1", core: "Core I", recProd: "Prod" },
  { id: 10005, english: "egg", hebrew: "ביצה", arabic: "بيضة", level: "Band 1", core: "Core I", recProd: "Prod" },
];

export const BAND_3_WORDS: Word[] = [
  { id: 30001, english: "abandon", hebrew: "לנטוש", arabic: "تخلى", level: "Band 3", core: "Core I", recProd: "Prod" },
  { id: 30002, english: "abundant", hebrew: "שופע", arabic: "وفير", level: "Band 3", core: "Core I", recProd: "Prod" },
  { id: 30003, english: "calculate", hebrew: "לחשב", arabic: "حسب", level: "Band 3", core: "Core I", recProd: "Prod" },
  { id: 30004, english: "dedicate", hebrew: "להקדיש", arabic: "كرس", level: "Band 3", core: "Core I", recProd: "Prod" },
  { id: 30005, english: "elaborate", hebrew: "לפרט", arabic: "فصل", level: "Band 3", core: "Core I", recProd: "Prod" },
];

export const ALL_WORDS: Word[] = [
  ...BAND_1_WORDS,
  ...BAND_2_CORE_I_WORDS,
  ...BAND_2_CORE_II_WORDS,
  ...BAND_3_WORDS,
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get words by Core (Core I or Core II)
 * @param core - "Core I" or "Core II"
 * @returns Array of words for that core
 */
export const getWordsByCore = (core: "Core I" | "Core II"): Word[] => {
  return ALL_WORDS.filter(word => word.core === core);
};

/**
 * Get words by Rec/Prod status
 * @param status - "Rec" or "Prod"
 * @returns Array of words for that status
 */
export const getWordsByRecProd = (status: "Rec" | "Prod"): Word[] => {
  return ALL_WORDS.filter(word => word.recProd === status);
};

/**
 * Search words by English text
 * @param query - Search term
 * @returns Array of matching words
 */
export const searchWords = (query: string): Word[] => {
  const lowerQuery = query.toLowerCase();
  return ALL_WORDS.filter(word => 
    word.english.toLowerCase().includes(lowerQuery) ||
    word.hebrew.includes(query) ||
    word.arabic.includes(query)
  );
};

/**
 * Get random words for games
 * @param count - Number of words to return
 * @returns Array of random words
 */
export const getRandomWords = (count: number): Word[] => {
  const shuffled = [...ALL_WORDS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

/**
 * Get words by ID
 * @param ids - Array of word IDs
 * @returns Array of matching words
 */
export const getWordsByIds = (ids: number[]): Word[] => {
  return ALL_WORDS.filter(word => ids.includes(word.id));
};

// Add this to vocabulary.ts
export const BAND_2_WORDS: Word[] = [
  ...BAND_2_CORE_I_WORDS,
  ...BAND_2_CORE_II_WORDS,
];