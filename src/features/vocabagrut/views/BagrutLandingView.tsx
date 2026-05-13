// Step 1 of the Vocabagrut teacher flow: pick module + words, review the
// final list, then hit Generate.  On success the shell advances to
// BagrutEditorView.
//
// Words flow into a single `pendingWords` list from any of three sources
// (paste, phone photo / gallery via OCR, or pull from an existing class
// assignment).  The teacher sees and approves the merged list before
// generation runs — they can remove individual chips or clear all.

import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, ClipboardPaste, FolderOpen, Sparkles, Loader2, X, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import type { AppUser, ClassData, AssignmentData } from '../../../core/supabase';
import { supabase } from '../../../core/supabase';
import InPageCamera from '../../../components/InPageCamera';
import { AVAILABLE_MODULES, COMING_SOON_MODULES, MODULE_SPECS } from '../lib/moduleMap';
import { useBagrutGenerator } from '../hooks/useBagrutGenerator';
import type { BagrutModule, BagrutTest } from '../types';
import { useLanguage } from '../../../hooks/useLanguage';
import { vocabagrutT } from '../../../locales/teacher/vocabagrut';

type WordSource = 'paste' | 'photo' | 'class';

interface Props {
  user: AppUser;
  classes: ClassData[];
  teacherAssignments: AssignmentData[];
  onBack: () => void;
  onGenerated: (test: BagrutTest, sourceWords: string[]) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const MODULE_GRADIENTS: Record<BagrutModule, string> = {
  A: 'from-emerald-400 via-teal-400 to-cyan-500',
  B: 'from-indigo-400 via-violet-500 to-fuchsia-500',
  C: 'from-amber-400 via-orange-500 to-rose-500',
  D: 'from-slate-400 via-slate-500 to-slate-600',
  E: 'from-slate-400 via-slate-500 to-slate-600',
};

const WORD_RE = /^[a-zA-Z\-']{1,30}$/;
const MAX_WORDS = 60;

function normaliseWord(raw: string): string | null {
  const w = raw.trim().toLowerCase();
  return WORD_RE.test(w) ? w : null;
}

function parsePasteText(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of text.split(/[,\n;\t|]+/)) {
    const w = normaliseWord(piece);
    if (w && !seen.has(w)) {
      seen.add(w);
      out.push(w);
    }
  }
  return out;
}

export default function BagrutLandingView({ user, classes, teacherAssignments, onBack, onGenerated, showToast }: Props) {
  const { language, dir } = useLanguage();
  const t = vocabagrutT[language];
  const [module, setModule] = useState<BagrutModule>('B');
  const [source, setSource] = useState<WordSource>('paste');
  const [pendingWords, setPendingWords] = useState<string[]>([]);
  const [pasteDraft, setPasteDraft] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gen = useBagrutGenerator();

  const teacherClasses = useMemo(() => classes.filter(c => c.teacherUid === user.uid), [classes, user.uid]);
  const classAssignments = useMemo(
    () => (selectedClassId ? teacherAssignments.filter(a => a.classId === selectedClassId) : []),
    [selectedClassId, teacherAssignments],
  );

  function addWords(incoming: string[]): { added: number; skippedDup: number; cappedAt: number | null } {
    let added = 0;
    let skippedDup = 0;
    setPendingWords(prev => {
      const seen = new Set(prev);
      const next = [...prev];
      for (const raw of incoming) {
        const w = normaliseWord(raw);
        if (!w) continue;
        if (seen.has(w)) { skippedDup++; continue; }
        if (next.length >= MAX_WORDS) break;
        next.push(w);
        seen.add(w);
        added++;
      }
      return next;
    });
    const cappedAt = added < incoming.length && pendingWords.length + incoming.length > MAX_WORDS ? MAX_WORDS : null;
    return { added, skippedDup, cappedAt };
  }

  function removeWord(w: string) {
    setPendingWords(prev => prev.filter(x => x !== w));
  }

  function clearAll() {
    setPendingWords([]);
  }

  // ── Paste source ─────────────────────────────────────────────────────
  const pastePreview = useMemo(() => parsePasteText(pasteDraft), [pasteDraft]);

  function commitPaste() {
    if (pastePreview.length === 0) {
      showToast('No valid words detected in the paste box', 'info');
      return;
    }
    const { added, skippedDup } = addWords(pastePreview);
    setPasteDraft('');
    if (added > 0) showToast(`Added ${added} word${added === 1 ? '' : 's'}${skippedDup ? ` (${skippedDup} duplicate${skippedDup === 1 ? '' : 's'} skipped)` : ''}`, 'success');
    else if (skippedDup > 0) showToast('Already in the list', 'info');
  }

  // ── Photo / gallery source ───────────────────────────────────────────
  async function runOcrOnFile(file: File) {
    setOcrLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('Sign in required for OCR', 'error');
        return;
      }
      // Surface what the browser is actually about to upload — useful
      // when /api/ocr returns 400 because of a missing or unsupported
      // mimetype (some Android galleries hand us a `File` with empty
      // `.type`, which multer's fileFilter rejects).
      console.log('[vocabagrut] OCR upload', {
        name: file.name,
        size: file.size,
        type: file.type || '(empty mimetype)',
      });
      const fd = new FormData();
      // If the browser handed us a typeless File (some Android image
      // pickers do this), retag as JPEG so multer's fileFilter doesn't
      // reject it on an empty mime.  The /api/ocr handler downstream
      // passes the mime to Gemini, which auto-detects from bytes, so a
      // mislabel here is harmless.
      const safe = file.type && file.type.startsWith('image/')
        ? file
        : new File([file], file.name || 'capture.jpg', { type: 'image/jpeg' });
      fd.append('file', safe);
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd,
      });
      // Sniff content-type so we surface a useful message if the
      // backend isn't reachable (HTML 404 fallback would otherwise
      // throw "Unexpected token <" from res.json()).
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        const sample = (await res.text()).slice(0, 120).replace(/\s+/g, ' ');
        console.error('[vocabagrut] OCR non-JSON response', { status: res.status, ct, sample });
        showToast(`OCR endpoint not reachable (HTTP ${res.status}). Check the backend deploy.`, 'error');
        return;
      }
      const body = await res.json();
      if (!res.ok) {
        console.error('[vocabagrut] OCR error response', { status: res.status, body });
        const msg = body.error
          ? `${body.error}${body.message ? ` — ${body.message}` : ''}`
          : `OCR failed (HTTP ${res.status})`;
        showToast(msg, 'error');
        return;
      }
      const words = (body.words || []) as string[];
      if (words.length === 0) {
        showToast('No English words detected in the image', 'info');
        return;
      }
      const { added, skippedDup } = addWords(words);
      showToast(`Image processed — ${added} added${skippedDup ? `, ${skippedDup} duplicate${skippedDup === 1 ? '' : 's'} skipped` : ''}`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'OCR error', 'error');
    } finally {
      setOcrLoading(false);
    }
  }

  // ── Class-assignment source ──────────────────────────────────────────
  const selectedAssignment = teacherAssignments.find(a => a.id === selectedAssignmentId);
  const assignmentWords = (selectedAssignment?.words ?? []).map(w => w.english.toLowerCase());

  function pullAssignmentWords() {
    if (!selectedAssignment) {
      showToast('Pick an assignment first', 'info');
      return;
    }
    if (assignmentWords.length === 0) {
      showToast('That assignment has no words', 'info');
      return;
    }
    const { added, skippedDup } = addWords(assignmentWords);
    if (added > 0) showToast(t.addedFromAssignment(added, selectedAssignment.title, skippedDup), 'success');
    else showToast(t.allDuplicates, 'info');
  }

  // ── Generate ─────────────────────────────────────────────────────────
  async function handleGenerate() {
    if (pendingWords.length === 0) {
      showToast(t.addSomeFirst, 'error');
      return;
    }
    const test = await gen.generate(module, pendingWords);
    if (test) {
      showToast(gen.cached ? t.loadedFromCache : t.generatedSuccess, 'success');
      onGenerated(test, pendingWords);
    }
  }

  return (
    <div className="min-h-screen" dir={dir} style={{ backgroundColor: 'var(--vb-bg)' }}>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 opacity-90" />
        <div className="relative px-4 sm:px-8 py-6 sm:py-10">
          <button onClick={onBack} type="button" className="text-white/90 hover:text-white inline-flex items-center gap-1.5 text-sm font-medium mb-4">
            <ArrowLeft size={18} /> {t.back}
          </button>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
              <Sparkles size={32} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-white">{t.productName}</h1>
              <p className="text-white/90 text-sm sm:text-base mt-1 max-w-xl">
                {t.heroBlurb}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* ── Module picker ── */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--vb-text-muted)' }}>
            {t.step1Heading}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {AVAILABLE_MODULES.map(m => {
              const spec = MODULE_SPECS[m];
              const active = module === m;
              return (
                <motion.button
                  key={m}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setModule(m)}
                  className={`relative rounded-2xl p-4 text-left overflow-hidden transition-all border-2 ${active ? 'border-violet-500 shadow-lg shadow-violet-500/20' : 'border-transparent'}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${MODULE_GRADIENTS[m]} opacity-90`} />
                  <div className="relative z-10 text-white">
                    <div className="text-xs font-bold uppercase tracking-widest opacity-90">{spec.label}</div>
                    <div className="text-xl font-black mt-1">{t.pointTrack(String(spec.pointTrack))}</div>
                    <div className="text-xs opacity-90 mt-1">{t.cefrGrade(spec.cefr, String(spec.gradeBand))}</div>
                  </div>
                </motion.button>
              );
            })}
          </div>
          {COMING_SOON_MODULES.length > 0 && (
            // Match the active-module grid (1 col mobile / 3 cols ≥sm) so
            // teachers can SEE that Modules D and E exist at the same
            // visual weight as A/B/C — previously these were tucked into
            // a smaller 2-col strip below and several teachers reported
            // not noticing them at all.
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {COMING_SOON_MODULES.map(m => {
                const spec = MODULE_SPECS[m];
                return (
                  <div
                    key={m}
                    className="relative rounded-2xl p-4 text-left overflow-hidden border-2 border-dashed cursor-not-allowed"
                    style={{ borderColor: 'var(--vb-border)' }}
                    title={t.comingSoonTitle(spec.label)}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${MODULE_GRADIENTS[m] || 'from-slate-400 to-slate-600'} opacity-30`} />
                    <div className="relative z-10" style={{ color: 'var(--vb-text-primary)' }}>
                      <div className="text-xs font-bold uppercase tracking-widest opacity-80">{spec.label}</div>
                      <div className="text-xl font-black mt-1 opacity-90">{t.pointTrack(String(spec.pointTrack))}</div>
                      <div className="text-xs opacity-80 mt-1">{t.cefrGrade(spec.cefr, String(spec.gradeBand))}</div>
                      <div className="mt-2 inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700">{t.comingSoon}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Add words ── */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--vb-text-muted)' }}>
            {t.step2Heading}
          </h2>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <SourceTab active={source === 'paste'} icon={<ClipboardPaste size={18} />} label={t.sourcePaste} onClick={() => setSource('paste')} />
            <SourceTab active={source === 'photo'} icon={<Camera size={18} />} label={t.sourcePhoto} onClick={() => setSource('photo')} />
            <SourceTab active={source === 'class'} icon={<FolderOpen size={18} />} label={t.sourceClass} onClick={() => setSource('class')} />
          </div>

          {source === 'paste' && (
            <div className="space-y-3">
              <textarea
                value={pasteDraft}
                onChange={e => setPasteDraft(e.target.value)}
                placeholder={t.pastePlaceholder}
                className="w-full min-h-[140px] p-3 rounded-xl border text-sm"
                style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)', color: 'var(--vb-text-primary)' }}
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs" style={{ color: 'var(--vb-text-muted)' }}>
                  {pastePreview.length === 0 ? t.noValidWordsYet : t.readyToAdd(pastePreview.length)}
                </span>
                <button
                  type="button"
                  onClick={commitPaste}
                  disabled={pastePreview.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40"
                >
                  <Plus size={16} /> {t.addToList}
                </button>
              </div>
            </div>
          )}

          {source === 'photo' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  disabled={ocrLoading}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50"
                >
                  <Camera size={18} /> {t.openCamera}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={ocrLoading}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold border"
                  style={{ borderColor: 'var(--vb-border)', color: 'var(--vb-text-primary)' }}
                >
                  {t.uploadFromGallery}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) void runOcrOnFile(f);
                    if (e.target) e.target.value = '';
                  }}
                />
              </div>
              {ocrLoading && (
                <div className="text-sm flex items-center gap-2" style={{ color: 'var(--vb-text-secondary)' }}>
                  <Loader2 size={14} className="animate-spin" /> {t.readingWords}
                </div>
              )}
              <p className="text-xs" style={{ color: 'var(--vb-text-muted)' }}>
                {t.ocrTip}
              </p>
            </div>
          )}

          {source === 'class' && (
            <div className="space-y-3">
              <select
                value={selectedClassId ?? ''}
                onChange={e => { setSelectedClassId(e.target.value || null); setSelectedAssignmentId(null); }}
                className="w-full p-3 rounded-xl border text-sm"
                style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)', color: 'var(--vb-text-primary)' }}
              >
                <option value="">{t.selectClass}</option>
                {teacherClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
              {selectedClassId && (
                <select
                  value={selectedAssignmentId ?? ''}
                  onChange={e => setSelectedAssignmentId(e.target.value || null)}
                  className="w-full p-3 rounded-xl border text-sm"
                  style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)', color: 'var(--vb-text-primary)' }}
                >
                  <option value="">{t.selectAssignment}</option>
                  {classAssignments.map(a => (
                    <option key={a.id} value={a.id}>{a.title} ({t.wordsInAssignment((a.words ?? []).length)})</option>
                  ))}
                </select>
              )}
              {selectedAssignment && (
                <div className="rounded-xl p-3 border" style={{ borderColor: 'var(--vb-border)' }}>
                  <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--vb-text-muted)' }}>
                    {t.wordsInAssignment(assignmentWords.length)}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {assignmentWords.slice(0, 30).map(w => (
                      <span key={w} className="inline-block px-2 py-0.5 rounded-md text-xs" style={{ backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-secondary)' }}>{w}</span>
                    ))}
                    {assignmentWords.length > 30 && (
                      <span className="text-xs px-2 py-0.5" style={{ color: 'var(--vb-text-muted)' }}>{t.morePlusN(assignmentWords.length - 30)}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={pullAssignmentWords}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700"
                  >
                    <Plus size={16} /> {t.addAllToList}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Review and approve ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--vb-text-muted)' }}>
              {t.step3Heading}
            </h2>
            {pendingWords.length > 0 && (
              <button type="button" onClick={clearAll} className="text-xs font-medium" style={{ color: 'var(--vb-text-muted)' }}>
                {t.clearAll}
              </button>
            )}
          </div>
          <div
            className="rounded-2xl p-4 border min-h-[88px]"
            style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}
          >
            {pendingWords.length === 0 ? (
              <div className="text-sm py-3 text-center" style={{ color: 'var(--vb-text-muted)' }}>
                {t.emptyReviewBody}
              </div>
            ) : (
              <>
                <div className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--vb-text-secondary)' }}>
                  <span>{t.wordsReady(pendingWords.length)}</span>
                  {pendingWords.length >= MAX_WORDS && <span className="text-amber-600">{t.cappedAt(MAX_WORDS)}</span>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pendingWords.map(w => (
                    <span
                      key={w}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
                      style={{ backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-primary)' }}
                    >
                      {w}
                      <button
                        type="button"
                        onClick={() => removeWord(w)}
                        className="opacity-60 hover:opacity-100"
                        aria-label={t.removeWordAria(w)}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Generate ── */}
        <section className="pt-2">
          {gen.error && (
            <div className="mb-3 rounded-xl p-3 text-sm bg-rose-50 text-rose-700 border border-rose-200">
              {gen.error}
            </div>
          )}
          <motion.button
            type="button"
            whileHover={{ scale: gen.loading || pendingWords.length === 0 ? 1 : 1.02 }}
            whileTap={{ scale: gen.loading || pendingWords.length === 0 ? 1 : 0.97 }}
            onClick={handleGenerate}
            disabled={gen.loading || pendingWords.length === 0}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold text-white text-base disabled:opacity-50 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30"
          >
            {gen.loading ? (
              <><Loader2 size={20} className="animate-spin" /> {t.generating(module)}</>
            ) : (
              <><Sparkles size={20} /> {t.generateBtn(MODULE_SPECS[module].label, pendingWords.length)}</>
            )}
          </motion.button>
          <p className="mt-3 text-xs text-center" style={{ color: 'var(--vb-text-muted)' }}>
            {t.generateFootnote}
          </p>
        </section>
      </div>

      {showCamera && (
        <InPageCamera
          onCapture={file => { setShowCamera(false); void runOcrOnFile(file); }}
          onCancel={() => setShowCamera(false)}
          onUseGallery={() => { setShowCamera(false); fileInputRef.current?.click(); }}
        />
      )}
    </div>
  );
}

function SourceTab({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all ${active ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-transparent'}`}
      style={!active ? { backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-secondary)' } : undefined}
    >
      {icon} {label}
    </button>
  );
}
