import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Zap, Check, Copy, Flame, ShoppingBag, Pencil, X as XIcon, Crown } from "lucide-react";
import { getXpTitle, NAME_FRAMES, NAME_TITLES } from "../../constants/game";
import { getTitleStyle } from "../../constants/titleStyles";
import type { AppUser } from "../../core/supabase";
import { useLanguage } from "../../hooks/useLanguage";
import { studentDashboardT } from "../../locales/student/student-dashboard";

// Hero-card gradient when no title is equipped.  When a title IS
// equipped, the equipped title's full visual signature (gradient +
// font + weight + tracking) is read from src/constants/titleStyles.ts —
// the SAME record the shop uses, so equipping a title makes the
// greeting card look identical to the shop preview.
const DEFAULT_HERO_GRADIENT = 'from-indigo-600 via-violet-600 to-fuchsia-600';

interface StudentGreetingCardProps {
  user: AppUser;
  xp: number;
  streak: number;
  badges: string[];
  copiedCode: string | null;
  setCopiedCode: React.Dispatch<React.SetStateAction<string | null>>;
  /** Tap handler for the shop button inlined in the greeting card.
   * (Previously lived in StudentTopBar; moved here so the student's
   * name + avatar + XP + Shop all live in one coloured rectangle.) */
  onShopClick: () => void;
  /** Optional rename handler. When provided, a pencil icon appears
   *  next to the student's name and lets them change it in-place.
   *  Resolves with the server's authoritative name (client already
   *  mirrors it into AppUser.displayName) or an error code + message. */
  onRenameDisplayName?: (newName: string) =>
    Promise<
      | { ok: true; displayName: string }
      | { ok: false; code: string; message: string }
    >;
}

/**
 * Vibrant hero with a gradient backdrop, animated avatar ring, and a
 * time-of-day greeting. Designed to feel alive — the avatar bobs gently,
 * XP value rolls up on mount, and the streak flame flickers if the student
 * has a streak going.
 */
