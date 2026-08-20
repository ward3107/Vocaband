// Single-screen marketplace — replaces the multi-tab ShopView + Arcade
// Lobby hub. One scroll, big horizontal carousels per category,
// Spotlight dynamic hero at the top. See docs/shop-redesign-plan.md.

import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Zap, Pin, Lock, Check, ChevronLeft } from "lucide-react";
import { supabase, type AppUser } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import { useRetention } from "../hooks/useRetention";
import { usePinnedShopItem, type PinnedKind } from "../hooks/usePinnedShopItem";
import { usePetAccessory } from "../hooks/usePetAccessory";
import { shopT } from "../locales/student/shop";
import { catalogName, catalogDesc, catalogDisplay } from "../locales/student/shop-catalog";
import FloatingButtons from "../components/FloatingButtons";
import CategoryCarousel from "../components/shop/CategoryCarousel";
import Spotlight from "../components/shop/Spotlight";
import {
  PREMIUM_AVATARS, THEMES, POWER_UP_DEFS, BOOSTERS_DEFS,
  NAME_FRAMES, NAME_TITLES, PET_ACCESSORIES,
  LUCKY_SPIN_COST, LUCKY_SPIN_PRIZES, rollSpinPrize, type SpinPrize, type PetAccessory,
} from "../constants/game";
import { TITLE_STYLES } from "../constants/titleStyles";
import type { View } from "../core/views";

interface Props {
  user: AppUser;
  xp: number;
  setXp: (xp: number) => void;
  coins: number;
  setCoins: (coins: number) => void;
  setUser: Dispatch<SetStateAction<AppUser | null>>;
  setView: Dispatch<SetStateAction<View>>;
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
  const petAccessory = usePetAccessory(user.uid);

