// Step 2 of the Vocabagrut teacher flow: review the generated test, light
// edits, export PDF, save draft, optionally publish to a class.

import { useMemo, useState } from 'react';
import { ArrowLeft, Copy, Download, Save, Upload, Loader2, FileText, Eye, Share2, Minus, Plus, Trash2 } from 'lucide-react';
import type { AppUser, ClassData } from '../../../core/supabase';
import type { BagrutTest, BagrutQuestion, BagrutQuestionType, BagrutSectionKind } from '../types';
import { MODULE_SPECS, type ModuleSpec } from '../lib/moduleMap';
import BagrutPreviewModal from './BagrutPreviewModal';
import { saveBagrutDraft, updateBagrutTest } from '../hooks/useBagrutTests';
import { ALL_WORDS } from '../../../data/vocabulary';
import { ShareWorksheetDialog, type ShareSource } from '../../../components/ShareWorksheetDialog';
import { useLanguage } from '../../../hooks/useLanguage';
import { vocabagrutT } from '../../../locales/teacher/vocabagrut';

// Which question type the app suggests when the teacher adds one — driven
// by the SECTION's context (reading sections lean MCQ, vocab sections lean
// short-answer, writing sections lean a writing task). The teacher can pick
// any type; this just orders + flags the recommended one.
const SUGGESTED_BY_KIND: Record<BagrutSectionKind, BagrutQuestionType> = {
  reading: 'mc',
  vocab_in_context: 'short',
  writing: 'writing',
};

/** All types, suggested one first, for the section's add-question bar. */
function orderedTypes(kind: BagrutSectionKind): BagrutQuestionType[] {
  const suggested = SUGGESTED_BY_KIND[kind] ?? 'mc';
  return [suggested, ...(['mc', 'short', 'writing'] as BagrutQuestionType[]).filter(t => t !== suggested)];
}

function newQuestionId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** A blank, editable question of the requested type with sensible default
 *  points (the teacher tunes them with the ± stepper). */
function buildBlankQuestion(type: BagrutQuestionType, spec: ModuleSpec): BagrutQuestion {
  const id = newQuestionId();
  if (type === 'mc') {
    return {
      id, type: 'mc', prompt: '', points: 5,
      options: (['A', 'B', 'C', 'D'] as const).map(letter => ({ letter, text: '' })),
      correct_answer: 'A',
    };
  }
  if (type === 'writing') {
    return {
      id, type: 'writing', prompt: '', points: 15, bullets: [],
      word_count_min: spec.writingWords.min, word_count_max: spec.writingWords.max,
    };
  }
  return { id, type: 'short', prompt: '', points: 5 };
}

