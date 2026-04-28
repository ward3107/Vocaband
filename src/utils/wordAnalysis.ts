/**
 * Word Analysis Utilities
 * Shared between CreateAssignmentWizard and Quick Play
 * for parsing pasted text, extracting words, filtering, and deduplication
 *
 * Enhanced with: Hebrew/Arabic matching, fuzzy matching, word family
 * expansion, smart phrase detection, and confidence scoring.
 */

import type { Word } from '../data/vocabulary';
import {
  normalizeText,
  levenshteinDistance,
  isFuzzyMatch,
  extractRootWord,
} from '../data/vocabulary-matching';

// ============================================================================
// STOP WORDS (common words to filter out)
// ============================================================================
const STOP_WORDS = new Set([
  // Articles
  'a', 'an', 'the',
  // Prepositions
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'down',
  // Pronouns
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'this', 'that', 'these', 'those',
  // Conjunctions
  'and', 'but', 'or', 'so', 'yet',
  // Auxiliary verbs
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must',
  // Common adverbs
  'not', 'now', 'then', 'there', 'here', 'when', 'where', 'why', 'how',
  // Other common words
  'as', 'if', 'than', 'too', 'very', 'more', 'some', 'such', 'own', 'same',
  'just', 'also', 'well', 'only', 'very', 'even', 'back', 'after', 'before',
  // Numbers
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'first', 'second', 'third', 'next', 'last',
]);

// ============================================================================
// TYPES
// ============================================================================

export type MatchType = 'exact' | 'starts-with' | 'fuzzy' | 'family' | 'hebrew' | 'arabic' | 'phrase';

export interface WordMatch {
  word: Word;
  matchType: MatchType;
  frequency: number;
  confidence: number;       // 0.0-1.0 confidence score
  matchField: 'english' | 'hebrew' | 'arabic';
  originalTerm: string;     // the pasted term that matched
}

export interface PastedTerm {
  term: string;
  frequency: number;
  isStopWord: boolean;
}

export interface WordFamilySuggestion {
  rootWord: string;
  familyMembers: Word[];
  alreadyIncluded: number[];  // IDs already in matchedWords
}

export interface WordAnalysisResult {
  matchedWords: WordMatch[];
  unmatchedTerms: PastedTerm[];
  wordFamilySuggestions: WordFamilySuggestion[];
  stats: {
    totalTerms: number;
    uniqueTerms: number;
    matchedCount: number;
    unmatchedCount: number;
    stopWordCount: number;
    duplicateCount: number;
    fuzzyMatchCount: number;
    hebrewMatchCount: number;
    arabicMatchCount: number;
    familyMatchCount: number;
    phraseMatchCount: number;
  };
}

export interface ExtractedWord {
  word: string;
  frequency: number;
  isStopWord: boolean;
}

// ============================================================================
// HEBREW / ARABIC DETECTION
// ============================================================================

function isHebrew(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text);
}

function isArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

// ============================================================================
// SMART PHRASE DETECTION
// ============================================================================

/**
 * Build a set of known multi-word phrases from the vocabulary database.
 * Used to auto-detect phrases like "post office" or "fall in love" from
 * consecutive pasted words without needing quotes.
 */
function buildPhraseIndex(words: Word[]): Map<string, Word> {
  const index = new Map<string, Word>();
  for (const w of words) {
    const lower = w.english.toLowerCase();
    if (lower.includes(' ')) {
      index.set(lower, w);
    }
  }
  return index;
}

/**
 * Detect multi-word phrases from an array of tokens by checking against
 * known vocabulary phrases. Greedy longest-match-first approach.
 */
function detectPhrases(
  tokens: string[],
  phraseIndex: Map<string, Word>
): { phrases: { phrase: string; word: Word }[]; remaining: string[] } {
  const phrases: { phrase: string; word: Word }[] = [];
  const used = new Set<number>();

  // Try longest phrases first (up to 5 words)
  for (let len = 5; len >= 2; len--) {
    for (let i = 0; i <= tokens.length - len; i++) {
      if (used.has(i)) continue;
      const candidate = tokens.slice(i, i + len).join(' ');
      const match = phraseIndex.get(candidate);
      if (match) {
        phrases.push({ phrase: candidate, word: match });
        for (let j = i; j < i + len; j++) used.add(j);
      }
    }
  }

  const remaining = tokens.filter((_, i) => !used.has(i));
  return { phrases, remaining };
}

