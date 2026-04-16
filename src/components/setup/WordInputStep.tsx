/**
 * WordInputStep — shared word-input step for both Quick Play and Assignment flows.
 * Combines Quick Play search-based input with Assignment paste/browse/saved-groups/topic-packs.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Check, ChevronRight, ChevronDown, Search, Plus, Trash2, Edit2,
  Clipboard, ArrowRight, ArrowLeft, Sparkles, Save, Star, FileText,
  Volume2, Loader2, Languages, Camera, Info, BookOpen,
  FolderOpen, Copy, Share2, Filter, Lock, Undo2, AlertTriangle, AlertCircle, Eye,
} from 'lucide-react';
import { Word } from '../../data/vocabulary';
import { analyzePastedText, type WordAnalysisResult } from '../../utils/wordAnalysis';
import { extractRootWord } from '../../data/vocabulary-matching';
import { PastePreviewModal } from '../PastePreviewModal';
import { WizardMode, WordInputSubStep, AssignmentData } from './types';
import {
  getWorstPerformingWords,
  getWordPerformance,
  type WordSuggestion,
  type GameResult as SpacedRepGameResult,
} from '../../utils/spacedRepetition';

// ── Ambiguous Words Map (context disambiguation) ──────────────────────────────
const AMBIGUOUS_WORDS: Record<string, string[]> = {
  bank: ['River bank', 'Financial bank'],
  bark: ['Tree bark', 'Dog bark'],
  bat: ['Animal bat', 'Baseball bat'],
  bow: ['Bow and arrow', 'Bow of a ship', 'Bow tie'],
  cell: ['Biological cell', 'Phone cell'],
  charge: ['Electric charge', 'To charge forward', 'To charge money'],
  date: ['Calendar date', 'Romantic date', 'Fruit date'],
  drop: ['To drop something', 'A water drop'],
  fair: ['Fair (just)', 'Fair (carnival)', 'Fair complexion'],
  fire: ['Fire (flames)', 'To fire (job)', 'To fire (weapon)'],
  flat: ['Flat (level)', 'Flat (apartment)', 'Flat tire'],
  fly: ['To fly (air)', 'The insect fly'],
  ground: ['Ground (earth)', 'Ground (coffee)'],
  hang: ['To hang (suspend)', 'To hang (curtain)'],
  iron: ['Metal iron', 'To iron clothes'],
  jam: ['Fruit jam', 'Traffic jam'],
  key: ['Door key', 'Music key', 'Keyboard key'],
  leaves: ['Tree leaves', 'He/she leaves'],
  light: ['Light (brightness)', 'Light (weight)'],
  match: ['Match (game)', 'Match (fire)', 'Match (pair)'],
  mine: ['Possessive mine', 'Coal mine'],
  nail: ['Fingernail', 'Metal nail'],
  park: ['Park (recreation)', 'To park a car'],
  play: ['To play (game)', 'A theater play'],
  pool: ['Swimming pool', 'Pool (game)'],
  ring: ['Jewelry ring', 'To ring a bell'],
  rock: ['Stone rock', 'Music rock'],
  roll: ['To roll (move)', 'Bread roll'],
  rose: ['Flower rose', 'Past tense of rise'],
  scale: ['Musical scale', 'Weight scale', 'Fish scale'],
  seal: ['Animal seal', 'Seal (stamp)'],
  spring: ['Season spring', 'Metal spring', 'Water spring'],
  square: ['Shape square', 'Town square'],
  stick: ['Wooden stick', 'To stick (adhere)'],
  suit: ['Clothing suit', 'To suit (fit)'],
  tank: ['Military tank', 'Water tank'],
  tie: ['Necktie', 'To tie (knot)', 'Tie (draw)'],
  watch: ['Wristwatch', 'To watch (look)'],
  well: ['Water well', 'Well (good)'],
};

// ── RTL detection helper ──────────────────────────────────────────────────────
function detectInputLanguage(text: string): 'english' | 'hebrew' | 'arabic' {
  if (!text.trim()) return 'english';
  const firstChar = text.trim().charCodeAt(0);
  if (firstChar >= 0x0590 && firstChar <= 0x05FF) return 'hebrew';
  if (firstChar >= 0x0600 && firstChar <= 0x06FF) return 'arabic';
  return 'english';
}

// ── Game Word Count Configuration ────────────────────────────────────────────
const GAME_WORD_COUNTS: Record<string, { min: number; max: number; label: string }> = {
  'bingo': { min: 24, max: 36, label: 'Bingo' },
  'memory': { min: 8, max: 16, label: 'Memory Match' },
  'quiz': { min: 10, max: 50, label: 'Quiz' },
  'flashcards': { min: 1, max: 100, label: 'Flashcards' },
  'matching': { min: 6, max: 24, label: 'Matching' },
  'classic': { min: 5, max: 50, label: 'Classic' },
  'listening': { min: 5, max: 30, label: 'Listening' },
  'spelling': { min: 5, max: 20, label: 'Spelling' },
  'scramble': { min: 5, max: 20, label: 'Scramble' },
  'reverse': { min: 5, max: 30, label: 'Reverse' },
  'sentence-builder': { min: 10, max: 50, label: 'Sentence Builder' },
  'true-false': { min: 5, max: 30, label: 'True/False' },
  'letter-sounds': { min: 5, max: 20, label: 'Letter Sounds' },
};

// ── Utility Functions ───────────────────────────────────────────────────────
function uniqueNegativeId(offset = 0): number {
  return -(Date.now() + offset + Math.floor(Math.random() * 10000));
}

interface WordWithStatus {
  id: number;
  english: string;
  hebrew: string;
  arabic: string;
  hasTranslation: boolean;
  isPhrase: boolean;
  phraseWords?: number[];
}

interface SavedGroup {
  id: string;
  name: string;
  words: number[];
  createdAt: string;
}

function parseSearchTerms(query: string): string[] {
  if (!query.trim()) return [];
  const terms: string[] = [];
  let remainingText = query;
  
  // Handle quoted phrases
  const quoteRegex = /(["'])(?:(?=(\1?))\2.)*?\1/g;
  const quotes: string[] = [];
  let m;
  while ((m = quoteRegex.exec(query)) !== null) {
    quotes.push(m[0].replace(/["']/g, '').trim().toLowerCase());
  }
  remainingText = query.replace(/(["'])(?:(?=(\1?))\2.)*?\1/g, '');

  // Split by commas and newlines
  const splitTerms = remainingText
    .split(/[,\n]+/)
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 0);

  terms.push(...quotes, ...splitTerms);
  return terms;
}

// ── Props Interface ───────────────────────────────────────────────────────────
export interface WordInputStepProps {
  mode: WizardMode;
  allWords: Word[];
  set1Words?: Word[];
  set2Words?: Word[];
  selectedWords: Word[];
  onSelectedWordsChange: (words: Word[]) => void;
  onNext: () => void;
  onBack: () => void;
  autoMatchPartial: boolean;
  showLevelFilter: boolean;
  gameType?: string; // For word count guidance
  // Spaced repetition props
  classId?: string; // For loading worst-performing words
  showSuggestedWords?: boolean; // Enable "Needs Practice" section
  onTranslateWord?: (word: string) => Promise<{ hebrew: string; arabic: string; match: number } | null>;
  onOcrUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isOcrProcessing?: boolean;
  ocrProgress?: number;
  ocrStatus?: string;
  onDocxUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPlayWord?: (wordId: number, fallbackText?: string) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  topicPacks?: Array<{ name: string; icon: string; ids: number[] }>;
  customWords?: Word[];
  onCustomWordsChange?: (words: Word[]) => void;
  editingAssignment?: AssignmentData | null;
}


// ── Main Component ───────────────────────────────────────────────────────────
export const WordInputStep: React.FC<WordInputStepProps> = ({
  mode,
  allWords,
  set1Words,
  set2Words,
  selectedWords,
  onSelectedWordsChange,
  onNext,
  onBack,
  autoMatchPartial,
  showLevelFilter,
  gameType,
  classId,
  showSuggestedWords = false,
  onTranslateWord,
  onOcrUpload,
  isOcrProcessing = false,
  ocrProgress = 0,
  ocrStatus = "",
  onDocxUpload,
  onPlayWord,
  showToast,
  topicPacks = [],
  customWords = [],
  onCustomWordsChange,
  editingAssignment = null,
}) => {
  // ── Tab state (replaces old card-based sub-step navigation) ─────────────────
  const [subStep, setSubStepRaw] = useState<WordInputSubStep>('paste');

  // Simple tab switching — no history manipulation needed since tabs
  // are always visible (no "back to landing" concept anymore).
  const setSubStep = useCallback((newSubStep: WordInputSubStep) => {
    setSubStepRaw(newSubStep);
  }, []);

  // ── Search/query state ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  
  // ── Custom word translation state ────────────────────────────────────────────
  const [customWordMap, setCustomWordMap] = useState<Map<string, { hebrew: string; arabic: string }>>(new Map());
  const [addingCustom, setAddingCustom] = useState<Set<string>>(new Set());
  const [translating, setTranslating] = useState<Set<string>>(new Set());
  
  // ── Word editor state ────────────────────────────────────────────────────────
  const [wordEditorOpen, setWordEditorOpen] = useState(false);
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  
  // ── Preview state ────────────────────────────────────────────────────────────
  const [showPreviewInline, setShowPreviewInline] = useState(false);
  const [previewAnalysis, setPreviewAnalysis] = useState<WordAnalysisResult | null>(null);
  
  // ── Saved groups state ───────────────────────────────────────────────────────
  const [savedGroups, setSavedGroups] = useState<SavedGroup[]>([]);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [showSaveGroup, setShowSaveGroup] = useState(false);
  
  // ── Level filter state (Assignment only) ─────────────────────────────────────
  const [selectedLevel, setSelectedLevel] = useState<'Set 1' | 'Set 2' | 'Set 3' | 'Custom'>('Set 1');
  
  // ── Topic packs state ────────────────────────────────────────────────────────
  const [expandedPack, setExpandedPack] = useState<string | null>(null);

  // ── Selected words collapse state ─────────────────────────────────────────────
  const [selectedWordsCollapsed, setSelectedWordsCollapsed] = useState(false);

  // ── Autocomplete state ────────────────────────────────────────────────────────
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);
  const continueButtonRef = useRef<HTMLButtonElement>(null);

  // ── Undo state (multi-step stack, max 10) ────────────────────────────────────
  const [undoStack, setUndoStack] = useState<Word[][]>([]);
  const pushUndo = (snapshot: Word[]) => {
    setUndoStack(prev => [...prev.slice(-9), snapshot]);
  };
  const handleUndo = () => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const restored = prev[prev.length - 1];
      onSelectedWordsChange(restored);
      showToast?.('Undone', 'info');
      return prev.slice(0, -1);
    });
  };
  const hasUndo = undoStack.length > 0;

  // ── Draft auto-save ──────────────────────────────────────────────────────────
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Clipboard detection ───────────────────────────────────────────────────────
  const [clipboardBanner, setClipboardBanner] = useState<{ wordCount: number; text: string } | null>(null);

  // ── Spaced repetition suggested words ──────────────────────────────────────────
  const [suggestedWords, setSuggestedWords] = useState<Word[]>([]);

  // Debounced save to localStorage on every selectedWords change
  useEffect(() => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    if (selectedWords.length === 0) return;
    draftTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem('vocaband-draft', JSON.stringify({
          words: selectedWords,
          savedAt: new Date().toISOString(),
          mode,
        }));
      } catch {}
    }, 500);
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current); };
  }, [selectedWords, mode]);

  // On mount: check for existing draft < 48h old
  useEffect(() => {
    try {
      const raw = localStorage.getItem('vocaband-draft');
      if (!raw) return;
      const draft = JSON.parse(raw);
      const age = Date.now() - new Date(draft.savedAt).getTime();
      const maxAge = 48 * 60 * 60 * 1000; // 48 hours
      if (age < maxAge && draft.words?.length > 0) {
        setShowDraftBanner(true);
      } else {
        localStorage.removeItem('vocaband-draft');
      }
    } catch {}
  }, []);

  // Automatic clipboard detection disabled — teachers reported the
  // "📋 Clipboard has N words" banner as annoying on every page load.
  // Manual "Paste from clipboard" button is still available below.
  // useEffect(() => {
  //   const checkClipboard = async () => {
  //     try {
  //       const text = await navigator.clipboard.readText();
  //       if (!text || !text.trim()) return;
  //       const words = text.trim().split(/[\s,\n]+/).filter(w => w.length > 0);
  //       if (words.length >= 2) {
  //         setClipboardBanner({ wordCount: words.length, text });
  //       }
  //     } catch (error) {
  //       console.debug('Clipboard access denied or unavailable');
  //     }
  //   };
  //   checkClipboard();
  // }, []);

  // Load worst-performing words from spaced repetition data
  useEffect(() => {
    if (classId && showSuggestedWords && allWords.length > 0) {
      const wordIds = allWords.map(w => w.id);
      const worstWords = getWorstPerformingWords(classId, wordIds, 10);
      const words = worstWords
        .map(ws => allWords.find(w => w.id === ws.wordId))
        .filter((w): w is Word => w !== undefined);
      setSuggestedWords(words);
    } else {
      setSuggestedWords([]);
    }
  }, [classId, allWords, showSuggestedWords]);

  // Clear draft when navigating to Step 2
  const handleNextAndClearDraft = () => {
    try { localStorage.removeItem('vocaband-draft'); } catch {}
    onNext();
  };

  // Ctrl+Z keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && hasUndo) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ── Related words state ─────────────────────────────────────────────────────
  const [relatedSuggestions, setRelatedSuggestions] = useState<Word[]>([]);
  const relatedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Recently used words ─────────────────────────────────────────────────────
  const [recentlyUsedIds, setRecentlyUsedIds] = useState<number[]>([]);

  // ── Inline translation editor state ────────────────────────────────────────
  const [editingWordId, setEditingWordId] = useState<number | null>(null);
  const [editHebrew, setEditHebrew] = useState('');
  const [editArabic, setEditArabic] = useState('');
  const [editIsCore, setEditIsCore] = useState(false);
  const [autoTranslating, setAutoTranslating] = useState<number | null>(null);
  const [batchTranslating, setBatchTranslating] = useState(false);

  // ── Language preference ─────────────────────────────────────────────────────
  const [languagePref, setLanguagePref] = useState<'both' | 'hebrew' | 'arabic'>('both');

  // ── Translation quality tracking ────────────────────────────────────────────
  const [matchScores, setMatchScores] = useState<Map<number, number>>(new Map());
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);

  // ── Context disambiguation ──────────────────────────────────────────────────
  const [contextChoices, setContextChoices] = useState<Map<string, string>>(new Map());

  // ── Multi-select mode ──────────────────────────────────────────────────────
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [multiSelectedIds, setMultiSelectedIds] = useState<Set<number>>(new Set());
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);

  // ── Sort + filter toolbar ──────────────────────────────────────────────────
  const [chipSortBy, setChipSortBy] = useState<'default' | 'az' | 'level' | 'date'>('default');
  const [chipFilter, setChipFilter] = useState<'all' | 'missing' | 'custom' | 'flagged'>('all');
  const [levelDistFilter, setLevelDistFilter] = useState<'all' | 'Set 1' | 'Set 2' | 'Set 3' | 'Custom'>('all');

  // Escape exits multi-select mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && multiSelectMode) {
        e.preventDefault();
        setMultiSelectMode(false);
        setMultiSelectedIds(new Set());
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [multiSelectMode]);

  // ── Cleanup on unmount: close overlays, modals, editors ──────────────────────
  useEffect(() => {
    return () => {
      setShowAutocomplete(false);
      setWordEditorOpen(false);
      setShowPreviewInline(false);
      setEditingWordId(null);
      setRelatedSuggestions([]);
      if (relatedTimerRef.current) clearTimeout(relatedTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Calculate word difficulty ───────────────────────────────────────────────────
  const getDifficultyLevel = (word: Word): 'easy' | 'medium' | 'hard' => {
    const len = word.english.length;
    if (len <= 5) return 'easy';
    if (len <= 10) return 'medium';
    return 'hard';
  };

  // ── Extract part of speech from word ───────────────────────────────────────────────
  const getPartOfSpeech = (word: Word): string | null => {
    // Check if word has explicit POS field
    if (word.pos) return word.pos;

    // Extract from word text (e.g., "word (n)", "word (v)")
    const posMatch = word.english.match(/\((n|v|adj|adv|prep|pron|conj|interj|article|det)\)$/i);
    if (posMatch) {
      const posMap: Record<string, string> = {
        'n': 'Noun',
        'v': 'Verb',
        'adj': 'Adjective',
        'adv': 'Adverb',
        'prep': 'Preposition',
        'pron': 'Pronoun',
        'conj': 'Conjunction',
        'interj': 'Interjection',
        'article': 'Article',
        'det': 'Determiner'
      };
      return posMap[posMatch[1].toLowerCase()] || posMatch[1].toUpperCase();
    }

    return null;
  };

  // ── Copy selected words to clipboard ───────────────────────────────────────────────
  const copyWordsToClipboard = async () => {
    if (selectedWords.length === 0) {
      showToast?.('No words to copy', 'info');
      return;
    }

    const text = selectedWords.map(w =>
      `${w.english}${w.hebrew ? ` | ${w.hebrew}` : ''}${w.arabic ? ` | ${w.arabic}` : ''}`
    ).join('\n');

    try {
      await navigator.clipboard.writeText(text);
      showToast?.(`Copied ${selectedWords.length} word${selectedWords.length !== 1 ? 's' : ''} to clipboard`, 'success');
    } catch {
      showToast?.('Failed to copy to clipboard', 'error');
    }
  };

  // ── Get autocomplete suggestions ────────────────────────────────────────────────
  const autocompleteSuggestions = useMemo(() => {
    if (!searchQuery.trim() || !showAutocomplete) return [];

    const query = searchQuery.toLowerCase().trim();
    const currentWord = query.split(/[,\n]+/).pop()?.trim() || query;

    if (!currentWord) return [];

    // Get matching words from vocabulary — support RTL search
    const inputLang = detectInputLanguage(currentWord);
    const matches = allWords.filter(word => {
      if (inputLang === 'hebrew') {
        return (word.hebrew && word.hebrew.toLowerCase().includes(currentWord)) || false;
      } else if (inputLang === 'arabic') {
        return (word.arabic && word.arabic.toLowerCase().includes(currentWord)) || false;
      }
      const englishLower = word.english.toLowerCase();
      return englishLower.includes(currentWord) || currentWord.includes(englishLower);
    });

    // Deduplicate by ID
    const uniqueMatches = Array.from(
      new Map(matches.map(w => [w.id, w])).values()
    );

    // Sort by relevance (exact match first, then starts with, then contains)
    const sorted = uniqueMatches.sort((a, b) => {
      const aLower = a.english.toLowerCase();
      const bLower = b.english.toLowerCase();

      // Exact match first
      if (aLower === currentWord) return -1;
      if (bLower === currentWord) return 1;

      // Starts with current word
      const aStarts = aLower.startsWith(currentWord);
      const bStarts = bLower.startsWith(currentWord);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      // By length (shorter first)
      return a.english.length - b.english.length;
    });

    // Return top 8 suggestions
    return sorted.slice(0, 8);
  }, [searchQuery, allWords, showAutocomplete]);

  // ── Check if word is duplicate ───────────────────────────────────────────────────
  const isDuplicateWord = (word: Word): boolean => {
    return selectedWords.some(w => w.id === word.id);
  };

  // ── Add suggestion to selection ────────────────────────────────────────────────
  const addSuggestion = (word: Word) => {
    if (isDuplicateWord(word)) {
      showToast?.(`"${word.english}" is already in your list`, 'info');
      return;
    }
    pushUndo([...selectedWords]);
    onSelectedWordsChange([...selectedWords, word]);
    saveToRecentlyUsed([...selectedWords, word]);
    // Clear search so teacher can immediately type the next word
    setSearchQuery('');
    setShowAutocomplete(false);
    setSelectedWordsCollapsed(false);
    // Show related words
    showRelatedWords(word);
    // Refocus input for rapid word entry
    setTimeout(() => autocompleteRef.current?.focus(), 50);
  };

  // ── Add all selected suggestions ─────────────────────────────────────────────────
  const addSelectedSuggestions = () => {
    const newWords = autocompleteSuggestions.filter(w =>
      selectedSuggestions.has(w.id) && !isDuplicateWord(w)
    );
    if (newWords.length > 0) {
      pushUndo([...selectedWords]);
      onSelectedWordsChange([...selectedWords, ...newWords]);
      saveToRecentlyUsed([...selectedWords, ...newWords]);
      setSelectedSuggestions(new Set());
    }
  };

  // ── Save words to recently used (localStorage) ─────────────────────────────────
  const saveToRecentlyUsed = (words: Word[]) => {
    try {
      const ids = words.map(w => w.id).filter(id => id > 0);
      const existing = JSON.parse(localStorage.getItem('vocaband_recent_words') || '[]') as number[];
      const merged = [...new Set([...ids, ...existing])].slice(0, 30);
      localStorage.setItem('vocaband_recent_words', JSON.stringify(merged));
      setRecentlyUsedIds(merged);
    } catch {}
  };

  // ── Show related words after adding a word ────────────────────────────────────
  const showRelatedWords = (addedWord: Word) => {
    if (relatedTimerRef.current) clearTimeout(relatedTimerRef.current);
    const root = extractRootWord(addedWord.english.toLowerCase());
    if (root.length <= 2) { setRelatedSuggestions([]); return; }
    const related = allWords.filter(w =>
      w.id !== addedWord.id &&
      !selectedWords.some(sw => sw.id === w.id) &&
      extractRootWord(w.english.toLowerCase()) === root
    ).slice(0, 5);
    setRelatedSuggestions(related);
    if (related.length > 0) {
      relatedTimerRef.current = setTimeout(() => setRelatedSuggestions([]), 10000);
    }
  };

  // ── Quick-add: exact-match lookup for typed/pasted words ──────────────────────
  const handleQuickAdd = async () => {
    if (!searchQuery.trim()) return;

    // Split input into individual terms (spaces, commas, newlines, semicolons)
    const terms = searchQuery
      .trim()
      .split(/[\s,;\n]+/)
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    // Remove duplicates from input
    const uniqueTerms = [...new Set(terms)];

    const matched: Word[] = [];
    const unmatchedTerms: string[] = [];

    // Build set of already-selected English words (lowercase) for dedup
    const selectedEnglishSet = new Set(selectedWords.map(w => w.english.toLowerCase()));

    for (const term of uniqueTerms) {
      // Skip if already selected (by English text, not just ID)
      if (selectedEnglishSet.has(term)) continue;

      // Try exact english match
      const exact = allWords.find(w => w.english.toLowerCase() === term);
      if (exact) {
        if (!matched.some(m => m.id === exact.id)) {
          matched.push(exact);
        }
        continue;
      }

      // Try exact hebrew match
      const hebrew = allWords.find(w => w.hebrew && w.hebrew === term);
      if (hebrew) {
        if (!matched.some(m => m.id === hebrew.id)) {
          matched.push(hebrew);
        }
        continue;
      }

      // Try exact arabic match
      const arabic = allWords.find(w => w.arabic && w.arabic === term);
      if (arabic) {
        if (!matched.some(m => m.id === arabic.id)) {
          matched.push(arabic);
        }
        continue;
      }

      // Not found — will be added as custom word
      unmatchedTerms.push(term);
    }

    const customWords: Word[] = unmatchedTerms.map((term, i) => ({
      id: uniqueNegativeId(i),
      english: term.charAt(0).toUpperCase() + term.slice(1),
      hebrew: '',
      arabic: '',
      level: 'Custom' as const,
    }));

    const totalCount = matched.length + customWords.length;

    // Add all words immediately (matched + custom without translations)
    if (totalCount > 0) {
      pushUndo([...selectedWords]);
      const newSelected = [...selectedWords, ...matched, ...customWords];
      onSelectedWordsChange(newSelected);
      saveToRecentlyUsed(newSelected);
    }

    // Show initial toast
    if (matched.length > 0 && customWords.length > 0) {
      showToast?.(
        `Added ${matched.length} from vocabulary • Translating ${customWords.length} new word${customWords.length !== 1 ? 's' : ''}...`,
        'success'
      );
    } else if (matched.length > 0) {
      showToast?.(`Added ${matched.length} word${matched.length !== 1 ? 's' : ''}`, 'success');
    } else if (customWords.length > 0) {
      showToast?.(`Added ${customWords.length} new word${customWords.length !== 1 ? 's' : ''} — translating...`, 'info');
    } else {
      showToast?.(`No words found`, 'info');
    }

    // Auto-translate custom words in parallel batches of 5
    if (customWords.length > 0 && onTranslateWord) {
      const BATCH_SIZE = 5;
      const translated = [...selectedWords, ...matched, ...customWords];
      let translatedCount = 0;

      for (let i = 0; i < customWords.length; i += BATCH_SIZE) {
        const batch = customWords.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (customWord) => {
            const context = contextChoices.get(customWord.english.toLowerCase());
            const prompt = context ? `${customWord.english} (${context})` : customWord.english;
            const result = await onTranslateWord(prompt);
            return { customWord, result };
          })
        );

        results.forEach(r => {
          if (r.status === 'fulfilled' && r.value.result) {
            const { customWord, result } = r.value;
            const idx = translated.findIndex(w => w.id === customWord.id);
            if (idx !== -1) {
              translated[idx] = {
                ...translated[idx],
                hebrew: result.hebrew || '',
                arabic: result.arabic || '',
              };
              translatedCount++;
              if (result.match !== undefined) {
                setMatchScores(prev => new Map(prev).set(customWord.id, result.match));
              }
            }
          }
        });

        // Update UI after each batch so teacher sees progress
        onSelectedWordsChange([...translated]);
      }

      if (translatedCount > 0) {
        showToast?.(`Translated ${translatedCount} of ${customWords.length} new words`, 'success');
      }
      if (translatedCount < customWords.length) {
        showToast?.(`${customWords.length - translatedCount} words still need translations — click to add manually`, 'info');
      }
    }

    setSearchQuery('');
    setShowAutocomplete(false);
    setSelectedWordsCollapsed(false);
    setTimeout(() => autocompleteRef.current?.focus(), 50);
  };

  // ── Handle keyboard on search input ──────────────────────────────────────────
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    // Arrow keys: navigate autocomplete
    if (e.key === 'ArrowDown' && showAutocomplete && autocompleteSuggestions.length > 0) {
      e.preventDefault();
      setAutocompleteIndex(prev => (prev + 1) % autocompleteSuggestions.length);
      return;
    }
    if (e.key === 'ArrowUp' && showAutocomplete && autocompleteSuggestions.length > 0) {
      e.preventDefault();
      setAutocompleteIndex(prev => (prev - 1 + autocompleteSuggestions.length) % autocompleteSuggestions.length);
      return;
    }
    if (e.key === 'Escape') {
      setShowAutocomplete(false);
      return;
    }

    if (e.key !== 'Enter') return;
    e.preventDefault();

    // Check if multiple words (split by space, comma, or newline)
    const terms = searchQuery.trim().split(/[\s,;\n]+/).filter(t => t.length > 0);

    if (terms.length > 1) {
      // Multiple words → batch add
      void handleQuickAdd();
    } else if (showAutocomplete && autocompleteSuggestions.length > 0) {
      // Single word with autocomplete open → add highlighted suggestion
      const word = autocompleteSuggestions[autocompleteIndex];
      if (word && !isDuplicateWord(word)) {
        addSuggestion(word);
      }
    } else {
      // Single word, no autocomplete → try exact match
      const query = searchQuery.trim().toLowerCase();
      const exactMatch = allWords.find(w => w.english.toLowerCase() === query);
      if (exactMatch) {
        addSuggestion(exactMatch);
      } else {
        showToast?.(`"${searchQuery.trim()}" not found in vocabulary`, 'info');
      }
    }
  };

  // ── Handle paste event — auto-analyze for multi-word paste ────────────────────
  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    // If pasted text has 3+ words, auto-analyze after a delay
    const wordCount = pastedText.trim().split(/[\s,;\n]+/).filter(t => t.length > 0).length;
    if (wordCount >= 3) {
      setTimeout(() => handleQuickAdd(), 300);
    }
  };

  // ── Auto-scroll refs ─────────────────────────────────────────────────────────────
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const pasteButtonRef = useRef<HTMLButtonElement>(null);
  const browseButtonRef = useRef<HTMLButtonElement>(null);
  const topicPacksButtonRef = useRef<HTMLButtonElement>(null);

  // ── Auto-scroll to next button when words are selected ────────────────────────
  useEffect(() => {
    if (selectedWords.length > 0 && nextButtonRef.current) {
      // Small delay to allow UI to update
      setTimeout(() => {
        nextButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [selectedWords.length]);

  // ── Keep selected words visible while actively searching ──────────────────────
  useEffect(() => {
    if (selectedWords.length > 0 && !showAutocomplete) {
      setSelectedWordsCollapsed(false);
    }
  }, [selectedWords.length]);

  // ── Load saved groups from localStorage on mount ─────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vocaband_saved_groups');
      if (saved) {
        setSavedGroups(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // ── Load recently used words on mount ────────────────────────────────────────
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('vocaband_recent_words') || '[]') as number[];
      setRecentlyUsedIds(stored);
    } catch {}
  }, []);
  
  // ── Parse search terms when query changes ────────────────────────────────────
  useEffect(() => {
    const terms = parseSearchTerms(searchQuery);
    setSearchTerms(terms);
  }, [searchQuery]);
  
  // ── Filter words based on level and search ───────────────────────────────────
  const filteredWords = useMemo(() => {
    let pool = allWords;

    if (showLevelFilter) {
      if (selectedLevel === 'Set 1' && set1Words) {
        pool = set1Words;
      } else if (selectedLevel === 'Set 2' && set2Words) {
        pool = set2Words;
      }
      // Custom shows all words
    }

    if (!searchQuery.trim()) return pool;

    const lowerQuery = searchQuery.toLowerCase().trim();
    const filtered = pool.filter(w =>
      w.english.toLowerCase().includes(lowerQuery) ||
      w.hebrew?.toLowerCase().includes(lowerQuery) ||
      w.arabic?.toLowerCase().includes(lowerQuery)
    );

    // Deduplicate by ID
    const uniqueWords = Array.from(
      new Map(filtered.map(w => [w.id, w])).values()
    );

    return uniqueWords;
  }, [allWords, set1Words, set2Words, searchQuery, showLevelFilter, selectedLevel]);
  
  // ── Search results - maps search term to matching words ───────────────────────
  const searchResults = useMemo(() => {
    const results = new Map<string, Word[]>();
    
    searchTerms.forEach(term => {
      const matches = allWords.filter(word => {
        const lowerEnglish = word.english.toLowerCase();
        const lowerTerm = term.toLowerCase();
        
        if (autoMatchPartial) {
          return lowerEnglish.startsWith(lowerTerm) || lowerTerm.startsWith(lowerEnglish);
        } else {
          return lowerEnglish === lowerTerm;
        }
      });
      
      if (matches.length > 0) {
        results.set(term, matches);
      }
    });
    
    return results;
  }, [searchTerms, allWords, autoMatchPartial]);
  
  // ── Computed values ─────────────────────────────────────────────────────────
  const allFoundWords = useMemo(() => {
    return Array.from(searchResults.values()).flat();
  }, [searchResults]);
  
  const uniqueFoundWords = useMemo(() => {
    const seen = new Set<number>();
    return allFoundWords.filter(w => {
      if (seen.has(w.id)) return false;
      seen.add(w.id);
      return true;
    });
  }, [allFoundWords]);
  
  const exactMatchesCount = useMemo(() => {
    let count = 0;
    searchTerms.forEach(term => {
      const matches = searchResults.get(term) || [];
      const exact = matches.find(w => w.english.toLowerCase() === term.toLowerCase());
      if (exact) count++;
    });
    return count;
  }, [searchTerms, searchResults]);
  
  const unmatchedTerms = useMemo(() => {
    return searchTerms.filter(term => !searchResults.has(term));
  }, [searchTerms, searchResults]);

  // ── Real-time match preview (for multi-word input) ───────────────────────────
  const matchPreview = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const terms = searchQuery.trim().split(/[\s,;\n]+/).filter(t => t.length > 0);
    if (terms.length < 2) return null; // Only show for 2+ words
    return terms.map(term => {
      const lower = term.toLowerCase();
      const match = allWords.find(w => w.english.toLowerCase() === lower);
      return { term, matched: !!match, word: match };
    });
  }, [searchQuery, allWords]);

  // ── Recently used words (resolved from IDs) ──────────────────────────────────
  const recentlyUsedWords = useMemo(() => {
    if (recentlyUsedIds.length === 0) return [];
    return recentlyUsedIds
      .map(id => allWords.find(w => w.id === id))
      .filter((w): w is Word => w != null)
      .slice(0, 15);
  }, [recentlyUsedIds, allWords]);

  // ── Search language detection (for RTL indicator) ──────────────────────────
  const searchLanguage = useMemo(() => detectInputLanguage(searchQuery), [searchQuery]);

  // ── Detected ambiguity for current search query ─────────────────────────────
  const detectedAmbiguity = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const terms = searchQuery.trim().split(/[\s,;\n]+/).filter(t => t.length > 0);
    if (terms.length !== 1) return null;
    const word = terms[0].toLowerCase();
    const meanings = AMBIGUOUS_WORDS[word];
    if (!meanings || contextChoices.has(word)) return null;
    return { word, meanings };
  }, [searchQuery, contextChoices]);

  // ── Flagged words (low match score) ────────────────────────────────────────
  const flaggedWords = useMemo(() => {
    return selectedWords.filter(w => {
      const score = matchScores.get(w.id);
      if (score === undefined) return false;
      return score < 0.6;
    });
  }, [selectedWords, matchScores]);

  // ── Display words (sorted + filtered for chip view) ────────────────────────
  const displayWords = useMemo(() => {
    let words = [...selectedWords];

    if (chipFilter === 'missing') {
      words = words.filter(w => !w.hebrew && !w.arabic);
    } else if (chipFilter === 'custom') {
      words = words.filter(w => w.level === 'Custom');
    } else if (chipFilter === 'flagged') {
      words = words.filter(w => {
        const score = matchScores.get(w.id);
        return score !== undefined && score < 0.6;
      });
    }

    if (levelDistFilter !== 'all') {
      words = words.filter(w => w.level === levelDistFilter);
    }

    if (chipSortBy === 'az') {
      words.sort((a, b) => a.english.localeCompare(b.english));
    } else if (chipSortBy === 'level') {
      const levelOrder: Record<string, number> = { 'Set 1': 0, 'Set 2': 1, 'Set 3': 2, 'Custom': 3 };
      words.sort((a, b) => (levelOrder[a.level || 'Custom'] ?? 3) - (levelOrder[b.level || 'Custom'] ?? 3));
    } else if (chipSortBy === 'date') {
      words.reverse();
    } else {
      // default: core words first, then maintain insertion order
      words.sort((a, b) => (b.isCore ? 1 : 0) - (a.isCore ? 1 : 0));
    }

    return words;
  }, [selectedWords, chipSortBy, chipFilter, matchScores, levelDistFilter]);

  const sortDiffersFromActual = useMemo(() => {
    if (chipSortBy === 'default' && chipFilter === 'all') return false;
    if (displayWords.length !== selectedWords.length) return true;
    return displayWords.some((w, i) => w.id !== selectedWords[i].id);
  }, [displayWords, selectedWords, chipSortBy, chipFilter]);

  // ── Level distribution (for segmented bar) ────────────────────────────────
  const levelDistribution = useMemo(() => {
    const counts: Record<string, number> = { 'Set 1': 0, 'Set 2': 0, 'Set 3': 0, 'Custom': 0 };
    selectedWords.forEach(w => { counts[w.level || 'Custom']++; });
    return counts;
  }, [selectedWords]);

  // ── Handler functions ───────────────────────────────────────────────────────
  const handleAutoTranslate = async (term: string) => {
    if (!onTranslateWord || translating.has(term)) return;

    setTranslating(prev => new Set([...prev, term]));

    try {
      const context = contextChoices.get(term.toLowerCase());
      const prompt = context ? `${term} (${context})` : term;
      const translation = await onTranslateWord(prompt);
      if (translation) {
        setCustomWordMap(prev => new Map(prev).set(term, translation));
      }
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setTranslating(prev => {
        const next = new Set(prev);
        next.delete(term);
        return next;
      });
    }
  };

  // ── Open inline translation editor for a word ─────────────────────────────────
  const openInlineEditor = (word: Word) => {
    setEditingWordId(word.id);
    setEditHebrew(word.hebrew || '');
    setEditArabic(word.arabic || '');
    setEditIsCore(word.isCore || false);
  };

  // ── Save inline translation edit ──────────────────────────────────────────────
  const saveInlineEdit = () => {
    if (editingWordId === null) return;
    const updated = selectedWords.map(w =>
      w.id === editingWordId ? { ...w, hebrew: editHebrew, arabic: editArabic, isCore: editIsCore } : w
    );
    onSelectedWordsChange(updated);
    setEditingWordId(null);
  };

  // ── Auto-translate a single word inline ───────────────────────────────────────
  const autoTranslateInline = async (word: Word) => {
    if (!onTranslateWord) return;
    setAutoTranslating(word.id);
    try {
      const context = contextChoices.get(word.english.toLowerCase());
      const prompt = context ? `${word.english} (${context})` : word.english;
      const result = await onTranslateWord(prompt);
      if (result) {
        if (languagePref !== 'arabic') setEditHebrew(result.hebrew);
        if (languagePref !== 'hebrew') setEditArabic(result.arabic);
        if (result.match !== undefined) setMatchScores(prev => new Map(prev).set(word.id, result.match));
      }
    } catch {}
    setAutoTranslating(null);
  };

  // ── Batch translate all words missing translations ────────────────────────────
  const batchTranslateMissing = async () => {
    if (!onTranslateWord) return;
    const wordsNeedingTranslation = selectedWords.filter(w => !w.hebrew && !w.arabic);
    if (wordsNeedingTranslation.length === 0) return;

    setBatchTranslating(true);
    const updated = [...selectedWords];
    const newScores = new Map(matchScores);
    for (const word of wordsNeedingTranslation) {
      try {
        const context = contextChoices.get(word.english.toLowerCase());
        const prompt = context ? `${word.english} (${context})` : word.english;
        const result = await onTranslateWord(prompt);
        if (result) {
          const idx = updated.findIndex(w => w.id === word.id);
          if (idx !== -1) {
            updated[idx] = {
              ...updated[idx],
              hebrew: languagePref !== 'arabic' ? (result.hebrew || updated[idx].hebrew) : updated[idx].hebrew,
              arabic: languagePref !== 'hebrew' ? (result.arabic || updated[idx].arabic) : updated[idx].arabic,
            };
          }
          if (result.match !== undefined) newScores.set(word.id, result.match);
        }
      } catch {}
    }
    setMatchScores(newScores);
    onSelectedWordsChange(updated);
    setBatchTranslating(false);
    showToast?.(`Translated ${wordsNeedingTranslation.length} words`, 'success');
  };

  const handlePasteAndAnalyze = () => {
    if (!searchQuery.trim()) return;
    const analysis = analyzePastedText(searchQuery, allWords);
    setPreviewAnalysis(analysis as any);
    setShowPreviewInline(true);
    setSearchQuery(''); // Clear search after analysis
  };
  
  const handlePreviewConfirm = (customTranslations: any, addedSuggestionIds: number[]) => {
    const matchedWords = previewAnalysis?.matchedWords.map((mw: any) => mw.word) || [];
    const newCustomWords: Word[] = [];
    
    customTranslations.forEach((trans: any, term: string) => {
      if (trans.hebrew || trans.arabic) {
        newCustomWords.push({
          id: uniqueNegativeId(newCustomWords.length),
          english: term.charAt(0).toUpperCase() + term.slice(1).toLowerCase(),
          hebrew: trans.hebrew || '',
          arabic: trans.arabic || '',
          level: 'Custom'
        });
      }
    });
    
    onSelectedWordsChange([...selectedWords, ...matchedWords, ...newCustomWords]);
    setShowPreviewInline(false);
    setPreviewAnalysis(null);
  };

  const handlePreviewCancel = () => {
    setShowPreviewInline(false);
    setPreviewAnalysis(null);
  };

  const toggleWordSelection = (word: Word) => {
    const isSelected = selectedWords.some(w => w.id === word.id);
    if (isSelected) {
      onSelectedWordsChange(selectedWords.filter(w => w.id !== word.id));
    } else {
      onSelectedWordsChange([...selectedWords, word]);
    }
  };

  // ── Multi-select handlers ───────────────────────────────────────────────────
  const enterMultiSelect = (wordId: number) => {
    setMultiSelectMode(true);
    setMultiSelectedIds(new Set([wordId]));
  };

  const exitMultiSelect = () => {
    setMultiSelectMode(false);
    setMultiSelectedIds(new Set());
    setShowLevelDropdown(false);
  };

  const toggleMultiSelect = (wordId: number) => {
    setMultiSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(wordId)) next.delete(wordId);
      else next.add(wordId);
      return next;
    });
  };

  const deleteMultiSelected = () => {
    pushUndo([...selectedWords]);
    onSelectedWordsChange(selectedWords.filter(w => !multiSelectedIds.has(w.id)));
    showToast?.(`Removed ${multiSelectedIds.size} words`, 'info');
    exitMultiSelect();
  };

  const saveMultiAsGroup = () => {
    const ids = [...multiSelectedIds];
    const name = `Group ${savedGroups.length + 1}`;
    const newGroup: SavedGroup = {
      id: Date.now().toString(),
      name,
      words: ids,
      createdAt: new Date().toISOString(),
    };
    const updated = [...savedGroups, newGroup];
    setSavedGroups(updated);
    try { localStorage.setItem('vocaband_saved_groups', JSON.stringify(updated)); } catch {}
    showToast?.(`Saved ${ids.length} words as "${name}"`, 'success');
    exitMultiSelect();
  };

  const setMultiLevel = (level: Word['level']) => {
    const updated = selectedWords.map(w =>
      multiSelectedIds.has(w.id) ? { ...w, level } : w
    );
    onSelectedWordsChange(updated);
    showToast?.(`Set ${multiSelectedIds.size} words to ${level}`, 'success');
    exitMultiSelect();
  };

  const applyDisplayOrder = () => {
    const displayedIds = new Set(displayWords.map(w => w.id));
    const filteredOut = selectedWords.filter(w => !displayedIds.has(w.id));
    pushUndo([...selectedWords]);
    onSelectedWordsChange([...displayWords, ...filteredOut]);
    setChipSortBy('default');
    setChipFilter('all');
    showToast?.('Applied new word order', 'success');
  };

  const toggleCoreWord = (wordId: number) => {
    const updated = selectedWords.map(w =>
      w.id === wordId ? { ...w, isCore: !w.isCore } : w
    );
    onSelectedWordsChange(updated);
  };

  const handleChipTouchStart = (wordId: number) => {
    if (multiSelectMode) return;
    longPressTimerRef.current = setTimeout(() => enterMultiSelect(wordId), 500);
  };

  const handleChipTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // ── Constants ───────────────────────────────────────────────────────────────
  const canProceed = selectedWords.length > 0;
  const isQuickPlay = mode === 'quick-play';

  // ── TAB DEFINITIONS ─────────────────────────────────────────────────────────
  const tabs: Array<{ id: WordInputSubStep; emoji: string; label: string; badge?: string | number; hidden?: boolean }> = [
    { id: 'paste', emoji: '📋', label: 'Paste' },
    { id: 'topic-packs', emoji: '🧩', label: 'Topics', badge: topicPacks.length || undefined },
    ...(!isQuickPlay ? [{ id: 'saved-groups' as const, emoji: '💾', label: 'Saved', badge: savedGroups.length }] : []),
    ...(onOcrUpload ? [{ id: 'ocr' as const, emoji: '📷', label: 'OCR', badge: 'Soon' as const }] : []),
  ];

  // ── TAB BAR COMPONENT ─────────────────────────────────────────────────────
  const renderTabBar = () => (
    <div className="mb-4 sm:mb-6 sticky top-0 z-30 bg-gradient-to-b from-stone-50 to-stone-50/95 backdrop-blur-sm pb-3 -mx-3 px-3 sm:-mx-4 sm:px-4 pt-2">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          type="button"
          style={{ touchAction: 'manipulation' }}
          className="inline-flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <h2 className="text-base sm:text-lg font-bold text-stone-900">
          {isQuickPlay ? 'Add words' : editingAssignment ? 'Edit words' : 'Add words'}
        </h2>
        <div className="text-xs font-semibold text-stone-400">Step 1 / 3</div>
      </div>

      {/* Tab strip — segmented pill group, coherent with the mode-intro design */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-1 flex overflow-x-auto hide-scrollbar gap-0.5" style={{ scrollSnapType: 'x mandatory' }}>
        {tabs.map(tab => {
          const isActive = subStep === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubStep(tab.id)}
              type="button"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', scrollSnapAlign: 'center' }}
              className={`relative flex-1 min-w-0 flex flex-col items-center gap-0.5 py-2.5 px-1.5 sm:px-3 rounded-xl text-center transition-all ${
                isActive
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'
              }`}
            >
              <span className="text-base sm:text-lg leading-none">{tab.emoji}</span>
              <span className={`text-[10px] sm:text-xs font-bold leading-tight truncate w-full ${isActive ? 'text-white' : ''}`}>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`absolute -top-1.5 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm ${
                  isActive ? 'bg-white text-stone-900' : 'bg-stone-900 text-white'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected count */}
      {selectedWords.length > 0 && (
        <div className="mt-3 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-semibold">
            <Check size={12} /> {selectedWords.length} word{selectedWords.length !== 1 ? 's' : ''} selected
          </span>
        </div>
      )}
    </div>
  );

  // ── OCR TAB PANEL ─────────────────────────────────────────────────────────
  // OCR is temporarily disabled — shows a "Coming Soon" message instead.
  // All upload/compression/Gemini logic is preserved in App.tsx and the
  // server for easy re-enable later.
  const renderOcr = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      <div className="bg-white rounded-3xl p-8 shadow-sm text-center">
        <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center shadow-lg shadow-amber-200">
          <span className="text-4xl">📷</span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-black mb-3 border border-amber-200">
          ⏳ Coming Soon
        </div>
        <h3 className="text-xl font-black text-stone-900 mb-2">Scan with Camera</h3>
        <p className="text-stone-500 text-sm mb-5 max-w-xs mx-auto leading-relaxed">
          Take a photo of a textbook page and automatically extract English words.
          We're working on making this feature reliable.
        </p>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-left">
          <p className="text-xs font-bold text-blue-900 mb-2">💡 In the meantime, try these alternatives:</p>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• <strong>Paste</strong> — copy words from any PDF, document, or webpage</li>
            <li>• <strong>Topics</strong> — pick from ready-made themed word packs</li>
            <li>• <strong>Saved</strong> — reuse your previous word groups</li>
          </ul>
        </div>
      </div>
    </motion.div>
  );

  // ── PASTE SUB-STEP ─────────────────────────────────────────────────────────
  const renderPaste = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-3 sm:space-y-5"
    >

      {/* Assignment Name */}
      {/* Draft Resume Banner */}
      {showDraftBanner && (() => {
        let draftWordCount = 0;
        try {
          const raw = localStorage.getItem('vocaband-draft');
          if (raw) draftWordCount = JSON.parse(raw).words?.length || 0;
        } catch {}
        return (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div>
                <p className="text-sm font-bold text-indigo-900">Resume your last session?</p>
                <p className="text-xs text-indigo-600">You had {draftWordCount} word{draftWordCount !== 1 ? 's' : ''} selected</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  try {
                    const raw = localStorage.getItem('vocaband-draft');
                    if (raw) {
                      const draft = JSON.parse(raw);
                      if (draft.words?.length > 0) {
                        onSelectedWordsChange(draft.words);
                        showToast?.(`Restored ${draft.words.length} words`, 'success');
                      }
                    }
                  } catch {}
                  setShowDraftBanner(false);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all"
              >
                Resume
              </button>
              <button
                onClick={() => {
                  try { localStorage.removeItem('vocaband-draft'); } catch {}
                  setShowDraftBanner(false);
                }}
                className="px-4 py-2 text-indigo-500 text-sm font-bold hover:text-indigo-700 transition-all"
              >
                Start fresh
              </button>
            </div>
          </motion.div>
        );
      })()}

      {/* Clipboard Detection Banner */}
      {clipboardBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl">
              <Clipboard size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-stone-900">
                📋 Clipboard has {clipboardBanner.wordCount} words — paste them all?
              </p>
              <p className="text-xs text-stone-500 mt-0.5">Found in your clipboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setSearchQuery(clipboardBanner.text);
                setClipboardBanner(null);
                // Auto-analyze after setting clipboard content
                setTimeout(() => handlePasteAndAnalyze(), 100);
              }}
              className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 transition-all"
            >
              Yes, paste
            </button>
            <button
              onClick={() => setClipboardBanner(null)}
              className="px-4 py-2 text-amber-600 text-sm font-bold hover:text-amber-800 transition-all"
            >
              No thanks
            </button>
          </div>
        </motion.div>
      )}

      {/* Recently Used Words */}
      {recentlyUsedWords.length > 0 && (
        <div className="bg-stone-50 rounded-2xl border border-stone-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Recently used</span>
            <span className="text-[10px] text-stone-400">Click words one by one to add</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recentlyUsedWords.slice(0, 12).map(word => {
              const isDup = selectedWords.some(w => w.id === word.id);
              return (
                <button
                  key={word.id}
                  onClick={() => !isDup && addSuggestion(word)}
                  disabled={isDup}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                    isDup
                      ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                      : 'bg-white text-stone-700 hover:bg-primary hover:text-white border border-stone-200 shadow-sm'
                  }`}
                >
                  {word.english}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Needs Practice - Spaced Repetition Suggestions */}
      {suggestedWords.length > 0 && showSuggestedWords && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl border-2 border-rose-200 p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle size={12} />
                Needs Practice
              </span>
              <span className="text-[10px] text-rose-500">Based on class performance</span>
            </div>
            <button
              onClick={() => setSuggestedWords([])}
              className="text-rose-400 hover:text-rose-600"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestedWords.map(word => {
              const isDup = selectedWords.some(w => w.id === word.id);
              const perf = getWordPerformance(classId!, word.id);
              return (
                <button
                  key={word.id}
                  onClick={() => !isDup && addSuggestion(word)}
                  disabled={isDup}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all relative group"
                  title={`Accuracy: ${perf ? Math.round(perf.accuracy * 100) : 0}% | Attempts: ${perf?.attempts || 0}`}
                >
                  <span className={`flex items-center gap-1.5 ${
                    isDup
                      ? 'bg-rose-200 text-rose-400 cursor-not-allowed px-2.5 py-1'
                      : 'bg-white text-rose-700 hover:bg-rose-100 border border-rose-300 px-2.5 py-1 shadow-sm'
                  }`}>
                    {isDup && <Check size={10} />}
                    +{word.english}
                  </span>
                  {perf && !isDup && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-stone-800 text-[8px] text-white px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {Math.round(perf.accuracy * 100)}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-rose-600 mt-2 flex items-center gap-1">
            <Info size={10} />
            These words had low accuracy in previous sessions. Consider adding them for extra practice.
          </p>
        </motion.div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <div className="relative">
        <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
        <input
          type="text"
          ref={autocompleteRef}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowAutocomplete(true);
            setAutocompleteIndex(0);
          }}
          onKeyDown={handleSearchKeyDown}
          onPaste={handlePaste}
          onFocus={() => setShowAutocomplete(true)}
          placeholder={selectedWords.length > 0 ? "Add more words..." : "Type words... (space or comma separated)"}
          className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-3 sm:py-4 rounded-2xl border-2 border-stone-200 text-base sm:text-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 bg-white text-stone-900 placeholder:text-stone-400 transition-all shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              setShowAutocomplete(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-stone-100 transition-colors"
          >
            <X size={16} className="text-stone-400" />
          </button>
        )}

        {/* RTL language indicator */}
        {searchLanguage !== 'english' && searchQuery.trim() && (
          <span className="absolute right-10 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 border border-blue-200 pointer-events-none">
            {searchLanguage === 'hebrew' ? 'HE' : 'AR'}
          </span>
        )}
        </div>

        {/* Context disambiguation picker for ambiguous words */}
        {detectedAmbiguity && (
          <div className="mt-2 bg-amber-50 rounded-xl border border-amber-200 p-3">
            <p className="text-xs font-bold text-amber-800 mb-2">
              "{detectedAmbiguity.word}" has multiple meanings — choose one for better translation:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {detectedAmbiguity.meanings.map(meaning => (
                <button
                  key={meaning}
                  onClick={() => {
                    setContextChoices(prev => new Map(prev).set(detectedAmbiguity.word.toLowerCase(), meaning));
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-amber-700 hover:bg-amber-600 hover:text-white border border-amber-200 transition-all"
                >
                  {meaning}
                </button>
              ))}
              <button
                onClick={() => {
                  setContextChoices(prev => new Map(prev).set(detectedAmbiguity.word.toLowerCase(), ''));
                }}
                className="px-3 py-1.5 rounded-full text-xs font-semibold text-stone-400 hover:text-stone-600 transition-all"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Real-time Match Preview (for multi-word input) */}
        {matchPreview && matchPreview.length >= 2 && (
          <div className="mt-2 bg-white rounded-xl border border-stone-200 p-3 shadow-sm">
            <div className="flex flex-wrap gap-2 items-center">
              {matchPreview.map((item, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    item.matched
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-600 border border-red-200'
                  }`}
                >
                  {item.matched ? <Check size={10} /> : <X size={10} />}
                  {item.term}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-stone-400 mt-1.5">
              {matchPreview.filter(p => p.matched).length} of {matchPreview.length} found — press Enter to add
            </p>
          </div>
        )}

        {/* Autocomplete Dropdown */}
        {showAutocomplete && autocompleteSuggestions.length > 0 && !matchPreview && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={() => setShowAutocomplete(false)}
            />

            {/* Dropdown */}
            <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden max-h-[320px] overflow-y-auto">
              {autocompleteSuggestions.map((word, index) => {
                const isSelected = index === autocompleteIndex;
                const isDuplicate = isDuplicateWord(word);
                const level = word.level || 'Custom';

                return (
                  <div
                    key={word.id}
                    onClick={() => !isDuplicate && addSuggestion(word)}
                    onMouseEnter={() => setAutocompleteIndex(index)}
                    className={`w-full text-left p-4 border-b border-stone-100 last:border-b-0 transition-all ${
                      isSelected
                        ? 'bg-blue-50'
                        : 'hover:bg-stone-50'
                    } ${isDuplicate ? 'opacity-40 cursor-not-allowed bg-stone-50' : 'cursor-pointer'}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!isDuplicate) addSuggestion(word);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className={`font-semibold text-stone-900 ${
                            isSelected ? 'text-primary' : isDuplicate ? 'text-stone-400' : ''
                          }`}>
                            {word.english}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            level === 'Set 1'
                              ? 'bg-blue-100 text-blue-700'
                              : level === 'Set 2'
                              ? 'bg-purple-100 text-purple-700'
                              : level === 'Set 3'
                              ? 'bg-pink-100 text-pink-700'
                              : 'bg-stone-100 text-stone-600'
                          }`}>
                            {level}
                          </span>
                        </div>
                        {(word.hebrew || word.arabic) && (
                          <div className="text-sm text-stone-500 mt-1 truncate">
                            {word.hebrew && <span>{word.hebrew}</span>}
                            {word.hebrew && word.arabic && <span> • </span>}
                            {word.arabic && <span>{word.arabic}</span>}
                          </div>
                        )}
                      </div>

                      {onPlayWord && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayWord(word.id, word.english);
                          }}
                          className="p-2 rounded-full hover:bg-stone-100 transition-colors ml-2"
                          aria-label="Play pronunciation"
                        >
                          <Volume2 size={18} className="text-stone-500" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Footer hint */}
              <div className="px-4 py-2 bg-stone-50 border-t border-stone-200 text-xs text-stone-500 flex items-center justify-between">
                <span>Click or Enter to add • Esc to close</span>
                <span>{autocompleteSuggestions.length} results</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Related Word Suggestions */}
      {relatedSuggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="bg-indigo-50 rounded-xl border border-indigo-200 p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Related words</span>
            <button
              onClick={() => setRelatedSuggestions([])}
              className="text-indigo-400 hover:text-indigo-600"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            {relatedSuggestions.map(word => (
              <button
                key={word.id}
                onClick={() => addSuggestion(word)}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-indigo-700 hover:bg-indigo-600 hover:text-white border border-indigo-200 transition-all"
              >
                + {word.english}
              </button>
            ))}
            {relatedSuggestions.length > 1 && (
              <button
                onClick={() => {
                  const newWords = relatedSuggestions.filter(w => !isDuplicateWord(w));
                  if (newWords.length > 0) {
                    pushUndo([...selectedWords]);
                    const updated = [...selectedWords, ...newWords];
                    onSelectedWordsChange(updated);
                    saveToRecentlyUsed(updated);
                  }
                  setRelatedSuggestions([]);
                }}
                className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
              >
                Add all
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Undo Bar */}
      {hasUndo && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5"
        >
          <span className="text-sm font-semibold text-amber-800">
            <Undo2 size={14} className="inline mr-1" />
            {undoStack.length} action{undoStack.length !== 1 ? 's' : ''} to undo
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              className="text-sm font-bold text-amber-700 hover:text-amber-900 underline flex items-center gap-1"
            >
              Undo (Ctrl+Z)
            </button>
            <button
              onClick={() => setUndoStack([])}
              className="text-amber-400 hover:text-amber-600"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={async () => {
            try {
              const text = await navigator.clipboard.readText();
              if (text) setSearchQuery(text);
            } catch {}
          }}
          className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 border-dashed border-stone-300 hover:border-primary hover:bg-blue-50/50 transition-all group bg-white"
        >
          <Clipboard size={20} className="text-stone-400 group-hover:text-primary transition-colors" />
          <span className="font-semibold text-stone-600 group-hover:text-stone-900">Paste from clipboard</span>
        </button>

        <button
          disabled
          className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 border-dashed border-stone-200 bg-stone-100 cursor-not-allowed opacity-60"
          title="Pro feature - Coming soon"
        >
          <Lock size={18} className="text-stone-400" />
          <span className="font-semibold text-stone-400">Browse library</span>
        </button>
      </div>

      {/* Inline Paste Analysis Results */}
      {showPreviewInline && previewAnalysis && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200 overflow-hidden"
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-stone-900 flex items-center gap-2">
                  <FileText size={18} className="text-indigo-600" />
                  Paste Analysis Results
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  {previewAnalysis.stats.matchedCount} found • {previewAnalysis.stats.unmatchedCount} new • {previewAnalysis.stats.totalTerms} total
                </p>
              </div>
              <button
                onClick={handlePreviewCancel}
                className="p-1 rounded-full hover:bg-white/50 transition-colors"
                title="Close"
              >
                <X size={18} className="text-stone-500" />
              </button>
            </div>

            {/* Matched Words */}
            {previewAnalysis.matchedWords.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1">
                  <Check size={12} /> Found in database ({previewAnalysis.matchedWords.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {previewAnalysis.matchedWords.map((mw: any) => (
                    <button
                      key={mw.word.id}
                      onClick={() => {
                        if (!selectedWords.some(w => w.id === mw.word.id)) {
                          onSelectedWordsChange([...selectedWords, mw.word]);
                        }
                      }}
                      disabled={selectedWords.some(w => w.id === mw.word.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                        selectedWords.some(w => w.id === mw.word.id)
                          ? 'bg-emerald-100 text-emerald-600 border border-emerald-300'
                          : 'bg-white text-stone-700 hover:bg-emerald-50 border border-stone-200'
                      }`}
                      title={`${mw.word.hebrew || ''} ${mw.word.arabic || ''}`}
                    >
                      {mw.matchType === 'exact' ? '✓' : mw.matchType === 'fuzzy' ? '~' : '→'} {mw.word.english}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Unmatched Terms */}
            {previewAnalysis.unmatchedTerms.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1">
                  <AlertCircle size={12} /> New words ({previewAnalysis.unmatchedTerms.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {previewAnalysis.unmatchedTerms.map((term: any) => (
                    <button
                      key={term.term}
                      onClick={() => {
                        const newWord: Word = {
                          id: uniqueNegativeId(),
                          english: term.term.charAt(0).toUpperCase() + term.term.slice(1).toLowerCase(),
                          hebrew: '',
                          arabic: '',
                          level: 'Custom'
                        };
                        onSelectedWordsChange([...selectedWords, newWord]);
                      }}
                      disabled={selectedWords.some(w => w.english.toLowerCase() === term.term.toLowerCase())}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                        selectedWords.some(w => w.english.toLowerCase() === term.term.toLowerCase())
                          ? 'bg-amber-100 text-amber-600 border border-amber-300'
                          : 'bg-white text-stone-700 hover:bg-amber-50 border border-stone-200'
                      }`}
                    >
                      + {term.term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-indigo-200">
              <button
                onClick={() => {
                  const allWords = [
                    ...previewAnalysis.matchedWords.map((mw: any) => mw.word),
                    ...previewAnalysis.unmatchedTerms.map((term: any) => ({
                      id: uniqueNegativeId(),
                      english: term.term.charAt(0).toUpperCase() + term.term.slice(1).toLowerCase(),
                      hebrew: '',
                      arabic: '',
                      level: 'Custom'
                    }))
                  ];
                  const newWords = allWords.filter(w => !selectedWords.some(sw => sw.id === w.id));
                  onSelectedWordsChange([...selectedWords, ...newWords]);
                  setShowPreviewInline(false);
                  setPreviewAnalysis(null);
                }}
                className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-1"
              >
                <Check size={14} /> Add All
              </button>
              <button
                onClick={handlePreviewCancel}
                className="px-3 py-2 bg-white text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-50 border border-stone-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Selected Words */}
      {selectedWords.length > 0 && (
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border-2 border-primary/20 overflow-hidden">
          {/* Header - always visible */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-stone-900">Selected ({selectedWords.length})</h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {selectedWords.filter(w => {
                      if (languagePref === 'hebrew') return !!w.hebrew;
                      if (languagePref === 'arabic') return !!w.arabic;
                      return w.hebrew || w.arabic;
                    }).length} ready
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    {selectedWords.filter(w => {
                      if (languagePref === 'hebrew') return !w.hebrew;
                      if (languagePref === 'arabic') return !w.arabic;
                      return !w.hebrew && !w.arabic;
                    }).length} need translation
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (multiSelectMode) exitMultiSelect();
                    setSelectedWordsCollapsed(!selectedWordsCollapsed);
                  }}
                  className="p-1 rounded-full hover:bg-white/50 transition-colors"
                  title={selectedWordsCollapsed ? 'Expand' : 'Collapse'}
                >
                  {selectedWordsCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                </button>
                <button onClick={() => onSelectedWordsChange([])} className="text-sm text-rose-600 font-bold hover:text-rose-700">
                  Clear all
                </button>
              </div>
            </div>

            {/* Language toggle + Batch translate */}
            <div className="flex items-center justify-between mt-2 mb-2">
              <div className="flex items-center gap-1 bg-white rounded-full p-0.5 shadow-sm border border-stone-200">
                {(['both', 'hebrew', 'arabic'] as const).map(pref => (
                  <button
                    key={pref}
                    onClick={() => setLanguagePref(pref)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                      languagePref === pref
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    {pref === 'both' ? 'HE+AR' : pref === 'hebrew' ? 'HE' : 'AR'}
                  </button>
                ))}
              </div>
              {selectedWords.some(w => !w.hebrew && !w.arabic) && onTranslateWord && (
                <button
                  onClick={batchTranslateMissing}
                  disabled={batchTranslating}
                  className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 disabled:opacity-50"
                >
                  {batchTranslating ? (
                    <><Loader2 size={12} className="animate-spin" /> Translating...</>
                  ) : (
                    <><Languages size={12} /> Translate missing</>
                  )}
                </button>
              )}
              {flaggedWords.length > 0 && (
                <button
                  onClick={() => { setReviewModalOpen(true); setReviewIndex(0); }}
                  className="text-xs font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1"
                >
                  <AlertTriangle size={12} /> Review flagged ({flaggedWords.length})
                </button>
              )}
            </div>

            {/* Level distribution bar */}
            {selectedWords.length > 0 && (
              <div className="mt-3 mb-2">
                <div className="flex items-center gap-0.5 h-2 rounded-full overflow-hidden bg-stone-100">
                  {['Set 1', 'Set 2', 'Set 3', 'Custom'].map(level => {
                    const count = levelDistribution[level];
                    const pct = count / selectedWords.length;
                    if (pct === 0) return null;
                    const colors = {
                      'Set 1': 'bg-teal-500',
                      'Set 2': 'bg-blue-500',
                      'Set 3': 'bg-amber-500',
                      'Custom': 'bg-stone-400'
                    };
                    return (
                      <button
                        key={level}
                        onClick={() => {
                          setLevelDistFilter(levelDistFilter === level ? 'all' : level as any);
                          if (chipFilter !== 'all') setChipFilter('all');
                        }}
                        className={`${colors[level as keyof typeof colors]} h-full transition-all hover:opacity-80 relative group ${levelDistFilter === level ? 'ring-2 ring-offset-1 ring-stone-400' : ''}`}
                        style={{ width: `${Math.max(pct * 100, 2)}%` }}
                        title={`${level}: ${count} words`}
                      >
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap overflow-hidden">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[9px] font-medium text-stone-500">
                  <button
                    onClick={() => {
                      setLevelDistFilter('all');
                      if (chipFilter !== 'all') setChipFilter('all');
                    }}
                    className={`flex items-center gap-1 ${levelDistFilter === 'all' ? 'text-stone-900 font-bold' : ''}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>All: {selectedWords.length}
                  </button>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>Set 1: {levelDistribution['Set 1']}</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>Set 2: {levelDistribution['Set 2']}</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Set 3: {levelDistribution['Set 3']}</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span>Custom: {levelDistribution['Custom']}</span>
                </div>
              </div>
            )}

            {/* Game Word Count Guidance */}
            {gameType && GAME_WORD_COUNTS[gameType] && (
              <div className="mt-3 p-3 bg-white rounded-xl border border-stone-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                    {GAME_WORD_COUNTS[gameType].label} requires {GAME_WORD_COUNTS[gameType].min}-{GAME_WORD_COUNTS[gameType].max} words
                  </span>
                  <span className={`text-xs font-bold ${
                    selectedWords.length >= GAME_WORD_COUNTS[gameType].min
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  }`}>
                    {selectedWords.length} / {GAME_WORD_COUNTS[gameType].min} words
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min((selectedWords.length / GAME_WORD_COUNTS[gameType].min) * 100, 100)}%`
                    }}
                    transition={{ duration: 0.3 }}
                    className={`h-full rounded-full ${
                      selectedWords.length >= GAME_WORD_COUNTS[gameType].min
                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                        : 'bg-gradient-to-r from-amber-400 to-amber-500'
                    }`}
                  />
                </div>
                {/* Status message */}
                {selectedWords.length < GAME_WORD_COUNTS[gameType].min ? (
                  <p className="text-xs text-amber-600 font-medium mt-2 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Add {GAME_WORD_COUNTS[gameType].min - selectedWords.length} more word{GAME_WORD_COUNTS[gameType].min - selectedWords.length !== 1 ? 's' : ''} to meet minimum
                  </p>
                ) : (
                  <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
                    <Check size={12} />
                    Ready to play! {selectedWords.length} words selected
                  </p>
                )}
              </div>
            )}

            {/* Sort + Filter toolbar */}
            {!selectedWordsCollapsed && selectedWords.length > 1 && (
              <div className="flex items-center gap-2 mt-2 mb-1 flex-wrap">
                <div className="flex items-center gap-1 bg-white rounded-lg px-2 py-1 border border-stone-200 text-xs">
                  <span className="text-stone-500 font-bold shrink-0">Sort:</span>
                  {([['default', 'Added'], ['az', 'A–Z'], ['level', 'Level'], ['date', 'Newest']] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setChipSortBy(key as typeof chipSortBy)}
                      className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                        chipSortBy === key ? 'bg-primary text-white' : 'text-stone-500 hover:text-stone-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {([['all', 'All'], ['missing', 'Missing'], ['custom', 'Custom'], ['flagged', 'Flagged']] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setChipFilter(key as typeof chipFilter);
                        if (levelDistFilter !== 'all') setLevelDistFilter('all');
                      }}
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all ${
                        chipFilter === key
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {sortDiffersFromActual && (
                  <button
                    onClick={applyDisplayOrder}
                    className="text-[11px] font-bold text-primary hover:text-primary/80 flex items-center gap-1 ml-auto"
                  >
                    <Check size={10} /> Apply order
                  </button>
                )}
              </div>
            )}

            {/* Collapsible word list with inline editors */}
            {!selectedWordsCollapsed && (
              <>
              <div className="space-y-2 max-h-64 overflow-y-auto mt-2">
                {displayWords.map(word => {
                  const hasTranslation = word.hebrew || word.arabic;
                  const isEditing = editingWordId === word.id;
                  const matchScore = matchScores.get(word.id);
                  const dotColor = matchScore !== undefined
                    ? matchScore === 0 ? 'bg-red-500'
                    : matchScore < 0.6 ? 'bg-amber-500'
                    : 'bg-emerald-500'
                    : hasTranslation ? 'bg-emerald-500' : 'bg-amber-500';
                  const isMultiSelected = multiSelectedIds.has(word.id);

                  return (
                    <div key={word.id}>
                      {/* Word chip */}
                      <div
                        onClick={(e) => {
                          if (multiSelectMode) { toggleMultiSelect(word.id); return; }
                          if (e.shiftKey) { e.preventDefault(); enterMultiSelect(word.id); return; }
                        }}
                        onTouchStart={() => handleChipTouchStart(word.id)}
                        onTouchEnd={handleChipTouchEnd}
                        onTouchMove={handleChipTouchEnd}
                        className={`relative flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl shadow-sm border-2 transition-all ${
                          isMultiSelected
                            ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                            : isEditing ? 'border-primary/50 ring-2 ring-primary/10'
                            : !hasTranslation ? 'border-amber-200 cursor-pointer hover:border-amber-400'
                            : 'border-primary/20 cursor-pointer hover:border-primary/40'
                        } ${multiSelectMode ? 'cursor-pointer' : ''}`}
                      >
                        {/* Multi-select checkbox overlay */}
                        {multiSelectMode && (
                          <div className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shadow-sm transition-all ${
                            isMultiSelected ? 'bg-primary border-primary' : 'bg-white border-stone-300'
                          }`}>
                            {isMultiSelected && <Check size={12} className="text-white" />}
                          </div>
                        )}

                        <button
                          onClick={() => { if (multiSelectMode) return; isEditing ? setEditingWordId(null) : openInlineEditor(word); }}
                          className="flex items-center gap-2 flex-1 min-w-0 text-left"
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                          {word.isCore && <Star size={11} className="shrink-0 text-amber-500 fill-amber-500" />}
                          {matchScore !== undefined && matchScore < 0.6 && (
                            <span className="text-[9px] text-amber-500 font-bold">{Math.round(matchScore * 100)}%</span>
                          )}
                          <span className="text-sm font-bold text-stone-900 truncate">{word.english}</span>
                          {hasTranslation && (
                            <span className="text-[11px] text-stone-400 truncate">
                              {languagePref !== 'arabic' && word.hebrew && <span>{word.hebrew}</span>}
                              {languagePref === 'both' && word.hebrew && word.arabic && <span> • </span>}
                              {languagePref !== 'hebrew' && word.arabic && <span>{word.arabic}</span>}
                            </span>
                          )}
                          {!hasTranslation && (
                            <span className="text-[10px] text-amber-500 font-semibold">+ translation</span>
                          )}
                        </button>
                        {!multiSelectMode && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleWordSelection(word); }}
                            className="shrink-0 text-rose-400 hover:text-rose-600 p-0.5"
                            title="Remove"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Inline translation editor */}
                      {isEditing && !multiSelectMode && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-1 ml-4 bg-white rounded-xl border-2 border-primary/20 p-3 shadow-sm"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-black text-stone-900">{word.english}</span>
                            <button
                              onClick={() => autoTranslateInline(word)}
                              disabled={autoTranslating === word.id || !onTranslateWord}
                              className="ml-auto text-[10px] font-bold text-primary hover:text-primary/80 flex items-center gap-1 disabled:opacity-50"
                            >
                              {autoTranslating === word.id ? (
                                <><Loader2 size={10} className="animate-spin" /> Translating...</>
                              ) : (
                                <><Languages size={10} /> Auto-translate</>
                              )}
                            </button>
                          </div>
                          <div className="grid gap-2" style={{ gridTemplateColumns: languagePref === 'both' ? '1fr 1fr' : '1fr' }}>
                            {languagePref !== 'arabic' && (
                              <div>
                                <label className="block text-[10px] font-bold text-stone-500 mb-1">Hebrew</label>
                                <input
                                  type="text"
                                  value={editHebrew}
                                  onChange={e => setEditHebrew(e.target.value)}
                                  placeholder="Hebrew translation..."
                                  className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-stone-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  dir="rtl"
                                />
                              </div>
                            )}
                            {languagePref !== 'hebrew' && (
                              <div>
                                <label className="block text-[10px] font-bold text-stone-500 mb-1">Arabic</label>
                                <input
                                  type="text"
                                  value={editArabic}
                                  onChange={e => setEditArabic(e.target.value)}
                                  placeholder="Arabic translation..."
                                  className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-stone-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  dir="rtl"
                                />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-stone-100">
                            <button
                              onClick={() => setEditIsCore(!editIsCore)}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                                editIsCore
                                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                              }`}
                            >
                              <Star size={12} className={editIsCore ? 'fill-amber-500 text-amber-500' : ''} />
                              {editIsCore ? 'Core word' : 'Mark as core'}
                            </button>
                            <span className="text-[9px] text-stone-400 ml-auto">Core words appear first</span>
                          </div>
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              onClick={() => setEditingWordId(null)}
                              className="text-xs px-3 py-1 rounded-lg text-stone-500 hover:bg-stone-100"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={saveInlineEdit}
                              className="text-xs px-3 py-1 rounded-lg bg-primary text-white hover:bg-primary/90 font-bold"
                            >
                              Save
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Multi-select floating action bar */}
              {multiSelectMode && multiSelectedIds.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 flex items-center gap-2 bg-white rounded-xl border-2 border-primary/30 shadow-lg px-3 py-2"
                >
                  <span className="text-xs font-bold text-stone-600">{multiSelectedIds.size} selected</span>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      onClick={deleteMultiSelected}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-700 hover:bg-rose-200 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                    <button
                      onClick={saveMultiAsGroup}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-100 text-teal-700 hover:bg-teal-200 flex items-center gap-1 transition-colors"
                    >
                      <Save size={12} /> Save as group
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowLevelDropdown(prev => !prev)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center gap-1 transition-colors"
                      >
                        Set level ▾
                      </button>
                      {showLevelDropdown && (
                        <div className="absolute bottom-full mb-1 right-0 bg-white rounded-lg shadow-xl border border-stone-200 py-1 z-10 min-w-[80px]">
                          {(['Set 1', 'Set 2', 'Set 3', 'Custom'] as const).map(level => (
                            <button
                              key={level}
                              onClick={() => { setMultiLevel(level); setShowLevelDropdown(false); }}
                              className="w-full px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100 text-left"
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Analyze button */}
      {searchQuery.trim() && (
        <div className="pt-4 border-t border-stone-200">
          <button
            onClick={handlePasteAndAnalyze}
            className="w-full px-6 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles size={18} /> Analyze text
          </button>
        </div>
      )}
    </motion.div>
  );

  // ── BROWSE SUB-STEP ────────────────────────────────────────────────────────
  const renderBrowse = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="text-center">
        <p className="text-stone-500 text-sm">Search and select words from the database</p>
      </div>

      {showLevelFilter && (
        <div className="flex gap-2">
          {(['Set 1', 'Set 2', 'Set 3', 'Custom'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setSelectedLevel(level)}
              className={`px-4 py-2 rounded-xl font-bold transition-all ${
                selectedLevel === level
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'bg-stone-200 text-stone-600 hover:bg-stone-200-high border-2 border-stone-300/20'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-600" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search words..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-stone-300/30 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none bg-stone-200-lowest text-stone-900 placeholder:text-stone-600/50 transition-all"
        />
      </div>

      <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
        {filteredWords.map((word) => {
          const isSelected = selectedWords.some(w => w.id === word.id);
          return (
            <button
              key={`browse-${word.id}`}
              onClick={() => toggleWordSelection(word)}
              className={`w-full flex items-center gap-2 p-2 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? 'border-primary bg-blue-100/10'
                  : 'border-stone-300/20 bg-stone-200-lowest hover:border-primary/30'
              }`}
            >
              <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center ${
                isSelected ? 'border-primary bg-primary' : 'border-stone-300/40'
              }`}>
                {isSelected && <Check size={12} className="text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-stone-900 truncate">{word.english}</div>
                <div className="text-xs text-stone-600 truncate">
                  {word.hebrew && <span>{word.hebrew}</span>}
                  {word.hebrew && word.arabic && <span> • </span>}
                  {word.arabic && <span>{word.arabic}</span>}
                </div>
              </div>
              {onPlayWord && (
                <div
                  onClick={(e) => { e.stopPropagation(); onPlayWord(word.id, word.english); }}
                  className="p-1.5 rounded-full hover:bg-stone-200-highest transition-colors cursor-pointer"
                >
                  <Volume2 size={14} className="text-stone-600" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );

  // ── TOPIC PACKS SUB-STEP ────────────────────────────────────────────────────
  const renderTopicPacks = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="text-center">
        <p className="text-stone-500 text-sm">Select a themed pack to add words instantly</p>
      </div>

      <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-1">
        {topicPacks.map((pack) => {
          const wordCount = pack.ids.length;
          const isExpanded = expandedPack === pack.name;
          const alreadySelected = pack.ids.filter(id => selectedWords.some(w => w.id === id)).length;

          return (
            <div key={pack.name} className="rounded-xl border-2 border-stone-300/20 bg-stone-200-lowest overflow-hidden transition-all">
              <div className="w-full flex items-center gap-2 p-2 hover:bg-blue-100/5 transition-all cursor-pointer"
                onClick={() => setExpandedPack(isExpanded ? null : pack.name)}
              >
                <span className="text-xl sm:text-2xl">{pack.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm sm:text-base text-stone-900">{pack.name}</div>
                  <div className="text-[10px] sm:text-xs text-stone-600">
                    {wordCount} word{wordCount !== 1 ? 's' : ''}
                    {alreadySelected > 0 && <span className="ml-1 text-primary font-bold">({alreadySelected} selected)</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const packIds = pack.ids;
                      if (alreadySelected === wordCount && wordCount > 0) {
                        onSelectedWordsChange(selectedWords.filter(w => !packIds.includes(w.id)));
                        showToast?.(`Removed ${alreadySelected} words from ${pack.name}`, 'info');
                      } else {
                        const newWords = allWords.filter(w => packIds.includes(w.id) && !selectedWords.some(sw => sw.id === w.id));
                        if (newWords.length > 0) {
                          onSelectedWordsChange([...selectedWords, ...newWords]);
                          showToast?.(`Added ${newWords.length} words from ${pack.name}`, 'success');
                          // Scroll to the Continue button so the user knows what's next
                          setTimeout(() => {
                            continueButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }, 150);
                        }
                      }
                    }}
                    className={`px-2 py-1 text-[10px] sm:text-xs font-bold rounded-full transition-colors ${
                      alreadySelected === wordCount && wordCount > 0
                        ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                        : 'bg-primary text-on-primary hover:bg-primary/90'
                    }`}
                  >
                    {alreadySelected === wordCount && wordCount > 0 ? 'Remove' : alreadySelected > 0 ? `+ Add ${wordCount - alreadySelected} more` : '+ Add All'}
                  </button>
                  <span className="text-[10px] text-stone-400 font-medium">Preview</span>
                  <ChevronRight className="text-stone-600" size={16} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Topic Pack Preview Modal */}
      {expandedPack && (() => {
        const pack = topicPacks.find(p => p.name === expandedPack);
        if (!pack) return null;
        const packWords = allWords.filter(w => pack.ids.includes(w.id));
        const selectedInPack = packWords.filter(w => selectedWords.some(sw => sw.id === w.id)).length;

        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setExpandedPack(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{pack.icon}</span>
                    <div>
                      <h3 className="text-xl font-black text-white">{pack.name}</h3>
                      <p className="text-white/80 text-sm">{selectedInPack} / {packWords.length} selected</p>
                    </div>
                  </div>
                  <button onClick={() => setExpandedPack(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                    <X size={20} className="text-white" />
                  </button>
                </div>
              </div>

              {/* Actions bar */}
              <div className="px-6 py-3 border-b border-stone-200 flex items-center justify-between bg-stone-50">
                <button
                  onClick={() => {
                    const allPackIds = pack.ids;
                    const allAlreadyIn = allPackIds.every(id => selectedWords.some(w => w.id === id));
                    if (allAlreadyIn) {
                      onSelectedWordsChange(selectedWords.filter(w => !allPackIds.includes(w.id)));
                      showToast?.(`Removed all ${packWords.length} words from ${pack.name}`, 'info');
                    } else {
                      const newWords = packWords.filter(w => !selectedWords.some(sw => sw.id === w.id));
                      if (newWords.length > 0) {
                        onSelectedWordsChange([...selectedWords, ...newWords]);
                        showToast?.(`Added ${newWords.length} words from ${pack.name}`, 'success');
                      }
                    }
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all"
                >
                  {packWords.every(w => selectedWords.some(sw => sw.id === w.id)) ? 'Remove All' : 'Select All'}
                </button>
                <span className="text-xs text-stone-500">Click words to select/deselect</span>
              </div>

              {/* Word grid */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="flex flex-wrap gap-3">
                  {packWords.map(word => {
                    const isSelected = selectedWords.some(w => w.id === word.id);
                    return (
                      <button
                        key={word.id}
                        onClick={() => toggleWordSelection(word)}
                        className={`px-4 py-3 rounded-xl text-base font-bold transition-all shadow-sm ${
                          isSelected
                            ? 'bg-primary text-white scale-105 shadow-md ring-2 ring-primary/30'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border-2 border-stone-300'
                        }`}
                      >
                        {word.english}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-stone-200 flex justify-between items-center">
                <span className="text-sm text-stone-500">{selectedInPack} word{selectedInPack !== 1 ? 's' : ''} selected</span>
                <button
                  onClick={() => setExpandedPack(null)}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* Continue button removed — global one at bottom handles it */}
    </motion.div>
  );

  // ── SAVED GROUPS SUB-STEP ────────────────────────────────────────────────────
  const renderSavedGroups = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="text-center">
        <p className="text-stone-500 text-sm">Quick access to your previous word lists</p>
      </div>

      {savedGroups.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">💾</div>
          <p className="text-stone-600 mb-4">No saved groups yet. Create your first one!</p>
          <button onClick={() => setSubStep('paste')} className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20">
            Create Word Group
          </button>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {savedGroups.map((group) => (
            <motion.button
              key={group.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => {
                const groupWords = allWords.filter(w => group.words.includes(w.id));
                onSelectedWordsChange([...selectedWords, ...groupWords.filter(w => !selectedWords.some(sw => sw.id === w.id))]);
                showToast?.(`Added ${group.words.length} words from ${group.name}`, 'success');
              }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-stone-300/20 bg-stone-200-lowest hover:border-primary/50 hover:bg-blue-100/5 transition-all text-left"
            >
              <div className="text-3xl">📁</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-stone-900 truncate">{group.name}</div>
                <div className="text-sm text-stone-600">{group.words.length} word{group.words.length !== 1 ? 's' : ''}</div>
              </div>
              <ChevronRight className="text-stone-600" size={20} />
            </motion.button>
          ))}
        </div>
      )}

      {/* Continue button — appears when words are selected */}
    </motion.div>
  );

  // ── WORD EDITOR MODAL (Quick Play) ──────────────────────────────────────────
  const renderWordEditorModal = () => (
    wordEditorOpen && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
        <div className="bg-stone-100 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] sm:max-h-[80vh] flex flex-col">
          <div className="p-4 sm:p-6 border-b border-surface-container-highest">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-black text-stone-900 flex items-center gap-1.5 sm:gap-2">
                <Search className="text-primary" size={16} />
                <span className="text-base sm:text-lg">Add Your Words</span>
              </h2>
              <button onClick={() => setWordEditorOpen(false)} className="text-stone-600 hover:text-stone-900">
                <X size={20} />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 mt-1.5 sm:mt-2">
              Type or paste words below. Use <span className="font-bold">commas</span> to separate words, or put each word on a <span className="font-bold">new line</span>.
            </p>
          </div>

          <div className="p-4 sm:p-6 flex-grow overflow-y-auto">
            <textarea
              placeholder="Examples:\\napple, ice cream, house, book\\n\\nOr each word on a new line:\\napple\\nice cream\\nhouse\\nbook"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-20 sm:h-24 px-3 sm:px-4 py-2 sm:py-3 bg-stone-200 border-2 border-surface-container-highest text-stone-900 placeholder:text-stone-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-medium resize-none text-sm sm:text-base"
              autoFocus
            />

            {searchTerms.length > 0 && (
              <div className="mt-3 sm:mt-4">
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <p className="text-xs sm:text-sm font-bold text-stone-900">
                    {searchTerms.length} word{searchTerms.length !== 1 ? 's' : ''} detected
                  </p>
                  <button onClick={() => setSearchQuery('')} className="text-[10px] sm:text-xs text-rose-600 font-bold hover:text-rose-700">
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 max-h-40 sm:max-h-48 overflow-y-auto">
                  {searchTerms.map(term => (
                    <div
                      key={term}
                      draggable
                      onDragStart={() => setDraggedWord(term)}
                      onDragEnd={() => setDraggedWord(null)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggedWord && draggedWord !== term) {
                          const mergedPhrase = `${draggedWord} ${term}`;
                          const terms = searchQuery.split(/[,\n]+/).map(t => t.trim().toLowerCase()).filter(t => t.length > 0 && t !== draggedWord && t !== term);
                          terms.push(mergedPhrase);
                          setSearchQuery(terms.join(', '));
                          setDraggedWord(null);
                        }
                      }}
                      className={`group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white rounded-full border transition-all cursor-move ${
                        draggedWord === term ? 'opacity-50' : ''
                      } ${
                        draggedWord && draggedWord !== term ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'border-surface-container-highest hover:border-rose-300'
                      }`}
                      title={draggedWord && draggedWord !== term ? `Drop "${draggedWord}" here to make "${draggedWord} ${term}"` : term}
                    >
                      <span className="text-xs sm:text-sm font-bold text-stone-900">{term}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const terms = searchQuery.split(/[,\n]+/).map(t => t.trim().toLowerCase()).filter(t => t.length > 0 && t !== term);
                          setSearchQuery(terms.join(', '));
                        }}
                        className="text-rose-400 hover:text-rose-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                {searchTerms.length > 1 && (
                  <p className="text-[10px] sm:text-xs text-stone-600 mt-1.5 sm:mt-2 flex items-center gap-0.5 sm:gap-1">
                    <Info size={10} />
                    <span className="hidden sm:inline">Tip: Drag one word onto another to combine them into a phrase!</span>
                    <span className="sm:hidden">Drag words together to make phrases!</span>
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="p-4 sm:p-6 border-t border-surface-container-highest flex items-center justify-between gap-2">
            <button onClick={() => setWordEditorOpen(false)} className="px-4 sm:px-6 py-2.5 sm:py-3 bg-stone-200 text-stone-900 rounded-xl font-bold hover:bg-stone-200-highest transition-colors text-sm sm:text-base">
              Cancel
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!searchQuery.trim()) return;
                  const analysis = analyzePastedText(searchQuery, allWords);
                  setPreviewAnalysis(analysis as any);
                  setShowPreviewInline(true);
                  setSearchQuery('');
                  setWordEditorOpen(false);
                }}
                disabled={!searchQuery.trim()}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-1.5 sm:gap-2 shadow-lg text-sm sm:text-base disabled:opacity-50"
              >
                <Sparkles size={14} /> Analyze & Preview
              </button>
              <button onClick={() => setWordEditorOpen(false)} className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-1.5 sm:gap-2 shadow-lg text-sm sm:text-base">
                <Check size={14} /> Done
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );

  // ── Review Flagged Translations Modal ────────────────────────────────────────
  const renderReviewModal = () => {
    if (!reviewModalOpen || flaggedWords.length === 0) return null;
    const word = flaggedWords[reviewIndex];
    if (!word) { setReviewModalOpen(false); return null; }
    const score = matchScores.get(word.id);

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setReviewModalOpen(false)}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              Review Translation
            </h3>
            <button onClick={() => setReviewModalOpen(false)} className="text-stone-400 hover:text-stone-600">
              <X size={20} />
            </button>
          </div>

          <div className="text-center mb-4">
            <span className="text-2xl font-black text-stone-900">{word.english}</span>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 bg-stone-50 rounded-xl p-3">
              <span className="text-xs font-bold text-stone-500 shrink-0">HE</span>
              <span className="text-sm flex-1" dir="rtl">{word.hebrew || '—'}</span>
            </div>
            <div className="flex items-center gap-2 bg-stone-50 rounded-xl p-3">
              <span className="text-xs font-bold text-stone-500 shrink-0">AR</span>
              <span className="text-sm flex-1" dir="rtl">{word.arabic || '—'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4 bg-amber-50 rounded-xl px-3 py-2">
            <span className={`w-3 h-3 rounded-full ${score === 0 ? 'bg-red-500' : 'bg-amber-500'}`} />
            <span className="text-sm font-semibold text-stone-600">
              Match score: {score !== undefined ? `${Math.round(score * 100)}%` : 'Unknown'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                openInlineEditor(word);
                setReviewModalOpen(false);
              }}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all"
            >
              Edit translation
            </button>
            <button
              onClick={() => {
                if (reviewIndex >= flaggedWords.length - 1) {
                  setReviewModalOpen(false);
                } else {
                  setReviewIndex(prev => prev + 1);
                }
              }}
              className="flex-1 px-4 py-2 bg-stone-200 text-stone-700 rounded-xl font-bold text-sm hover:bg-stone-300 transition-all"
            >
              {reviewIndex < flaggedWords.length - 1 ? 'Next →' : 'Done'}
            </button>
          </div>

          <div className="text-center mt-3">
            <span className="text-xs text-stone-400">{reviewIndex + 1} of {flaggedWords.length}</span>
          </div>
        </motion.div>
      </div>
    );
  };

  // ── MAIN RENDER ─────────────────────────────────────────────────────────────
  return (
    <div className="pb-8">
        {/* Tab bar — always visible */}
        {renderTabBar()}

        {/* Active tab content */}
        <AnimatePresence mode="wait">
          {subStep === 'paste' && <div key="paste">{renderPaste()}</div>}
          {subStep === 'topic-packs' && <div key="topic-packs">{renderTopicPacks()}</div>}
          {subStep === 'saved-groups' && <div key="saved-groups">{renderSavedGroups()}</div>}
          {subStep === 'ocr' && <div key="ocr">{renderOcr()}</div>}
        </AnimatePresence>

        {renderWordEditorModal()}
        {renderReviewModal()}

        {/* Continue button — visible from any tab when words are selected */}
        {selectedWords.length > 0 && (
          <button
            ref={nextButtonRef}
            onClick={handleNextAndClearDraft}
            className="w-full mt-6 py-4 signature-gradient text-white rounded-2xl font-black text-base shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Continue to Step 2 <ArrowRight size={20} />
          </button>
        )}
    </div>
  );
};

export default WordInputStep;