/**
 * StatChip — the one statistic widget used everywhere in v2 Classroom.
 *
 * Pattern (per plan):
 *   ┌────────────────────────┐
 *   │   78%                  │  ← 3xl bold, tone-coloured
 *   │   avg score ⓘ          │  ← label, plain English, tappable (i)
 *   │   across 12 students   │  ← small supporting line
 *   └────────────────────────┘
 *
 * The "i" button is part of the card: hover reveals the explainer on
 * desktop, tap toggles it on mobile (so kids / teachers never see a
 * stat without knowing what it means). Click-outside + Esc close it.
 *
 * Colour tones are semantic, not decorative:
 *   emerald ≥ 80, amber 70–79, rose < 70
 * Pass `tone` explicitly to opt out of that scale (e.g. 'indigo' for
 * neutral counts like "12 active students").
 */
import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { teacherClassroomT } from "../../locales/teacher/classroom";

export type StatTone = "emerald" | "amber" | "rose" | "indigo" | "violet" | "stone";

interface StatChipProps {
  /** Big number at the top. Accepts string so callers can format
   *  ("78%", "12", "5 days") without re-implementing. */
  value: string | number;
  /** Short label, lower-case, plain English. */
  label: string;
  /** One-line supporting context. Always visible. */
  caption?: string;
  /** Full explainer — shown in the "i" tooltip. */
  tooltip?: string;
  /** Colour tone. Omit + pass `score` instead to auto-pick by threshold. */
  tone?: StatTone;
  /** Optional numeric score; when `tone` is absent this picks emerald /
   *  amber / rose by the 80 / 70 thresholds. */
  score?: number;
  /** Optional tap handler for the whole card (e.g. jump to a tab). */
  onClick?: () => void;
  /** Optional leading emoji / icon rendered left of the big number. */
  icon?: React.ReactNode;
}

const TEXT_TONE: Record<StatTone, string> = {
  emerald: "text-emerald-600",
  amber:   "text-amber-600",
  rose:    "text-rose-600",
  indigo:  "text-indigo-600",
  violet:  "text-violet-600",
  // The neutral tone reads from the active teacher theme so it blends in
  // with whichever palette the teacher picked.
  stone:   "text-[var(--vb-text-secondary)]",
};

const RING_TONE: Record<StatTone, string> = {
  emerald: "border-emerald-100 hover:border-emerald-200",
  amber:   "border-amber-100 hover:border-amber-200",
  rose:    "border-rose-100 hover:border-rose-200",
  indigo:  "border-indigo-100 hover:border-indigo-200",
  violet:  "border-violet-100 hover:border-violet-200",
  stone:   "border-[var(--vb-border)] hover:border-[var(--vb-text-muted)]",
};

// Score → tone scale.
// 80+ green, 50-79 amber, < 50 rose.  Earlier scale flipped to rose at
// 70 which lit up "58%" like a fire alarm — teachers in the pilot
// reported the colour felt out of proportion to the actual signal
// (mid-50s is room-for-improvement, not crisis).  Amber covers a
// wider middle band so "needs attention" reads as exactly that.
function toneFromScore(s: number): StatTone {
  if (s >= 80) return "emerald";
  if (s >= 50) return "amber";
  return "rose";
}

export default function StatChip({
  value, label, caption, tooltip, tone, score, onClick, icon,
}: StatChipProps) {
  const { language } = useLanguage();
  const t = teacherClassroomT[language];
  const [tipOpen, setTipOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const resolvedTone: StatTone = tone ?? (score != null ? toneFromScore(score) : "indigo");

  // Close tooltip on outside click + Esc so mobile taps feel natural.
  useEffect(() => {
    if (!tipOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setTipOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTipOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [tipOpen]);

  const body = (
    <>
      {/* Density redesign 2026-04-25: drop the verbose caption, fold the
          label below the number, and shave padding so 4 chips fit in
          one row at 1024 px without the empty-space sprawl teachers
          reported (cards looked like big white blobs with a tiny number
          in them).  Tooltip carries the "what this means" detail so
          we lose nothing functional. */}
      <div className="flex items-baseline gap-2 leading-none">
        <span className={`text-xl font-black ${TEXT_TONE[resolvedTone]} flex items-center gap-1`}>
          {icon && <span className="text-sm" aria-hidden>{icon}</span>}
          {value}
        </span>
        <span className="text-[10px] font-black uppercase tracking-wider truncate" style={{ color: 'var(--vb-text-secondary)' }}>
          {label}
        </span>
        {tooltip && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTipOpen(o => !o);
            }}
            onMouseEnter={() => setTipOpen(true)}
            onMouseLeave={() => setTipOpen(false)}
            aria-label={t.whatLabelMeansAria(label)}
            aria-expanded={tipOpen}
            className="w-3.5 h-3.5 shrink-0 rounded-full hover:opacity-80 flex items-center justify-center transition-colors"
            style={{
              backgroundColor: 'var(--vb-surface-alt)',
              color: 'var(--vb-text-muted)',
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent" as never,
            }}
          >
            <Info size={9} />
          </button>
        )}
      </div>

      {caption && (
        <div className="text-[10px] mt-1 leading-tight truncate" style={{ color: 'var(--vb-text-muted)' }}>{caption}</div>
      )}

      {tooltip && tipOpen && (
        <div
          role="tooltip"
          className="absolute z-20 top-full left-0 right-0 mt-2 p-3 text-xs rounded-xl shadow-2xl leading-snug"
          style={{ backgroundColor: 'var(--vb-text-primary)', color: 'var(--vb-surface)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="font-bold uppercase tracking-wider text-[10px] block mb-1 opacity-70">
            {t.whatThisMeans}
          </span>
          {tooltip}
        </div>
      )}
    </>
  );

  // When the caller wants the whole card tappable, render as a button
  // so accessibility + hover come for free.
  if (onClick) {
    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={onClick}
          style={{
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent" as never,
            backgroundColor: 'var(--vb-surface)',
          }}
          className={`relative w-full text-left rounded-xl px-3 py-2 border transition-colors ${RING_TONE[resolvedTone]}`}
        >
          {body}
        </button>
      </div>
    );
  }
  return (
    <div
      ref={ref}
      style={{ backgroundColor: 'var(--vb-surface)' }}
      className={`relative rounded-xl px-3 py-2 border ${RING_TONE[resolvedTone]}`}
    >
      {body}
    </div>
  );
}
