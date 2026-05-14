// Shop catalogue translations — names + descriptions for every item in
// `src/constants/game.ts`. Keyed by stable item id so the source-of-truth
// constants can be reordered without breaking translations.
//
// EN is the canonical source. HE / AR are AI-drafted by
// `scripts/translate-catalog.ts` (Phase 2 of the shop redesign) and
// later polished by native speakers. Missing entries fall back to EN
// via `catalogName` / `catalogDesc` helpers below.

import type { Language } from '../../hooks/useLanguage';

interface Entry {
  name: string;
  desc?: string;
  display?: string;
}

export type CatalogSection =
  | 'avatars'
  | 'themes'
  | 'eggs'
  | 'powerUps'
  | 'boosters'
  | 'frames'
  | 'titles'
  | 'categories';

type Catalog = Partial<Record<CatalogSection, Record<string, Entry>>>;

const en: Catalog = {
  avatars: {
    dragon:         { name: 'Dragon' },
    eagle:          { name: 'Eagle' },
    wolf:           { name: 'Wolf' },
    dinosaur:       { name: 'Dinosaur' },
    wizard:         { name: 'Wizard' },
    superhero:      { name: 'Superhero' },
    alien:          { name: 'Alien' },
    prince:         { name: 'Prince' },
    princess:       { name: 'Princess' },
    unicorn:        { name: 'Unicorn' },
    dragon_face:    { name: 'Dragon Face' },
    vampire:        { name: 'Vampire' },
    merperson:      { name: 'Merperson' },
    ninja:          { name: 'Ninja' },
    robot:          { name: 'Robot' },
    goat:           { name: 'GOAT' },
    astronaut:      { name: 'Astronaut' },
    coder:          { name: 'Coder' },
    witch:          { name: 'Witch' },
    super_villain:  { name: 'Super Villain' },
    dj:             { name: 'DJ' },
    pro_gamer:      { name: 'Pro Gamer' },
    champion:       { name: 'Champion' },
    cyborg:         { name: 'Cyborg' },
    elf:            { name: 'Elf' },
    genie:          { name: 'Genie' },
    kraken:         { name: 'Kraken' },
    owl_sage:       { name: 'Owl Sage' },
    planet_master:  { name: 'Planet Master' },
    lightning:      { name: 'Lightning' },
  },

  themes: {
    default:  { name: 'Classic' },
    dark:     { name: 'Dark Mode' },
    ocean:    { name: 'Ocean' },
    sunset:   { name: 'Sunset' },
    neon:     { name: 'Neon' },
    forest:   { name: 'Forest' },
    royal:    { name: 'Royal' },
    galaxy:   { name: 'Galaxy' },
    aurora:   { name: 'Aurora' },
    retro80:  { name: 'Retro 80s' },
    sakura:   { name: 'Sakura' },
    chill:    { name: 'Chill Mode' },
    esports:  { name: 'Esports RGB' },
  },

  eggs: {
    starter_egg:    { name: 'Starter Egg',    desc: 'A simple egg. Drops 25-80 XP — roughly break-even.' },
    golden_egg:     { name: 'Golden Egg',     desc: 'Sparkles gold. Drops 80-220 XP + a chance of a rare avatar.' },
    dragon_egg:     { name: 'Dragon Egg',     desc: 'Something mighty inside. Drops 200-550 XP.' },
    treasure_chest: { name: 'Treasure Chest', desc: 'Premium loot. Drops 350-800 XP + guaranteed cosmetic.' },
    cosmic_egg:     { name: 'Cosmic Egg',     desc: 'Made of stardust. Drops 600-1400 XP + a premium title.' },
    rainbow_egg:    { name: 'Rainbow Egg',    desc: 'The rarest egg. Drops 1200-2600 XP + a random premium avatar.' },
  },

  powerUps: {
    skip:          { name: 'Skip Word',     desc: 'Skip the current word without penalty' },
    fifty_fifty:   { name: '50/50',         desc: 'Remove 2 wrong answers' },
    reveal_letter: { name: 'Reveal Letter', desc: 'Reveal the first letter in spelling mode' },
  },

  boosters: {
    streak_freeze:   { name: 'Streak Freeze',   desc: 'Protect your streak for 1 missed day' },
    xp_booster:      { name: '2× XP Booster',   desc: 'Double XP for 24 hours' },
    lucky_charm:     { name: 'Lucky Charm',     desc: 'Your first wrong answer in the next game is forgiven' },
    weekend_warrior: { name: 'Weekend Warrior', desc: '2× XP for an entire weekend' },
  },

  frames: {
    gold:        { name: 'Gold Frame' },
    fire:        { name: 'Fire Frame' },
    diamond:     { name: 'Diamond Frame' },
    rainbow:     { name: 'Rainbow Frame' },
    lightning:   { name: 'Lightning Frame' },
    crown:       { name: 'Crown Frame' },
    neon_glow:   { name: 'Neon Glow' },
    galaxy:      { name: 'Galaxy' },
    pixel:       { name: 'Pixel 8-bit' },
    holographic: { name: 'Holographic' },
  },

  titles: {
    champion:       { name: 'Champion',       display: 'Champion' },
    genius:         { name: 'Genius',         display: 'Genius' },
    word_wizard:    { name: 'Word Wizard',    display: 'Word Wizard' },
    vocab_king:     { name: 'Vocab King',     display: 'Vocab King' },
    vocab_queen:    { name: 'Vocab Queen',    display: 'Vocab Queen' },
    speed_demon:    { name: 'Speed Demon',    display: 'Speed Demon' },
    legend:         { name: 'Living Legend',  display: 'Living Legend' },
    brain:          { name: 'Big Brain',      display: 'Big Brain' },
    main_character: { name: 'Main Character', display: 'Main Character' },
    goated:         { name: 'GOATed',         display: '🐐 GOATed' },
    aura_farmer:    { name: 'Aura Farmer',    display: 'Aura Farmer' },
    final_boss:     { name: 'Final Boss',     display: 'Final Boss' },
    rizzler:        { name: 'Rizzler',        display: 'The Rizzler' },
    chosen_one:     { name: 'Chosen One',     display: 'The Chosen One' },
    speedrunner:    { name: 'Speedrunner',    display: 'Speedrunner' },
    cracked:        { name: 'Cracked',        display: 'Cracked' },
  },

  categories: {
    Animals:        { name: 'Animals' },
    Faces:          { name: 'Faces' },
    GamerSquad:     { name: 'Gamer Squad' },
    SnackAttack:    { name: 'Snack Attack' },
    FootballStars:  { name: 'Football Stars' },
    Food:           { name: 'Food' },
    Nature:         { name: 'Nature' },
    Sports:         { name: 'Sports' },
    JurassicMode:   { name: 'Jurassic Mode' },
    CreatorPack:    { name: 'Creator Pack' },
    Objects:        { name: 'Objects' },
    Vehicles:       { name: 'Vehicles' },
    LabRats:        { name: 'Lab Rats' },
    WarriorPack:    { name: 'Warrior Pack' },
    Fantasy:        { name: 'Fantasy' },
    SpaceLegends:   { name: 'Space Legends' },
    Space:          { name: 'Space' },
    Free:           { name: 'Free' },
  },
};

