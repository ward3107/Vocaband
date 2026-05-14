// Dynamic hero slot for the Marketplace. Replaces the static "Drop of
// the Week" with a 5-tier priority engine that evaluates the student's
// state and shows the most relevant nudge.
//
// Priority order:
//   1. Featured Mode 2x XP (STUB — activates when SQL migration lands)
//   2. Almost Unlocked — cheapest unowned item within 100 XP
//   3. Daily Chest unclaimed
//   4. Save for X — student pinned an item, show progress bar
//   5. Fallback — cheapest unowned premium avatar
//
// The card returns null when no priority matches (very rare — fallback
// fires for any student with at least one unowned avatar).

import { motion } from 'motion/react';
import { Zap, Gift, Pin, Sparkles, Star } from 'lucide-react';
import type { AppUser } from '../../core/supabase';
import type { Language } from '../../hooks/useLanguage';
import {
  PREMIUM_AVATARS, THEMES, NAME_FRAMES, NAME_TITLES, MYSTERY_EGGS,
} from '../../constants/game';
import { catalogName } from '../../locales/student/shop-catalog';
import type { PinnedItem, PinnedKind } from '../../hooks/usePinnedShopItem';

interface SpotlightProps {
  user: AppUser;
  xp: number;
  language: Language;
  isRTL: boolean;
  dailyChestAvailable: boolean;
  onClaimChest: () => void;
  pinned: PinnedItem | null;
  onUnpin: () => void;
  onShop: (kind: PinnedKind, id: string) => void;
}

interface ItemRef {
  kind: PinnedKind;
  id: string;
  rawName: string;
  cost: number;
  emoji: string;
}

type Card =
  | { kind: 'almost-unlocked'; item: ItemRef; gap: number }
  | { kind: 'daily-chest' }
  | { kind: 'pinned'; item: ItemRef; xpHave: number }
  | { kind: 'fallback'; item: ItemRef };

const CHROME: Record<Language, Record<string, string>> = {
  en: {
    almostHeader: 'Almost yours!',
    almostGap: '{gap} XP to unlock',
    chestHeader: "Today's chest is waiting",
    chestSub: 'Open it for free XP',
    chestCta: 'Open chest',
    pinnedHeader: 'Saving for',
    pinnedProgress: '{have} / {total} XP',
    pinnedUnpin: 'Unpin',
    fallbackHeader: 'Try this',
    playCta: 'Play to earn',
    buyCta: 'Buy now',
  },
  he: {
    almostHeader: 'כמעט שלך!',
    almostGap: '{gap} XP לפתיחה',
    chestHeader: 'התיבה היומית מחכה',
    chestSub: 'פתח אותה ל-XP חינם',
    chestCta: 'פתח תיבה',
    pinnedHeader: 'חוסך בשביל',
    pinnedProgress: '{have} / {total} XP',
    pinnedUnpin: 'בטל סימון',
    fallbackHeader: 'נסה את זה',
    playCta: 'שחק להשיג',
    buyCta: 'קנה עכשיו',
  },
  ar: {
    almostHeader: 'تقريباً لك!',
    almostGap: '{gap} XP لفتحه',
    chestHeader: 'صندوق اليوم بانتظارك',
    chestSub: 'افتحه للحصول على XP مجاناً',
    chestCta: 'افتح الصندوق',
    pinnedHeader: 'تدّخر لـ',
    pinnedProgress: '{have} / {total} XP',
    pinnedUnpin: 'إلغاء التثبيت',
    fallbackHeader: 'جرّب هذا',
    playCta: 'العب لتربح',
    buyCta: 'اشترِ الآن',
  },
};

function isOwned(user: AppUser, kind: PinnedKind, id: string, emoji: string): boolean {
  switch (kind) {
    case 'avatar': return !!user.unlockedAvatars?.includes(emoji);
    case 'theme':  return !!user.unlockedThemes?.includes(id);
    case 'title':  return !!user.unlockedAvatars?.includes(`title_${id}`);
    case 'frame':  return !!user.unlockedAvatars?.includes(`frame_${id}`);
    case 'egg':
    case 'powerUp':
    case 'booster':
      return false;
  }
}

