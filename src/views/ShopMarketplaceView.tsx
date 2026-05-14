// Single-screen marketplace — replaces the multi-tab ShopView + Arcade
// Lobby hub. One scroll, big horizontal carousels per category,
// Spotlight dynamic hero at the top. See docs/shop-redesign-plan.md.

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  setView: React.Dispatch<React.SetStateAction<View>>;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  activateBooster: (id: 'streak_freeze' | 'lucky_spin' | 'xp_booster' | 'lucky_charm' | 'focus_mode' | 'weekend_warrior') => void;
}

const RARITY_STYLES: Record<string, { bg: string; ring: string; badge: string; glow: string }> = {
  common:    { bg: 'from-stone-100 to-stone-200',                         ring: 'ring-stone-300',   badge: 'bg-stone-200 text-stone-700',                                              glow: 'from-stone-200/0 to-stone-300/0' },
  rare:      { bg: 'from-sky-100 to-blue-200',                            ring: 'ring-blue-300',    badge: 'bg-blue-200 text-blue-800',                                                glow: 'from-sky-300/40 to-blue-400/40' },
  epic:      { bg: 'from-violet-100 to-purple-200',                       ring: 'ring-violet-300',  badge: 'bg-violet-200 text-violet-800',                                            glow: 'from-violet-400/40 to-purple-500/40' },
  legendary: { bg: 'from-amber-100 via-yellow-100 to-orange-200',         ring: 'ring-amber-300',   badge: 'bg-amber-200 text-amber-800',                                              glow: 'from-amber-400/50 to-orange-500/50' },
  mythic:    { bg: 'from-pink-200 via-fuchsia-200 to-violet-200',         ring: 'ring-fuchsia-400', badge: 'bg-gradient-to-r from-pink-400 to-violet-500 text-white',                  glow: 'from-pink-400/60 via-fuchsia-500/60 to-violet-500/60' },
};

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

