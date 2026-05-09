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
 *   0. Welcome + starter pack picker (Foundation / Building blocks /
 *      Bridge to fluency / Custom — each with sample words)
 *   1. Class name (autosuggests "<teacher>'s class" in their language)
 *   2. Mode picker (popular subset pre-checked, rest opt-in)
 *   3. Done — class code + "what next" 3-step guide + Copy / WhatsApp
 *
 * Each step has a "Skip" link in the header so teachers who want to
 * dive in without hand-holding can dismiss the wizard.  Skipping still
 * calls mark_teacher_onboarded so it doesn't reappear.
 *
 * Internationalised: EN / HE / AR via locales/teacher/onboarding-wizard.
 * RTL is wired via useLanguage().dir + per-element flex-row-reverse so
 * the wizard reads naturally for Hebrew / Arabic teachers.
 */
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check, Copy, MessageCircle, ArrowRight, ArrowLeft, X,
  GraduationCap, Sparkles, BookOpen, PartyPopper,
} from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { onboardingWizardT } from '../../locales/teacher/onboarding-wizard';

interface TeacherOnboardingWizardProps {
  open: boolean;
  /** Teacher's display name from public.users — used to autosuggest a
   *  default class name in the active language ("Sarah's class" /
   *  "הכיתה של שרה" / "صفّ سارة"). */
  teacherDisplayName?: string | null;
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
  { id: 'flashcards',  emoji: '📇', recommended: true,  labelKey: 'modeFlashcards' as const },
  { id: 'classic',     emoji: '🎯', recommended: true,  labelKey: 'modeClassic' as const },
  { id: 'matching',    emoji: '🃏', recommended: true,  labelKey: 'modeMatching' as const },
  { id: 'listening',   emoji: '👂', recommended: true,  labelKey: 'modeListening' as const },
  { id: 'true-false',  emoji: '✅', recommended: true,  labelKey: 'modeTrueFalse' as const },
  { id: 'spelling',    emoji: '✍️', recommended: false, labelKey: 'modeSpelling' as const },
  { id: 'scramble',    emoji: '🔤', recommended: false, labelKey: 'modeScramble' as const },
  { id: 'reverse',     emoji: '🔁', recommended: false, labelKey: 'modeReverse' as const },
];

const STARTER_PACKS = [
  { id: 'set-1' as const,  emoji: '🌱', labelKey: 'pack1Label' as const, subKey: 'pack1Subtitle' as const, samplesKey: 'pack1Samples' as const,    accent: 'from-emerald-500 to-teal-600' },
  { id: 'set-2' as const,  emoji: '🌿', labelKey: 'pack2Label' as const, subKey: 'pack2Subtitle' as const, samplesKey: 'pack2Samples' as const,    accent: 'from-indigo-500 to-violet-600' },
  { id: 'set-3' as const,  emoji: '🌳', labelKey: 'pack3Label' as const, subKey: 'pack3Subtitle' as const, samplesKey: 'pack3Samples' as const,    accent: 'from-fuchsia-500 to-rose-600' },
  { id: 'custom' as const, emoji: '✏️', labelKey: 'packCustomLabel' as const, subKey: 'packCustomSubtitle' as const, samplesKey: 'packCustomSamples' as const, accent: 'from-stone-400 to-stone-600' },
];

