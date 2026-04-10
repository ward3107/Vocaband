import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Check, ChevronRight, Search, Filter, Plus, Trash2, Edit2,
  Clipboard, BookOpen, FolderOpen, Copy, Share2,
  Zap, Target, Headphones, PenTool, CheckCircle, RotateCcw,
  Volume2, Shuffle, ArrowRight, ArrowLeft, Sparkles, Save, XCircle, Camera,
  Loader2, Languages
} from 'lucide-react';
import { Word } from '../data/vocabulary';
import { SentenceDifficulty, DIFFICULTY_CONFIG } from '../constants/game';
import { supabase } from '../core/supabase';
import { analyzePastedText, type WordAnalysisResult } from '../utils/wordAnalysis';
import { PastePreviewModal } from './PastePreviewModal';

interface CreateAssignmentWizardProps {
  selectedClass: { name: string; code: string; studentCount?: number };
  allWords: Word[];
  band1Words: Word[];
  band2Words: Word[];
  customWords: Word[];
  setCustomWords: React.Dispatch<React.SetStateAction<Word[]>>;
  assignmentTitle: string;
  setAssignmentTitle: (title: string) => void;
  assignmentDeadline: string;
  setAssignmentDeadline: (date: string) => void;
  assignmentModes: string[];
  setAssignmentModes: React.Dispatch<React.SetStateAction<string[]>>;
  selectedWords: number[];
  setSelectedWords: React.Dispatch<React.SetStateAction<number[]>>;
  selectedLevel: string;
  setSelectedLevel: (level: "Band 1" | "Band 2" | "Custom") => void;
  tagInput: string;
  setTagInput: (input: string) => void;
  pastedText: string;
  setPastedText: (text: string) => void;
  showPasteDialog: boolean;
  setShowPasteDialog: (show: boolean) => void;
  pasteMatchedCount: number;
  pasteUnmatched: string[];
  handlePasteSubmit: () => void;
  handleAddUnmatchedAsCustom: () => void;
  handleSkipUnmatched: () => void;
  handleTagInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleDocxUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleOcrUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveAssignment: () => void;
  assignmentSentences: string[];
  setAssignmentSentences: (sentences: string[]) => void;
  sentenceDifficulty: SentenceDifficulty;
  setSentenceDifficulty: (level: SentenceDifficulty) => void;
  isOcrProcessing?: boolean;
  ocrProgress?: number;
  showTopicPacks: boolean;
  setShowTopicPacks: (show: boolean) => void;
  showAssignmentWelcome: boolean;
  setShowAssignmentWelcome: (show: boolean) => void;
  TOPIC_PACKS: Array<{ name: string; icon: string; ids: number[] }>;
  onBack: () => void;
  editingAssignment: AssignmentData | null;
  setEditingAssignment: (assignment: AssignmentData | null) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  onPlayWord?: (wordId: number, fallbackText?: string) => void;
}

interface AssignmentData {
  id: string;
  title: string;
  wordIds: number[];
  words?: Word[];
  deadline?: string | null;
  allowedModes?: string[];
  classId: string;
  sentences?: string[];
  sentenceDifficulty?: number;
  createdAt?: string;
}

type WordWithStatus = {
  id: number;
  english: string;
  hebrew: string;
  arabic: string;
  hasTranslation: boolean;
  isPhrase: boolean;
  phraseWords?: number[];
};

type SubStep = 'landing' | 'paste' | 'editor' | 'browse' | 'saved-groups' | 'topic-packs';

const GAME_MODE_LEVELS = {
  beginner: [
    { id: 'flashcards', name: 'Flashcards', emoji: '📇', color: 'from-emerald-400 to-emerald-500' },
    { id: 'matching', name: 'Matching', emoji: '🃏', color: 'from-teal-400 to-teal-500' },
    { id: 'classic', name: 'Classic', emoji: '🎯', color: 'from-blue-400 to-blue-500' },
  ],
  intermediate: [
    { id: 'listening', name: 'Listening', emoji: '👂', color: 'from-violet-400 to-violet-500' },
    { id: 'true-false', name: 'True/False', emoji: '✅', color: 'from-purple-400 to-purple-500' },
    { id: 'letter-sounds', name: 'Letter Sounds', emoji: '🔊', color: 'from-fuchsia-400 to-fuchsia-500' },
  ],
  advanced: [
    { id: 'spelling', name: 'Spelling', emoji: '✍️', color: 'from-orange-400 to-orange-500' },
    { id: 'reverse', name: 'Reverse', emoji: '🔁', color: 'from-amber-400 to-amber-500' },
    { id: 'scramble', name: 'Scramble', emoji: '🔤', color: 'from-yellow-400 to-yellow-500' },
  ],
  mastery: [
    { id: 'sentence-builder', name: 'Sentence Builder', emoji: '📝', color: 'from-rose-400 to-rose-500' },
  ],
};

// Combined assignment templates - title + instructions pairs
const ASSIGNMENT_TEMPLATES: { title: string; instructions: string; modes?: string[]; group: string }[] = [
  // ── Quick Practice ─────────────────────────────────────────────────────────
  { group: 'Quick Practice', title: 'Flashcard Review', instructions: 'Learn new words at your own pace with visual flashcards', modes: ['flashcards'] },
  { group: 'Quick Practice', title: 'Classic Quiz', instructions: 'Multiple-choice vocabulary quiz — pick the correct translation', modes: ['classic'] },
  { group: 'Quick Practice', title: 'Listening Practice', instructions: 'Listen to words and choose the correct answer — builds audio recognition', modes: ['listening'] },
  { group: 'Quick Practice', title: 'Matching Pairs', instructions: 'Connect words to their translations — drag-and-match style', modes: ['matching'] },
  { group: 'Quick Practice', title: 'True or False', instructions: 'Decide if translations are correct — quick comprehension check', modes: ['true-false'] },
  // ── Writing & Spelling ─────────────────────────────────────────────────────
  { group: 'Writing & Spelling', title: 'Spelling Bee', instructions: 'Type the correct spelling — builds writing accuracy', modes: ['spelling'] },
  { group: 'Writing & Spelling', title: 'Word Scramble', instructions: 'Unscramble the letters to form the correct word', modes: ['scramble'] },
  { group: 'Writing & Spelling', title: 'Sentence Builder', instructions: 'Arrange words to build correct sentences — advanced writing practice', modes: ['sentence-builder'] },
  { group: 'Writing & Spelling', title: 'Letter Sounds', instructions: 'Practice phonics — identify words by their letter sounds', modes: ['letter-sounds'] },
  // ── Mixed Modes ────────────────────────────────────────────────────────────
  { group: 'Mixed Modes', title: 'Beginner Mix', instructions: 'Gentle start — flashcards, matching, and classic quiz', modes: ['flashcards', 'matching', 'classic', 'listening'] },
  { group: 'Mixed Modes', title: 'Full Practice', instructions: 'All core game modes for thorough vocabulary practice', modes: ['flashcards', 'matching', 'classic', 'listening', 'true-false', 'spelling', 'reverse', 'scramble', 'letter-sounds'] },
  { group: 'Mixed Modes', title: 'Challenge Mode', instructions: 'Every mode including sentence builder — for advanced students', modes: ['flashcards', 'matching', 'classic', 'listening', 'true-false', 'spelling', 'reverse', 'scramble', 'letter-sounds', 'sentence-builder'] },
  { group: 'Mixed Modes', title: 'Reading & Listening', instructions: 'Focus on receptive skills — flashcards, listening, and true/false', modes: ['flashcards', 'listening', 'true-false'] },
  { group: 'Mixed Modes', title: 'Writing Focus', instructions: 'Productive skills — spelling, scramble, reverse, and sentence builder', modes: ['spelling', 'scramble', 'reverse', 'sentence-builder'] },
  // ── Assessment ─────────────────────────────────────────────────────────────
  { group: 'Assessment', title: 'Quick Check', instructions: 'Short vocabulary check — classic quiz and true/false only', modes: ['classic', 'true-false'] },
  { group: 'Assessment', title: 'Spelling Test', instructions: 'Written assessment — spelling and word scramble', modes: ['spelling', 'scramble'] },
  { group: 'Assessment', title: 'Listening Exam', instructions: 'Audio-based assessment — listening and letter sounds', modes: ['listening', 'letter-sounds'] },
  { group: 'Assessment', title: 'Comprehensive Test', instructions: 'Full assessment across all modes — test overall vocabulary mastery', modes: ['classic', 'listening', 'spelling', 'matching', 'true-false', 'reverse'] },
  // ── Homework ───────────────────────────────────────────────────────────────
  { group: 'Homework', title: 'Weekly Homework', instructions: 'Complete all activities at home — practice at your own pace', modes: ['flashcards', 'classic', 'spelling', 'matching'] },
  { group: 'Homework', title: 'Review & Practice', instructions: 'Self-study assignment — start with flashcards then test yourself', modes: ['flashcards', 'classic', 'true-false', 'listening'] },
  { group: 'Homework', title: 'XP Challenge', instructions: 'Earn as many XP points as possible — compete on the leaderboard!', modes: ['classic', 'spelling', 'matching', 'true-false', 'reverse', 'scramble'] },
];