function lookup(kind: PinnedKind, id: string): ItemRef | null {
  if (kind === 'avatar') {
    const a = PREMIUM_AVATARS.find(x => x.id === id);
    return a ? { kind, id, rawName: a.name, cost: a.cost, emoji: a.emoji } : null;
  }
  if (kind === 'theme') {
    const t = THEMES.find(x => x.id === id);
    return t ? { kind, id, rawName: t.name, cost: t.cost, emoji: t.preview } : null;
  }
  if (kind === 'frame') {
    const f = NAME_FRAMES.find(x => x.id === id);
    return f ? { kind, id, rawName: f.name, cost: f.cost, emoji: f.preview } : null;
  }
  if (kind === 'title') {
    const t = NAME_TITLES.find(x => x.id === id);
    return t ? { kind, id, rawName: t.name, cost: t.cost, emoji: '🏷️' } : null;
  }
  if (kind === 'egg') {
    const e = MYSTERY_EGGS.find(x => x.id === id);
    return e ? { kind, id, rawName: e.name, cost: e.cost, emoji: e.emoji } : null;
  }
  return null;
}

function catalogSectionFor(kind: PinnedKind): 'avatars' | 'themes' | 'frames' | 'titles' | 'eggs' | null {
  if (kind === 'avatar') return 'avatars';
  if (kind === 'theme') return 'themes';
  if (kind === 'frame') return 'frames';
  if (kind === 'title') return 'titles';
  if (kind === 'egg') return 'eggs';
  return null;
}

function displayName(item: ItemRef, language: Language): string {
  const section = catalogSectionFor(item.kind);
  if (!section) return item.rawName;
  return catalogName(section, item.id, language, item.rawName);
}

// Priority engine. Pure function — no hooks, easy to test.
function buildCard(
  user: AppUser,
  xp: number,
  dailyChestAvailable: boolean,
  pinned: PinnedItem | null,
): Card | null {
  // Priority 1: Featured Mode 2x XP — intentional null until the
  // server-side multiplier lands. Engine architecturally supports it.

  // Priority 2: Almost Unlocked — cheapest unowned item within 100 XP.
  const candidates: Array<ItemRef & { gap: number }> = [];
  const consider = (item: ItemRef) => {
    if (isOwned(user, item.kind, item.id, item.emoji)) return;
    const gap = item.cost - xp;
    if (gap <= 0 || gap > 100) return;
    candidates.push({ ...item, gap });
  };
  PREMIUM_AVATARS.forEach(a =>
    consider({ kind: 'avatar', id: a.id, rawName: a.name, cost: a.cost, emoji: a.emoji }));
  THEMES.forEach(t => {
    if (t.cost > 0) consider({ kind: 'theme', id: t.id, rawName: t.name, cost: t.cost, emoji: t.preview });
  });
  NAME_FRAMES.forEach(f =>
    consider({ kind: 'frame', id: f.id, rawName: f.name, cost: f.cost, emoji: f.preview }));
  NAME_TITLES.forEach(t =>
    consider({ kind: 'title', id: t.id, rawName: t.name, cost: t.cost, emoji: '🏷️' }));

  if (candidates.length > 0) {
    candidates.sort((a, b) => a.gap - b.gap);
    const c = candidates[0];
    return {
      kind: 'almost-unlocked',
      item: { kind: c.kind, id: c.id, rawName: c.rawName, cost: c.cost, emoji: c.emoji },
      gap: c.gap,
    };
  }

  // Priority 3: Daily Chest unclaimed.
  if (dailyChestAvailable) return { kind: 'daily-chest' };

  // Priority 4: Pinned item.
  if (pinned) {
    const item = lookup(pinned.kind, pinned.id);
    if (item && !isOwned(user, item.kind, item.id, item.emoji)) {
      return { kind: 'pinned', item, xpHave: xp };
    }
  }

  // Priority 5: Fallback — cheapest unowned premium avatar.
  const unowned = PREMIUM_AVATARS
    .filter(a => !isOwned(user, 'avatar', a.id, a.emoji))
    .sort((a, b) => a.cost - b.cost);
  if (unowned.length > 0) {
    const a = unowned[0];
    return {
      kind: 'fallback',
      item: { kind: 'avatar', id: a.id, rawName: a.name, cost: a.cost, emoji: a.emoji },
    };
  }

  return null;
}

