// Browse + reopen previously saved Vocabagrut tests.
//
// "Save draft" in the editor persists a test to bagrut_tests; until now there
// was no way back to it. This is where the teacher returns to reuse one —
// reopen it into the editor to re-export the PDF, publish it to a class, or
// tweak and re-save.

import { ArrowLeft, Loader2, Trash2, Pencil } from 'lucide-react';
import type { AppUser } from '../../../core/supabase';
import type { BagrutTestRow } from '../types';
import { useTeacherBagrutTests, deleteBagrutTest } from '../hooks/useBagrutTests';
import { MODULE_SPECS } from '../lib/moduleMap';
import { sanitizeTitle } from '../lib/sanitizeTitle';
import { useLanguage } from '../../../hooks/useLanguage';
import { vocabagrutT } from '../../../locales/teacher/vocabagrut';

interface Props {
  user: AppUser;
  onBack: () => void;
  /** Load a saved test back into the editor (re-export / publish / edit). */
  onOpen: (row: BagrutTestRow) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function BagrutSavedTestsView({ user, onBack, onOpen, showToast }: Props) {
  const { language, dir } = useLanguage();
  const t = vocabagrutT[language];
  const { rows, loading, error, refresh } = useTeacherBagrutTests(user.uid);

  async function handleDelete(row: BagrutTestRow) {
    if (typeof window !== 'undefined' && !window.confirm(t.deleteTestConfirm)) return;
    const res = await deleteBagrutTest(row.id);
    if (res.error) showToast(res.error, 'error');
    else { showToast(t.testDeleted, 'success'); void refresh(); }
  }

  // English/Russian UI keep the browser default locale; HE/AR get theirs.
  const dateLocale = language === 'he' ? 'he' : language === 'ar' ? 'ar' : undefined;
  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(dateLocale, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return iso.slice(0, 10);
    }
  }

  return (
    <div className="min-h-screen" dir={dir} style={{ backgroundColor: 'var(--vb-bg)' }}>
      <div className="sticky top-0 z-20 backdrop-blur" style={{ backgroundColor: 'rgba(255,255,255,0.85)', borderBottom: '1px solid var(--vb-border)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button onClick={onBack} type="button" className="inline-flex items-center gap-1.5 text-sm font-medium shrink-0" style={{ color: 'var(--vb-text-secondary)' }}>
            <ArrowLeft size={16} /> {t.back}
          </button>
          <h1 className="text-sm font-bold uppercase tracking-widest truncate" style={{ color: 'var(--vb-text-primary)' }}>{t.savedTests}</h1>
          <span className="w-12 shrink-0" aria-hidden />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-3">
        {loading && (
          <div className="text-sm flex items-center gap-2" style={{ color: 'var(--vb-text-secondary)' }}>
            <Loader2 size={16} className="animate-spin" /> {t.savedTestsLoading}
          </div>
        )}

        {error && (
          <div className="rounded-lg p-3 text-sm bg-rose-50 text-rose-700 border border-rose-200">{error}</div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="rounded-xl p-6 border text-center text-sm" style={{ borderColor: 'var(--vb-border)', color: 'var(--vb-text-muted)' }}>
            {t.savedTestsEmpty}
          </div>
        )}

        {rows.map(row => {
          const spec = MODULE_SPECS[row.module];
          return (
            <div
              key={row.id}
              className="rounded-xl p-4 border flex items-center justify-between gap-3"
              style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold truncate" style={{ color: 'var(--vb-text-primary)' }}>{sanitizeTitle(row.title)}</span>
                  {row.published ? (
                    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">{t.publishedBadge}</span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-muted)' }}>{t.draftBadge}</span>
                  )}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--vb-text-secondary)' }}>
                  {(spec?.label ?? `Module ${row.module}`)} · {t.targetWords((row.source_words ?? []).length)} · {formatDate(row.updated_at)}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpen(row)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-violet-500 shadow"
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                >
                  <Pencil size={15} /> {t.openTest}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(row)}
                  aria-label={t.deleteTest}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border text-rose-600 hover:bg-rose-50"
                  style={{ borderColor: 'var(--vb-border)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