const INSTRUCTION_TEMPLATES = [
  'Practice mode - review vocabulary with flashcards and matching activities',
  'Test mode - complete all activities independently with no hints available',
  'Flashcards focus - learn new words at your own pace with visual cards',
  'Matching game - connect Hebrew/Arabic words to English translations',
  'Listening practice - use audio-based activities to build comprehension',
  'Spelling focus - practice writing words with letter sounds and spelling modes',
  'Challenge mode - try all 9 game modes for comprehensive vocabulary review',
  'Beginner level - flashcards, matching, and classic modes for foundational learning',
  'Intermediate level - listening, true/false, and letter sounds for skill building',
  'Advanced level - spelling, reverse, and scramble for mastery practice',
  'Quick review - 15-minute practice session with your preferred game modes',
  'Homework assignment - complete all activities by the deadline for full credit',
  'Class competition - earn points for the live leaderboard with correct answers',
  'Study session - use flashcards first, then test yourself with other modes',
  'No time limit - take your time to learn each word thoroughly',
  'Timed challenge - race against the clock to test your knowledge',
  'True/false focus - build comprehension by listening and answering questions',
  'Reverse mode - translate from English to Hebrew/Arabic for output practice',
  'Scramble practice - unscramble letters to spell vocabulary words correctly',
  'Letter sounds - strengthen phonics and pronunciation skills',
  'Mixed modes - play multiple game types for varied and engaging practice',
  'Teacher-led - complete activities during class for guided practice',
  'Independent work - complete assignment at home for self-directed learning',
];

const PRESETS = [
  {
    id: 'starting-out',
    name: 'Starting Out',
    description: 'Builds recognition & familiarity',
    icon: '🌱',
    modes: ['flashcards', 'matching', 'classic', 'listening'],
    level: 'beginner' as const,
  },
  {
    id: 'building-skills',
    name: 'Building Skills',
    description: 'Comprehensive practice across all skills',
    icon: '📈',
    modes: ['flashcards', 'matching', 'classic', 'listening', 'true-false', 'spelling', 'reverse', 'scramble', 'letter-sounds'],
    level: 'intermediate' as const,
  },
  {
    id: 'challenge-mode',
    name: 'Challenge Mode',
    description: 'For students ready for mastery',
    icon: '🚀',
    modes: ['flashcards', 'matching', 'classic', 'listening', 'true-false', 'spelling', 'reverse', 'scramble', 'letter-sounds', 'sentence-builder'],
    level: 'mastery' as const,
  },
];