export default function StudentGreetingCard({
  user, xp, streak, copiedCode, setCopiedCode, onShopClick,
  onRenameDisplayName,
}: StudentGreetingCardProps) {
  // ─── Inline rename state ───────────────────────────────────────────
  // Kept local to this card so the rename UX doesn't leak into the
  // orchestrator. Tap the pencil → swap name for an input; save
  // commits via onRenameDisplayName; cancel restores.
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(user.displayName);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameSaving, setRenameSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isRenaming) {
      setNameDraft(user.displayName);
      setRenameError(null);
      // Auto-focus + select so the student can replace in one gesture
      setTimeout(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      }, 0);
    }
  }, [isRenaming, user.displayName]);

  const submitRename = async () => {
    if (!onRenameDisplayName || renameSaving) return;
    const trimmed = nameDraft.replace(/\s+/g, ' ').trim();
    if (!trimmed || trimmed === user.displayName) {
      setIsRenaming(false);
      return;
    }
    setRenameSaving(true);
    const result = await onRenameDisplayName(trimmed);
    setRenameSaving(false);
    if (result.ok) {
      setIsRenaming(false);
      setRenameError(null);
    } else {
      setRenameError(result.message);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(user.classCode || "");
    setCopiedCode(user.classCode || "");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const xpTitle = getXpTitle(xp);

  // Render the equipped cosmetics so shop purchases actually show up
  // on the legacy dashboard (the Structure UX dashboard already does
  // this via IdentityHero).  Frame = tailwind ring classes wrapping
  // the avatar.  Title = prominent chip replacing the XP-derived
  // title when the student has equipped one.
  const equippedFrame = user.activeFrame
    ? NAME_FRAMES.find(f => f.id === user.activeFrame)
    : null;
  const equippedTitle = user.activeTitle
    ? NAME_TITLES.find(t => t.id === user.activeTitle)
    : null;
  const frameRingClass = equippedFrame?.border ?? 'ring-4 ring-white/40';

  // Roll-up XP counter on mount for a "wow" entrance.
  const [displayedXp, setDisplayedXp] = useState(0);
  useEffect(() => {
    const duration = 900;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayedXp(Math.round(eased * xp));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [xp]);

  const { language } = useLanguage();
  const t = studentDashboardT[language];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t.greetingMorning : hour < 18 ? t.greetingAfternoon : t.greetingEvening;

  // Title visuals from the shared shop catalogue.  When a title is
  // equipped, its FULL signature (gradient + font + weight + extras)
  // applies to both the hero card background and the title-banner pill
  // text — so the dashboard looks like the shop preview.
  const titleStyleEntry = getTitleStyle(equippedTitle?.id);
  const titleGradient = equippedTitle ? titleStyleEntry.gradient : DEFAULT_HERO_GRADIENT;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={`relative overflow-hidden rounded-[28px] sm:rounded-[32px] mb-6 bg-gradient-to-br ${titleGradient} p-5 sm:p-7 shadow-xl shadow-violet-500/20`}
    >
      {/* Soft glow blobs in the background — pure decoration */}
      <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 bg-pink-400/30 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-400/25 rounded-full blur-3xl" />

      {/* TITLE BANNER — fabulous trophy ribbon centred above everything
          else when a title is equipped.  Mirrors IdentityHero's banner
          so both dashboards (legacy + structure-UX) now treat equip as
          a major status statement rather than a small chip below the
          name.  Two crowns flank the title in big bold tracking-wide
          letters; pure white pill so it pops on every gradient. */}
      {equippedTitle && (
        <div className="relative mb-4 flex justify-center">
          {/* Pill background = title's signature gradient (same as shop
              card).  Text sits on top in white with the title's
              shop-defined font + weight + tracking + custom CSS, so the
              dashboard looks identical to what the student saw in the
              shop preview before equipping. */}
          <div className={`inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r ${titleStyleEntry.gradient} text-white rounded-full px-4 sm:px-5 py-2 sm:py-2.5 shadow-2xl ring-2 ring-white/40`}>
            <Crown size={18} className="text-white fill-white/90 drop-shadow" aria-hidden />
            <span
              className={`leading-none ${titleStyleEntry.titleFont} ${titleStyleEntry.titleWeight} ${titleStyleEntry.titleExtra ?? ''}`}
              style={titleStyleEntry.titleStyle}
            >
              {equippedTitle.display}
            </span>
            <Crown size={18} className="text-white fill-white/90 drop-shadow scale-x-[-1]" aria-hidden />
          </div>
        </div>
      )}

      <div className="relative flex items-center gap-4 sm:gap-5">
        {/* Animated avatar — much bigger now (24x24 mobile, 32x32 desktop)
            with a stronger glow halo so the student's chosen icon is the
            visual anchor of the dashboard. */}
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="relative shrink-0"
        >
          <div className="absolute inset-0 rounded-[28px] bg-white/40 blur-xl animate-pulse" />
          <div className={`relative w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-[28px] flex items-center justify-center text-5xl sm:text-7xl shadow-2xl ${frameRingClass}`}>
            {user.avatar || '🦊'}
          </div>
          {streak > 0 && (
            <div className="absolute -bottom-1.5 -right-1.5 bg-gradient-to-br from-orange-400 to-rose-500 text-white text-xs font-black px-2 py-1 rounded-full shadow-md flex items-center gap-1 border-2 border-white">
              <Flame size={12} className="fill-white" />
              {streak}
            </div>
          )}
        </motion.div>

        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-bold text-white/80 tracking-wide">
            {greeting},
          </p>
          {isRenaming ? (
            <div className="mt-1">
              <div className="flex items-center gap-1.5">
                <input
                  ref={nameInputRef}
                  value={nameDraft}
                  onChange={e => setNameDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); void submitRename(); }
                    if (e.key === 'Escape') { e.preventDefault(); setIsRenaming(false); }
                  }}
                  maxLength={30}
                  disabled={renameSaving}
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white text-stone-900 text-xl sm:text-2xl font-black placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-white/70"
                  placeholder={t.yourNamePlaceholder}
                  aria-label={t.yourDisplayName}
                />
                <button
                  type="button"
                  onClick={() => void submitRename()}
                  disabled={renameSaving}
                  style={{ touchAction: 'manipulation' }}
                  className="p-2 rounded-xl bg-white text-stone-900 hover:bg-white/90 disabled:opacity-60 shrink-0"
                  aria-label={t.saveName}
                >
                  <Check size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsRenaming(false)}
                  disabled={renameSaving}
                  style={{ touchAction: 'manipulation' }}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white disabled:opacity-60 shrink-0"
                  aria-label={t.cancel}
                >
                  <XIcon size={18} />
                </button>
              </div>
              {renameError && (
                <p className="mt-1.5 text-xs font-bold text-amber-200 bg-amber-900/40 rounded px-2 py-1 inline-block">
                  {renameError}
                </p>
              )}
            </div>
          ) : (
            <h1 className="text-2xl sm:text-3xl font-black text-white truncate leading-tight flex items-center gap-2">
              <span className="truncate">{user.displayName}</span>
              <span className="inline-block">👋</span>
              {onRenameDisplayName && (
                <button
                  type="button"
                  onClick={() => setIsRenaming(true)}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as never }}
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white/90 transition-colors shrink-0"
                  aria-label={t.changeDisplayName}
                  title={t.changeDisplayName}
                >
                  <Pencil size={14} />
                </button>
              )}
            </h1>
          )}
          {/* XP-derived level chip + class code inline.  Only shown when
              NO title is equipped — when one IS, the big banner above
              already says it loud.  Shows nothing redundant either way. */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            {!equippedTitle && (
              <span className="bg-white/20 backdrop-blur-sm text-white font-bold px-2.5 py-0.5 rounded-full border border-white/30 flex items-center gap-1">
                {xpTitle.emoji} {xpTitle.title}
              </span>
            )}
            <button
              onClick={handleCopyCode}
              type="button"
              style={{ touchAction: 'manipulation' }}
              className="bg-white/10 hover:bg-white/20 text-white/90 font-mono font-bold px-2.5 py-0.5 rounded-full border border-white/20 inline-flex items-center gap-1 active:scale-95 transition-all"
              title={t.tapToCopyClassCode}
            >
              {user.classCode}
              {copiedCode === user.classCode ? (
                <Check size={12} />
              ) : (
                <Copy size={12} className="opacity-70" />
              )}
            </button>
          </div>
        </div>

        {/* Right-hand stack: highlighted XP card + Shop button.
            Moved from the old floating top-bar so everything the student
            cares about (their identity + their balance + where to spend
            it) sits inside one coloured rectangle.  On desktop both
            elements are visible; on mobile they collapse to a tighter
            row below the name. */}
        <div className="hidden sm:flex shrink-0 flex-col gap-2">
          {/* Highlighted XP card — amber/yellow gradient + spark icon so
              it catches the eye as the main metric. */}
          <div className="relative bg-gradient-to-br from-amber-300 to-yellow-400 rounded-2xl px-5 py-3 shadow-lg shadow-amber-500/30 border-2 border-white/60">
            <div className="absolute inset-0 rounded-2xl bg-white/20 blur-lg opacity-60 pointer-events-none" />
            <div className="relative flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-inner">
                <Zap size={16} className="text-white fill-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-stone-900 tabular-nums leading-none">{displayedXp}</span>
                <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest leading-none mt-0.5">{t.totalXp}</span>
              </div>
            </div>
          </div>

          {/* Shop button — same visual weight as the XP card so they
              read as a natural pair. */}
          <button
            onClick={onShopClick}
            type="button"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            className="relative inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-br from-fuchsia-500 via-pink-500 to-rose-500 text-white font-black rounded-2xl shadow-lg shadow-pink-500/40 hover:shadow-xl hover:shadow-pink-500/50 active:scale-95 transition-all text-sm border-2 border-white/60"
          >
            <ShoppingBag size={16} />
            Shop
            <span className="ml-0.5 inline-flex items-center gap-0.5 bg-yellow-300 text-rose-700 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-white/50">
              NEW
            </span>
          </button>
        </div>
      </div>

      {/* Mobile row — XP pill + Shop button side-by-side so phones get
          the same info density as the desktop stack. */}
      <div className="sm:hidden mt-4 flex items-stretch gap-2">
        <div className="flex-1 relative bg-gradient-to-br from-amber-300 to-yellow-400 rounded-2xl px-3 py-2 shadow-lg shadow-amber-500/30 border-2 border-white/60 flex items-center gap-2">
          <Zap size={14} className="text-stone-900 fill-amber-600 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-lg font-black text-stone-900 tabular-nums leading-none truncate">{displayedXp}</span>
            <span className="text-[9px] font-black text-amber-800 uppercase tracking-widest leading-none mt-0.5">{t.totalXp}</span>
          </div>
        </div>
        <button
          onClick={onShopClick}
          type="button"
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-fuchsia-500 via-pink-500 to-rose-500 text-white font-black rounded-2xl shadow-lg shadow-pink-500/40 active:scale-95 transition-all text-sm border-2 border-white/60"
        >
          <ShoppingBag size={14} />
          Shop
        </button>
      </div>
    </motion.div>
  );
}
