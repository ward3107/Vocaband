/**
 * TeacherOnboardingWizard — first-sign-in flow that walks a brand-new
 * teacher through creating their first class + assignment in under
 * 60 seconds.
 *
 * Trigger: TeacherDashboardView mounts the modal when both
 *   1. user.onboardedAt IS NULL  (server flag, persists across devices)
 *   2. The teacher has zero classes
 * are true.  Either condition false → modal stays hidden.
 *
 * Steps:
 *   1. Welcome + starter pack picker (Set 1 / Set 2 / Set 3 / Custom)
 *   2. Class name (auto-suggests "Class A", editable)
 *   3. Mode picker (popular subset pre-checked, rest opt-in)
 *   4. Done — show class code + Copy / WhatsApp buttons
 *
 * Each step has a "Skip and explore on my own" link in the header so
 * teachers who want to dive in without hand-holding can dismiss the
 * wizard.  Skipping still calls mark_teacher_onboarded so the wizard
 * doesn't reappear.
 *
 * The wizard does NOT replace the regular Create Class / Create
 * Assignment flows — those still exist for follow-up classes.  This
 * is purely a first-time-user activation aid.
 */
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Copy, MessageCircle, ArrowRight, X, GraduationCap, Sparkles, BookOpen } from 'lucide-react';

interface TeacherOnboardingWizardProps {
  open: boolean;
  /** Default name suggestion for the first class.  Falls back to
   *  "Class A" if not provided.  Lets the parent inject a localised
   *  default later if needed. */
  defaultClassName?: string;
  /** Called when the wizard finishes successfully — parent runs the
   *  actual class+assignment creation, then calls
   *  mark_teacher_onboarded.  The wizard hands back the chosen
   *  options so the parent doesn't need to mirror state. */
  onComplete: (result: WizardResult) => Promise<{ classCode: string } | null>;
  /** Called when the teacher dismisses the wizard with the Skip link.
   *  Parent should fire mark_teacher_onboarded so we don't show it
   *  again. */
  onSkip: () => void;
}

export interface WizardResult {
  starterPack: 'set-1' | 'set-2' | 'set-3' | 'custom';
  className: string;
  modes: string[];
}

const MODE_PRESET = [
  { id: 'flashcards',  name: 'Flashcards',  emoji: '📇', recommended: true },
  { id: 'classic',     name: 'Classic',     emoji: '🎯', recommended: true },
  { id: 'matching',    name: 'Matching',    emoji: '🃏', recommended: true },
  { id: 'listening',   name: 'Listening',   emoji: '👂', recommended: true },
  { id: 'true-false',  name: 'True / False', emoji: '✅', recommended: true },
  { id: 'spelling',    name: 'Spelling',    emoji: '✍️', recommended: false },
  { id: 'scramble',    name: 'Scramble',    emoji: '🔤', recommended: false },
  { id: 'reverse',     name: 'Reverse',     emoji: '🔁', recommended: false },
];

const STARTER_PACKS = [
  { id: 'set-1' as const, label: 'Set 1', subtitle: 'Beginner — most basic words', emoji: '🌱' },
  { id: 'set-2' as const, label: 'Set 2', subtitle: 'Elementary — ~700 words', emoji: '🌿' },
  { id: 'set-3' as const, label: 'Set 3', subtitle: 'Intermediate — ~1500 words', emoji: '🌳' },
  { id: 'custom' as const, label: 'I\'ll add my own', subtitle: 'Skip the starter pack', emoji: '✏️' },
];