export const CreateAssignmentWizard: React.FC<CreateAssignmentWizardProps> = ({
  selectedClass,
  allWords,
  band1Words,
  band2Words,
  customWords,
  setCustomWords,
  assignmentTitle,
  setAssignmentTitle,
  assignmentDeadline,
  setAssignmentDeadline,
  assignmentModes,
  setAssignmentModes,
  selectedWords,
  setSelectedWords,
  selectedLevel,
  setSelectedLevel,
  tagInput,
  setTagInput,
  pastedText,
  setPastedText,
  showPasteDialog,
  setShowPasteDialog,
  pasteMatchedCount,
  pasteUnmatched,
  handlePasteSubmit,
  handleAddUnmatchedAsCustom,
  handleSkipUnmatched,
  handleTagInputKeyDown,
  handleDocxUpload,
  handleOcrUpload,
  handleSaveAssignment,
  assignmentSentences,
  setAssignmentSentences,
  sentenceDifficulty,
  setSentenceDifficulty,
  isOcrProcessing = false,
  ocrProgress = 0,
  showTopicPacks,
  setShowTopicPacks,
  showAssignmentWelcome,
  setShowAssignmentWelcome,
  TOPIC_PACKS,
  onBack,
  editingAssignment,
  setEditingAssignment,
  showToast,
  onPlayWord,
}) => {
  const [step, setStep] = useState(1);
  const [subStep, setSubStep] = useState<SubStep>('landing');
  const [expandedPack, setExpandedPack] = useState<string | null>(null);
  const [editedWords, setEditedWords] = useState<WordWithStatus[]>([]);
  const [selectedWordIds, setSelectedWordIds] = useState<number[]>([]);
  const [editingWord, setEditingWord] = useState<WordWithStatus | null>(null);
  const [editTranslations, setEditTranslations] = useState({ hebrew: '', arabic: '' });
  const [isTranslating, setIsTranslating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [savedGroups, setSavedGroups] = useState<Array<{ id: string; name: string; words: number[]; createdAt: string }>>([]);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [showSaveGroup, setShowSaveGroup] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [joinedWords, setJoinedWords] = useState<number[]>([]);
  const [editingSentenceIndex, setEditingSentenceIndex] = useState<number | null>(null);
  const [customSentenceInput, setCustomSentenceInput] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Check if AI sentence generation is available for this teacher
  useEffect(() => {
    const checkAI = async () => {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) return;
        const apiUrl = (import.meta as any).env?.VITE_API_URL || '';
        const res = await fetch(`${apiUrl}/api/features`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setAiEnabled(data.aiSentences === true);
      } catch { /* AI not available — fine */ }
    };
    checkAI();
  }, []);

  // Preview modal state for paste analysis
  const [showPreview, setShowPreview] = useState(false);
  const [previewAnalysis, setPreviewAnalysis] = useState<WordAnalysisResult | null>(null);

  const pasteAreaRef = useRef<HTMLTextAreaElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // --- AI TRANSLATION FOR ASSIGNMENTS ---
  // Cache for translated words to avoid redundant API calls
  const translationCache = useRef<Map<string, {hebrew: string, arabic: string}>>(new Map());

  const translateWord = async (englishWord: string): Promise<{hebrew: string, arabic: string} | null> => {
    // Check cache first
    const cached = translationCache.current.get(englishWord.toLowerCase());
    if (cached) return cached;

    try {
      // Using MyMemory Translation API (free, no API key required)
      const [hebrewRes, arabicRes] = await Promise.all([
        fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(englishWord)}&langpair=en|he`),
        fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(englishWord)}&langpair=en|ar`)
      ]);

      const hebrewData = await hebrewRes.json();
      const arabicData = await arabicRes.json();

      if (hebrewData.responseStatus === 200 && arabicData.responseStatus === 200) {
        const result = {
          hebrew: hebrewData.responseData.translatedText,
          arabic: arabicData.responseData.translatedText
        };
        // Cache the result
        translationCache.current.set(englishWord.toLowerCase(), result);
        return result;
      }

      return null;
    } catch (error) {
      console.error('Translation service error:', error);
      return null;
    }
  };

  // Load saved groups from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vocaband_saved_groups');
      if (saved) {
        setSavedGroups(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // Debug logging for editingAssignment
  useEffect(() => {
    console.log('[CREATE WIZARD] editingAssignment changed:', editingAssignment);
    console.log('[CREATE WIZARD] assignmentTitle prop:', assignmentTitle);
    console.log('[CREATE WIZARD] selectedWords prop:', selectedWords);
  }, [editingAssignment, assignmentTitle, selectedWords]);

  // Initialize editedWords from selectedWords prop (e.g., after OCR upload)
  // Also clear editedWords when selectedWords is cleared (e.g., when switching classes)
  useEffect(() => {
    if (selectedWords.length > 0 && editedWords.length === 0) {
      console.log('[CREATE WIZARD] Initializing editedWords from selectedWords:', selectedWords.length);
      setEditedWords(getWordsWithStatus());
      setSubStep('editor');
    } else if (selectedWords.length === 0 && editedWords.length > 0) {
      console.log('[CREATE WIZARD] Clearing editedWords because selectedWords is empty');
      setEditedWords([]);
      setSubStep('landing');
    }
  }, [selectedWords]);

  // Auto-navigate to step 2 when editing an assignment
  useEffect(() => {
    if (editingAssignment) {
      console.log('[CREATE WIZARD] Editing assignment - navigating to step 2');
      setStep(2);
    }
  }, [editingAssignment]);

  // Save groups to localStorage
  const saveGroupsToStorage = (groups: typeof savedGroups) => {
    try {
      localStorage.setItem('vocaband_saved_groups', JSON.stringify(groups));
    } catch {}
  };

  // Generate safe integer ID for custom words/phrases
  const customIdCounter = useRef(0);
  const generateCustomId = () => {
    // Use negative IDs to avoid conflicts with database IDs
    // Use timestamp + counter to ensure uniqueness even when called rapidly
    customIdCounter.current++;
    return -(Date.now() * 1000 + customIdCounter.current);
  };

  // Convert selected word IDs to WordWithStatus format
  const getWordsWithStatus = (): WordWithStatus[] => {
    const allWordsAvailable = [...allWords, ...customWords];
    const wordWithStatus: WordWithStatus[] = [];
    const processedIds = new Set<number>();

    selectedWords.forEach(wordId => {
      // Skip duplicates
      if (processedIds.has(wordId)) return;

      const word = allWordsAvailable.find(w => w.id === wordId);
      if (word) {
        wordWithStatus.push({
          id: word.id,
          english: word.english,
          hebrew: word.hebrew || '',
          arabic: word.arabic || '',
          hasTranslation: !!(word.hebrew || word.arabic),
          isPhrase: false,
        });
        processedIds.add(wordId);
      }
    });

    return wordWithStatus;
  };

  // Handle paste and analyze with preview
  const handlePasteAndAnalyze = () => {
    const allWordsAvailable = [...allWords, ...customWords];
    const analysis = analyzePastedText(pastedText, allWordsAvailable);

    setPreviewAnalysis(analysis);
    setShowPreview(true);
  };

  // Confirm paste preview - add words to editor
  const handlePreviewConfirm = (customTranslations?: Map<string, { hebrew: string; arabic: string }>) => {
    if (!previewAnalysis) return;

    const { matchedWords, unmatchedTerms } = previewAnalysis;

    // Convert matched words to WordWithStatus format
    const wordWithStatus: WordWithStatus[] = [];
    const processedIds = new Set<number>();

    matchedWords.forEach(mw => {
      if (!processedIds.has(mw.word.id)) {
        wordWithStatus.push({
          id: mw.word.id,
          english: mw.word.english,
          hebrew: mw.word.hebrew || '',
          arabic: mw.word.arabic || '',
          hasTranslation: !!(mw.word.hebrew || mw.word.arabic),
          isPhrase: false,
        });
        processedIds.add(mw.word.id);
      }
    });

    // Add unmatched as custom words with translations
    const customWordsToAdd = unmatchedTerms.map((term) => {
      const translations = customTranslations?.get(term.term);
      const newWord: Word = {
        id: generateCustomId(),
        english: term.term,
        hebrew: translations?.hebrew || '',
        arabic: translations?.arabic || '',
        level: 'Custom',
      };
      return newWord;
    });

    setEditedWords([...wordWithStatus, ...customWordsToAdd.map(w => ({
      id: w.id,
      english: w.english,
      hebrew: w.hebrew,
      arabic: w.arabic,
      hasTranslation: !!(w.hebrew || w.arabic),
      isPhrase: false,
    }))]);

    // Also add to custom words in parent
    setCustomWords(prev => [...prev, ...customWordsToAdd]);

    setShowPreview(false);
    setPreviewAnalysis(null);
    setSubStep('editor');
  };

  const handlePreviewQuickSave = (customTranslations: Map<string, { hebrew: string; arabic: string }>) => {
    if (!previewAnalysis) return;

    const { matchedWords, unmatchedTerms } = previewAnalysis;

    // Build word IDs list for assignment
    const finalWordIds: number[] = [];
    const seenIds = new Set<number>();

    // Build word IDs list for assignment
    const wordIds: number[] = [];
    const processedIds = new Set<number>();

    // Add matched word IDs
    matchedWords.forEach(mw => {
      if (!seenIds.has(mw.word.id)) {
        finalWordIds.push(mw.word.id);
        seenIds.add(mw.word.id);
      }
    });

    // Create custom words with translations and get their IDs
    const customWordsToAdd = unmatchedTerms.map((term) => {
      const translations = customTranslations.get(term.term);
      const newWord: Word = {
        id: generateCustomId(),
        english: term.term,
        hebrew: translations?.hebrew || '',
        arabic: translations?.arabic || '',
        level: 'Custom',
      };
      return newWord;
    });

    // Add to custom words
    setCustomWords(prev => [...prev, ...customWordsToAdd]);

    // Collect all word IDs for the assignment
    const allWordIds = [...finalWordIds, ...customWordsToAdd.map(w => w.id)];

    // Set the words and proceed to step 2 to configure title, modes, date
    setSelectedWords(allWordIds);
    setShowPreview(false);
    setPreviewAnalysis(null);

    // Navigate to step 2 (configure title, modes, deadline)
    setStep(2);
  };

  // Cancel paste preview
  const handlePreviewCancel = () => {
    setShowPreview(false);
    setPreviewAnalysis(null);
  };

  // Handle word selection in browse mode
  const toggleWordSelection = (wordId: number) => {
    setSelectedWordIds(prev =>
      prev.includes(wordId)
        ? prev.filter(id => id !== wordId)
        : [...prev, wordId]
    );
  };

  // Add selected words from browse
  const addSelectedWords = () => {
    setSelectedWords(prev => [...new Set([...prev, ...selectedWordIds])]);
    setSubStep('editor');
    setEditedWords(getWordsWithStatus());
    setSelectedWordIds([]);
  };

  // Edit word translation
  const openEditModal = (word: WordWithStatus) => {
    setEditingWord(word);
    setEditTranslations({ hebrew: word.hebrew, arabic: word.arabic });
  };

  const saveTranslation = () => {
    if (!editingWord) return;

    // Update the word in editedWords
    setEditedWords(prev => prev.map(w =>
      w.id === editingWord.id
        ? { ...w, hebrew: editTranslations.hebrew, arabic: editTranslations.arabic, hasTranslation: !!(editTranslations.hebrew || editTranslations.arabic) }
        : w
    ));

    // Also update in customWords if it's a custom word
    const customWord = customWords.find(w => w.id === editingWord.id);
    if (customWord) {
      setCustomWords(prev => prev.map(w =>
        w.id === editingWord.id
          ? { ...w, hebrew: editTranslations.hebrew, arabic: editTranslations.arabic }
          : w
      ));
    }

    setEditingWord(null);
  };

  // Auto-translate all missing words using MyMemory Translation API (client-side, same as Quick Play)
  const handleAutoTranslate = async () => {
    const wordsWithoutTranslation = editedWords.filter(w => !w.hasTranslation);

    if (wordsWithoutTranslation.length === 0) {
      showToast?.('All words already have translations!', 'info');
      return;
    }

    setIsTranslating(true);

    try {
      // Translate each word using MyMemory API
      const translations = await Promise.all(
        wordsWithoutTranslation.map(async (word) => {
          const result = await translateWord(word.english);
          return { word, result };
        })
      );

      // Update words with successful translations
      let successCount = 0;
      setEditedWords(prev => prev.map(w => {
        if (!w.hasTranslation) {
          const translation = translations.find(t => t.word.id === w.id);
          if (translation?.result) {
            successCount++;
            return {
              ...w,
              hebrew: translation.result.hebrew,
              arabic: translation.result.arabic,
              hasTranslation: true
            };
          }
        }
        return w;
      }));

      // Also update in customWords
      const translatedCustomWords = wordsWithoutTranslation.filter(w => w.id < 0);
      if (translatedCustomWords.length > 0) {
        setCustomWords(prev => prev.map(w => {
          const translation = translations.find(t => t.word.id === w.id);
          if (translation?.result) {
            return {
              ...w,
              hebrew: translation.result.hebrew,
              arabic: translation.result.arabic
            };
          }
          return w;
        }));
      }

      if (successCount > 0) {
        showToast?.(`Successfully translated ${successCount} word${successCount !== 1 ? 's' : ''}!`, 'success');
      } else {
        showToast?.('Translation service unavailable. Please try again later.', 'error');
      }

    } catch (error) {
      console.error('Translation error:', error);
      showToast?.('Translation failed. Please try again later.', 'error');
    } finally {
      setIsTranslating(false);
    }
  };

  // Delete word
  const deleteWord = (wordId: number) => {
    setEditedWords(prev => prev.filter(w => w.id !== wordId));
    setSelectedWords(prev => prev.filter(id => id !== wordId));
  };

  // Join words into phrase
  const joinSelectedWords = () => {
    if (selectedWordIds.length !== 2) return;

    const [word1Id, word2Id] = selectedWordIds;
    const word1 = editedWords.find(w => w.id === word1Id);
    const word2 = editedWords.find(w => w.id === word2Id);

    if (!word1 || !word2) return;

    // Create phrase
    const phraseWord: WordWithStatus = {
      id: generateCustomId(),
      english: `${word1.english} ${word2.english}`,
      hebrew: word1.hebrew && word2.hebrew ? `${word1.hebrew} ${word2.hebrew}` : '',
      arabic: word1.arabic && word2.arabic ? `${word1.arabic} ${word2.arabic}` : '',
      hasTranslation: !!(word1.hebrew || word2.hebrew || word1.arabic || word2.arabic),
      isPhrase: true,
      phraseWords: [word1Id, word2Id],
    };

    // Remove individual words and add phrase
    setEditedWords(prev => [...prev.filter(w => w.id !== word1Id && w.id !== word2Id), phraseWord]);
    setSelectedWords(prev => [...prev.filter(id => id !== word1Id && id !== word2Id), phraseWord.id]);
    setJoinedWords(prev => [...prev, phraseWord.id]);
    setSelectedWordIds([]);
  };

  // Save word group
  const saveWordGroup = () => {
    if (!groupNameInput.trim()) return;

    const newGroup = {
      id: Date.now().toString(),
      name: groupNameInput,
      words: editedWords.map(w => w.id),
      createdAt: new Date().toISOString(),
    };

    const updated = [...savedGroups, newGroup];
    setSavedGroups(updated);
    saveGroupsToStorage(updated);
    setShowSaveGroup(false);
    setGroupNameInput('');
  };

  // Load saved group
  const loadSavedGroup = (groupId: string) => {
    const group = savedGroups.find(g => g.id === groupId);
    if (!group) return;

    setSelectedWords(group.words);
    setEditedWords(getWordsWithStatus());
    setSubStep('editor');
  };

  // Copy class code
  const copyClassCode = () => {
    navigator.clipboard.writeText(selectedClass.code);
    setCopiedCode(selectedClass.code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Share via WhatsApp
  const shareViaWhatsApp = () => {
    const text = `📚 Your vocabulary assignment is ready! Join class ${selectedClass.name} with code: ${selectedClass.code}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Get game mode config
  const getGameModeConfig = (modeId: string) => {
    for (const level of Object.values(GAME_MODE_LEVELS)) {
      const found = level.find(m => m.id === modeId);
      if (found) return found;
    }
    return null;
  };

  // Apply preset
  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    setAssignmentModes(preset.modes);
    setSelectedPreset(presetId);
  };

  // Toggle game mode
  const toggleGameMode = (modeId: string) => {
    setSelectedPreset(null);
    setAssignmentModes(prev =>
      prev.includes(modeId)
        ? prev.filter(m => m !== modeId)
        : [...prev, modeId]
    );
  };

  // Create assignment
  const handleCreate = () => {
    handleSaveAssignment();
    setShowSuccess(true);

    // Trigger confetti
    setTimeout(() => {
      setShowSuccess(false);
      setEditingAssignment(null); // Clear editing state after save
      onBack();
      setStep(1);
      setSubStep('landing');
    }, 4000);
  };

  // Debounced search query for filtering
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter words for browse (memoized + debounced)
  const filteredWords = useMemo(() => allWords.filter(word => {
    if (!debouncedSearch) return true;
    const query = debouncedSearch.toLowerCase();
    return (
      word.english.toLowerCase().includes(query) ||
      word.hebrew?.includes(query) ||
      word.arabic?.includes(query)
    );
  }), [allWords, debouncedSearch]);

  // Render Step 1 sub-steps
  const renderStep1 = () => {
    switch (subStep) {
      case 'landing':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-black text-on-surface mb-2">
                {editingAssignment ? 'Edit Assignment' : 'Create Assignment'}
              </h2>
              <p className="text-on-surface-variant">Choose how you'd like to add words</p>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-container/20 rounded-full border border-primary-container/30">
                <span className="text-sm font-bold text-primary">👥 Class: {selectedClass.name}</span>
              </div>
            </div>

            {/* Three main options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
              {/* Paste Word List - RECOMMENDED */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSubStep('paste')}
                className="w-full group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl p-4 sm:p-6 shadow-xl shadow-indigo-500/20 hover:shadow-2xl hover:shadow-indigo-500/30 transition-all text-left"
              >
                <div className="relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-black text-white mb-1">
                        Paste from anywhere
                      </h3>
                      <p className="text-white/90 text-xs sm:text-sm mb-2">
                        Copy words from PDF, book, or document
                      </p>
                      <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-2 bg-white/20 rounded-full">
                        <span className="text-white text-xs font-bold">⚡ Fastest • Most Flexible</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl sm:text-4xl">📋</span>
                      <ChevronRight className="text-white/60 group-hover:text-white/80 transition-colors" size={20} />
                    </div>
                  </div>
                </div>
              </motion.button>

              {/* Load Saved Group */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSubStep('saved-groups')}
                className="w-full group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-4 sm:p-6 shadow-xl shadow-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all text-left"
              >
                <div className="relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-black text-white mb-1">
                        Use saved group
                      </h3>
                      <p className="text-white/90 text-xs sm:text-sm mb-2">
                        Quick access to your previous word lists
                      </p>
                      {savedGroups.length > 0 && (
                        <div className="space-y-1 mb-2">
                          {savedGroups.slice(0, 3).map(group => (
                            <div key={group.id} className="text-white/90 text-xs bg-white/10 rounded-lg px-2 py-1 flex items-center justify-between">
                              <span>📁 {group.name}</span>
                              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{group.words.length} words</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-2 bg-white/20 rounded-full">
                        <span className="text-white text-xs font-bold">{savedGroups.length} saved groups available</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl sm:text-4xl">💾</span>
                      <ChevronRight className="text-white/60 group-hover:text-white/80 transition-colors" size={20} />
                    </div>
                  </div>
                </div>
              </motion.button>

              {/* Topic Packs */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSubStep('topic-packs')}
                className="w-full group relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-4 sm:p-6 shadow-xl shadow-amber-500/20 hover:shadow-2xl hover:shadow-amber-500/30 transition-all text-left"
              >
                <div className="relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-black text-white mb-1">
                        Topic Packs
                      </h3>
                      <p className="text-white/90 text-xs sm:text-sm mb-2">
                        Ready-made themed word collections
                      </p>
                      <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-2 bg-white/20 rounded-full">
                        <span className="text-white text-xs font-bold">{TOPIC_PACKS.length} packs available</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl sm:text-4xl">{"\uD83C\uDFAF"}</span>
                      <ChevronRight className="text-white/60 group-hover:text-white/80 transition-colors" size={20} />
                    </div>
                  </div>
                </div>
              </motion.button>

              {/* OCR Upload - PRO Feature */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                onClick={() => showToast?.("OCR scanning is a Pro feature. Coming soon!", "info")}
                className="w-full group relative overflow-hidden bg-stone-200 rounded-3xl p-4 sm:p-6 shadow-sm transition-all text-left cursor-not-allowed"
              >
                <span className="absolute top-3 right-3 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm z-10">PRO</span>
                <div className="relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg sm:text-xl font-black text-stone-500 mb-1">
                        Upload image
                      </h3>
                      <p className="text-stone-400 text-xs sm:text-sm mb-2">
                        Take a photo of a worksheet to extract words
                      </p>
                      <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-2 bg-stone-300/50 rounded-full">
                        <span className="text-stone-500 text-xs font-bold">Available in Pro plan</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl sm:text-4xl opacity-40">📷</span>
                    </div>
                  </div>
                </div>
              </motion.button>
            </div>

            {/* Cancel button */}
            <button
              onClick={onBack}
              className="w-full py-3 text-on-surface-variant font-bold flex items-center justify-center gap-2 hover:text-on-surface bg-surface-container-lowest px-6 py-3 rounded-full shadow-sm border-2 border-outline-variant/20 hover:border-outline-variant transition-all"
            >
              ← Cancel
            </button>
          </motion.div>
        );

      case 'paste':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSubStep('landing')}
                className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface font-bold transition-colors"
              >
                <ArrowLeft size={20} />
                Back
              </button>
              <div className="text-sm font-bold text-on-surface-variant">
                Step 1 of 3
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-black text-on-surface mb-2">
                Paste your words
              </h2>
              <p className="text-on-surface-variant">
                Type or paste words below. One per line, or separated by commas.
              </p>
            </div>

            {/* Textarea */}
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  ref={pasteAreaRef}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="apple, banana, orange, grape, mango"
                  className="w-full p-4 sm:p-6 rounded-2xl border-2 border-outline-variant/30 text-base resize-none focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/50 transition-all min-h-[120px]"
                  rows={4}
                />
                {pastedText && (
                  <div className="absolute bottom-3 right-3 text-xs text-primary font-medium bg-primary-container/20 px-2 py-1 rounded-full">
                    {pastedText.split(/[\s,;]+/).filter(w => w.trim()).length} words
                  </div>
                )}
              </div>

              {/* Paste from clipboard button */}
              <button
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setPastedText(text);
                  } catch {
                    // Clipboard API denied — focus the textarea so user can paste manually
                    pasteAreaRef.current?.focus();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-surface-container text-on-surface rounded-2xl font-bold hover:bg-surface-container-high border-2 border-outline-variant/20 transition-all"
              >
                <Clipboard size={18} />
                Paste from clipboard 📋
              </button>

              {/* Tip */}
              <div className="flex items-start gap-3 p-4 bg-tertiary-container/10 rounded-2xl border border-tertiary-container/20">
                <Sparkles className="text-tertiary shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-on-surface-variant">
                  <span className="font-bold text-on-surface">Tip:</span> You can edit translations and create phrases in the next step
                </p>
              </div>

              {/* Analyze button */}
              <button
                onClick={handlePasteAndAnalyze}
                disabled={!pastedText.trim()}
                className="w-full py-4 signature-gradient text-white rounded-2xl font-bold text-base shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                Analyze Words
                <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>
        );

      case 'editor':
        const hasTranslations = editedWords.filter(w => w.hasTranslation).length;
        const missingTranslations = editedWords.filter(w => !w.hasTranslation).length;
        const phraseCount = editedWords.filter(w => w.isPhrase).length;
        const customWordCount = editedWords.filter(w => w.id < 0).length;
        const hasDbWords = editedWords.some(w => w.id > 0);

        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
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
                Step 1 of 3
              </div>
            </div>

            {/* Title and stats */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-on-surface">
                Your words {editedWords.length > 0 && `(${editedWords.length})`}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setSubStep('paste')}
                  className="text-xs font-bold text-primary hover:text-primary-dim transition-colors"
                >
                  ← Paste new
                </button>
              </div>
            </div>

            {/* Custom words notice */}
            {customWordCount > 0 && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-2xl border border-amber-200">
                <span className="text-xl">💡</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-900">
                    {customWordCount} custom word{customWordCount !== 1 ? 's' : ''} (session-only)
                  </p>
                  <p className="text-xs text-amber-800">
                    Custom words and phrases work during this session, but won't be saved to the database. Only vocabulary words from the database will be persisted.
                  </p>
                </div>
              </div>
            )}

            {/* Status bar */}
            {editedWords.length > 0 && (
              <div className="flex items-center gap-4 text-sm text-on-surface-variant bg-surface-container-lowest px-4 py-2 rounded-full border border-outline-variant/10">
                <span>{editedWords.filter(w => !w.isPhrase).length} words</span>
                {phraseCount > 0 && <span>• {phraseCount} phrases</span>}
                {missingTranslations > 0 && <span className="text-amber-600">• {missingTranslations} missing translation</span>}
                {customWordCount > 0 && <span className="text-blue-600">• {customWordCount} session-only</span>}
              </div>
            )}

            {/* Translate all button */}
            {missingTranslations > 0 && (
              <button
                onClick={handleAutoTranslate}
                disabled={isTranslating}
                className="w-full flex items-center justify-center gap-2 py-3 bg-secondary-container text-on-secondary-container rounded-2xl font-bold hover:bg-secondary-container/80 border-2 border-outline-variant/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTranslating ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    AI is translating...
                  </>
                ) : (
                  <>
                    <Languages size={18} />
                    Translate all with AI ✨
                  </>
                )}
              </button>
            )}

            {/* Word list */}
            {editedWords.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📝</div>
                <p className="text-on-surface-variant">No words yet. Paste some words to get started!</p>
                <button
                  onClick={() => setSubStep('paste')}
                  className="mt-4 px-6 py-3 signature-gradient text-white rounded-xl font-bold shadow-lg shadow-blue-500/20"
                >
                  Paste Words
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                <AnimatePresence mode="popLayout">
                  {editedWords.map((word) => (
                    <motion.div
                      key={`paste-${word.id}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={`flex items-center gap-3 p-3 sm:p-4 rounded-2xl border-2 transition-all ${
                        selectedWordIds.includes(word.id)
                          ? 'border-primary bg-primary-container/10'
                          : word.isPhrase
                          ? 'border-amber-200 bg-amber-50/50'
                          : 'border-outline-variant/20 bg-surface-container-lowest'
                      }`}
                    >
                      {/* Checkbox for joining */}
                      <button
                        onClick={() => {
                          if (word.isPhrase) return; // Can't select phrases for joining
                          setSelectedWordIds(prev =>
                            prev.includes(word.id)
                              ? prev.filter(id => id !== word.id)
                              : prev.length < 2 ? [...prev, word.id] : prev
                          );
                        }}
                        disabled={word.isPhrase}
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          word.isPhrase
                            ? 'border-amber-300 bg-amber-100 cursor-not-allowed opacity-50'
                            : selectedWordIds.includes(word.id)
                            ? 'border-primary bg-primary'
                            : 'border-outline-variant/40 hover:border-primary/60'
                        }`}
                      >
                        {selectedWordIds.includes(word.id) && !word.isPhrase && (
                          <Check size={14} className="text-white" />
                        )}
                      </button>

                      {/* Word content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-on-surface truncate">
                            {word.english}
                          </span>
                          {word.isPhrase && (
                            <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                              phrase
                            </span>
                          )}
                          {!word.hasTranslation && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              ⚠️ No translation
                            </span>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm text-on-surface-variant truncate flex items-center gap-2">
                          {word.hebrew && <span>{word.hebrew}</span>}
                          {word.hebrew && word.arabic && <span className="text-outline/40">•</span>}
                          {word.arabic && <span>{word.arabic}</span>}
                          {!word.hebrew && !word.arabic && (
                            <span className="italic">No translation available</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 sm:gap-2">
                        {!word.hasTranslation && (
                          <button
                            onClick={() => openEditModal(word)}
                            className="p-2 text-primary hover:bg-primary-container/20 rounded-lg transition-colors"
                            title="Add translation"
                          >
                            <Plus size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(word)}
                          className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteWord(word.id)}
                          className="p-2 text-error hover:bg-error-container/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Actions footer */}
            {editedWords.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-outline-variant/10">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={joinSelectedWords}
                    disabled={selectedWordIds.length !== 2}
                    className="px-4 py-2 bg-amber-100 text-amber-800 rounded-xl font-bold text-sm hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Join {selectedWordIds.length}/2 as phrase
                  </button>
                  <button
                    onClick={() => setSelectedWordIds([])}
                    disabled={selectedWordIds.length === 0}
                    className="px-4 py-2 text-on-surface-variant hover:text-on-surface rounded-xl font-bold text-sm hover:bg-surface-container/50 disabled:opacity-50 transition-all"
                  >
                    Clear selection
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowSaveGroup(true)}
                    className="px-4 py-2 bg-surface-container text-on-surface rounded-xl font-bold text-sm hover:bg-surface-container-high border-2 border-outline-variant/20 transition-all flex items-center gap-2"
                  >
                    <Save size={16} />
                    Save as group
                  </button>
                  <button
                    onClick={() => {
                      setEditedWords([]);
                      setSelectedWords([]);
                    }}
                    className="px-4 py-2 text-error hover:bg-error-container/20 rounded-xl font-bold text-sm transition-all"
                  >
                    Clear all
                  </button>
                </div>

                <button
                  onClick={() => {
                    setSelectedWords(editedWords.map(w => w.id));
                    setStep(2);
                  }}
                  disabled={editedWords.length === 0 || !hasDbWords}
                  className="w-full py-4 signature-gradient text-white rounded-2xl font-bold text-base shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  Continue to Step 2
                  <ArrowRight size={20} />
                </button>

                {!hasDbWords && editedWords.length > 0 && (
                  <p className="text-xs text-center text-amber-700 bg-amber-100 px-3 py-2 rounded-xl">
                    ⚠️ At least one word from the vocabulary database is required to create an assignment
                  </p>
                )}
              </div>
            )}
          </motion.div>
        );

      case 'browse':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSubStep('landing')}
                className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface font-bold transition-colors"
              >
                <ArrowLeft size={20} />
                Back
              </button>
              <div className="text-sm font-bold text-on-surface-variant">
                Step 1 of 3
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-black text-on-surface mb-2">
                Browse vocabulary
              </h2>
              <p className="text-on-surface-variant">
                Search and select individual words from database
              </p>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search words..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-outline-variant/30 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/50 transition-all"
              />
            </div>

            {/* Word list */}
            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2">
              <AnimatePresence mode="popLayout">
                {filteredWords.slice(0, 80).map((word) => (
                  <motion.button
                    key={`browse-${word.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => toggleWordSelection(word.id)}
                    className={`w-full flex items-center gap-2 p-2 rounded-xl border-2 text-left transition-all ${
                      selectedWordIds.includes(word.id)
                        ? 'border-primary bg-primary-container/10'
                        : 'border-outline-variant/20 bg-surface-container-lowest hover:border-primary/30'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all ${
                      selectedWordIds.includes(word.id)
                        ? 'border-primary bg-primary'
                        : 'border-outline-variant/40'
                    }`}>
                      {selectedWordIds.includes(word.id) && <Check size={12} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-on-surface truncate">{word.english}</div>
                      <div className="text-xs text-on-surface-variant truncate flex items-center gap-2">
                        {word.hebrew && <span>{word.hebrew}</span>}
                        {word.hebrew && word.arabic && <span className="text-outline/40">•</span>}
                        {word.arabic && <span>{word.arabic}</span>}
                        {!word.hebrew && !word.arabic && (
                          <span className="italic">No translation available</span>
                        )}
                      </div>
                    </div>
                    {onPlayWord && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onPlayWord(word.id, word.english); }}
                        className="p-1.5 rounded-full hover:bg-surface-container-highest transition-colors flex-shrink-0"
                        aria-label={`Play pronunciation of ${word.english}`}
                        title={`Listen to "${word.english}"`}
                      >
                        <Volume2 size={14} className="text-on-surface-variant" />
                      </button>
                    )}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>

            {/* Footer actions */}
            <div className="space-y-3 pt-3 border-t border-outline-variant/10">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-on-surface-variant">
                  Selected: {selectedWordIds.length} words
                </span>
                {selectedWordIds.length > 0 && (
                  <button
                    onClick={() => setSelectedWordIds([])}
                    className="text-primary hover:text-primary-dim font-bold transition-colors"
                  >
                    Clear selection
                  </button>
                )}
              </div>

              <button
                onClick={addSelectedWords}
                disabled={selectedWordIds.length === 0}
                className="w-full py-4 signature-gradient text-white rounded-2xl font-bold text-base shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                Add {selectedWordIds.length} word{selectedWordIds.length !== 1 ? 's' : ''} to assignment
                <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>
        );

      case 'saved-groups':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSubStep('landing')}
                className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface font-bold transition-colors"
              >
                <ArrowLeft size={20} />
                Back
              </button>
              <div className="text-sm font-bold text-on-surface-variant">
                Step 1 of 3
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-black text-on-surface mb-2">
                Saved word groups
              </h2>
              <p className="text-on-surface-variant">
                Quick access to your previous word lists
              </p>
            </div>

            {/* Saved groups list */}
            {savedGroups.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">💾</div>
                <p className="text-on-surface-variant mb-4">No saved groups yet. Create your first one!</p>
                <button
                  onClick={() => setSubStep('paste')}
                  className="px-6 py-3 signature-gradient text-white rounded-xl font-bold shadow-lg shadow-blue-500/20"
                >
                  Create Word Group
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                <AnimatePresence mode="popLayout">
                  {savedGroups.map((group) => (
                    <motion.button
                      key={group.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => loadSavedGroup(group.id)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-outline-variant/20 bg-surface-container-lowest hover:border-primary/50 hover:bg-primary-container/5 transition-all text-left group"
                    >
                      <div className="text-3xl">📁</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-on-surface truncate">{group.name}</div>
                        <div className="text-sm text-on-surface-variant">
                          {group.words.length} word{group.words.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <ChevronRight className="text-on-surface-variant group-hover:text-primary transition-colors" size={20} />
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Create new group button */}
            <button
              onClick={() => setSubStep('paste')}
              className="w-full py-4 bg-surface-container text-on-surface rounded-2xl font-bold hover:bg-surface-container-high border-2 border-dashed border-outline-variant/40 hover:border-outline-variant/80 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Create new group
            </button>
          </motion.div>
        );

      case 'topic-packs':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSubStep('landing')}
                className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface font-bold transition-colors"
              >
                <ArrowLeft size={20} />
                Back
              </button>
              <div className="text-sm font-bold text-on-surface-variant">
                Step 1 of 3
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-black text-on-surface mb-2">
                Topic Packs
              </h2>
              <p className="text-on-surface-variant">
                Select a themed pack to add words instantly
              </p>
            </div>

            {/* Topic Packs Grid */}
            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {TOPIC_PACKS.map((pack) => {
                const wordCount = pack.ids.length;
                const isExpanded = expandedPack === pack.name;
                const packWords = allWords.filter(w => pack.ids.includes(w.id));
                const alreadySelected = pack.ids.filter(id => selectedWords.includes(id)).length;

                return (
                  <div key={pack.name} className="rounded-2xl border-2 border-outline-variant/20 bg-surface-container-lowest overflow-hidden transition-all">
                    {/* Pack Header - clickable to expand/collapse */}
                    <button
                      onClick={() => setExpandedPack(isExpanded ? null : pack.name)}
                      className="w-full flex items-center gap-3 p-3 sm:p-4 hover:bg-primary-container/5 transition-all text-left"
                    >
                      <span className="text-2xl sm:text-3xl">{pack.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-on-surface">{pack.name}</div>
                        <div className="text-xs text-on-surface-variant">
                          {wordCount} word{wordCount !== 1 ? 's' : ''}
                          {alreadySelected > 0 && (
                            <span className="ml-1 text-primary font-bold">
                              ({alreadySelected} selected)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (alreadySelected === wordCount && wordCount > 0) {
                              // Remove all words from this pack
                              const packIdSet = new Set(pack.ids);
                              setSelectedWords(selectedWords.filter(id => !packIdSet.has(id)));
                              if (showToast) showToast(`Removed ${alreadySelected} words from ${pack.name}`, 'info');
                            } else {
                              const newIds = pack.ids.filter(id => !selectedWords.includes(id));
                              if (newIds.length > 0) {
                                setSelectedWords([...selectedWords, ...newIds]);
                                if (showToast) showToast(`Added ${newIds.length} words from ${pack.name}`, 'success');
                              } else {
                                if (showToast) showToast(`All words from ${pack.name} already selected`, 'info');
                              }
                            }
                          }}
                          className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors ${
                            alreadySelected === wordCount && wordCount > 0
                              ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                              : 'bg-primary text-on-primary hover:bg-primary/90'
                          }`}
                        >
                          {alreadySelected === wordCount && wordCount > 0 ? '✕ Remove All' : alreadySelected > 0 ? `+ Add ${wordCount - alreadySelected} more` : '+ Add All'}
                        </motion.button>
                        <motion.div
                          animate={{ rotate: isExpanded ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronRight className="text-on-surface-variant" size={18} />
                        </motion.div>
                      </div>
                    </button>

                    {/* Expanded Word Preview */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-outline-variant/10">
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {packWords.map(word => {
                                const isSelected = selectedWords.includes(word.id);
                                return (
                                  <button
                                    key={word.id}
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedWords(selectedWords.filter(id => id !== word.id));
                                      } else {
                                        setSelectedWords([...selectedWords, word.id]);
                                      }
                                    }}
                                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                                      isSelected
                                        ? 'bg-primary text-on-primary shadow-sm'
                                        : 'bg-surface-container text-on-surface-variant hover:bg-primary-container/30 hover:text-on-surface'
                                    }`}
                                  >
                                    {isSelected && <span className="mr-1">{"\u2713"}</span>}
                                    {word.english}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Bottom action */}
            {selectedWords.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="sticky bottom-0 bg-surface/95 backdrop-blur-sm pt-3 pb-1"
              >
                <button
                  onClick={() => {
                    setSubStep('editor');
                  }}
                  className="w-full py-4 signature-gradient text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  Continue with {selectedWords.length} words
                  <ArrowRight size={20} />
                </button>
              </motion.div>
            )}
          </motion.div>
        );
    }
  };

  // Render Step 2: Configure
  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            setStep(1);
            setSubStep('landing');
          }}
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
          Configure assignment
        </h2>
        <p className="text-on-surface-variant">
          Add details and choose game modes
        </p>
      </div>

      {/* Assignment Details */}
      <div className="space-y-4">
        {/* Combined Template Selector */}
        <div>
          <label className="block text-sm font-bold text-on-surface mb-2">
            Quick template
          </label>
          <select
            value=""
            onChange={(e) => {
              const selected = ASSIGNMENT_TEMPLATES.find(t => t.title === e.target.value);
              if (selected) {
                setAssignmentTitle(selected.title);
                setInstructions(selected.instructions);
                if (selected.modes) setAssignmentModes(selected.modes);
              }
            }}
            className="w-full p-3 rounded-2xl border-2 border-outline-variant/30 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none bg-surface-container-high text-on-surface mb-4 cursor-pointer appearance-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4l5 5 5-5z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
              paddingRight: '2.5rem',
            }}
          >
            <option value="">{"\uD83D\uDCCB"} Choose a template...</option>
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
              onChange={(e) => setAssignmentTitle(e.target.value)}
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
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="Add a note for your students... or choose a template above"
              rows={2}
              className="w-full p-4 rounded-2xl border-2 border-outline-variant/30 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/50 transition-all resize-none"
            />
          </div>
        </div>
      </div>

      {/* Game Modes by Level */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-bold text-on-surface">
            Game modes
          </label>
          <button
            onClick={() => {
              const allModes = Object.values(GAME_MODE_LEVELS).flat().map(m => m.id);
              if (assignmentModes.length >= allModes.length) {
                setAssignmentModes(['flashcards']);
              } else {
                setAssignmentModes(allModes);
              }
              setSelectedPreset(null);
            }}
            className="text-xs font-bold text-primary hover:text-primary-dim transition-colors"
          >
            {assignmentModes.length >= 10 ? 'Clear all' : 'Select all'}
          </button>
        </div>

        {/* Compact grid layout - 5 columns for all modes */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Object.values(GAME_MODE_LEVELS).flat().map((mode) => {
              const isSelected = assignmentModes.includes(mode.id);
              return (
                <button
                  key={mode.id}
                  onClick={() => toggleGameMode(mode.id)}
                  className={`relative p-3 rounded-2xl border-2 transition-all duration-300 text-center ${
                    isSelected
                      ? 'border-primary bg-primary shadow-xl shadow-primary/40 scale-105'
                      : 'border-outline/20 bg-surface-container hover:border-outline/40 hover:bg-surface-container-high hover:shadow-md hover:scale-[1.02]'
                  }`}
                >
                  <div className={`text-2xl mb-1.5 transition-transform duration-300 ${isSelected ? 'scale-110' : 'scale-100'}`}>{mode.emoji}</div>
                  <div className={`text-xs font-bold transition-colors ${isSelected ? 'text-white' : 'text-on-surface-variant'}`}>{mode.name}</div>
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

      {/* Sentence Difficulty Level — only shown when Sentence Builder is selected */}
      {assignmentModes.includes('sentence-builder') && (
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
                  onClick={() => setSentenceDifficulty(level)}
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

          {/* AI Generate Button — only shown if teacher has AI access */}
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
                    setAssignmentSentences([...assignmentSentences, customSentenceInput.trim()]);
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
                    {/* Hover preview tooltip - smart positioning */}
                    <div className={`hidden group-hover:block z-10 w-80 sm:w-96 bg-surface rounded-xl shadow-xl border-2 border-outline-variant/30 p-3 pointer-events-none ${
                      isInFirstHalf ? 'absolute top-full left-0 mt-2' : 'absolute bottom-full left-0 mb-2'
                    }`}>
                      <div className="text-sm text-on-surface break-words" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {sentence}
                      </div>
                      {/* Arrow pointing direction */}
                      <div className={`absolute ${isInFirstHalf ? 'bottom-full left-4 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-surface -mt-px' : 'top-full left-4 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-surface -mt-px'}`} />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const updated = assignmentSentences.filter((_, i) => i !== idx);
                        setAssignmentSentences(updated);
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
                    setAssignmentSentences(updated);
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

      {/* Schedule (Optional) */}
      <div className="space-y-3">
        <label className="block text-sm font-bold text-on-surface">
          Schedule (optional)
        </label>
        <div>
          <label className="block text-xs text-on-surface-variant mb-1">Deadline</label>
          <input
            ref={dateInputRef}
            type="date"
            value={assignmentDeadline}
            onChange={(e) => setAssignmentDeadline(e.target.value)}
            onClick={() => dateInputRef.current?.showPicker?.()}
            min={new Date().toISOString().split('T')[0]}
            className="w-full p-3 rounded-xl border-2 border-outline-variant/30 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none bg-surface-container-lowest text-on-surface transition-all cursor-pointer"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={() => {
            setStep(1);
            setSubStep('editor');
          }}
          className="flex-1 py-4 bg-surface-container text-on-surface rounded-2xl font-bold hover:bg-surface-container-high border-2 border-outline-variant/20 transition-all"
        >
          ← Back
        </button>
        <button
          onClick={() => setStep(3)}
          disabled={!assignmentTitle.trim() || assignmentModes.length === 0}
          className="flex-1 py-4 signature-gradient text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none hover:shadow-xl transition-all flex items-center justify-center gap-2"
        >
          Review
          <ArrowRight size={20} />
        </button>
      </div>
    </motion.div>
  );

  // Render Step 3: Review
  const renderStep3 = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep(2)}
          className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface font-bold transition-colors"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="text-sm font-bold text-on-surface-variant">
          Step 3 of 3
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-black text-on-surface mb-2">
          Review assignment
        </h2>
        <p className="text-on-surface-variant">
          Check everything before {editingAssignment ? 'updating' : 'creating'}
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-surface-container-lowest rounded-3xl p-6 border-2 border-outline-variant/10 space-y-4">
        {/* Title */}
        <div>
          <div className="text-xs text-on-surface-variant mb-1">Assignment</div>
          <div className="text-xl font-black text-on-surface">{assignmentTitle}</div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-container/30 flex items-center justify-center">
              <BookOpen size={16} className="text-primary" />
            </div>
            <div>
              <div className="font-bold text-on-surface">{selectedWords.length} words</div>
              <div className="text-xs text-on-surface-variant">Ready to practice</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-secondary-container/30 flex items-center justify-center">
              <Target size={16} className="text-secondary" />
            </div>
            <div>
              <div className="font-bold text-on-surface">{assignmentModes.length} modes</div>
              <div className="text-xs text-on-surface-variant">Games selected</div>
            </div>
          </div>
        </div>

        {/* Game modes */}
        <div>
          <div className="text-xs text-on-surface-variant mb-2">Game modes</div>
          <div className="flex flex-wrap gap-2">
            {assignmentModes.map(mode => {
              const config = getGameModeConfig(mode);
              if (!config) return null;
              return (
                <span key={mode} className="px-3 py-1.5 bg-primary-container/20 text-primary rounded-full text-xs font-bold flex items-center gap-1">
                  {config.emoji} {config.name}
                </span>
              );
            })}
          </div>
        </div>

        {/* Instructions */}
        {instructions && (
          <div>
            <div className="text-xs text-on-surface-variant mb-1">Instructions for students</div>
            <div className="text-sm text-on-surface italic bg-surface-container p-3 rounded-xl">"{instructions}"</div>
          </div>
        )}

        {/* Deadline */}
        {assignmentDeadline && (
          <div>
            <div className="text-xs text-on-surface-variant mb-1">Deadline</div>
            <div className="text-sm text-on-surface">
              {new Date(assignmentDeadline).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        )}

        {/* Class */}
        <div className="pt-3 border-t border-outline-variant/10">
          <div className="text-xs text-on-surface-variant mb-1">Class</div>
          <div className="text-sm font-bold text-on-surface">{selectedClass.name}</div>
          {selectedClass.studentCount && (
            <div className="text-xs text-on-surface-variant">{selectedClass.studentCount} students</div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-4 bg-surface-container text-on-surface rounded-2xl font-bold hover:bg-surface-container-high border-2 border-outline-variant/20 transition-all"
        >
          ← Back
        </button>
        <button
          onClick={handleCreate}
          className="flex-1 py-4 signature-gradient text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all flex items-center justify-center gap-2"
        >
          <Check size={20} />
          {editingAssignment ? 'Update Assignment' : 'Create Assignment'}
        </button>
      </div>
    </motion.div>
  );

  // Render Success Screen
  if (showSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-6 flex items-center justify-center"
      >
        <div className="max-w-md w-full text-center space-y-6">
          {/* Success icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/30"
          >
            <Check size={48} className="text-white" />
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-3xl font-black text-stone-900 mb-2">
              Assignment created!
            </h2>
            <p className="text-stone-600">
              🎉 Your students can start now
            </p>
          </motion.div>

          {/* Assignment info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-3xl p-6 shadow-xl border border-stone-200 space-y-4"
          >
            <div>
              <div className="text-sm text-stone-500 mb-1">Assignment</div>
              <div className="font-bold text-stone-900">{assignmentTitle}</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-xs text-stone-500 mb-1">Class</div>
                <div className="font-bold text-stone-900">{selectedClass.name}</div>
              </div>
            </div>
          </motion.div>

          {/* Share code */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-3xl p-6 shadow-xl border border-stone-200"
          >
            <div className="text-sm text-stone-500 mb-3">Share with your students</div>
            <div className="bg-stone-100 rounded-2xl p-4 mb-3">
              <div className="text-xs text-stone-500 mb-1">Class Code</div>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-black text-stone-900 tracking-wider">
                  {selectedClass.code}
                </div>
                {copiedCode === selectedClass.code ? (
                  <div className="flex items-center gap-1 text-green-600 text-sm font-bold">
                    <Check size={16} />
                    Copied!
                  </div>
                ) : (
                  <button
                    onClick={copyClassCode}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center gap-2"
                  >
                    <Copy size={16} />
                    Copy
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyClassCode}
                className="flex-1 py-3 bg-stone-100 text-stone-700 rounded-xl font-bold hover:bg-stone-200 transition-all flex items-center justify-center gap-2"
              >
                <Copy size={18} />
                Copy code
              </button>
              <button
                onClick={shareViaWhatsApp}
                className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-all flex items-center justify-center gap-2"
              >
                <Share2 size={18} />
                WhatsApp
              </button>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <button
              onClick={() => {
                setShowSuccess(false);
                setStep(1);
                setSubStep('landing');
                setAssignmentTitle('');
                setInstructions('');
                setSelectedPreset(null);
              }}
              className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all"
            >
              Create another
            </button>
            <button
              onClick={onBack}
              className="flex-1 py-4 bg-stone-100 text-stone-700 rounded-2xl font-bold hover:bg-stone-200 transition-all"
            >
              Back to dashboard
            </button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // AI sentence generation handler
  const generateAISentences = async () => {
    setIsGeneratingAI(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("No auth token");
      const apiUrl = (import.meta as any).env?.VITE_API_URL || '';
      const allPossibleWords = [...allWords, ...(customWords || [])];
      const uniqueWordsMap = new Map(allPossibleWords.map(w => [w.id, w]));
      const selectedWordTexts = selectedWords
        .map(id => uniqueWordsMap.get(id)?.english)
        .filter((w): w is string => !!w);
      if (selectedWordTexts.length === 0) return;
      const res = await fetch(`${apiUrl}/api/generate-sentences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ words: selectedWordTexts, difficulty: sentenceDifficulty }),
      });
      if (!res.ok) throw new Error("AI generation failed");
      const { sentences } = await res.json();
      setAssignmentSentences(sentences);
      showToast?.("AI sentences generated!", "success");
    } catch {
      showToast?.("AI unavailable — using template sentences", "info");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Main render
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Step Progress Indicator */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6">
          {[1, 2, 3].map(s => (
            <React.Fragment key={s}>
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all ${
                  step >= s
                    ? 'signature-gradient text-white shadow-lg shadow-blue-500/20'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {step > s ? <Check size={14} /> : s}
              </motion.div>
              {s < 3 && (
                <div className={`flex-1 h-1 sm:h-1.5 rounded-full transition-all ${step > s ? 'bg-primary' : 'bg-surface-container'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && !showSuccess && renderStep3()}
        </AnimatePresence>
      </div>

      {/* Edit Translation Modal */}
      <AnimatePresence>
        {editingWord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-surface-container-lowest rounded-3xl p-6 max-w-md w-full shadow-2xl border-2 border-outline-variant/20"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-on-surface">Edit translation</h3>
                <button
                  onClick={() => setEditingWord(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Word */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-on-surface mb-2">Word</label>
                <div className="p-3 bg-surface-container rounded-xl text-on-surface">
                  {editingWord.english}
                </div>
                <div className="text-xs text-on-surface-variant mt-1">(read-only)</div>
              </div>

              {/* Hebrew */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-on-surface mb-2">Hebrew translation</label>
                <input
                  type="text"
                  value={editTranslations.hebrew}
                  onChange={(e) => setEditTranslations(prev => ({ ...prev, hebrew: e.target.value }))}
                  placeholder="תרגום בעברית"
                  className="w-full p-3 rounded-xl border-2 border-outline-variant/30 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/50 transition-all"
                  dir="rtl"
                />
              </div>

              {/* Arabic */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-on-surface mb-2">Arabic translation</label>
                <input
                  type="text"
                  value={editTranslations.arabic}
                  onChange={(e) => setEditTranslations(prev => ({ ...prev, arabic: e.target.value }))}
                  placeholder="ترجمة بالعربية"
                  className="w-full p-3 rounded-xl border-2 border-outline-variant/30 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/50 transition-all"
                  dir="rtl"
                />
              </div>

              {/* Tip */}
              <div className="flex items-start gap-3 p-3 bg-tertiary-container/10 rounded-xl border border-tertiary-container/20 mb-6">
                <Sparkles className="text-tertiary shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-on-surface-variant">
                  Leave empty to skip translation (students will still hear the pronunciation)
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingWord(null)}
                  className="flex-1 py-3 bg-surface-container text-on-surface rounded-xl font-bold hover:bg-surface-container-high transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTranslation}
                  className="flex-1 py-3 signature-gradient text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all"
                >
                  Save ✓
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Group Modal */}
      <AnimatePresence>
        {showSaveGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-surface-container-lowest rounded-3xl p-6 max-w-md w-full shadow-2xl border-2 border-outline-variant/20"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-on-surface">Save word group</h3>
                <button
                  onClick={() => setShowSaveGroup(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-on-surface mb-2">Group name</label>
                <input
                  type="text"
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  placeholder="e.g., Fruits - Unit 5"
                  className="w-full p-3 rounded-xl border-2 border-outline-variant/30 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/50 transition-all"
                />
                <div className="text-xs text-on-surface-variant mt-1">
                  {editedWords.length} words will be saved
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSaveGroup(false);
                    setGroupNameInput('');
                  }}
                  className="flex-1 py-3 bg-surface-container text-on-surface rounded-xl font-bold hover:bg-surface-container-high transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={saveWordGroup}
                  disabled={!groupNameInput.trim()}
                  className="flex-1 py-3 signature-gradient text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none hover:shadow-xl transition-all"
                >
                  Save ✓
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Paste Preview Modal */}
      {showPreview && previewAnalysis && (
        <PastePreviewModal
          analysis={previewAnalysis}
          onConfirm={handlePreviewConfirm}
          onCancel={handlePreviewCancel}
          onQuickSave={handlePreviewQuickSave}
          onRemoveUnmatched={(term) => {
            // Remove unmatched term from preview
            if (previewAnalysis) {
              const updatedAnalysis = {
                ...previewAnalysis,
                unmatchedTerms: previewAnalysis.unmatchedTerms.filter(t => t.term !== term),
                stats: {
                  ...previewAnalysis.stats,
                  unmatchedCount: previewAnalysis.stats.unmatchedCount - 1,
                  totalTerms: previewAnalysis.stats.totalTerms - 1,
                },
              };
              setPreviewAnalysis(updatedAnalysis);
            }
          }}
          onRemoveMatched={(wordId) => {
            // Remove matched word from preview
            if (previewAnalysis) {
              const updatedAnalysis = {
                ...previewAnalysis,
                matchedWords: previewAnalysis.matchedWords.filter(mw => mw.word.id !== wordId),
                stats: {
                  ...previewAnalysis.stats,
                  matchedCount: previewAnalysis.stats.matchedCount - 1,
                  totalTerms: previewAnalysis.stats.totalTerms - 1,
                },
              };
              setPreviewAnalysis(updatedAnalysis);
            }
          }}
        />
      )}
    </div>
  );
};
