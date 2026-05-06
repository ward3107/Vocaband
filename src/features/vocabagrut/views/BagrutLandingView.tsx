// Step 1 of the Vocabagrut teacher flow: pick module + word source, then
// hit Generate.  On success the shell advances to BagrutEditorView.

import { useRef, useState } from 'react';
import { ArrowLeft, Camera, ClipboardPaste, FolderOpen, Sparkles, Loader2, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { AppUser, ClassData, AssignmentData } from '../../../core/supabase';
import { supabase } from '../../../core/supabase';
import InPageCamera from '../../../components/InPageCamera';
import { AVAILABLE_MODULES, COMING_SOON_MODULES, MODULE_SPECS } from '../lib/moduleMap';
import { useBagrutGenerator } from '../hooks/useBagrutGenerator';
import type { BagrutModule, BagrutTest } from '../types';

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

export default function BagrutLandingView({ user, classes, teacherAssignments, onBack, onGenerated, showToast }: Props) {
  const [module, setModule] = useState<BagrutModule>('B');
  const [source, setSource] = useState<WordSource>('paste');
  const [pasteText, setPasteText] = useState('');
  const [photoWords, setPhotoWords] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gen = useBagrutGenerator();

  const teacherClasses = classes.filter(c => c.teacherUid === user.uid);
  const classAssignments = selectedClassId
    ? teacherAssignments.filter(a => a.classId === selectedClassId)
    : [];

  function parsePaste(text: string): string[] {
    return text
      .split(/[,\n;\t|]+/)
      .map(w => w.trim().toLowerCase())
      .filter(w => /^[a-zA-Z\-']{1,30}$/.test(w))
      .filter((w, i, arr) => arr.indexOf(w) === i);
  }

  function getAssignmentWords(): string[] {
    if (!selectedAssignmentId) return [];
    const a = teacherAssignments.find(x => x.id === selectedAssignmentId);
    if (!a) return [];
    return (a.words ?? []).map(w => w.english.toLowerCase());
  }

  function getCurrentWords(): string[] {
    if (source === 'paste') return parsePaste(pasteText);
    if (source === 'photo') return photoWords;
    if (source === 'class') return getAssignmentWords();
    return [];
  }

  async function runOcrOnFile(file: File) {
    setOcrLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('Sign in required for OCR', 'error');
        return;
      }
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd,
      });
      const body = await res.json();
      if (!res.ok) {
        showToast(body.error || 'OCR failed', 'error');
        return;
      }
      const words = (body.words || []) as string[];
      setPhotoWords(prev => {
        const merged = [...prev, ...words.map(w => w.toLowerCase())];
        return merged.filter((w, i) => merged.indexOf(w) === i && /^[a-zA-Z\-']{1,30}$/.test(w));
      });
      showToast(`Found ${words.length} words from image`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'OCR error', 'error');
    } finally {
      setOcrLoading(false);
    }
  }

  async function handleGenerate() {
    const words = getCurrentWords();
    if (words.length === 0) {
      showToast('Add at least one word first', 'error');
      return;
    }
    const test = await gen.generate(module, words);
    if (test) {
      showToast(gen.cached ? 'Loaded from cache' : 'Generated! Review and export.', 'success');
      onGenerated(test, words);
    }
  }

  const wordCount = getCurrentWords().length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vb-bg)' }}>
      {/* Hero header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 opacity-90" />
        <div className="relative px-4 sm:px-8 py-6 sm:py-10">
          <button onClick={onBack} type="button" className="text-white/90 hover:text-white inline-flex items-center gap-1.5 text-sm font-medium mb-4">
            <ArrowLeft size={18} /> Back
          </button>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
              <Sparkles size={32} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-white">Vocabagrut</h1>
              <p className="text-white/90 text-sm sm:text-base mt-1 max-w-xl">
                Generate a Bagrut-style mock exam from your word list. Looks like the real paper — perfect for format familiarity.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* ── Module picker ── */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--vb-text-muted)' }}>
            1 · Choose module
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
                    <div className="text-xl font-black mt-1">{spec.pointTrack}-point</div>
                    <div className="text-xs opacity-90 mt-1">CEFR {spec.cefr} · grade {spec.gradeBand}</div>
                  </div>
                </motion.button>
              );
            })}
          </div>
          {COMING_SOON_MODULES.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {COMING_SOON_MODULES.map(m => {
                const spec = MODULE_SPECS[m];
                return (
                  <div key={m} className="rounded-xl p-3 border border-dashed" style={{ borderColor: 'var(--vb-border)' }}>
                    <div className="text-xs font-bold opacity-60" style={{ color: 'var(--vb-text-secondary)' }}>{spec.label} · coming soon</div>
                    <div className="text-xs mt-0.5 opacity-50" style={{ color: 'var(--vb-text-muted)' }}>{spec.pointTrack}-point</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Word source picker ── */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--vb-text-muted)' }}>
            2 · Where are the words from?
          </h2>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <SourceTab active={source === 'paste'} icon={<ClipboardPaste size={18} />} label="Paste" onClick={() => setSource('paste')} />
            <SourceTab active={source === 'photo'} icon={<Camera size={18} />} label="Photo" onClick={() => setSource('photo')} />
            <SourceTab active={source === 'class'} icon={<FolderOpen size={18} />} label="From class" onClick={() => setSource('class')} />
          </div>

          {source === 'paste' && (
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder="Paste or type words separated by commas, new lines, or semicolons. Example: harvest, community, neighbour, garden, soil, vegetables"
              className="w-full min-h-[140px] p-3 rounded-xl border text-sm"
              style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)', color: 'var(--vb-text-primary)' }}
            />
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
                  <Camera size={18} /> Open camera
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={ocrLoading}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold border"
                  style={{ borderColor: 'var(--vb-border)', color: 'var(--vb-text-primary)' }}
                >
                  Upload from gallery
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
                  <Loader2 size={14} className="animate-spin" /> Reading words from image…
                </div>
              )}
              {photoWords.length > 0 && (
                <div className="rounded-xl p-3 border" style={{ borderColor: 'var(--vb-border)' }}>
                  <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--vb-text-muted)' }}>
                    {photoWords.length} words found
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {photoWords.map(w => (
                      <span key={w} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs" style={{ backgroundColor: 'var(--vb-surface-alt)', color: 'var(--vb-text-primary)' }}>
                        {w}
                        <button type="button" onClick={() => setPhotoWords(p => p.filter(x => x !== w))} className="opacity-60 hover:opacity-100">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
                <option value="">Select a class…</option>
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
                  <option value="">Select an assignment…</option>
                  {classAssignments.map(a => (
                    <option key={a.id} value={a.id}>{a.title} ({(a.words ?? []).length} words)</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </section>

        {/* ── Generate ── */}
        <section className="pt-2">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="text-sm" style={{ color: 'var(--vb-text-secondary)' }}>
              {wordCount === 0 ? 'No words yet' : `${wordCount} word${wordCount === 1 ? '' : 's'} ready`}
              {wordCount > 60 && <span className="text-amber-600"> · capped at 60</span>}
            </div>
          </div>
          {gen.error && (
            <div className="mb-3 rounded-xl p-3 text-sm bg-rose-50 text-rose-700 border border-rose-200">
              {gen.error}
            </div>
          )}
          <motion.button
            type="button"
            whileHover={{ scale: gen.loading ? 1 : 1.02 }}
            whileTap={{ scale: gen.loading ? 1 : 0.97 }}
            onClick={handleGenerate}
            disabled={gen.loading || wordCount === 0}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold text-white text-base disabled:opacity-50 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30"
          >
            {gen.loading ? (
              <><Loader2 size={20} className="animate-spin" /> Generating Module {module}…</>
            ) : (
              <><Sparkles size={20} /> Generate {MODULE_SPECS[module].label} mock exam</>
            )}
          </motion.button>
          <p className="mt-3 text-xs text-center" style={{ color: 'var(--vb-text-muted)' }}>
            Every word will appear in the reading or vocab section in authentic context.
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
