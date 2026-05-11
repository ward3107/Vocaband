/**
 * HebrewComingSoonView — Hebrew-only placeholder for surfaces that
 * exist for English but don't yet have a Hebrew-native build.
 *
 * Used as a stop-gap by the dashboard tiles whose flows still depend
 * on English vocabulary data (Quick Play setup, etc.) — without this,
 * a teacher on the VocaHebrew dashboard would land on a screen full of
 * English topic packs / Set 1–3 words. Phase 2 replaces each caller
 * with a real Hebrew-native flow (mirror of HebrewWorksheetView).
 */
import { ArrowRight } from "lucide-react";

interface HebrewComingSoonViewProps {
  /** Hebrew screen title — e.g. "Quick Play" → "משחק מהיר". */
  titleHe: string;
  /** Optional one-line Hebrew description shown under the title. */
  descriptionHe?: string;
  onBack: () => void;
}

export default function HebrewComingSoonView({
  titleHe,
  descriptionHe,
  onBack,
}: HebrewComingSoonViewProps) {
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-8 flex flex-col"
      dir="rtl"
      lang="he"
    >
      <header className="flex items-center justify-between mb-8">
        <button
          type="button"
          onClick={onBack}
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-black hover:bg-white/15"
        >
          <ArrowRight size={14} />
          <span>חזרה</span>
        </button>
        <div className="text-blue-200 font-black text-[11px] tracking-[0.2em]">
          VocaHebrew
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-indigo-500/30 mb-6">
            <span className="text-4xl" aria-hidden>
              🚧
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-3">
            {titleHe}
          </h1>
          <div className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/20 text-blue-200 text-xs font-black tracking-widest mb-4">
            בקרוב בעברית
          </div>
          {descriptionHe && (
            <p className="text-white/70 font-bold text-sm mb-6 leading-relaxed">
              {descriptionHe}
            </p>
          )}
          <p className="text-white/50 text-xs font-bold mb-8">
            התכונה הזו זמינה כרגע רק בערוץ האנגלית. הגרסה העברית בפיתוח —
            עד אז ניתן להשתמש ב<span className="text-white/80">דף עבודה</span>
            {" "}וב<span className="text-white/80">מטלות</span> לתרגול בעברית.
          </p>
          <button
            type="button"
            onClick={onBack}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm shadow-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-400 hover:to-indigo-500 shadow-indigo-500/30"
          >
            חזרה ללוח הבקרה
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
