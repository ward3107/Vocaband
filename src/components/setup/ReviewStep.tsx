/**
 * ReviewStep — Step 3 of the unified setup wizard.
 *
 * Shows a summary card with selected words, modes, and stats.
 * Different action buttons based on mode:
 * - Quick Play: "Generate QR Code" (green gradient)
 * - Assignment: "Assign to Class" or "Update Assignment" (blue gradient)
 */

import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, BookOpen, Target, QrCode, Users } from 'lucide-react';
import { Word } from '../../data/vocabulary';
import { WizardMode, AssignmentData, getGameModeConfig } from './types';

export interface ReviewStepProps {
  mode: WizardMode;
  selectedWords: Word[];
  selectedModes: string[];
  onBack: () => void;
  onLaunch: () => void;
  onQuickStart?: () => void;
  assignmentTitle?: string;
  assignmentDeadline?: string;
  assignmentInstructions?: string;
  selectedClassName?: string;
  editingAssignment?: AssignmentData | null;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  mode,
  selectedWords,
  selectedModes,
  onBack,
  onLaunch,
  onQuickStart,
  assignmentTitle = '',
  assignmentDeadline = '',
  assignmentInstructions = '',
  selectedClassName = '',
  editingAssignment = null,
}) => {
  const isAssignment = mode === 'assignment';
  const isEditing = !!editingAssignment;

  const dbWordCount = selectedWords.filter(w => w.id >= 0).length;
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
        <button onClick={onBack} className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface font-bold">
          <ArrowLeft size={20} /> Back
        </button>
        <div className="text-sm font-bold text-on-surface-variant">Step 3 of 3</div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-black text-on-surface mb-2">
          {isAssignment ? 'Review assignment' : 'Review your selection'}
        </h2>
        <p className="text-on-surface-variant">
          {isAssignment ? 'Check everything before assigning' : 'Verify your selection'}
        </p>
      </div>

      {mode === 'quick-play' && onQuickStart && selectedWords.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 sm:p-6 shadow-xl text-white"
        >
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-black mb-1">Quick Start!</h3>
              <p className="text-white/80 text-xs sm:text-sm">
                {selectedWords.length} word{selectedWords.length > 1 ? 's' : ''} ready • {selectedModes.length} mode{selectedModes.length > 1 ? 's' : ''} selected
              </p>
            </div>
            <button
              onClick={onQuickStart}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-green-600 rounded-xl font-black hover:bg-white/90 transition-all shadow-lg flex items-center gap-1.5 sm:gap-2"
            >
              <QrCode size={16} />
              <span className="text-sm sm:text-base">Generate QR</span>
            </button>
          </div>
        </motion.div>
      )}

      <div className="bg-surface-container-lowest rounded-3xl shadow-xl border-2 border-surface-container-highest overflow-hidden">
        <div className="flex items-center justify-around p-4 sm:p-6 bg-surface-container border-b border-surface-container-highest">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <BookOpen className="text-primary" size={18} />
              <span className="text-2xl sm:text-3xl font-black text-on-surface">{selectedWords.length}</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-on-surface-variant">Word{selectedWords.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="w-px h-12 bg-surface-container-highest"></div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Target className="text-amber-500" size={18} />
              <span className="text-2xl sm:text-3xl font-black text-on-surface">{selectedModes.length}</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-on-surface-variant">Mode{selectedModes.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {isAssignment && (
          <div className="p-4 sm:p-6 border-b border-surface-container-highest space-y-3">
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Assignment Title</label>
              <p className="text-base font-bold text-on-surface mt-1">{assignmentTitle || 'Untitled Assignment'}</p>
            </div>

            {selectedClassName && (
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Class</label>
                <p className="text-base text-on-surface mt-1 flex items-center gap-2">
                  <Users size={16} className="text-on-surface-variant" />
                  {selectedClassName}
                </p>
              </div>
            )}

            {assignmentDeadline && (
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Deadline</label>
                <p className="text-base text-on-surface mt-1">
                  {new Date(assignmentDeadline).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            )}

            {assignmentInstructions && (
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Instructions</label>
                <p className="text-sm text-on-surface mt-1 line-clamp-2">{assignmentInstructions}</p>
              </div>
            )}
          </div>
        )}

        <div className="p-4 sm:p-6 border-b border-surface-container-highest">
          <h3 className="text-sm font-bold text-on-surface mb-3">Selected Words</h3>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {selectedWords.map(word => (
              <span
                key={word.id}
                className={`px-3 py-1.5 rounded-xl text-sm font-bold ${
                  word.id < 0
                    ? 'bg-amber-100 text-amber-800 border-2 border-amber-300'
                    : 'bg-primary-container text-on-primary-container border-2 border-primary/30'
                }`}
              >
                {word.english}
                {word.id < 0 && <span className="ml-1 text-xs">✨</span>}
              </span>
            ))}
          </div>
          {customWordCount > 0 && (
            <p className="text-xs text-amber-700 mt-2">✨ {customWordCount} custom word{customWordCount > 1 ? 's' : ''} (session-only)</p>
          )}
        </div>

        <div className="p-4 sm:p-6">
          <h3 className="text-sm font-bold text-on-surface mb-3">Game Modes</h3>
          <div className="flex flex-wrap gap-2">
            {modeBadges.map(badge => (
              <span
                key={badge!.id}
                className="px-3 py-1.5 bg-surface-container-high rounded-xl text-sm font-bold text-on-surface-variant flex items-center gap-1.5"
              >
                <span>{badge!.emoji}</span>
                <span>{badge!.name}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-4 bg-surface-container text-on-surface rounded-2xl font-bold hover:bg-surface-container-high border-2 border-outline-variant/20 transition-all"
        >
          ← Back
        </button>
        <button
          onClick={onLaunch}
          className={`flex-1 py-4 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 ${
            isAssignment
              ? 'signature-gradient'
              : 'bg-gradient-to-r from-green-500 to-emerald-600'
          }`}
        >
          {isAssignment ? (
            <>
              {isEditing ? 'Update Assignment' : 'Assign to Class'}
              <ArrowRight size={20} />
            </>
          ) : (
            <>
              <QrCode size={20} />
              Generate QR Code
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default ReviewStep;
