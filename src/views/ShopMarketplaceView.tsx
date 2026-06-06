// Single-screen marketplace — replaces the multi-tab ShopView + Arcade
// Lobby hub. One scroll, big horizontal carousels per category,
// Spotlight dynamic hero at the top. See docs/shop-redesign-plan.md.

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Zap, Pin, Lock, Check, ChevronLeft } from "lucide-react";
import { supabase, type AppUser } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import { useRetention } from "../hooks/useRetention";
import { usePinnedShopItem, type PinnedKind } from "../hooks/usePinnedShopItem";
import { shopT } from "../locales/student/shop";
import { catalogName, catalogDesc, catalogDisplay } from "../locales/student/shop-catalog";
import FloatingButtons from "../components/FloatingButtons";
import CategoryCarousel from "../components/shop/CategoryCarousel";
import Spotlight from "../components/shop/Spotlight";
import { ARCADE_BG } from "../components/arcade/theme";
import {
  PREMIUM_AVATARS, THEMES, POWER_UP_DEFS, BOOSTERS_DEFS,
  NAME_FRAMES, NAME_TITLES, MYSTERY_EGGS,
} from "../constants/game";
import { TITLE_STYLES } from "../constants/titleStyles";
import type { View } from "../core/views";

interface Props {
  user: AppUser;
  xp: number;
  setXp: (xp: number) => void;
  coins: number;
  setCoins: (coins: number) => void;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  setView: React.Dispatch<React.SetStateAction<View>>;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  activateBooster: (id: 'streak_freeze' | 'lucky_spin' | 'xp_booster' | 'lucky_charm' | 'focus_mode' | 'weekend_warrior') => void;
}

const BOOSTER_STYLES: Record<string, string> = {
  streak_freeze:   'from-sky-400 via-cyan-500 to-blue-600',
  xp_booster:      'from-amber-500 via-orange-500 to-rose-500',
  lucky_charm:     'from-emerald-400 via-green-500 to-teal-500',
  weekend_warrior: 'from-fuchsia-500 via-pink-500 to-rose-500',
};

const POWERUP_STYLES: Record<string, string> = {
  skip:          'from-stone-500 via-stone-600 to-stone-700',
  fifty_fifty:   'from-blue-500 via-indigo-500 to-violet-600',
  reveal_letter: 'from-amber-400 via-yellow-500 to-orange-500',
};

// Dark frosted-card rarity system — the ring + glow that makes an item
// read as collectible against the deep-violet shop backdrop. Higher tiers
// glow harder; mythic gets a multi-stop shimmer.
type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
const RARITY_DARK: Record<Rarity, { ring: string; glow: string; badge: string; label: string }> = {
  common:    { ring: 'ring-white/25',       glow: 'from-slate-300/10 to-slate-400/10',                badge: 'bg-white/15 text-white/70',                              label: 'Common' },
  rare:      { ring: 'ring-sky-400/60',     glow: 'from-sky-400/30 to-blue-500/30',                   badge: 'bg-sky-400/20 text-sky-100',                             label: 'Rare' },
  epic:      { ring: 'ring-violet-400/70',  glow: 'from-violet-500/40 to-fuchsia-500/40',             badge: 'bg-violet-400/25 text-violet-100',                       label: 'Epic' },
  legendary: { ring: 'ring-amber-300/80',   glow: 'from-amber-400/50 to-orange-500/50',               badge: 'bg-amber-400/25 text-amber-100',                         label: 'Legendary' },
  mythic:    { ring: 'ring-fuchsia-400/80', glow: 'from-pink-500/50 via-fuchsia-500/50 to-violet-500/50', badge: 'bg-gradient-to-r from-pink-400 to-violet-500 text-white', label: 'Mythic' },
};

// Items without an explicit rarity (avatars/frames/titles) derive one from
// their XP cost, so pricier cosmetics shimmer brighter.
const rarityForCost = (cost: number): Rarity =>
  cost >= 1500 ? 'mythic' : cost >= 800 ? 'legendary' : cost >= 400 ? 'epic' : cost >= 150 ? 'rare' : 'common';

