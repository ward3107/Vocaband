import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Check, ChevronRight, Search, Filter, Plus, Trash2, Edit2,
  Clipboard, BookOpen, FolderOpen, Copy, Share2,
  Zap, Target, Headphones, PenTool, CheckCircle, RotateCcw,
  Volume2, Shuffle, ArrowRight, ArrowLeft, Sparkles, Save, XCircle, Camera
} from 'lucide-react';
import { Word } from '../data/vocabulary';

interface CreateAssignmentWizardProps {
  selectedClass: { name: string; code: string; studentCount?: number };
  allWords: Word[];
  band1Words: Word[];
  band2Words: Word[];
  customWords: Word[];
  setCustomWords: (words: Word[]) => void;
  assignmentTitle: string;
  setAssignmentTitle: (title: string) => void;
  assignmentDeadline: string;
  setAssignmentDeadline: (date: string) => void;
  assignmentModes: string[];
  setAssignmentModes: (modes: string[]) => void;
  selectedWords: number[];
  setSelectedWords: (words: number[]) => void;
  selectedLevel: string;
  setSelectedLevel: (level: string) => void;
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
  handleTagInputKeyDown: (e: React.KeyboardEvent) => void;
  handleDocxUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleOcrUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveAssignment: () => void;
  isOcrProcessing?: boolean;
  ocrProgress?: number;
  showTopicPacks: boolean;
  setShowTopicPacks: (show: boolean) => void;
  showAssignmentWelcome: boolean;
  setShowAssignmentWelcome: (show: boolean) => void;
  TOPIC_PACKS: Array<{ name: string; icon: string; ids: number[] }>;
  ASSIGNMENT_TITLE_SUGGESTIONS: string[];
  onBack: () => void;
  editingAssignment: AssignmentData | null;
  setEditingAssignment: (assignment: AssignmentData | null) => void;
}

