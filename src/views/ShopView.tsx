import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Zap, Sparkles, ChevronRight } from "lucide-react";
import { supabase, type AppUser } from "../core/supabase";
import FloatingButtons from "../components/FloatingButtons";
import DropOfTheWeekCard from "../components/dashboard/DropOfTheWeekCard";
import {
  XP_TITLES, getXpTitle, PREMIUM_AVATARS, AVATAR_CATEGORY_UNLOCKS,
  THEMES, POWER_UP_DEFS, BOOSTERS_DEFS, NAME_FRAMES, NAME_TITLES,
  MYSTERY_EGGS, LIMITED_ROTATION,
} from "../constants/game";
import { AVATAR_CATEGORIES } from "../constants/avatars";
import type { View, ShopTab } from "../core/views";

interface ShopViewProps {
  user: AppUser;
  xp: number;
  setXp: (xp: number) => void;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  setView: React.Dispatch<React.SetStateAction<View>>;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  shopTab: ShopTab;
  setShopTab: React.Dispatch<React.SetStateAction<ShopTab>>;
  /** Activate a booster on purchase (xp_booster, streak_freeze, etc).
   * Called AFTER the purchase RPC succeeds — booster effect lives in
   * the useBoosters hook in App.tsx. */
  activateBooster: (id: 'streak_freeze' | 'lucky_spin' | 'xp_booster' | 'lucky_charm' | 'focus_mode' | 'weekend_warrior') => void;
}

// Per-title signature styling lives in src/constants/titleStyles.ts so
// the dashboard banner can render the equipped title with the SAME
// font / weight / gradient the student saw in the shop.
import { TITLE_STYLES } from '../constants/titleStyles';

// Per-booster gradient — vibe matches purpose (XP=warm, defensive=cool).
const BOOSTER_STYLES: Record<string, string> = {
  streak_freeze:  'from-sky-400 via-cyan-500 to-blue-600',
  lucky_spin:     'from-emerald-500 via-teal-500 to-cyan-600',
  xp_booster:     'from-amber-500 via-orange-500 to-rose-500',
  lucky_charm:    'from-emerald-400 via-green-500 to-teal-500',
  focus_mode:     'from-violet-500 via-purple-500 to-fuchsia-500',
  weekend_warrior:'from-fuchsia-500 via-pink-500 to-rose-500',
};

// Per-powerup gradient — keeps cards visually distinct in the grid.
const POWERUP_STYLES: Record<string, string> = {
  skip:          'from-stone-500 via-stone-600 to-stone-700',
  fifty_fifty:   'from-blue-500 via-indigo-500 to-violet-600',
  reveal_letter: 'from-amber-400 via-yellow-500 to-orange-500',
  double_points: 'from-fuchsia-500 via-pink-500 to-rose-500',
  time_freeze:   'from-cyan-400 via-sky-500 to-blue-600',
  peek:          'from-emerald-500 via-teal-500 to-cyan-600',
};

// Rarity → gradient / ring classes used on egg cards. Kept in one place so
// the visual rarity language stays consistent with the eggs themselves.
const RARITY_STYLES: Record<string, { bg: string; ring: string; badge: string; glow: string }> = {
  common:    { bg: 'from-stone-100 to-stone-200',          ring: 'ring-stone-300',   badge: 'bg-stone-200 text-stone-700',    glow: 'from-stone-200/0 to-stone-300/0' },
  rare:      { bg: 'from-sky-100 to-blue-200',             ring: 'ring-blue-300',    badge: 'bg-blue-200 text-blue-800',      glow: 'from-sky-300/40 to-blue-400/40' },
  epic:      { bg: 'from-violet-100 to-purple-200',        ring: 'ring-violet-300',  badge: 'bg-violet-200 text-violet-800',  glow: 'from-violet-400/40 to-purple-500/40' },
  legendary: { bg: 'from-amber-100 via-yellow-100 to-orange-200', ring: 'ring-amber-300', badge: 'bg-amber-200 text-amber-800', glow: 'from-amber-400/50 to-orange-500/50' },
  mythic:    { bg: 'from-pink-200 via-fuchsia-200 to-violet-200', ring: 'ring-fuchsia-400', badge: 'bg-gradient-to-r from-pink-400 to-violet-500 text-white', glow: 'from-pink-400/60 via-fuchsia-500/60 to-violet-500/60' },
};

// Deterministic limited-rotation item picker (same for all students in
// a given ISO week).  Mirrors the one in useRetention so the shop hero
// matches the dashboard ticker.
function currentLimitedItem() {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 1);
  const diffDays = Math.floor((d.getTime() - start.getTime()) / 86400000);
  const week = `${d.getFullYear()}-W${Math.ceil((diffDays + start.getDay() + 1) / 7)}`;
  let hash = 0;
  for (let i = 0; i < week.length; i++) hash = (hash * 31 + week.charCodeAt(i)) | 0;
  return LIMITED_ROTATION[Math.abs(hash) % LIMITED_ROTATION.length];
}

