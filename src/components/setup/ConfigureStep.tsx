import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft, ArrowRight, Check, Plus, X,
} from 'lucide-react';
import { Word } from '../../data/vocabulary';
import { SentenceDifficulty, DIFFICULTY_CONFIG } from '../../constants/game';
import { GAME_MODE_LEVELS, ALL_GAME_MODE_IDS, WizardMode, AssignmentData } from './types';

// ── Assignment Templates ────────────────────────────────────────────────────
const ASSIGNMENT_TEMPLATES: { title: string; instructions: string; modes?: string[]; group: string }[] = [
  // Quick Practice
  { group: 'Quick Practice', title: 'Flashcard Review', instructions: 'Learn new words at your own pace with visual flashcards', modes: ['flashcards'] },
  { group: 'Quick Practice', title: 'Classic Quiz', instructions: 'Multiple-choice vocabulary quiz — pick the correct translation', modes: ['classic'] },
  { group: 'Quick Practice', title: 'Listening Practice', instructions: 'Listen to words and choose the correct answer — builds audio recognition', modes: ['listening'] },
  { group: 'Quick Practice', title: 'Matching Pairs', instructions: 'Connect words to their translations — drag-and-match style', modes: ['matching'] },
  { group: 'Quick Practice', title: 'True or False', instructions: 'Decide if translations are correct — quick comprehension check', modes: ['true-false'] },
  // Writing & Spelling
  { group: 'Writing & Spelling', title: 'Spelling Bee', instructions: 'Type the correct spelling — builds writing accuracy', modes: ['spelling'] },
  { group: 'Writing & Spelling', title: 'Word Scramble', instructions: 'Unscramble the letters to form the correct word', modes: ['scramble'] },
  { group: 'Writing & Spelling', title: 'Sentence Builder', instructions: 'Arrange words to build correct sentences — advanced writing practice', modes: ['sentence-builder'] },
  { group: 'Writing & Spelling', title: 'Letter Sounds', instructions: 'Practice phonics — identify words by their letter sounds', modes: ['letter-sounds'] },
  // Mixed Modes
  { group: 'Mixed Modes', title: 'Beginner Mix', instructions: 'Gentle start — flashcards, matching, and classic quiz', modes: ['flashcards', 'matching', 'classic', 'listening'] },
  { group: 'Mixed Modes', title: 'Full Practice', instructions: 'All core game modes for thorough vocabulary practice', modes: ['flashcards', 'matching', 'classic', 'listening', 'true-false', 'spelling', 'reverse', 'scramble', 'letter-sounds'] },
  { group: 'Mixed Modes', title: 'Challenge Mode', instructions: 'Every mode including sentence builder — for advanced students', modes: ['flashcards', 'matching', 'classic', 'listening', 'true-false', 'spelling', 'reverse', 'scramble', 'letter-sounds', 'sentence-builder'] },
  { group: 'Mixed Modes', title: 'Reading & Listening', instructions: 'Focus on receptive skills — flashcards, listening, and true/false', modes: ['flashcards', 'listening', 'true-false'] },
  { group: 'Mixed Modes', title: 'Writing Focus', instructions: 'Productive skills — spelling, scramble, reverse, and sentence builder', modes: ['spelling', 'scramble', 'reverse', 'sentence-builder'] },
  // Assessment
  { group: 'Assessment', title: 'Quick Check', instructions: 'Short vocabulary check — classic quiz and true/false only', modes: ['classic', 'true-false'] },
  { group: 'Assessment', title: 'Spelling Test', instructions: 'Written assessment — spelling and word scramble', modes: ['spelling', 'scramble'] },
  { group: 'Assessment', title: 'Listening Exam', instructions: 'Audio-based assessment — listening and letter sounds', modes: ['listening', 'letter-sounds'] },
  { group: 'Assessment', title: 'Comprehensive Test', instructions: 'Full assessment across all modes — test overall vocabulary mastery', modes: ['classic', 'listening', 'spelling', 'matching', 'true-false', 'reverse'] },
  // Homework
  { group: 'Homework', title: 'Weekly Homework', instructions: 'Complete all activities at home — practice at your own pace', modes: ['flashcards', 'classic', 'spelling', 'matching'] },
  { group: 'Homework', title: 'Review & Practice', instructions: 'Self-study assignment — start with flashcards then test yourself', modes: ['flashcards', 'classic', 'true-false', 'listening'] },
  { group: 'Homework', title: 'XP Challenge', instructions: 'Earn as many XP points as possible — compete on the leaderboard!', modes: ['classic', 'spelling', 'matching', 'true-false', 'reverse', 'scramble'] },
];