interface Props {
  user: AppUser;
  classes: ClassData[];
  test: BagrutTest;
  sourceWords: string[];
  // If we loaded an existing draft, this is its row id (so save updates instead of inserting).
  existingId: string | null;
  onBack: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function BagrutEditorView({ user, classes, test, sourceWords, existingId, onBack, showToast }: Props) {
  const { language, dir } = useLanguage();
  const t = vocabagrutT[language];
  const [draft, setDraft] = useState<BagrutTest>(test);
  const [savedId, setSavedId] = useState<string | null>(existingId);
  const [classId, setClassId] = useState<string | null>(null);
  const [withAnswerKey, setWithAnswerKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareSource, setShareSource] = useState<ShareSource | null>(null);
  // Preview / export both use the print-ready modal. autoPrint=true is the
  // "Export PDF" path (opens straight into the Save-as-PDF dialog).
  const [preview, setPreview] = useState<{ open: boolean; autoPrint: boolean }>({ open: false, autoPrint: false });

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

  // Source words that the interactive solver can't render (no audio /
  // translations because they're not in ALL_WORDS).  Surfaced inline so
  // the teacher can see exactly which words got dropped — the share
  // button's tooltip only shows a count, and hover tooltips don't fire
  // on mobile, leaving teachers blind to what was skipped.
  const droppedWords = useMemo(() => {
    const known = new Set(ALL_WORDS.map(w => w.english.toLowerCase()));
    return sourceWords.filter(s => !known.has(s.toLowerCase()));
  }, [sourceWords]);

  async function handleCopyDrillText() {
    if (sourceWords.length === 0) return;
    const title = draft.title || t.bagrutPracticeFallback;
    const lines = sourceWords.map((w, i) => `${i + 1}. ${w}`);
    const text = `${title}\n\n${lines.join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast(t.copyDrillToastSuccess, 'success');
    } catch {
      showToast(t.copyDrillToastFailed, 'error');
    }
  }

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

  // Teacher adjusts a question's points (±1, floored at 0). The section
  // subtotal and the paper total are derived from the questions so the
  // header, the section chips, and the exported/printed paper all stay in
  // sync with the edit instead of showing a stale AI-assigned figure.
  function bumpQuestionPoints(secIdx: number, qIdx: number, delta: number) {
    setDraft(d => {
      const sections = d.sections.map((s, i) => {
        if (i !== secIdx) return s;
        const questions = s.questions.map((q, j) =>
          j === qIdx ? { ...q, points: Math.max(0, q.points + delta) } : q,
        );
        const total_points = questions.reduce((sum, q) => sum + q.points, 0);
        return { ...s, questions, total_points };
      });
      const total_points = sections.reduce((sum, s) => sum + s.total_points, 0);
      return { ...d, sections, total_points };
    });
  }

  // Add / remove questions. Section + paper totals are kept derived from the
  // questions so the header, chips, and printed paper stay correct.
  function addQuestion(secIdx: number, type: BagrutQuestionType) {
    setDraft(d => {
      const sections = d.sections.map((s, i) => {
        if (i !== secIdx) return s;
        const questions = [...s.questions, buildBlankQuestion(type, spec)];
        return { ...s, questions, total_points: questions.reduce((sum, q) => sum + q.points, 0) };
      });
      return { ...d, sections, total_points: sections.reduce((sum, s) => sum + s.total_points, 0) };
    });
  }

  function removeQuestion(secIdx: number, qIdx: number) {
    setDraft(d => {
      const sections = d.sections.map((s, i) => {
        if (i !== secIdx) return s;
        const questions = s.questions.filter((_, j) => j !== qIdx);
        return { ...s, questions, total_points: questions.reduce((sum, q) => sum + q.points, 0) };
      });
      return { ...d, sections, total_points: sections.reduce((sum, s) => sum + s.total_points, 0) };
    });
  }


  async function handleSaveDraft() {
    setSaving(true);
    try {
      if (savedId) {
        const r = await updateBagrutTest(savedId, { title: draft.title, content: draft, class_id: classId });
        if (r.error) showToast(r.error, 'error');
        else showToast(t.toastDraftSaved, 'success');
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
        else { setSavedId(r.id); showToast(t.toastDraftSaved, 'success'); }
      }
    } finally { setSaving(false); }
  }

  async function handlePublish() {
    if (!classId) {
      showToast(t.toastPickClassFirst, 'error');
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
      else showToast(t.toastPublished, 'success');
    } finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen" dir={dir} style={{ backgroundColor: 'var(--vb-bg)' }}>
      {/* Sticky action bar */}
      <div className="sticky top-0 z-20 backdrop-blur" style={{ backgroundColor: 'rgba(255,255,255,0.85)', borderBottom: '1px solid var(--vb-border)' }}>
        {/* flex-wrap on both rows so the 5 action buttons reflow onto a
            second/third line on narrow phones instead of overflowing the
            viewport — previously "Copy as text" and "Export PDF" were
            pushed off the right edge and became untappable on mobile. */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-y-2 gap-x-3">
          <button onClick={onBack} type="button" className="inline-flex items-center gap-1.5 text-sm font-medium shrink-0" style={{ color: 'var(--vb-text-secondary)' }}>
            <ArrowLeft size={16} /> {t.newTest}
          </button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPreview({ open: true, autoPrint: false })}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border"
              style={{ borderColor: 'var(--vb-border)', color: 'var(--vb-text-primary)' }}
            >
              <Eye size={16} /> {t.preview}
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border"
              style={{ borderColor: 'var(--vb-border)', color: 'var(--vb-text-primary)' }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {t.saveDraft}
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
                  topicName: draft.title || t.bagrutPracticeFallback,
                  wordIds: shareableWordIds,
                })
              }
              disabled={shareableWordIds.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              title={
                shareableWordIds.length === 0
                  ? t.shareDisabledTitle
                  : shareableWordIds.length < sourceWords.length
                    ? t.shareSkipTitle(sourceWords.length - shareableWordIds.length)
                    : undefined
              }
            >
              <Share2 size={16} />
              {t.shareOnline}
              {shareableWordIds.length > 0 && shareableWordIds.length < sourceWords.length && (
                <span className="text-xs font-medium opacity-90">
                  ({shareableWordIds.length}/{sourceWords.length})
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleCopyDrillText}
              disabled={sourceWords.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderColor: 'var(--vb-border)', color: 'var(--vb-text-primary)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              title={t.copyDrillTitle}
            >
              <Copy size={16} /> {t.copyDrillText}
            </button>
            <button
              type="button"
              onClick={() => setPreview({ open: true, autoPrint: true })}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-violet-500 shadow"
            >
              <Download size={16} /> {t.exportPdf}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {droppedWords.length > 0 && (
          <div className="rounded-xl p-3 border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-sm">
            <div className="font-semibold text-amber-800 dark:text-amber-300 mb-1">
              {t.droppedWordsBanner(droppedWords.length)}
            </div>
            <div className="text-amber-700 dark:text-amber-200 italic break-words">
              {droppedWords.slice(0, 20).join(', ')}
              {droppedWords.length > 20 && t.droppedWordsMore(droppedWords.length - 20)}
            </div>
          </div>
        )}
        {/* Header */}
        <div className="rounded-xl p-5 border" style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--vb-text-muted)' }}>
            {t.testHeader(spec.label, String(spec.pointTrack), spec.cefr)}
          </div>
          <input
            value={draft.title}
            onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            className="w-full text-xl font-bold bg-transparent border-b border-transparent focus:border-violet-400 focus:outline-none"
            style={{ color: 'var(--vb-text-primary)' }}
          />
          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm" style={{ color: 'var(--vb-text-secondary)' }}>
            <span>{t.timeMin(draft.time_minutes)}</span>
            <span>·</span>
            <span>{t.pointsSuffix(draft.total_points)}</span>
            <span>·</span>
            <span>{t.targetWords(sourceWords.length)}</span>
          </div>
        </div>

        {/* Publish controls */}
        <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--vb-text-muted)' }}>
                {t.publishToClassLabel}
              </label>
              <select
                value={classId ?? ''}
                onChange={e => setClassId(e.target.value || null)}
                className="w-full mt-1 p-2 rounded-lg border text-sm"
                style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)', color: 'var(--vb-text-primary)' }}
              >
                <option value="">{t.noneKeepDraft}</option>
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
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {t.publishToClass}
            </button>
          </div>
        </div>

        {/* Sections */}
        {draft.sections.map((section, secIdx) => (
          <div key={secIdx} className="rounded-xl p-5 border" style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--vb-text-primary)' }}>
                {section.title}
              </h3>
              <span className="text-xs px-2 py-1 rounded-md" style={{ backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-secondary)' }}>
                {t.pointsShort(section.total_points)}
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
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-muted)' }}>
                      {q.type.toUpperCase()}
                    </span>
                    {/* Points stepper — teacher can raise or lower the
                        weight of any question; section + total update live. */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => bumpQuestionPoints(secIdx, qIdx, -1)}
                        disabled={q.points <= 0}
                        aria-label={t.decreasePointsAria}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md border disabled:opacity-40"
                        style={{ borderColor: 'var(--vb-border)', color: 'var(--vb-text-primary)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-xs font-bold tabular-nums text-center" style={{ minWidth: '3.5rem', color: 'var(--vb-text-primary)' }}>
                        {t.pointsShort(q.points)}
                      </span>
                      <button
                        type="button"
                        onClick={() => bumpQuestionPoints(secIdx, qIdx, 1)}
                        aria-label={t.increasePointsAria}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md border"
                        style={{ borderColor: 'var(--vb-border)', color: 'var(--vb-text-primary)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeQuestion(secIdx, qIdx)}
                        aria-label={t.removeQuestionAria}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md border ms-1 text-rose-600 hover:bg-rose-50"
                        style={{ borderColor: 'var(--vb-border)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
                          {/* Tap the letter to mark it the correct answer. */}
                          <button
                            type="button"
                            onClick={() => patchQuestion(secIdx, qIdx, { correct_answer: opt.letter })}
                            title={t.qTypeMc}
                            className="font-mono text-xs w-7 shrink-0 rounded"
                            style={{ color: q.correct_answer === opt.letter ? 'var(--vb-accent)' : 'var(--vb-text-muted)', touchAction: 'manipulation' }}
                          >
                            ({opt.letter}){q.correct_answer === opt.letter ? '✓' : ''}
                          </button>
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

              {/* Add a question — type suggested from the section's context
                  (reading → MCQ, vocab → short answer, writing → writing task). */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--vb-text-muted)' }}>
                  {t.addQuestion}
                </span>
                {orderedTypes(section.kind).map((type, ti) => {
                  const label = type === 'mc' ? t.qTypeMc : type === 'short' ? t.qTypeShort : t.qTypeWriting;
                  const suggested = ti === 0;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addQuestion(secIdx, type)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border"
                      style={{ borderColor: suggested ? 'var(--vb-accent)' : 'var(--vb-border)', color: 'var(--vb-text-primary)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                    >
                      <Plus size={13} /> {label}
                      {suggested && (
                        <span className="ms-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: 'var(--vb-accent)' }}>
                          {t.suggestedTag}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}

        {/* Answer key toggle */}
        <div className="rounded-xl p-4 border flex items-center gap-3" style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}>
          <input
            id="answerKey"
            type="checkbox"
            checked={withAnswerKey}
            onChange={e => setWithAnswerKey(e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="answerKey" className="text-sm flex items-center gap-2 cursor-pointer" style={{ color: 'var(--vb-text-primary)' }}>
            <FileText size={16} /> {t.includeAnswerKey}
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

      {preview.open && (
        <BagrutPreviewModal
          test={draft}
          withAnswerKey={withAnswerKey}
          autoPrint={preview.autoPrint}
          onClose={() => setPreview({ open: false, autoPrint: false })}
        />
      )}
    </div>
  );
}
