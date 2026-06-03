/**
 * category-race-bank.ts — answer bank for the Category Race game mode.
 *
 * Category Race (Scattergories-style):
 *   - A letter is rolled
 *   - The student types one answer per active category that starts
 *     with that letter (English) — e.g. letter=S, animal=Snake, food=Salad
 *   - L1 fallback: a Hebrew/Arabic translation is also accepted, scored
 *     at a reduced rate. The teacher report later surfaces which English
 *     words the student kept substituting in their native language so
 *     the teacher knows what to drill.
 *
 * Coverage in v1: 8 common letters × 12 categories × 3 answers each.
 * Rarer letters (J, K, Q, V, X, Y, Z) are intentionally absent from the
 * roll pool so a round never opens with a letter that has no answers.
 * Expand by adding letters to LETTER_POOL + entries here.
 */
import type { Language } from "../hooks/useLanguage";

export type CategoryId =
  | "country"
  | "city"
  | "animal"
  | "plant"
  | "food"
  | "object"
  | "verb"
  | "adjective"
  | "name"
  | "profession"
  | "sport"
  | "color";

export interface CategoryMeta {
  id: CategoryId;
  emoji: string;
  /** Tailwind gradient applied to the active chip + round-result row. */
  gradient: string;
  labelEn: string;
  labelHe: string;
  labelAr: string;
  /** Example shown as input placeholder when this category is empty,
   *  in the language the student is playing in.  Keep short. */
  placeholderEn: string;
  placeholderHe: string;
  placeholderAr: string;
}

// Ordered easiest → hardest for grade 4-9 EFL learners. This array order is
// the display order of the category tiles in CategoryRaceHostView. Easiest
// first: concrete, high-frequency, picture-able words (colors, animals,
// food). Middle: proper-noun packs that lean on world knowledge (cities,
// countries) and lower-frequency nouns (plants, professions). Hardest last:
// abstract parts of speech (verbs, adjectives). Order is display-only —
// defaults + the answer bank are keyed by id, not position.
export const CATEGORIES: ReadonlyArray<CategoryMeta> = [
  { id: "color",      emoji: "🎨", gradient: "from-pink-500 to-fuchsia-600",   labelEn: "Color",      labelHe: "צבע",       labelAr: "لون",      placeholderEn: "e.g. Silver",    placeholderHe: "למשל כסוף",     placeholderAr: "مثل فضي" },
  { id: "animal",     emoji: "🐾", gradient: "from-amber-500 to-orange-600",   labelEn: "Animal",     labelHe: "חיה",       labelAr: "حيوان",    placeholderEn: "e.g. Tiger",     placeholderHe: "למשל נמר",      placeholderAr: "مثل نمر" },
  { id: "food",       emoji: "🍎", gradient: "from-rose-500 to-pink-600",      labelEn: "Food",       labelHe: "אוכל",      labelAr: "طعام",     placeholderEn: "e.g. Pasta",     placeholderHe: "למשל פסטה",     placeholderAr: "مثل معكرونة" },
  { id: "name",       emoji: "👤", gradient: "from-cyan-500 to-blue-600",      labelEn: "Name",       labelHe: "שם",        labelAr: "اسم",      placeholderEn: "e.g. Sam",       placeholderHe: "למשל שירה",     placeholderAr: "مثل سامي" },
  { id: "object",     emoji: "📦", gradient: "from-stone-500 to-stone-700",    labelEn: "Object",     labelHe: "חפץ",       labelAr: "غرض",      placeholderEn: "e.g. Mirror",    placeholderHe: "למשל מראה",     placeholderAr: "مثل مرآة" },
  { id: "sport",      emoji: "⚽", gradient: "from-orange-500 to-red-600",     labelEn: "Sport",      labelHe: "ספורט",    labelAr: "رياضة",    placeholderEn: "e.g. Tennis",    placeholderHe: "למשל טניס",     placeholderAr: "مثل تنس" },
  { id: "city",       emoji: "🏙️", gradient: "from-sky-500 to-indigo-600",     labelEn: "City",       labelHe: "עיר",       labelAr: "مدينة",    placeholderEn: "e.g. Tokyo",     placeholderHe: "למשל טוקיו",     placeholderAr: "مثل طوكيو" },
  { id: "country",    emoji: "🌍", gradient: "from-emerald-500 to-teal-600",   labelEn: "Country",    labelHe: "מדינה",     labelAr: "دولة",     placeholderEn: "e.g. Spain",     placeholderHe: "למשל ספרד",      placeholderAr: "مثل إسبانيا" },
  { id: "plant",      emoji: "🌳", gradient: "from-lime-500 to-emerald-600",   labelEn: "Plant",      labelHe: "צמח",       labelAr: "نبات",     placeholderEn: "e.g. Rose",      placeholderHe: "למשל ורד",      placeholderAr: "مثل وردة" },
  { id: "profession", emoji: "💼", gradient: "from-indigo-500 to-violet-600",  labelEn: "Profession", labelHe: "מקצוע",    labelAr: "مهنة",     placeholderEn: "e.g. Teacher",   placeholderHe: "למשל מורה",     placeholderAr: "مثل معلم" },
  { id: "verb",       emoji: "🏃", gradient: "from-violet-500 to-purple-600",  labelEn: "Verb",       labelHe: "פועל",      labelAr: "فعل",      placeholderEn: "e.g. Sing",      placeholderHe: "למשל לשיר",     placeholderAr: "مثل غنى" },
  { id: "adjective",  emoji: "✨", gradient: "from-fuchsia-500 to-rose-600",   labelEn: "Adjective",  labelHe: "שם תואר",  labelAr: "صفة",      placeholderEn: "e.g. Soft",      placeholderHe: "למשל רך",       placeholderAr: "مثل ناعم" },
];

