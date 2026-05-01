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

export interface SavedTasksSectionProps {
  tasks: SavedTask[];
  onUse: (task: SavedTask) => void;
  onTogglePin: (id: string) => void;
  onRemove: (id: string) => void;
  /** Kept for source-compat with the previous theme system; the
   *  component now reads colours from CSS custom properties (var(--vb-*))
   *  set by useTeacherTheme(). */
  isDark?: boolean;
}

function relativeTime(ts: number | null): string {
  if (!ts) return 'never used';
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export default function SavedTasksSection({
  tasks,
  onUse,
  onTogglePin,
  onRemove,
}: SavedTasksSectionProps) {
  if (tasks.length === 0) return null;

  return (
    <section className="mt-8 sm:mt-10">
      <div className="flex items-center gap-2 mb-2">
        <Bookmark size={20} style={{ color: 'var(--vb-accent)' }} />
        <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--vb-text-primary)' }}>
          Saved templates
        </h2>
        <span
          className="ml-1 inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-sm font-bold"
          style={{ backgroundColor: 'var(--vb-accent-soft)', color: 'var(--vb-accent)' }}
        >
          {tasks.length}
        </span>
      </div>

      <p className="text-sm mb-4" style={{ color: 'var(--vb-text-secondary)' }}>
        Re-use a task in one tap. Pinned + most-used appear first.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tasks.map(task => (
          <div
            key={task.id}
            className="relative border-2 rounded-2xl p-4 hover:shadow-md transition-all"
            style={{
              backgroundColor: 'var(--vb-surface)',
              borderColor: 'var(--vb-border)',
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {task.pinned && <Pin size={14} className="text-amber-500 fill-amber-500 shrink-0" />}
                  <h3 className="font-bold truncate" style={{ color: 'var(--vb-text-primary)' }}>
                    {task.title || 'Untitled template'}
                  </h3>
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--vb-text-muted)' }}>
                  {task.mode === 'quick-play' ? '🎮 Quick Play' : '📝 Assignment'}
                  {' · '}
                  {task.wordIds.length} word{task.wordIds.length === 1 ? '' : 's'}
                  {' · '}
                  {task.modes.length} mode{task.modes.length === 1 ? '' : 's'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onTogglePin(task.id)}
                className="p-1.5 rounded-lg hover:opacity-80 transition-colors"
                style={{
                  backgroundColor: task.pinned ? 'var(--vb-accent-soft)' : 'transparent',
                  color: task.pinned ? '#f59e0b' : 'var(--vb-text-muted)',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                }}
                aria-label={task.pinned ? 'Unpin' : 'Pin'}
              >
                <Pin size={16} className={task.pinned ? 'fill-amber-500 text-amber-500' : ''} />
              </button>
            </div>

            <div className="text-xs mb-3" style={{ color: 'var(--vb-text-muted)' }}>
              Used {task.timesUsed}× · last {relativeTime(task.lastUsedAt)}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onUse(task)}
                className="flex-1 py-2 px-3 text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                style={{
                  backgroundColor: 'var(--vb-accent)',
                  color: 'var(--vb-accent-text)',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <Repeat size={14} /> Use
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete "${task.title || 'this template'}"?`)) onRemove(task.id);
                }}
                className="p-2 rounded-xl hover:bg-rose-100 hover:text-rose-600 transition-colors"
                style={{
                  backgroundColor: 'var(--vb-surface-alt)',
                  color: 'var(--vb-text-muted)',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                }}
                aria-label="Delete"
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
