/**
 * MasteryHeatmap — per-word coloured dot grid for a single student.
 *
 * Rendered inside the Gradebook's per-student drawer. Each dot is one
 * word the student has attempted in one of the class's assignments;
 * colour encodes mastery:
 *
 *   🟢 green  — ≥ 80% correct across all attempts
 *   🟡 amber  — 50–79% correct
 *   🔴 rose   — < 50% correct
 *   ⚪ grey   — never attempted (shown only if a wordId is in the
 *              grid but the student hasn't played it)
 *
 * Hover / tap shows the English word + accuracy + total attempts.
 * Mobile-friendly: dots are 20px min tap target via padding, content
 * scrolls horizontally inside the card so long classes don't blow the
 * layout on a phone.
 */
import { motion } from "motion/react";
import type { Word } from "../../data/vocabulary";

export interface MasteryRow {
  wordId: number;
  correctCount: number;
  totalCount: number;
  lastAttempt: string | null;
}

interface MasteryHeatmapProps {
  /** Aggregated attempts for one student. */
  rows: MasteryRow[];
  /** Source of English text to render a label per dot. */
  words: Word[];
  /** Optional title — e.g. "Unit 5 Fruits" when scoped per-assignment. */
  title?: string;
}

function classifyAccuracy(correct: number, total: number): 'none' | 'rose' | 'amber' | 'green' {
  if (total === 0) return 'none';
  const pct = correct / total;
  if (pct >= 0.8) return 'green';
  if (pct >= 0.5) return 'amber';
  return 'rose';
}

const DOT_CLASSES: Record<'none' | 'rose' | 'amber' | 'green', string> = {
  none:  'bg-stone-200 border-stone-300',
  rose:  'bg-gradient-to-br from-rose-400 to-rose-600 border-rose-700 shadow-rose-300/40',
  amber: 'bg-gradient-to-br from-amber-300 to-amber-500 border-amber-600 shadow-amber-300/40',
  green: 'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-700 shadow-emerald-300/40',
};

export default function MasteryHeatmap({ rows, words, title }: MasteryHeatmapProps) {
  // Merge rows aggregated per (word, mode) into one bucket per word.
  // That matches the grid's "one dot = one word across all modes"
  // mental model. Sum counts rather than averaging so 3 correct out of
  // 5 = 60% regardless of which modes the attempts happened in.
  const byWord = new Map<number, { correct: number; total: number; lastAttempt: string | null }>();
  rows.forEach(r => {
    const prev = byWord.get(r.wordId) ?? { correct: 0, total: 0, lastAttempt: null };
    prev.correct += r.correctCount;
    prev.total += r.totalCount;
    if (r.lastAttempt && (!prev.lastAttempt || r.lastAttempt > prev.lastAttempt)) {
      prev.lastAttempt = r.lastAttempt;
    }
    byWord.set(r.wordId, prev);
  });

  if (byWord.size === 0) {
    return (
      <div className="text-sm text-stone-500 italic text-center py-4">
        No word-level data yet — student hasn't completed any modes.
      </div>
    );
  }

  // Sort words by accuracy (worst first) so the teacher's eye lands on
  // weak spots. Words with zero attempts go last.
  const entries = Array.from(byWord.entries()).sort((a, b) => {
    const accA = a[1].total === 0 ? 2 : a[1].correct / a[1].total;
    const accB = b[1].total === 0 ? 2 : b[1].correct / b[1].total;
    return accA - accB;
  });

  const wordLookup = new Map(words.map(w => [w.id, w]));

  // Summary counters — ties directly to the legend at the bottom.
  const counts = { green: 0, amber: 0, rose: 0 };
  entries.forEach(([, stats]) => {
    const kind = classifyAccuracy(stats.correct, stats.total);
    if (kind === 'green' || kind === 'amber' || kind === 'rose') counts[kind]++;
  });

  return (
    <div className="bg-white rounded-2xl p-4 border border-stone-100">
      {title && (
        <h4 className="text-xs font-black uppercase tracking-widest text-stone-500 mb-3">
          {title}
        </h4>
      )}

      {/* Legend + quick totals */}
      <div className="flex flex-wrap items-center gap-3 mb-3 text-xs font-semibold text-stone-600">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
          Mastered <span className="text-emerald-700 font-black">{counts.green}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
          Shaky <span className="text-amber-700 font-black">{counts.amber}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
          Struggling <span className="text-rose-700 font-black">{counts.rose}</span>
        </span>
      </div>

      {/* Heatmap grid — wraps on mobile, stays dense on wider screens. */}
      <div className="flex flex-wrap gap-1.5">
        {entries.map(([wordId, stats], i) => {
          const kind = classifyAccuracy(stats.correct, stats.total);
          const word = wordLookup.get(wordId);
          const english = word?.english ?? `#${wordId}`;
          const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
          const tooltip = stats.total === 0
            ? `${english} — not attempted yet`
            : `${english} · ${pct}% (${stats.correct}/${stats.total} attempts)`;
          return (
            <motion.button
              key={wordId}
              type="button"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.008, 0.6), type: 'spring', stiffness: 300, damping: 18 }}
              whileHover={{ scale: 1.2, zIndex: 5 }}
              whileTap={{ scale: 0.9 }}
              title={tooltip}
              aria-label={tooltip}
              className={`w-5 h-5 rounded-md border shadow-sm transition-shadow ${DOT_CLASSES[kind]} focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400`}
              style={{ touchAction: 'manipulation' }}
            />
          );
        })}
      </div>

      {/* Struggling words callout — actionable list of the three worst
          offenders so teachers can re-assign without reading every dot. */}
      {counts.rose > 0 && (
        <div className="mt-4 pt-3 border-t border-stone-100">
          <p className="text-[11px] font-black uppercase tracking-wide text-rose-600 mb-1.5">
            Needs practice
          </p>
          <p className="text-sm text-stone-700 leading-relaxed">
            {entries
              .filter(([, s]) => classifyAccuracy(s.correct, s.total) === 'rose')
              .slice(0, 5)
              .map(([wordId, s]) => {
                const word = wordLookup.get(wordId);
                const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
                return `${word?.english ?? `#${wordId}`} (${pct}%)`;
              })
              .join(' · ')}
          </p>
        </div>
      )}
    </div>
  );
}