export default function ShopMarketplaceView({
  user, xp, setXp, coins, setCoins, setUser, setView, showToast, activateBooster,
}: Props) {
  const { language, dir, isRTL } = useLanguage();
  const t = shopT[language];
  const retention = useRetention(user.uid, xp);
  const { pinned, togglePin, unpin, isPinned } = usePinnedShopItem(user.uid);

  // Egg cinematic state — phases mirror the original ShopView.
  const [openingEgg, setOpeningEgg] = useState<null | {
    egg: typeof MYSTERY_EGGS[0]; phase: 'zoom' | 'shake' | 'crack'; rewardLabel?: string;
  }>(null);

  // --- Purchase / equip RPCs (same shapes as the original ShopView) ---

  const purchaseAvatar = async (a: typeof PREMIUM_AVATARS[0]) => {
    if (coins < a.cost) { showToast(t.notEnoughCoins, "error"); return; }
    const { data, error } = await supabase.rpc('purchase_item', { item_type: 'avatar', item_id: a.emoji, item_cost: a.cost });
    if (error || !data?.success) { showToast(data?.error || t.purchaseFailed, "error"); return; }
    setCoins(data.new_coins);
    setUser(prev => prev ? { ...prev, unlockedAvatars: [...(prev.unlockedAvatars ?? []), a.emoji] } : prev);
    showToast(`✨ ${catalogName('avatars', a.id, language, a.name)}`, "success");
  };

  const equipAvatar = async (emoji: string) => {
    setUser(prev => prev ? { ...prev, avatar: emoji } : prev);
    await supabase.from('users').update({ avatar: emoji }).eq('uid', user.uid);
    showToast(t.avatarEquipped, "success");
  };

  const purchaseTheme = async (theme: typeof THEMES[0]) => {
    if (coins < theme.cost) { showToast(t.notEnoughCoins, "error"); return; }
    const { data, error } = await supabase.rpc('purchase_item', { item_type: 'theme', item_id: theme.id, item_cost: theme.cost });
    if (error || !data?.success) { showToast(data?.error || t.purchaseFailed, "error"); return; }
    setCoins(data.new_coins);
    setUser(prev => prev ? { ...prev, unlockedThemes: [...(prev.unlockedThemes ?? []), theme.id] } : prev);
    showToast(`✨ ${catalogName('themes', theme.id, language, theme.name)}`, "success");
  };

  const equipTheme = async (themeId: string) => {
    setUser(prev => prev ? { ...prev, activeTheme: themeId } : prev);
    await supabase.from('users').update({ active_theme: themeId }).eq('uid', user.uid);
    showToast(t.themeApplied, "success");
  };

  const purchasePowerUp = async (p: typeof POWER_UP_DEFS[0]) => {
    if (coins < p.cost) { showToast(t.notEnoughCoins, "error"); return; }
    const { data, error } = await supabase.rpc('purchase_item', { item_type: 'power_up', item_id: p.id, item_cost: p.cost });
    if (error || !data?.success) { showToast(data?.error || t.purchaseFailed, "error"); return; }
    setCoins(data.new_coins);
    setUser(prev => prev ? { ...prev, powerUps: { ...(prev.powerUps ?? {}), [p.id]: ((prev.powerUps ?? {})[p.id] ?? 0) + 1 } } : prev);
    showToast(`✨ ${catalogName('powerUps', p.id, language, p.name)}`, "success");
  };

  const purchaseBooster = async (b: typeof BOOSTERS_DEFS[0]) => {
    if (coins < b.cost) { showToast(t.notEnoughCoins, "error"); return; }
    const { data, error } = await supabase.rpc('purchase_item', { item_type: 'booster', item_id: b.id, item_cost: b.cost });
    if (error || !data?.success) { showToast(data?.error || t.purchaseFailed, "error"); return; }
    setCoins(data.new_coins);
    activateBooster(b.id as Parameters<typeof activateBooster>[0]);
    showToast(`✨ ${catalogName('boosters', b.id, language, b.name)}`, "success");
  };

  const purchaseTitle = async (title: typeof NAME_TITLES[0]) => {
    if (coins < title.cost) { showToast(t.notEnoughCoins, "error"); return; }
    const { data, error } = await supabase.rpc('purchase_item', { item_type: 'avatar', item_id: `title_${title.id}`, item_cost: title.cost });
    if (error || !data?.success) { showToast(data?.error || t.purchaseFailed, "error"); return; }
    setCoins(data.new_coins);
    setUser(prev => prev ? { ...prev, unlockedAvatars: [...(prev.unlockedAvatars ?? []), `title_${title.id}`] } : prev);
    showToast(`✨ ${catalogName('titles', title.id, language, title.name)}`, "success");
  };

  const equipTitle = async (titleId: string) => {
    const prevTitle = user.activeTitle;
    setUser(prev => prev ? { ...prev, activeTitle: titleId } : prev);
    const { error } = await supabase.from('users').update({ active_title: titleId }).eq('uid', user.uid);
    if (error) {
      setUser(prev => prev ? { ...prev, activeTitle: prevTitle } : prev);
      showToast(t.purchaseFailed, "error");
      return;
    }
    showToast(t.titleEquipped, "success");
  };

  const purchaseFrame = async (frame: typeof NAME_FRAMES[0]) => {
    if (coins < frame.cost) { showToast(t.notEnoughCoins, "error"); return; }
    const { data, error } = await supabase.rpc('purchase_item', { item_type: 'avatar', item_id: `frame_${frame.id}`, item_cost: frame.cost });
    if (error || !data?.success) { showToast(data?.error || t.purchaseFailed, "error"); return; }
    setCoins(data.new_coins);
    setUser(prev => prev ? { ...prev, unlockedAvatars: [...(prev.unlockedAvatars ?? []), `frame_${frame.id}`] } : prev);
    showToast(`✨ ${catalogName('frames', frame.id, language, frame.name)}`, "success");
  };

  const equipFrame = async (frameId: string) => {
    const prevFrame = user.activeFrame;
    setUser(prev => prev ? { ...prev, activeFrame: frameId } : prev);
    const { error } = await supabase.from('users').update({ active_frame: frameId }).eq('uid', user.uid);
    if (error) {
      setUser(prev => prev ? { ...prev, activeFrame: prevFrame } : prev);
      showToast(t.purchaseFailed, "error");
      return;
    }
    showToast(t.frameEquipped, "success");
  };

  const purchaseEgg = async (egg: typeof MYSTERY_EGGS[0]) => {
    if (coins < egg.cost) { showToast(t.notEnoughCoins, "error"); return; }
    setOpeningEgg({ egg, phase: 'zoom' });
    setTimeout(() => setOpeningEgg(prev => prev ? { ...prev, phase: 'shake' } : prev), 300);
    // `open_mystery_egg` is planned for a follow-up Supabase migration
    // (server-side reward roll + cosmetic drops). Until that ships, roll
    // the coin reward on the client and book the net cost via the generic
    // `purchase_item` RPC. Avoids the 404 the missing RPC would otherwise
    // spam in the console every egg open.
    const rpcPromise = (async () => {
      const rewardXp = Math.floor(egg.minXp + Math.random() * (egg.maxXp - egg.minXp + 1));
      // Book the NET in one call: item_cost = egg.cost - rewardXp, so the RPC
      // computes coins - (cost - reward) = coins - cost + reward. pData.new_coins
      // is already the final balance — do NOT add rewardXp again (that double-
      // grants, and award_coins would clamp big egg payouts at 200).
      const { data: pData, error: pErr } = await supabase.rpc('purchase_item', { item_type: 'egg', item_id: egg.id, item_cost: egg.cost - rewardXp });
      if (pErr || !pData?.success) { showToast(pData?.error || t.couldNotOpenEgg, "error"); return null; }
      setCoins(pData.new_coins);
      return `+${rewardXp} 🪙`;
    })();
    const rewardLabel = await rpcPromise;
    if (rewardLabel === null) { setOpeningEgg(null); return; }
    setTimeout(() => setOpeningEgg(prev => prev ? { ...prev, phase: 'crack', rewardLabel } : prev), 900);
  };

  // --- Spotlight glue: when user taps a Spotlight CTA we want to
  //     bring them to the relevant section. Phase 3 keeps it simple:
  //     scroll the page. A future "expanded category grid" can hook in.
  const handleSpotlightShop = (kind: PinnedKind, _id: string) => {
    const sectionId =
      kind === 'avatar'  ? 'section-avatars' :
      kind === 'theme'   ? 'section-themes' :
      kind === 'egg'     ? 'section-eggs' :
      kind === 'frame'   ? 'section-frames' :
      kind === 'title'   ? 'section-titles' :
      kind === 'booster' ? 'section-boosters' :
      kind === 'powerUp' ? 'section-powerups' :
      null;
    if (sectionId) document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleClaimChest = () => {
    const reward = retention.claimDailyChest();
    if (reward) {
      setXp(xp + reward.xp);
      showToast(`+${reward.xp} XP`, "success");
    }
  };

  // --- Theme bg for the page (matches old ShopView) ---
  const activeThemeConfig = THEMES.find(th => th.id === (user.activeTheme ?? 'default')) ?? THEMES[0];
  const isDefault = (user?.activeTheme ?? 'default') === 'default';
  // Default shop now wears the dark arcade backdrop so it matches the hub
  // + sub-pages; a purchased theme still overrides it (the student chose it).
  const pageBg = isDefault ? ARCADE_BG : activeThemeConfig.colors.bg;

  // --- Helpers for card states ---
  const ownsAvatar = (emoji: string) => !!user.unlockedAvatars?.includes(emoji);
  const ownsTheme = (id: string) => id === 'default' || !!user.unlockedThemes?.includes(id);
  const ownsFrame = (id: string) => !!user.unlockedAvatars?.includes(`frame_${id}`);
  const ownsTitle = (id: string) => !!user.unlockedAvatars?.includes(`title_${id}`);

  // --- Owned-collection row ---
  // Flatten every purchased / unlocked cosmetic the student already owns
  // into one list so they can equip from one row at the top instead of
  // hunting through the catalogue rows.  Power-ups + boosters are
  // omitted — they're consumed during games, not equipped.  Default
  // theme is excluded too: it's the free baseline, not a purchase.
  type OwnedTile = {
    kind: 'avatar' | 'theme' | 'frame' | 'title';
    id: string;
    emoji: string;
    label: string;
    equipped: boolean;
    equip: () => void;
  };
  const ownedTiles: OwnedTile[] = [
    ...PREMIUM_AVATARS.filter(a => ownsAvatar(a.emoji)).map<OwnedTile>(a => ({
      kind: 'avatar', id: a.id, emoji: a.emoji,
      label: catalogName('avatars', a.id, language, a.name),
      equipped: user.avatar === a.emoji,
      equip: () => equipAvatar(a.emoji),
    })),
    ...THEMES.filter(th => th.id !== 'default' && ownsTheme(th.id)).map<OwnedTile>(th => ({
      kind: 'theme', id: th.id, emoji: '🎨',
      label: catalogName('themes', th.id, language, th.name),
      equipped: user.activeTheme === th.id,
      equip: () => equipTheme(th.id),
    })),
    ...NAME_FRAMES.filter(f => ownsFrame(f.id)).map<OwnedTile>(f => ({
      kind: 'frame', id: f.id, emoji: '🖼️',
      label: catalogName('frames', f.id, language, f.name),
      equipped: user.activeFrame === f.id,
      equip: () => equipFrame(f.id),
    })),
    ...NAME_TITLES.filter(ti => ownsTitle(ti.id)).map<OwnedTile>(ti => ({
      kind: 'title', id: ti.id, emoji: '👑',
      label: catalogName('titles', ti.id, language, ti.name),
      equipped: user.activeTitle === ti.id,
      equip: () => equipTitle(ti.id),
    })),
  ];

  // Pin button — appears on every locked card.
  const PinButton = ({ kind, id }: { kind: PinnedKind; id: string }) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); togglePin(kind, id); }}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      className={`absolute top-1.5 end-1.5 w-7 h-7 rounded-full backdrop-blur-sm flex items-center justify-center transition-all ${
        isPinned(kind, id) ? 'bg-emerald-500 text-white' : 'bg-white/80 text-stone-600 hover:bg-white'
      }`}
      aria-label={isPinned(kind, id) ? 'Unpin' : 'Pin'}
    >
      <Pin size={14} className={isPinned(kind, id) ? 'fill-current' : ''} />
    </button>
  );

  // Sticky jump-chip nav targets — keyed to the section ids below.
  const categories: { id: string; emoji: string; label: string }[] = [
    { id: 'section-eggs', emoji: '🥚', label: t.mysteryEggsAndChests },
    { id: 'section-avatars', emoji: '🎭', label: t.featuredAvatars },
    { id: 'section-themes', emoji: '🎨', label: t.themes },
    { id: 'section-powerups', emoji: '⚡', label: t.powerUps },
    { id: 'section-boosters', emoji: '🚀', label: t.boosters },
    { id: 'section-frames', emoji: '🖼️', label: t.avatarFrames },
    { id: 'section-titles', emoji: '👑', label: t.nameTitles },
  ];
  const jumpTo = (id: string) => {
    if (typeof document === 'undefined') return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Frosted dark card shell with a rarity-tinted ring + glow. `active`
  // (equipped) overrides the rarity ring with the cyan "selected" look.
  const ItemShell = ({ rarity, active, width, children }: {
    rarity: Rarity; active?: boolean; width: string; children: React.ReactNode;
  }) => (
    <div
      className={`relative ${width} overflow-hidden rounded-2xl bg-white/10 p-3 shadow-lg shadow-violet-900/30 ring-2 backdrop-blur-md ${
        active ? 'ring-cyan-300 shadow-cyan-500/30' : RARITY_DARK[rarity].ring
      }`}
    >
      <div aria-hidden className={`pointer-events-none absolute -top-8 -end-8 h-24 w-24 rounded-full bg-gradient-to-br ${RARITY_DARK[rarity].glow} blur-2xl`} />
      <div className="relative">{children}</div>
    </div>
  );

  // Locked-item footer — a progress bar toward affording the item plus a
  // "play to earn" nudge that routes back to the hub, so an unaffordable
  // item becomes a reason to play instead of a dead end.
  const LockedFooter = ({ cost }: { cost: number }) => {
    const pct = Math.min(100, Math.round((coins / Math.max(1, cost)) * 100));
    return (
      <div className="space-y-1.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/15 ring-1 ring-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${pct}%` }} />
        </div>
        <button
          type="button"
          onClick={() => setView('student-dashboard')}
          style={{ touchAction: 'manipulation' }}
          className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-white/15 py-1.5 text-[10px] font-black text-white ring-1 ring-white/20 hover:bg-white/25"
        >
          <Lock size={10} /> {t.needed(`${Math.max(0, cost - coins)} 🪙`)} · {t.playToEarn}
        </button>
      </div>
    );
  };

  // ---------- Card renderers ----------

  const renderEgg = (egg: typeof MYSTERY_EGGS[0]) => {
    const rarity: Rarity = (egg.rarity as Rarity) in RARITY_DARK ? (egg.rarity as Rarity) : 'common';
    const canAfford = coins >= egg.cost;
    return (
      <ItemShell rarity={rarity} width="w-44 sm:w-48">
        <div className="flex justify-end">
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${RARITY_DARK[rarity].badge}`}>{RARITY_DARK[rarity].label}</span>
        </div>
        <div className="my-2 flex justify-center">
          <span className="text-5xl drop-shadow-lg sm:text-6xl">{egg.emoji}</span>
        </div>
        <h3 className="text-center text-sm font-black text-white">{catalogName('eggs', egg.id, language, egg.name)}</h3>
        <p className="mt-1 line-clamp-2 min-h-[2rem] text-center text-[11px] text-white/70">{catalogDesc('eggs', egg.id, language, egg.desc)}</p>
        <div className="mt-2">
          {canAfford ? (
            <motion.button
              type="button" whileTap={{ scale: 0.97 }}
              onClick={() => purchaseEgg(egg)}
              className="inline-flex w-full items-center justify-center gap-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 py-1.5 text-[11px] font-black text-white"
            ><Zap size={10} className="fill-white" /> {egg.cost}</motion.button>
          ) : <LockedFooter cost={egg.cost} />}
        </div>
      </ItemShell>
    );
  };

  // Avatar tile — dimmed when locked, with inline XP-gap badge.
  // Phase 5 (locked-avatar inline state): no nested tiers, just dim + badge.
  const renderAvatar = (a: typeof PREMIUM_AVATARS[0]) => {
    const owned = ownsAvatar(a.emoji);
    const equipped = user.avatar === a.emoji;
    const canAfford = coins >= a.cost;
    const rarity = rarityForCost(a.cost);
    return (
      <ItemShell rarity={rarity} active={equipped} width="w-32 sm:w-36">
        {!owned && <PinButton kind="avatar" id={a.id} />}
        <div className="my-1 flex justify-center">
          <span className={`text-5xl ${!owned && !canAfford ? 'opacity-50 grayscale' : ''}`}>{a.emoji}</span>
        </div>
        <h3 className="truncate text-center text-xs font-black text-white">
          {catalogName('avatars', a.id, language, a.name)}
        </h3>
        <div className="mt-2">
          {owned ? (
            equipped ? (
              <span className="block text-center text-[10px] font-black uppercase tracking-widest text-cyan-300">
                <Check size={11} className="-mt-0.5 me-0.5 inline" /> {t.unlocked}
              </span>
            ) : (
              <motion.button
                type="button" whileTap={{ scale: 0.97 }}
                onClick={() => equipAvatar(a.emoji)}
                className="w-full rounded-full bg-violet-600 py-1.5 text-[11px] font-black text-white"
              >
                Equip
              </motion.button>
            )
          ) : canAfford ? (
            <motion.button
              type="button" whileTap={{ scale: 0.97 }}
              onClick={() => purchaseAvatar(a)}
              className="inline-flex w-full items-center justify-center gap-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 py-1.5 text-[11px] font-black text-white"
            >
              <Zap size={10} className="fill-white" /> {a.cost}
            </motion.button>
          ) : (
            <LockedFooter cost={a.cost} />
          )}
        </div>
      </ItemShell>
    );
  };

  const renderTheme = (th: typeof THEMES[0]) => {
    const owned = ownsTheme(th.id);
    const active = user.activeTheme === th.id || (!user.activeTheme && th.id === 'default');
    const canAfford = coins >= th.cost;
    return (
      <div className={`relative w-40 sm:w-44 rounded-2xl ${th.colors.bg} ${th.colors.card === 'bg-white' ? '' : th.colors.card} p-3 ring-2 ${active ? 'ring-violet-500' : 'ring-stone-200'} shadow-sm`}>
        {!owned && <PinButton kind="theme" id={th.id} />}
        <div className={`flex justify-center text-4xl ${th.colors.text}`}>{th.preview}</div>
        <h3 className={`mt-2 text-xs font-black text-center ${th.colors.text}`}>
          {catalogName('themes', th.id, language, th.name)}
        </h3>
        <div className="mt-2">
          {owned ? (
            active ? (
              <span className="block text-center text-[10px] font-black uppercase tracking-widest text-violet-600">
                <Check size={11} className="inline -mt-0.5 me-0.5" /> Active
              </span>
            ) : (
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => equipTheme(th.id)}
                className="w-full text-[11px] font-black bg-violet-600 text-white rounded-full py-1.5"
              >
                Apply
              </motion.button>
            )
          ) : canAfford ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => purchaseTheme(th)}
              className="w-full inline-flex items-center justify-center gap-0.5 text-[11px] font-black bg-stone-900 text-white rounded-full py-1.5"
            >
              <Zap size={10} className="text-amber-300 fill-amber-300" /> {th.cost}
            </motion.button>
          ) : (
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-stone-500">
              <Lock size={10} /> {th.cost} 🪙
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFrame = (f: typeof NAME_FRAMES[0]) => {
    const owned = ownsFrame(f.id);
    const active = user.activeFrame === f.id;
    const canAfford = coins >= f.cost;
    const rarity = rarityForCost(f.cost);
    return (
      <ItemShell rarity={rarity} active={active} width="w-36 sm:w-40">
        {!owned && <PinButton kind="frame" id={f.id} />}
        <div className="my-1 flex justify-center">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-3xl ${f.border}`}>{f.preview}</div>
        </div>
        <h3 className="truncate text-center text-xs font-black text-white">
          {catalogName('frames', f.id, language, f.name)}
        </h3>
        <div className="mt-2">
          {owned ? (
            active ? (
              <span className="block text-center text-[10px] font-black uppercase tracking-widest text-cyan-300"><Check size={11} className="-mt-0.5 me-0.5 inline" />Equipped</span>
            ) : (
              <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => equipFrame(f.id)} className="w-full rounded-full bg-violet-600 py-1.5 text-[11px] font-black text-white">Equip</motion.button>
            )
          ) : canAfford ? (
            <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => purchaseFrame(f)} className="inline-flex w-full items-center justify-center gap-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 py-1.5 text-[11px] font-black text-white"><Zap size={10} className="fill-white" /> {f.cost}</motion.button>
          ) : (
            <LockedFooter cost={f.cost} />
          )}
        </div>
      </ItemShell>
    );
  };

  const renderTitle = (ti: typeof NAME_TITLES[0]) => {
    const owned = ownsTitle(ti.id);
    const active = user.activeTitle === ti.id;
    const canAfford = coins >= ti.cost;
    const style = TITLE_STYLES[ti.id] ?? 'text-white font-black';
    const rarity = rarityForCost(ti.cost);
    return (
      <ItemShell rarity={rarity} active={active} width="w-44 sm:w-48">
        {!owned && <PinButton kind="title" id={ti.id} />}
        <div className="my-2 flex justify-center">
          <span className={`text-lg ${style}`}>{catalogDisplay('titles', ti.id, language, ti.display)}</span>
        </div>
        <div className="mt-2">
          {owned ? (
            active ? (
              <span className="block text-center text-[10px] font-black uppercase tracking-widest text-cyan-300"><Check size={11} className="-mt-0.5 me-0.5 inline" />Equipped</span>
            ) : (
              <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => equipTitle(ti.id)} className="w-full rounded-full bg-violet-600 py-1.5 text-[11px] font-black text-white">Equip</motion.button>
            )
          ) : canAfford ? (
            <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => purchaseTitle(ti)} className="inline-flex w-full items-center justify-center gap-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 py-1.5 text-[11px] font-black text-white"><Zap size={10} className="fill-white" /> {ti.cost}</motion.button>
          ) : (
            <LockedFooter cost={ti.cost} />
          )}
        </div>
      </ItemShell>
    );
  };

  const renderPowerUp = (p: typeof POWER_UP_DEFS[0]) => {
    const owned = (user.powerUps ?? {})[p.id] ?? 0;
    const canAfford = coins >= p.cost;
    const grad = POWERUP_STYLES[p.id] ?? 'from-stone-500 to-stone-700';
    return (
      <div className={`relative w-44 sm:w-48 rounded-2xl bg-gradient-to-br ${grad} p-4 shadow-md`}>
        {!canAfford && <PinButton kind="powerUp" id={p.id} />}
        <div className="flex justify-center my-1">
          <span className="text-5xl drop-shadow">{p.emoji}</span>
        </div>
        <h3 className="text-sm font-black text-white text-center">{catalogName('powerUps', p.id, language, p.name)}</h3>
        <p className="text-[11px] text-white/85 text-center mt-1 line-clamp-2 min-h-[2rem]">{catalogDesc('powerUps', p.id, language, p.desc)}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          {owned > 0 && (
            <span className="inline-flex items-center text-[10px] font-black bg-white/20 text-white px-2 py-0.5 rounded-full">x{owned}</span>
          )}
          <motion.button
            type="button" whileTap={{ scale: 0.97 }}
            onClick={() => purchasePowerUp(p)}
            disabled={!canAfford}
            className="flex-1 inline-flex items-center justify-center gap-0.5 text-[11px] font-black bg-white text-stone-900 rounded-full py-1.5 disabled:opacity-60"
          ><Zap size={10} className="text-amber-500 fill-amber-500" /> {p.cost}</motion.button>
        </div>
      </div>
    );
  };

  const renderBooster = (b: typeof BOOSTERS_DEFS[0]) => {
    const canAfford = coins >= b.cost;
    const grad = BOOSTER_STYLES[b.id] ?? 'from-stone-500 to-stone-700';
    return (
      <div className={`relative w-44 sm:w-48 rounded-2xl bg-gradient-to-br ${grad} p-4 shadow-md`}>
        {!canAfford && <PinButton kind="booster" id={b.id} />}
        <div className="flex justify-center my-1">
          <span className="text-5xl drop-shadow">{b.emoji}</span>
        </div>
        <h3 className="text-sm font-black text-white text-center">{catalogName('boosters', b.id, language, b.name)}</h3>
        <p className="text-[11px] text-white/85 text-center mt-1 line-clamp-2 min-h-[2rem]">{catalogDesc('boosters', b.id, language, b.desc)}</p>
        <motion.button
          type="button" whileTap={{ scale: 0.97 }}
          onClick={() => purchaseBooster(b)}
          disabled={!canAfford}
          className="mt-2 w-full inline-flex items-center justify-center gap-0.5 text-[11px] font-black bg-white text-stone-900 rounded-full py-1.5 disabled:opacity-60"
        ><Zap size={10} className="text-amber-500 fill-amber-500" /> {b.cost}</motion.button>
      </div>
    );
  };

  // ---------- Featured deals ----------
  // A curated hero strip of the highest-value items across categories —
  // the dopamine shelf at the top. Deterministic (priciest first) so it's
  // stable across renders.
  const byCostDesc = <T extends { cost: number }>(a: T, b: T) => b.cost - a.cost;
  const featuredEgg = [...MYSTERY_EGGS].sort(byCostDesc)[0];
  const featuredAvatars = [...PREMIUM_AVATARS].sort(byCostDesc).slice(0, 2);
  const featuredTitle = [...NAME_TITLES].sort(byCostDesc)[0];
  const featuredLabel = ({ en: 'Featured', he: 'מומלצים', ar: 'مميز', ru: 'Рекомендуемые' } as Record<string, string>)[language] ?? 'Featured';

  // ---------- Layout ----------

  return (
    <div className={`min-h-screen ${pageBg} p-4 sm:p-6`} dir={dir}>
      <div className="max-w-2xl mx-auto">
        {/* Header — back + balance */}
        <div className={`flex items-center justify-between mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => setView("student-dashboard")}
            type="button"
            style={{ touchAction: 'manipulation' }}
            className={`inline-flex items-center gap-1 text-sm font-semibold text-white/70 hover:text-white transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <ChevronLeft size={16} className={isRTL ? 'rotate-180' : ''} />
            Dashboard
          </button>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full ps-2 pe-3 py-1.5 ring-1 ring-white/20 shadow-lg shadow-violet-900/30">
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-base leading-none">
              🪙
            </span>
            <span className="font-black text-white tabular-nums">{coins.toLocaleString()}</span>
          </div>
        </div>

        {/* Sticky category jump-chips — kids tap to leap straight to a
            section instead of long-scrolling. Sticks to the top of the
            viewport with a blurred backdrop as the catalogue scrolls under. */}
        <div className="sticky top-0 z-20 -mx-4 mb-4 bg-violet-950/60 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6">
          <div
            className={`flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => jumpTo(c.id)}
                style={{ touchAction: 'manipulation' }}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/80 ring-1 ring-white/15 backdrop-blur-md transition hover:bg-white/20 hover:text-white"
              >
                <span aria-hidden>{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Spotlight — dynamic hero. Falls through priorities to find
            the most relevant nudge. Null when no priority matches. */}
        <Spotlight
          user={user}
          coins={coins}
          language={language}
          isRTL={isRTL}
          dailyChestAvailable={retention.dailyChestAvailable}
          onClaimChest={handleClaimChest}
          pinned={pinned}
          onUnpin={unpin}
          onShop={handleSpotlightShop}
        />

        {/* Featured deals — curated hero strip of the priciest items, in a
            glowing frame so it reads as the shop's headline shelf. */}
        <section className="mt-4 rounded-3xl bg-white/5 p-3 ring-1 ring-white/15 sm:p-4">
          <header className={`mb-2.5 flex items-center gap-2 px-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="text-2xl leading-none" aria-hidden>⭐</span>
            <h2 className="text-lg font-black tracking-tight text-white">{featuredLabel}</h2>
          </header>
          <div className={`flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin] ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="shrink-0">{renderEgg(featuredEgg)}</div>
            {featuredAvatars.map((a) => (
              <div key={a.id} className="shrink-0">{renderAvatar(a)}</div>
            ))}
            <div className="shrink-0">{renderTitle(featuredTitle)}</div>
          </div>
        </section>

        <div className="mt-6 space-y-6">
          {/* Your collection — flat list of equippable cosmetics the
              student already owns.  Hidden when they own nothing so a
              brand-new student doesn't see an empty rail. */}
          {ownedTiles.length > 0 && (
            <section id="section-owned">
              <CategoryCarousel
                emoji="✨"
                title={t.yourCollection}
                items={ownedTiles}
                keyFor={(o) => `${o.kind}-${o.id}`}
                renderCard={(o) => (
                  <div
                    className={`relative w-32 rounded-2xl bg-white/10 p-3 ring-2 shadow-lg shadow-violet-900/30 backdrop-blur-md transition-all sm:w-36 ${
                      o.equipped
                        ? 'ring-cyan-300 shadow-cyan-500/30'
                        : 'ring-white/20'
                    }`}
                  >
                    <div className="my-1 flex justify-center">
                      <span className="text-4xl">{o.emoji}</span>
                    </div>
                    <h3 className="truncate text-center text-xs font-black text-white">
                      {o.label}
                    </h3>
                    <div className="mt-2">
                      {o.equipped ? (
                        <span className="block text-center text-[10px] font-black uppercase tracking-widest text-violet-600">
                          <Check size={11} className="inline -mt-0.5 me-0.5" /> {t.equippedLabel}
                        </span>
                      ) : (
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={o.equip}
                          className="w-full text-[11px] font-black bg-violet-600 text-white rounded-full py-1.5"
                        >
                          {t.equipAction}
                        </motion.button>
                      )}
                    </div>
                  </div>
                )}
                isRTL={isRTL}
              />
            </section>
          )}

          <section id="section-eggs">
            <CategoryCarousel
              emoji="🥚"
              title={t.mysteryEggsAndChests}
              items={MYSTERY_EGGS}
              keyFor={(e) => e.id}
              renderCard={renderEgg}
              isRTL={isRTL}
            />
          </section>

          <section id="section-avatars">
            <CategoryCarousel
              emoji="🎭"
              title={t.featuredAvatars}
              items={PREMIUM_AVATARS}
              keyFor={(a) => a.id}
              renderCard={renderAvatar}
              isRTL={isRTL}
            />
          </section>

          <section id="section-themes">
            <CategoryCarousel
              emoji="🎨"
              title={t.themes}
              items={THEMES}
              keyFor={(th) => th.id}
              renderCard={renderTheme}
              isRTL={isRTL}
            />
          </section>

          {/* Power-ups + Boosters were previously merged behind a toggle;
              split into separate carousels so students see both
              catalogues by default (the toggle hid half the inventory
              from anyone who didn't notice the pill). */}
          <section id="section-powerups">
            <CategoryCarousel
              emoji="⚡"
              title={t.powerUps}
              items={POWER_UP_DEFS}
              keyFor={(p) => p.id}
              renderCard={renderPowerUp}
              isRTL={isRTL}
            />
          </section>

          <section id="section-boosters">
            <CategoryCarousel
              emoji="🚀"
              title={t.boosters}
              items={BOOSTERS_DEFS}
              keyFor={(b) => b.id}
              renderCard={renderBooster}
              isRTL={isRTL}
            />
          </section>

          {/* Frames + Titles same treatment — separate rows. */}
          <section id="section-frames">
            <CategoryCarousel
              emoji="🖼️"
              title={t.avatarFrames}
              items={NAME_FRAMES}
              keyFor={(f) => f.id}
              renderCard={renderFrame}
              isRTL={isRTL}
            />
          </section>

          <section id="section-titles">
            <CategoryCarousel
              emoji="👑"
              title={t.nameTitles}
              items={NAME_TITLES}
              keyFor={(ti) => ti.id}
              renderCard={renderTitle}
              isRTL={isRTL}
            />
          </section>
        </div>
      </div>

      {/* Egg-opening cinematic — modal overlay, same UX as old ShopView. */}
      <AnimatePresence>
        {openingEgg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 backdrop-blur-sm"
            onClick={() => openingEgg.phase === 'crack' && setOpeningEgg(null)}
          >
            <motion.div
              key={openingEgg.phase}
              initial={openingEgg.phase === 'zoom' ? { scale: 0.5, opacity: 0 } : { scale: 1 }}
              animate={
                openingEgg.phase === 'zoom'
                  ? { scale: 1, opacity: 1 }
                  : openingEgg.phase === 'shake'
                  ? { rotate: [0, -10, 10, -8, 8, 0] }
                  : { scale: [1, 1.4, 1] }
              }
              transition={
                openingEgg.phase === 'zoom'
                  ? { duration: 0.25 }
                  : openingEgg.phase === 'shake'
                  ? { duration: 0.8, repeat: openingEgg.phase === 'shake' ? 1 : 0 }
                  : { duration: 0.6 }
              }
              className="text-center"
            >
              <div className="text-9xl mb-4 drop-shadow-2xl">{openingEgg.egg.emoji}</div>
              {openingEgg.phase === 'crack' && openingEgg.rewardLabel && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-2xl font-black text-white bg-gradient-to-br from-amber-400 to-orange-500 px-4 py-2 rounded-full inline-block shadow-lg"
                >
                  {openingEgg.rewardLabel}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <FloatingButtons />
    </div>
  );
}