function interp(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

export default function Spotlight(props: SpotlightProps) {
  const {
    user, xp, language, isRTL,
    dailyChestAvailable, onClaimChest,
    pinned, onUnpin, onShop,
  } = props;
  const card = buildCard(user, xp, dailyChestAvailable, pinned);
  const chrome = CHROME[language] ?? CHROME.en;

  if (!card) return null;

  // Headline + sub + CTA per kind.
  let icon: React.ReactNode;
  let gradient: string;
  let header: string;
  let body: React.ReactNode;
  let cta: { label: string; onClick: () => void };

  if (card.kind === 'almost-unlocked') {
    icon = <Sparkles size={18} className="text-white" />;
    gradient = 'from-indigo-500 via-violet-500 to-fuchsia-500';
    header = chrome.almostHeader;
    body = (
      <>
        <div className="text-base sm:text-lg font-black text-white">
          {displayName(card.item, language)}
        </div>
        <div className="text-xs sm:text-sm text-white/90 mt-0.5">
          {interp(chrome.almostGap, { gap: card.gap })}
        </div>
      </>
    );
    cta = { label: chrome.playCta, onClick: () => onShop(card.item.kind, card.item.id) };
  } else if (card.kind === 'daily-chest') {
    icon = <Gift size={18} className="text-white" />;
    gradient = 'from-amber-500 via-orange-500 to-rose-500';
    header = chrome.chestHeader;
    body = (
      <div className="text-xs sm:text-sm text-white/90">{chrome.chestSub}</div>
    );
    cta = { label: chrome.chestCta, onClick: onClaimChest };
  } else if (card.kind === 'pinned') {
    icon = <Pin size={18} className="text-white" />;
    gradient = 'from-emerald-500 via-teal-500 to-cyan-600';
    header = chrome.pinnedHeader;
    const pct = Math.min(100, Math.round((card.xpHave / card.item.cost) * 100));
    body = (
      <>
        <div className="text-base sm:text-lg font-black text-white">
          {card.item.emoji} {displayName(card.item, language)}
        </div>
        <div className="text-xs sm:text-sm text-white/90 mt-0.5">
          {interp(chrome.pinnedProgress, { have: card.xpHave, total: card.item.cost })}
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </>
    );
    cta = card.xpHave >= card.item.cost
      ? { label: chrome.buyCta, onClick: () => onShop(card.item.kind, card.item.id) }
      : { label: chrome.playCta, onClick: () => onShop(card.item.kind, card.item.id) };
  } else {
    icon = <Star size={18} className="text-white" />;
    gradient = 'from-fuchsia-500 via-pink-500 to-rose-500';
    header = chrome.fallbackHeader;
    body = (
      <>
        <div className="text-base sm:text-lg font-black text-white">
          {card.item.emoji} {displayName(card.item, language)}
        </div>
        <div className="text-xs sm:text-sm text-white/90 mt-0.5">
          <Zap size={11} className="inline -mt-0.5 mr-0.5" /> {card.item.cost} XP
        </div>
      </>
    );
    cta = xp >= card.item.cost
      ? { label: chrome.buyCta, onClick: () => onShop(card.item.kind, card.item.id) }
      : { label: chrome.playCta, onClick: () => onShop(card.item.kind, card.item.id) };
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-4 sm:p-5 shadow-lg shadow-violet-500/20 mb-5`}
    >
      <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
      <div className={`relative flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/80">
            {header}
          </div>
          {body}
        </div>
      </div>
      <div className={`relative mt-3 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <motion.button
          type="button"
          onClick={cta.onClick}
          whileTap={{ scale: 0.97 }}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-black text-stone-900 bg-white rounded-full py-2.5 shadow-sm hover:shadow-md transition-all"
        >
          {cta.label}
        </motion.button>
        {card.kind === 'pinned' && (
          <button
            type="button"
            onClick={onUnpin}
            className="text-[11px] font-bold text-white/80 hover:text-white px-2 py-2"
          >
            {chrome.pinnedUnpin}
          </button>
        )}
      </div>
    </motion.div>
  );
}
