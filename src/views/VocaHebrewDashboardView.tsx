/**
 * VocaHebrewDashboardView — entry hub for the VocaHebrew native
 * track.  Shown when an entitled teacher picks Hebrew on the
 * VocaPicker.  Launches the four native-track games against the
 * 30-lemma seed corpus: Niqqud, Shoresh Hunt, Synonym Match,
 * Listening.
 */
import { motion } from "motion/react";
import type { AppUser } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";

interface GameTile {
  emoji: string;
  title: string;
  blurb: string;
  gradient: string;
  shadow: string;
  onLaunch: () => void;
}

interface VocaHebrewDashboardViewProps {
  user: AppUser;
  /** Tap "Switch Voca" → returns to picker.  Hidden when teacher
   *  has only Hebrew entitlement (no other Voca to switch to). */
  onSwitchVoca: () => void;
  /** Whether the teacher has 2+ Vocas — drives the switch button. */
  showSwitcher: boolean;
  onLaunchNiqqudMode: () => void;
  onLaunchShoreshHunt: () => void;
  onLaunchSynonymMatch: () => void;
  onLaunchListeningMode: () => void;
}

export default function VocaHebrewDashboardView({
  user,
  onSwitchVoca,
  showSwitcher,
  onLaunchNiqqudMode,
  onLaunchShoreshHunt,
  onLaunchSynonymMatch,
  onLaunchListeningMode,
}: VocaHebrewDashboardViewProps) {
  const { dir } = useLanguage();
  const tiles: readonly GameTile[] = [
    {
      emoji: "נִ",
      title: "Niqqud Mode",
      blurb: "Pick the correct vocalization · grades 3–9 · 10 rounds",
      gradient: "from-amber-400 via-orange-500 to-rose-500",
      shadow: "shadow-orange-500/20",
      onLaunch: onLaunchNiqqudMode,
    },
    {
      emoji: "ש",
      title: "Shoresh Hunt",
      blurb: "Find the 3 root letters · grades 5–9 · 10 rounds",
      gradient: "from-emerald-500 via-teal-500 to-cyan-600",
      shadow: "shadow-emerald-500/20",
      onLaunch: onLaunchShoreshHunt,
    },
    {
      emoji: "↔",
      title: "Synonym Match",
      blurb: "Pair words by meaning · grades 4–9 · 10 rounds",
      gradient: "from-fuchsia-500 via-pink-500 to-rose-600",
      shadow: "shadow-fuchsia-500/20",
      onLaunch: onLaunchSynonymMatch,
    },
    {
      emoji: "🎧",
      title: "Listening Mode",
      blurb: "Hear it, pick the niqqud · grades 3–9 · 10 rounds",
      gradient: "from-violet-500 via-indigo-500 to-blue-600",
      shadow: "shadow-indigo-500/20",
      onLaunch: onLaunchListeningMode,
    },
  ];

  return (
    <div
      dir={dir}
      className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-8"
    >
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8 sm:mb-12">
          <div className="flex items-center gap-3">
            <div className="text-3xl sm:text-4xl drop-shadow-lg">📖</div>
            <div>
              <p className="text-blue-300 font-black text-[10px] tracking-[0.25em] uppercase">
                VocaHebrew
              </p>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {user.displayName || "Teacher"}
              </h1>
            </div>
          </div>
          {showSwitcher && (
            <motion.button
              type="button"
              onClick={onSwitchVoca}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              style={{
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
              className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-black tracking-widest uppercase hover:bg-white/15"
            >
              Switch Voca
            </motion.button>
          )}
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 rounded-3xl bg-gradient-to-br from-blue-500 via-sky-500 to-indigo-600 p-6 sm:p-8 text-white shadow-lg shadow-indigo-500/20"
        >
          <p className="text-blue-100 font-black text-[10px] tracking-[0.25em] uppercase mb-2">
            ברוך הבא
          </p>
          <h2 className="text-2xl sm:text-3xl font-black font-headline mb-2" lang="he" dir="rtl">
            VocaHebrew · ללמד וללמוד עברית
          </h2>
          <p className="text-white/85 font-bold text-sm sm:text-base max-w-xl">
            30 starter lemmas across animals, family, school, weather,
            feelings, and verbs — grades 3–9.  More games and content
            roll in over the next sessions.
          </p>
        </motion.div>

        <p className="text-blue-300 font-black text-[10px] tracking-[0.25em] uppercase mb-3">
          Available games
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tiles.map((tile) => (
            <motion.button
              key={tile.title}
              type="button"
              onClick={tile.onLaunch}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className={`relative overflow-hidden rounded-3xl p-6 sm:p-7 text-start bg-gradient-to-br ${tile.gradient} text-white shadow-lg ${tile.shadow}`}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className="text-5xl mb-3 drop-shadow-lg">{tile.emoji}</div>
                <h3 className="text-xl font-black mb-1">{tile.title}</h3>
                <p className="text-white/85 font-bold text-xs sm:text-sm mb-4">
                  {tile.blurb}
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] font-black tracking-widest uppercase">
                  Play <span aria-hidden>→</span>
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