/** Letters in the roll pool. Only letters with seeded entries below
 *  should appear here — adding a letter without seeding answers will
 *  give the student an unwinnable round. */
export const LETTER_POOL: ReadonlyArray<string> = ["A", "B", "C", "F", "M", "P", "S", "T"];

export interface Entry {
  /** Canonical English answer.  MUST start with the keyed letter. */
  en: string;
  /** Hebrew translation. */
  he: string;
  /** Arabic translation. */
  ar: string;
}

/** Per-category, per-letter answer bank.  Letters absent for a given
 *  category mean "no canonical answers here" — students who type a
 *  plausible English word still get rejected, which is intentional in
 *  v1.  Adding entries here automatically expands what's accepted. */
export const CATEGORY_ANSWERS: Record<CategoryId, Record<string, Entry[]>> = {
  country: {
    A: [
      { en: "Argentina", he: "ארגנטינה", ar: "الأرجنتين" },
      { en: "Australia", he: "אוסטרליה", ar: "أستراليا" },
      { en: "Austria",   he: "אוסטריה",   ar: "النمسا" },
    ],
    B: [
      { en: "Brazil",   he: "ברזיל",   ar: "البرازيل" },
      { en: "Belgium",  he: "בלגיה",   ar: "بلجيكا" },
      { en: "Bulgaria", he: "בולגריה", ar: "بلغاريا" },
    ],
    C: [
      { en: "Canada",   he: "קנדה",  ar: "كندا" },
      { en: "Chile",    he: "צ׳ילה", ar: "تشيلي" },
      { en: "China",    he: "סין",    ar: "الصين" },
    ],
    F: [
      { en: "France",   he: "צרפת",  ar: "فرنسا" },
      { en: "Finland",  he: "פינלנד", ar: "فنلندا" },
      { en: "Fiji",     he: "פיג׳י",  ar: "فيجي" },
    ],
    M: [
      { en: "Mexico",   he: "מקסיקו", ar: "المكسيك" },
      { en: "Morocco",  he: "מרוקו",  ar: "المغرب" },
      { en: "Malta",    he: "מלטה",   ar: "مالطا" },
    ],
    P: [
      { en: "Portugal", he: "פורטוגל", ar: "البرتغال" },
      { en: "Peru",     he: "פרו",     ar: "بيرو" },
      { en: "Poland",   he: "פולין",   ar: "بولندا" },
    ],
    S: [
      { en: "Spain",    he: "ספרד",   ar: "إسبانيا" },
      { en: "Sweden",   he: "שוודיה", ar: "السويد" },
      { en: "Senegal",  he: "סנגל",   ar: "السنغال" },
    ],
    T: [
      { en: "Turkey",   he: "טורקיה", ar: "تركيا" },
      { en: "Thailand", he: "תאילנד", ar: "تايلاند" },
      { en: "Tunisia",  he: "תוניסיה", ar: "تونس" },
    ],
  },
  city: {
    A: [
      { en: "Athens",    he: "אתונה",     ar: "أثينا" },
      { en: "Amsterdam", he: "אמסטרדם",  ar: "أمستردام" },
      { en: "Ankara",    he: "אנקרה",     ar: "أنقرة" },
    ],
    B: [
      { en: "Barcelona", he: "ברצלונה",  ar: "برشلونة" },
      { en: "Beirut",    he: "ביירות",    ar: "بيروت" },
      { en: "Berlin",    he: "ברלין",     ar: "برلين" },
    ],
    C: [
      { en: "Cairo",     he: "קהיר",      ar: "القاهرة" },
      { en: "Casablanca", he: "קזבלנקה",  ar: "الدار البيضاء" },
      { en: "Chicago",   he: "שיקגו",     ar: "شيكاغو" },
    ],
    F: [
      { en: "Florence",  he: "פירנצה",    ar: "فلورنسا" },
      { en: "Frankfurt", he: "פרנקפורט", ar: "فرانكفورت" },
      { en: "Fes",       he: "פאס",       ar: "فاس" },
    ],
    M: [
      { en: "Madrid",    he: "מדריד",     ar: "مدريد" },
      { en: "Mumbai",    he: "מומבאי",   ar: "مومباي" },
      { en: "Milan",     he: "מילאנו",    ar: "ميلانو" },
    ],
    P: [
      { en: "Paris",     he: "פריז",      ar: "باريس" },
      { en: "Prague",    he: "פראג",      ar: "براغ" },
      { en: "Porto",     he: "פורטו",     ar: "بورتو" },
    ],
    S: [
      { en: "Seoul",     he: "סיאול",     ar: "سيول" },
      { en: "Sydney",    he: "סידני",     ar: "سيدني" },
      { en: "Stockholm", he: "שטוקהולם", ar: "ستوكهولم" },
    ],
    T: [
      { en: "Tokyo",     he: "טוקיו",     ar: "طوكيو" },
      { en: "Toronto",   he: "טורונטו",   ar: "تورنتو" },
      { en: "Tehran",    he: "טהרן",      ar: "طهران" },
    ],
  },
  animal: {
    A: [
      { en: "Ant",     he: "נמלה",  ar: "نملة" },
      { en: "Antelope", he: "אנטילופה", ar: "ظبي" },
      { en: "Alligator", he: "אליגטור", ar: "تمساح" },
    ],
    B: [
      { en: "Bear",    he: "דב",     ar: "دب" },
      { en: "Bee",     he: "דבורה",  ar: "نحلة" },
      { en: "Butterfly", he: "פרפר", ar: "فراشة" },
    ],
    C: [
      { en: "Cat",     he: "חתול",   ar: "قط" },
      { en: "Camel",   he: "גמל",    ar: "جمل" },
      { en: "Cow",     he: "פרה",    ar: "بقرة" },
    ],
    F: [
      { en: "Fox",     he: "שועל",   ar: "ثعلب" },
      { en: "Frog",    he: "צפרדע",  ar: "ضفدع" },
      { en: "Fish",    he: "דג",     ar: "سمكة" },
    ],
    M: [
      { en: "Mouse",   he: "עכבר",   ar: "فأر" },
      { en: "Monkey",  he: "קוף",    ar: "قرد" },
      { en: "Moose",   he: "מוס",    ar: "موظ" },
    ],
    P: [
      { en: "Pig",     he: "חזיר",   ar: "خنزير" },
      { en: "Parrot",  he: "תוכי",   ar: "ببغاء" },
      { en: "Panda",   he: "פנדה",   ar: "باندا" },
    ],
    S: [
      { en: "Snake",   he: "נחש",    ar: "ثعبان" },
      { en: "Shark",   he: "כריש",   ar: "قرش" },
      { en: "Sheep",   he: "כבש",    ar: "خروف" },
    ],
    T: [
      { en: "Tiger",   he: "נמר",    ar: "نمر" },
      { en: "Turtle",  he: "צב",     ar: "سلحفاة" },
      { en: "Turkey",  he: "תרנגול הודו", ar: "ديك رومي" },
    ],
  },
  plant: {
    A: [
      { en: "Apple tree", he: "עץ תפוח", ar: "شجرة تفاح" },
      { en: "Aloe",       he: "אלוורה",  ar: "صبار" },
      { en: "Acorn",      he: "בלוט",    ar: "بلوط" },
    ],
    B: [
      { en: "Bamboo",     he: "במבוק",   ar: "خيزران" },
      { en: "Basil",      he: "בזיליקום", ar: "ريحان" },
      { en: "Bush",       he: "שיח",     ar: "شجيرة" },
    ],
    C: [
      { en: "Cactus",     he: "קקטוס",   ar: "صبار" },
      { en: "Cedar",      he: "ארז",     ar: "أرز" },
      { en: "Clover",     he: "תלתן",    ar: "برسيم" },
    ],
    F: [
      { en: "Fern",       he: "שרך",     ar: "سرخس" },
      { en: "Fig tree",   he: "עץ תאנה", ar: "شجرة تين" },
      { en: "Flower",     he: "פרח",     ar: "زهرة" },
    ],
    M: [
      { en: "Maple",      he: "אדר",     ar: "قيقب" },
      { en: "Mint",       he: "נענע",    ar: "نعناع" },
      { en: "Moss",       he: "טחב",     ar: "طحلب" },
    ],
    P: [
      { en: "Palm",       he: "דקל",     ar: "نخلة" },
      { en: "Pine",       he: "אורן",    ar: "صنوبر" },
      { en: "Poppy",      he: "פרג",     ar: "خشخاش" },
    ],
    S: [
      { en: "Sunflower",  he: "חמנייה",  ar: "عباد الشمس" },
      { en: "Sage",       he: "מרווה",   ar: "ميرمية" },
      { en: "Spruce",     he: "אשוח",    ar: "تنوب" },
    ],
    T: [
      { en: "Tree",       he: "עץ",      ar: "شجرة" },
      { en: "Tulip",      he: "צבעוני",  ar: "زنبق" },
      { en: "Thyme",      he: "טימין",   ar: "زعتر" },
    ],
  },
  food: {
    A: [
      { en: "Apple",     he: "תפוח",    ar: "تفاحة" },
      { en: "Almond",    he: "שקד",     ar: "لوز" },
      { en: "Avocado",   he: "אבוקדו",  ar: "أفوكادو" },
    ],
    B: [
      { en: "Bread",     he: "לחם",     ar: "خبز" },
      { en: "Banana",    he: "בננה",    ar: "موزة" },
      { en: "Burger",    he: "המבורגר", ar: "همبرغر" },
    ],
    C: [
      { en: "Cake",      he: "עוגה",    ar: "كعكة" },
      { en: "Cheese",    he: "גבינה",   ar: "جبن" },
      { en: "Chocolate", he: "שוקולד",  ar: "شوكولاتة" },
    ],
    F: [
      { en: "Fish",      he: "דג",      ar: "سمك" },
      { en: "Fries",     he: "צ׳יפס",   ar: "بطاطس مقلية" },
      { en: "Fruit",     he: "פרי",     ar: "فاكهة" },
    ],
    M: [
      { en: "Milk",      he: "חלב",     ar: "حليب" },
      { en: "Mango",     he: "מנגו",    ar: "مانجو" },
      { en: "Meat",      he: "בשר",     ar: "لحم" },
    ],
    P: [
      { en: "Pizza",     he: "פיצה",    ar: "بيتزا" },
      { en: "Pasta",     he: "פסטה",    ar: "معكرونة" },
      { en: "Pear",      he: "אגס",     ar: "إجاص" },
    ],
    S: [
      { en: "Salad",     he: "סלט",     ar: "سلطة" },
      { en: "Soup",      he: "מרק",     ar: "حساء" },
      { en: "Sandwich",  he: "סנדוויץ׳", ar: "شطيرة" },
    ],
    T: [
      { en: "Tomato",    he: "עגבנייה", ar: "طماطم" },
      { en: "Tea",       he: "תה",      ar: "شاي" },
      { en: "Toast",     he: "טוסט",    ar: "خبز محمص" },
    ],
  },
  object: {
    A: [
      { en: "Apron",     he: "סינר",    ar: "مريلة" },
      { en: "Anchor",    he: "עוגן",    ar: "مرساة" },
      { en: "Album",     he: "אלבום",   ar: "ألبوم" },
    ],
    B: [
      { en: "Book",      he: "ספר",     ar: "كتاب" },
      { en: "Bag",       he: "תיק",     ar: "حقيبة" },
      { en: "Bottle",    he: "בקבוק",   ar: "زجاجة" },
    ],
    C: [
      { en: "Chair",     he: "כיסא",    ar: "كرسي" },
      { en: "Clock",     he: "שעון",    ar: "ساعة" },
      { en: "Cup",       he: "כוס",     ar: "كوب" },
    ],
    F: [
      { en: "Fork",      he: "מזלג",    ar: "شوكة" },
      { en: "Fan",       he: "מאוורר",  ar: "مروحة" },
      { en: "Flag",      he: "דגל",     ar: "علم" },
    ],
    M: [
      { en: "Mirror",    he: "מראה",    ar: "مرآة" },
      { en: "Map",       he: "מפה",     ar: "خريطة" },
      { en: "Mug",       he: "ספל",     ar: "كوب" },
    ],
    P: [
      { en: "Pen",       he: "עט",      ar: "قلم" },
      { en: "Pillow",    he: "כרית",    ar: "وسادة" },
      { en: "Phone",     he: "טלפון",   ar: "هاتف" },
    ],
    S: [
      { en: "Spoon",     he: "כף",      ar: "ملعقة" },
      { en: "Shoe",      he: "נעל",     ar: "حذاء" },
      { en: "Scissors",  he: "מספריים", ar: "مقص" },
    ],
    T: [
      { en: "Table",     he: "שולחן",   ar: "طاولة" },
      { en: "Towel",     he: "מגבת",    ar: "منشفة" },
      { en: "Toothbrush", he: "מברשת שיניים", ar: "فرشاة أسنان" },
    ],
  },
  verb: {
    A: [
      { en: "Ask",       he: "לשאול",   ar: "سأل" },
      { en: "Answer",    he: "לענות",   ar: "أجاب" },
      { en: "Add",       he: "להוסיף",  ar: "أضاف" },
    ],
    B: [
      { en: "Build",     he: "לבנות",   ar: "بنى" },
      { en: "Buy",       he: "לקנות",   ar: "اشترى" },
      { en: "Bring",     he: "להביא",   ar: "أحضر" },
    ],
    C: [
      { en: "Climb",     he: "לטפס",    ar: "تسلق" },
      { en: "Clean",     he: "לנקות",   ar: "نظف" },
      { en: "Carry",     he: "לסחוב",   ar: "حمل" },
    ],
    F: [
      { en: "Fly",       he: "לעוף",    ar: "طار" },
      { en: "Find",      he: "למצוא",   ar: "وجد" },
      { en: "Fix",       he: "לתקן",    ar: "أصلح" },
    ],
    M: [
      { en: "Make",      he: "לעשות",   ar: "صنع" },
      { en: "Move",      he: "לזוז",    ar: "تحرك" },
      { en: "Meet",      he: "לפגוש",   ar: "قابل" },
    ],
    P: [
      { en: "Play",      he: "לשחק",    ar: "لعب" },
      { en: "Paint",     he: "לצייר",   ar: "رسم" },
      { en: "Push",      he: "לדחוף",   ar: "دفع" },
    ],
    S: [
      { en: "Sing",      he: "לשיר",    ar: "غنى" },
      { en: "Sleep",     he: "לישון",   ar: "نام" },
      { en: "Swim",      he: "לשחות",   ar: "سبح" },
    ],
    T: [
      { en: "Talk",      he: "לדבר",    ar: "تكلم" },
      { en: "Throw",     he: "לזרוק",   ar: "رمى" },
      { en: "Travel",    he: "לטייל",   ar: "سافر" },
    ],
  },
  adjective: {
    A: [
      { en: "Angry",     he: "כועס",    ar: "غاضب" },
      { en: "Amazing",   he: "מדהים",   ar: "رائع" },
      { en: "Ancient",   he: "עתיק",    ar: "قديم" },
    ],
    B: [
      { en: "Big",       he: "גדול",    ar: "كبير" },
      { en: "Brave",     he: "אמיץ",    ar: "شجاع" },
      { en: "Bright",    he: "בהיר",    ar: "ساطع" },
    ],
    C: [
      { en: "Cold",      he: "קר",      ar: "بارد" },
      { en: "Calm",      he: "רגוע",    ar: "هادئ" },
      { en: "Clever",    he: "חכם",     ar: "ذكي" },
    ],
    F: [
      { en: "Fast",      he: "מהיר",    ar: "سريع" },
      { en: "Funny",     he: "מצחיק",   ar: "مضحك" },
      { en: "Friendly",  he: "ידידותי", ar: "ودود" },
    ],
    M: [
      { en: "Mighty",    he: "אדיר",    ar: "قوي" },
      { en: "Modern",    he: "מודרני",  ar: "حديث" },
      { en: "Mild",      he: "עדין",    ar: "معتدل" },
    ],
    P: [
      { en: "Pretty",    he: "יפה",     ar: "جميل" },
      { en: "Polite",    he: "מנומס",   ar: "مهذب" },
      { en: "Proud",     he: "גאה",     ar: "فخور" },
    ],
    S: [
      { en: "Soft",      he: "רך",      ar: "ناعم" },
      { en: "Strong",    he: "חזק",     ar: "قوي" },
      { en: "Smart",     he: "חכם",     ar: "ذكي" },
    ],
    T: [
      { en: "Tall",      he: "גבוה",    ar: "طويل" },
      { en: "Tiny",      he: "זעיר",    ar: "ضئيل" },
      { en: "Tired",     he: "עייף",    ar: "متعب" },
    ],
  },
  name: {
    A: [
      { en: "Alex",   he: "אלכס",  ar: "أليكس" },
      { en: "Anna",   he: "אנה",   ar: "آنا" },
      { en: "Adam",   he: "אדם",   ar: "آدم" },
    ],
    B: [
      { en: "Ben",    he: "בן",    ar: "بن" },
      { en: "Bella",  he: "בלה",   ar: "بيلا" },
      { en: "Bilal",  he: "בילאל", ar: "بلال" },
    ],
    C: [
      { en: "Chris",  he: "כריס",  ar: "كريس" },
      { en: "Clara",  he: "קלרה",  ar: "كلارا" },
      { en: "Carla",  he: "קרלה",  ar: "كارلا" },
    ],
    F: [
      { en: "Fadi",   he: "פאדי",  ar: "فادي" },
      { en: "Frank",  he: "פרנק",  ar: "فرانك" },
      { en: "Fatima", he: "פטימה", ar: "فاطمة" },
    ],
    M: [
      { en: "Mia",    he: "מיה",   ar: "ميا" },
      { en: "Maya",   he: "מאיה",  ar: "مايا" },
      { en: "Mohammed", he: "מוחמד", ar: "محمد" },
    ],
    P: [
      { en: "Peter",  he: "פיטר",  ar: "بيتر" },
      { en: "Paul",   he: "פול",   ar: "بول" },
      { en: "Priya",  he: "פריה",  ar: "بريا" },
    ],
    S: [
      { en: "Sam",    he: "סם",    ar: "سام" },
      { en: "Sara",   he: "שרה",   ar: "سارة" },
      { en: "Sami",   he: "סאמי",  ar: "سامي" },
    ],
    T: [
      { en: "Tom",    he: "תום",   ar: "توم" },
      { en: "Tamar",  he: "תמר",   ar: "تمار" },
      { en: "Tariq",  he: "טאריק", ar: "طارق" },
    ],
  },
  profession: {
    A: [
      { en: "Artist",     he: "אמן",     ar: "فنان" },
      { en: "Architect",  he: "אדריכל",  ar: "مهندس معماري" },
      { en: "Actor",      he: "שחקן",    ar: "ممثل" },
    ],
    B: [
      { en: "Baker",      he: "אופה",    ar: "خباز" },
      { en: "Builder",    he: "בנאי",    ar: "بنّاء" },
      { en: "Banker",     he: "בנקאי",   ar: "مصرفي" },
    ],
    C: [
      { en: "Chef",       he: "שף",      ar: "طاهٍ" },
      { en: "Carpenter",  he: "נגר",     ar: "نجار" },
      { en: "Cleaner",    he: "מנקה",    ar: "عامل نظافة" },
    ],
    F: [
      { en: "Farmer",     he: "חקלאי",   ar: "مزارع" },
      { en: "Firefighter", he: "כבאי",   ar: "إطفائي" },
      { en: "Fisherman",  he: "דייג",    ar: "صياد" },
    ],
    M: [
      { en: "Musician",   he: "מוזיקאי", ar: "موسيقي" },
      { en: "Mechanic",   he: "מכונאי",  ar: "ميكانيكي" },
      { en: "Manager",    he: "מנהל",    ar: "مدير" },
    ],
    P: [
      { en: "Pilot",      he: "טייס",    ar: "طيار" },
      { en: "Painter",    he: "צייר",    ar: "رسام" },
      { en: "Plumber",    he: "שרברב",   ar: "سباك" },
    ],
    S: [
      { en: "Singer",     he: "זמר",     ar: "مغني" },
      { en: "Scientist",  he: "מדען",    ar: "عالم" },
      { en: "Soldier",    he: "חייל",    ar: "جندي" },
    ],
    T: [
      { en: "Teacher",    he: "מורה",    ar: "معلم" },
      { en: "Tailor",     he: "חייט",    ar: "خياط" },
      { en: "Translator", he: "מתרגם",   ar: "مترجم" },
    ],
  },
  sport: {
    A: [
      { en: "Archery",     he: "קשתות",     ar: "رماية" },
      { en: "Athletics",   he: "אתלטיקה",   ar: "ألعاب القوى" },
      { en: "Aerobics",    he: "אירובי",    ar: "أيروبيك" },
    ],
    B: [
      { en: "Basketball", he: "כדורסל",    ar: "كرة السلة" },
      { en: "Baseball",   he: "בייסבול",   ar: "بيسبول" },
      { en: "Boxing",     he: "איגרוף",    ar: "ملاكمة" },
    ],
    C: [
      { en: "Cricket",    he: "קריקט",     ar: "كريكيت" },
      { en: "Climbing",   he: "טיפוס",     ar: "تسلق" },
      { en: "Cycling",    he: "רכיבה",     ar: "ركوب الدراجات" },
    ],
    F: [
      { en: "Football",   he: "כדורגל",    ar: "كرة القدم" },
      { en: "Fencing",    he: "סיוף",      ar: "مبارزة" },
      { en: "Fishing",    he: "דיג",       ar: "صيد السمك" },
    ],
    M: [
      { en: "MMA",        he: "אומנויות לחימה", ar: "فنون قتالية" },
      { en: "Marathon",   he: "מרתון",      ar: "ماراثون" },
      { en: "Motocross",  he: "מוטוקרוס",   ar: "موتوكروس" },
    ],
    P: [
      { en: "Polo",       he: "פולו",       ar: "بولو" },
      { en: "Padel",      he: "פאדל",       ar: "بادل" },
      { en: "Ping pong",  he: "טניס שולחן", ar: "تنس الطاولة" },
    ],
    S: [
      { en: "Soccer",     he: "כדורגל",     ar: "كرة القدم" },
      { en: "Swimming",   he: "שחייה",      ar: "سباحة" },
      { en: "Skiing",     he: "סקי",        ar: "تزلج" },
    ],
    T: [
      { en: "Tennis",     he: "טניס",       ar: "تنس" },
      { en: "Taekwondo",  he: "טאקוונדו",   ar: "تايكوندو" },
      { en: "Triathlon",  he: "טריאתלון",   ar: "ترياثلون" },
    ],
  },
  color: {
    A: [
      { en: "Amber",     he: "ענבר",      ar: "كهرماني" },
      { en: "Aqua",      he: "אקווה",     ar: "أزرق مائي" },
      { en: "Azure",     he: "תכלת",      ar: "أزرق سماوي" },
    ],
    B: [
      { en: "Blue",      he: "כחול",      ar: "أزرق" },
      { en: "Brown",     he: "חום",       ar: "بني" },
      { en: "Beige",     he: "בז׳",       ar: "بيج" },
    ],
    C: [
      { en: "Cyan",      he: "ציאן",      ar: "سماوي" },
      { en: "Crimson",   he: "ארגמן",     ar: "قرمزي" },
      { en: "Coral",     he: "אלמוג",     ar: "مرجاني" },
    ],
    F: [
      { en: "Fuchsia",   he: "פוקסיה",    ar: "فوشيا" },
      { en: "Forest green", he: "ירוק יער", ar: "أخضر غابي" },
      { en: "Flame",     he: "להבה",      ar: "لهبي" },
    ],
    M: [
      { en: "Magenta",   he: "מג׳נטה",    ar: "أرجواني" },
      { en: "Mint",      he: "מנטה",      ar: "نعناعي" },
      { en: "Mauve",     he: "סגול עמום", ar: "بنفسجي فاتح" },
    ],
    P: [
      { en: "Pink",      he: "ורוד",      ar: "وردي" },
      { en: "Purple",    he: "סגול",      ar: "بنفسجي" },
      { en: "Peach",     he: "אפרסק",     ar: "خوخي" },
    ],
    S: [
      { en: "Silver",    he: "כסוף",      ar: "فضي" },
      { en: "Scarlet",   he: "שני",       ar: "قرمزي" },
      { en: "Sky blue",  he: "תכלת",      ar: "أزرق سماوي" },
    ],
    T: [
      { en: "Turquoise", he: "טורקיז",    ar: "فيروزي" },
      { en: "Tan",       he: "שזוף",      ar: "أسمر فاتح" },
      { en: "Teal",      he: "טורקיז כהה", ar: "أزرق مخضر" },
    ],
  },
};