  // Lucky Spin cinematic state — spin, then reveal the rolled prize.
  const [spinning, setSpinning] = useState<null | {
    phase: 'spin' | 'reveal'; prize?: SpinPrize;
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

  // Lucky Spin — the honest replacement for Mystery Eggs. The full prize
  // table (coins + power-ups, with odds) is printed on the card, and the
  // prize is rolled here, then booked through the generic `purchase_item`
  // RPC. The 'egg' item_type is just the RPC's coins-only debit path (no
  // unlock array) — reused here so no migration is needed.
  const purchaseSpin = async () => {
    if (coins < LUCKY_SPIN_COST) { showToast(t.notEnoughCoins, "error"); return; }
    setSpinning({ phase: 'spin' });
    const prize = rollSpinPrize();
    // For a coin prize, book the NET (cost - winnings) in one call so the
    // balance lands correct. For a power-up prize, debit the full cost here
    // and grant the item below.
    const coinPrize = prize.kind === 'coins' ? Number(prize.value) : 0;
    const { data: pData, error: pErr } = await supabase.rpc('purchase_item', { item_type: 'egg', item_id: 'lucky_spin', item_cost: LUCKY_SPIN_COST - coinPrize });
    if (pErr || !pData?.success) { showToast(pData?.error || t.spinFailed, "error"); setSpinning(null); return; }
    setCoins(pData.new_coins);
    if (prize.kind === 'power_up') {
      const puId = String(prize.value);
      const { data: gData } = await supabase.rpc('purchase_item', { item_type: 'power_up', item_id: puId, item_cost: 0 });
      if (gData?.success) {
        setCoins(gData.new_coins);
        setUser(prev => prev ? { ...prev, powerUps: { ...(prev.powerUps ?? {}), [puId]: ((prev.powerUps ?? {})[puId] ?? 0) + 1 } } : prev);
      }
    }
    setTimeout(() => setSpinning(prev => prev ? { phase: 'reveal', prize } : prev), 900);
  };

  // --- Pet Shop: buy / wear accessories for the companion pet ---
  const ownsPet = (id: string) => !!user.unlockedAvatars?.includes(`pet_${id}`);

  const purchasePetAccessory = async (acc: PetAccessory) => {
    if (coins < acc.cost) { showToast(t.notEnoughCoins, "error"); return; }
    // Owned forever, server-side: reuse the avatar unlock array with a
    // `pet_` prefix (same pattern frames/titles use).
    const { data, error } = await supabase.rpc('purchase_item', { item_type: 'avatar', item_id: `pet_${acc.id}`, item_cost: acc.cost });
    if (error || !data?.success) { showToast(data?.error || t.purchaseFailed, "error"); return; }
    setCoins(data.new_coins);
    setUser(prev => prev ? { ...prev, unlockedAvatars: [...(prev.unlockedAvatars ?? []), `pet_${acc.id}`] } : prev);
    petAccessory.setEquipped(acc.id); // auto-wear what you just bought
    showToast(`✨ ${acc.name}`, "success");
  };

  const equipPetAccessory = (id: string) => {
    petAccessory.setEquipped(id);
    showToast(t.petAccessoryEquipped, "success");
  };
  const removePetAccessory = () => {
    petAccessory.setEquipped(null);
    showToast(t.petAccessoryRemoved, "success");
  };

  // --- Spotlight glue: when user taps a Spotlight CTA we want to
  //     bring them to the relevant section. Phase 3 keeps it simple:
  //     scroll the page. A future "expanded category grid" can hook in.
  const handleSpotlightShop = (kind: PinnedKind, _id: string) => {
    const sectionId =
      kind === 'avatar'  ? 'section-avatars' :
      kind === 'theme'   ? 'section-themes' :
      kind === 'pet'     ? 'section-pets' :
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
  const pageBg = isDefault ? "bg-[var(--ios-grouped-bg)]" : activeThemeConfig.colors.bg;

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
    { id: 'section-spin', emoji: '🎰', label: t.luckySpin },
    { id: 'section-avatars', emoji: '🎭', label: t.featuredAvatars },
    { id: 'section-pets', emoji: '🐾', label: t.petShop },
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
    rarity: Rarity; active?: boolean; width: string; children: ReactNode;
  }) => (
    <div
      className={`relative ${width} overflow-hidden rounded-2xl bg-[var(--ios-grouped-card)] p-3 shadow-sm ring-2 ${
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
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ios-fill-tertiary)] ring-1 ring-[color:var(--ios-separator)]">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${pct}%` }} />
        </div>
        <button
          type="button"
          onClick={() => setView('student-dashboard')}
          style={{ touchAction: 'manipulation' }}
          className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-[var(--ios-fill-tertiary)] py-1.5 text-[10px] font-black text-[color:var(--ios-label)] hover:bg-[var(--ios-fill-secondary)]"
        >
          <Lock size={10} /> {t.needed(`${Math.max(0, cost - coins)} 🪙`)} · {t.playToEarn}
        </button>
      </div>
    );
  };

  // ---------- Card renderers ----------

  // Lucky Spin — a single wide card whose ENTIRE prize table (with odds)
  // is printed up front, so there are no hidden promises. Spin button when
  // affordable, locked progress footer otherwise.
  const totalSpinWeight = LUCKY_SPIN_PRIZES.reduce((s, p) => s + p.weight, 0);
  const renderSpin = () => {
    const canAfford = coins >= LUCKY_SPIN_COST;
    return (
      <ItemShell rarity="legendary" width="w-full">
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <span className="text-5xl drop-shadow-lg">🎰</span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-black text-[color:var(--ios-label)]">{t.luckySpin}</h3>
            <p className="text-[11px] text-[color:var(--ios-label-secondary)]">{t.luckySpinDesc}</p>
          </div>
        </div>
        {/* Transparent prize table — every outcome + its odds. */}
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {LUCKY_SPIN_PRIZES.map(prize => (
            <div key={prize.id} className="flex items-center gap-1.5 rounded-lg bg-[var(--ios-fill-tertiary)] px-2 py-1 ring-1 ring-[color:var(--ios-separator)]">
              <span className="text-base leading-none">{prize.emoji}</span>
              <span className="flex-1 truncate text-[10px] font-bold text-[color:var(--ios-label-secondary)]">{prize.label}</span>
              <span className="text-[10px] font-black tabular-nums text-amber-300">{Math.round((prize.weight / totalSpinWeight) * 100)}%</span>
            </div>
          ))}
        </div>
        <div className="mt-3">
          {canAfford ? (
            <motion.button
              type="button" whileTap={{ scale: 0.97 }}
              onClick={purchaseSpin}
              disabled={!!spinning}
              className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 py-2 text-sm font-black text-white disabled:opacity-60"
            ><Zap size={12} className="fill-white" /> {t.spinFor(LUCKY_SPIN_COST)}</motion.button>
          ) : <LockedFooter cost={LUCKY_SPIN_COST} />}
        </div>
      </ItemShell>
    );
  };

  const renderPetAccessory = (acc: PetAccessory) => {
    const owned = ownsPet(acc.id);
    const worn = petAccessory.equipped === acc.id;
    const canAfford = coins >= acc.cost;
    const rarity = rarityForCost(acc.cost);
    return (
      <ItemShell rarity={rarity} active={worn} width="w-32 sm:w-36">
        {!owned && <PinButton kind="pet" id={acc.id} />}
        <div className="my-1 flex justify-center">
          <span className={`text-5xl ${!owned && !canAfford ? 'opacity-50 grayscale' : ''}`}>{acc.emoji}</span>
        </div>
        <h3 className="truncate text-center text-xs font-black text-[color:var(--ios-label)]">{acc.name}</h3>
        <div className="mt-2">
          {owned ? (
            worn ? (
              <motion.button
                type="button" whileTap={{ scale: 0.97 }}
                onClick={removePetAccessory}
                className="block w-full text-center text-[10px] font-black uppercase tracking-widest text-[color:var(--ios-label-secondary)]"
              ><Check size={11} className="-mt-0.5 me-0.5 inline" /> {t.petWearing}</motion.button>
            ) : (
              <motion.button
                type="button" whileTap={{ scale: 0.97 }}
                onClick={() => equipPetAccessory(acc.id)}
                className="w-full rounded-full bg-violet-600 py-1.5 text-[11px] font-black text-white"
              >{t.petWear}</motion.button>
            )
          ) : canAfford ? (
            <motion.button
              type="button" whileTap={{ scale: 0.97 }}
              onClick={() => purchasePetAccessory(acc)}
              className="inline-flex w-full items-center justify-center gap-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 py-1.5 text-[11px] font-black text-white"
            ><Zap size={10} className="fill-white" /> {acc.cost}</motion.button>
          ) : (
            <LockedFooter cost={acc.cost} />
          )}
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
        <h3 className="truncate text-center text-xs font-black text-[color:var(--ios-label)]">
          {catalogName('avatars', a.id, language, a.name)}
        </h3>
        <div className="mt-2">
          {owned ? (
            equipped ? (
              <span className="block text-center text-[10px] font-black uppercase tracking-widest text-[color:var(--ios-label-secondary)]">
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
          <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-[var(--ios-fill-tertiary)] text-3xl ${f.border}`}>{f.preview}</div>
        </div>
        <h3 className="truncate text-center text-xs font-black text-[color:var(--ios-label)]">
          {catalogName('frames', f.id, language, f.name)}
        </h3>
        <div className="mt-2">
          {owned ? (
            active ? (
              <span className="block text-center text-[10px] font-black uppercase tracking-widest text-[color:var(--ios-label-secondary)]"><Check size={11} className="-mt-0.5 me-0.5 inline" />Equipped</span>
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
    const style = TITLE_STYLES[ti.id] ?? 'text-[color:var(--ios-label)] font-black';
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
              <span className="block text-center text-[10px] font-black uppercase tracking-widest text-[color:var(--ios-label-secondary)]"><Check size={11} className="-mt-0.5 me-0.5 inline" />Equipped</span>
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
  const featuredAvatars = [...PREMIUM_AVATARS].sort(byCostDesc).slice(0, 2);
  const featuredTitle = [...NAME_TITLES].sort(byCostDesc)[0];
  const featuredPet = [...PET_ACCESSORIES].sort(byCostDesc)[0];
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
            className={`inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--ios-label-secondary)] hover:text-[color:var(--ios-label)] transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <ChevronLeft size={16} className={isRTL ? 'rotate-180' : ''} />
            Dashboard
          </button>
          <div className="flex items-center gap-2 bg-[var(--ios-grouped-card)] rounded-full ps-2 pe-3 py-1.5 ring-1 ring-[color:var(--ios-separator)] shadow-sm">
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-base leading-none">
              🪙
            </span>
            <span className="font-black text-[color:var(--ios-label)] tabular-nums">{coins.toLocaleString()}</span>
          </div>
        </div>

        {/* Sticky category jump-chips — kids tap to leap straight to a
            section instead of long-scrolling. Sticks to the top of the
            viewport with a blurred backdrop as the catalogue scrolls under. */}
        <div className="sticky top-0 z-20 -mx-4 mb-4 bg-[var(--ios-grouped-bg)]/85 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6">
          <div
            className={`flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => jumpTo(c.id)}
                style={{ touchAction: 'manipulation' }}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--ios-fill-tertiary)] px-3 py-1.5 text-xs font-bold text-[color:var(--ios-label)] transition hover:bg-[var(--ios-fill-secondary)]"
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
        <section className="mt-4 rounded-3xl bg-[var(--ios-grouped-card)] p-3 ring-1 ring-[color:var(--ios-separator)] sm:p-4">
          <header className={`mb-2.5 flex items-center gap-2 px-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="text-2xl leading-none" aria-hidden>⭐</span>
            <h2 className="text-lg font-black tracking-tight text-[color:var(--ios-label)]">{featuredLabel}</h2>
          </header>
          <div className={`flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin] ${isRTL ? 'flex-row-reverse' : ''}`}>
            {featuredAvatars.map((a) => (
              <div key={a.id} className="shrink-0">{renderAvatar(a)}</div>
            ))}
            <div className="shrink-0">{renderTitle(featuredTitle)}</div>
            <div className="shrink-0">{renderPetAccessory(featuredPet)}</div>
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
                    className={`relative w-32 rounded-2xl bg-[var(--ios-grouped-card)] p-3 ring-2 shadow-sm transition-all sm:w-36 ${
                      o.equipped
                        ? 'ring-cyan-300 shadow-cyan-500/30'
                        : 'ring-[color:var(--ios-separator)]'
                    }`}
                  >
                    <div className="my-1 flex justify-center">
                      <span className="text-4xl">{o.emoji}</span>
                    </div>
                    <h3 className="truncate text-center text-xs font-black text-[color:var(--ios-label)]">
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

          {/* Lucky Spin — full-width honest gamble, no carousel (single item). */}
          <section id="section-spin">
            <header className={`mb-2.5 flex items-center gap-2 px-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-2xl leading-none" aria-hidden>🎰</span>
              <h2 className="text-lg font-black tracking-tight text-[color:var(--ios-label)]">{t.luckySpin}</h2>
            </header>
            {renderSpin()}
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

          {/* Pet Shop — accessories for the dashboard companion pet. The
              only shop category that overlaps nothing else; a clean coin
              sink tied to the pet that's now central on the dashboard. */}
          <section id="section-pets">
            <CategoryCarousel
              emoji="🐾"
              title={t.petShop}
              items={PET_ACCESSORIES}
              keyFor={(p) => p.id}
              renderCard={renderPetAccessory}
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

      {/* Lucky Spin cinematic — the wheel spins, then reveals the prize
          that was already rolled + booked. Tap to dismiss once revealed. */}
      <AnimatePresence>
        {spinning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 backdrop-blur-sm"
            onClick={() => spinning.phase === 'reveal' && setSpinning(null)}
          >
            <motion.div key={spinning.phase} className="text-center">
              {spinning.phase === 'spin' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                  className="text-9xl drop-shadow-2xl"
                >🎰</motion.div>
              ) : spinning.prize && (
                <>
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: [0.5, 1.3, 1], opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="mb-4 text-9xl drop-shadow-2xl"
                  >{spinning.prize.emoji}</motion.div>
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-block rounded-full bg-gradient-to-br from-amber-400 to-orange-500 px-4 py-2 text-2xl font-black text-white shadow-lg"
                  >
                    {t.youWon(spinning.prize.label)}
                  </motion.div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <FloatingButtons />
    </div>
  );
}
