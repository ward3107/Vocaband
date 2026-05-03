/**
 * idioms.ts — hand-curated English idiom dataset for Idiom mode.
 *
 * Each entry pairs an English idiom with three plausible-but-wrong
 * meanings and the correct meaning, plus translations of the
 * correct meaning into Hebrew and Arabic.  The wrong options are
 * intentionally close enough to the literal reading of the idiom
 * so the multiple-choice question rewards real comprehension
 * rather than guessing.
 *
 * Conventions:
 *   - `english` — the idiom phrase exactly as a learner would see it
 *   - `meaningEn` — the figurative meaning in plain English
 *   - `meaningHe` / `meaningAr` — figurative meaning translated for
 *     RTL UIs.  Translations target band-2 vocabulary (grades 4-9)
 *     so they read naturally to Israeli + Arab-sector students.
 *   - `distractorsEn` — three wrong meanings.  These render in
 *     English regardless of UI language; the meaning the student
 *     picks is graded against `meaningEn`.  A future revision can
 *     add `distractorsHe` / `distractorsAr` if teachers ask for
 *     fully-translated distractors.
 *   - `example` — short sample sentence using the idiom in context
 *     for the post-answer reveal panel.
 *   - `category` — grouping for later filtering / analytics.
 *   - `level` — Israeli MoE band alignment (1 = beginner-friendly,
 *     3 = advanced).  Used for picking idioms appropriate to the
 *     class's level.
 *
 * Adding more idioms: just append to IDIOMS — the order isn't
 * meaningful at the data layer, the game shuffles its question
 * pool on each round.
 */

export type IdiomCategory =
  | "everyday"
  | "animal"
  | "body"
  | "color"
  | "weather";

export type IdiomLevel = 1 | 2 | 3;

export interface Idiom {
  id: number;
  english: string;
  meaningEn: string;
  meaningHe: string;
  meaningAr: string;
  distractorsEn: [string, string, string];
  example: string;
  category: IdiomCategory;
  level: IdiomLevel;
}

