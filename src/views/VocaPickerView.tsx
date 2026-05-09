/**
 * VocaPickerView — post-login landing for teachers entitled to 2+
 * Vocas (e.g. their school's principal assigned both English and
 * Hebrew via users.subjects_taught).  Teachers with a single Voca
 * never see this screen; they route straight to teacher-dashboard.
 *
 * No track-switch picker, no learner/native toggle — those concerns
 * sit further down in the Voca itself.  This screen only answers
 * "which Voca am I working in this session?".
 */
import { motion } from "motion/react";
import type { AppUser } from "../core/supabase";
import type { VocaId } from "../core/subject";
import { useLanguage } from "../hooks/useLanguage";

interface VocaCard {
  id: VocaId;
  name: string;
  tag: string;
  emoji: string;
  /** Tailwind gradient classes — kept consistent with the
   *  landing-page Voca Family teaser so a teacher who saw the
   *  marketing card recognises the brand here. */
  gradient: string;
}

const VOCA_CARDS: readonly VocaCard[] = [
  {
    id: "english",
    name: "VocaEnglish",
    tag: "Build vocabulary in English",
    emoji: "🇬🇧",
    gradient: "from-indigo-500 via-violet-500 to-fuchsia-600",
  },
  {
    id: "hebrew",
    name: "VocaHebrew",
    tag: "ללמד וללמוד עברית",
    emoji: "📖",
    gradient: "from-blue-500 via-sky-500 to-indigo-600",
  },
];

interface VocaPickerViewProps {
  user: AppUser;
  /** Called when the teacher taps a card.  App.tsx persists the
   *  choice for this session and routes into the right dashboard. */
  onPickVoca: (voca: VocaId) => void;
}

export default function VocaPickerView({ user, onPickVoca }: VocaPickerViewProps) {
  const { dir } = useLanguage();
  const entitled = (user.subjectsTaught ?? ["english"]) as readonly VocaId[];
  const cards = VOCA_CARDS.filter((c) => entitled.includes(c.id));

  return (
    <div
      dir={dir}
      className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 sm:p-8"
    >
      <div className="max-w-4xl w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10 sm:mb-14"
        >
          <p className="text-amber-300 font-black text-xs tracking-[0.25em] uppercase mb-3">
            Welcome back, {user.displayName || "teacher"}
          </p>
          <h1 className="text-3xl sm:text-5xl font-black font-headline text-white mb-3 drop-shadow-lg">
            Pick your Voca
          </h1>
          <p className="text-white/70 font-bold text-sm sm:text-base max-w-lg mx-auto">
            Your school has unlocked {cards.length} Vocas for you. You can
            switch between them any time from the header.
          </p>
        </motion.div>

        <div
          className={`grid gap-5 sm:gap-7 ${
            cards.length === 1 ? "grid-cols-1 max-w-md mx-auto" : "grid-cols-1 sm:grid-cols-2"
          }`}
        >
          {cards.map((card, i) => (
            <motion.button
              key={card.id}
              type="button"
              onClick={() => onPickVoca(card.id)}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 + i * 0.08 }}
              whileHover={{ y: -6, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
              }}
              className={`relative overflow-hidden rounded-3xl p-8 sm:p-10 text-left bg-gradient-to-br ${card.gradient} text-white shadow-lg shadow-indigo-500/20`}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className="text-6xl sm:text-7xl mb-5 drop-shadow-lg">{card.emoji}</div>
                <h2 className="text-2xl sm:text-3xl font-black mb-2">{card.name}</h2>
                <p className="text-white/85 font-bold text-sm sm:text-base">{card.tag}</p>
                <div className="mt-6 inline-flex items-center gap-2 text-xs font-black tracking-widest uppercase text-white/90">
                  Enter
                  <span aria-hidden>→</span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
