/**
 * ReviewStep — Step 3 of the unified setup wizard.
 *
 * Shows a summary card with selected words, modes, and stats.
 * Different action buttons based on mode:
 * - Quick Play: "Generate QR Code" (green gradient)
 * - Assignment: "Assign to Class" or "Update Assignment" (blue gradient)
 */

import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, BookOpen, Bookmark, Target, QrCode, Users, Sparkles } from 'lucide-react';
import { Word } from '../../data/vocabulary';
import { WizardMode, AssignmentData, getGameModeConfig } from './types';
import type { GeneratedLesson } from '../ai-lesson-builder/AiLessonBuilder';

export interface ReviewStepProps {
  mode: WizardMode;
  selectedWords: Word[];
  selectedModes: string[];
  onBack: () => void;
  onLaunch: () => void;
  onQuickStart?: () => void;
  onEditWords?: () => void;
  onEditModes?: () => void;
  /** When provided, ReviewStep shows a "Save as template" checkbox.
   *  Toggling it on and clicking Launch fires this callback BEFORE
   *  `onLaunch` so the template captures the wizard state, not whatever
   *  the parent does after the launch (which usually clears state). */
  onSaveTemplate?: () => void;
  assignmentTitle?: string;
  assignmentDeadline?: string;
  assignmentInstructions?: string;
  selectedClassName?: string;
  editingAssignment?: AssignmentData | null;
  /** AI-generated lesson data (if any) — generated in ConfigureStep */
  aiGeneratedLesson?: GeneratedLesson | null;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  mode,
  selectedWords,
  selectedModes,
  onBack,
  onLaunch,
  onQuickStart,
  onEditWords,
  onEditModes,
  onSaveTemplate,
  assignmentTitle = '',
  assignmentDeadline = '',
  assignmentInstructions = '',
  selectedClassName = '',
  editingAssignment = null,
  aiGeneratedLesson,
}) => {
  const { language } = useLanguage();
  const t = teacherWizardsT[language];
  // Ref for launch button (auto-scroll)
  const launchButtonRef = useRef<HTMLButtonElement>(null);

  // "Save as template" toggle.  Hidden when we're editing an existing
  // assignment (templates are created from new tasks; editing an old
  // one would just duplicate it).
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const showSaveToggle = !!onSaveTemplate && !editingAssignment;

  // Auto-scroll-to-launch-button removed. It fought the SetupWizard's
  // scroll-to-top on step change: SetupWizard scrolled to top of step 3,
  // then 400 ms later this effect yanked the page back down to the
  // Launch button — producing a jarring up-then-down jump. The Launch
  // button is reachable by normal scroll; the wizard-level scroll-to-top
  // now handles step-mount behavior uniformly.

  const isQuickPlay = mode === 'quick-play';
  const isAssignment = mode === 'assignment';
  const isEditing = !!editingAssignment;

  const customWordCount = selectedWords.filter(w => w.id < 0).length;

  const modeBadges = selectedModes.map(modeId => {
    const config = getGameModeConfig(modeId);
    return config ? { id: modeId, name: config.name, emoji: config.emoji } : null;
  }).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="signature-gradient text-white px-3 py-2 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2">
            <ArrowLeft size={16} /> {t.back}
          </button>
          {isQuickPlay && (
            <div className="flex gap-2">
              <button
                onClick={onEditWords}
                className="px-3 py-2 bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] rounded-xl font-bold hover:opacity-80 transition-all flex items-center gap-1 border-2 border-[var(--vb-border)] text-sm"
              >
                <BookOpen size={14} />
                <span className="hidden sm:inline">{t.editWordsFull}</span>
                <span className="sm:hidden">{t.editWordsShort}</span>
              </button>
              <button
                onClick={onEditModes}
                className="px-3 py-2 bg-[var(--vb-surface-alt)] text-[var(--vb-text-secondary)] rounded-xl font-bold hover:opacity-80 transition-all flex items-center gap-1 border-2 border-[var(--vb-border)] text-sm"
              >
                <Target size={14} />
                <span className="hidden sm:inline">{t.editModesFull}</span>
                <span className="sm:hidden">{t.editModesShort}</span>
              </button>
            </div>
          )}
        </div>
        <div className="text-sm font-bold text-[var(--vb-text-secondary)]">Step 3 of 3</div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-black text-[var(--vb-text-primary)] mb-2">
          {isAssignment ? 'Review assignment' : 'Review your selection'}
        </h2>
        <p className="text-[var(--vb-text-secondary)]">
          {isAssignment ? 'Check everything before assigning' : 'Verify your selection'}
        </p>
      </div>

      {/* On desktop for Quick Play, hero + summary sit side-by-side so the
          whole Review fits a 1080p viewport without scrolling. Mobile keeps
          the vertical stack. */}
      <div className={isQuickPlay && selectedWords.length > 0
        ? 'lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start space-y-6 lg:space-y-0'
        : 'space-y-6'}>

      {mode === 'quick-play' && onQuickStart && selectedWords.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-3xl p-6 shadow-2xl"
        >
          {/* Animated background decoration */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-32 h-32 bg-[var(--vb-surface)] rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-[var(--vb-surface)] rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          </div>

          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white/40 rounded-full"
                initial={{ y: '100%', x: `${20 + i * 15}%`, opacity: 0 }}
                animate={{ y: '-10%', opacity: [0, 1, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.5, ease: 'easeInOut' }}
              />
            ))}
          </div>

          <div className="relative z-10 text-center">
            {/* Icon with animation */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
              className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-2xl sm:rounded-3xl mb-3 sm:mb-4 shadow-lg"
            >
              <Sparkles size={32} className="text-yellow-300 sm:w-10 sm:h-10" strokeWidth={2.5} />
            </motion.div>

            <h3 className="text-xl sm:text-2xl font-black text-white mb-2 drop-shadow-lg">
              {t.readyToPlay}
            </h3>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-white/90 text-sm sm:text-base mb-4"
            >
              {t.loadedSummary(selectedWords.length, selectedModes.length)}
            </motion.p>

            {/* Stats pills */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-2 flex-wrap"
            >
              <div className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-bold border border-white/30">
                {t.wordsPill(selectedWords.length)}
              </div>
              <div className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-bold border border-white/30">
                {t.modesPill(selectedModes.length)}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}

      <div className="bg-[var(--vb-surface-alt)]-lowest rounded-3xl shadow-xl border-2 border-surface-container-highest overflow-hidden">
        <div className="flex items-center justify-around p-4 sm:p-6 bg-[var(--vb-surface-alt)] border-b border-surface-container-highest">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <BookOpen className="text-primary" size={18} />
              <span className="text-2xl sm:text-3xl font-black text-[var(--vb-text-primary)]">{selectedWords.length}</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-[var(--vb-text-secondary)]">Word{selectedWords.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="w-px h-12 bg-[var(--vb-surface-alt)]-highest"></div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Target className="text-amber-500" size={18} />
              <span className="text-2xl sm:text-3xl font-black text-[var(--vb-text-primary)]">{selectedModes.length}</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-[var(--vb-text-secondary)]">Mode{selectedModes.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {isAssignment && (
          <div className="p-4 sm:p-6 border-b border-surface-container-highest space-y-3">
            <div>
              <label className="text-xs font-bold text-[var(--vb-text-secondary)] uppercase tracking-wide">Assignment Title</label>
              <p className="text-base font-bold text-[var(--vb-text-primary)] mt-1">{assignmentTitle || 'Untitled Assignment'}</p>
            </div>

            {selectedClassName && (
              <div>
                <label className="text-xs font-bold text-[var(--vb-text-secondary)] uppercase tracking-wide">Class</label>
                <p className="text-base text-[var(--vb-text-primary)] mt-1 flex items-center gap-2">
                  <Users size={16} className="text-[var(--vb-text-secondary)]" />
                  {selectedClassName}
                </p>
              </div>
            )}

            {assignmentDeadline && (
              <div>
                <label className="text-xs font-bold text-[var(--vb-text-secondary)] uppercase tracking-wide">Deadline</label>
                <p className="text-base text-[var(--vb-text-primary)] mt-1">
                  {new Date(assignmentDeadline).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            )}

            {assignmentInstructions && (
              <div>
                <label className="text-xs font-bold text-[var(--vb-text-secondary)] uppercase tracking-wide">Instructions</label>
                <p className="text-sm text-[var(--vb-text-primary)] mt-1 line-clamp-2">{assignmentInstructions}</p>
              </div>
            )}
          </div>
        )}

        <div className="p-4 sm:p-6 border-b border-surface-container-highest">
          <h3 className="text-sm font-bold text-[var(--vb-text-primary)] mb-3">Selected Words</h3>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {selectedWords.map(word => (
              <span
                key={word.id}
                className={`px-3 py-1.5 rounded-xl text-sm font-bold ${
                  word.id < 0
                    ? 'bg-amber-100 text-amber-800 border-2 border-amber-300'
                    : 'bg-blue-100 text-blue-900 border-2 border-primary/30'
                }`}
              >
                {word.english}
                {word.id < 0 && <span className="ml-1 text-xs">✨</span>}
              </span>
            ))}
          </div>
          {customWordCount > 0 && (
            <p className="text-xs text-amber-700 mt-2">{t.customWordsBadge(customWordCount)}</p>
          )}
        </div>

        <div className="p-4 sm:p-6">
          <h3 className="text-sm font-bold text-[var(--vb-text-primary)] mb-3">Game Modes</h3>
          <div className="flex flex-wrap gap-2">
            {modeBadges.map(badge => (
              <span
                key={badge!.id}
                className="px-3 py-1.5 bg-[var(--vb-surface-alt)]-high rounded-xl text-sm font-bold text-[var(--vb-text-secondary)] flex items-center gap-1.5"
              >
                <span>{badge!.emoji}</span>
                <span>{badge!.name}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
      </div>

      {/* "Save as template" toggle.  Sits above the launch button so the
          teacher sees it just before they tap Launch — that's the right
          moment to remember "I'll want to reuse this".  Hidden during
          edit-mode (templates are created from new tasks). */}
      {showSaveToggle && (
        <label
          className={`flex items-start gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-colors ${
            saveAsTemplate
              ? 'border-indigo-300 bg-indigo-50'
              : 'border-[var(--vb-border)] bg-[var(--vb-surface)] hover:border-[var(--vb-text-muted)]'
          }`}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        >
          <input
            type="checkbox"
            checked={saveAsTemplate}
            onChange={(e) => setSaveAsTemplate(e.target.checked)}
            className="w-5 h-5 mt-0.5 accent-indigo-600 cursor-pointer"
          />
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-sm font-bold text-[var(--vb-text-primary)]">
              <Bookmark size={14} className="text-indigo-600" />
              {t.saveAsTemplateLabel}
            </div>
            <p className="text-xs text-[var(--vb-text-muted)] mt-0.5">
              Reuse this exact task in one tap, AND save these words
              under "Saved Groups" so future assignments can pick them up.
            </p>
          </div>
        </label>
      )}

      {/* Mobile spacer so the summary doesn't hide behind the sticky
          action bar below.  Desktop keeps the inline layout because the
          Review step is short enough to fit in a laptop viewport. */}
      <div className="sm:hidden h-24" />

      {/* Primary action row — sticky at the bottom on phones so teachers
          always see the "Assign to Class" / "Generate QR Code" button
          without scrolling.  On sm+ screens it sits inline where it
          used to.  The gradient-to-transparent fade under it keeps the
          summary text from butting up against the solid button bar. */}
      <div className="flex gap-3 fixed sm:static bottom-0 inset-x-0 sm:inset-auto z-30 px-4 sm:px-0 bg-gradient-to-t sm:bg-none from-white via-white/95 to-transparent pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 sm:pt-0 sm:pb-0">
        <button
          onClick={onBack}
          className="flex-1 py-4 bg-[var(--vb-surface-alt)] text-[var(--vb-text-primary)] rounded-2xl font-bold hover:opacity-80 border-2 border-[var(--vb-border)] transition-all"
        >
          ← {t.back}
        </button>
        <button
          ref={launchButtonRef}
          onClick={() => {
            // Save BEFORE launching — `onLaunch` typically clears the
            // wizard state in the parent, so by the time it returns the
            // snapshot SetupWizard would build is empty.
            if (saveAsTemplate && onSaveTemplate) {
              onSaveTemplate();
            }
            onLaunch();
          }}
          className={`flex-1 py-4 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 ${
            isAssignment
              ? 'signature-gradient'
              : 'bg-gradient-to-r from-green-500 to-emerald-600'
          }`}
        >
          {isAssignment ? (
            <>
              {isEditing ? t.updateAssignment : t.assignToClass}
              <ArrowRight size={20} />
            </>
          ) : (
            <>
              <QrCode size={20} />
              {t.generateQrCode}
            </>
          )}
        </button>
      </div>

      {/* AI Generated Lesson Preview */}
      {aiGeneratedLesson && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-fuchsia-50 to-violet-50 rounded-2xl p-4 sm:p-6 border-2 border-fuchsia-200"
        >
          <h3 className="text-sm font-bold text-fuchsia-900 mb-3 flex items-center gap-2">
            <span>📖</span> Reading Text ({aiGeneratedLesson.wordCount} words)
          </h3>
          <p className="text-sm text-[var(--vb-text-secondary)] mb-4 line-clamp-4">{aiGeneratedLesson.text}</p>

          {aiGeneratedLesson.questions.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-[var(--vb-text-secondary)] mb-2">Questions ({aiGeneratedLesson.questions.length})</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {aiGeneratedLesson.questions.slice(0, 5).map((q, i) => (
                  <div key={i} className="text-xs text-[var(--vb-text-secondary)]">
                    <span className="font-semibold">Q{i + 1}:</span> {q.question}
                  </div>
                ))}
                {aiGeneratedLesson.questions.length > 5 && (
                  <p className="text-xs text-[var(--vb-text-muted)]">...and {aiGeneratedLesson.questions.length - 5} more</p>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default ReviewStep;