export const IDIOMS: Idiom[] = [
  // ─── Everyday (12) ────────────────────────────────────────────────
  {
    id: 1,
    english: "Break a leg",
    meaningEn: "Wish someone good luck",
    meaningHe: "לאחל בהצלחה",
    meaningAr: "أتمنى لك التوفيق",
    distractorsEn: ["Hurt your foot", "Run very fast", "Get into trouble"],
    example: "Break a leg in your school play tonight!",
    category: "everyday",
    level: 1,
  },
  {
    id: 2,
    english: "Piece of cake",
    meaningEn: "Something very easy",
    meaningHe: "משהו קל מאוד",
    meaningAr: "شيء سهل جدًا",
    distractorsEn: ["A delicious dessert", "A small amount of food", "A birthday treat"],
    example: "The math test was a piece of cake.",
    category: "everyday",
    level: 1,
  },
  {
    id: 3,
    english: "Hit the road",
    meaningEn: "Start a journey or leave",
    meaningHe: "להתחיל מסע או לעזוב",
    meaningAr: "ابدأ رحلتك أو غادر",
    distractorsEn: ["Crash a car", "Punch the ground", "Fall down a hill"],
    example: "It's late — we should hit the road.",
    category: "everyday",
    level: 1,
  },
  {
    id: 4,
    english: "Hit the books",
    meaningEn: "Study hard",
    meaningHe: "ללמוד קשה",
    meaningAr: "ادرس بجد",
    distractorsEn: ["Slap a book", "Buy new books", "Throw books at someone"],
    example: "I can't come out — I have to hit the books for the exam.",
    category: "everyday",
    level: 1,
  },
  {
    id: 5,
    english: "Spill the beans",
    meaningEn: "Reveal a secret",
    meaningHe: "לחשוף סוד",
    meaningAr: "يفشي السر",
    distractorsEn: ["Drop food on the floor", "Cook a meal", "Lose your dinner"],
    example: "Don't spill the beans about the surprise party!",
    category: "everyday",
    level: 2,
  },
  {
    id: 6,
    english: "Bite the bullet",
    meaningEn: "Face a difficult situation bravely",
    meaningHe: "להתמודד עם מצב קשה באומץ",
    meaningAr: "يواجه موقفًا صعبًا بشجاعة",
    distractorsEn: ["Eat metal", "Be in a fight", "Speak quickly"],
    example: "I had to bite the bullet and tell my parents the truth.",
    category: "everyday",
    level: 2,
  },
  {
    id: 7,
    english: "Once in a blue moon",
    meaningEn: "Very rarely",
    meaningHe: "לעיתים נדירות מאוד",
    meaningAr: "نادرًا جدًا",
    distractorsEn: ["At nighttime", "On a special holiday", "Every full moon"],
    example: "I see my cousins from abroad once in a blue moon.",
    category: "everyday",
    level: 2,
  },
  {
    id: 8,
    english: "The ball is in your court",
    meaningEn: "It is your decision now",
    meaningHe: "ההחלטה היא שלך עכשיו",
    meaningAr: "القرار بيدك الآن",
    distractorsEn: ["You are good at sports", "It is your turn to play", "You dropped something"],
    example: "I made my offer — now the ball is in your court.",
    category: "everyday",
    level: 3,
  },
  {
    id: 9,
    english: "Cost an arm and a leg",
    meaningEn: "Be very expensive",
    meaningHe: "להיות יקר מאוד",
    meaningAr: "غالٍ جدًا",
    distractorsEn: ["Hurt a lot", "Take a long time", "Be very heavy"],
    example: "Those new sneakers cost an arm and a leg.",
    category: "everyday",
    level: 1,
  },
  {
    id: 10,
    english: "The best of both worlds",
    meaningEn: "Enjoy two good things at the same time",
    meaningHe: "להנות משני דברים טובים בו זמנית",
    meaningAr: "الاستمتاع بأمرين جيدين في نفس الوقت",
    distractorsEn: ["Travel to two countries", "Have two friends", "Win a competition"],
    example: "Working from home gives me the best of both worlds.",
    category: "everyday",
    level: 3,
  },
  {
    id: 11,
    english: "Cut to the chase",
    meaningEn: "Get to the main point quickly",
    meaningHe: "לעבור לעניין במהירות",
    meaningAr: "ادخل في صلب الموضوع",
    distractorsEn: ["Run fast", "Stop talking", "Watch a movie"],
    example: "Cut to the chase — what do you really want?",
    category: "everyday",
    level: 3,
  },
  {
    id: 12,
    english: "Miss the boat",
    meaningEn: "Lose an opportunity",
    meaningHe: "לפספס הזדמנות",
    meaningAr: "يفوّت الفرصة",
    distractorsEn: ["Be late for a trip", "Forget to swim", "Lose at sea"],
    example: "If you don't apply today, you'll miss the boat.",
    category: "everyday",
    level: 2,
  },

  // ─── Animal (10) ──────────────────────────────────────────────────
  {
    id: 13,
    english: "Let the cat out of the bag",
    meaningEn: "Reveal a secret by mistake",
    meaningHe: "לחשוף סוד בטעות",
    meaningAr: "يفشي سرًا عن طريق الخطأ",
    distractorsEn: ["Lose a pet", "Open a present early", "Free an animal"],
    example: "Mom let the cat out of the bag about my birthday gift.",
    category: "animal",
    level: 2,
  },
  {
    id: 14,
    english: "Kill two birds with one stone",
    meaningEn: "Solve two problems with one action",
    meaningHe: "לפתור שתי בעיות בפעולה אחת",
    meaningAr: "يحل مشكلتين بعمل واحد",
    distractorsEn: ["Be very strong", "Hurt animals", "Throw rocks"],
    example: "I'll walk to school and pick up groceries — killing two birds with one stone.",
    category: "animal",
    level: 2,
  },
  {
    id: 15,
    english: "The early bird catches the worm",
    meaningEn: "Those who act first get the best chance",
    meaningHe: "מי שמקדים זוכה",
    meaningAr: "من سبق ربح",
    distractorsEn: ["Wake up at sunrise", "Birds eat worms", "Mornings are quiet"],
    example: "I lined up at 7 a.m. — the early bird catches the worm.",
    category: "animal",
    level: 2,
  },
  {
    id: 16,
    english: "When pigs fly",
    meaningEn: "Something that will never happen",
    meaningHe: "משהו שלעולם לא יקרה",
    meaningAr: "أمر لن يحدث أبدًا",
    distractorsEn: ["A long time from now", "Soon", "On a holiday"],
    example: "He'll clean his room when pigs fly.",
    category: "animal",
    level: 1,
  },
  {
    id: 17,
    english: "Hold your horses",
    meaningEn: "Wait a moment; slow down",
    meaningHe: "חכה רגע; האט",
    meaningAr: "تمهّل قليلاً",
    distractorsEn: ["Ride a horse", "Hold a rope", "Catch a thief"],
    example: "Hold your horses — I'm not ready yet!",
    category: "animal",
    level: 1,
  },
  {
    id: 18,
    english: "A wolf in sheep's clothing",
    meaningEn: "Someone dangerous pretending to be kind",
    meaningHe: "מישהו מסוכן שמעמיד פנים שהוא נחמד",
    meaningAr: "شخص خطير يتظاهر بالطيبة",
    distractorsEn: ["A funny costume", "A scary movie", "A clever joke"],
    example: "Be careful — that nice guy is a wolf in sheep's clothing.",
    category: "animal",
    level: 3,
  },
  {
    id: 19,
    english: "Curiosity killed the cat",
    meaningEn: "Asking too many questions can cause trouble",
    meaningHe: "להיות סקרן מדי עלול לגרום לצרות",
    meaningAr: "كثرة الفضول قد تجلب المتاعب",
    distractorsEn: ["Cats are dangerous", "Don't keep pets", "Watch out for animals"],
    example: "Stop asking — curiosity killed the cat.",
    category: "animal",
    level: 2,
  },
  {
    id: 20,
    english: "Like a fish out of water",
    meaningEn: "Feeling uncomfortable in a new situation",
    meaningHe: "להרגיש לא בנוח במצב חדש",
    meaningAr: "يشعر بعدم الارتياح في وضع جديد",
    distractorsEn: ["Bad at swimming", "Out of breath", "Tired from sports"],
    example: "On my first day at the new school, I felt like a fish out of water.",
    category: "animal",
    level: 2,
  },
  {
    id: 21,
    english: "Raining cats and dogs",
    meaningEn: "Raining very heavily",
    meaningHe: "יורד גשם זלעפות",
    meaningAr: "تمطر بغزارة",
    distractorsEn: ["Animals are outside", "It is dark", "There is a storm warning"],
    example: "Take an umbrella — it's raining cats and dogs.",
    category: "animal",
    level: 1,
  },
  {
    id: 22,
    english: "The elephant in the room",
    meaningEn: "An obvious problem nobody talks about",
    meaningHe: "בעיה ברורה שאף אחד לא מדבר עליה",
    meaningAr: "مشكلة واضحة لا أحد يتحدث عنها",
    distractorsEn: ["A very large pet", "A tall person", "A messy bedroom"],
    example: "Let's talk about the elephant in the room — the missing money.",
    category: "animal",
    level: 3,
  },

  // ─── Body (10) ────────────────────────────────────────────────────
  {
    id: 23,
    english: "Give a hand",
    meaningEn: "Help someone",
    meaningHe: "לעזור למישהו",
    meaningAr: "يساعد شخصًا",
    distractorsEn: ["Wave goodbye", "Clap loudly", "Shake hands"],
    example: "Can you give me a hand with these boxes?",
    category: "body",
    level: 1,
  },
  {
    id: 24,
    english: "Pull someone's leg",
    meaningEn: "Joke with someone playfully",
    meaningHe: "למתוח מישהו בצחוק",
    meaningAr: "يمزح مع شخص ما",
    distractorsEn: ["Hurt someone", "Wake someone up", "Help someone walk"],
    example: "Don't worry — I was just pulling your leg!",
    category: "body",
    level: 2,
  },
  {
    id: 25,
    english: "Head over heels",
    meaningEn: "Completely in love",
    meaningHe: "מאוהב לגמרי",
    meaningAr: "غارق في الحب",
    distractorsEn: ["Doing gymnastics", "Falling down", "Jumping high"],
    example: "Sara is head over heels for her new puppy.",
    category: "body",
    level: 3,
  },
  {
    id: 26,
    english: "Keep an eye on",
    meaningEn: "Watch carefully",
    meaningHe: "להשגיח בקפידה",
    meaningAr: "يراقب بعناية",
    distractorsEn: ["Look angry", "Wear glasses", "Stare at the sun"],
    example: "Please keep an eye on my bag while I'm gone.",
    category: "body",
    level: 1,
  },
  {
    id: 27,
    english: "Cold feet",
    meaningEn: "Getting nervous before doing something",
    meaningHe: "לחשוש לפני לעשות משהו",
    meaningAr: "التوتر قبل فعل شيء ما",
    distractorsEn: ["Forgetting to wear shoes", "Standing in snow", "Catching a cold"],
    example: "He got cold feet right before his speech.",
    category: "body",
    level: 2,
  },
  {
    id: 28,
    english: "Lend an ear",
    meaningEn: "Listen carefully to someone",
    meaningHe: "להקשיב בקפידה למישהו",
    meaningAr: "يصغي بعناية لشخص ما",
    distractorsEn: ["Borrow a phone", "Speak loudly", "Whisper a secret"],
    example: "Could you lend an ear? I need to talk.",
    category: "body",
    level: 2,
  },
  {
    id: 29,
    english: "Bite your tongue",
    meaningEn: "Stop yourself from speaking",
    meaningHe: "לעצור את עצמך מלדבר",
    meaningAr: "يمنع نفسه من الكلام",
    distractorsEn: ["Eat too fast", "Hurt your mouth", "Speak quickly"],
    example: "I had to bite my tongue when she was rude.",
    category: "body",
    level: 2,
  },
  {
    id: 30,
    english: "Heart of gold",
    meaningEn: "A very kind, generous person",
    meaningHe: "אדם טוב לב ונדיב מאוד",
    meaningAr: "شخص طيب القلب وكريم جدًا",
    distractorsEn: ["A rich person", "A doctor", "A famous singer"],
    example: "My grandma has a heart of gold.",
    category: "body",
    level: 1,
  },
  {
    id: 31,
    english: "By the skin of your teeth",
    meaningEn: "Just barely; very narrowly",
    meaningHe: "בקושי רב; ממש בצמצום",
    meaningAr: "بالكاد؛ في اللحظة الأخيرة",
    distractorsEn: ["With perfect timing", "Easily", "After a fight"],
    example: "I caught the bus by the skin of my teeth.",
    category: "body",
    level: 3,
  },
  {
    id: 32,
    english: "Speak of the devil",
    meaningEn: "Said when the person you were just talking about appears",
    meaningHe: "נאמר כשהאדם שדיברו עליו מופיע פתאום",
    meaningAr: "تقال عند ظهور الشخص الذي كنت تتحدث عنه للتو",
    distractorsEn: ["Say something scary", "Talk about a movie", "Tell a ghost story"],
    example: "Speak of the devil — there's Maya now!",
    category: "body",
    level: 3,
  },

  // ─── Color (10) ───────────────────────────────────────────────────
  {
    id: 33,
    english: "Feeling blue",
    meaningEn: "Feeling sad",
    meaningHe: "להרגיש עצוב",
    meaningAr: "يشعر بالحزن",
    distractorsEn: ["Feeling cold", "Wearing blue clothes", "Liking the sea"],
    example: "He's been feeling blue since his dog passed away.",
    category: "color",
    level: 1,
  },
  {
    id: 34,
    english: "See red",
    meaningEn: "Become very angry",
    meaningHe: "להתרגז מאוד",
    meaningAr: "يغضب بشدة",
    distractorsEn: ["Notice danger", "Be embarrassed", "Watch a sunset"],
    example: "When I saw the broken vase, I saw red.",
    category: "color",
    level: 2,
  },
  {
    id: 35,
    english: "Green with envy",
    meaningEn: "Very jealous",
    meaningHe: "מקנא מאוד",
    meaningAr: "غيران جدًا",
    distractorsEn: ["Feeling sick", "Liking nature", "Wearing green"],
    example: "She was green with envy at her sister's new bike.",
    category: "color",
    level: 2,
  },
  {
    id: 36,
    english: "Out of the blue",
    meaningEn: "Suddenly and unexpectedly",
    meaningHe: "פתאום ובלי צפי",
    meaningAr: "فجأة ودون توقع",
    distractorsEn: ["From the sky", "From the sea", "From far away"],
    example: "Out of the blue, my old friend called me.",
    category: "color",
    level: 2,
  },
  {
    id: 37,
    english: "Black sheep",
    meaningEn: "A family member who is different from the rest",
    meaningHe: "בן משפחה שונה מהאחרים",
    meaningAr: "فرد من العائلة مختلف عن البقية",
    distractorsEn: ["A pet animal", "A scary person", "A bad student"],
    example: "Uncle Tom is the black sheep of the family.",
    category: "color",
    level: 3,
  },
  {
    id: 38,
    english: "White lie",
    meaningEn: "A small lie told to be polite",
    meaningHe: "שקר קטן שאומרים מנימוס",
    meaningAr: "كذبة صغيرة تقال من باب اللطف",
    distractorsEn: ["A truthful answer", "A big secret", "A funny joke"],
    example: "I told a white lie about loving the gift.",
    category: "color",
    level: 2,
  },
  {
    id: 39,
    english: "Roll out the red carpet",
    meaningEn: "Welcome someone in a special way",
    meaningHe: "לקבל מישהו בכבוד מיוחד",
    meaningAr: "يستقبل شخصًا استقبالًا خاصًا",
    distractorsEn: ["Clean the floor", "Decorate a room", "Throw a party"],
    example: "They rolled out the red carpet for the new principal.",
    category: "color",
    level: 3,
  },
  {
    id: 40,
    english: "Tickled pink",
    meaningEn: "Very happy and pleased",
    meaningHe: "שמח ומרוצה מאוד",
    meaningAr: "سعيد ومسرور جدًا",
    distractorsEn: ["Laughing loudly", "Wearing pink", "Feeling shy"],
    example: "Grandma was tickled pink when we visited.",
    category: "color",
    level: 3,
  },
  {
    id: 41,
    english: "Show your true colors",
    meaningEn: "Reveal your real character",
    meaningHe: "לחשוף את האופי האמיתי שלך",
    meaningAr: "يظهر شخصيته الحقيقية",
    distractorsEn: ["Wear bright clothes", "Paint a picture", "Decorate a room"],
    example: "Under pressure, he showed his true colors.",
    category: "color",
    level: 3,
  },
  {
    id: 42,
    english: "Caught red-handed",
    meaningEn: "Caught while doing something wrong",
    meaningHe: "נתפס בזמן שעשה משהו לא בסדר",
    meaningAr: "ضُبط متلبسًا",
    distractorsEn: ["Hurt your hand", "Got dirty", "Got a sunburn"],
    example: "He was caught red-handed taking cookies from the jar.",
    category: "color",
    level: 2,
  },

  // ─── Weather (10) ─────────────────────────────────────────────────
  {
    id: 43,
    english: "Under the weather",
    meaningEn: "Feeling sick or unwell",
    meaningHe: "להרגיש לא טוב",
    meaningAr: "يشعر بتوعّك",
    distractorsEn: ["Standing outside", "Forgetting an umbrella", "Being cold"],
    example: "I stayed home — I'm feeling under the weather.",
    category: "weather",
    level: 1,
  },
  {
    id: 44,
    english: "Rain on someone's parade",
    meaningEn: "Spoil someone's happy moment",
    meaningHe: "להרוס למישהו רגע שמח",
    meaningAr: "يفسد لحظة فرح لشخص ما",
    distractorsEn: ["Cancel a holiday", "Get someone wet", "Stop a party"],
    example: "I hate to rain on your parade, but the trip is cancelled.",
    category: "weather",
    level: 3,
  },
  {
    id: 45,
    english: "Storm in a teacup",
    meaningEn: "A small problem made into a big one",
    meaningHe: "בעיה קטנה שעושים ממנה גדולה",
    meaningAr: "مشكلة صغيرة تُضخّم",
    distractorsEn: ["A bad weather day", "A loud argument", "A spilled drink"],
    example: "Their fight was just a storm in a teacup.",
    category: "weather",
    level: 3,
  },
  {
    id: 46,
    english: "Save for a rainy day",
    meaningEn: "Save money for a future need",
    meaningHe: "לחסוך כסף לעתיד",
    meaningAr: "يدخر المال لوقت الحاجة",
    distractorsEn: ["Buy an umbrella", "Plan a trip", "Stay inside"],
    example: "Put some of your money in the bank — save for a rainy day.",
    category: "weather",
    level: 2,
  },
  {
    id: 47,
    english: "Calm before the storm",
    meaningEn: "A quiet time just before something bad",
    meaningHe: "רגע שקט לפני משהו רע",
    meaningAr: "الهدوء الذي يسبق العاصفة",
    distractorsEn: ["A peaceful evening", "A quiet meeting", "A boring class"],
    example: "Right before the test started — that was the calm before the storm.",
    category: "weather",
    level: 3,
  },
  {
    id: 48,
    english: "Every cloud has a silver lining",
    meaningEn: "Every bad situation has something good in it",
    meaningHe: "בכל מצב רע יש גם משהו טוב",
    meaningAr: "في كل سحابة سوداء بريق أمل",
    distractorsEn: ["Clouds have shapes", "Storms always end", "Rain helps plants"],
    example: "I lost my phone, but I found my old book — every cloud has a silver lining.",
    category: "weather",
    level: 3,
  },
  {
    id: 49,
    english: "On cloud nine",
    meaningEn: "Extremely happy",
    meaningHe: "מאושר עד הגג",
    meaningAr: "في قمة السعادة",
    distractorsEn: ["Flying in a plane", "Daydreaming", "Sleeping deeply"],
    example: "She was on cloud nine after winning the contest.",
    category: "weather",
    level: 2,
  },
  {
    id: 50,
    english: "A bolt from the blue",
    meaningEn: "A complete surprise",
    meaningHe: "הפתעה גמורה",
    meaningAr: "مفاجأة تامة",
    distractorsEn: ["A flash of lightning", "A loud noise", "A blue color"],
    example: "Their wedding announcement was a bolt from the blue.",
    category: "weather",
    level: 3,
  },
];

/** Convenience: pick N idioms at random (Fisher-Yates). */
export function pickRandomIdioms(n: number, level?: IdiomLevel): Idiom[] {
  const pool = level == null ? IDIOMS : IDIOMS.filter(i => i.level <= level);
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(n, arr.length));
}