export default function TeacherOnboardingWizard({
  open,
  teacherDisplayName,
  onComplete,
  onSkip,
}: TeacherOnboardingWizardProps) {
  const { language, dir, isRTL } = useLanguage();
  const t = onboardingWizardT[language];

  // Translation default depends on the teacher's display name + language.
  // useMemo so it doesn't recompute on every render and the input stays
  // editable (uncontrolled-style — initial value, then user owns it).
  const defaultClassName = useMemo(
    () => t.defaultClassName((teacherDisplayName ?? '').trim()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language],
  );

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
    onSkip();
  };

  const handleBack = () => {
    if (step > 0 && step < 3) setStep(s => s - 1);
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
    const text = encodeURIComponent(t.whatsAppMessage(classCode));
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  // RTL-aware arrow icons — visual back/forward inverts in RTL so the
  // motion still reads "forward" to the eye.
  const ForwardArrow = isRTL ? ArrowLeft : ArrowRight;
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          dir={dir}
        >
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', damping: 22, stiffness: 220 }}
            className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[92vh] overflow-hidden flex flex-col relative"
            role="dialog"
            aria-modal="true"
            aria-label={t.welcomeHeading}
          >
            {/* Decorative gradient blob — subtle texture on the welcome step */}
            {step === 0 && (
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br from-indigo-300/30 to-fuchsia-300/30 blur-3xl pointer-events-none" />
            )}

            {/* Header — stepper + skip link */}
            <div className={`px-6 sm:px-8 pt-5 pb-4 border-b border-stone-100 flex items-center justify-between gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
                  className={`text-xs sm:text-sm text-stone-400 hover:text-stone-700 font-semibold transition flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}
                  type="button"
                >
                  <X size={14} />
                  {t.skip}
                </button>
              )}
            </div>

            {/* Step bodies */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 sm:py-8 relative">
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div
                    key="step-0"
                    initial={{ opacity: 0, x: isRTL ? -12 : 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isRTL ? 12 : -12 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className={`flex items-center gap-3 mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
                        <Sparkles className="w-7 h-7 text-white" />
                      </div>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <h2 className="text-xl sm:text-2xl font-black text-stone-900 leading-tight">{t.welcomeHeading}</h2>
                        <p className="text-sm text-stone-500 mt-0.5">{t.welcomeSubtitle}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-bold text-stone-700 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t.pickStarterPackLabel}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {STARTER_PACKS.map(p => {
                        const selected = starterPack === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setStarterPack(p.id)}
                            className={`${isRTL ? 'text-right' : 'text-left'} p-3.5 rounded-2xl border-2 transition-all ${
                              selected
                                ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                                : 'border-stone-200 hover:border-stone-300 bg-white'
                            }`}
                            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as never }}
                          >
                            <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <span className={`shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${p.accent} flex items-center justify-center text-xl shadow-sm`}>
                                {p.emoji}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className={`font-black text-sm ${selected ? 'text-indigo-700' : 'text-stone-900'}`}>
                                  {t[p.labelKey]}
                                </p>
                                <p className="text-xs text-stone-500 mt-0.5 leading-snug">
                                  {t[p.subKey]}
                                </p>
                                {t[p.samplesKey] && (
                                  <p className="text-[11px] text-stone-400 mt-1.5 font-mono tracking-tight" dir="ltr">
                                    {t[p.samplesKey]}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: isRTL ? -12 : 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isRTL ? 12 : -12 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className={`flex items-center gap-3 mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                        <GraduationCap className="w-7 h-7 text-white" />
                      </div>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <h2 className="text-xl sm:text-2xl font-black text-stone-900 leading-tight">{t.nameClassHeading}</h2>
                        <p className="text-sm text-stone-500 mt-0.5">{t.nameClassSubtitle}</p>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={className}
                      onChange={e => setClassName(e.target.value)}
                      placeholder={t.classNamePlaceholder}
                      maxLength={60}
                      autoFocus
                      dir={dir}
                      className={`w-full px-4 py-3.5 rounded-2xl border-2 border-stone-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-base font-bold text-stone-900 ${isRTL ? 'text-right' : 'text-left'}`}
                    />
                    <p className={`text-xs text-stone-400 mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t.classNameHelp}
                    </p>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: isRTL ? -12 : 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: isRTL ? 12 : -12 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className={`flex items-center gap-3 mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0">
                        <BookOpen className="w-7 h-7 text-white" />
                      </div>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <h2 className="text-xl sm:text-2xl font-black text-stone-900 leading-tight">{t.pickModesHeading}</h2>
                        <p className="text-sm text-stone-500 mt-0.5">{t.pickModesSubtitle}</p>
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
                            className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all ${isRTL ? 'flex-row-reverse text-right' : 'text-left'} ${
                              checked
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-stone-200 hover:border-stone-300'
                            }`}
                            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as never }}
                          >
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                              checked ? 'bg-indigo-500 text-white' : 'bg-stone-100 text-stone-400'
                            }`}>
                              {checked ? <Check size={14} /> : <span className="text-base">{m.emoji}</span>}
                            </span>
                            <span className={`text-sm font-bold truncate ${checked ? 'text-indigo-700' : 'text-stone-900'}`}>
                              {t[m.labelKey]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <p className={`text-xs text-stone-400 mt-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t.modesSelectedCount(selectedModes.size)}
                    </p>
                  </motion.div>
                )}

                {step === 3 && classCode && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 18, stiffness: 200 }}
                  >
                    {/* Hero — celebratory icon over a soft gradient */}
                    <div className="text-center mb-5">
                      <motion.div
                        animate={{ rotate: [0, -6, 6, -6, 0] }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-teal-500/40"
                      >
                        <PartyPopper className="w-10 h-10 text-white" />
                      </motion.div>
                      <h2 className="text-2xl sm:text-3xl font-black text-stone-900 mb-1">{t.successHeading}</h2>
                      <p className="text-sm text-stone-600">{t.successSubtitle}</p>
                    </div>

                    {/* Class code — big, copyable, gradient frame */}
                    <div className="bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 rounded-2xl p-5 mb-5 border border-indigo-100/60">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 mb-2 text-center">
                        {t.yourClassCodeLabel}
                      </p>
                      <p
                        className="text-3xl sm:text-4xl font-black text-indigo-700 font-mono tracking-widest text-center select-all"
                        dir="ltr"
                      >
                        {classCode}
                      </p>
                    </div>

                    {/* "What next" — three numbered steps so the teacher
                        knows exactly what to do with the code */}
                    <div className="bg-stone-50 rounded-2xl p-4 mb-5">
                      <p className={`text-xs font-black uppercase tracking-widest text-stone-500 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t.whatNextHeading}
                      </p>
                      <ol className="space-y-2.5">
                        {[t.whatNextStep1, t.whatNextStep2, t.whatNextStep3].map((line, i) => (
                          <li key={i} className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                            <span className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-black flex items-center justify-center shadow-sm">
                              {i + 1}
                            </span>
                            <p className="text-sm text-stone-700 leading-snug">{line}</p>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Share buttons */}
                    <div className={`flex gap-2.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className={`flex-1 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm flex items-center justify-center gap-1.5 transition ${isRTL ? 'flex-row-reverse' : ''}`}
                        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as never }}
                      >
                        {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                        {copied ? t.copied : t.copyCode}
                      </button>
                      <button
                        type="button"
                        onClick={handleWhatsApp}
                        className={`flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-1.5 transition ${isRTL ? 'flex-row-reverse' : ''}`}
                        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as never }}
                      >
                        <MessageCircle size={16} />
                        {t.shareWhatsApp}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer — primary CTA + back affordance for steps 1–2 */}
            <div className={`px-6 sm:px-8 py-4 border-t border-stone-100 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {step > 0 && step < 3 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className={`px-4 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm flex items-center justify-center gap-1.5 transition ${isRTL ? 'flex-row-reverse' : ''}`}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as never }}
                >
                  <BackArrow size={16} />
                  {t.back}
                </button>
              )}
              <button
                type="button"
                onClick={handleAdvance}
                disabled={!canAdvance || isSubmitting}
                className={`flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-600 to-fuchsia-600 hover:from-indigo-600 hover:to-fuchsia-700 text-white font-black text-base shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' as never }}
              >
                {step === 3
                  ? t.openDashboard
                  : step === 2
                  ? (isSubmitting ? t.creatingClass : t.createClass)
                  : t.next}
                {!isSubmitting && step !== 3 && <ForwardArrow size={18} />}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