export default function ShopView({ user, xp, setXp, setUser, setView, showToast, shopTab, setShopTab, activateBooster }: ShopViewProps) {
  // Cinematic egg-opening state.  Phases:
  //   'idle'    → no cinematic
  //   'zoom'    → egg zooming into centre (250ms)
  //   'shake'   → 3 shakes (900ms)
  //   'crack'   → flash + confetti burst, reward label fades in (1200ms)
  // The real RPC (via purchaseEgg) runs in parallel so network latency
  // is hidden inside the ~2s animation window.
  const [openingEgg, setOpeningEgg] = useState<null | { egg: typeof MYSTERY_EGGS[0]; phase: 'zoom' | 'shake' | 'crack'; rewardLabel?: string }>(null);

  const purchaseAvatar = async (avatar: typeof PREMIUM_AVATARS[0]) => {
    if (xp < avatar.cost) { showToast("Not enough XP!", "error"); return; }
    const { data, error } = await supabase.rpc('purchase_item', { item_type: 'avatar', item_id: avatar.emoji, item_cost: avatar.cost });
    if (error || !data?.success) { showToast(data?.error || "Purchase failed!", "error"); return; }
    setXp(data.new_xp);
    setUser(prev => prev ? { ...prev, unlockedAvatars: [...(prev.unlockedAvatars ?? []), avatar.emoji] } : prev);
    showToast(`Unlocked ${avatar.name}!`, "success");
  };

  const equipAvatar = async (emoji: string) => {
    setUser(prev => prev ? { ...prev, avatar: emoji } : prev);
    await supabase.from('users').update({ avatar: emoji }).eq('uid', user.uid);
    showToast("Avatar equipped!", "success");
  };

  const purchaseTheme = async (theme: typeof THEMES[0]) => {
    if (xp < theme.cost) { showToast("Not enough XP!", "error"); return; }
    const { data, error } = await supabase.rpc('purchase_item', { item_type: 'theme', item_id: theme.id, item_cost: theme.cost });
    if (error || !data?.success) { showToast(data?.error || "Purchase failed!", "error"); return; }
    setXp(data.new_xp);
    setUser(prev => prev ? { ...prev, unlockedThemes: [...(prev.unlockedThemes ?? []), theme.id] } : prev);
    showToast(`Unlocked ${theme.name}!`, "success");
  };

  const equipTheme = async (themeId: string) => {
    setUser(prev => prev ? { ...prev, activeTheme: themeId } : prev);
    await supabase.from('users').update({ active_theme: themeId }).eq('uid', user.uid);
    showToast("Theme applied!", "success");
  };

  const purchasePowerUp = async (powerUp: typeof POWER_UP_DEFS[0]) => {
    if (xp < powerUp.cost) { showToast("Not enough XP!", "error"); return; }
    const { data, error } = await supabase.rpc('purchase_item', { item_type: 'power_up', item_id: powerUp.id, item_cost: powerUp.cost });
    if (error || !data?.success) { showToast(data?.error || "Purchase failed!", "error"); return; }
    setXp(data.new_xp);
    setUser(prev => prev ? { ...prev, powerUps: { ...(prev.powerUps ?? {}), [powerUp.id]: ((prev.powerUps ?? {})[powerUp.id] ?? 0) + 1 } } : prev);
    showToast(`Got ${powerUp.name}!`, "success");
  };

  // Mystery-egg purchase flow. Calls the (optional) server-side
  // `open_mystery_egg` RPC which rolls the reward and returns either
  // `{ success, new_xp, reward_xp, reward_item?, reward_label? }` or
  // `{ error }`. If the RPC isn't deployed yet, we fall back to a
  // pure-client XP deduction + random roll so the feature still shows
  // students a tangible drop — the server RPC can replace this later.
  // Run the network work + cinematic in parallel — the 2-second
  // animation hides most RPC latency and the reward label only updates
  // once the real result lands, so students see a matching number.
  const purchaseEgg = async (egg: typeof MYSTERY_EGGS[0]) => {
    if (xp < egg.cost) { showToast("Not enough XP!", "error"); return; }
    // Kick off the cinematic immediately.
    setOpeningEgg({ egg, phase: 'zoom' });
    setTimeout(() => setOpeningEgg(prev => prev ? { ...prev, phase: 'shake' } : prev), 300);
    // Fire the RPC in the background.
    const rpcPromise = (async () => {
      const { data, error } = await supabase.rpc('open_mystery_egg', { egg_id: egg.id, egg_cost: egg.cost });
      if (!error && data?.success) {
        setXp(data.new_xp);
        return data.reward_label || `+${data.reward_xp ?? 0} XP`;
      }
      // Fallback path — roll client-side via purchase_item RPC.
      const rewardXp = Math.floor(egg.minXp + Math.random() * (egg.maxXp - egg.minXp + 1));
      const { data: pData, error: pErr } = await supabase.rpc('purchase_item', { item_type: 'egg', item_id: egg.id, item_cost: egg.cost - rewardXp });
      if (pErr || !pData?.success) {
        showToast(pData?.error || "Could not open egg — try again later.", "error");
        return null;
      }
      setXp(pData.new_xp);
      return `+${rewardXp} XP`;
    })();
    // Advance to "crack" at 1.2s, show the reward label whenever RPC finishes.
    const rewardLabel = await rpcPromise;
    if (rewardLabel === null) { setOpeningEgg(null); return; }
    setTimeout(() => {
      setOpeningEgg(prev => prev ? { ...prev, phase: 'crack', rewardLabel } : prev);
    }, Math.max(0, 1200 - 300));
  };

  const purchaseBooster = async (booster: typeof BOOSTERS_DEFS[0]) => {
    if (xp < booster.cost) { showToast("Not enough XP!", "error"); return; }
    const { data, error } = await supabase.rpc('purchase_item', { item_type: 'booster', item_id: booster.id, item_cost: booster.cost });
    if (error || !data?.success) { showToast(data?.error || "Purchase failed!", "error"); return; }
    setXp(data.new_xp);
    // Activate the booster client-side so it actually takes effect in
    // the next game.  Previously the purchase succeeded but the booster
    // did nothing — this is the bug the user flagged.
    activateBooster(booster.id as Parameters<typeof activateBooster>[0]);
    // Per-booster confirmation message so students know what they got.
    const confirmations: Record<string, string> = {
      xp_booster:      'Got 2× XP Booster — active for the next 24 hours!',
      weekend_warrior: 'Got Weekend Warrior — 2× XP every Sat & Sun!',
      streak_freeze:   'Got Streak Freeze — your next missed day is forgiven.',
      lucky_charm:     'Got Lucky Charm — first wrong answer in your next game is forgiven.',
      focus_mode:      'Got Focus Mode — distraction-free for 1 hour.',
      lucky_spin:      'Got Lucky Spin token — spin from the shop hub!',
    };
    showToast(confirmations[booster.id] ?? `Got ${booster.name}! 🎉`, "success");
  };

  const activeThemeConfig = THEMES.find(t => t.id === (user.activeTheme ?? 'default')) ?? THEMES[0];
  const isDefault = (user?.activeTheme ?? 'default') === 'default';
  const pageBg = isDefault
    ? 'bg-gradient-to-b from-violet-50 via-stone-50 to-white'
    : activeThemeConfig.colors.bg;

  return (
    <div className={`min-h-screen ${pageBg} p-4 sm:p-6`}>
      <div className="max-w-2xl mx-auto">
        {/* Header row — Back link + live XP balance */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setView("student-dashboard")}
            type="button"
            style={{ touchAction: 'manipulation' }}
            className="inline-flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-stone-900 transition-colors"
          >
            ← Back to dashboard
          </button>
          <div className="flex items-center gap-2 bg-white rounded-full pl-2 pr-3 py-1.5 border border-stone-200 shadow-sm">
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Zap size={14} className="text-white fill-white" />
            </span>
            <span className="font-black text-stone-900 tabular-nums">{xp}</span>
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">XP</span>
          </div>
        </div>

        {/* --- ARCADE LOBBY HUB --- Only rendered when shopTab === "hub".
            Otherwise we show a "back to shop" breadcrumb + the focused
            category content below. */}
        {shopTab === "hub" ? (
          <ArcadeLobbyHub
            xp={xp}
            setShopTab={setShopTab}
          />
        ) : (
          // Sticky "back to hub" chip — stays visible as the student
          // scrolls through a tall category grid.  Dashboard chip beside
          // it for a one-tap exit out of the shop entirely.
          <div className="sticky top-2 z-20 mb-5 flex items-center gap-2">
            <button
              onClick={() => setShopTab("hub")}
              type="button"
              style={{ touchAction: 'manipulation' }}
              className="inline-flex items-center gap-1.5 text-sm font-black text-white bg-stone-900/90 backdrop-blur-sm hover:bg-stone-800 rounded-full pl-2 pr-3 py-2 shadow-lg transition-all"
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center rotate-180"><ChevronRight size={12} /></span>
              Shop hub
            </button>
            <button
              onClick={() => setView("student-dashboard")}
              type="button"
              style={{ touchAction: 'manipulation' }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white/80 backdrop-blur-sm border border-stone-200 hover:border-stone-300 rounded-full px-3 py-2 shadow-sm transition-all"
            >
              Dashboard
            </button>
          </div>
        )}

        {/* Mystery Eggs — the new hero shop category. Each egg is a big,
            3D-feeling card with a rarity-coded gradient, ambient glow, and
            an animated emoji that wobbles on hover so it feels alive. */}
        {shopTab === "eggs" && (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 p-5 shadow-lg shadow-violet-500/20">
              <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 bg-amber-300/40 rounded-full blur-3xl" />
              <div className="relative flex items-center gap-3">
                <Sparkles size={22} className="text-white" />
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white">Mystery Eggs & Chests</h2>
                  <p className="text-xs sm:text-sm text-white/90 mt-0.5">Spend XP to open an egg — every egg drops a random XP reward (and sometimes a surprise).</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {MYSTERY_EGGS.map(egg => {
                const rarity = RARITY_STYLES[egg.rarity] ?? RARITY_STYLES.common;
                const canAfford = xp >= egg.cost;
                return (
                  <div
                    key={egg.id}
                    className={`relative group overflow-hidden rounded-3xl bg-gradient-to-br ${rarity.bg} p-4 sm:p-5 ring-2 ${rarity.ring} shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all`}
                  >
                    {/* Ambient rarity glow behind the egg */}
                    <div aria-hidden className={`pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl bg-gradient-to-br ${rarity.glow}`} />
                    {/* Rarity badge */}
                    <div className="relative flex justify-end">
                      <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${rarity.badge}`}>
                        {egg.rarity}
                      </span>
                    </div>
                    {/* Giant animated emoji */}
                    <div className="relative flex justify-center my-2 sm:my-3">
                      <span className="text-6xl sm:text-7xl drop-shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                        {egg.emoji}
                      </span>
                    </div>
                    <h3 className="relative text-sm sm:text-base font-black text-stone-900 text-center">{egg.name}</h3>
                    <p className="relative text-[11px] sm:text-xs text-stone-700/80 text-center mt-1 min-h-[2.5rem]">{egg.desc}</p>
                    {/* XP drop range chip */}
                    <div className="relative flex justify-center mt-2">
                      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-stone-700 bg-white/70 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/80">
                        <Zap size={10} className="text-amber-500 fill-amber-500" />
                        {egg.minXp}–{egg.maxXp} XP drop
                      </span>
                    </div>
                    {/* Open button */}
                    <button
                      onClick={() => purchaseEgg(egg)}
                      disabled={!canAfford}
                      type="button"
                      style={{ touchAction: 'manipulation' }}
                      className={`relative mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-sm font-black transition-all ${
                        canAfford
                          ? 'bg-stone-900 text-white hover:bg-stone-800 active:scale-95 shadow-md'
                          : 'bg-white/60 text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      {canAfford ? 'Open' : 'Need'} <Zap size={12} className="text-amber-400 fill-amber-400" /> {egg.cost}
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-xs text-stone-500 italic">Tip: save up for the Rainbow Egg — it's the rarest drop in the shop.</p>
          </div>
        )}

        {/* Avatar Shop */}
        {shopTab === "avatars" && (
          <div className="space-y-6">
            {/* Avatar Collections — Category-based unlocking */}
            <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-blue-100">
              <h2 className="text-xl font-black mb-2">Avatar Collections</h2>
              <p className="text-stone-500 text-sm mb-4">Earn XP to unlock new avatar packs! Select any unlocked avatar to equip it.</p>
              <div className="space-y-4">
                {(Object.keys(AVATAR_CATEGORIES) as Array<keyof typeof AVATAR_CATEGORIES>).map(category => {
                  const unlock = AVATAR_CATEGORY_UNLOCKS[category] ?? { xpRequired: 0, label: 'Free' };
                  const isUnlocked = xp >= unlock.xpRequired;
                  const progressPercent = unlock.xpRequired > 0 ? Math.min(100, Math.round((xp / unlock.xpRequired) * 100)) : 100;
                  return (
                    <div key={category} className={`rounded-2xl border-2 overflow-hidden transition-all ${isUnlocked ? "border-green-200 bg-green-50/50" : "border-stone-200 bg-stone-50"}`}>
                      <div className={`flex items-center justify-between px-4 py-3 ${isUnlocked ? "bg-green-100/50" : "bg-stone-100"}`}>
                        <div className="flex items-center gap-2">
                          {isUnlocked ? (
                            <CheckCircle2 size={16} className="text-green-600" />
                          ) : (
                            <span className="text-sm">🔒</span>
                          )}
                          <span className={`text-sm font-black ${isUnlocked ? "text-green-800" : "text-stone-500"}`}>{category}</span>
                          <span className="text-xs text-stone-400">({AVATAR_CATEGORIES[category].length} avatars)</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isUnlocked ? "bg-green-200 text-green-800" : "bg-amber-100 text-amber-700"}`}>
                          {unlock.xpRequired === 0 ? "Free" : isUnlocked ? "Unlocked!" : `${unlock.label} needed`}
                        </span>
                      </div>
                      {!isUnlocked && (
                        <div className="px-4 pt-2 pb-1">
                          <div className="w-full bg-stone-200 rounded-full h-1.5">
                            <div className="bg-amber-400 h-1.5 rounded-full transition-all" style={{ width: `${progressPercent}%` }}></div>
                          </div>
                          <p className="text-xs text-stone-400 mt-1">{xp} / {unlock.xpRequired} XP ({progressPercent}%)</p>
                        </div>
                      )}
                      <div className={`grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-3 p-3 sm:p-4 ${!isUnlocked ? "opacity-40 pointer-events-none" : ""}`}>
                        {AVATAR_CATEGORIES[category].map(a => {
                          const isEquipped = user.avatar === a;
                          return (
                            <button
                              key={a}
                              onClick={() => { if (isUnlocked) equipAvatar(a); }}
                              type="button"
                              style={{ touchAction: 'manipulation' }}
                              className={`relative aspect-square flex items-center justify-center rounded-2xl text-3xl sm:text-4xl transition-all border ${
                                isEquipped
                                  ? "bg-gradient-to-br from-indigo-400 via-violet-500 to-fuchsia-500 border-white shadow-lg shadow-violet-300/50 ring-2 ring-violet-400 scale-105"
                                  : isUnlocked
                                  ? "bg-gradient-to-br from-white to-stone-50 border-stone-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-violet-200 shadow-sm cursor-pointer"
                                  : "bg-stone-100 border-stone-200 grayscale"
                              }`}
                            >
                              <span className="drop-shadow-sm">{isUnlocked ? a : "?"}</span>
                              {isEquipped && (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-md">
                                  <CheckCircle2 size={14} className="text-violet-600" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Featured Premium Avatars — hero "trading card" style tiles:
                bigger, tilted gradient backgrounds with ambient glow and
                a floating emoji so they feel more like collectibles than
                plain grid items. */}
            <div className="bg-gradient-to-br from-white to-amber-50/40 rounded-3xl p-6 shadow-md border-2 border-amber-100">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={18} className="text-amber-500" />
                <h2 className="text-xl font-black">Featured Avatars</h2>
              </div>
              <p className="text-stone-500 text-sm mb-4">Exclusive premium avatars — limited-style drops for XP.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {PREMIUM_AVATARS.map(avatar => {
                  const isOwned = (user.unlockedAvatars ?? []).includes(avatar.emoji);
                  const isEquipped = user.avatar === avatar.emoji;
                  const canAfford = xp >= avatar.cost;
                  // Gradient cycles so the wall of cards feels varied
                  // without us having to store per-avatar colour meta.
                  const gradients = [
                    'from-violet-400 via-fuchsia-500 to-pink-500',
                    'from-sky-400 via-cyan-500 to-emerald-500',
                    'from-amber-400 via-orange-500 to-rose-500',
                    'from-emerald-400 via-teal-500 to-sky-500',
                    'from-rose-400 via-pink-500 to-purple-500',
                  ];
                  const gradient = gradients[Math.abs(avatar.emoji.charCodeAt(0)) % gradients.length];
                  return (
                    <div
                      key={avatar.emoji}
                      className={`relative overflow-hidden rounded-3xl transition-all shadow-md hover:shadow-2xl hover:-translate-y-0.5 ${
                        isEquipped ? "ring-2 ring-violet-500" : ""
                      }`}
                    >
                      {/* Gradient back panel — gives the card its 3D pop */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} ${!isOwned ? "opacity-80" : ""}`} />
                      {/* Soft radial glow behind the emoji */}
                      <div aria-hidden className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 bg-white/30 rounded-full blur-3xl" />
                      {/* Subtle noise / sparkle overlay */}
                      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/20" />

                      <div className="relative p-4 flex flex-col items-center">
                        {/* Hero emoji in a frosted circle */}
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center mb-2 shadow-inner">
                          <span className="text-5xl sm:text-6xl drop-shadow-lg">{isOwned ? avatar.emoji : "?"}</span>
                        </div>
                        <span className="text-sm font-black text-white text-center drop-shadow">{avatar.name}</span>
                        <div className="mt-2 w-full flex justify-center">
                          {isEquipped ? (
                            <span className="inline-flex items-center gap-1 text-xs font-black text-white bg-white/25 backdrop-blur-sm px-3 py-1 rounded-full border border-white/40">
                              <CheckCircle2 size={12} /> Equipped
                            </span>
                          ) : isOwned ? (
                            <button
                              onClick={() => equipAvatar(avatar.emoji)}
                              type="button"
                              style={{ touchAction: 'manipulation' }}
                              className="inline-flex items-center gap-1 text-xs font-black text-stone-900 bg-white hover:bg-stone-50 px-3 py-1 rounded-full shadow-md transition-all"
                            >
                              Equip
                            </button>
                          ) : (
                            <button
                              onClick={() => purchaseAvatar(avatar)}
                              disabled={!canAfford}
                              type="button"
                              style={{ touchAction: 'manipulation' }}
                              className={`inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full shadow-md transition-all ${canAfford ? "text-stone-900 bg-white hover:bg-stone-50" : "text-white/70 bg-black/20 cursor-not-allowed"}`}
                            >
                              <Zap size={10} className="text-amber-500 fill-amber-500" /> {avatar.cost} XP
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Theme Shop — big hero cards. Each theme's bg class is used as a
            full-bleed preview strip so students can see the actual vibe
            before buying, not just a tiny swatch. */}
        {shopTab === "themes" && (
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-black text-stone-900">Themes</h2>
              <p className="text-stone-500 text-sm mt-1">Change the whole-app vibe. Preview shows the actual theme background.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {THEMES.map(theme => {
                const isOwned = theme.cost === 0 || (user.unlockedThemes ?? []).includes(theme.id);
                const isActive = (user.activeTheme ?? 'default') === theme.id;
                const canAfford = xp >= theme.cost;
                return (
                  <div
                    key={theme.id}
                    className={`relative overflow-hidden rounded-3xl shadow-lg hover:shadow-2xl transition-all border-2 ${isActive ? 'border-blue-500 ring-2 ring-blue-300' : 'border-white/80'}`}
                  >
                    {/* Full-bleed theme preview strip — uses the actual theme bg class */}
                    <div className={`${theme.colors.bg} h-32 sm:h-36 relative flex items-center justify-center`}>
                      <span className="text-6xl sm:text-7xl drop-shadow-lg">{theme.preview}</span>
                      {/* Subtle overlay so text stays readable on any theme bg */}
                      <div aria-hidden className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                    </div>
                    {/* Info + CTA strip on white background — high contrast */}
                    <div className="bg-white p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-black text-stone-900 truncate">{theme.name}</h3>
                        <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5">
                          {theme.cost === 0 ? 'Included for free' : `Unlock with XP`}
                        </p>
                      </div>
                      {isActive ? (
                        <span className="shrink-0 inline-flex items-center gap-1 text-xs font-black text-blue-700 bg-blue-100 border border-blue-200 px-3 py-2 rounded-xl">
                          <CheckCircle2 size={12} /> Active
                        </span>
                      ) : isOwned ? (
                        <button
                          onClick={() => equipTheme(theme.id)}
                          type="button"
                          style={{ touchAction: 'manipulation' }}
                          className="shrink-0 inline-flex items-center gap-1 text-sm font-black text-white bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-xl shadow-md transition-all"
                        >
                          Apply
                        </button>
                      ) : (
                        <button
                          onClick={() => purchaseTheme(theme)}
                          disabled={!canAfford}
                          type="button"
                          style={{ touchAction: 'manipulation' }}
                          className={`shrink-0 inline-flex items-center gap-1 text-sm font-black px-4 py-2 rounded-xl shadow-md transition-all ${canAfford ? 'text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110' : 'text-stone-400 bg-stone-100 cursor-not-allowed'}`}
                        >
                          <Zap size={12} className={canAfford ? 'fill-white' : ''} /> {theme.cost}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Name Titles — big cards, each with a per-title signature
            gradient and typography vibe so the page looks like a roster
            of trading cards instead of a uniform grid. */}
        {shopTab === "titles" && (
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-black text-stone-900">Name Titles</h2>
              <p className="text-stone-500 text-sm mt-1">Show off a custom title below your name. Each one has its own vibe.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {NAME_TITLES.map(title => {
                const isOwned = (user.unlockedAvatars ?? []).includes(`title_${title.id}`);
                const isActive = user.activeTitle === title.id;
                const canAfford = xp >= title.cost;
                const style = TITLE_STYLES[title.id] ?? TITLE_STYLES._default;
                return (
                  <div
                    key={title.id}
                    className={`relative overflow-hidden rounded-3xl shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all ${isActive ? 'ring-2 ring-blue-400' : ''}`}
                  >
                    {/* Signature gradient backdrop */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient}`} />
                    <div aria-hidden className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 bg-white/15 rounded-full blur-3xl" />
                    {/* Subtle pattern overlay */}
                    <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/10" />

                    <div className="relative p-5 sm:p-6 min-h-[140px] flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">Title</p>
                        <p
                          className={`${style.titleFont} ${style.titleWeight} ${style.titleExtra ?? ''} text-white drop-shadow-lg leading-tight truncate`}
                          style={style.titleStyle}
                        >
                          {title.display}
                        </p>
                        <p className="text-xs text-white/80 mt-2 max-w-xs">{style.vibe}</p>
                      </div>
                      <div className="shrink-0">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-stone-900 bg-white px-3 py-2 rounded-xl shadow-md">
                            <CheckCircle2 size={12} /> Active
                          </span>
                        ) : isOwned ? (
                          <button
                            onClick={async () => {
                              const prevTitle = user.activeTitle ?? null;
                              setUser(prev => prev ? { ...prev, activeTitle: title.id } : prev);
                              const { error } = await supabase
                                .from('users')
                                .update({ active_title: title.id })
                                .eq('uid', user.uid);
                              if (error) {
                                // Revert optimistic state so the dashboard
                                // stays in sync with the DB.  Surfacing
                                // the message instead of the previous
                                // silent "equipped!" lie tells the student
                                // (or us in support) why nothing changed.
                                setUser(prev => prev ? { ...prev, activeTitle: prevTitle } : prev);
                                showToast(`Couldn't equip title: ${error.message}`, "error");
                                return;
                              }
                              showToast("Title equipped!", "success");
                            }}
                            type="button"
                            style={{ touchAction: 'manipulation' }}
                            className="inline-flex items-center gap-1 text-sm font-black text-stone-900 bg-white hover:bg-stone-50 px-4 py-2 rounded-xl shadow-md transition-all"
                          >
                            Equip
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              if (xp < title.cost) { showToast("Not enough XP!", "error"); return; }
                              const { data, error } = await supabase.rpc('purchase_item', { item_type: 'avatar', item_id: `title_${title.id}`, item_cost: title.cost });
                              if (error || !data?.success) { showToast(data?.error || "Purchase failed!", "error"); return; }
                              setXp(data.new_xp);
                              setUser(prev => prev ? { ...prev, unlockedAvatars: [...(prev.unlockedAvatars ?? []), `title_${title.id}`] } : prev);
                              showToast(`Unlocked "${title.display}"!`, "success");
                            }}
                            disabled={!canAfford}
                            type="button"
                            style={{ touchAction: 'manipulation' }}
                            className={`inline-flex items-center gap-1 text-sm font-black px-4 py-2 rounded-xl shadow-md transition-all ${canAfford ? 'text-stone-900 bg-white hover:bg-stone-50' : 'text-white/60 bg-black/20 cursor-not-allowed'}`}
                          >
                            <Zap size={12} className={canAfford ? 'text-amber-500 fill-amber-500' : ''} /> {title.cost}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Avatar Frames Shop */}
        {shopTab === "frames" && (
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-black text-stone-900">Avatar Frames</h2>
              <p className="text-stone-500 text-sm mt-1">A glowing border that wraps your avatar everywhere it appears.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {NAME_FRAMES.map(frame => {
                const isOwned = (user.unlockedAvatars ?? []).includes(`frame_${frame.id}`);
                const isActive = user.activeFrame === frame.id;
                const canAfford = xp >= frame.cost;
                return (
                  <div
                    key={frame.id}
                    className={`relative overflow-hidden rounded-3xl shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 ${isActive ? 'ring-2 ring-blue-400' : ''}`}
                  >
                    {/* Ambient corner glow tinted to the frame's accent */}
                    <div aria-hidden className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-violet-500/30 to-pink-500/30 rounded-full blur-3xl" />
                    <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-12 w-40 h-40 bg-gradient-to-br from-amber-400/20 to-rose-400/20 rounded-full blur-3xl" />

                    <div className="relative p-5 sm:p-6 flex items-center gap-4 sm:gap-5">
                      {/* Big avatar wearing the frame, on a checkered preview pad */}
                      <div className="shrink-0 relative">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-stone-100 to-white flex items-center justify-center text-5xl sm:text-6xl shadow-inner border border-white/20">
                          <span className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white flex items-center justify-center ${frame.border}`}>
                            {user.avatar || '😎'}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Frame</p>
                        <h3 className="text-lg sm:text-xl font-black text-white leading-tight">{frame.name}</h3>
                        <p className="text-xs text-white/70 mt-1">Wraps your avatar with a glowing ring.</p>
                        <div className="mt-3">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 text-xs font-black text-blue-100 bg-blue-500/30 border border-blue-400/40 px-3 py-2 rounded-xl">
                              <CheckCircle2 size={12} /> Active
                            </span>
                          ) : isOwned ? (
                            <button
                              onClick={async () => {
                                const prevFrame = user.activeFrame ?? null;
                                setUser(prev => prev ? { ...prev, activeFrame: frame.id } : prev);
                                const { error } = await supabase
                                  .from('users')
                                  .update({ active_frame: frame.id })
                                  .eq('uid', user.uid);
                                if (error) {
                                  // Revert + surface — see Title equip
                                  // handler above for the same rationale.
                                  setUser(prev => prev ? { ...prev, activeFrame: prevFrame } : prev);
                                  showToast(`Couldn't equip frame: ${error.message}`, "error");
                                  return;
                                }
                                showToast("Frame equipped!", "success");
                              }}
                              type="button"
                              style={{ touchAction: 'manipulation' }}
                              className="inline-flex items-center gap-1 text-sm font-black text-stone-900 bg-white hover:bg-stone-50 px-4 py-2 rounded-xl shadow-md transition-all"
                            >
                              Equip
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                if (xp < frame.cost) { showToast("Not enough XP!", "error"); return; }
                                const { data, error } = await supabase.rpc('purchase_item', { item_type: 'avatar', item_id: `frame_${frame.id}`, item_cost: frame.cost });
                                if (error || !data?.success) { showToast(data?.error || "Purchase failed!", "error"); return; }
                                setXp(data.new_xp);
                                setUser(prev => prev ? { ...prev, unlockedAvatars: [...(prev.unlockedAvatars ?? []), `frame_${frame.id}`] } : prev);
                                showToast(`Unlocked ${frame.name}!`, "success");
                              }}
                              disabled={!canAfford}
                              type="button"
                              style={{ touchAction: 'manipulation' }}
                              className={`inline-flex items-center gap-1 text-sm font-black px-4 py-2 rounded-xl shadow-md transition-all ${canAfford ? 'text-stone-900 bg-white hover:bg-stone-50' : 'text-white/60 bg-white/10 cursor-not-allowed'}`}
                            >
                              <Zap size={12} className={canAfford ? 'text-amber-500 fill-amber-500' : ''} /> {frame.cost}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Boosters — big hero cards.  Each booster has its own gradient
            tied to its purpose (warm = XP, cool = streak/freeze). */}
        {shopTab === "boosters" && (
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-black text-stone-900">Boosters</h2>
              <p className="text-stone-500 text-sm mt-1">One-shot buffs that make your next plays count more.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {BOOSTERS_DEFS.map(booster => {
                const canAfford = xp >= booster.cost;
                const grad = BOOSTER_STYLES[booster.id] ?? 'from-fuchsia-500 via-pink-500 to-rose-500';
                return (
                  <div
                    key={booster.id}
                    className={`relative overflow-hidden rounded-3xl shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all bg-gradient-to-br ${grad}`}
                  >
                    <div aria-hidden className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
                    <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/10" />
                    <div className="relative p-5 sm:p-6 flex items-center gap-4 sm:gap-5">
                      <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-5xl sm:text-6xl shadow-inner">
                        {booster.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/80 mb-0.5">Booster</p>
                        <h3 className="text-lg sm:text-xl font-black text-white leading-tight">{booster.name}</h3>
                        <p className="text-xs text-white/85 mt-1 leading-relaxed">{booster.desc}</p>
                        <div className="mt-3">
                          <button
                            onClick={() => purchaseBooster(booster)}
                            disabled={!canAfford}
                            type="button"
                            style={{ touchAction: 'manipulation' }}
                            className={`inline-flex items-center gap-1 text-sm font-black px-4 py-2 rounded-xl shadow-md transition-all ${canAfford ? 'text-stone-900 bg-white hover:bg-stone-50' : 'text-white/60 bg-white/10 cursor-not-allowed'}`}
                          >
                            <Zap size={12} className={canAfford ? 'text-amber-500 fill-amber-500' : ''} /> {booster.cost}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Power-ups — big hero cards with inventory pill */}
        {shopTab === "powerups" && (
          <div>
            <div className="mb-4">
              <h2 className="text-2xl font-black text-stone-900">Power-ups</h2>
              <p className="text-stone-500 text-sm mt-1">Stash these in your inventory and trigger them mid-game.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {POWER_UP_DEFS.map(powerUp => {
                const owned = (user.powerUps ?? {})[powerUp.id] ?? 0;
                const canAfford = xp >= powerUp.cost;
                const grad = POWERUP_STYLES[powerUp.id] ?? 'from-amber-500 via-orange-500 to-rose-500';
                return (
                  <div
                    key={powerUp.id}
                    className={`relative overflow-hidden rounded-3xl shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all bg-gradient-to-br ${grad}`}
                  >
                    <div aria-hidden className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
                    <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/10" />
                    {/* Owned counter — top-right pill */}
                    {owned > 0 && (
                      <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 bg-white text-stone-900 text-xs font-black px-2.5 py-1 rounded-full shadow-md">
                        ×{owned} owned
                      </span>
                    )}
                    <div className="relative p-5 sm:p-6 flex items-center gap-4 sm:gap-5">
                      <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-5xl sm:text-6xl shadow-inner">
                        {powerUp.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/80 mb-0.5">Power-up</p>
                        <h3 className="text-lg sm:text-xl font-black text-white leading-tight">{powerUp.name}</h3>
                        <p className="text-xs text-white/85 mt-1 leading-relaxed">{powerUp.desc}</p>
                        <div className="mt-3">
                          <button
                            onClick={() => purchasePowerUp(powerUp)}
                            disabled={!canAfford}
                            type="button"
                            style={{ touchAction: 'manipulation' }}
                            className={`inline-flex items-center gap-1 text-sm font-black px-4 py-2 rounded-xl shadow-md transition-all ${canAfford ? 'text-stone-900 bg-white hover:bg-stone-50' : 'text-white/60 bg-white/10 cursor-not-allowed'}`}
                          >
                            <Zap size={12} className={canAfford ? 'text-amber-500 fill-amber-500' : ''} /> {powerUp.cost}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* XP Title Progress */}
        <div className="mt-6 bg-white rounded-3xl p-6 shadow-md border-2 border-purple-100">
          <h2 className="text-lg font-black mb-3 flex items-center gap-2">{getXpTitle(xp).emoji} {getXpTitle(xp).title}</h2>
          <div className="space-y-2">
            {XP_TITLES.map((tier, i) => {
              const nextTier = XP_TITLES[i + 1];
              const isCurrentTier = xp >= tier.min && (!nextTier || xp < nextTier.min);
              const isCompleted = nextTier ? xp >= nextTier.min : false;
              const progress = nextTier ? Math.min(100, Math.round(((xp - tier.min) / (nextTier.min - tier.min)) * 100)) : 100;
              return (
                <div key={tier.title} className={`flex items-center gap-3 p-2 rounded-xl ${isCurrentTier ? "bg-purple-50 border border-purple-200" : ""}`}>
                  <span className="text-lg">{tier.emoji}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs font-bold mb-0.5">
                      <span className={isCompleted ? "text-green-600" : isCurrentTier ? "text-purple-700" : "text-stone-400"}>{tier.title}</span>
                      <span className="text-stone-400">{tier.min} XP</span>
                    </div>
                    {nextTier && (
                      <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${isCompleted ? "bg-green-500" : isCurrentTier ? "bg-purple-500" : "bg-stone-200"}`} style={{ width: `${isCompleted ? 100 : isCurrentTier ? progress : 0}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Egg-opening cinematic — full-screen drama overlay */}
      <EggOpeningCinematic
        state={openingEgg}
        onClose={() => setOpeningEgg(null)}
      />

      <FloatingButtons
        showBackToTop={false}
        shareLevel={{
          displayName: user.displayName,
          xp,
          title: getXpTitle(xp).title,
          emoji: getXpTitle(xp).emoji,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Arcade Lobby Hub — the new "wow moment" shop landing.  Renders when
// shopTab === "hub".  Self-contained so we can iterate on the hub without
// disturbing the category sheets.
// ---------------------------------------------------------------------------
interface ArcadeLobbyHubProps {
  xp: number;
  setShopTab: React.Dispatch<React.SetStateAction<ShopTab>>;
}

function ArcadeLobbyHub({ xp, setShopTab }: ArcadeLobbyHubProps) {
  // Trending rail — hand-picked items that feel like "drops" worth looking
  // at.  Mix a hero egg, a premium avatar, a frame, a title.
  const trending: { label: string; pill: string; pillBg: string; onClick: () => void; emoji: string; gradient: string }[] = [
    { label: 'Rainbow Egg',     pill: 'MYTHIC', pillBg: 'bg-fuchsia-500', emoji: '🌈', gradient: 'from-pink-400 via-fuchsia-500 to-violet-500', onClick: () => setShopTab('eggs') },
    { label: 'GOAT Avatar',     pill: 'HOT',    pillBg: 'bg-rose-500',    emoji: '🐐', gradient: 'from-amber-400 via-orange-500 to-rose-500', onClick: () => setShopTab('avatars') },
    { label: 'Crown Frame',     pill: 'RARE',   pillBg: 'bg-amber-500',   emoji: '👑', gradient: 'from-yellow-400 via-amber-500 to-orange-500', onClick: () => setShopTab('frames') },
    { label: 'Final Boss Title',pill: 'NEW',    pillBg: 'bg-emerald-500', emoji: '🏁', gradient: 'from-indigo-500 via-violet-500 to-fuchsia-500', onClick: () => setShopTab('titles') },
    { label: '2× XP Booster',   pill: 'HOT',    pillBg: 'bg-rose-500',    emoji: '🚀', gradient: 'from-sky-400 via-blue-500 to-indigo-600', onClick: () => setShopTab('boosters') },
  ];

  // Portals — the 5 main categories as big pressable tiles.  Each has a
  // distinct vibe so the hub doesn't feel monotone.
  const portals: { tab: Exclude<ShopTab, 'hub'>; label: string; emoji: string; subtitle: string; gradient: string }[] = [
    { tab: 'eggs',     label: 'Mystery Eggs', emoji: '🥚', subtitle: 'Random XP drops',            gradient: 'from-indigo-500 via-violet-500 to-fuchsia-500' },
    { tab: 'avatars',  label: 'Avatars',      emoji: '🎭', subtitle: 'Collect them all',           gradient: 'from-blue-500 via-sky-500 to-cyan-500' },
    { tab: 'frames',   label: 'Frames',       emoji: '🖼️', subtitle: 'Flex your profile',          gradient: 'from-amber-500 via-orange-500 to-rose-500' },
    { tab: 'titles',   label: 'Titles',       emoji: '🏷️', subtitle: 'What you\'re known for',     gradient: 'from-violet-500 via-purple-500 to-fuchsia-500' },
    { tab: 'themes',   label: 'Themes',       emoji: '🎨', subtitle: 'Change the vibe',            gradient: 'from-emerald-500 via-teal-500 to-sky-500' },
    { tab: 'boosters', label: 'Boosters',     emoji: '🔥', subtitle: '24h + weekend buffs',        gradient: 'from-rose-500 via-pink-500 to-fuchsia-500' },
    { tab: 'powerups', label: 'Power-ups',    emoji: '⚡', subtitle: 'Use during games',           gradient: 'from-yellow-500 via-amber-500 to-orange-500' },
  ];

  return (
    <div className="space-y-5">
      {/* HERO — Drop of the Week (shared component; also appears on dashboard) */}
      <DropOfTheWeekCard onShopOpen={setShopTab} />

      {/* TRENDING RAIL — horizontal scrolling mini-cards */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest">Trending now</h2>
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Featured drops</span>
        </div>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 -mx-1 px-1" style={{ scrollSnapType: 'x mandatory' }}>
          {trending.map((item, i) => (
            <motion.button
              key={i}
              onClick={item.onClick}
              type="button"
              style={{ touchAction: 'manipulation', scrollSnapAlign: 'start' }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`relative shrink-0 w-40 overflow-hidden rounded-2xl bg-gradient-to-br ${item.gradient} p-3 pt-9 text-left shadow-md`}
            >
              {/* NEW/HOT/RARE pill — z-10 puts it above the emoji medallion
                  so the badge is never covered.  Also given pt-9 padding
                  on the card so there's dedicated space at the top of the
                  card for the badge to sit in without overlapping the
                  emoji container below. */}
              <span className={`absolute top-2 left-2 z-10 ${item.pillBg} text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-md border border-white/40`}>
                {item.pill}
              </span>
              <div className="relative w-full h-20 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl border border-white/30 mb-2 shadow-inner">
                {item.emoji}
              </div>
              <p className="text-xs font-black text-white leading-tight drop-shadow">{item.label}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* PORTAL TILES — the 5+ main category entrances */}
      <div>
        <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-2 px-1">Browse shop</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {portals.map(p => (
            <motion.button
              key={p.tab}
              onClick={() => setShopTab(p.tab)}
              type="button"
              style={{ touchAction: 'manipulation' }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className={`relative aspect-[5/4] overflow-hidden rounded-3xl bg-gradient-to-br ${p.gradient} p-4 text-left shadow-lg`}
            >
              <div aria-hidden className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 bg-white/20 rounded-full blur-2xl" />
              <div className="relative h-full flex flex-col justify-between">
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2 + Math.random(), repeat: Infinity, ease: 'easeInOut' }}
                  className="text-4xl sm:text-5xl drop-shadow-lg"
                >
                  {p.emoji}
                </motion.div>
                <div>
                  <p className="text-base sm:text-lg font-black text-white leading-tight drop-shadow">{p.label}</p>
                  <p className="text-[11px] text-white/85 mt-0.5">{p.subtitle}</p>
                </div>
                <ChevronRight size={16} className="absolute top-0 right-0 text-white/70" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* YOUR BALANCE callout — tiny trend pointer so students know their earn rate */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
          <Zap size={20} className="text-white fill-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Your balance</p>
          <p className="text-xl font-black text-stone-900 tabular-nums">{xp} XP</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Next tier</p>
          <p className="text-sm font-black text-stone-900">{getXpTitle(xp).emoji} {getXpTitle(xp).title}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Egg-opening cinematic — full-screen overlay with zoom → shake → crack.
// ---------------------------------------------------------------------------
interface EggOpeningCinematicProps {
  state: { egg: typeof MYSTERY_EGGS[0]; phase: 'zoom' | 'shake' | 'crack'; rewardLabel?: string } | null;
  onClose: () => void;
}

function EggOpeningCinematic({ state, onClose }: EggOpeningCinematicProps) {
  return (
    <AnimatePresence>
      {state && (
        <motion.div
          key="egg-cinematic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={state.phase === 'crack' ? onClose : undefined}
        >
          {/* Ambient radial glow to sell the rarity */}
          <motion.div
            aria-hidden
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.5, 1] }}
            transition={{ duration: 1.5 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className={`w-96 h-96 rounded-full blur-3xl opacity-60 bg-gradient-to-br ${RARITY_STYLES[state.egg.rarity].glow}`} />
          </motion.div>

          {/* The egg itself */}
          <motion.div
            className="relative text-center"
            initial={{ scale: 0, y: 80 }}
            animate={
              state.phase === 'zoom' ? { scale: 1, y: 0 } :
              state.phase === 'shake' ? { scale: 1, y: 0, rotate: [-6, 6, -6, 6, -6, 6, 0] } :
              { scale: 1.1, y: 0 }
            }
            transition={
              state.phase === 'zoom' ? { type: 'spring', stiffness: 200, damping: 16 } :
              state.phase === 'shake' ? { duration: 0.9, ease: 'easeInOut' } :
              { duration: 0.4 }
            }
          >
            <motion.div
              className="text-[10rem] sm:text-[14rem] leading-none drop-shadow-[0_0_40px_rgba(255,255,255,0.4)]"
              animate={state.phase === 'crack' ? { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] } : {}}
              transition={state.phase === 'crack' ? { duration: 0.5 } : {}}
            >
              {state.egg.emoji}
            </motion.div>

            {/* Reward label */}
            <AnimatePresence>
              {state.phase === 'crack' && state.rewardLabel && (
                <motion.div
                  key="reward"
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="mt-6"
                >
                  <p className="text-sm font-black text-white/70 uppercase tracking-widest mb-1">
                    {state.egg.name} opened!
                  </p>
                  <p className="text-4xl sm:text-5xl font-black text-white drop-shadow">
                    {state.rewardLabel}
                  </p>
                  <button
                    onClick={onClose}
                    type="button"
                    style={{ touchAction: 'manipulation' }}
                    className="mt-6 bg-white text-stone-900 font-black px-6 py-3 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-transform"
                  >
                    Awesome!
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Confetti-ish particle burst at the crack moment */}
            {state.phase === 'crack' && (
              <>
                {[...Array(14)].map((_, i) => (
                  <motion.span
                    key={i}
                    className="absolute left-1/2 top-1/2 text-2xl pointer-events-none"
                    initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
                    animate={{
                      x: Math.cos((i / 14) * Math.PI * 2) * (100 + Math.random() * 60),
                      y: Math.sin((i / 14) * Math.PI * 2) * (100 + Math.random() * 60),
                      opacity: 0,
                      scale: 1,
                    }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  >
                    {['✨', '⭐', '💫', '🎉'][i % 4]}
                  </motion.span>
                ))}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