interface AssignmentData {
  id: number;
  title: string;
  wordIds: number[];
  words?: Word[];
  deadline?: string;
  allowedModes?: string[];
  classId: string;
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

type SubStep = 'landing' | 'paste' | 'editor' | 'browse' | 'saved-groups';

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
  isOcrProcessing = false,
  ocrProgress = 0,
  showTopicPacks,
  setShowTopicPacks,
  showAssignmentWelcome,
  setShowAssignmentWelcome,
  TOPIC_PACKS,
  ASSIGNMENT_TITLE_SUGGESTIONS,
  onBack,
  editingAssignment,
  setEditingAssignment,
}) => {
  const [step, setStep] = useState(1);
  const [subStep, setSubStep] = useState<SubStep>('landing');
  const [editedWords, setEditedWords] = useState<WordWithStatus[]>([]);
  const [selectedWordIds, setSelectedWordIds] = useState<number[]>([]);
  const [editingWord, setEditingWord] = useState<WordWithStatus | null>(null);
  const [editTranslations, setEditTranslations] = useState({ hebrew: '', arabic: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [savedGroups, setSavedGroups] = useState<Array<{ id: string; name: string; words: number[]; createdAt: string }>>([]);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [showSaveGroup, setShowSaveGroup] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [joinedWords, setJoinedWords] = useState<number[]>([]);
  const pasteAreaRef = useRef<HTMLTextAreaRef>(null);

  // Load saved groups from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vocaband_saved_groups');
      if (saved) {
        setSavedGroups(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // Save groups to localStorage
  const saveGroupsToStorage = (groups: typeof savedGroups) => {
    try {
      localStorage.setItem('vocaband_saved_groups', JSON.stringify(groups));
    } catch {}
  };

  // Generate safe integer ID for custom words/phrases
  const generateCustomId = () => {
    // Use negative IDs to avoid conflicts with database IDs
    // Use timestamp in seconds to keep it within integer range
    return -Math.floor(Date.now() / 1000);
  };

  // Analyze pasted words
  const analyzePastedWords = (text: string): { matched: Word[]; unmatched: string[] } => {
    const words = text.split(/[\n,;\t]+/).map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
    const matched: Word[] = [];
    const unmatched: string[] = [];

    words.forEach(word => {
      const found = allWords.find(w => w.english.toLowerCase() === word);
      if (found) {
        matched.push(found);
      } else {
        unmatched.push(word);
      }
    });

    return { matched, unmatched };
  };

  // Convert selected words to WordWithStatus
  const getWordsWithStatus = (): WordWithStatus[] => {
    const wordMap = new Map<number, Word>();
    [...allWords, ...customWords].forEach(w => wordMap.set(w.id, w));

    return selectedWords.map(id => {
      const word = wordMap.get(id);
      if (!word) return null;

      const isJoinedPhrase = joinedWords.includes(id);
      return {
        id: word.id,
        english: word.english,
        hebrew: word.hebrew || '',
        arabic: word.arabic || '',
        hasTranslation: !!(word.hebrew || word.arabic),
        isPhrase: isJoinedPhrase,
        phraseWords: isJoinedPhrase ? [id] : undefined,
      };
    }).filter((w): w is WordWithStatus => w !== null);
  };

  // Handle paste and analyze
  const handlePasteAndAnalyze = () => {
    const { matched, unmatched } = analyzePastedWords(pastedText);

    const wordWithStatus: WordWithStatus[] = matched.map(w => ({
      id: w.id,
      english: w.english,
      hebrew: w.hebrew || '',
      arabic: w.arabic || '',
      hasTranslation: !!(w.hebrew || w.arabic),
      isPhrase: false,
    }));

    // Add unmatched as custom words
    const customWordsToAdd = unmatched.map((word, index) => {
      const newWord: Word = {
        id: generateCustomId() - index, // Ensure unique IDs
        english: word,
        hebrew: '',
        arabic: '',
        level: 'Custom',
      };
      return newWord;
    });

    setEditedWords([...wordWithStatus, ...customWordsToAdd.map(w => ({
      id: w.id,
      english: w.english,
      hebrew: w.hebrew,
      arabic: w.arabic,
      hasTranslation: false,
      isPhrase: false,
    }))]);

    setSubStep('editor');
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

  // Filter words for browse
  const filteredWords = allWords.filter(word => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      word.english.toLowerCase().includes(query) ||
      word.hebrew?.includes(query) ||
      word.arabic?.includes(query)
    );
  });

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
            <div className="space-y-4">
              {/* Paste Word List - RECOMMENDED */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSubStep('paste')}
                className="w-full group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 sm:p-8 shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/30 transition-all text-left"
              >
                <div className="relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-4xl mb-3">📋</div>
                      <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
                        Paste from anywhere
                      </h3>
                      <p className="text-blue-100 text-sm sm:text-base mb-4">
                        Copy words from PDF, book, or document
                      </p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full">
                        <span className="text-white text-xs sm:text-sm font-bold">⚡ Fastest • Most Flexible</span>
                      </div>
                    </div>
                    <ChevronRight className="text-white/30 group-hover:text-white transition-colors" size={24} />
                  </div>
                </div>
              </motion.button>

              {/* Browse Vocabulary */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSubStep('browse')}
                className="w-full group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl p-6 sm:p-8 shadow-xl shadow-purple-500/20 hover:shadow-2xl hover:shadow-purple-500/30 transition-all text-left"
              >
                <div className="relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-4xl mb-3">🔍</div>
                      <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
                        Browse vocabulary
                      </h3>
                      <p className="text-purple-100 text-sm sm:text-base mb-4">
                        Search and select from our word database
                      </p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full">
                        <span className="text-white text-xs sm:text-sm font-bold">📚 {allWords.length}+ words • Curated</span>
                      </div>
                    </div>
                    <ChevronRight className="text-white/30 group-hover:text-white transition-colors" size={24} />
                  </div>
                </div>
              </motion.button>

              {/* Load Saved Group */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSubStep('saved-groups')}
                className="w-full group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-6 sm:p-8 shadow-xl shadow-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all text-left"
              >
                <div className="relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-4xl mb-3">💾</div>
                      <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
                        Use saved group
                      </h3>
                      <p className="text-emerald-100 text-sm sm:text-base mb-4">
                        Quick access to your previous word lists
                      </p>
                      {savedGroups.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {savedGroups.slice(0, 3).map(group => (
                            <div key={group.id} className="text-white/90 text-sm bg-white/10 rounded-lg px-3 py-2 flex items-center justify-between">
                              <span>📁 {group.name}</span>
                              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{group.words.length} words</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full">
                        <span className="text-white text-xs sm:text-sm font-bold">{savedGroups.length} saved groups available</span>
                      </div>
                    </div>
                    <ChevronRight className="text-white/30 group-hover:text-white transition-colors" size={24} />
                  </div>
                </div>
              </motion.button>

              {/* OCR Upload - New Option */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => document.getElementById('ocr-upload-input')?.click()}
                disabled={isOcrProcessing}
                className="w-full group relative overflow-hidden bg-gradient-to-br from-pink-500 to-rose-600 rounded-3xl p-6 sm:p-8 shadow-xl shadow-pink-500/20 hover:shadow-2xl hover:shadow-pink-500/30 transition-all text-left"
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleOcrUpload}
                  disabled={isOcrProcessing}
                  className="hidden"
                  id="ocr-upload-input"
                />
                <div className="relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-4xl mb-3">📷</div>
                      <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
                        {isOcrProcessing ? 'Processing...' : 'Upload image'}
                      </h3>
                      <p className="text-pink-100 text-sm sm:text-base mb-4">
                        Take a photo of a worksheet to extract words
                      </p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full">
                        <span className="text-white text-xs sm:text-sm font-bold">
                          {isOcrProcessing ? `${ocrProgress}%` : 'Auto-detect vocabulary'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="text-white/30 group-hover:text-white transition-colors" size={24} />
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
                    {pastedText.split(/[\n,;\t]+/).filter(w => w.trim()).length} words
                  </div>
                )}
              </div>

              {/* Paste from clipboard button */}
              <button
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    setPastedText(text);
                  } catch {
                    // Fallback: prompt user
                    const text = prompt('Paste your words here:');
                    if (text) setPastedText(text);
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
                      key={word.id}
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
                        <div className="text-xs sm:text-sm text-on-surface-variant truncate">
                          {word.hebrew && <span className="ml-0">{word.hebrew}</span>}
                          {word.hebrew && word.arabic && <span className="mx-1">•</span>}
                          {word.arabic && <span>{word.arabic}</span>}
                          {!word.hasTranslation && <span className="italic">(no translation)</span>}
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
                    key={word.id}
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
                      <div className="text-xs text-on-surface-variant truncate">
                        {word.hebrew && <span>{word.hebrew}</span>}
                        {word.hebrew && word.arabic && <span className="mx-1">•</span>}
                        {word.arabic && <span>{word.arabic}</span>}
                      </div>
                    </div>
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
        {/* Title */}
        <div>
          <label className="block text-sm font-bold text-on-surface mb-2">
            Assignment name <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={assignmentTitle}
            onChange={(e) => setAssignmentTitle(e.target.value)}
            list="assignment-titles"
            placeholder="e.g., Fruits Vocabulary - Unit 5"
            className="w-full p-4 rounded-2xl border-2 border-outline-variant/30 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/50 transition-all"
          />
          <datalist id="assignment-titles">
            {ASSIGNMENT_TITLE_SUGGESTIONS.map((title) => (
              <option key={title} value={title} />
            ))}
          </datalist>
        </div>

        {/* Instructions */}
        <div>
          <label className="block text-sm font-bold text-on-surface mb-2">
            Instructions for students (optional)
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Add a note for your students..."
            rows={2}
            className="w-full p-4 rounded-2xl border-2 border-outline-variant/30 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/50 transition-all resize-none"
          />
        </div>
      </div>

      {/* Presets */}
      <div className="space-y-3">
        <label className="block text-sm font-bold text-on-surface">
          Recommended presets
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id)}
              className={`p-4 rounded-2xl border-2 transition-all text-left ${
                selectedPreset === preset.id
                  ? 'border-primary bg-primary-container/10'
                  : 'border-outline-variant/20 bg-surface-container-lowest hover:border-primary/30'
              }`}
            >
              <div className="text-2xl mb-2">{preset.icon}</div>
              <div className="font-bold text-on-surface text-sm mb-1">{preset.name}</div>
              <div className="text-xs text-on-surface-variant">{preset.description}</div>
            </button>
          ))}
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

        {/* Beginner */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Beginner</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {GAME_MODE_LEVELS.beginner.map((mode) => {
              const isSelected = assignmentModes.includes(mode.id);
              return (
                <button
                  key={mode.id}
                  onClick={() => toggleGameMode(mode.id)}
                  className={`relative p-3 rounded-xl border-2 transition-all text-center ${
                    isSelected
                      ? 'border-transparent bg-gradient-to-br shadow-lg'
                      : 'border-outline-variant/20 bg-surface-container-lowest hover:border-outline-variant/40'
                  }`}
                  style={isSelected ? { backgroundImage: `linear-gradient(to bottom right, ${mode.color})` } : undefined}
                >
                  <div className={`text-2xl mb-1 ${isSelected ? 'text-white' : 'text-on-surface'}`}>{mode.emoji}</div>
                  <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-on-surface-variant'}`}>{mode.name}</div>
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white/30 flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Intermediate */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-violet-500"></div>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Intermediate</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {GAME_MODE_LEVELS.intermediate.map((mode) => {
              const isSelected = assignmentModes.includes(mode.id);
              return (
                <button
                  key={mode.id}
                  onClick={() => toggleGameMode(mode.id)}
                  className={`relative p-3 rounded-xl border-2 transition-all text-center ${
                    isSelected
                      ? 'border-transparent bg-gradient-to-br shadow-lg'
                      : 'border-outline-variant/20 bg-surface-container-lowest hover:border-outline-variant/40'
                  }`}
                  style={isSelected ? { backgroundImage: `linear-gradient(to bottom right, ${mode.color})` } : undefined}
                >
                  <div className={`text-2xl mb-1 ${isSelected ? 'text-white' : 'text-on-surface'}`}>{mode.emoji}</div>
                  <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-on-surface-variant'}`}>{mode.name}</div>
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white/30 flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Advanced */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Advanced</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {GAME_MODE_LEVELS.advanced.map((mode) => {
              const isSelected = assignmentModes.includes(mode.id);
              return (
                <button
                  key={mode.id}
                  onClick={() => toggleGameMode(mode.id)}
                  className={`relative p-3 rounded-xl border-2 transition-all text-center ${
                    isSelected
                      ? 'border-transparent bg-gradient-to-br shadow-lg'
                      : 'border-outline-variant/20 bg-surface-container-lowest hover:border-outline-variant/40'
                  }`}
                  style={isSelected ? { backgroundImage: `linear-gradient(to bottom right, ${mode.color})` } : undefined}
                >
                  <div className={`text-2xl mb-1 ${isSelected ? 'text-white' : 'text-on-surface'}`}>{mode.emoji}</div>
                  <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-on-surface-variant'}`}>{mode.name}</div>
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white/30 flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mastery */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">Mastery</span>
          </div>
          <div>
            {GAME_MODE_LEVELS.mastery.map((mode) => {
              const isSelected = assignmentModes.includes(mode.id);
              return (
                <button
                  key={mode.id}
                  onClick={() => toggleGameMode(mode.id)}
                  className={`w-full relative p-4 rounded-xl border-2 transition-all text-center ${
                    isSelected
                      ? 'border-transparent bg-gradient-to-br shadow-lg'
                      : 'border-outline-variant/20 bg-surface-container-lowest hover:border-outline-variant/40'
                  }`}
                  style={isSelected ? { backgroundImage: `linear-gradient(to bottom right, ${mode.color})` } : undefined}
                >
                  <div className={`text-2xl mb-1 ${isSelected ? 'text-white' : 'text-on-surface'}`}>{mode.emoji}</div>
                  <div className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-on-surface-variant'}`}>{mode.name}</div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/30 flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Schedule (Optional) */}
      <div className="space-y-3">
        <label className="block text-sm font-bold text-on-surface">
          Schedule (optional)
        </label>
        <div>
          <label className="block text-xs text-on-surface-variant mb-1">Deadline</label>
          <input
            type="date"
            value={assignmentDeadline}
            onChange={(e) => setAssignmentDeadline(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full p-3 rounded-xl border-2 border-outline-variant/30 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none bg-surface-container-lowest text-on-surface transition-all"
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
          onClick={() => setStep(2)}
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
    </div>
  );
};