export default function ShopMarketplaceView({
  user, xp, setXp, setUser, setView, showToast, activateBooster,
}: Props) {
  const { language, dir, isRTL } = useLanguage();
  const t = shopT[language];
  const retention = useRetention(user.uid, xp);
  const { pinned, togglePin, unpin, isPinned } = usePinnedShopItem(user.uid);

  // Combine eggs + boosters/powerups (the carousels merge them per
  // the redesign). UI toggle for the merged section:
  const [boostMode, setBoostMode] = useState<'powerup' | 'booster'>('powerup');
  const [cosmeticMode, setCosmeticMode] = useState<'frame' | 'title'>('frame');

  // Egg cinematic state — phases mirror the original ShopView.
  const [openingEgg, setOpeningEgg] = useState<null | {
    egg: typeof MYSTERY_EGGS[0]; phase: 'zoom' | 'shake' | 'crack'; rewardLabel?: string;
  }>(null);

  // --- Purchase / equip RPCs (same shapes as the original ShopView) ---

  const purchaseAvatar = async (a: typeof PREMIUM_AVATARS[0]) => {
    if (xp < a.cost) { showToast(t.notEnoughXp, "error"); return; }
    const { data, error } = await supabase.rpc('purchase_item', { item_type: 'avatar', item_id: a.emoji, item_cost: a.cost });
    if (error || !data?.success) { showToast(data?.error || t.purchaseFailed, "error"); return; }
    setXp(data.new_xp);
    setUser(prev => prev ? { ...prev, unlockedAvatars: [...(prev.unlockedAvatars ?? []), a.emoji] } : prev);
    showToast(`✨ ${catalogName('avatars', a.id, language, a.name)}`, "success");
  };

  const equipAvatar = async (emoji: string) => {
    setUser(prev => prev ? { ...prev, avatar: emoji } : prev);
    await supabase.from('users').update({ avatar: emoji }).eq('uid', user.uid);
    showToast(t.avatarEquipped, "success");
  };

  const purchaseTheme = async (theme: typeof THEMES[0]) => {
    if (xp < theme.cost) { showToast(t.notEnoughXp, "error"); return; }
    const { data, error } = await supabase.rpc('purchase_item', { item_type: 'theme', item_id: theme.id, item_cost: theme.cost });
    if (error || !data?.success) { showToast(data?.error || t.purchaseFailed, "error"); return; }
    setXp(data.new_xp);
    setUser(prev => prev ? { ...prev, unlockedThemes: [...(prev.unlockedThemes ?? []), theme.id] } : prev);
    showToast(`✨ ${catalogName('themes', theme.id, language, theme.name)}`, "success");
  };

  const equipTheme = async (themeId: string) => {
    setUser(prev => prev ? { ...prev, activeTheme: themeId } : prev);
    await supabase.from('users').update({ active_theme: themeId }).eq('uid', user.uid);
    showToast(t.themeApplied, "success");
  };

  const purchasePowerUp = async (p: typeof POWER_UP_DEFS[0]) => {
    if (xp < p.cost) { showToast(t.notEnoughXp, "error"); return; }
    const { data, error } = await supabase.rpc('purchase_item', { item_type: 'power_up', item_id: p.id, item_cost: p.cost });
    if (error || !data?.success) { showToast(data?.error || t.purchaseFailed, "error"); return; }
    setXp(data.new_xp);
    setUser(prev => prev ? { ...prev, powerUps: { ...(prev.powerUps ?? {}), [p.id]: ((prev.powerUps ?? {})[p.id] ?? 0) + 1 } } : prev);
    showToast(`✨ ${catalogName('powerUps', p.id, language, p.name)}`, "success");
  };

  const purchaseBooster = async (b: typeof BOOSTERS_DEFS[0]) => {
    if (xp < b.cost) { showToast(t.notEnoughXp, "error"); return; }
    const { data, error } = await supabase.rpc('purchase_item', { item_type: 'booster', item_id: b.id, item_cost: b.cost });
    if (error || !data?.success) { showToast(data?.error || t.purchaseFailed, "error"); return; }
    setXp(data.new_xp);
    activateBooster(b.id as Parameters<typeof activateBooster>[0]);
    showToast(`✨ ${catalogName('boosters', b.id, language, b.name)}`, "success");
  };

  const purchaseTitle = async (title: typeof NAME_TITLES[0]) => {
    if (xp < title.cost) { showToast(t.notEnoughXp, "error"); return; }
    const { data, error } = await supabase.rpc('purchase_item', { item_type: 'avatar', item_id: `title_${title.id}`, item_cost: title.cost });
    if (error || !data?.success) { showToast(data?.error || t.purchaseFailed, "error"); return; }
    setXp(data.new_xp);
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
    if (xp < frame.cost) { showToast(t.notEnoughXp, "error"); return; }
    const { data, error } = await supabase.rpc('purchase_item', { item_type: 'avatar', item_id: `frame_${frame.id}`, item_cost: frame.cost });
    if (error || !data?.success) { showToast(data?.error || t.purchaseFailed, "error"); return; }
    setXp(data.new_xp);
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
    if (xp < egg.cost) { showToast(t.notEnoughXp, "error"); return; }
    setOpeningEgg({ egg, phase: 'zoom' });
    setTimeout(() => setOpeningEgg(prev => prev ? { ...prev, phase: 'shake' } : prev), 300);
    // `open_mystery_egg` is planned for a follow-up Supabase migration
    // (server-side reward roll + cosmetic drops). Until that ships, roll
    // the XP reward on the client and book the net cost via the generic
    // `purchase_item` RPC. Avoids the 404 the missing RPC would otherwise
    // spam in the console every egg open.
    const rpcPromise = (async () => {
      const rewardXp = Math.floor(egg.minXp + Math.random() * (egg.maxXp - egg.minXp + 1));
      const { data: pData, error: pErr } = await supabase.rpc('purchase_item', { item_type: 'egg', item_id: egg.id, item_cost: egg.cost - rewardXp });
      if (pErr || !pData?.success) { showToast(pData?.error || t.couldNotOpenEgg, "error"); return null; }
      setXp(pData.new_xp);
      return `+${rewardXp} XP`;
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
      kind === 'frame' || kind === 'title' ? 'section-cosmetics' :
      kind === 'booster' || kind === 'powerUp' ? 'section-boosts' :
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
  const pageBg = isDefault ? 'bg-gradient-to-b from-violet-50 via-stone-50 to-white' : activeThemeConfig.colors.bg;

  // --- Helpers for card states ---
  const ownsAvatar = (emoji: string) => !!user.unlockedAvatars?.includes(emoji);
  const ownsTheme = (id: string) => id === 'default' || !!user.unlockedThemes?.includes(id);
  const ownsFrame = (id: string) => !!user.unlockedAvatars?.includes(`frame_${id}`);
  const ownsTitle = (id: string) => !!user.unlockedAvatars?.includes(`title_${id}`);

  // Pin button — appears on every locked card.
  const PinButton = ({ kind, id }: { kind: PinnedKind; id: string }) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); togglePin(kind, id); }}
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      className={`absolute top-1.5 ${isRTL ? 'left-1.5' : 'right-1.5'} w-7 h-7 rounded-full backdrop-blur-sm flex items-center justify-center transition-all ${
        isPinned(kind, id) ? 'bg-emerald-500 text-white' : 'bg-white/80 text-stone-600 hover:bg-white'
      }`}
      aria-label={isPinned(kind, id) ? 'Unpin' : 'Pin'}
    >
      <Pin size={14} className={isPinned(kind, id) ? 'fill-current' : ''} />
    </button>
  );

  // ---------- Card renderers ----------

  const renderEgg = (egg: typeof MYSTERY_EGGS[0]) => {
    const rarity = RARITY_STYLES[egg.rarity] ?? RARITY_STYLES.common;
    const canAfford = xp >= egg.cost;
    return (
      <button
        type="button"
        onClick={() => canAfford && purchaseEgg(egg)}
        disabled={!canAfford}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        className={`relative w-44 sm:w-48 rounded-3xl bg-gradient-to-br ${rarity.bg} p-4 ring-2 ${rarity.ring} shadow-md hover:shadow-xl transition-all ${!canAfford ? 'opacity-70' : ''}`}
      >
        <div aria-hidden className={`pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full blur-3xl bg-gradient-to-br ${rarity.glow}`} />
        <div className="relative flex justify-end">
          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${rarity.badge}`}>{egg.rarity}</span>
        </div>
        <div className="relative flex justify-center my-2">
          <span className="text-5xl sm:text-6xl drop-shadow-lg">{egg.emoji}</span>
        </div>
        <h3 className="relative text-sm font-black text-stone-900 text-center">{catalogName('eggs', egg.id, language, egg.name)}</h3>
        <p className="relative text-[11px] text-stone-700/80 text-center mt-1 line-clamp-2 min-h-[2rem]">{catalogDesc('eggs', egg.id, language, egg.desc)}</p>
        <div className="relative mt-2 flex items-center justify-center gap-1.5 text-xs font-bold">
          <span className="inline-flex items-center gap-0.5 bg-white/80 px-2 py-0.5 rounded-full text-stone-700">
            <Zap size={10} className="text-amber-500 fill-amber-500" /> {egg.cost}
          </span>
        </div>
      </button>
    );
  };

  // Avatar tile — dimmed when locked, with inline XP-gap badge.
  // Phase 5 (locked-avatar inline state): no nested tiers, just dim + badge.
  const renderAvatar = (a: typeof PREMIUM_AVATARS[0]) => {
    const owned = ownsAvatar(a.emoji);
    const equipped = user.avatar === a.emoji;
    const canAfford = xp >= a.cost;
    const gap = a.cost - xp;
    return (
      <div
        className={`relative w-32 sm:w-36 rounded-3xl bg-white p-3 ring-2 ${equipped ? 'ring-violet-500 shadow-lg shadow-violet-500/30' : 'ring-stone-200'} shadow-sm hover:shadow-md transition-all ${!owned && !canAfford ? 'opacity-75' : ''}`}
      >
        {!owned && <PinButton kind="avatar" id={a.id} />}
        <div className="flex justify-center my-1">
          <span className={`text-5xl ${!owned && !canAfford ? 'grayscale' : ''}`}>{a.emoji}</span>
        </div>
        <h3 className="text-xs font-black text-stone-900 text-center truncate">
          {catalogName('avatars', a.id, language, a.name)}
        </h3>
        <div className="mt-2">
          {owned ? (
            equipped ? (
              <span className="block text-center text-[10px] font-black uppercase tracking-widest text-violet-600">
                <Check size={11} className="inline -mt-0.5 mr-0.5" /> {t.unlocked}
              </span>
            ) : (
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => equipAvatar(a.emoji)}
                className="w-full text-[11px] font-black bg-violet-600 text-white rounded-full py-1.5"
              >
                Equip
              </motion.button>
            )
          ) : canAfford ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => purchaseAvatar(a)}
              className="w-full inline-flex items-center justify-center gap-0.5 text-[11px] font-black bg-stone-900 text-white rounded-full py-1.5"
            >
              <Zap size={10} className="text-amber-300 fill-amber-300" /> {a.cost}
            </motion.button>
          ) : (
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-stone-500">
              <Lock size={10} /> {t.needed(`${gap} XP`)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTheme = (th: typeof THEMES[0]) => {
    const owned = ownsTheme(th.id);
    const active = user.activeTheme === th.id || (!user.activeTheme && th.id === 'default');
    const canAfford = xp >= th.cost;
    return (
      <div className={`relative w-40 sm:w-44 rounded-3xl ${th.colors.bg} ${th.colors.card === 'bg-white' ? '' : th.colors.card} p-3 ring-2 ${active ? 'ring-violet-500' : 'ring-stone-200'} shadow-sm`}>
        {!owned && <PinButton kind="theme" id={th.id} />}
        <div className={`flex justify-center text-4xl ${th.colors.text}`}>{th.preview}</div>
        <h3 className={`mt-2 text-xs font-black text-center ${th.colors.text}`}>
          {catalogName('themes', th.id, language, th.name)}
        </h3>
        <div className="mt-2">
          {owned ? (
            active ? (
              <span className="block text-center text-[10px] font-black uppercase tracking-widest text-violet-600">
                <Check size={11} className="inline -mt-0.5 mr-0.5" /> Active
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
              <Lock size={10} /> {th.cost} XP
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFrame = (f: typeof NAME_FRAMES[0]) => {
    const owned = ownsFrame(f.id);
    const active = user.activeFrame === f.id;
    const canAfford = xp >= f.cost;
    return (
      <div className={`relative w-36 sm:w-40 rounded-3xl bg-white p-3 ${active ? 'ring-2 ring-violet-500' : 'ring-1 ring-stone-200'} shadow-sm`}>
        {!owned && <PinButton kind="frame" id={f.id} />}
        <div className="flex justify-center my-1">
          <div className={`w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center text-3xl ${f.border}`}>{f.preview}</div>
        </div>
        <h3 className="text-xs font-black text-stone-900 text-center truncate">
          {catalogName('frames', f.id, language, f.name)}
        </h3>
        <div className="mt-2">
          {owned ? (
            active ? (
              <span className="block text-center text-[10px] font-black uppercase tracking-widest text-violet-600"><Check size={11} className="inline -mt-0.5 mr-0.5" />Equipped</span>
            ) : (
              <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => equipFrame(f.id)} className="w-full text-[11px] font-black bg-violet-600 text-white rounded-full py-1.5">Equip</motion.button>
            )
          ) : canAfford ? (
            <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => purchaseFrame(f)} className="w-full inline-flex items-center justify-center gap-0.5 text-[11px] font-black bg-stone-900 text-white rounded-full py-1.5"><Zap size={10} className="text-amber-300 fill-amber-300" /> {f.cost}</motion.button>
          ) : (
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-stone-500"><Lock size={10} />{f.cost} XP</div>
          )}
        </div>
      </div>
    );
  };

  const renderTitle = (ti: typeof NAME_TITLES[0]) => {
    const owned = ownsTitle(ti.id);
    const active = user.activeTitle === ti.id;
    const canAfford = xp >= ti.cost;
    const style = TITLE_STYLES[ti.id] ?? 'text-stone-900 font-black';
    return (
      <div className={`relative w-44 sm:w-48 rounded-3xl bg-white p-3 ${active ? 'ring-2 ring-violet-500' : 'ring-1 ring-stone-200'} shadow-sm`}>
        {!owned && <PinButton kind="title" id={ti.id} />}
        <div className="flex justify-center my-2">
          <span className={`text-lg ${style}`}>{catalogDisplay('titles', ti.id, language, ti.display)}</span>
        </div>
        <div className="mt-2">
          {owned ? (
            active ? (
              <span className="block text-center text-[10px] font-black uppercase tracking-widest text-violet-600"><Check size={11} className="inline -mt-0.5 mr-0.5" />Equipped</span>
            ) : (
              <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => equipTitle(ti.id)} className="w-full text-[11px] font-black bg-violet-600 text-white rounded-full py-1.5">Equip</motion.button>
            )
          ) : canAfford ? (
            <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => purchaseTitle(ti)} className="w-full inline-flex items-center justify-center gap-0.5 text-[11px] font-black bg-stone-900 text-white rounded-full py-1.5"><Zap size={10} className="text-amber-300 fill-amber-300" /> {ti.cost}</motion.button>
          ) : (
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-stone-500"><Lock size={10} />{ti.cost} XP</div>
          )}
        </div>
      </div>
    );
  };

  const renderPowerUp = (p: typeof POWER_UP_DEFS[0]) => {
    const owned = (user.powerUps ?? {})[p.id] ?? 0;
    const canAfford = xp >= p.cost;
    const grad = POWERUP_STYLES[p.id] ?? 'from-stone-500 to-stone-700';
    return (
      <div className={`relative w-44 sm:w-48 rounded-3xl bg-gradient-to-br ${grad} p-4 shadow-md`}>
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
    const canAfford = xp >= b.cost;
    const grad = BOOSTER_STYLES[b.id] ?? 'from-stone-500 to-stone-700';
    return (
      <div className={`relative w-44 sm:w-48 rounded-3xl bg-gradient-to-br ${grad} p-4 shadow-md`}>
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
            className={`inline-flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-stone-900 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <ChevronLeft size={16} className={isRTL ? 'rotate-180' : ''} />
            Dashboard
          </button>
          <div className="flex items-center gap-2 bg-white rounded-full pl-2 pr-3 py-1.5 border border-stone-200 shadow-sm">
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Zap size={14} className="text-white fill-white" />
            </span>
            <span className="font-black text-stone-900 tabular-nums">{xp}</span>
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">XP</span>
          </div>
        </div>

        {/* Spotlight — dynamic hero. Falls through priorities to find
            the most relevant nudge. Null when no priority matches. */}
        <Spotlight
          user={user}
          xp={xp}
          language={language}
          isRTL={isRTL}
          dailyChestAvailable={retention.dailyChestAvailable}
          onClaimChest={handleClaimChest}
          pinned={pinned}
          onUnpin={unpin}
          onShop={handleSpotlightShop}
        />

        <div className="space-y-6">
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

          {/* Power-ups + Boosters merged section (Phase 6). Internal toggle. */}
          <section id="section-boosts" className="space-y-3">
            <div className={`flex items-center justify-between px-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-baseline gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-2xl leading-none">⚡</span>
                <h2 className="text-lg font-black tracking-tight text-stone-900">
                  {boostMode === 'powerup' ? t.powerUps : t.boosters}
                </h2>
              </div>
              <div className="inline-flex bg-stone-200 rounded-full p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setBoostMode('powerup')}
                  className={`px-3 py-1 rounded-full transition-colors ${boostMode === 'powerup' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
                >
                  {t.powerUps}
                </button>
                <button
                  type="button"
                  onClick={() => setBoostMode('booster')}
                  className={`px-3 py-1 rounded-full transition-colors ${boostMode === 'booster' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
                >
                  {t.boosters}
                </button>
              </div>
            </div>
            <div
              className={`flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 snap-x ${isRTL ? 'flex-row-reverse' : ''}`}
              style={{ scrollbarWidth: 'thin' }}
            >
              {(boostMode === 'powerup' ? POWER_UP_DEFS : BOOSTERS_DEFS).map((item) => (
                <div key={item.id} className="snap-start flex-shrink-0">
                  {boostMode === 'powerup'
                    ? renderPowerUp(item as typeof POWER_UP_DEFS[0])
                    : renderBooster(item as typeof BOOSTERS_DEFS[0])}
                </div>
              ))}
            </div>
          </section>

          {/* Frames + Titles merged into "Decorations" (Phase 6). Internal toggle. */}
          <section id="section-cosmetics" className="space-y-3">
            <div className={`flex items-center justify-between px-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-baseline gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-2xl leading-none">👑</span>
                <h2 className="text-lg font-black tracking-tight text-stone-900">
                  {cosmeticMode === 'frame' ? t.avatarFrames : t.nameTitles}
                </h2>
              </div>
              <div className="inline-flex bg-stone-200 rounded-full p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCosmeticMode('frame')}
                  className={`px-3 py-1 rounded-full transition-colors ${cosmeticMode === 'frame' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
                >
                  {t.avatarFrames}
                </button>
                <button
                  type="button"
                  onClick={() => setCosmeticMode('title')}
                  className={`px-3 py-1 rounded-full transition-colors ${cosmeticMode === 'title' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
                >
                  {t.nameTitles}
                </button>
              </div>
            </div>
            <div
              className={`flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 snap-x ${isRTL ? 'flex-row-reverse' : ''}`}
              style={{ scrollbarWidth: 'thin' }}
            >
              {(cosmeticMode === 'frame' ? NAME_FRAMES : NAME_TITLES).map((item) => (
                <div key={item.id} className="snap-start flex-shrink-0">
                  {cosmeticMode === 'frame'
                    ? renderFrame(item as typeof NAME_FRAMES[0])
                    : renderTitle(item as typeof NAME_TITLES[0])}
                </div>
              ))}
            </div>
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
