import { CheckCircle2, Zap, Sparkles } from "lucide-react";
import { supabase, type AppUser } from "../core/supabase";
import FloatingButtons from "../components/FloatingButtons";
import {
  XP_TITLES, getXpTitle, PREMIUM_AVATARS, AVATAR_CATEGORY_UNLOCKS,
  THEMES, POWER_UP_DEFS, BOOSTERS_DEFS, NAME_FRAMES, NAME_TITLES,
  MYSTERY_EGGS,
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
}

// Rarity → gradient / ring classes used on egg cards. Kept in one place so
// the visual rarity language stays consistent with the eggs themselves.
const RARITY_STYLES: Record<string, { bg: string; ring: string; badge: string; glow: string }> = {
  common:    { bg: 'from-stone-100 to-stone-200',          ring: 'ring-stone-300',   badge: 'bg-stone-200 text-stone-700',    glow: 'from-stone-200/0 to-stone-300/0' },
  rare:      { bg: 'from-sky-100 to-blue-200',             ring: 'ring-blue-300',    badge: 'bg-blue-200 text-blue-800',      glow: 'from-sky-300/40 to-blue-400/40' },
  epic:      { bg: 'from-violet-100 to-purple-200',        ring: 'ring-violet-300',  badge: 'bg-violet-200 text-violet-800',  glow: 'from-violet-400/40 to-purple-500/40' },
  legendary: { bg: 'from-amber-100 via-yellow-100 to-orange-200', ring: 'ring-amber-300', badge: 'bg-amber-200 text-amber-800', glow: 'from-amber-400/50 to-orange-500/50' },
  mythic:    { bg: 'from-pink-200 via-fuchsia-200 to-violet-200', ring: 'ring-fuchsia-400', badge: 'bg-gradient-to-r from-pink-400 to-violet-500 text-white', glow: 'from-pink-400/60 via-fuchsia-500/60 to-violet-500/60' },
};

