/**
 * HebrewSoloLaunchStrip — quick-launch tiles for the four VocaHebrew
 * native-track games.  Shown on the unified TeacherDashboardView when
 * activeVoca === 'hebrew', taking the slot that TeacherQuickActions
 * fills for English teachers.  Most of TeacherQuickActions (Vocabagrut,
 * Worksheet builder, Class Show) is English-only or deferred to Phase
 * 4.5 for Hebrew, so the Hebrew strip stays focused on the four games
 * a teacher can actually launch today.
 *
 * Pattern mirrors the original VocaHebrewDashboardView tile grid so the
 * visual language is consistent.  Once VocaHebrewDashboardView is
 * retired (Phase 4 cleanup step), this component is the sole renderer.
 */
import { motion } from "motion/react";

export interface HebrewLaunches {
  niqqud: () => void;
  shoresh: () => void;
  synonym: () => void;
  listening: () => void;
}

interface HebrewSoloLaunchStripProps {
  launches: HebrewLaunches;
}

interface Tile {
  emoji: string;
  title: string;
  blurb: string;
  gradient: string;
  shadow: string;
  onLaunch: () => void;
}

export default function HebrewSoloLaunchStrip({
  launches,
}: HebrewSoloLaunchStripProps) {
  const tiles: readonly Tile[] = [
    {
      emoji: "נִ",
      title: "מצב ניקוד",
      blurb: "בחרו את הניקוד הנכון · כיתות ג–ט · 10 סיבובים",
      gradient: "from-amber-400 via-orange-500 to-rose-500",
      shadow: "shadow-orange-500/20",
      onLaunch: launches.niqqud,
    },
    {
      emoji: "ש",
      title: "ציד שורש",
      blurb: "מצאו את שלוש אותיות השורש · כיתות ה–ט · 10 סיבובים",
      gradient: "from-emerald-500 via-teal-500 to-cyan-600",
      shadow: "shadow-emerald-500/20",
      onLaunch: launches.shoresh,
    },
    {
      emoji: "↔",
      title: "התאמת מילים נרדפות",
      blurb: "התאימו מילים לפי משמעות · כיתות ד–ט · 10 סיבובים",
      gradient: "from-fuchsia-500 via-pink-500 to-rose-600",
      shadow: "shadow-fuchsia-500/20",
      onLaunch: launches.synonym,
    },
    {
      emoji: "🎧",
      title: "מצב האזנה",
      blurb: "שמעו ובחרו את הניקוד · כיתות ג–ט · 10 סיבובים",
      gradient: "from-violet-500 via-indigo-500 to-blue-600",
      shadow: "shadow-indigo-500/20",
      onLaunch: launches.listening,
    },
  ];

  return (
    <div className="mb-8" dir="rtl">
      <p
        className="text-[10px] font-black tracking-[0.25em] mb-3"
        style={{ color: "var(--vb-accent)" }}
      >
        השקה עצמאית · VocaHebrew
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tiles.map((tile) => (
          <motion.button
            key={tile.title}
            type="button"
            onClick={tile.onLaunch}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            style={{
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
            className={`relative overflow-hidden rounded-3xl p-6 sm:p-7 text-start bg-gradient-to-br ${tile.gradient} text-white shadow-lg ${tile.shadow}`}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="text-5xl mb-3 drop-shadow-lg">{tile.emoji}</div>
              <h3 className="text-xl font-black mb-1">{tile.title}</h3>
              <p className="text-white/85 font-bold text-xs sm:text-sm mb-4">
                {tile.blurb}
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] font-black tracking-widest">
                שחקו <span aria-hidden>←</span>
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
