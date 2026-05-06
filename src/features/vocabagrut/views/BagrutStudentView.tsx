// Student-side Vocabagrut: list of published mock exams + the in-test
// fill-in form with autosave + submit.  Two internal modes:
//   list   — published tests for the student's class
//   test   — in-progress / completed view of one test

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, FileText, Loader2, Send, Check, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import type { AppUser } from '../../../core/supabase';
import { supabase } from '../../../core/supabase';
import type { BagrutTest, BagrutTestRow, BagrutResponseRow } from '../types';
import { MODULE_SPECS } from '../lib/moduleMap';
import { useStudentBagrutTests, loadOwnResponse, autosaveResponse } from '../hooks/useBagrutTests';

interface Props {
  user: AppUser;
  onBack: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function BagrutStudentView({ user, onBack, showToast }: Props) {
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const { rows, loading } = useStudentBagrutTests(user.classCode);

  if (activeTestId) {
    const row = rows.find(r => r.id === activeTestId) ?? null;
    return (
      <BagrutStudentTakeView
        user={user}
        testRow={row}
        onBack={() => setActiveTestId(null)}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vb-bg)' }}>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 opacity-90" />
        <div className="relative px-4 sm:px-8 py-6">
          <button onClick={onBack} type="button" className="text-white/90 hover:text-white inline-flex items-center gap-1.5 text-sm font-medium mb-3">
            <ArrowLeft size={18} /> Back
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Mock Bagrut Exams</h1>
          <p className="text-white/90 text-sm mt-1">Practice the real Bagrut format — assigned by your teacher.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-6 space-y-3">
        {loading && <div className="text-center py-8" style={{ color: 'var(--vb-text-muted)' }}><Loader2 size={20} className="animate-spin inline" /></div>}
        {!loading && rows.length === 0 && (
          <div className="text-center py-12" style={{ color: 'var(--vb-text-muted)' }}>
            No mock exams yet. Your teacher hasn't published any.
          </div>
        )}
        {rows.map(r => (
          <motion.button
            key={r.id}
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setActiveTestId(r.id)}
            className="w-full text-left rounded-2xl p-4 border flex items-center gap-3"
            style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center shrink-0">
              <FileText size={22} className="text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate" style={{ color: 'var(--vb-text-primary)' }}>{r.title}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--vb-text-secondary)' }}>
                {MODULE_SPECS[r.module].label} · {MODULE_SPECS[r.module].pointTrack}-point
              </div>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--vb-text-muted)' }} />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ─── In-test view ──────────────────────────────────────────────────────
function BagrutStudentTakeView({ user, testRow, onBack, showToast }: { user: AppUser; testRow: BagrutTestRow | null; onBack: () => void; showToast: Props['showToast'] }) {
  const [test, setTest] = useState<BagrutTest | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<BagrutResponseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial load: stripped test from server + own response (if any).
  useEffect(() => {
    let mounted = true;
    void (async () => {
      if (!testRow) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`/api/student-bagrut/${testRow.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const body = await res.json();
        if (!mounted) return;
        if (!res.ok) {
          showToast(body.error || 'Failed to load test', 'error');
          return;
        }
        setTest(body.test);
        const resp = await loadOwnResponse(testRow.id, user.uid);
        if (!mounted) return;
        if (resp) {
          setResponse(resp);
          setAnswers(resp.answers || {});
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [testRow, user.uid, showToast]);

  // Autosave on every answer change, debounced ~1s.  Stops once submitted.
  useEffect(() => {
    if (!testRow || response?.submitted_at) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      await autosaveResponse({ testId: testRow.id, studentUid: user.uid, answers });
      setSavedAt(Date.now());
    }, 1000);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [answers, testRow, user.uid, response?.submitted_at]);

  async function handleSubmit() {
    if (!testRow) return;
    if (response?.submitted_at) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/submit-bagrut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ test_id: testRow.id, answers }),
      });
      const body = await res.json();
      if (!res.ok) {
        showToast(body.error || 'Submit failed', 'error');
        return;
      }
      // Server returns the test WITH answer key for the review screen.
      setTest(body.review);
      setResponse({
        id: response?.id ?? '',
        test_id: testRow.id,
        student_uid: user.uid,
        answers,
        mc_score: body.mc_score,
        mc_max: body.mc_max,
        writing_grade: null,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      showToast(`Submitted — MC score ${body.mc_score}/${body.mc_max}`, 'success');
    } finally { setSubmitting(false); }
  }

  if (!testRow) return null;
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={24} className="animate-spin" /></div>;
  if (!test) return null;

  const isSubmitted = !!response?.submitted_at;
  const spec = MODULE_SPECS[test.module];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vb-bg)' }}>
      <div className="sticky top-0 z-20 backdrop-blur" style={{ backgroundColor: 'rgba(255,255,255,0.85)', borderBottom: '1px solid var(--vb-border)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={onBack} type="button" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--vb-text-secondary)' }}>
            <ArrowLeft size={16} /> Exams
          </button>
          {isSubmitted ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-emerald-50 text-emerald-700">
              <Check size={16} /> Submitted · {response?.mc_score}/{response?.mc_max} MC
            </span>
          ) : (
            <span className="text-xs" style={{ color: 'var(--vb-text-muted)' }}>
              {savedAt ? `Saved ${formatRelative(savedAt)}` : 'Autosaving…'}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="rounded-2xl p-5 border" style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--vb-text-muted)' }}>
            {spec.label} · {spec.pointTrack}-point program
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--vb-text-primary)' }}>{test.title}</h1>
          <div className="text-sm mt-1" style={{ color: 'var(--vb-text-secondary)' }}>
            Time {test.time_minutes} min · {test.total_points} points
          </div>
        </div>

        {test.sections.map((section, secIdx) => (
          <div key={secIdx} className="rounded-2xl p-5 border space-y-4" style={{ backgroundColor: 'var(--vb-surface)', borderColor: 'var(--vb-border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--vb-text-primary)' }}>{section.title}</h2>
              <span className="text-xs" style={{ color: 'var(--vb-text-muted)' }}>{section.total_points} pts</span>
            </div>
            {section.passage && (
              <div className="rounded-lg p-4 font-serif text-[15px] leading-relaxed whitespace-pre-wrap" style={{ backgroundColor: 'var(--vb-bg)', color: 'var(--vb-text-primary)' }}>
                {section.passage}
              </div>
            )}
            <div className="space-y-4">
              {section.questions.map((q, qIdx) => {
                const studentAnswer = answers[q.id] ?? '';
                const isCorrect = isSubmitted && q.type === 'mc' && q.correct_answer === studentAnswer;
                const isWrong = isSubmitted && q.type === 'mc' && q.correct_answer && studentAnswer && q.correct_answer !== studentAnswer;
                return (
                  <div key={q.id} className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-sm" style={{ color: 'var(--vb-text-primary)' }}>{qIdx + 1}.</span>
                      <div className="flex-1">
                        <div className="text-sm" style={{ color: 'var(--vb-text-primary)' }}>{q.prompt}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--vb-text-muted)' }}>{q.points} pts</div>
                      </div>
                    </div>
                    {q.type === 'mc' && q.options && (
                      <div className="space-y-1.5 pl-5">
                        {q.options.map(opt => {
                          const isPicked = studentAnswer === opt.letter;
                          const isAnswer = isSubmitted && q.correct_answer === opt.letter;
                          return (
                            <label
                              key={opt.letter}
                              className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer border-2 ${isAnswer ? 'border-emerald-400 bg-emerald-50' : isPicked && isWrong ? 'border-rose-400 bg-rose-50' : isPicked ? 'border-violet-400' : 'border-transparent'}`}
                              style={!isPicked && !isAnswer ? { backgroundColor: 'var(--vb-bg)' } : undefined}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                value={opt.letter}
                                disabled={isSubmitted}
                                checked={isPicked}
                                onChange={() => setAnswers(a => ({ ...a, [q.id]: opt.letter }))}
                                className="mt-1"
                              />
                              <span className="font-mono text-xs mt-0.5" style={{ color: 'var(--vb-text-muted)' }}>({opt.letter})</span>
                              <span className="text-sm" style={{ color: 'var(--vb-text-primary)' }}>{opt.text}</span>
                            </label>
                          );
                        })}
                        {isSubmitted && isCorrect && <div className="text-xs text-emerald-700 pl-2">✓ Correct</div>}
                        {isSubmitted && isWrong && <div className="text-xs text-rose-700 pl-2">Correct answer: ({q.correct_answer})</div>}
                      </div>
                    )}
                    {q.type === 'short' && (
                      <textarea
                        value={studentAnswer}
                        onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                        disabled={isSubmitted}
                        rows={3}
                        className="w-full p-2 rounded-lg border text-sm"
                        style={{ backgroundColor: 'var(--vb-bg)', borderColor: 'var(--vb-border)', color: 'var(--vb-text-primary)' }}
                      />
                    )}
                    {q.type === 'writing' && (
                      <div className="space-y-2 pl-5">
                        {q.bullets && (
                          <ul className="text-xs list-disc pl-4" style={{ color: 'var(--vb-text-secondary)' }}>
                            {q.bullets.map((b, i) => <li key={i}>{b}</li>)}
                          </ul>
                        )}
                        {q.word_count_min && q.word_count_max && (
                          <div className="text-xs italic" style={{ color: 'var(--vb-text-muted)' }}>
                            {q.word_count_min}–{q.word_count_max} words
                          </div>
                        )}
                        <textarea
                          value={studentAnswer}
                          onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                          disabled={isSubmitted}
                          rows={8}
                          className="w-full p-3 rounded-lg border text-sm font-serif leading-relaxed"
                          style={{ backgroundColor: 'var(--vb-bg)', borderColor: 'var(--vb-border)', color: 'var(--vb-text-primary)' }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {!isSubmitted && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg disabled:opacity-50"
          >
            {submitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />} Submit
          </button>
        )}
      </div>
    </div>
  );
}

function formatRelative(ts: number): string {
  const sec = Math.round((Date.now() - ts) / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  return `${min}m ago`;
}
