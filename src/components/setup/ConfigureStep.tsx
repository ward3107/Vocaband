import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft, ArrowRight, Check, Plus, X, Sparkles, Loader2, Calendar, Star, Wand2,
} from 'lucide-react';
import { Word } from '../../data/vocabulary';
import { SentenceDifficulty, DIFFICULTY_CONFIG } from '../../constants/game';
import { supabase } from '../../core/supabase';
import { ALL_GAME_MODE_IDS, DEFAULT_ASSIGNMENT_MODE_IDS, WizardMode, AssignmentData, getGameModeConfig, DIFFICULTY_META, getModeDifficulty, ASSIGNMENT_MODE_SECTIONS } from './types';
import { DateTimePicker } from '../DateTimePicker';
import AiLessonBuilder from '../ai-lesson-builder/AiLessonBuilder';
import type { GeneratedLesson } from '../ai-lesson-builder/AiLessonBuilder';
import { useLanguage } from '../../hooks/useLanguage';
import { teacherWizardsT } from '../../locales/teacher/wizards';
import { useAutoResizeTextarea } from '../../hooks/useAutoResizeTextarea';

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
  { match: ids => ids.length === 1 && ids[0] === 'fill-blank',       meta: { title: 'Fill in the Blank', instructions: 'Read each sentence and pick the missing word.' } },

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
  /** AI lesson generator — generates reading text + questions from selected words. */
  onGenerateLesson?: (params: {
    words: Array<{ english: string; hebrew: string; arabic: string }>;
    config: {
      textDifficulty: string;
      textType: string;
      wordCount: number;
      questionTypes: {
        yesNo: number;
        wh: number;
        literal: number;
        inferential: number;
        fillBlank: number;
        trueFalse: number;
        matching: number;
        multipleChoice: number;
        sentenceComplete: number;
      };
      includeAnswers: boolean;
    };
  }) => Promise<GeneratedLesson>;
  /** Called when an AI lesson is generated — passes the lesson data up. */
  onAiLessonChange?: (lesson: GeneratedLesson | null) => void;
  /** Show toast notifications. */
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  /** Effective Pro plan flag.  When false, hides the "Generate AI
   *  sentences" button entirely (the same UX as `aiEnabled=false`,
   *  but driven by the teacher's plan rather than the server allowlist). */
  isProUser?: boolean;
  /** When true, briefly highlights and scrolls to the Deadline picker.
   *  Set by SetupWizard when the teacher tapped the competition toggle
   *  on the Review step without a deadline — bounces them back here so
   *  they can fill one in. */
  highlightDeadline?: boolean;
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
  onGenerateLesson,
  onAiLessonChange,
  showToast,
  isProUser = false,
  highlightDeadline = false,
}) => {
  void _editingAssignment;
  const { language } = useLanguage();
  const t = teacherWizardsT[language];
  // Pulse the deadline section when SetupWizard navigates back here
  // from the Review-step competition toggle.  Ref lets us scroll into
  // view; local state mirrors the prop so the pulse animation runs
  // once and stops.
  const deadlineRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (highlightDeadline && deadlineRef.current) {
      deadlineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightDeadline]);

  // AI Lesson Builder state
  const [showAiLessonBuilder, setShowAiLessonBuilder] = useState(false);
  const [aiGeneratedLesson, setAiGeneratedLesson] = useState<GeneratedLesson | null>(null);

  // Activity type toggle: game modes vs AI text generator
  // Both options shown as tabs for discoverability — no scrolling required
  type ActivityType = 'game-modes' | 'ai-generator';
  const [activityType, setActivityType] = useState<ActivityType>('game-modes');

  // When AI lesson is generated, clear game modes and notify parent
  const handleAiLessonGenerated = (lesson: GeneratedLesson) => {
    setAiGeneratedLesson(lesson);
    onAiLessonChange?.(lesson);
    // Clear game modes - AI lesson becomes the activity
    onModesChange([]);
  };

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

  // Auto-grow refs for the assignment-setup textareas.  Teachers pasting
  // long instructions or multi-line sentences shouldn't have to wrestle
  // an inner scrollbar to verify what they pasted.
  const instructionsTextareaRef = useRef<HTMLTextAreaElement>(null);
  const customSentenceTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editSentenceTextareaRef = useRef<HTMLTextAreaElement>(null);
  useAutoResizeTextarea(instructionsTextareaRef, assignmentInstructions ?? '', { min: 56 });
  useAutoResizeTextarea(customSentenceTextareaRef, customSentenceInput, { min: 56 });
  useAutoResizeTextarea(
    editSentenceTextareaRef,
    editingSentenceIndex !== null ? (assignmentSentences[editingSentenceIndex] ?? '') : '',
    { min: 96 },
  );

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
          return;
        }
        const apiUrl = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || '';
        // ?debug=1 makes the server include a `reason` field when aiSentences
        // is false, so we can log the exact rejection cause to the console
        // instead of the user staring at a missing button with no explanation.
        const res = await fetch(`${apiUrl}/api/features?debug=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
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
        // Surface the most teacher-friendly message available.  Server
        // 403 paywall responses include a human-readable `message`
        // ("AI features require Pro. Upgrade to continue.") that should
        // win over the machine `error` code.  Fall back to the code,
        // then to the HTTP status as a last resort.
        let reason = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.message) reason = body.message;
          else if (body?.error) reason = body.error;
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

  // Select-all toggle: if all selected, collapse to the sensible default
  // (everything except Sentence Builder, which needs extra config);
  // otherwise select all.  Matches the new "default-on" assignment UX.
  const handleSelectAllToggle = () => {
    if (selectedModes.length >= ALL_GAME_MODE_IDS.length) {
      onModesChange([...DEFAULT_ASSIGNMENT_MODE_IDS]);
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
          {t.back}
        </button>
        <div className="text-sm font-bold text-[var(--vb-text-secondary)]">
          Step 2 of 3
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-black text-[var(--vb-text-primary)] mb-2">
          {isAssignment ? 'Configure assignment' : 'Configure Quick Play'}
        </h2>
        <p className="text-[var(--vb-text-secondary)]">
          {isAssignment ? 'Pick game modes first — we’ll suggest the rest' : 'Pick modes, then add an optional title'}
        </p>
      </div>

      {/* ── STEP 1 — Activity selection ─────────────────────────────────────
          Tab toggle UI for discoverability: teachers can immediately see
          both options (Game Modes OR AI Text Generator) without scrolling.
          Both tabs are always visible — the "OR" relationship is now explicit. */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {/* Activity Type Toggle */}
        <div className="flex items-center justify-center gap-2 p-1 bg-[var(--vb-surface-alt)] rounded-2xl">
          <button
            onClick={() => {
              setActivityType('game-modes');
              // If switching back to game modes, re-enable them if they were cleared
              if (selectedModes.length === 0 && !aiGeneratedLesson) {
                onModesChange([...DEFAULT_ASSIGNMENT_MODE_IDS]);
              }
            }}
            type="button"
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              activityType === 'game-modes'
                ? 'bg-[var(--vb-surface)] text-indigo-700 shadow-md'
                : 'text-[var(--vb-text-secondary)] hover:text-[var(--vb-text-primary)] hover:bg-[var(--vb-surface-alt)]'
            }`}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            <span>🎮</span>
            <span>Game Modes</span>
            {selectedModes.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                {selectedModes.length}
              </span>
            )}
          </button>
          {/* AI Text Generator tab - assignments only */}
          {isAssignment && onGenerateLesson && selectedWords.length > 0 && (
            <button
              onClick={() => {
                setActivityType('ai-generator');
                // Auto-clear game modes when switching to AI generator
                if (selectedModes.length > 0) {
                  onModesChange([]);
                }
              }}
              type="button"
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                activityType === 'ai-generator'
                  ? 'bg-[var(--vb-surface)] text-fuchsia-700 shadow-md'
                  : 'text-[var(--vb-text-secondary)] hover:text-[var(--vb-text-primary)] hover:bg-[var(--vb-surface-alt)]'
              }`}
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              <span>🪄</span>
              <span>AI Text Generator</span>
              {aiGeneratedLesson && (
                <span className="ml-1 px-2 py-0.5 bg-fuchsia-100 text-fuchsia-700 rounded-full text-xs">✓</span>
              )}
            </button>
          )}
        </div>

        {/* Tab Content: Game Modes */}
        {activityType === 'game-modes' && (
        <>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-black text-sm shadow-md">1</span>
            <label className="flex items-center gap-2 text-sm font-bold text-[var(--vb-text-secondary)]">
              <span>🎮</span> Game modes
            </label>
          </div>
          <button
            onClick={handleSelectAllToggle}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            {selectedModes.length >= ALL_GAME_MODE_IDS.length ? t.resetDefault : t.selectAll}
          </button>
        </div>

        {/* Mode sections — ordered easy → hard, AI-powered band at the
            bottom.  Each section reuses the difficulty badge as a section
            header so it doubles as a legend (no separate legend strip
            needed).  AI band uses fuchsia to match the AI Text Generator
            tab styling. */}
        <div className={`space-y-5 ${aiGeneratedLesson ? 'opacity-50 pointer-events-none' : ''}`}>
          {ASSIGNMENT_MODE_SECTIONS.map((section) => (
            <div key={section.id} className="space-y-2.5">
              {/* Section header */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${section.badgeBg} ${section.badgeText}`}>
                  {section.stars !== null ? (
                    <span className="inline-flex items-center gap-0.5">
                      {[0, 1, 2].map(i => (
                        <Star key={i} size={10} strokeWidth={2}
                          className={i < section.stars! ? section.starColor : 'text-[var(--vb-border)]'}
                          fill={i < section.stars! ? 'currentColor' : 'none'}
                        />
                      ))}
                    </span>
                  ) : (
                    <Sparkles size={11} />
                  )}
                  {section.label}
                </span>
                <span className="text-[11px] text-[var(--vb-text-muted)]">{section.description}</span>
              </div>

              {/* Mode grid for this section */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {section.modes.map((gameMode) => {
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
                          : 'border-outline/20 bg-[var(--vb-surface-alt)] hover:border-primary/40 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 hover:shadow-md'
                      }`}
                    >
                      <motion.div
                        className={`text-3xl sm:text-4xl mb-2 ${isSelected ? 'drop-shadow-lg' : ''}`}
                        animate={isSelected ? 'bounce' : 'float'}
                        transition={{ duration: 0.3 }}
                      >
                        {gameMode.emoji}
                      </motion.div>
                      <div className={`text-xs sm:text-sm font-bold transition-colors ${isSelected ? 'text-white' : 'text-[var(--vb-text-secondary)]'}`}>
                        {gameMode.name}
                      </div>
                      {(() => {
                        const tier = getModeDifficulty(gameMode.id);
                        const meta = DIFFICULTY_META[tier];
                        return (
                          <span className="inline-flex items-center gap-0.5 mt-1">
                            {[0, 1, 2].map(i => (
                              <Star key={i} size={10} strokeWidth={2}
                                className={i < meta.stars ? (isSelected ? 'text-white' : meta.starColor) : (isSelected ? 'text-white/40' : 'text-[var(--vb-border)]')}
                                fill={i < meta.stars ? 'currentColor' : 'none'}
                              />
                            ))}
                          </span>
                        );
                      })()}
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                          className="absolute -top-1.5 -right-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[var(--vb-surface)] flex items-center justify-center shadow-lg border-2 border-primary"
                        >
                          <Check size={14} className="text-primary" strokeWidth={3} />
                        </motion.div>
                      )}
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
            </div>
          ))}
        </div>

        {/* Progress nudge — a subtle "↓ next step" indicator that only
            appears once the teacher has actually picked a mode.  Helps
            answer the teacher's complaint that the page didn't guide
            them downward after the first action. */}
        {selectedModes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center pt-2"
          >
            <motion.span
              animate={{ y: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
              className="text-[var(--vb-text-muted)] text-xl leading-none"
              aria-hidden
            >
              ↓
            </motion.span>
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--vb-text-muted)]">next: name it</span>
          </motion.div>
        )}
        </>)}

        {/* Tab Content: AI Text Generator — assignments only */}
        {isAssignment && activityType === 'ai-generator' && onGenerateLesson && selectedWords.length > 0 && (
          <motion.div
            key="ai-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* AI Generated Lesson Preview (if any) */}
            {aiGeneratedLesson ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-fuchsia-50 to-violet-50 rounded-2xl p-4 border-2 border-fuchsia-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">📖</span>
                      <h3 className="text-sm font-bold text-fuchsia-900">
                        Reading Text Generated ({aiGeneratedLesson.wordCount} words)
                      </h3>
                    </div>
                    <p className="text-sm text-[var(--vb-text-secondary)] mb-2 line-clamp-3">{aiGeneratedLesson.text}</p>
                    <div className="flex items-center gap-2 text-xs text-[var(--vb-text-muted)]">
                      <span className="px-2 py-0.5 bg-[var(--vb-surface)] rounded-full font-semibold">
                        {aiGeneratedLesson.questions.length} questions
                      </span>
                      <span>• Ready to assign</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setAiGeneratedLesson(null);
                      onAiLessonChange?.(null);
                    }}
                    type="button"
                    className="px-3 py-1.5 bg-[var(--vb-surface-alt)] hover:opacity-80 text-[var(--vb-text-secondary)] text-xs font-bold rounded-lg transition-colors"
                    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  >
                    Clear
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Generate button */
              <motion.button
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setShowAiLessonBuilder(true)}
                type="button"
                className="w-full py-5 bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                <Wand2 size={22} className="animate-pulse" />
                <span className="text-lg">Generate Reading Text + Questions</span>
              </motion.button>
            )}

            {/* Helper text */}
            <p className="text-center text-xs text-[var(--vb-text-muted)]">
              AI will create a reading passage using your selected words ({selectedWords.length} words)
              {selectedModes.length > 0 && (
                <span className="text-amber-600 block mt-1">💡 Game modes will be disabled — AI questions become the activity</span>
              )}
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* ── STEP 2 — Details (title + instructions) ─────────────────────────
          Revealed once Step 1 has at least one mode picked.  Before the
          first pick, we show the dashed placeholder card so teachers know
          the section exists but also know why it's not interactive yet.
          deriveAssignmentMeta() auto-fills both fields from the chosen
          modes; teachers can still overwrite, and once they type we stop
          overwriting their text on subsequent mode-picker changes. */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`space-y-4 ${selectedModes.length === 0 ? 'opacity-60' : ''}`}
      >
        <div className="flex items-center gap-2.5">
          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-sm shadow-md transition-colors ${
            selectedModes.length === 0
              ? 'bg-[var(--vb-border)] text-[var(--vb-text-muted)]'
              : 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white'
          }`}>2</span>
          <label className="flex items-center gap-2 text-sm font-bold text-[var(--vb-text-secondary)]">
            <span>✏️</span> {isAssignment ? 'Name and instruct' : 'Label this session'}
          </label>
        </div>

        {isAssignment && selectedModes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--vb-border)] bg-[var(--vb-surface)] px-4 py-4 text-center text-xs text-[var(--vb-text-muted)]">
            <Sparkles size={14} className="inline-block text-amber-500 mr-1.5 -mt-0.5" />
            {t.pickModesNudge}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {/* Title */}
            <div>
              <label htmlFor="assignment-title" className="block text-xs font-bold text-[var(--vb-text-secondary)] mb-1.5">
                {isAssignment ? 'Assignment title ' : 'Session title '}
                {isAssignment ? (
                  <span className="text-red-500">*</span>
                ) : (
                  <span className="text-[var(--vb-text-muted)] font-normal">(optional)</span>
                )}
              </label>
              <input
                type="text"
                id="assignment-title"
                name="title"
                autoComplete="off"
                value={assignmentTitle}
                onChange={(e) => {
                  titleManuallyEditedRef.current = true;
                  onTitleChange?.(e.target.value);
                }}
                placeholder={isAssignment
                  ? 'e.g., Fruits Vocabulary - Unit 5'
                  : 'e.g., Period 3 warm-up'}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-[var(--vb-border)] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm text-[var(--vb-text-primary)] placeholder:text-[var(--vb-text-muted)] transition-all"
              />
            </div>

            {/* Instructions */}
            <div>
              <label htmlFor="assignment-instructions" className="block text-xs font-bold text-[var(--vb-text-secondary)] mb-1.5">
                {isAssignment ? 'Instructions for students' : 'Notes (optional)'}
              </label>
              <textarea
                id="assignment-instructions"
                name="instructions"
                autoComplete="off"
                ref={instructionsTextareaRef}
                value={assignmentInstructions}
                onChange={(e) => {
                  instructionsManuallyEditedRef.current = true;
                  onInstructionsChange?.(e.target.value);
                }}
                placeholder={isAssignment ? t.instructionsPlaceholderAssignment : t.instructionsPlaceholderQp}
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl border-2 border-[var(--vb-border)] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm text-[var(--vb-text-primary)] placeholder:text-[var(--vb-text-muted)] transition-all overflow-y-auto"
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* ── STEP 3 — Sentence config (sentence-builder OR fill-blank) ── */}
      {(selectedModes.includes('sentence-builder') || selectedModes.includes('fill-blank')) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-rose-500 to-fuchsia-600 text-white font-black text-sm shadow-md">3</span>
            <label className="block text-sm font-bold text-[var(--vb-text-primary)]">
              {selectedModes.includes('sentence-builder') ? 'Sentence Builder Setup' : 'Fill-in-the-Blank Setup'}
            </label>
          </div>
          <label className="block text-xs font-bold text-[var(--vb-text-secondary)] mt-2">
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
                      : 'border-outline/20 bg-[var(--vb-surface-alt)] hover:border-outline/40 hover:bg-[var(--vb-surface-alt)]-high'
                  }`}
                >
                  <div className="text-lg mb-1">{config.emoji}</div>
                  <div className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-[var(--vb-text-secondary)]'}`}>{config.label}</div>
                  <div className={`text-xs ${isSelected ? 'text-white/80' : 'text-[var(--vb-text-secondary)]'}`}>{config.description}</div>
                  {isSelected && (
                    <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-[var(--vb-surface)] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* AI Generate Button — always rendered so teachers can discover
              the feature.  Previously this was hidden whenever the server
              allowlist, Pro plan, or word-selection check failed, leaving
              teachers staring at a configure screen with no obvious way
              to generate sentences.  Now the button is always visible and
              uses its disabled state + an inline hint to explain exactly
              what's blocking it (no words, not Pro, or AI unavailable). */}
          {(() => {
            const noWords = selectedWords.length === 0;
            const blocked = !aiEnabled || !isProUser || noWords;
            const hint = noWords
              ? (language === 'he' ? 'בחר תחילה מילים בשלב 1.' : language === 'ar' ? 'اختر الكلمات أولاً في الخطوة 1.' : 'Select words in Step 1 first.')
              : !isProUser
                ? (language === 'he' ? 'יצירת משפטים בעזרת AI היא תכונת Pro.' : language === 'ar' ? 'إنشاء الجمل بالذكاء الاصطناعي ميزة Pro.' : 'AI sentence generation is a Pro feature.')
                : !aiEnabled
                  ? (language === 'he' ? 'יצירת AI אינה זמינה כעת.  פנה לתמיכה.' : language === 'ar' ? 'إنشاء الذكاء الاصطناعي غير متاح حاليًا. اتصل بالدعم.' : 'AI generation is unavailable right now. Contact support.')
                  : null;
            return (
              <>
                <button
                  type="button"
                  onClick={generateAISentences}
                  disabled={blocked || isGeneratingAI}
                  className="mt-3 w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/20 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100 disabled:hover:shadow-lg disabled:cursor-not-allowed"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      {t.generatingAi}
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      {t.generateAi}
                    </>
                  )}
                </button>
                {hint && (
                  <p className="mt-2 text-xs text-[var(--vb-text-secondary)] text-center">
                    {hint}
                  </p>
                )}
              </>
            );
          })()}

          {/* Add Custom Sentence */}
          <div className="mt-4 space-y-2">
            <label className="block text-xs font-bold text-[var(--vb-text-secondary)]">
              Add Your Own Sentences
            </label>
            <div className="flex gap-2">
              <textarea
                ref={customSentenceTextareaRef}
                value={customSentenceInput}
                onChange={(e) => setCustomSentenceInput(e.target.value)}
                placeholder={t.sentencePlaceholder}
                rows={2}
                className="flex-1 px-4 py-3 text-sm rounded-xl border-2 border-[var(--vb-text-muted)]/30 bg-[var(--vb-surface-alt)]-lowest text-[var(--vb-text-primary)] focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none overflow-y-auto"
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
                {t.addBtn}
              </button>
            </div>
          </div>

          {/* Sentence Preview & Editor */}
          {assignmentSentences.length > 0 && (
            <div className="mt-3">
              <label className="block text-xs font-bold text-[var(--vb-text-secondary)] mb-2">
                Generated Sentences ({assignmentSentences.length}) — hover to preview, click to edit
              </label>
              <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                {assignmentSentences.map((sentence, idx) => {
                  const isInFirstHalf = idx < Math.ceil(assignmentSentences.length / 2);
                  return (
                    <div
                      key={idx}
                      onClick={() => setEditingSentenceIndex(idx)}
                      className="relative flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--vb-text-muted)]/30 bg-[var(--vb-surface-alt)]-lowest hover:border-primary/50 hover:bg-[var(--vb-surface-alt)]-high cursor-pointer transition-all group"
                    >
                      <span className="text-xs text-[var(--vb-text-secondary)] font-mono w-5 shrink-0">{idx + 1}</span>
                      <span className="flex-1 text-sm text-[var(--vb-text-primary)] truncate group-hover:text-primary transition-colors">
                        {sentence}
                      </span>
                      {/* Hover preview tooltip — smart positioning */}
                      <div className={`hidden group-hover:block z-10 w-80 sm:w-96 bg-[var(--vb-surface-alt)] rounded-xl shadow-xl border-2 border-[var(--vb-text-muted)]/30 p-3 pointer-events-none ${
                        isInFirstHalf ? 'absolute top-full left-0 mt-2' : 'absolute bottom-full left-0 mb-2'
                      }`}>
                        <div className="text-sm text-[var(--vb-text-primary)] break-words" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
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
                        className="text-[var(--vb-text-secondary)] hover:text-error opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        title={language === 'he' ? 'הסר משפט' : language === 'ar' ? 'إزالة الجملة' : 'Remove sentence'}
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
              <div className="bg-[var(--vb-surface-alt)] rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-[var(--vb-text-primary)] mb-4">
                  Edit Sentence #{editingSentenceIndex + 1}
                </h3>
                <textarea
                  autoFocus
                  ref={editSentenceTextareaRef}
                  value={assignmentSentences[editingSentenceIndex]}
                  onChange={(e) => {
                    const updated = [...assignmentSentences];
                    updated[editingSentenceIndex] = e.target.value;
                    onSentencesChange?.(updated);
                  }}
                  rows={3}
                  className="w-full px-4 py-3 text-base rounded-xl border-2 border-[var(--vb-text-muted)]/30 bg-[var(--vb-surface-alt)]-lowest text-[var(--vb-text-primary)] focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none overflow-y-auto"
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setEditingSentenceIndex(null)}
                    className="flex-1 py-3 signature-gradient text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95"
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={() => setEditingSentenceIndex(null)}
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
                  >
                    {t.done}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP — Schedule (Assignment-only) ─────────────────────────────── */}
      {isAssignment && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-sm shadow-md">
              {(selectedModes.includes('sentence-builder') || selectedModes.includes('fill-blank')) ? '4' : '3'}
            </span>
            <label className="flex items-center gap-2 text-sm font-bold text-[var(--vb-text-secondary)]">
              <Calendar size={14} className="text-indigo-500" />
              {t.scheduleOptional}
            </label>
          </div>
          <div
            ref={deadlineRef}
            className={`rounded-2xl transition-shadow ${
              highlightDeadline
                ? 'ring-4 ring-amber-400/70 shadow-lg shadow-amber-400/30 p-3 -m-3 animate-pulse'
                : ''
            }`}
          >
            <label className="block text-xs text-[var(--vb-text-muted)] mb-1.5">Deadline</label>
            <DateTimePicker
              value={assignmentDeadline || ""}
              onChange={(v) => onDeadlineChange?.(v)}
              placeholder={t.deadlinePickerPlaceholder}
            />
          </div>
        </motion.div>
      )}

      {/* Spacer so the last section doesn't sit under the mobile sticky bar. */}
      <div className="sm:hidden h-24" />

      {/* ── Navigation ─────────────────────────────────────────────────────
          Sticky on mobile — a long word list + long mode list + optional
          sentence panel makes the step tall enough that a non-sticky
          "Next" falls off the bottom of the phone.  Desktop keeps the
          inline layout since the full step fits in one viewport. */}
      <div className="flex gap-3 pt-4 pb-2 fixed sm:static bottom-0 inset-x-0 sm:inset-auto z-30 px-4 sm:px-0 bg-gradient-to-t sm:bg-none from-white via-white/95 to-transparent pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-2">
        <button
          onClick={onBack}
          className="flex-1 py-3 signature-gradient text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          ← {t.back}
        </button>
        <button
          ref={nextButtonRef}
          onClick={onNext}
          disabled={!canProceed}
          className="flex-1 py-4 signature-gradient text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none hover:shadow-xl transition-all flex items-center justify-center gap-2"
        >
          {isAssignment ? (
            <>
              {t.reviewCta}
              <ArrowRight size={20} />
            </>
          ) : (
            t.skipToQr
          )}
        </button>
      </div>

      {/* AI Lesson Builder Modal */}
      {onGenerateLesson && (
        <AiLessonBuilder
          isOpen={showAiLessonBuilder}
          onClose={() => setShowAiLessonBuilder(false)}
          selectedWords={selectedWords.map(w => ({
            english: w.english,
            hebrew: w.hebrew,
            arabic: w.arabic,
          }))}
          onGenerate={async (config) => {
            const result = await onGenerateLesson({ words: selectedWords.map(w => ({
              english: w.english,
              hebrew: w.hebrew,
              arabic: w.arabic,
            })), config });
            return result;
          }}
          onSaveLesson={(lesson) => {
            handleAiLessonGenerated(lesson);
            showToast?.('Lesson generated! Game modes are now disabled.', 'success');
            setShowAiLessonBuilder(false);
          }}
          showToast={showToast}
        />
      )}
    </motion.div>
  );
};

export default ConfigureStep;