// ============================================================================
// PROSE EXTRACTION
// ============================================================================

export function extractWordsFromProse(text: string): ExtractedWord[] {
  if (!text.trim()) return [];
  const lowerText = text.toLowerCase();
  const cleanText = lowerText
    .replace(/[^\w\s'\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleanText.split(' ').filter(w => w.length > 0);
  const wordMap = new Map<string, ExtractedWord>();
  words.forEach(word => {
    const count = wordMap.get(word);
    const isStop = STOP_WORDS.has(word);
    if (count) {
      wordMap.set(word, { word, frequency: count.frequency + 1, isStopWord: isStop });
    } else {
      wordMap.set(word, { word, frequency: 1, isStopWord: isStop });
    }
  });
  return Array.from(wordMap.values());
}

// ============================================================================
// PASTE ANALYSIS (Main Entry Point)
// ============================================================================

/**
 * Analyze pasted text and extract words with enhanced matching:
 * - Hebrew/Arabic paste support (auto-detected)
 * - Fuzzy matching for typos (Levenshtein distance)
 * - Word family suggestions
 * - Smart multi-word phrase detection
 * - Confidence scoring per match
 */
export function analyzePastedText(
  text: string,
  allWords: Word[]
): WordAnalysisResult {
  const validWords = allWords.filter(w =>
    w != null && w.id != null && w.english != null && typeof w.english === 'string'
  );

  const emptyResult: WordAnalysisResult = {
    matchedWords: [],
    unmatchedTerms: [],
    wordFamilySuggestions: [],
    stats: {
      totalTerms: 0, uniqueTerms: 0, matchedCount: 0, unmatchedCount: 0,
      stopWordCount: 0, duplicateCount: 0, fuzzyMatchCount: 0,
      hebrewMatchCount: 0, arabicMatchCount: 0, familyMatchCount: 0, phraseMatchCount: 0,
    },
  };

  if (!text.trim()) return emptyResult;

  // ── Step 1: Extract quoted phrases ──────────────────────────────────────
  const quoteRegex = /(["'])(?:(?=(\\1?))\2.)*?\1/g;
  const quotedPhrases: string[] = [];
  for (const match of text.matchAll(quoteRegex)) {
    quotedPhrases.push(match[0].replace(/['"]/g, '').trim().toLowerCase());
  }
  let remainingText = text.replace(/(["'])(?:(?=(\\1?))\2.)*?\1/g, '');

  // ── Step 2: Split by delimiters ─────────────────────────────────────────
  // For Hebrew/Arabic text, don't split on spaces (phrases are space-separated)
  const isRTL = isHebrew(remainingText) || isArabic(remainingText);
  const delimiter = isRTL ? /[,\n;\t]+/ : /[,\n;\t ]+/;
  const splitTerms = remainingText
    .split(delimiter)
    .map(term => term.trim().toLowerCase())
    .filter(term => term.length > 0);

  // ── Step 3: Smart phrase detection ──────────────────────────────────────
  const phraseIndex = buildPhraseIndex(validWords);
  const { phrases: detectedPhrases, remaining: singleTokens } = isRTL
    ? { phrases: [], remaining: splitTerms }  // Skip phrase detection for RTL (already split by commas)
    : detectPhrases(splitTerms, phraseIndex);

  // ── Step 4: Count frequencies ───────────────────────────────────────────
  const termMap = new Map<string, ExtractedWord>();
  const addTerm = (word: string) => {
    const isStop = STOP_WORDS.has(word) && !isRTL;
    const existing = termMap.get(word);
    if (existing) {
      existing.frequency++;
    } else {
      termMap.set(word, { word, frequency: 1, isStopWord: isStop });
    }
  };

  singleTokens.forEach(addTerm);
  quotedPhrases.forEach(addTerm);
  // Don't add detected phrases to termMap — they're handled separately

  const extractedTerms = Array.from(termMap.values());
  // Don't filter "stop words" out of teacher-pasted vocab lists.  The
  // STOP_WORDS list was originally for prose analysis (extract content
  // words from a paragraph) but it includes basic ESL vocab that
  // teachers DO want to teach: 'one, two, three', 'before, after',
  // 'next, last', 'why, how, where', 'very, too, more', etc.  When a
  // teacher pastes 12 words and 4 of them are these "stop words", the
  // analyzer dropped them silently and only 8 reached the lesson.
  // Matching downstream already filters out anything not in the
  // curriculum, so harmless terms stay harmless and real vocab gets
  // matched.  Keep the isStopWord flag on the term for diagnostics
  // but don't use it as a filter.
  const contentTerms = extractedTerms;

  // ── Step 5: Multi-tier matching ─────────────────────────────────────────
  const matchedWords: WordMatch[] = [];
  const unmatchedTerms: PastedTerm[] = [];
  const matchedWordIds = new Set<number>();

  // 5a. Add phrase matches first (highest priority)
  for (const { phrase, word } of detectedPhrases) {
    if (!matchedWordIds.has(word.id)) {
      matchedWords.push({
        word,
        matchType: 'phrase',
        frequency: 1,
        confidence: 0.95,
        matchField: 'english',
        originalTerm: phrase,
      });
      matchedWordIds.add(word.id);
    }
  }

  // 5b. Match each content term
  contentTerms.forEach(term => {
    const normalizedTerm = normalizeText(term.word);

    // Tier 1: Exact English match
    const exactMatches = validWords.filter(w =>
      normalizeText(w.english) === normalizedTerm && !matchedWordIds.has(w.id)
    );
    if (exactMatches.length > 0) {
      exactMatches.forEach(w => {
        matchedWords.push({ word: w, matchType: 'exact', frequency: term.frequency, confidence: 1.0, matchField: 'english', originalTerm: term.word });
        matchedWordIds.add(w.id);
      });
      return;
    }

    // Tier 2: Hebrew exact match
    if (isHebrew(term.word)) {
      const hebrewMatches = validWords.filter(w =>
        w.hebrew && normalizeText(w.hebrew) === normalizedTerm && !matchedWordIds.has(w.id)
      );
      if (hebrewMatches.length > 0) {
        hebrewMatches.forEach(w => {
          matchedWords.push({ word: w, matchType: 'hebrew', frequency: term.frequency, confidence: 1.0, matchField: 'hebrew', originalTerm: term.word });
          matchedWordIds.add(w.id);
        });
        return;
      }
    }

    // Tier 3: Arabic exact match
    if (isArabic(term.word)) {
      const arabicMatches = validWords.filter(w =>
        w.arabic && normalizeText(w.arabic) === normalizedTerm && !matchedWordIds.has(w.id)
      );
      if (arabicMatches.length > 0) {
        arabicMatches.forEach(w => {
          matchedWords.push({ word: w, matchType: 'arabic', frequency: term.frequency, confidence: 1.0, matchField: 'arabic', originalTerm: term.word });
          matchedWordIds.add(w.id);
        });
        return;
      }
    }

    // Tier 4: Starts-with English match
    const startsWithMatches = validWords.filter(w =>
      normalizeText(w.english).startsWith(normalizedTerm) &&
      normalizedTerm.length >= 3 &&
      !matchedWordIds.has(w.id)
    ).slice(0, 5); // Limit starts-with to 5 to avoid noise
    if (startsWithMatches.length > 0) {
      startsWithMatches.forEach(w => {
        matchedWords.push({ word: w, matchType: 'starts-with', frequency: term.frequency, confidence: 0.8, matchField: 'english', originalTerm: term.word });
        matchedWordIds.add(w.id);
      });
      return;
    }

    // Tier 5: Fuzzy match (English only, min 4 chars to avoid false positives)
    if (normalizedTerm.length >= 4) {
      const fuzzyMatch = validWords.find(w =>
        !matchedWordIds.has(w.id) &&
        isFuzzyMatch(normalizedTerm, normalizeText(w.english), 0.25)
      );
      if (fuzzyMatch) {
        matchedWords.push({ word: fuzzyMatch, matchType: 'fuzzy', frequency: term.frequency, confidence: 0.6, matchField: 'english', originalTerm: term.word });
        matchedWordIds.add(fuzzyMatch.id);
        return;
      }
    }

    // Tier 6: Word family match (English only, min 4 chars)
    if (normalizedTerm.length >= 4 && !isRTL) {
      const root = extractRootWord(normalizedTerm);
      if (root.length > 2) {
        const familyMatch = validWords.find(w =>
          !matchedWordIds.has(w.id) && extractRootWord(normalizeText(w.english)) === root
        );
        if (familyMatch) {
          matchedWords.push({ word: familyMatch, matchType: 'family', frequency: term.frequency, confidence: 0.5, matchField: 'english', originalTerm: term.word });
          matchedWordIds.add(familyMatch.id);
          return;
        }
      }
    }

    // No match found
    unmatchedTerms.push({ term: term.word, frequency: term.frequency, isStopWord: term.isStopWord });
  });

  // ── Step 6: Word family suggestions ─────────────────────────────────────
  // For each matched word, check if there are related words not yet included
  const wordFamilySuggestions: WordFamilySuggestion[] = [];
  const suggestedFamilyRoots = new Set<string>();

  matchedWords.forEach(m => {
    if (m.matchField !== 'english') return;
    const root = extractRootWord(normalizeText(m.word.english));
    if (root.length <= 2 || suggestedFamilyRoots.has(root)) return;

    const familyMembers = validWords.filter(w => {
      if (matchedWordIds.has(w.id)) return false;
      return extractRootWord(normalizeText(w.english)) === root;
    });

    if (familyMembers.length > 0 && familyMembers.length <= 5) {
      suggestedFamilyRoots.add(root);
      wordFamilySuggestions.push({
        rootWord: root,
        familyMembers,
        alreadyIncluded: matchedWords.filter(mm => extractRootWord(normalizeText(mm.word.english)) === root).map(mm => mm.word.id),
      });
    }
  });

  // ── Step 7: Calculate stats ─────────────────────────────────────────────
  const totalTerms = extractedTerms.reduce((sum, t) => sum + t.frequency, 0) + detectedPhrases.length;
  const uniqueTerms = extractedTerms.length + detectedPhrases.length;
  const stopWordCount = extractedTerms.filter(t => t.isStopWord).reduce((sum, t) => sum + t.frequency, 0);

  return {
    matchedWords,
    unmatchedTerms,
    wordFamilySuggestions,
    stats: {
      totalTerms,
      uniqueTerms,
      matchedCount: matchedWords.length,
      unmatchedCount: unmatchedTerms.length,
      stopWordCount,
      duplicateCount: totalTerms - uniqueTerms,
      fuzzyMatchCount: matchedWords.filter(m => m.matchType === 'fuzzy').length,
      hebrewMatchCount: matchedWords.filter(m => m.matchType === 'hebrew').length,
      arabicMatchCount: matchedWords.filter(m => m.matchType === 'arabic').length,
      familyMatchCount: matchedWords.filter(m => m.matchType === 'family').length,
      phraseMatchCount: matchedWords.filter(m => m.matchType === 'phrase').length,
    },
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

export function getStopWords(): string[] {
  return Array.from(STOP_WORDS).sort();
}

export function addStopWords(words: string[]): void {
  words.forEach(word => STOP_WORDS.add(word.toLowerCase()));
}

export function removeStopWords(words: string[]): void {
  words.forEach(word => STOP_WORDS.delete(word.toLowerCase()));
}

export function isStopWord(word: string): boolean {
  return STOP_WORDS.has(word.toLowerCase());
}
