/**
 * DropOfTheWeekCard — big gradient hero button showcasing the weekly
 * rotating shop item (currently 20% off).
 *
 * Reused in:
 *  - ShopView's Arcade Lobby hub (top hero slot)
 *  - StudentDashboardView (separate call-to-action tile that sends
 *    students straight to the discounted category in the shop)
 *
 * Week-based rotation: the item for the current ISO week is computed
 * deterministically from LIMITED_ROTATION — same item for every student
 * during the same week, then rotates on Monday.
 */
import { motion } from "motion/react";
import { Sparkles, ChevronRight } from "lucide-react";
import type { ShopTab } from "../../core/views";
import { LIMITED_ROTATION } from "../../constants/game";
import { useLanguage } from "../../hooks/useLanguage";
import { studentDashboardT } from "../../locales/student/student-dashboard";

function currentLimitedItem() {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 1);
  const diffDays = Math.floor((d.getTime() - start.getTime()) / 86400000);
  const week = `${d.getFullYear()}-W${Math.ceil((diffDays + start.getDay() + 1) / 7)}`;
  let hash = 0;
  for (let i = 0; i < week.length; i++) hash = (hash * 31 + week.charCodeAt(i)) | 0;
  return LIMITED_ROTATION[Math.abs(hash) % LIMITED_ROTATION.length];
}

interface DropOfTheWeekCardProps {
  /** Called when the card is tapped — pass the ShopTab that matches the item's kind. */
  onShopOpen: (tab: ShopTab) => void;
  className?: string;
}

export default function DropOfTheWeekCard({ onShopOpen, className = "" }: DropOfTheWeekCardProps) {
  const { language, dir, isRTL } = useLanguage();
  const t = studentDashboardT[language];
  const limited = currentLimitedItem();
  const limitedEmoji =
    limited.kind === "avatar" ? limited.itemId :
    limited.kind === "title" ? "🏷️" :
    limited.kind === "frame" ? "🖼️" : "🎨";

  const targetTab: ShopTab =
    limited.kind === "avatar" ? "avatars" :
    limited.kind === "title" ? "titles" :
    limited.kind === "frame" ? "frames" : "themes";

  return (
    <motion.button
      onClick={() => onShopOpen(targetTab)}
      type="button"
      style={{ touchAction: "manipulation" }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      dir={dir}
      className={`relative w-full overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 sm:p-8 shadow-xl shadow-violet-500/20 ${isRTL ? 'text-right' : 'text-left'} ${className}`}
    >
      <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 bg-yellow-300/30 rounded-full blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-20 w-64 h-64 bg-cyan-400/25 rounded-full blur-3xl" />
      {/* Sparkle particles */}
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          aria-hidden
          className="pointer-events-none absolute text-white/60"
          style={{ top: `${20 + (i * 13) % 60}%`, left: `${10 + (i * 17) % 80}%`, fontSize: 10 }}
          animate={{ opacity: [0.2, 0.9, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
        >
          ✨
        </motion.span>
      ))}
      <div className="relative flex items-center gap-5">
        <motion.div
          animate={{ rotate: [-4, 4, -4], y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-3xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-5xl sm:text-6xl shadow-inner"
        >
          {limitedEmoji}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 bg-amber-300 text-rose-900 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-1.5">
            <Sparkles size={10} /> {t.dropOfTheWeek}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">{limited.tagline}</h1>
          <p className="text-sm text-white/90 mt-1">
            <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-black">
              {t.dropDiscountChip(Math.round(limited.discount * 100))}
            </span>{" "}
            {t.dropThisWeekInShop}
          </p>
        </div>
        <ChevronRight size={24} className={`text-white/70 shrink-0 hidden sm:block ${isRTL ? 'rotate-180' : ''}`} />
      </div>
    </motion.button>
  );
}
