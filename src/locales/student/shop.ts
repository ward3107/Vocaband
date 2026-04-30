/**
 * shop.ts — i18n strings for ShopView (the Arcade Lobby hub + every
 * category sheet — eggs, avatars, frames, titles, themes, powerups,
 * boosters).
 *
 * Scope: focused on the visible chrome (h2 headings, balance row,
 * status pills, common toasts).  Per-item descriptions and individual
 * shop items still ship from src/constants/game.ts and stay
 * English-only for now — those are nouns + product names that read
 * cleanly enough in any language and don't block the student from
 * understanding what to do.
 *
 * Pattern: see docs/I18N-MIGRATION.md.
 */
import type { Language } from "../../hooks/useLanguage";

export interface ShopStrings {
  // Hub view (Arcade Lobby)
  trendingNow: string;
  featuredDrops: string;
  browseShop: string;
  yourBalance: string;
  nextTier: string;

  // Portal tiles — labels + subtitles
  portalEggsLabel: string;
  portalEggsSubtitle: string;
  portalAvatarsLabel: string;
  portalAvatarsSubtitle: string;
  portalFramesLabel: string;
  portalFramesSubtitle: string;
  portalTitlesLabel: string;
  portalTitlesSubtitle: string;
  portalThemesLabel: string;
  portalThemesSubtitle: string;
  portalBoostersLabel: string;
  portalBoostersSubtitle: string;
  portalPowerupsLabel: string;
  portalPowerupsSubtitle: string;

  // Category sheet headings
  mysteryEggsAndChests: string;
  avatarCollections: string;
  featuredAvatars: string;
  themes: string;
  nameTitles: string;
  avatarFrames: string;
  boosters: string;
  powerUps: string;

  // Item-kind chips
  titleKind: string;
  frameKind: string;
  boosterKind: string;
  powerupKind: string;

  // Frame description
  framesGlowingRing: string;

  // Status pills
  free: string;
  unlocked: string;
  /** "{label} needed" — e.g. "500 XP needed" or "Tier 3 needed" */
  needed: (label: string) => string;

  // Common toasts
  notEnoughXp: string;
  purchaseFailed: string;
  avatarEquipped: string;
  themeApplied: string;
  titleEquipped: string;
  frameEquipped: string;
  couldNotOpenEgg: string;
}

