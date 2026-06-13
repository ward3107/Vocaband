/**
 * PauseOverlay — full-screen "Paused — tap to resume" layer shown by
 * useInterruptionPause after a phone call / notification / tab switch
 * (open-issues §C). The entire backdrop is one giant button so a 9yo
 * can't miss it; the card inside is pointer-events-none and purely
 * decorative. autoFocus lets Chromebook students resume with Enter or
 * Space without reaching for the trackpad.
 */
import { motion } from "motion/react";
import { useLanguage } from "../../hooks/useLanguage";
import { gameActiveT } from "../../locales/student/game-active";

export default function PauseOverlay({ onResume }: { onResume: () => void }) {
  const { language, dir } = useLanguage();
  const t = gameActiveT[language];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-stone-900/70 backdrop-blur-sm"
      dir={dir}
    >
      <button
        type="button"
        onClick={onResume}
        autoFocus
        aria-label={t.pausedTapToResume}
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        className="absolute inset-0 h-full w-full cursor-pointer"
      />
      <motion.div
        initial={{ scale: 0.9, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 20 }}
        className="pointer-events-none relative w-full max-w-sm rounded-3xl bg-white px-8 py-10 text-center shadow-2xl"
      >
        <span className="text-5xl" aria-hidden>⏸️</span>
        <h2 className="mt-4 text-2xl font-black text-stone-900">{t.pausedTitle}</h2>
        <p className="mt-2 font-semibold text-stone-500">{t.pausedTapToResume}</p>
        {/* Visual CTA only — the real hit target is the backdrop button. */}
        <span className="mt-6 inline-block rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-6 py-3 font-black text-white shadow-lg shadow-violet-500/20">
          {t.pausedResumeButton}
        </span>
      </motion.div>
    </motion.div>
  );
}
