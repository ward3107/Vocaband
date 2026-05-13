// Step 2 of the Vocabagrut teacher flow: review the generated test, light
// edits, export PDF, save draft, optionally publish to a class.

import { useMemo, useState } from 'react';
import { ArrowLeft, Download, Save, Upload, Loader2, FileText, Eye, Share2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { AppUser, ClassData } from '../../../core/supabase';
import type { BagrutTest } from '../types';
import { MODULE_SPECS } from '../lib/moduleMap';
import { exportBagrutPdf } from '../lib/bagrutPdf';
import { saveBagrutDraft, updateBagrutTest } from '../hooks/useBagrutTests';
import { ALL_WORDS } from '../../../data/vocabulary';
import { ShareWorksheetDialog, type ShareSource } from '../../../components/ShareWorksheetDialog';

interface Props {
  user: AppUser;
  classes: ClassData[];
  test: BagrutTest;
  sourceWords: string[];
  // If we loaded an existing draft, this is its row id (so save updates instead of inserting).
  existingId: string | null;
  onBack: () => void;
  onPreview: (test: BagrutTest) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function BagrutEditorView({ user, classes, test, sourceWords, existingId, onBack, onPreview, showToast }: Props) {
  const [draft, setDraft] = useState<BagrutTest>(test);
  const [savedId, setSavedId] = useState<string | null>(existingId);
  const [classId, setClassId] = useState<string | null>(null);
  const [withAnswerKey, setWithAnswerKey] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareSource, setShareSource] = useState<ShareSource | null>(null);

  const teacherClasses = classes.filter(c => c.teacherUid === user.uid);
  const spec = MODULE_SPECS[draft.module];

  // Bagrut test rows store sourceWords as English strings (custom lists
  // are common — e.g. a teacher pastes 25 unit words).  ShareWorksheetDialog
  // needs numeric ALL_WORDS ids, so we resolve here.  Words not in
  // ALL_WORDS are silently dropped — the interactive solver can't render
  // pronunciation / translations for them anyway.  Memoised so re-renders
  // on draft edits don't re-walk ALL_WORDS.
  const shareableWordIds = useMemo(() => {
    const lowered = new Set(sourceWords.map(s => s.toLowerCase()));
    return ALL_WORDS.filter(w => lowered.has(w.english.toLowerCase())).map(w => w.id);
  }, [sourceWords]);

  function patchSection(idx: number, patch: Partial<BagrutTest['sections'][number]>) {
    setDraft(d => ({
      ...d,
      sections: d.sections.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  }

  function patchQuestion(secIdx: number, qIdx: number, patch: Partial<BagrutTest['sections'][number]['questions'][number]>) {
    setDraft(d => ({
      ...d,
      sections: d.sections.map((s, i) => {
        if (i !== secIdx) return s;
        return { ...s, questions: s.questions.map((q, j) => (j === qIdx ? { ...q, ...patch } : q)) };
      }),
    }));
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportBagrutPdf(draft, { withAnswerKey });
      showToast('PDF exported', 'success');
    } catch (err: any) {
      showToast(err?.message || 'PDF export failed', 'error');
    } finally {
      setExporting(false);
    }
  }

  async function handleSaveDraft() {
    setSaving(true);
    try {
      if (savedId) {
        const r = await updateBagrutTest(savedId, { title: draft.title, content: draft, class_id: classId });
        if (r.error) showToast(r.error, 'error');
        else showToast('Draft saved', 'success');
      } else {
        const r = await saveBagrutDraft({
          teacherUid: user.uid,
          classId,
          title: draft.title,
          module: draft.module,
          sourceWords,
          content: draft,
        });
        if ('error' in r) showToast(r.error, 'error');
        else { setSavedId(r.id); showToast('Draft saved', 'success'); }
      }
    } finally { setSaving(false); }
  }

  async function handlePublish() {
    if (!classId) {
      showToast('Pick a class to publish to first', 'error');
      return;
    }
    setSaving(true);
    try {
      let id = savedId;
      if (!id) {
        const r = await saveBagrutDraft({
          teacherUid: user.uid,
          classId,
          title: draft.title,
          module: draft.module,
          sourceWords,
          content: draft,
        });
        if ('error' in r) { showToast(r.error, 'error'); return; }
        id = r.id;
        setSavedId(id);
      }
      const r = await updateBagrutTest(id, { class_id: classId, published: true, content: draft, title: draft.title });
      if (r.error) showToast(r.error, 'error');
      else showToast('Published — students can now see it', 'success');
    } finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vb-bg)' }}>
      {/* Sticky action bar */}
      <div className="sticky top-0 z-20 backdrop-blur" style={{ backgroundColor: 'rgba(255,255,255,0.85)', borderBottom: '1px solid var(--vb-border)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button onClick={onBack} type="button" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--vb-text-secondary)' }}>
            <ArrowLeft size={16} /> New test
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPreview(draft)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border"
              style={{ borderColor: 'var(--vb-border)', color: 'var(--vb-text-primary)' }}
            >
              <Eye size={16} /> Preview
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border"
              style={{ borderColor: 'var(--vb-border)', color: 'var(--vb-text-primary)' }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save draft
            </button>
            {/* Share online — mints an interactive practice worksheet
                from the test's vocabulary so students can drill the
                target words before the formal exam.  Disabled when none
                of the source words are recognised (e.g. a fully custom
                list); we don't have audio/translations for unknown
                strings so the solver would be useless.  When some but
                not all words resolve, the button caption surfaces the
                ratio so the teacher knows we're shipping a subset and
                can decide whether to swap out custom words first. */}
            <button
              type="button"
              onClick={() =>
                setShareSource({
                  topicName: draft.title || 'Bagrut practice',
                  wordIds: shareableWordIds,
                })
              }
              disabled={shareableWordIds.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              title={
                shareableWordIds.length === 0
                  ? "These custom words aren't in our vocabulary, so an interactive worksheet isn't available."
                  : shareableWordIds.length < sourceWords.length
                    ? `${sourceWords.length - shareableWordIds.length} custom word(s) aren't in our vocabulary and will be skipped in the online version.`
                    : undefined
              }
            >
              <Share2 size={16} />
              Share online
              {shareableWordIds.length > 0 && shareableWordIds.length < sourceWords.length && (
                <span className="text-xs font-medium opacity-90">
                  ({shareableWordIds.length}/{sourceWords.length})
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-violet-500 shadow"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Export PDF
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="rounded-2xl p-5 border" style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--vb-text-muted)' }}>
            {spec.label} · {spec.pointTrack}-point program · CEFR {spec.cefr}
          </div>
          <input
            value={draft.title}
            onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            className="w-full text-xl font-bold bg-transparent border-b border-transparent focus:border-violet-400 focus:outline-none"
            style={{ color: 'var(--vb-text-primary)' }}
          />
          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm" style={{ color: 'var(--vb-text-secondary)' }}>
            <span>Time {draft.time_minutes} min</span>
            <span>·</span>
            <span>{draft.total_points} points</span>
            <span>·</span>
            <span>{sourceWords.length} target words</span>
          </div>
        </div>

        {/* Publish controls */}
        <div className="rounded-2xl p-4 border" style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--vb-text-muted)' }}>
                Publish to class (optional)
              </label>
              <select
                value={classId ?? ''}
                onChange={e => setClassId(e.target.value || null)}
                className="w-full mt-1 p-2 rounded-lg border text-sm"
                style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)', color: 'var(--vb-text-primary)' }}
              >
                <option value="">None — keep as draft</option>
                {teacherClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handlePublish}
              disabled={saving || !classId}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Publish to class
            </button>
          </div>
        </div>

        {/* Sections */}
        {draft.sections.map((section, secIdx) => (
          <div key={secIdx} className="rounded-2xl p-5 border" style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--vb-text-primary)' }}>
                {section.title}
              </h3>
              <span className="text-xs px-2 py-1 rounded-md" style={{ backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-secondary)' }}>
                {section.total_points} pts
              </span>
            </div>
            {section.passage !== undefined && (
              <textarea
                value={section.passage}
                onChange={e => patchSection(secIdx, { passage: e.target.value })}
                className="w-full min-h-[160px] p-3 rounded-lg border text-sm font-serif leading-relaxed"
                style={{ backgroundColor: 'var(--vb-bg)', borderColor: 'var(--vb-border)', color: 'var(--vb-text-primary)' }}
              />
            )}
            <div className="space-y-3 mt-4">
              {section.questions.map((q, qIdx) => (
                <div key={q.id} className="rounded-lg p-3 border" style={{ borderColor: 'var(--vb-border)' }}>
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold mt-0.5 px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-muted)' }}>
                      {q.type.toUpperCase()} · {q.points} pts
                    </span>
                  </div>
                  <textarea
                    value={q.prompt}
                    onChange={e => patchQuestion(secIdx, qIdx, { prompt: e.target.value })}
                    className="w-full mt-2 p-2 rounded border text-sm"
                    style={{ backgroundColor: 'var(--vb-bg)', borderColor: 'var(--vb-border)', color: 'var(--vb-text-primary)' }}
                    rows={2}
                  />
                  {q.type === 'mc' && q.options && (
                    <div className="mt-2 space-y-1.5">
                      {q.options.map((opt, optIdx) => (
                        <div key={opt.letter} className="flex items-center gap-2">
                          <span className="font-mono text-xs w-6" style={{ color: q.correct_answer === opt.letter ? 'var(--vb-accent)' : 'var(--vb-text-muted)' }}>
                            ({opt.letter}){q.correct_answer === opt.letter ? '✓' : ''}
                          </span>
                          <input
                            value={opt.text}
                            onChange={e => {
                              const newOptions = q.options!.map((o, i) => (i === optIdx ? { ...o, text: e.target.value } : o));
                              patchQuestion(secIdx, qIdx, { options: newOptions });
                            }}
                            className="flex-1 p-1.5 rounded border text-sm"
                            style={{ backgroundColor: 'var(--vb-bg)', borderColor: 'var(--vb-border)', color: 'var(--vb-text-primary)' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type === 'writing' && q.bullets && (
                    <ul className="mt-2 text-xs list-disc pl-5" style={{ color: 'var(--vb-text-secondary)' }}>
                      {q.bullets.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Answer key toggle */}
        <div className="rounded-2xl p-4 border flex items-center gap-3" style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}>
          <input
            id="answerKey"
            type="checkbox"
            checked={withAnswerKey}
            onChange={e => setWithAnswerKey(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="answerKey" className="text-sm flex items-center gap-2 cursor-pointer" style={{ color: 'var(--vb-text-primary)' }}>
            <FileText size={16} /> Include teacher's answer key page when exporting PDF
          </label>
        </div>
      </div>

      {shareSource && (
        <ShareWorksheetDialog
          source={shareSource}
          defaultLang="he"
          onClose={() => setShareSource(null)}
        />
      )}
    </div>
  );
}
