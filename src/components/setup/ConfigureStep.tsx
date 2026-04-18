import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, ArrowRight, Check, Plus, X, Sparkles, Loader2, Calendar,
} from 'lucide-react';
import { Word } from '../../data/vocabulary';
import { SentenceDifficulty, DIFFICULTY_CONFIG } from '../../constants/game';
import { supabase } from '../../core/supabase';
import { GAME_MODE_LEVELS, ALL_GAME_MODE_IDS, WizardMode, AssignmentData, getGameModeConfig } from './types';
import { DateTimePicker } from '../DateTimePicker';

// ── Derive assignment meta from selected modes ───────────────────────────────
// The old "Quick template" UI forced teachers to pick a preset before
// touching modes. Reversing that: teachers pick modes first, we derive a
// sensible title + instructions for them, and they can edit afterwards
// if they want something custom. Signature returns exactly the fields
// ConfigureStep fills in so the call-site stays dumb.
interface DerivedMeta {
  title: string;
  instructions: string;
}

// Hand-curated combos first — these recognise intentional picks like
// "Spelling + Scramble = Spelling Focus". Fallback below handles any
// other combination by naming the first 2-3 modes.
const COMBO_META: { match: (ids: string[]) => boolean; meta: DerivedMeta }[] = [
  { match: ids => ids.length === 1 && ids[0] === 'flashcards',     meta: { title: 'Flashcard Review',    instructions: 'Flip cards at your own pace to learn the new words.' } },
  { match: ids => ids.length === 1 && ids[0] === 'classic',        meta: { title: 'Classic Quiz',        instructions: 'Read each word and pick the right translation.' } },
  { match: ids => ids.length === 1 && ids[0] === 'listening',      meta: { title: 'Listening Practice',  instructions: 'Listen carefully — the English text is hidden!' } },
  { match: ids => ids.length === 1 && ids[0] === 'matching',       meta: { title: 'Matching Pairs',      instructions: 'Tap the pairs to connect English with the translation.' } },
  { match: ids => ids.length === 1 && ids[0] === 'true-false',     meta: { title: 'True or False',       instructions: 'Decide if each translation is correct. Quick reflexes win.' } },
  { match: ids => ids.length === 1 && ids[0] === 'spelling',       meta: { title: 'Spelling Practice',   instructions: 'Type each word exactly as you hear it.' } },
  { match: ids => ids.length === 1 && ids[0] === 'scramble',       meta: { title: 'Word Scramble',       instructions: 'Unscramble the letters into the correct word.' } },
  { match: ids => ids.length === 1 && ids[0] === 'reverse',        meta: { title: 'Reverse Translate',   instructions: 'See the translation, pick the English word.' } },
  { match: ids => ids.length === 1 && ids[0] === 'letter-sounds',  meta: { title: 'Letter Sounds',       instructions: 'Hear each letter one by one, then spell the word.' } },
  { match: ids => ids.length === 1 && ids[0] === 'sentence-builder', meta: { title: 'Sentence Builder',  instructions: 'Arrange the words to form the correct sentence.' } },

  // Multi-mode combos teachers commonly pick:
  { match: ids => ids.length === 2 && new Set(ids).has('spelling') && new Set(ids).has('scramble'),
    meta: { title: 'Spelling Focus',     instructions: 'Practice writing each word two ways — straight spelling and unscrambling.' } },
  { match: ids => ids.length === 3 && ['flashcards','classic','matching'].every(m => ids.includes(m)),
    meta: { title: 'Quick Mix',          instructions: 'Learn with Flashcards, then test yourself with Classic and Matching.' } },
  { match: ids => ids.length === 4 && ['flashcards','classic','spelling','matching'].every(m => ids.includes(m)),
    meta: { title: 'Weekly Homework',    instructions: 'Complete all four activities at home: flip, quiz, type, and match.' } },
  { match: ids => ids.length >= ALL_GAME_MODE_IDS.length,
    meta: { title: 'Full Practice',      instructions: 'Work through every game mode for complete mastery.' } },
];