export default function ShopView({ user, xp, setXp, setUser, setView, showToast, shopTab, setShopTab }: ShopViewProps) {

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
  const purchaseEgg = async (egg: typeof MYSTERY_EGGS[0]) => {
    if (xp < egg.cost) { showToast("Not enough XP!", "error"); return; }
    const { data, error } = await supabase.rpc('open_mystery_egg', { egg_id: egg.id, egg_cost: egg.cost });
    if (!error && data?.success) {
      setXp(data.new_xp);
      const rewardLabel = data.reward_label || `+${data.reward_xp ?? 0} XP`;
      showToast(`${egg.emoji} ${egg.name} opened! ${rewardLabel}`, "success");
      return;
    }
    // Fallback: RPC missing or returned an error → do the deduction +
    // reward through the existing purchase_item RPC (which we know works)
    // and roll the reward client-side. This keeps the feature usable
    // pre-migration without risking the DB state getting out of sync.
    const rewardXp = Math.floor(egg.minXp + Math.random() * (egg.maxXp - egg.minXp + 1));
    const { data: pData, error: pErr } = await supabase.rpc('purchase_item', { item_type: 'egg', item_id: egg.id, item_cost: egg.cost - rewardXp });
    if (pErr || !pData?.success) { showToast(pData?.error || "Could not open egg — try again later.", "error"); return; }
    setXp(pData.new_xp);
    showToast(`${egg.emoji} ${egg.name} opened! +${rewardXp} XP`, "success");
  };

  const purchaseBooster = async (booster: typeof BOOSTERS_DEFS[0]) => {
    if (xp < booster.cost) { showToast("Not enough XP!", "error"); return; }
    const { data, error } = await supabase.rpc('purchase_item', { item_type: 'booster', item_id: booster.id, item_cost: booster.cost });
    if (error || !data?.success) { showToast(data?.error || "Purchase failed!", "error"); return; }
    setXp(data.new_xp);
    showToast(`Got ${booster.name}! 🎉`, "success");
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

        {/* Shop hero */}
        <div className="relative overflow-hidden rounded-[28px] mb-6 bg-gradient-to-br from-fuchsia-600 via-pink-500 to-rose-500 p-5 sm:p-7 shadow-xl shadow-pink-500/20">
          <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 bg-yellow-300/30 rounded-full blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 w-56 h-56 bg-cyan-400/25 rounded-full blur-3xl" />
          <div className="relative">
            <p className="text-xs font-bold text-white/80 uppercase tracking-widest mb-1">The Shop</p>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Treat yourself 🎁</h1>
            <p className="text-sm text-white/90 mt-2 max-w-md">
              Spend XP on avatars, themes, frames, titles, and power-ups. New items drop as you level up.
            </p>
          </div>
        </div>

        {/* Tabs — segmented pill group, scrolls horizontally on mobile.
            "Eggs" leads because it's the new hero category we want students
            to try first. */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-1 flex overflow-x-auto hide-scrollbar gap-0.5 mb-6" style={{ scrollSnapType: 'x mandatory' }}>
          {(["eggs", "avatars", "themes", "titles", "frames", "boosters", "powerups"] as const).map(tab => {
            const isActive = shopTab === tab;
            const labels = {
              eggs: { emoji: '🥚', text: 'Eggs' },
              avatars: { emoji: '🎭', text: 'Avatars' },
              themes: { emoji: '🎨', text: 'Themes' },
              titles: { emoji: '🏷️', text: 'Titles' },
              frames: { emoji: '🖼️', text: 'Frames' },
              boosters: { emoji: '🔥', text: 'Boosters' },
              powerups: { emoji: '⚡', text: 'Power-ups' },
            };
            return (
              <button
                key={tab}
                onClick={() => setShopTab(tab)}
                type="button"
                style={{ touchAction: 'manipulation', scrollSnapAlign: 'center' }}
                className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${isActive ? "bg-stone-900 text-white shadow-sm" : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"}`}
              >
                <span className="text-base">{labels[tab].emoji}</span>
                <span>{labels[tab].text}</span>
              </button>
            );
          })}
        </div>

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

        {/* Theme Shop */}
        {shopTab === "themes" && (
          <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-blue-100">
            <h2 className="text-xl font-black mb-4">Themes</h2>
            <p className="text-stone-500 text-sm mb-4">Customize your game experience!</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {THEMES.map(theme => {
                const isOwned = theme.cost === 0 || (user.unlockedThemes ?? []).includes(theme.id);
                const isActive = (user.activeTheme ?? 'default') === theme.id;
                const canAfford = xp >= theme.cost;
                return (
                  <div key={theme.id} className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${isActive ? "border-blue-500 bg-blue-50" : isOwned ? "border-green-200 bg-green-50" : "border-stone-100 bg-stone-50"}`}>
                    <div className={`w-full h-16 rounded-xl mb-3 ${theme.colors.bg} border border-stone-200 flex items-center justify-center`}>
                      <span className="text-2xl">{theme.preview}</span>
                    </div>
                    <span className="text-sm font-bold text-stone-700">{theme.name}</span>
                    {isActive ? (
                      <span className="text-xs font-bold text-blue-600 mt-1">Active</span>
                    ) : isOwned ? (
                      <button onClick={() => equipTheme(theme.id)} className="text-xs font-bold text-green-600 mt-1 px-2 py-0.5 rounded-lg bg-green-100 hover:bg-green-200 transition-all">Apply</button>
                    ) : (
                      <button onClick={() => purchaseTheme(theme)} disabled={!canAfford}
                        className={`text-xs font-bold mt-1 px-2 py-0.5 rounded-lg transition-all ${canAfford ? "text-amber-700 bg-amber-100 hover:bg-amber-200" : "text-stone-400 bg-stone-100 cursor-not-allowed"}`}>
                        {theme.cost} XP
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Name Titles Shop */}
        {shopTab === "titles" && (
          <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-blue-100">
            <h2 className="text-xl font-black mb-2">Name Titles</h2>
            <p className="text-stone-500 text-sm mb-4">Show off a custom title below your name!</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {NAME_TITLES.map(title => {
                const isOwned = (user.unlockedAvatars ?? []).includes(`title_${title.id}`);
                const isActive = (user as any).activeTitle === title.id;
                const canAfford = xp >= title.cost;
                return (
                  <div key={title.id} className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${isActive ? "border-blue-500 bg-blue-50" : isOwned ? "border-green-200 bg-green-50" : "border-stone-100 bg-stone-50"}`}>
                    <span className="text-sm font-black text-stone-800 mb-1">{title.display}</span>
                    {isActive ? (
                      <span className="text-xs font-bold text-blue-600">Active</span>
                    ) : isOwned ? (
                      <button onClick={async () => {
                        setUser(prev => prev ? { ...prev, activeTitle: title.id } as any : prev);
                        await supabase.from('users').update({ active_title: title.id } as any).eq('uid', user.uid);
                        showToast("Title equipped!", "success");
                      }} className="text-xs font-bold text-green-600 px-2 py-0.5 rounded-lg bg-green-100 hover:bg-green-200">Equip</button>
                    ) : (
                      <button onClick={async () => {
                        if (xp < title.cost) { showToast("Not enough XP!", "error"); return; }
                        const { data, error } = await supabase.rpc('purchase_item', { item_type: 'avatar', item_id: `title_${title.id}`, item_cost: title.cost });
                        if (error || !data?.success) { showToast(data?.error || "Purchase failed!", "error"); return; }
                        setXp(data.new_xp);
                        setUser(prev => prev ? { ...prev, unlockedAvatars: [...(prev.unlockedAvatars ?? []), `title_${title.id}`] } : prev);
                        showToast(`Unlocked "${title.display}"!`, "success");
                      }} disabled={!canAfford}
                        className={`text-xs font-bold px-2 py-0.5 rounded-lg transition-all ${canAfford ? "text-amber-700 bg-amber-100 hover:bg-amber-200" : "text-stone-400 bg-stone-100 cursor-not-allowed"}`}>
                        {title.cost} XP
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Avatar Frames Shop */}
        {shopTab === "frames" && (
          <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-blue-100">
            <h2 className="text-xl font-black mb-2">Avatar Frames</h2>
            <p className="text-stone-500 text-sm mb-4">Add a glowing border around your avatar!</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {NAME_FRAMES.map(frame => {
                const isOwned = (user.unlockedAvatars ?? []).includes(`frame_${frame.id}`);
                const isActive = (user as any).activeFrame === frame.id;
                const canAfford = xp >= frame.cost;
                return (
                  <div key={frame.id} className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${isActive ? "border-blue-500 bg-blue-50" : isOwned ? "border-green-200 bg-green-50" : "border-stone-100 bg-stone-50"}`}>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-2 bg-white ${frame.border}`}>
                      {user.avatar || "😎"}
                    </div>
                    <span className="text-xs font-bold text-stone-700">{frame.name}</span>
                    {isActive ? (
                      <span className="text-xs font-bold text-blue-600 mt-1">Active</span>
                    ) : isOwned ? (
                      <button onClick={async () => {
                        setUser(prev => prev ? { ...prev, activeFrame: frame.id } as any : prev);
                        await supabase.from('users').update({ active_frame: frame.id } as any).eq('uid', user.uid);
                        showToast("Frame equipped!", "success");
                      }} className="text-xs font-bold text-green-600 mt-1 px-2 py-0.5 rounded-lg bg-green-100 hover:bg-green-200">Equip</button>
                    ) : (
                      <button onClick={async () => {
                        if (xp < frame.cost) { showToast("Not enough XP!", "error"); return; }
                        const { data, error } = await supabase.rpc('purchase_item', { item_type: 'avatar', item_id: `frame_${frame.id}`, item_cost: frame.cost });
                        if (error || !data?.success) { showToast(data?.error || "Purchase failed!", "error"); return; }
                        setXp(data.new_xp);
                        setUser(prev => prev ? { ...prev, unlockedAvatars: [...(prev.unlockedAvatars ?? []), `frame_${frame.id}`] } : prev);
                        showToast(`Unlocked ${frame.name}!`, "success");
                      }} disabled={!canAfford}
                        className={`text-xs font-bold mt-1 px-2 py-0.5 rounded-lg transition-all ${canAfford ? "text-amber-700 bg-amber-100 hover:bg-amber-200" : "text-stone-400 bg-stone-100 cursor-not-allowed"}`}>
                        {frame.cost} XP
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Boosters Shop */}
        {shopTab === "boosters" && (
          <div className="bg-gradient-to-br from-pink-50 to-orange-50 rounded-3xl p-6 shadow-md border-2 border-pink-200">
            <h2 className="text-xl font-black mb-2 bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent">🔥 Hot Boosters</h2>
            <p className="text-stone-500 text-sm mb-4">The most wanted items in 2026!</p>
            <div className="space-y-3">
              {BOOSTERS_DEFS.map(booster => {
                const canAfford = xp >= booster.cost;
                return (
                  <div key={booster.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-pink-100 shadow-sm hover:shadow-md transition-all">
                    <span className="text-4xl">{booster.emoji}</span>
                    <div className="flex-1">
                      <p className="font-bold text-stone-800">{booster.name}</p>
                      <p className="text-xs text-stone-500">{booster.desc}</p>
                    </div>
                    <button onClick={() => purchaseBooster(booster)} disabled={!canAfford}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${canAfford ? "bg-gradient-to-r from-pink-400 to-orange-400 text-white hover:from-pink-500 hover:to-orange-500 shadow-md" : "bg-stone-100 text-stone-400 cursor-not-allowed"}`}>
                      {booster.cost} XP
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Power-ups Shop */}
        {shopTab === "powerups" && (
          <div className="bg-white rounded-3xl p-6 shadow-md border-2 border-blue-100">
            <h2 className="text-xl font-black mb-4">Power-ups</h2>
            <p className="text-stone-500 text-sm mb-4">Buy boosts to use during games!</p>
            <div className="space-y-3">
              {POWER_UP_DEFS.map(powerUp => {
                const owned = (user.powerUps ?? {})[powerUp.id] ?? 0;
                const canAfford = xp >= powerUp.cost;
                return (
                  <div key={powerUp.id} className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border-2 border-stone-100">
                    <span className="text-3xl">{powerUp.emoji}</span>
                    <div className="flex-1">
                      <p className="font-bold text-stone-800">{powerUp.name}</p>
                      <p className="text-xs text-stone-500">{powerUp.desc}</p>
                    </div>
                    <div className="text-center">
                      {owned > 0 && <p className="text-xs font-bold text-blue-600 mb-1">×{owned}</p>}
                      <button onClick={() => purchasePowerUp(powerUp)} disabled={!canAfford}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${canAfford ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-stone-100 text-stone-400 cursor-not-allowed"}`}>
                        {powerUp.cost} XP
                      </button>
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
      <FloatingButtons showBackToTop={true} />
    </div>
  );
}
