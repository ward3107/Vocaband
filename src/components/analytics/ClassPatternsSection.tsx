import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Calendar, AlertTriangle } from 'lucide-react';
import type { ProgressData } from '../../core/supabase';
import { ALL_WORDS } from '../../data/vocabulary';

interface ClassPatternsSectionProps {
  /** All progress rows the teacher has access to (already filtered by class elsewhere if needed). */
  scores: ProgressData[];
  /** Optional class-code filter. If provided, only rows matching this class_code are considered. */
  classCode?: string | null;
  /** Number of weeks to show on the heatmap (default 8). */
  weeks?: number;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Class Patterns — two analytics cards grouped into one section:
 *
 *   1. Weekly Activity Heatmap — a 7 × N-weeks grid of play counts,
 *      coloured on a perceptually-uniform scale.  Teachers can see at
 *      a glance which days their class actually engages, which helps
 *      decide when to release new assignments.
 *   2. Hardest Words — the words with the highest mistake rate across
 *      the class, with Hebrew/Arabic translations and a mistake
 *      count.  Directly actionable: "we'll re-teach these on Monday".
 *
 * Both derive entirely from the progress rows the teacher already has
 * in state (no new fetch), so dropping this into AnalyticsView is
 * zero additional network cost.
 */
export function ClassPatternsSection({ scores, classCode, weeks = 8 }: ClassPatternsSectionProps) {
  const filtered = useMemo(
    () => (classCode ? scores.filter(s => s.classCode === classCode) : scores),
    [scores, classCode],
  );

  // ─── Heatmap data ────────────────────────────────────────────────────
  // Build a weeks × 7 matrix of play counts.  weekIndex 0 == most
  // recent week; dayIndex 0 == Sunday.  We bucket by completed_at and
  // ignore rows outside the window.
  const heatmap = useMemo(() => {
    const now = new Date();
    // Start of the most recent Sunday (start of the current week in IL).
    const thisWeekSunday = new Date(now);
    thisWeekSunday.setHours(0, 0, 0, 0);
    thisWeekSunday.setDate(thisWeekSunday.getDate() - thisWeekSunday.getDay());

    const grid: number[][] = Array.from({ length: weeks }, () => Array(7).fill(0));
    let max = 0;
    for (const s of filtered) {
      if (!s.completedAt) continue;
      const d = new Date(s.completedAt);
      if (Number.isNaN(d.getTime())) continue;
      const diffDays = Math.floor((thisWeekSunday.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      const weeksBack = Math.floor(diffDays / 7) + (diffDays % 7 < 0 ? 0 : 0);
      // Rows completed AFTER the current week's Sunday midnight have
      // diffDays < 0 — those belong to weekIndex 0.
      const weekIndex = diffDays < 0 ? 0 : weeksBack;
      if (weekIndex < 0 || weekIndex >= weeks) continue;
      const dayIndex = d.getDay();
      grid[weekIndex][dayIndex] += 1;
      if (grid[weekIndex][dayIndex] > max) max = grid[weekIndex][dayIndex];
    }
    return { grid, max };
  }, [filtered, weeks]);

  const cellColor = (count: number, max: number): string => {
    if (count === 0) return 'bg-slate-100';
    if (max === 0) return 'bg-slate-100';
    const intensity = count / max;
    if (intensity > 0.75) return 'bg-indigo-600';
    if (intensity > 0.5) return 'bg-indigo-500';
    if (intensity > 0.25) return 'bg-indigo-400';
    if (intensity > 0.1) return 'bg-indigo-300';
    return 'bg-indigo-200';
  };

  // Busiest day-of-week label for the summary line.
  const busiestDayLabel = useMemo(() => {
    const dayTotals = Array(7).fill(0);
    for (const row of heatmap.grid) row.forEach((v, i) => { dayTotals[i] += v; });
    const maxIdx = dayTotals.indexOf(Math.max(...dayTotals));
    if (dayTotals[maxIdx] === 0) return null;
    return DAY_LABELS[maxIdx];
  }, [heatmap]);

  // ─── Hardest words ───────────────────────────────────────────────────
  // Aggregate mistake counts per word_id across all completions, keep
  // the top 10, and join to ALL_WORDS for display.
  const hardestWords = useMemo(() => {
    const mistakeCount = new Map<number, number>();
    for (const s of filtered) {
      if (!s.mistakes || !Array.isArray(s.mistakes)) continue;
      for (const wordId of s.mistakes) {
        if (typeof wordId !== 'number') continue;
        mistakeCount.set(wordId, (mistakeCount.get(wordId) ?? 0) + 1);
      }
    }
    const ranked = Array.from(mistakeCount.entries())
      .map(([wordId, count]) => {
        const word = ALL_WORDS.find(w => w.id === wordId);
        return word ? { word, count } : null;
      })
      .filter((entry): entry is { word: typeof ALL_WORDS[number]; count: number } => entry !== null)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    return ranked;
  }, [filtered]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* ─── Heatmap card ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-5 sm:p-6 shadow-lg border border-stone-100"
      >
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={20} className="text-indigo-500" />
          <h3 className="text-lg font-black text-stone-900">Activity Pattern</h3>
        </div>
        <p className="text-sm text-stone-500 mb-4">
          When your class actually plays, over the last {weeks} weeks.
          {busiestDayLabel && <> Busiest day: <strong>{busiestDayLabel}</strong>.</>}
        </p>

        {heatmap.max === 0 ? (
          <div className="py-6 text-center text-sm text-stone-400 font-medium">
            No plays recorded yet in this window.
          </div>
        ) : (
          <>
            {/* Column headers — day labels */}
            <div className="flex gap-1 mb-2 pl-10">
              {DAY_LABELS.map(label => (
                <div key={label} className="flex-1 text-center text-[10px] font-black uppercase text-stone-400 tracking-widest">
                  {label[0]}
                </div>
              ))}
            </div>
            {/* Rows — oldest week first, so visual reading left→right = calendar order */}
            {[...heatmap.grid].reverse().map((row, rIdx) => {
              const weekOffset = heatmap.grid.length - 1 - rIdx;
              const label = weekOffset === 0
                ? 'this wk'
                : weekOffset === 1
                ? 'last wk'
                : `${weekOffset}w ago`;
              return (
                <div key={rIdx} className="flex gap-1 mb-1 items-center">
                  <div className="w-10 text-right text-[10px] font-bold uppercase text-stone-400 mr-1 tabular-nums">
                    {label}
                  </div>
                  {row.map((count, dIdx) => (
                    <div
                      key={dIdx}
                      title={`${count} play${count === 1 ? '' : 's'}`}
                      className={`flex-1 h-6 rounded-md ${cellColor(count, heatmap.max)} flex items-center justify-center text-[10px] font-black ${count > 0 && count / heatmap.max > 0.5 ? 'text-white' : 'text-stone-700'}`}
                    >
                      {count > 0 ? count : ''}
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        )}
      </motion.div>

      {/* ─── Hardest-words card ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-3xl p-5 sm:p-6 shadow-lg border border-stone-100"
      >
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={20} className="text-rose-500" />
          <h3 className="text-lg font-black text-stone-900">Hardest Words</h3>
        </div>
        <p className="text-sm text-stone-500 mb-4">
          Words your class has missed the most.  Re-teach these first.
        </p>

        {hardestWords.length === 0 ? (
          <div className="py-6 text-center text-sm text-stone-400 font-medium">
            No mistakes recorded yet — nice work.
          </div>
        ) : (
          <div className="space-y-2">
            {hardestWords.map(({ word, count }, idx) => (
              <div
                key={word.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-rose-50/60 border border-rose-100"
              >
                <div className="w-6 h-6 rounded-full bg-rose-500 text-white text-xs font-black flex items-center justify-center shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-stone-900 truncate">{word.english}</p>
                  <p className="text-xs text-stone-500 truncate" dir="auto">
                    {word.hebrew}
                    {word.arabic && <span className="mx-1.5 text-stone-300">·</span>}
                    {word.arabic}
                  </p>
                </div>
                <div className="text-sm font-black text-rose-600 shrink-0">
                  {count}×
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