// AI-drafted Hebrew translations (Phase 2). Audience: Israeli school
// students grades 4-9. Defaults to masculine grammar to match how MoE
// textbooks address the reader. Gen-Z slang titles (GOATed, Rizzler) are
// kept in English / transliterated since Hebrew-speaking kids use them
// natively. Pending native-speaker polish.
const he: Catalog = {
  avatars: {
    dragon:         { name: 'דרקון' },
    eagle:          { name: 'נשר' },
    wolf:           { name: 'זאב' },
    dinosaur:       { name: 'דינוזאור' },
    wizard:         { name: 'קוסם' },
    superhero:      { name: 'גיבור-על' },
    alien:          { name: 'חייזר' },
    prince:         { name: 'נסיך' },
    princess:       { name: 'נסיכה' },
    unicorn:        { name: 'חד-קרן' },
    dragon_face:    { name: 'ראש דרקון' },
    vampire:        { name: 'ערפד' },
    merperson:      { name: 'בן-ים' },
    ninja:          { name: 'נינג׳ה' },
    robot:          { name: 'רובוט' },
    goat:           { name: 'GOAT' },
    astronaut:      { name: 'אסטרונאוט' },
    coder:          { name: 'מתכנת' },
    witch:          { name: 'מכשפה' },
    super_villain:  { name: 'על-נבל' },
    dj:             { name: 'די-ג׳יי' },
    pro_gamer:      { name: 'גיימר מקצועי' },
    champion:       { name: 'אלוף' },
    cyborg:         { name: 'סייבורג' },
    elf:            { name: 'שדון' },
    genie:          { name: 'ג׳יני' },
    kraken:         { name: 'קראקן' },
    owl_sage:       { name: 'ינשוף חכם' },
    planet_master:  { name: 'שליט הכוכבים' },
    lightning:      { name: 'ברק' },
  },

  themes: {
    default:  { name: 'קלאסי' },
    dark:     { name: 'מצב חשוך' },
    ocean:    { name: 'אוקיינוס' },
    sunset:   { name: 'שקיעה' },
    neon:     { name: 'ניאון' },
    forest:   { name: 'יער' },
    royal:    { name: 'מלכותי' },
    galaxy:   { name: 'גלקסיה' },
    aurora:   { name: 'אורורה' },
    retro80:  { name: 'רטרו 80' },
    sakura:   { name: 'סאקורה' },
    chill:    { name: 'מצב רגוע' },
    esports:  { name: 'אספורט RGB' },
  },

  eggs: {
    starter_egg:    { name: 'ביצת מתחילים',  desc: 'ביצה פשוטה. נופלת 25-80 XP — בערך תיקו.' },
    golden_egg:     { name: 'ביצת זהב',       desc: 'נוצצת בזהב. נופלת 80-220 XP + סיכוי לאוואטר נדיר.' },
    dragon_egg:     { name: 'ביצת דרקון',     desc: 'משהו עוצמתי בפנים. נופלת 200-550 XP.' },
    treasure_chest: { name: 'תיבת אוצר',      desc: 'שלל פרימיום. נופלת 350-800 XP + קוסמטיקה מובטחת.' },
    cosmic_egg:     { name: 'ביצה קוסמית',    desc: 'עשויה מאבק כוכבים. נופלת 600-1400 XP + תואר פרימיום.' },
    rainbow_egg:    { name: 'ביצת קשת',       desc: 'הביצה הנדירה ביותר. נופלת 1200-2600 XP + אוואטר פרימיום אקראי.' },
  },

  powerUps: {
    skip:          { name: 'דלג על מילה',  desc: 'דלג על המילה הנוכחית בלי עונש' },
    fifty_fifty:   { name: '50/50',         desc: 'הסר 2 תשובות שגויות' },
    reveal_letter: { name: 'גלה אות',       desc: 'חשוף את האות הראשונה במצב איות' },
  },

  boosters: {
    streak_freeze:   { name: 'הקפאת רצף',    desc: 'הגן על הרצף שלך ליום אחד חסר' },
    xp_booster:      { name: 'בוסטר 2× XP',  desc: 'הכפלת XP ל-24 שעות' },
    lucky_charm:     { name: 'קמע מזל',       desc: 'התשובה השגויה הראשונה במשחק הבא נסלחת' },
    weekend_warrior: { name: 'לוחם סופ״ש',   desc: '2× XP לכל סוף השבוע' },
  },

  frames: {
    gold:        { name: 'מסגרת זהב' },
    fire:        { name: 'מסגרת אש' },
    diamond:     { name: 'מסגרת יהלום' },
    rainbow:     { name: 'מסגרת קשת' },
    lightning:   { name: 'מסגרת ברק' },
    crown:       { name: 'מסגרת כתר' },
    neon_glow:   { name: 'זוהר ניאון' },
    galaxy:      { name: 'גלקסיה' },
    pixel:       { name: 'פיקסל 8-ביט' },
    holographic: { name: 'הולוגרפי' },
  },

  titles: {
    champion:       { name: 'אלוף',           display: 'אלוף' },
    genius:         { name: 'גאון',           display: 'גאון' },
    word_wizard:    { name: 'קוסם המילים',     display: 'קוסם המילים' },
    vocab_king:     { name: 'מלך אוצר המילים', display: 'מלך אוצר המילים' },
    vocab_queen:    { name: 'מלכת אוצר המילים', display: 'מלכת אוצר המילים' },
    speed_demon:    { name: 'שד מהירות',       display: 'שד מהירות' },
    legend:         { name: 'אגדה חיה',        display: 'אגדה חיה' },
    brain:          { name: 'מוח גדול',        display: 'מוח גדול' },
    main_character: { name: 'דמות ראשית',      display: 'דמות ראשית' },
    goated:         { name: 'GOATed',         display: '🐐 GOATed' },
    aura_farmer:    { name: 'חוואי אאורה',    display: 'חוואי אאורה' },
    final_boss:     { name: 'בוס סופי',        display: 'בוס סופי' },
    rizzler:        { name: 'ריזלר',          display: 'הריזלר' },
    chosen_one:     { name: 'הנבחר',          display: 'הנבחר' },
    speedrunner:    { name: 'רץ-מהיר',         display: 'רץ-מהיר' },
    cracked:        { name: 'קראקד',          display: 'קראקד' },
  },

  categories: {
    Animals:        { name: 'חיות' },
    Faces:          { name: 'פרצופים' },
    GamerSquad:     { name: 'צוות גיימרים' },
    SnackAttack:    { name: 'חטיף-מתקפה' },
    FootballStars:  { name: 'כוכבי כדורגל' },
    Food:           { name: 'אוכל' },
    Nature:         { name: 'טבע' },
    Sports:         { name: 'ספורט' },
    JurassicMode:   { name: 'מצב יורה' },
    CreatorPack:    { name: 'חבילת יוצרים' },
    Objects:        { name: 'חפצים' },
    Vehicles:       { name: 'כלי רכב' },
    LabRats:        { name: 'עכברי מעבדה' },
    WarriorPack:    { name: 'חבילת לוחמים' },
    Fantasy:        { name: 'פנטזיה' },
    SpaceLegends:   { name: 'אגדות החלל' },
    Space:          { name: 'חלל' },
    Free:           { name: 'חינם' },
  },
};