export const shopT: Record<Language, ShopStrings> = {
  en: {
    trendingNow: "Trending now",
    featuredDrops: "Featured drops",
    browseShop: "Browse shop",
    yourBalance: "Your balance",
    nextTier: "Next tier",
    portalEggsLabel: "Mystery Eggs",
    portalEggsSubtitle: "Random XP drops",
    portalAvatarsLabel: "Avatars",
    portalAvatarsSubtitle: "Collect them all",
    portalFramesLabel: "Frames",
    portalFramesSubtitle: "Flex your profile",
    portalTitlesLabel: "Titles",
    portalTitlesSubtitle: "What you're known for",
    portalThemesLabel: "Themes",
    portalThemesSubtitle: "Change the vibe",
    portalBoostersLabel: "Boosters",
    portalBoostersSubtitle: "24h + weekend buffs",
    portalPowerupsLabel: "Power-ups",
    portalPowerupsSubtitle: "Use during games",
    mysteryEggsAndChests: "Mystery Eggs & Chests",
    avatarCollections: "Avatar Collections",
    featuredAvatars: "Featured Avatars",
    themes: "Themes",
    nameTitles: "Name Titles",
    avatarFrames: "Avatar Frames",
    boosters: "Boosters",
    powerUps: "Power-ups",
    titleKind: "Title",
    frameKind: "Frame",
    boosterKind: "Booster",
    powerupKind: "Power-up",
    framesGlowingRing: "Wraps your avatar with a glowing ring.",
    free: "Free",
    unlocked: "Unlocked!",
    needed: (label) => `${label} needed`,
    notEnoughXp: "Not enough XP!",
    purchaseFailed: "Purchase failed!",
    avatarEquipped: "Avatar equipped!",
    themeApplied: "Theme applied!",
    titleEquipped: "Title equipped!",
    frameEquipped: "Frame equipped!",
    couldNotOpenEgg: "Could not open egg — try again later.",
  },
  he: {
    trendingNow: "מובילים עכשיו",
    featuredDrops: "פריטים נבחרים",
    browseShop: "עיון בחנות",
    yourBalance: "היתרה שלך",
    nextTier: "דרגה הבאה",
    portalEggsLabel: "ביצי מסתורין",
    portalEggsSubtitle: "פרסי XP אקראיים",
    portalAvatarsLabel: "אווטרים",
    portalAvatarsSubtitle: "אספו את כולם",
    portalFramesLabel: "מסגרות",
    portalFramesSubtitle: "התרברב בפרופיל",
    portalTitlesLabel: "תארים",
    portalTitlesSubtitle: "במה אתה ידוע",
    portalThemesLabel: "ערכות נושא",
    portalThemesSubtitle: "שנה את האווירה",
    portalBoostersLabel: "בוסטרים",
    portalBoostersSubtitle: "בוסטרים ל-24 שעות + סופ\"ש",
    portalPowerupsLabel: "כוחות",
    portalPowerupsSubtitle: "השתמש במשחקים",
    mysteryEggsAndChests: "ביצי מסתורין ותיבות",
    avatarCollections: "אוספי אווטרים",
    featuredAvatars: "אווטרים נבחרים",
    themes: "ערכות נושא",
    nameTitles: "תארי שם",
    avatarFrames: "מסגרות אווטר",
    boosters: "בוסטרים",
    powerUps: "כוחות",
    titleKind: "תואר",
    frameKind: "מסגרת",
    boosterKind: "בוסטר",
    powerupKind: "כוח",
    framesGlowingRing: "עוטף את האווטר שלך בטבעת זוהרת.",
    free: "חינם",
    unlocked: "פתוח!",
    needed: (label) => `נדרש ${label}`,
    notEnoughXp: "אין מספיק XP!",
    purchaseFailed: "הרכישה נכשלה!",
    avatarEquipped: "האווטר צויד!",
    themeApplied: "ערכת הנושא הוחלה!",
    titleEquipped: "התואר צויד!",
    frameEquipped: "המסגרת צוידה!",
    couldNotOpenEgg: "לא ניתן לפתוח את הביצה — נסה שוב מאוחר יותר.",
  },
  ar: {
    trendingNow: "الرائج الآن",
    featuredDrops: "العناصر المميزة",
    browseShop: "تصفح المتجر",
    yourBalance: "رصيدك",
    nextTier: "المستوى التالي",
    portalEggsLabel: "بيض الغموض",
    portalEggsSubtitle: "مكافآت XP عشوائية",
    portalAvatarsLabel: "الأفاتارات",
    portalAvatarsSubtitle: "اجمعها كلها",
    portalFramesLabel: "الإطارات",
    portalFramesSubtitle: "تباهَ بملفك",
    portalTitlesLabel: "الألقاب",
    portalTitlesSubtitle: "بماذا تُعرف",
    portalThemesLabel: "السمات",
    portalThemesSubtitle: "غيّر الأجواء",
    portalBoostersLabel: "المعزّزات",
    portalBoostersSubtitle: "معزّزات 24 ساعة + عطلة نهاية الأسبوع",
    portalPowerupsLabel: "القوى",
    portalPowerupsSubtitle: "استخدمها أثناء الألعاب",
    mysteryEggsAndChests: "بيض الغموض والصناديق",
    avatarCollections: "مجموعات الأفاتارات",
    featuredAvatars: "أفاتارات مميزة",
    themes: "السمات",
    nameTitles: "ألقاب الاسم",
    avatarFrames: "إطارات الأفاتار",
    boosters: "المعزّزات",
    powerUps: "القوى",
    titleKind: "لقب",
    frameKind: "إطار",
    boosterKind: "معزّز",
    powerupKind: "قوة",
    framesGlowingRing: "يلفّ أفاتارك بحلقة متوهجة.",
    free: "مجاني",
    unlocked: "مفتوح!",
    needed: (label) => `يلزم ${label}`,
    notEnoughXp: "لا يوجد XP كافٍ!",
    purchaseFailed: "فشل الشراء!",
    avatarEquipped: "تم تجهيز الأفاتار!",
    themeApplied: "تم تطبيق السمة!",
    titleEquipped: "تم تجهيز اللقب!",
    frameEquipped: "تم تجهيز الإطار!",
    couldNotOpenEgg: "تعذّر فتح البيضة — حاول لاحقاً.",
  },
};
