/**
 * SavedTasksSection — teacher dashboard widget that lists saved task
 * templates with a count badge, ordered pinned-first → most-used →
 * most-recent (the order is computed inside `useSavedTasks`).
 *
 * Tapping "Use" calls `onUse(task)` which the parent translates into
 * "open SetupWizard pre-filled with this template's words/modes".
 */

import { Pin, Trash2, Bookmark, Repeat } from 'lucide-react';
import type { SavedTask } from '../../hooks/useSavedTasks';
import { useLanguage } from '../../hooks/useLanguage';
import { teacherDrilldownsT, type TeacherDrilldownsT } from '../../locales/teacher/drilldowns';

export interface SavedTasksSectionProps {
  tasks: SavedTask[];
  onUse: (task: SavedTask) => void;
  onTogglePin: (id: string) => void;
  onRemove: (id: string) => void;
  /** Section heading + sub-text use lighter colours when the
   *  Midnight theme is active, otherwise they vanish on slate-900. */
  isDark?: boolean;
}

function relativeTime(ts: number | null, t: TeacherDrilldownsT): string {
  if (!ts) return t.neverUsed;
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return t.today;
  if (days === 1) return t.yesterday;
  if (days < 7) return t.daysAgo(days);
  if (days < 30) return t.weeksAgo(Math.floor(days / 7));
  return t.monthsAgo(Math.floor(days / 30));
}

export default function SavedTasksSection({
  tasks,
  onUse,
  onTogglePin,
  onRemove,
  isDark = false,
}: SavedTasksSectionProps) {
  const { language } = useLanguage();
  const t = teacherDrilldownsT[language];
  if (tasks.length === 0) return null;

  return (
    <section className="mt-8 sm:mt-10">
      <div className="flex items-center gap-2 mb-2">
        <Bookmark size={20} className={isDark ? 'text-indigo-300' : 'text-indigo-600'} />
        <h2 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-stone-50' : 'text-stone-900'}`}>{t.savedTemplatesHeading}</h2>
        <span className="ml-1 inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold">
          {tasks.length}
        </span>
      </div>

      <p className={`text-sm mb-4 ${isDark ? 'text-stone-300' : 'text-stone-500'}`}>
        {t.savedTemplatesBlurb}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tasks.map(task => (
          <div
            key={task.id}
            className="relative bg-white border-2 border-stone-200 rounded-2xl p-4 hover:border-indigo-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {task.pinned && <Pin size={14} className="text-amber-500 fill-amber-500 shrink-0" />}
                  <h3 className="font-bold text-stone-900 truncate">{task.title || t.untitledTemplate}</h3>
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  {task.mode === 'quick-play' ? t.qpBadge : t.assignmentBadge}
                  {' · '}
                  {t.wordModeSummary(task.wordIds.length, task.modes.length)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onTogglePin(task.id)}
                className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-amber-500 transition-colors"
                aria-label={task.pinned ? t.unpinAria : t.pinAria}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                <Pin size={16} className={task.pinned ? 'fill-amber-500 text-amber-500' : ''} />
              </button>
            </div>

            <div className="text-xs text-stone-500 mb-3">
              {t.usedSummary(task.timesUsed, relativeTime(task.lastUsedAt, t))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onUse(task)}
                className="flex-1 py-2 px-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                <Repeat size={14} /> {t.useBtn}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(t.deleteConfirm(task.title || t.untitledTemplate))) onRemove(task.id);
                }}
                className="p-2 rounded-xl bg-stone-100 hover:bg-rose-100 text-stone-400 hover:text-rose-600 transition-colors"
                aria-label={t.deleteAria}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