// AI-drafted Arabic translations (Phase 2). Audience: Arab Israeli
// school students grades 4-9. Uses Modern Standard Arabic with
// accessible vocabulary. Pending native-speaker polish.
const ar: Catalog = {
  avatars: {
    dragon:         { name: 'تنين' },
    eagle:          { name: 'نسر' },
    wolf:           { name: 'ذئب' },
    dinosaur:       { name: 'ديناصور' },
    wizard:         { name: 'ساحر' },
    superhero:      { name: 'بطل خارق' },
    alien:          { name: 'فضائي' },
    prince:         { name: 'أمير' },
    princess:       { name: 'أميرة' },
    unicorn:        { name: 'وحيد القرن' },
    dragon_face:    { name: 'وجه التنين' },
    vampire:        { name: 'مصاص دماء' },
    merperson:      { name: 'حورية البحر' },
    ninja:          { name: 'نينجا' },
    robot:          { name: 'روبوت' },
    goat:           { name: 'GOAT' },
    astronaut:      { name: 'رائد فضاء' },
    coder:          { name: 'مبرمج' },
    witch:          { name: 'ساحرة' },
    super_villain:  { name: 'شرير خارق' },
    dj:             { name: 'دي جي' },
    pro_gamer:      { name: 'لاعب محترف' },
    champion:       { name: 'بطل' },
    cyborg:         { name: 'سايبورغ' },
    elf:            { name: 'قزم' },
    genie:          { name: 'جني' },
    kraken:         { name: 'كراكن' },
    owl_sage:       { name: 'بومة حكيمة' },
    planet_master:  { name: 'سيد الكواكب' },
    lightning:      { name: 'برق' },
  },

  themes: {
    default:  { name: 'كلاسيكي' },
    dark:     { name: 'الوضع الداكن' },
    ocean:    { name: 'محيط' },
    sunset:   { name: 'غروب' },
    neon:     { name: 'نيون' },
    forest:   { name: 'غابة' },
    royal:    { name: 'ملكي' },
    galaxy:   { name: 'مجرة' },
    aurora:   { name: 'شفق' },
    retro80:  { name: 'ريترو الثمانينات' },
    sakura:   { name: 'ساكورا' },
    chill:    { name: 'وضع مريح' },
    esports:  { name: 'ألعاب إلكترونية RGB' },
  },

  eggs: {
    starter_egg:    { name: 'بيضة المبتدئين',  desc: 'بيضة بسيطة. تُسقط 25-80 XP — تقريباً متعادلة.' },
    golden_egg:     { name: 'بيضة ذهبية',       desc: 'تتلألأ بالذهب. تُسقط 80-220 XP + فرصة الحصول على أفاتار نادر.' },
    dragon_egg:     { name: 'بيضة التنين',      desc: 'شيء عظيم بالداخل. تُسقط 200-550 XP.' },
    treasure_chest: { name: 'صندوق الكنز',      desc: 'غنائم متميزة. تُسقط 350-800 XP + مستحضر تجميل مضمون.' },
    cosmic_egg:     { name: 'بيضة كونية',       desc: 'مصنوعة من غبار النجوم. تُسقط 600-1400 XP + لقب متميز.' },
    rainbow_egg:    { name: 'بيضة قوس قزح',    desc: 'البيضة الأندر. تُسقط 1200-2600 XP + أفاتار متميز عشوائي.' },
  },

  powerUps: {
    skip:          { name: 'تخطي الكلمة', desc: 'تخطَّ الكلمة الحالية بدون عقوبة' },
    fifty_fifty:   { name: '50/50',         desc: 'أزل إجابتين خاطئتين' },
    reveal_letter: { name: 'كشف حرف',       desc: 'اكشف الحرف الأول في وضع التهجئة' },
  },

  boosters: {
    streak_freeze:   { name: 'تجميد السلسلة',         desc: 'احمِ سلسلتك ليوم فائت' },
    xp_booster:      { name: 'مضاعف XP × 2',          desc: 'ضاعف XP لمدة 24 ساعة' },
    lucky_charm:     { name: 'تعويذة الحظ',           desc: 'تُغفر إجابتك الخاطئة الأولى في اللعبة التالية' },
    weekend_warrior: { name: 'محارب نهاية الأسبوع',   desc: '× 2 XP طوال عطلة نهاية الأسبوع' },
  },

  frames: {
    gold:        { name: 'إطار ذهبي' },
    fire:        { name: 'إطار ناري' },
    diamond:     { name: 'إطار ماسي' },
    rainbow:     { name: 'إطار قوس قزح' },
    lightning:   { name: 'إطار البرق' },
    crown:       { name: 'إطار التاج' },
    neon_glow:   { name: 'توهج نيون' },
    galaxy:      { name: 'مجرة' },
    pixel:       { name: 'بكسل 8-bit' },
    holographic: { name: 'هولوغرافي' },
  },

  titles: {
    champion:       { name: 'بطل',                display: 'بطل' },
    genius:         { name: 'عبقري',              display: 'عبقري' },
    word_wizard:    { name: 'ساحر الكلمات',       display: 'ساحر الكلمات' },
    vocab_king:     { name: 'ملك المفردات',       display: 'ملك المفردات' },
    vocab_queen:    { name: 'ملكة المفردات',      display: 'ملكة المفردات' },
    speed_demon:    { name: 'شيطان السرعة',       display: 'شيطان السرعة' },
    legend:         { name: 'أسطورة حية',         display: 'أسطورة حية' },
    brain:          { name: 'عقل كبير',           display: 'عقل كبير' },
    main_character: { name: 'الشخصية الرئيسية',   display: 'الشخصية الرئيسية' },
    goated:         { name: 'GOATed',             display: '🐐 GOATed' },
    aura_farmer:    { name: 'مزارع الهالة',        display: 'مزارع الهالة' },
    final_boss:     { name: 'الزعيم النهائي',      display: 'الزعيم النهائي' },
    rizzler:        { name: 'ريزلر',              display: 'الريزلر' },
    chosen_one:     { name: 'المختار',            display: 'المختار' },
    speedrunner:    { name: 'متسابق السرعة',       display: 'متسابق السرعة' },
    cracked:        { name: 'محترف',              display: 'محترف' },
  },

  categories: {
    Animals:        { name: 'حيوانات' },
    Faces:          { name: 'وجوه' },
    GamerSquad:     { name: 'فريق اللاعبين' },
    SnackAttack:    { name: 'هجوم الوجبات الخفيفة' },
    FootballStars:  { name: 'نجوم كرة القدم' },
    Food:           { name: 'طعام' },
    Nature:         { name: 'طبيعة' },
    Sports:         { name: 'رياضة' },
    JurassicMode:   { name: 'وضع جوراسي' },
    CreatorPack:    { name: 'حزمة المبدعين' },
    Objects:        { name: 'أشياء' },
    Vehicles:       { name: 'مركبات' },
    LabRats:        { name: 'فئران المختبر' },
    WarriorPack:    { name: 'حزمة المحاربين' },
    Fantasy:        { name: 'خيال' },
    SpaceLegends:   { name: 'أساطير الفضاء' },
    Space:          { name: 'فضاء' },
    Free:           { name: 'مجاناً' },
  },
};

export const shopCatalog: Record<Language, Catalog> = { en, he, ar };

export function catalogName(
  section: CatalogSection,
  id: string,
  lang: Language,
  fallback: string,
): string {
  return shopCatalog[lang]?.[section]?.[id]?.name ?? en[section]?.[id]?.name ?? fallback;
}

export function catalogDesc(
  section: CatalogSection,
  id: string,
  lang: Language,
  fallback: string,
): string {
  return shopCatalog[lang]?.[section]?.[id]?.desc ?? en[section]?.[id]?.desc ?? fallback;
}

export function catalogDisplay(
  section: CatalogSection,
  id: string,
  lang: Language,
  fallback: string,
): string {
  return shopCatalog[lang]?.[section]?.[id]?.display ?? en[section]?.[id]?.display ?? fallback;
}