export type AnswerLanguage = "en" | "he" | "ar";

export interface ValidationResult {
  /** Did the input match any seeded answer for the (category, letter) pair? */
  valid: boolean;
  /** Canonical English answer the input mapped to (for L1 fallback reports). */
  matchedEn: string | null;
  /** Which language bucket the matched string came from.  When the
   *  student typed Hebrew/Arabic but the category had a matching
   *  translation, this is 'he' or 'ar' and the teacher report will
   *  surface it as a "needs English drilling" signal. */
  matchedLanguage: AnswerLanguage | null;
}

/**
 * Normalize a raw input string for matching. Lowercases, trims, and
 * collapses internal whitespace. Hebrew/Arabic stay intact (no case);
 * English gets lowercased so "Spain" === "spain". We deliberately do
 * NOT strip diacritics — Hebrew niqqud is rarely typed by students at
 * grade 4-9, and Arabic shadda variants are similarly uncommon, so
 * the seeded forms above are the unpointed forms students actually
 * type.
 */
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Levenshtein edit distance, capped — bails early when lengths differ by
 *  more than 2 (can't be within our spelling-grace threshold anyway). */
function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 99;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** All canonical answers for a (category, letter) cell — powers the
 *  student "need ideas?" suggestions + the first-letters hint. */
export function answersFor(category: CategoryId, letter: string): Entry[] {
  return CATEGORY_ANSWERS[category]?.[letter.toUpperCase()] ?? [];
}

/** Validate a single answer for one (category, letter) cell. */
export function validateAnswer(
  category: CategoryId,
  letter: string,
  input: string,
): ValidationResult {
  const trimmed = input.trim();
  if (!trimmed) return { valid: false, matchedEn: null, matchedLanguage: null };

  const bank = CATEGORY_ANSWERS[category]?.[letter.toUpperCase()];
  if (!bank || bank.length === 0) {
    return { valid: false, matchedEn: null, matchedLanguage: null };
  }

  const normalizedInput = normalize(trimmed);

  for (const entry of bank) {
    if (normalize(entry.en) === normalizedInput) {
      return { valid: true, matchedEn: entry.en, matchedLanguage: "en" };
    }
    if (entry.he && entry.he.trim() === trimmed) {
      return { valid: true, matchedEn: entry.en, matchedLanguage: "he" };
    }
    if (entry.ar && entry.ar.trim() === trimmed) {
      return { valid: true, matchedEn: entry.en, matchedLanguage: "ar" };
    }
  }

  // Spelling grace: no exact hit, so accept a near-miss English answer —
  // 1 edit for short words, 2 for longer ones — so a weaker speller who
  // typed "snak" / "aple" / "tigr" still gets credit. Match against the
  // closest entry only, to limit false positives.
  let best: { en: string; dist: number; len: number } | null = null;
  for (const entry of bank) {
    const target = normalize(entry.en);
    const d = editDistance(normalizedInput, target);
    if (best === null || d < best.dist) best = { en: entry.en, dist: d, len: target.length };
  }
  if (best && best.dist <= (best.len >= 6 ? 2 : 1)) {
    return { valid: true, matchedEn: best.en, matchedLanguage: "en" };
  }

  return { valid: false, matchedEn: null, matchedLanguage: null };
}

/** Pick a random letter from the roll pool. */
export function rollLetter(exclude?: ReadonlySet<string>): string {
  const pool = exclude
    ? LETTER_POOL.filter(l => !exclude.has(l))
    : LETTER_POOL;
  const source = pool.length > 0 ? pool : LETTER_POOL;
  return source[Math.floor(Math.random() * source.length)];
}

/** Resolve a category's localized label. */
export function categoryLabel(cat: CategoryMeta, language: Language): string {
  if (language === "he") return cat.labelHe;
  if (language === "ar") return cat.labelAr;
  return cat.labelEn;
}

/** Resolve a category's localized placeholder. */
export function categoryPlaceholder(cat: CategoryMeta, language: Language): string {
  if (language === "he") return cat.placeholderHe;
  if (language === "ar") return cat.placeholderAr;
  return cat.placeholderEn;
}
