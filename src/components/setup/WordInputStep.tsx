/**
 * WordInputStep — shared word-input step for both Quick Play and Assignment flows.
 * Combines Quick Play search-based input with Assignment paste/browse/saved-groups/topic-packs.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Check, ChevronRight, ChevronDown, Search, Plus, Trash2, Edit2,
  Clipboard, ArrowRight, ArrowLeft, Sparkles, Save,
  Volume2, Loader2, Languages, Camera, Info, BookOpen,
  FolderOpen, Copy, Share2, Filter, Lock,
} from 'lucide-react';
import { Word } from '../../data/vocabulary';
import { analyzePastedText, type WordAnalysisResult } from '../../utils/wordAnalysis';
import { PastePreviewModal } from '../PastePreviewModal';
import { WizardMode, WordInputSubStep, AssignmentData } from './types';

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
  onTranslateWord?: (word: string) => Promise<{ hebrew: string; arabic: string } | null>;
  onOcrUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isOcrProcessing?: boolean;
  ocrProgress?: number;
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
  onTranslateWord,
  onOcrUpload,
  isOcrProcessing = false,
  ocrProgress = 0,
  onDocxUpload,
  onPlayWord,
  showToast,
  topicPacks = [],
  customWords = [],
  onCustomWordsChange,
  editingAssignment = null,
}) => {
  // ── Sub-step state ─────────────────────────────────────────────────────────
  const [subStep, setSubStep] = useState<WordInputSubStep>('landing');
  
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
  const [showPreview, setShowPreview] = useState(false);
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

    // Get matching words from vocabulary
    const matches = allWords.filter(word => {
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
    onSelectedWordsChange([...selectedWords, word]);
  };

  // ── Add all selected suggestions ─────────────────────────────────────────────────
  const addSelectedSuggestions = () => {
    const newWords = autocompleteSuggestions.filter(w =>
      selectedSuggestions.has(w.id) && !isDuplicateWord(w)
    );
    if (newWords.length > 0) {
      onSelectedWordsChange([...selectedWords, ...newWords]);
      setSelectedSuggestions(new Set());
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

  // ── Auto-collapse selected words section after selection ──────────────────────
  useEffect(() => {
    if (selectedWords.length > 0) {
      // Auto-collapse after 2 seconds to show action buttons
      const timer = setTimeout(() => {
        setSelectedWordsCollapsed(true);
      }, 2000);
      return () => clearTimeout(timer);
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
  
  // ── Handler functions ───────────────────────────────────────────────────────
  const handleAutoTranslate = async (term: string) => {
    if (!onTranslateWord || translating.has(term)) return;
    
    setTranslating(prev => new Set([...prev, term]));
    
    try {
      const translation = await onTranslateWord(term);
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
  
  const handlePasteAndAnalyze = () => {
    if (!searchQuery.trim()) return;
    const analysis = analyzePastedText(searchQuery, allWords);
    setPreviewAnalysis(analysis as any);
    setShowPreview(true);
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
    setShowPreview(false);
    setPreviewAnalysis(null);
    setSearchQuery('');
  };

  const handlePreviewCancel = () => {
    setShowPreview(false);
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

  // ── Constants ───────────────────────────────────────────────────────────────
  const canProceed = selectedWords.length > 0;
  const isQuickPlay = mode === 'quick-play';

  // ── LANDING SUB-STEP ───────────────────────────────────────────────────────
  const renderLanding = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-black text-stone-900 mb-2">
          {isQuickPlay ? 'Quick Play Setup' : editingAssignment ? 'Edit Assignment' : 'Create Assignment'}
        </h2>
        <p className="text-stone-600">Choose how you'd like to add words</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSubStep('paste')}
          className="w-full group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl p-4 sm:p-6 shadow-xl shadow-indigo-500/20 hover:shadow-2xl hover:shadow-indigo-500/30 transition-all text-left"
        >
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-black text-white mb-1">Paste from anywhere</h3>
                <p className="text-white/90 text-xs sm:text-sm mb-2">Copy words from PDF, book, or document</p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full">
                  <span className="text-white text-xs font-bold">⚡ Fastest</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl">📋</span>
                <ChevronRight className="text-white/60" size={20} />
              </div>
            </div>
          </div>
        </motion.button>

        {!isQuickPlay && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled
            className="w-full group relative overflow-hidden bg-gradient-to-br from-stone-400 to-stone-500 rounded-3xl p-4 sm:p-6 shadow-xl opacity-60 cursor-not-allowed transition-all text-left"
          >
            <span className="absolute top-3 right-3 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm z-10">PRO</span>
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-black text-white mb-1">Books library</h3>
                  <p className="text-white/90 text-xs sm:text-sm mb-2">Pro version • Coming soon</p>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full">
                    <span className="text-white text-xs font-bold">🔒 Future feature</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl">📖</span>
                  <Lock className="text-white/60" size={20} />
                </div>
              </div>
            </div>
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSubStep('topic-packs')}
          className="w-full group relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-4 sm:p-6 shadow-xl shadow-amber-500/20 hover:shadow-2xl hover:shadow-amber-500/30 transition-all text-left"
        >
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-black text-white mb-1">Topic Packs</h3>
                <p className="text-white/90 text-xs sm:text-sm mb-2">Ready-made themed collections</p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full">
                  <span className="text-white text-xs font-bold">{topicPacks.length} packs</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl">🧩</span>
                <ChevronRight className="text-white/60" size={20} />
              </div>
            </div>
          </div>
        </motion.button>

        {!isQuickPlay && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSubStep('saved-groups')}
            className="w-full group relative overflow-hidden bg-gradient-to-br from-teal-500 to-cyan-600 rounded-3xl p-4 sm:p-6 shadow-xl shadow-teal-500/20 hover:shadow-2xl hover:shadow-teal-500/30 transition-all text-left"
          >
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-black text-white mb-1">Saved groups</h3>
                  <p className="text-white/90 text-xs sm:text-sm mb-2">Your previous word lists</p>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full">
                    <span className="text-white text-xs font-bold">{savedGroups.length} saved</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl">💾</span>
                  <ChevronRight className="text-white/60" size={20} />
                </div>
              </div>
            </div>
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.01 }}
          onClick={() => showToast?.('OCR is a Pro feature', 'info')}
          className="w-full group relative overflow-hidden bg-stone-200 rounded-3xl p-4 sm:p-6 shadow-sm text-left cursor-not-allowed"
        >
          <span className="absolute top-3 right-3 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm z-10">PRO</span>
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-black text-stone-500 mb-1">Upload image</h3>
                <p className="text-stone-400 text-xs sm:text-sm mb-2">Take a photo to extract words</p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-stone-300/50 rounded-full">
                  <span className="text-stone-500 text-xs font-bold">Pro feature</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl opacity-40">📷</span>
              </div>
            </div>
          </div>
        </motion.button>
      </div>

      <button
        onClick={onBack}
        className="w-full py-3 text-white font-bold flex items-center justify-center gap-2 signature-gradient px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
      >
        ← Cancel
      </button>
    </motion.div>
  );

  // ── PASTE SUB-STEP ─────────────────────────────────────────────────────────
  const renderPaste = () => (
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
          className="text-stone-600 hover:text-stone-900 font-medium flex items-center gap-2 transition-colors"
        >
          <ArrowLeft size={18} /> Back
        </button>
        <div className="text-sm font-medium text-stone-500">Step 1 of 3</div>
      </div>

      {/* Title */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-stone-900 tracking-tight">Add words</h2>
        <p className="text-stone-500 max-w-md mx-auto">
          {selectedWords.length > 0
            ? `${selectedWords.length} word${selectedWords.length !== 1 ? 's' : ''} selected`
            : 'Search, type, or paste words to add'
          }
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
        <input
          type="text"
          ref={autocompleteRef}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowAutocomplete(true);
            setAutocompleteIndex(0);
          }}
          onFocus={() => setShowAutocomplete(true)}
          placeholder="Search or type a word..."
          className="w-full pl-12 pr-12 py-4 rounded-2xl border-2 border-stone-200 text-lg focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 bg-white text-stone-900 placeholder:text-stone-400 transition-all shadow-sm"
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
        </div>

        {/* Autocomplete Dropdown */}
        {showAutocomplete && autocompleteSuggestions.length > 0 && (
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
                <span>Click to add • Press Esc to close</span>
                <span>{autocompleteSuggestions.length} results</span>
              </div>
            </div>
          </>
        )}
      </div>

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
                    {selectedWords.filter(w => w.hebrew || w.arabic).length} with translation
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    {selectedWords.filter(w => !w.hebrew && !w.arabic).length} need translation
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedWordsCollapsed(!selectedWordsCollapsed)}
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

            {/* Collapsible word list */}
            {!selectedWordsCollapsed && (
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto mt-2">
                {selectedWords.map(word => {
                  const hasTranslation = word.hebrew || word.arabic;
                  return (
                    <button
                      key={word.id}
                      onClick={() => toggleWordSelection(word)}
                      className="px-3 py-1.5 bg-white rounded-full text-sm font-bold flex items-center gap-2 hover:opacity-80 transition-all shadow-sm border-2 border-primary/20"
                      title={hasTranslation ? 'Has translations' : 'Needs translation'}
                    >
                      <span className={`w-2 h-2 rounded-full ${hasTranslation ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {word.english}
                      <X size={12} className="text-rose-500" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-stone-200">
        <button
          onClick={() => setSubStep('landing')}
          className="px-6 py-3 rounded-xl border-2 border-stone-300 text-stone-600 font-semibold hover:bg-stone-50 transition-all"
        >
          Cancel
        </button>

        <button
          onClick={handlePasteAndAnalyze}
          disabled={!searchQuery.trim()}
          className="px-6 py-3 rounded-xl border-2 border-primary bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          <Sparkles size={18} /> Analyze text
        </button>

        {selectedWords.length > 0 && (
          <button
            onClick={onNext}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            Continue <ArrowRight size={18} />
          </button>
        )}
      </div>
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
      <div className="flex items-center justify-between">
        <button onClick={() => setSubStep('landing')} className="signature-gradient text-white px-4 py-2 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2">
          <ArrowLeft size={18} /> Back
        </button>
        <div className="text-sm font-bold text-stone-600">Step 1 of 3</div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-black text-stone-900 mb-2">Browse vocabulary</h2>
        <p className="text-stone-600">Search and select words from the database</p>
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
      <div className="flex items-center justify-between">
        <button onClick={() => setSubStep('landing')} className="signature-gradient text-white px-4 py-2 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2">
          <ArrowLeft size={18} /> Back
        </button>
        <div className="text-sm font-bold text-stone-600">Step 1 of 3</div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-black text-stone-900 mb-2">Topic Packs</h2>
        <p className="text-stone-600">Select a themed pack to add words instantly</p>
      </div>

      <div className={`space-y-1.5 transition-all duration-300 ${expandedPack ? 'max-h-[280px] overflow-y-auto pr-1' : 'max-h-[450px] overflow-y-auto pr-1'}`}>
        {topicPacks.map((pack) => {
          const wordCount = pack.ids.length;
          const isExpanded = expandedPack === pack.name;
          const alreadySelected = pack.ids.filter(id => selectedWords.some(w => w.id === id)).length;

          return (
            <div key={pack.name} className={`rounded-xl border-2 border-stone-300/20 bg-stone-200-lowest overflow-hidden transition-all ${isExpanded ? 'border-primary/50 shadow-lg' : ''}`}>
              <div
                onClick={() => setExpandedPack(isExpanded ? null : pack.name)}
                className="w-full flex items-center gap-2 p-2 hover:bg-blue-100/5 transition-all cursor-pointer"
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
                        }
                      }
                    }}
                    className={`px-2 py-1 text-[10px] sm:text-xs font-bold rounded-full transition-colors ${
                      alreadySelected === wordCount && wordCount > 0
                        ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                        : 'bg-primary text-on-primary hover:bg-primary/90'
                    }`}
                  >
                    {alreadySelected === wordCount && wordCount > 0 ? '✕ Remove' : alreadySelected > 0 ? `+ Add ${wordCount - alreadySelected} more` : '+ Add All'}
                  </button>
                  <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronRight className="text-stone-600" size={16} />
                  </motion.div>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 sm:p-8 bg-white border-t-2 border-stone-300/20 min-h-[600px] max-h-[80vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-2xl sm:text-3xl font-black text-stone-900">{pack.name}</p>
                          <p className="text-sm sm:text-base text-stone-500">
                            {pack.ids.filter(id => selectedWords.some(w => w.id === id)).length} / {pack.ids.length} selected
                          </p>
                        </div>
                        <button
                          onClick={() => setExpandedPack(null)}
                          className="p-2 rounded-full hover:bg-stone-100 transition-colors"
                        >
                          <X size={20} className="text-stone-600" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-3 sm:gap-4">
                        {allWords.filter(w => pack.ids.includes(w.id)).map(word => {
                          const isSelected = selectedWords.some(w => w.id === word.id);
                          return (
                            <button
                              key={word.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleWordSelection(word);
                              }}
                              className={`px-4 py-3 sm:px-6 sm:py-4 rounded-xl text-base sm:text-lg font-bold transition-all shadow-sm ${
                                isSelected
                                  ? 'bg-primary text-white scale-105 shadow-md ring-2 ring-primary/30'
                                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200 hover:scale-102 border-2 border-stone-300'
                              }`}
                            >
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
      <div className="flex items-center justify-between">
        <button onClick={() => setSubStep('landing')} className="signature-gradient text-white px-4 py-2 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2">
          <ArrowLeft size={18} /> Back
        </button>
        <div className="text-sm font-bold text-stone-600">Step 1 of 3</div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-black text-stone-900 mb-2">Saved word groups</h2>
        <p className="text-stone-600">Quick access to your previous word lists</p>
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
                  setShowPreview(true);
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

  // ── MAIN RENDER ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-100">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 md:px-6 py-6">
        <AnimatePresence mode="wait">
          {subStep === 'landing' && <div key="landing">{renderLanding()}</div>}
          {subStep === 'paste' && <div key="paste">{renderPaste()}</div>}
          {subStep === 'browse' && <div key="browse">{renderBrowse()}</div>}
          {subStep === 'topic-packs' && <div key="topic-packs">{renderTopicPacks()}</div>}
          {subStep === 'saved-groups' && <div key="saved-groups">{renderSavedGroups()}</div>}
        </AnimatePresence>

        {showPreview && previewAnalysis && (
          <PastePreviewModal
            analysis={previewAnalysis}
            onConfirm={handlePreviewConfirm}
            onCancel={handlePreviewCancel}
            onQuickSave={(customTranslations, addedSuggestionIds) => {
              handlePreviewConfirm(customTranslations, addedSuggestionIds);
            }}
            onRemoveMatched={(wordId) => {
              if (previewAnalysis) {
                setPreviewAnalysis({
                  ...previewAnalysis,
                  matchedWords: previewAnalysis.matchedWords.filter((mw: any) => mw.word.id !== wordId),
                  stats: { ...previewAnalysis.stats, matchedCount: previewAnalysis.stats.matchedCount - 1, totalTerms: previewAnalysis.stats.totalTerms - 1 },
                });
              }
            }}
            onRemoveUnmatched={(term) => {
              if (previewAnalysis) {
                setPreviewAnalysis({
                  ...previewAnalysis,
                  unmatchedTerms: previewAnalysis.unmatchedTerms.filter((t: any) => t.term !== term),
                  stats: { ...previewAnalysis.stats, unmatchedCount: previewAnalysis.stats.unmatchedCount - 1, totalTerms: previewAnalysis.stats.totalTerms - 1 },
                });
              }
            }}
          />
        )}

        {renderWordEditorModal()}

        {selectedWords.length > 0 && subStep === 'landing' && (
          <button
            ref={nextButtonRef}
            onClick={onNext}
            className="w-full mt-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-bold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            Continue to Step 2 <ArrowRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default WordInputStep;