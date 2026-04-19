/**
 * QuickPlaySetupView — thin wrapper around the shared SetupWizard that
 * adds a post-completion success screen, mirroring what
 * CreateAssignmentWizard does for regular assignments.
 *
 * Before this wrapper, finishing the wizard dropped the teacher straight
 * into the monitor view with no "session created!" moment. Assignments
 * have a celebratory confetti-ish screen with the class code, a copy
 * button, a WhatsApp share, and a "Create another" shortcut. This brings
 * Quick Play to parity: once the session is generated, we show the same
 * kind of success card with the session code + student link + buttons to
 * either jump into the live monitor or launch another session.
 *
 * The title + instructions inputs are held as local state here (just
 * like CreateAssignmentWizard does with instructions) and forwarded into
 * SetupWizard, so ConfigureStep can render the same fields for both
 * flows without app.tsx needing new global state.
 */

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Copy, Share2, Check, BookOpen, Target, QrCode, ExternalLink } from 'lucide-react';
import SetupWizard, { type SetupWizardProps } from '../components/setup/SetupWizard';
import type { Word } from '../data/vocabulary';

type WizardCompleteResult = { words: Word[]; modes: string[] };

export interface QuickPlaySetupViewProps extends Omit<SetupWizardProps, 'mode' | 'onComplete' | 'assignmentTitle' | 'onTitleChange' | 'assignmentInstructions' | 'onInstructionsChange'> {
  /** Creates the session in the DB and returns the generated session code
   *  (6-char short code the students type). Called after the wizard finishes
   *  but BEFORE we show the success screen, so the code is available to
   *  display. If the creation fails, this should throw. */
  onCreateSession: (words: Word[], modes: string[], title: string, notes: string) => Promise<string>;
  /** Called from the success screen's "Open live monitor" button — the
   *  teacher leaves the setup flow and jumps to the podium/scoreboard view. */
  onOpenMonitor: () => void;
}

export default function QuickPlaySetupView({
  onCreateSession,
  onOpenMonitor,
  onBack,
  ...rest
}: QuickPlaySetupViewProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // Build the shareable student-join link the same way QuickPlayStudentView
  // expects it: /?session=CODE on the production origin.
  const joinUrl = useMemo(() => {
    if (typeof window === 'undefined' || !sessionCode) return '';
    return `${window.location.origin}/?session=${sessionCode}`;
  }, [sessionCode]);

  const handleComplete = async (result: WizardCompleteResult) => {
    try {
      const code = await onCreateSession(result.words, result.modes, title, notes);
      setSessionCode(code);
    } catch (err) {
      // Error toast is shown by the caller (App.tsx). If onCreateSession
      // throws we stay on the review step so the teacher can retry.
      console.error('[QuickPlaySetup] create session failed', err);
    }
  };

  const handleCopy = () => {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!joinUrl) return;
    const msg = title
      ? `Join "${title}" on Vocaband! ${joinUrl}`
      : `Join my Vocaband Quick Play session: ${joinUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handlePlayAnother = () => {
    setSessionCode(null);
    setTitle('');
    setNotes('');
    // Bumping resetKey remounts SetupWizard so its internal selectedWords
    // / selectedModes state resets to the defaults — otherwise the teacher
    // lands on step 3 with the previous session's selections still active.
    setResetKey(k => k + 1);
  };

  // ── Success screen ─────────────────────────────────────────────────────
  if (sessionCode) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen bg-background p-4 sm:p-6 flex items-center justify-center"
      >
        <div className="max-w-md w-full">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-primary/20 text-center space-y-6"
          >
            <motion.div
              initial={{ rotate: -180, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30"
            >
              <Check size={40} className="text-white" />
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-2xl sm:text-3xl font-black text-on-surface mb-2">
                Quick Play is live!
              </h2>
              <p className="text-on-surface-variant">
                Share the code with your students — they can join instantly from any phone.
              </p>
            </motion.div>

            {/* Details summary — matches CreateAssignment parity. */}
            {title && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-surface-container rounded-2xl p-4 space-y-1"
              >
                <div className="text-sm font-bold text-on-surface">{title}</div>
                <div className="flex items-center justify-center gap-3 text-sm text-on-surface-variant">
                  <div className="flex items-center gap-1">
                    <BookOpen size={14} />
                    <span>live session</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target size={14} />
                    <span>any mode</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Session code — same treatment as the class-code card on the
                assignment success screen, so the two flows feel identical. */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border-2 border-blue-100"
            >
              <div className="text-sm text-blue-700 mb-2 font-bold">Session code</div>
              <div className="text-3xl font-black text-blue-900 mb-4 tracking-wider">
                {sessionCode}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 py-3 bg-stone-100 text-stone-700 rounded-xl font-bold hover:bg-stone-200 transition-all flex items-center justify-center gap-2"
                  type="button"
                >
                  <Copy size={18} />
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
                <button
                  onClick={handleWhatsApp}
                  className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                  type="button"
                >
                  <Share2 size={18} />
                  WhatsApp
                </button>
              </div>
            </motion.div>

            {/* Primary — open the live monitor, secondary — play another. */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <button
                onClick={onOpenMonitor}
                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                type="button"
              >
                <QrCode size={18} />
                Open live podium
              </button>
              <button
                onClick={handlePlayAnother}
                className="flex-1 py-4 bg-stone-100 text-stone-700 rounded-2xl font-bold hover:bg-stone-200 transition-all"
                type="button"
              >
                Play another
              </button>
            </motion.div>

            <button
              onClick={onBack}
              className="text-xs text-stone-400 hover:text-stone-600 inline-flex items-center gap-1"
              type="button"
            >
              <ExternalLink size={12} />
              Back to dashboard
            </button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // ── Wizard ─────────────────────────────────────────────────────────────
  return (
    <SetupWizard
      key={resetKey}
      {...rest}
      mode="quick-play"
      onBack={onBack}
      onComplete={handleComplete}
      assignmentTitle={title}
      onTitleChange={setTitle}
      assignmentInstructions={notes}
      onInstructionsChange={setNotes}
    />
  );
}
