import type { Language } from '../../hooks/useLanguage';

export type AdventureWorldId = 'jungle' | 'ocean' | 'space';

interface AdventureStrings {
  heading: string;
  subtitle: string;
  nextQuest: string;
  playNext: string;
  allPlayed: string;
  noModes: string;
  companionProgress: (name: string) => string;
  modeCount: (done: number, total: number) => string;
  sessionPlayed: string;
  chooseAnother: string;
  completed: string;
  recommended: string;
  available: string;
  locked: string;
  help: string;
  hideHelp: string;
  worlds: Record<AdventureWorldId, { name: string; subtitle: string }>;
}

export const adventureT: Record<Language, AdventureStrings> = {
  en: {
    heading: 'Your word adventure',
    subtitle: 'Follow the trail. Choose any game your teacher opened.',
    nextQuest: 'Your next stop',
    playNext: 'Play next',
    allPlayed: 'You explored every game. Pick one to play again!',
    noModes: 'No games are open yet. Ask your teacher to choose one.',
    companionProgress: (name) => `My companion & progress: ${name}`,
    modeCount: (done, total) => `${done} of ${total} games played`,
    sessionPlayed: 'Played this session',
    chooseAnother: 'Choose another game',
    completed: 'completed',
    recommended: 'recommended next',
    available: 'ready to play',
    locked: 'locked',
    help: 'How to play',
    hideHelp: 'Hide tip',
    worlds: {
      jungle: { name: 'Jungle Trail', subtitle: 'Discover the words' },
      ocean: { name: 'Ocean Depths', subtitle: 'Listen and connect' },
      space: { name: 'Star Voyage', subtitle: 'Put your skills to the test' },
    },
  },
  he: {
    heading: 'הרפתקת המילים שלך',
    subtitle: 'מתקדמים במסלול ובוחרים משחק שהמורה פתחה.',
    nextQuest: 'התחנה הבאה שלך',
    playNext: 'למשחק הבא',
    allPlayed: 'שיחקת בכל המשחקים! אפשר לבחור אחד ולשחק שוב.',
    noModes: 'אין עדיין משחקים פתוחים. בקש מהמורה לבחור משחק.',
    companionProgress: (name) => `החבר שלי וההתקדמות: ${name}`,
    modeCount: (done, total) => `${done} מתוך ${total} משחקים הושלמו`,
    sessionPlayed: 'כבר שוחק במפגש הזה',
    chooseAnother: 'בחרו משחק אחר',
    completed: 'הושלם',
    recommended: 'מומלץ להמשך',
    available: 'אפשר לשחק',
    locked: 'נעול',
    help: 'איך משחקים',
    hideHelp: 'הסתרת הסבר',
    worlds: {
      jungle: { name: 'שביל הג׳ונגל', subtitle: 'מגלים את המילים' },
      ocean: { name: 'מעמקי האוקיינוס', subtitle: 'מקשיבים ומחברים' },
      space: { name: 'מסע בין כוכבים', subtitle: 'מעמידים את הידע במבחן' },
    },
  },
  ar: {
    heading: 'مغامرة الكلمات الخاصة بك',
    subtitle: 'اتبع المسار واختر لعبة أتاحها المعلم.',
    nextQuest: 'محطتك التالية',
    playNext: 'العب التالية',
    allPlayed: 'جرّبت كل الألعاب! اختر واحدة والعب مجددًا.',
    noModes: 'لا توجد ألعاب مفتوحة بعد. اطلب من المعلم اختيار لعبة.',
    companionProgress: (name) => `رفيقي وتقدمي: ${name}`,
    modeCount: (done, total) => `أكملت ${done} من ${total} ألعاب`,
    sessionPlayed: 'لعبتها في هذه الجلسة',
    chooseAnother: 'اختر لعبة أخرى',
    completed: 'مكتملة',
    recommended: 'مقترحة تاليًا',
    available: 'جاهزة للعب',
    locked: 'مقفلة',
    help: 'كيف ألعب',
    hideHelp: 'إخفاء التلميح',
    worlds: {
      jungle: { name: 'درب الغابة', subtitle: 'اكتشف الكلمات' },
      ocean: { name: 'أعماق المحيط', subtitle: 'استمع واربط' },
      space: { name: 'رحلة النجوم', subtitle: 'اختبر مهاراتك' },
    },
  },
};