// ── Props ───────────────────────────────────────────────────────────────────
interface ConfigureStepProps {
  mode: WizardMode;
  selectedModes: string[];
  onModesChange: (modes: string[]) => void;
  onNext: () => void;
  onBack: () => void;

  // Assignment-only
  assignmentTitle?: string;
  onTitleChange?: (title: string) => void;
  assignmentDeadline?: string;
  onDeadlineChange?: (date: string) => void;
  assignmentInstructions?: string;
  onInstructionsChange?: (instructions: string) => void;
  assignmentSentences?: string[];
  onSentencesChange?: (sentences: string[]) => void;
  sentenceDifficulty?: SentenceDifficulty;
  onSentenceDifficultyChange?: (level: SentenceDifficulty) => void;
  selectedWords?: Word[];
  editingAssignment?: AssignmentData | null;
}

// ── Component ───────────────────────────────────────────────────────────────
export const ConfigureStep: React.FC<ConfigureStepProps> = ({
  mode,
  selectedModes,
  onModesChange,
  onNext,
  onBack,

  // Assignment-only
  assignmentTitle = '',
  onTitleChange,
  assignmentDeadline = '',
  onDeadlineChange,
  assignmentInstructions = '',
  onInstructionsChange,
  assignmentSentences = [],
  onSentencesChange,
  sentenceDifficulty = 1,
  onSentenceDifficultyChange,
  selectedWords: _selectedWords = [],
  editingAssignment: _editingAssignment = null,
}) => {
  void _selectedWords;
  void _editingAssignment;
  // Sentence builder local state
  const [customSentenceInput, setCustomSentenceInput] = useState('');
  const [editingSentenceIndex, setEditingSentenceIndex] = useState<number | null>(null);

  const isAssignment = mode === 'assignment';

  // Toggle a single game mode on/off
  const toggleGameMode = (modeId: string) => {
    onModesChange(
      selectedModes.includes(modeId)
        ? selectedModes.filter(m => m !== modeId)
        : [...selectedModes, modeId],
    );
  };

  // Select-all toggle: if all selected, collapse to one; otherwise select all
  const handleSelectAllToggle = () => {
    if (selectedModes.length >= ALL_GAME_MODE_IDS.length) {
      onModesChange(['flashcards']);
    } else {
      onModesChange([...ALL_GAME_MODE_IDS]);
    }
  };

  // Template selector — assignment-only helper
  const applyTemplate = (templateTitle: string) => {
    const t = ASSIGNMENT_TEMPLATES.find(tp => tp.title === templateTitle);
    if (!t) return;
    onTitleChange?.(t.title);
    onInstructionsChange?.(t.instructions);
    if (t.modes) onModesChange(t.modes);
  };

  // Can proceed?
  const canProceed = isAssignment
    ? (assignmentTitle?.trim()?.length ?? 0) > 0 && selectedModes.length > 0
    : true; // Quick Play can always skip

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface font-bold transition-colors"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="text-sm font-bold text-on-surface-variant">
          Step 2 of 3
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-black text-on-surface mb-2">
          {isAssignment ? 'Configure assignment' : 'Choose game modes (optional)'}
        </h2>
        {isAssignment && (
          <p className="text-on-surface-variant">
            Add details and choose game modes
          </p>
        )}
      </div>

      {/* ── Assignment-only: details section ─────────────────────────────── */}
      {isAssignment && (
        <div className="space-y-4">
          {/* Combined Template Selector */}
          <div>
            <label className="block text-sm font-bold text-on-surface mb-2">
              Quick template
            </label>
            <select
              value=""
              onChange={(e) => applyTemplate(e.target.value)}
              className="w-full p-3 rounded-2xl border-2 border-outline-variant/30 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none bg-surface-container-high text-on-surface mb-4 cursor-pointer appearance-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4l5 5 5-5z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.75rem center',
                paddingRight: '2.5rem',
              }}
            >
              <option value="">{String.fromCodePoint(0x1F4CB)} Choose a template...</option>
              {(() => {
                const groups = [...new Set(ASSIGNMENT_TEMPLATES.map(t => t.group))];
                return groups.map(group => (
                  <optgroup key={group} label={group}>
                    {ASSIGNMENT_TEMPLATES.filter(t => t.group === group).map(t => (
                      <option key={t.title} value={t.title}>{t.title}</option>
                    ))}
                  </optgroup>
                ));
              })()}
            </select>

            {/* Editable Title Field */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-on-surface mb-2">
                Assignment title <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={assignmentTitle}
                onChange={(e) => onTitleChange?.(e.target.value)}
                placeholder="e.g., Fruits Vocabulary - Unit 5"
                className="w-full p-4 rounded-2xl border-2 border-outline-variant/30 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/50 transition-all"
              />
            </div>

            {/* Editable Instructions Field */}
            <div>
              <label className="block text-sm font-bold text-on-surface mb-2">
                Instructions for students (optional)
              </label>
              <textarea
                id="instructions-textarea"
                value={assignmentInstructions}
                onChange={(e) => onInstructionsChange?.(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="Add a note for your students... or choose a template above"
                rows={2}
                className="w-full p-4 rounded-2xl border-2 border-outline-variant/30 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/50 transition-all resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Game Modes by Level ───────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-bold text-on-surface">
            Game modes
          </label>
          <button
            onClick={handleSelectAllToggle}
            className="text-xs font-bold text-primary hover:text-primary-dim transition-colors"
          >
            {selectedModes.length >= ALL_GAME_MODE_IDS.length ? 'Clear all' : 'Select all'}
          </button>
        </div>

        {/* Compact grid layout — 5 columns for all modes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Object.values(GAME_MODE_LEVELS).flat().map((gameMode) => {
            const isSelected = selectedModes.includes(gameMode.id);
            return (
              <button
                key={gameMode.id}
                onClick={() => toggleGameMode(gameMode.id)}
                className={`relative p-3 rounded-2xl border-2 transition-all duration-300 text-center ${
                  isSelected
                    ? 'border-primary bg-primary shadow-xl shadow-primary/40 scale-105'
                    : 'border-outline/20 bg-surface-container hover:border-outline/40 hover:bg-surface-container-high hover:shadow-md hover:scale-[1.02]'
                }`}
              >
                <div className={`text-2xl mb-1.5 transition-transform duration-300 ${isSelected ? 'scale-110' : 'scale-100'}`}>{gameMode.emoji}</div>
                <div className={`text-xs font-bold transition-colors ${isSelected ? 'text-white' : 'text-on-surface-variant'}`}>{gameMode.name}</div>
                {isSelected && (
                  <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-lg border-2 border-primary animate-bounce-in">
                    <Check size={14} className="text-primary" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Difficulty indicators (compact legend) */}
        <div className="flex flex-wrap gap-4 text-xs text-on-surface-variant pt-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span>Beginner</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-violet-500"></div>
            <span>Intermediate</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            <span>Advanced</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
            <span>Mastery</span>
          </div>
        </div>
      </div>

      {/* ── Sentence Difficulty — only when sentence-builder is selected ──── */}
      {selectedModes.includes('sentence-builder') && (
        <div className="space-y-3">
          <label className="block text-sm font-bold text-on-surface">
            Sentence Difficulty Level
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([1, 2, 3, 4] as SentenceDifficulty[]).map((level) => {
              const config = DIFFICULTY_CONFIG[level];
              const isSelected = sentenceDifficulty === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => onSentenceDifficultyChange?.(level)}
                  className={`relative p-3 rounded-lg border-2 transition-all duration-300 text-center ${
                    isSelected
                      ? 'border-primary bg-primary shadow-md scale-105'
                      : 'border-outline/20 bg-surface-container hover:border-outline/40 hover:bg-surface-container-high'
                  }`}
                >
                  <div className="text-lg mb-1">{config.emoji}</div>
                  <div className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-on-surface-variant'}`}>{config.label}</div>
                  <div className={`text-xs ${isSelected ? 'text-white/80' : 'text-on-surface-variant'}`}>{config.description}</div>
                  {isSelected && (
                    <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-white flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Add Custom Sentence */}
          <div className="mt-4 space-y-2">
            <label className="block text-xs font-bold text-on-surface-variant">
              Add Your Own Sentences
            </label>
            <div className="flex gap-2">
              <textarea
                value={customSentenceInput}
                onChange={(e) => setCustomSentenceInput(e.target.value)}
                placeholder="Write or paste your sentence here..."
                rows={2}
                className="flex-1 px-4 py-3 text-sm rounded-xl border-2 border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none resize-none"
              />
              <button
                onClick={() => {
                  if (customSentenceInput.trim()) {
                    onSentencesChange?.([...assignmentSentences, customSentenceInput.trim()]);
                    setCustomSentenceInput('');
                  }
                }}
                disabled={!customSentenceInput.trim()}
                className="px-4 py-2 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2 self-end"
              >
                <Plus size={18} />
                Add
              </button>
            </div>
          </div>

          {/* Sentence Preview & Editor */}
          {assignmentSentences.length > 0 && (
            <div className="mt-3">
              <label className="block text-xs font-bold text-on-surface-variant mb-2">
                Generated Sentences ({assignmentSentences.length}) — hover to preview, click to edit
              </label>
              <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                {assignmentSentences.map((sentence, idx) => {
                  const isInFirstHalf = idx < Math.ceil(assignmentSentences.length / 2);
                  return (
                    <div
                      key={idx}
                      onClick={() => setEditingSentenceIndex(idx)}
                      className="relative flex items-center gap-2 px-3 py-2 rounded-lg border border-outline-variant/30 bg-surface-container-lowest hover:border-primary/50 hover:bg-surface-container-high cursor-pointer transition-all group"
                    >
                      <span className="text-xs text-on-surface-variant font-mono w-5 shrink-0">{idx + 1}</span>
                      <span className="flex-1 text-sm text-on-surface truncate group-hover:text-primary transition-colors">
                        {sentence}
                      </span>
                      {/* Hover preview tooltip — smart positioning */}
                      <div className={`hidden group-hover:block z-10 w-80 sm:w-96 bg-surface rounded-xl shadow-xl border-2 border-outline-variant/30 p-3 pointer-events-none ${
                        isInFirstHalf ? 'absolute top-full left-0 mt-2' : 'absolute bottom-full left-0 mb-2'
                      }`}>
                        <div className="text-sm text-on-surface break-words" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {sentence}
                        </div>
                        <div className={`absolute ${isInFirstHalf ? 'bottom-full left-4 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-surface -mt-px' : 'top-full left-4 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-surface -mt-px'}`} />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = assignmentSentences.filter((_, i) => i !== idx);
                          onSentencesChange?.(updated);
                        }}
                        className="text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        title="Remove sentence"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sentence Edit Modal */}
          {editingSentenceIndex !== null && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingSentenceIndex(null)}>
              <div className="bg-surface rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-on-surface mb-4">
                  Edit Sentence #{editingSentenceIndex + 1}
                </h3>
                <textarea
                  autoFocus
                  value={assignmentSentences[editingSentenceIndex]}
                  onChange={(e) => {
                    const updated = [...assignmentSentences];
                    updated[editingSentenceIndex] = e.target.value;
                    onSentencesChange?.(updated);
                  }}
                  rows={3}
                  className="w-full px-4 py-3 text-base rounded-xl border-2 border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none resize-none"
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setEditingSentenceIndex(null)}
                    className="flex-1 py-3 bg-surface-container text-on-surface rounded-xl font-bold hover:bg-surface-container-high border-2 border-outline-variant/20 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setEditingSentenceIndex(null)}
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Schedule (Assignment-only) ────────────────────────────────────── */}
      {isAssignment && (
        <div className="space-y-3">
          <label className="block text-sm font-bold text-on-surface">
            Schedule (optional)
          </label>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1">Deadline</label>
            <input
              type="date"
              value={assignmentDeadline}
              onChange={(e) => onDeadlineChange?.(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full p-3 rounded-xl border-2 border-outline-variant/30 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none bg-surface-container-lowest text-on-surface transition-all cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="flex-1 py-4 bg-surface-container text-on-surface rounded-2xl font-bold hover:bg-surface-container-high border-2 border-outline-variant/20 transition-all"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex-1 py-4 signature-gradient text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none hover:shadow-xl transition-all flex items-center justify-center gap-2"
        >
          {isAssignment ? (
            <>
              Review
              <ArrowRight size={20} />
            </>
          ) : (
            'Skip to QR'
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default ConfigureStep;