export default function TeacherOnboardingWizard({
  open,
  defaultClassName = 'Class A',
  onComplete,
  onSkip,
}: TeacherOnboardingWizardProps) {
  const [step, setStep] = useState(0); // 0..3
  const [starterPack, setStarterPack] = useState<WizardResult['starterPack']>('set-2');
  const [className, setClassName] = useState(defaultClassName);
  const [selectedModes, setSelectedModes] = useState<Set<string>>(
    new Set(MODE_PRESET.filter(m => m.recommended).map(m => m.id)),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [classCode, setClassCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canAdvance = useMemo(() => {
    if (step === 0) return Boolean(starterPack);
    if (step === 1) return className.trim().length > 0;
    if (step === 2) return selectedModes.size > 0;
    return true;
  }, [step, starterPack, className, selectedModes]);

  const toggleMode = (id: string) => {
    setSelectedModes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdvance = async () => {
    if (step < 2) {
      setStep(s => s + 1);
      return;
    }
    if (step === 2) {
      // Submit — parent creates class + assignment, returns the code.
      setIsSubmitting(true);
      try {
        const result = await onComplete({
          starterPack,
          className: className.trim(),
          modes: Array.from(selectedModes),
        });
        if (result?.classCode) {
          setClassCode(result.classCode);
          setStep(3);
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    // Step 3 → finish (close)
    onSkip();
  };

  const handleCopy = async () => {
    if (!classCode) return;
    try {
      await navigator.clipboard.writeText(classCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Silent — clipboard requires HTTPS + secure context.  Most
      // production teachers will have that; if a teacher is on a
      // weird kiosk where it fails they can still read the code
      // off the screen.
    }
  };

  const handleWhatsApp = () => {
    if (!classCode) return;
    const text = encodeURIComponent(
      `Join my Vocaband class!\n\nClass code: ${classCode}\n\nGo to https://vocaband.com and tap "Join class".`,
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', damping: 22, stiffness: 220 }}
            className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Teacher onboarding"
          >
            {/* Header — stepper + skip link */}
            <div className="px-6 sm:px-8 pt-5 pb-4 border-b border-stone-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3].map(i => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step
                        ? 'w-8 bg-indigo-500'
                        : i < step
                        ? 'w-4 bg-indigo-300'
                        : 'w-4 bg-stone-200'
                    }`}
                    aria-hidden
                  />
                ))}
              </div>
              {step < 3 && (
                <button
                  onClick={onSkip}
                  className="text-xs sm:text-sm text-stone-400 hover:text-stone-700 font-semibold transition flex items-center gap-1"
                  type="button"
                >
                  <X size={14} />
                  Skip
                </button>
              )}
            </div>

            {/* Step bodies — animated transitions between steps */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 sm:py-8">
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div
                    key="step-0"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-stone-900">Welcome to Vocaband</h2>
                        <p className="text-sm text-stone-500">Let's get your first class running in 60 seconds.</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-stone-700 mb-3">Pick a starter word pack</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {STARTER_PACKS.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setStarterPack(p.id)}
                          className={`text-left p-3 rounded-2xl border-2 transition-all ${
                            starterPack === p.id
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{p.emoji}</span>
                            <div className="min-w-0">
                              <p className={`font-bold text-sm ${starterPack === p.id ? 'text-indigo-700' : 'text-stone-900'}`}>{p.label}</p>
                              <p className="text-xs text-stone-500 truncate">{p.subtitle}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                        <GraduationCap className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-stone-900">Name your class</h2>
                        <p className="text-sm text-stone-500">Students will see this name when they join.</p>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={className}
                      onChange={e => setClassName(e.target.value)}
                      placeholder="e.g. 5th Grade English"
                      maxLength={60}
                      autoFocus
                      className="w-full px-4 py-3.5 rounded-2xl border-2 border-stone-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-base font-bold text-stone-900"
                    />
                    <p className="text-xs text-stone-400 mt-2">You can rename or add more classes anytime from the dashboard.</p>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                        <BookOpen className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-stone-900">Pick game modes</h2>
                        <p className="text-sm text-stone-500">Recommended ones are pre-checked. You can change later.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {MODE_PRESET.map(m => {
                        const checked = selectedModes.has(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => toggleMode(m.id)}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-left ${
                              checked
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-stone-200 hover:border-stone-300'
                            }`}
                          >
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                              checked ? 'bg-indigo-500 text-white' : 'bg-stone-100 text-stone-400'
                            }`}>
                              {checked ? <Check size={14} /> : <span className="text-base">{m.emoji}</span>}
                            </span>
                            <span className={`text-sm font-bold truncate ${checked ? 'text-indigo-700' : 'text-stone-900'}`}>
                              {m.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-stone-400 mt-3">{selectedModes.size} modes selected — pick at least one.</p>
                  </motion.div>
                )}

                {step === 3 && classCode && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 18, stiffness: 200 }}
                  >
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
                        <Check className="w-10 h-10 text-white" strokeWidth={3} />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-stone-900 mb-2">You're all set! 🎉</h2>
                      <p className="text-sm text-stone-600 mb-6">
                        Share this code with your students so they can join.
                      </p>

                      {/* Class code display */}
                      <div className="bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 rounded-2xl p-5 mb-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 mb-2">
                          Your class code
                        </p>
                        <p className="text-3xl sm:text-4xl font-black text-indigo-700 font-mono tracking-widest mb-3">
                          {classCode}
                        </p>
                      </div>

                      {/* Share buttons */}
                      <div className="flex gap-2.5">
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="flex-1 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm flex items-center justify-center gap-1.5 transition"
                        >
                          {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                          {copied ? 'Copied!' : 'Copy code'}
                        </button>
                        <button
                          type="button"
                          onClick={handleWhatsApp}
                          className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-1.5 transition"
                        >
                          <MessageCircle size={16} />
                          Share via WhatsApp
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer — primary CTA */}
            <div className="px-6 sm:px-8 py-4 border-t border-stone-100">
              <button
                type="button"
                onClick={handleAdvance}
                disabled={!canAdvance || isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-black text-base shadow-md flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {step === 3
                  ? 'Open my dashboard'
                  : step === 2
                  ? (isSubmitting ? 'Setting things up…' : 'Create class')
                  : 'Next'}
                {!isSubmitting && <ArrowRight size={18} />}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
