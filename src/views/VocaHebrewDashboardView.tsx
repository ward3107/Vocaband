/**
 * VocaHebrewDashboardView — placeholder shown when an entitled
 * teacher picks Hebrew on the VocaPicker.  This is a skeleton: the
 * actual Hebrew classes / Niqqud Mode / shoresh content land in
 * follow-up sessions per the VocaHebrew MVP plan.
 *
 * Living here as a real view (not a coming-soon modal) means the
 * routing + entitlement plumbing is fully exercised end-to-end the
 * moment the principal flips a teacher to ['english','hebrew'].
 * The day Hebrew content ships, the only change is what renders
 * inside this file.
 */
import { motion } from "motion/react";
import type { AppUser } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";

interface VocaHebrewDashboardViewProps {
  user: AppUser;
  /** Tap "Switch Voca" → returns to picker.  Hidden when teacher
   *  has only Hebrew entitlement (no other Voca to switch to). */
  onSwitchVoca: () => void;
  /** Whether the teacher has 2+ Vocas — drives the switch button. */
  showSwitcher: boolean;
  /** Launch the Niqqud Mode game.  This is the only shipped mode
   *  in VocaHebrew at the moment; more land in follow-ups
   *  (Shoresh Hunt, Synonym Match, etc.). */
  onLaunchNiqqudMode: () => void;
}

export default function VocaHebrewDashboardView({
  user,
  onSwitchVoca,
  showSwitcher,
  onLaunchNiqqudMode,
}: VocaHebrewDashboardViewProps) {
  const { dir } = useLanguage();
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
          <motion.button
            type="button"
            onClick={onLaunchNiqqudMode}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="relative overflow-hidden rounded-3xl p-6 sm:p-7 text-start bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/20"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="text-5xl mb-3 drop-shadow-lg">נִ</div>
              <h3 className="text-xl font-black mb-1">Niqqud Mode</h3>
              <p className="text-white/85 font-bold text-xs sm:text-sm mb-4">
                Pick the correct vocalization · grades 3–9 · 10 rounds
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] font-black tracking-widest uppercase">
                Play <span aria-hidden>→</span>
              </span>
            </div>
          </motion.button>

          <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 bg-white/5 border border-white/10 text-white/60">
            <div className="text-5xl mb-3">ש</div>
            <h3 className="text-xl font-black mb-1 text-white/80">Shoresh Hunt</h3>
            <p className="text-white/50 font-bold text-xs sm:text-sm">
              Find the 3 root letters · coming next
            </p>
          </div>
          <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 bg-white/5 border border-white/10 text-white/60">
            <div className="text-5xl mb-3">↔</div>
            <h3 className="text-xl font-black mb-1 text-white/80">Synonym Match</h3>
            <p className="text-white/50 font-bold text-xs sm:text-sm">
              Pair words by meaning · coming next
            </p>
          </div>
          <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 bg-white/5 border border-white/10 text-white/60">
            <div className="text-5xl mb-3">🎙</div>
            <h3 className="text-xl font-black mb-1 text-white/80">Hebrew TTS</h3>
            <p className="text-white/50 font-bold text-xs sm:text-sm">
              Studio audio per lemma · coming next
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
