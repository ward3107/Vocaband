/**
 * HebrewModeSelectionView — student-side mode picker for Hebrew
 * assignments.  Renders only the 4 native Hebrew modes (Niqqud,
 * Shoresh, Synonym, Listening), filtered by the assignment's
 * allowedModes.  Tapping a tile delegates to onPickMode so App.tsx
 * can switch to the right vocahebrew-* view with assignment lemma
 * ids threaded through.
 *
 * Lives separately from GameModeSelectionView (the English picker)
 * because the English picker has 14+ modes, color tables, icon
 * imports, and "learn mode" hero coupling that don't apply here —
 * retrofitting it would inflate that file by 30% just to gate
 * Hebrew rendering.  Same patterns, smaller surface.
 */
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import type { AssignmentData } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";

export type HebrewModeId = "niqqud" | "shoresh" | "synonym" | "listening";

interface ModeTile {
  id: HebrewModeId;
  emoji: string;
  title: string;
  blurb: string;
  gradient: string;
  shadow: string;
}

const TILES: readonly ModeTile[] = [
  { id: "niqqud",    emoji: "נִ", title: "Niqqud Mode",    blurb: "Pick the right vocalization", gradient: "from-amber-400 via-orange-500 to-rose-500",  shadow: "shadow-orange-500/20" },
  { id: "shoresh",   emoji: "ש",  title: "Shoresh Hunt",   blurb: "Find the 3 root letters",      gradient: "from-emerald-500 via-teal-500 to-cyan-600",  shadow: "shadow-emerald-500/20" },
  { id: "synonym",   emoji: "↔",  title: "Synonym Match",  blurb: "Pair words by meaning",        gradient: "from-fuchsia-500 via-pink-500 to-rose-600",  shadow: "shadow-fuchsia-500/20" },
  { id: "listening", emoji: "🎧", title: "Listening Mode", blurb: "Hear it, pick the niqqud",     gradient: "from-violet-500 via-indigo-500 to-blue-600", shadow: "shadow-indigo-500/20" },
];

interface HebrewModeSelectionViewProps {
  activeAssignment: AssignmentData | null;
  onPickMode: (mode: HebrewModeId) => void;
  onExit: () => void;
}

export default function HebrewModeSelectionView({
  activeAssignment, onPickMode, onExit,
}: HebrewModeSelectionViewProps) {
  const { language } = useLanguage();
  // Default to all 4 modes when the assignment doesn't constrain
  // (e.g. a teacher quick-launch from the dashboard) — same pattern
  // the English picker uses.
  const allowed = activeAssignment?.allowedModes ?? TILES.map((t) => t.id);
  const visibleTiles = TILES.filter((t) => allowed.includes(t.id));
  const lemmaCount = activeAssignment?.wordIds?.length ?? 0;
  const backLabel = language === 'he' ? 'חזרה' : language === 'ar' ? 'رجوع' : 'Back';
  const pickGameLabel = language === 'he' ? 'בחרו משחק' : language === 'ar' ? 'اختر لعبة' : 'Pick a game';
  const defaultTitle = language === 'he' ? 'תרגול VocaHebrew' : language === 'ar' ? 'تدريب VocaHebrew' : 'VocaHebrew Practice';
  const wordCountStr = (n: number) =>
    language === 'he' ? `${n} ${n === 1 ? 'מילה' : 'מילים'} במשימה זו` :
    language === 'ar' ? `${n} ${n === 1 ? 'كلمة' : 'كلمات'} في هذا الواجب` :
    `${n} ${n === 1 ? 'word' : 'words'} in this assignment`;
  const noModesLine1 = language === 'he' ? 'המורה שלכם לא הפעיל משחקי עברית.' : language === 'ar' ? 'لم يفعّل معلمك أي ألعاب عبرية بعد.' : "Your teacher hasn't enabled any Hebrew games yet.";
  const noModesLine2 = language === 'he' ? 'בקשו ממנו להוסיף לפחות מצב אחד למשימה הזו.' : language === 'ar' ? 'اطلب منه إضافة وضع واحد على الأقل لهذا الواجب.' : 'Ask them to add at least one mode to this assignment.';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <button
            type="button"
            onClick={onExit}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-black tracking-widest uppercase hover:bg-white/15"
          >
            <ArrowLeft size={14} />
            {backLabel}
          </button>
          <div className="text-blue-200 font-black text-[11px] tracking-[0.25em] uppercase">
            VocaHebrew
          </div>
        </header>

        <div className="text-center mb-8 sm:mb-10">
          <p className="text-blue-300 font-black text-[10px] tracking-[0.25em] uppercase mb-3">
            {pickGameLabel}
          </p>
          <h1 className="text-2xl sm:text-4xl font-black text-white drop-shadow-lg">
            {activeAssignment?.title ?? defaultTitle}
          </h1>
          {lemmaCount > 0 && (
            <p className="text-white/60 font-bold text-sm mt-2">
              {wordCountStr(lemmaCount)}
            </p>
          )}
        </div>

        {visibleTiles.length === 0 ? (
          <div className="text-center text-white/70 font-bold py-12">
            <p className="mb-3">{noModesLine1}</p>
            <p className="text-white/40 text-sm">{noModesLine2}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visibleTiles.map((tile) => (
              <motion.button
                key={tile.id}
                type="button"
                onClick={() => onPickMode(tile.id)}
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
        )}
      </div>
    </div>
  );
}