function deriveAssignmentMeta(modes: string[]): DerivedMeta {
  if (modes.length === 0) return { title: '', instructions: '' };
  const combo = COMBO_META.find(c => c.match(modes));
  if (combo) return combo.meta;
  // Generic fallback — name the first couple modes in the title.
  const names = modes.map(id => getGameModeConfig(id)?.name ?? id).slice(0, 3);
  const suffix = modes.length > 3 ? ` + ${modes.length - 3} more` : '';
  return {
    title: `${names.join(' + ')}${suffix} Practice`,
    instructions: `A quick set using ${modes.length} game mode${modes.length === 1 ? '' : 's'}.`,
  };
}

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
  selectedWords = [],
  editingAssignment: _editingAssignment = null,
}) => {
  void _editingAssignment;

  // Ref on the Next button is kept for programmatic focus only (e.g.
  // accessibility announce on step mount), never for auto-scrolling.
  // Both of the old setTimeout-based scrollIntoView effects were
  // removed — they fought the SetupWizard's scroll-to-top on step
  // change and produced the "page jumps up, then down" UX. The
  // templateSelectorRef was also removed because the Quick Template
  // grid it targeted no longer exists.
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  // Sentence builder local state
  const [customSentenceInput, setCustomSentenceInput] = useState('');
  const [editingSentenceIndex, setEditingSentenceIndex] = useState<number | null>(null);

  // Cleanup on unmount: close any open modals/overlays
  useEffect(() => {
    return () => { setEditingSentenceIndex(null); };
  }, []);

  // AI sentence generation state — gated by ANTHROPIC_API_KEY + ai_allowlist
  const [aiEnabled, setAiEnabled] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  useEffect(() => {
    const checkAI = async () => {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) {
          console.warn('[AI features] skipping /api/features call: no Supabase session token on mount');
          return;
        }
        const apiUrl = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || '';
        console.log('[AI features] checking /api/features at', apiUrl);
        // ?debug=1 makes the server include a `reason` field when aiSentences
        // is false, so we can log the exact rejection cause to the console
        // instead of the user staring at a missing button with no explanation.
        const res = await fetch(`${apiUrl}/api/features?debug=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        console.log('[AI features] response:', data);
        if (data.aiSentences === true) {
          console.log('[AI features] enabled for', data.email || 'current user');
        } else {
          console.warn('[AI features] disabled —', data.reason || 'no reason returned', data);
        }
        setAiEnabled(data.aiSentences === true);
      } catch (err) {
        console.warn('[AI features] /api/features fetch threw — button will stay hidden', err);
      }
    };
    checkAI();
  }, []);

  const generateAISentences = async () => {
    if (selectedWords.length === 0) return;
    setIsGeneratingAI(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error('No auth token');
      const apiUrl = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || '';
      const words = selectedWords.map(w => w.english).filter(Boolean);
      const res = await fetch(`${apiUrl}/api/generate-sentences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ words, difficulty: sentenceDifficulty }),
      });
      if (!res.ok) {
        // Previously the error was swallowed silently, leaving the
        // teacher to wonder why nothing happened after clicking
        // "Generate". Now surface the actual HTTP status + server
        // message so the console/toast names the problem (401 / 403 /
        // 503 / 500) and we can diagnose without Render log diving.
        let reason = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.error) reason = `${body.error}${body.message ? ` — ${body.message}` : ''}`;
        } catch { /* body wasn't JSON */ }
        throw new Error(reason);
      }
      const { sentences } = await res.json();
      onSentencesChange?.(sentences);
    } catch (err) {
      console.warn('[AI sentences] generation failed:', err);
      // Keep whatever template sentences the caller already has, but
      // tell the teacher why the AI path didn't produce output so
      // they can fix it (allowlist, API key, token) instead of staring
      // at an unmoved sentence list and thinking the button is broken.
      const msg = err instanceof Error ? err.message : 'AI generation failed';
      // No toast handler in scope here — log a structured warning that
      // devtools + Sentry will catch. Upstream consumers can wire a
      // toast via props in a follow-up if we want user-visible errors.
      console.warn(`[AI sentences] ${msg}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

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

  // Auto-derive title + instructions from the selected modes. Runs the
  // first time the teacher picks modes AND every subsequent time they
  // change the selection — UNLESS they've typed their own title (which
  // flips the ref below). Typing into the title field later never gets
  // stomped by mode changes because titleManuallyEditedRef stays true
  // for the rest of the session once the teacher touches the field.
  const titleManuallyEditedRef = useRef(false);
  const instructionsManuallyEditedRef = useRef(false);
  const lastAutoTitleRef = useRef('');
  const lastAutoInstrRef = useRef('');

  useEffect(() => {
    if (!isAssignment) return;
    const derived = deriveAssignmentMeta(selectedModes);

    // Title: fill in if empty OR the field still holds the previous
    // auto-derived value. Respect user edits.
    if (!titleManuallyEditedRef.current || assignmentTitle === '' || assignmentTitle === lastAutoTitleRef.current) {
      if (derived.title !== assignmentTitle) onTitleChange?.(derived.title);
      lastAutoTitleRef.current = derived.title;
    }

    // Instructions: same pattern.
    if (!instructionsManuallyEditedRef.current || assignmentInstructions === '' || assignmentInstructions === lastAutoInstrRef.current) {
      if (derived.instructions !== assignmentInstructions) onInstructionsChange?.(derived.instructions);
      lastAutoInstrRef.current = derived.instructions;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModes, isAssignment]);

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
          className="signature-gradient text-white px-4 py-2 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <div className="text-sm font-bold text-stone-600">
          Step 2 of 3
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-black text-stone-900 mb-2">
          {isAssignment ? 'Configure assignment' : 'Configure Quick Play'}
        </h2>
        <p className="text-stone-600">
          {isAssignment ? 'Add details and choose game modes' : 'Optional: add a title for your records, then choose modes'}
        </p>
      </div>

      {/* ── Details section (title + instructions) ─────────────────────────── */}
      {/* Previously this block was gated on isAssignment, but Quick Play
          teachers also benefit from labelling a session ("Period 3 warm-up")
          so it shows up in analytics and in the success screen. We keep
          the fields optional for Quick Play and required for assignments
          (the canProceed check at the top of the component enforces that). */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        {/* The old Quick template grid lived here. Removed — teachers
            now pick modes first (further down) and we auto-fill a
            sensible title + instructions based on that selection via
            deriveAssignmentMeta. They can still edit either field
            afterwards; a one-time manual-edit flag stops the auto-fill
            from overwriting their customization on subsequent mode
            changes. */}
        {isAssignment && selectedModes.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-3 text-center text-xs text-stone-500">
            <Sparkles size={14} className="inline-block text-amber-500 mr-1.5 -mt-0.5" />
            Pick one or more game modes below and we'll suggest a title
            automatically. You can always edit it.
          </div>
        )}

        {/* Title & Instructions — shown for both assignment AND quick-play. */}
        <div className="grid grid-cols-1 gap-3">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1.5">
              {isAssignment ? 'Assignment title ' : 'Session title '}
              {isAssignment ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="text-stone-400 font-normal">(optional)</span>
              )}
            </label>
            <input
              type="text"
              value={assignmentTitle}
              onChange={(e) => {
                titleManuallyEditedRef.current = true;
                onTitleChange?.(e.target.value);
              }}
              placeholder={isAssignment
                ? 'e.g., Fruits Vocabulary - Unit 5'
                : 'e.g., Period 3 warm-up'}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-stone-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm text-stone-800 placeholder:text-stone-400 transition-all"
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1.5">
              {isAssignment ? 'Instructions for students' : 'Notes (optional)'}
            </label>
            <textarea
              value={assignmentInstructions}
              onChange={(e) => {
                instructionsManuallyEditedRef.current = true;
                onInstructionsChange?.(e.target.value);
              }}
              placeholder={isAssignment
                ? 'Add a note for your students...'
                : 'e.g., Remember to use headphones'}
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border-2 border-stone-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm text-stone-800 placeholder:text-stone-400 transition-all resize-none"
            />
          </div>
        </div>
      </motion.div>

      {/* ── Game Modes by Level ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-bold text-stone-700">
            <span>🎮</span> Game modes
          </label>
          <button
            onClick={handleSelectAllToggle}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            {selectedModes.length >= ALL_GAME_MODE_IDS.length ? 'Clear all' : 'Select all'}
          </button>
        </div>

        {/* Compact grid layout — 5 columns for all modes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Object.values(GAME_MODE_LEVELS).flat().map((gameMode) => {
            const isSelected = selectedModes.includes(gameMode.id);
            return (
              <motion.button
                key={gameMode.id}
                onClick={() => toggleGameMode(gameMode.id)}
                whileHover={{ scale: isSelected ? 1.05 : 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`relative p-3 sm:p-4 rounded-2xl border-2 transition-all duration-300 text-center ${
                  isSelected
                    ? 'border-primary bg-gradient-to-br from-primary to-primary-dim shadow-xl shadow-primary/40 scale-105'
                    : 'border-outline/20 bg-stone-200 hover:border-primary/40 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 hover:shadow-md'
                }`}
              >
                {/* Animated emoji with float animation */}
                <motion.div
                  className={`text-3xl sm:text-4xl mb-2 ${isSelected ? 'drop-shadow-lg' : ''}`}
                  animate={isSelected ? 'bounce' : 'float'}
                  transition={{ duration: 0.3 }}
                >
                  {gameMode.emoji}
                </motion.div>
                <div className={`text-xs sm:text-sm font-bold transition-colors ${isSelected ? 'text-white' : 'text-stone-600'}`}>
                  {gameMode.name}
                </div>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white flex items-center justify-center shadow-lg border-2 border-primary"
                  >
                    <Check size={14} className="text-primary" strokeWidth={3} />
                  </motion.div>
                )}
                {/* Subtle glow effect for selected modes */}
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 bg-white/20 rounded-2xl"
                    animate={{
                      scale: [1, 1.05, 1],
                      opacity: [0.3, 0.1, 0.3],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Difficulty indicators (compact legend) */}
        <div className="flex flex-wrap gap-4 text-xs text-stone-600 pt-1">
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
      </motion.div>

      {/* ── Sentence Difficulty — only when sentence-builder is selected ──── */}
      {selectedModes.includes('sentence-builder') && (
        <div className="space-y-3">
          <label className="block text-sm font-bold text-stone-900">
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
                      : 'border-outline/20 bg-stone-200 hover:border-outline/40 hover:bg-stone-200-high'
                  }`}
                >
                  <div className="text-lg mb-1">{config.emoji}</div>
                  <div className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-stone-600'}`}>{config.label}</div>
                  <div className={`text-xs ${isSelected ? 'text-white/80' : 'text-stone-600'}`}>{config.description}</div>
                  {isSelected && (
                    <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-white flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* AI Generate Button — only shown if teacher has AI access (env var + ai_allowlist) */}
          {aiEnabled && selectedWords.length > 0 && (
            <button
              type="button"
              onClick={generateAISentences}
              disabled={isGeneratingAI}
              className="mt-3 w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/20 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100 disabled:hover:shadow-lg"
            >
              {isGeneratingAI ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generating AI sentences...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate with AI
                </>
              )}
            </button>
          )}

          {/* Add Custom Sentence */}
          <div className="mt-4 space-y-2">
            <label className="block text-xs font-bold text-stone-600">
              Add Your Own Sentences
            </label>
            <div className="flex gap-2">
              <textarea
                value={customSentenceInput}
                onChange={(e) => setCustomSentenceInput(e.target.value)}
                placeholder="Write or paste your sentence here..."
                rows={2}
                className="flex-1 px-4 py-3 text-sm rounded-xl border-2 border-stone-300/30 bg-stone-200-lowest text-stone-900 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none resize-none"
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
              <label className="block text-xs font-bold text-stone-600 mb-2">
                Generated Sentences ({assignmentSentences.length}) — hover to preview, click to edit
              </label>
              <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                {assignmentSentences.map((sentence, idx) => {
                  const isInFirstHalf = idx < Math.ceil(assignmentSentences.length / 2);
                  return (
                    <div
                      key={idx}
                      onClick={() => setEditingSentenceIndex(idx)}
                      className="relative flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-300/30 bg-stone-200-lowest hover:border-primary/50 hover:bg-stone-200-high cursor-pointer transition-all group"
                    >
                      <span className="text-xs text-stone-600 font-mono w-5 shrink-0">{idx + 1}</span>
                      <span className="flex-1 text-sm text-stone-900 truncate group-hover:text-primary transition-colors">
                        {sentence}
                      </span>
                      {/* Hover preview tooltip — smart positioning */}
                      <div className={`hidden group-hover:block z-10 w-80 sm:w-96 bg-stone-100 rounded-xl shadow-xl border-2 border-stone-300/30 p-3 pointer-events-none ${
                        isInFirstHalf ? 'absolute top-full left-0 mt-2' : 'absolute bottom-full left-0 mb-2'
                      }`}>
                        <div className="text-sm text-stone-900 break-words" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
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
                        className="text-stone-600 hover:text-error opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
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
              <div className="bg-stone-100 rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-stone-900 mb-4">
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
                  className="w-full px-4 py-3 text-base rounded-xl border-2 border-stone-300/30 bg-stone-200-lowest text-stone-900 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none resize-none"
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setEditingSentenceIndex(null)}
                    className="flex-1 py-3 signature-gradient text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
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

      {/* ── Schedule (Assignment-only) - compact 2026 design ─────────────────── */}
      {isAssignment && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <label className="flex items-center gap-2 text-sm font-bold text-stone-700">
            <Calendar size={14} className="text-indigo-500" />
            Schedule (optional)
          </label>
          <div>
            <label className="block text-xs text-stone-500 mb-1.5">Deadline</label>
            <DateTimePicker
              value={assignmentDeadline || ""}
              onChange={(v) => onDeadlineChange?.(v)}
              placeholder="Pick deadline date and time"
            />
          </div>
        </motion.div>
      )}

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-4 pb-6 sm:pb-2">
        <button
          onClick={onBack}
          className="flex-1 py-3 signature-gradient text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          ← Back
        </button>
        <button
          ref={nextButtonRef}
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
