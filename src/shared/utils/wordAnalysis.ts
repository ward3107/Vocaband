/**
 * Word Analysis Utilities
 * Shared between CreateAssignmentWizard and Quick Play
 * for parsing pasted text, extracting words, filtering, and deduplication
 */

import type { Word } from '../types';

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

export interface WordMatch {
  word: Word;
  matchType: 'exact' | 'starts-with';
  frequency: number;
}

export interface PastedTerm {
  term: string;
  frequency: number;
  isStopWord: boolean;
}

export interface WordAnalysisResult {
  matchedWords: WordMatch[];
  unmatchedTerms: PastedTerm[];
  stats: {
    totalTerms: number;
    uniqueTerms: number;
    matchedCount: number;
    unmatchedCount: number;
    stopWordCount: number;
    duplicateCount: number;
  };
}

export interface ExtractedWord {
  word: string;
  frequency: number;
  isStopWord: boolean;
}

// ============================================================================
// PROSE EXTRACTION
// ============================================================================

/**
 * Extract individual words from prose/sentences
 * Removes punctuation and splits by spaces
 */
export function extractWordsFromProse(text: string): ExtractedWord[] {
  if (!text.trim()) return [];

  // Convert to lowercase
  const lowerText = text.toLowerCase();

  // Replace punctuation with spaces, keep only letters and apostrophes
  const cleanText = lowerText
    .replace(/[^\w\s']/g, ' ')  // Replace non-word/non-space with space
    .replace(/\s+/g, ' ')       // Collapse multiple spaces
    .trim();

  // Split by space
  const words = cleanText.split(' ').filter(w => w.length > 0);

  // Count frequency and identify stop words
  const wordMap = new Map<string, ExtractedWord>();

  words.forEach(word => {
    const count = wordMap.get(word);
    const isStop = STOP_WORDS.has(word);

    if (count) {
      wordMap.set(word, {
        word,
        frequency: count.frequency + 1,
        isStopWord: isStop,
      });
    } else {
      wordMap.set(word, {
        word,
        frequency: 1,
        isStopWord: isStop,
      });
    }
  });

  return Array.from(wordMap.values());
}

// ============================================================================
// PASTE ANALYSIS (Main Entry Point)
// ============================================================================

/**
 * Analyze pasted text and extract words
 * Handles both lists (comma/newline) and prose (sentences)
 */
export function analyzePastedText(
  text: string,
  allWords: Word[]
): WordAnalysisResult {
  // Filter out any undefined/null words from the input
  // Also verify words have required properties to prevent runtime errors
  const validWords = allWords.filter(w =>
    w != null &&
    w.id != null &&
    w.english != null &&
    typeof w.english === 'string'
  );

  if (!text.trim()) {
    return {
      matchedWords: [],
      unmatchedTerms: [],
      stats: {
        totalTerms: 0,
        uniqueTerms: 0,
        matchedCount: 0,
        unmatchedCount: 0,
        stopWordCount: 0,
        duplicateCount: 0,
      },
    };
  }

  // Extract quote-wrapped phrases first
  const quoteRegex = /(["'])(?:(?=(\\1?))\2.)*?\1/g;
  const quotedPhrases: string[] = [];
  const quoteMatches = text.matchAll(quoteRegex);

  for (const match of quoteMatches) {
    quotedPhrases.push(match[0].replace(/['"]/g, '').trim().toLowerCase());
  }

  // Remove quoted phrases from remaining text
  let remainingText = text.replace(/(["'])(?:(?=(\\1?))\2.)*?\1/g, '');

  // Split remaining text by delimiters AND spaces
  // This ensures "apple banana orange" (no commas) becomes 3 separate words
  const splitTerms = remainingText
    .split(/[,\n;\t ]+/)
    .map(term => term.trim().toLowerCase())
    .filter(term => term.length > 0);

  // Count frequency for split terms
  const termMap = new Map<string, ExtractedWord>();
  splitTerms.forEach(term => {
    const count = termMap.get(term);
    const isStop = STOP_WORDS.has(term);

    if (count) {
      termMap.set(term, {
        word: term,
        frequency: count.frequency + 1,
        isStopWord: isStop,
      });
    } else {
      termMap.set(term, {
        word: term,
        frequency: 1,
        isStopWord: isStop,
      });
    }
  });

  let extractedTerms = Array.from(termMap.values());

  // Add quoted phrases as separate terms
  quotedPhrases.forEach(phrase => {
    const existing = extractedTerms.find(t => t.word === phrase);
    if (existing) {
      existing.frequency++;
    } else {
      extractedTerms.push({
        word: phrase,
        frequency: 1,
        isStopWord: false,
      });
    }
  });

  // Filter out stop words
  const contentTerms = extractedTerms.filter(t => !t.isStopWord);

  // Match against database
  const matchedWords: WordMatch[] = [];
  const unmatchedTerms: PastedTerm[] = [];
  const matchedWordIds = new Set<number>();

  contentTerms.forEach(term => {
    // Find ALL matches (both exact and starts-with)
    const exactMatches = validWords.filter(w => w.english.toLowerCase() === term.word);
    const startsWithMatches = validWords.filter(w =>
      w.english.toLowerCase().startsWith(term.word) &&
      !exactMatches.some(m => m.id === w.id)
    );

    // Combine ALL matches (no limit)
    const allMatches = [...exactMatches, ...startsWithMatches];

    // Deduplicate by ID
    const uniqueMatches = allMatches.filter(w => !matchedWordIds.has(w.id));
    uniqueMatches.forEach(w => matchedWordIds.add(w.id));

    if (uniqueMatches.length > 0) {
      uniqueMatches.forEach(w => {
        matchedWords.push({
          word: w,
          matchType: w.english.toLowerCase() === term.word ? 'exact' : 'starts-with',
          frequency: term.frequency,
        });
      });
    } else {
      unmatchedTerms.push({
        term: term.word,
        frequency: term.frequency,
        isStopWord: term.isStopWord,
      });
    }
  });

  // Calculate stats
  const totalTerms = extractedTerms.reduce((sum, t) => sum + t.frequency, 0);
  const uniqueTerms = extractedTerms.length;
  const matchedCount = matchedWords.reduce((sum, m) => sum + m.frequency, 0);
  const unmatchedCount = unmatchedTerms.reduce((sum, t) => sum + t.frequency, 0);
  const stopWordCount = extractedTerms.filter(t => t.isStopWord).reduce((sum, t) => sum + t.frequency, 0);
  const duplicateCount = totalTerms - uniqueTerms;

  return {
    matchedWords,
    unmatchedTerms,
    stats: {
      totalTerms,
      uniqueTerms,
      matchedCount,
      unmatchedCount,
      stopWordCount,
      duplicateCount,
    },
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get stop words list (for display/customization)
 */
export function getStopWords(): string[] {
  return Array.from(STOP_WORDS).sort();
}

/**
 * Add custom stop words
 */
export function addStopWords(words: string[]): void {
  words.forEach(word => STOP_WORDS.add(word.toLowerCase()));
}

/**
 * Remove stop words
 */
export function removeStopWords(words: string[]): void {
  words.forEach(word => STOP_WORDS.delete(word.toLowerCase()));
}

/**
 * Check if a word is a stop word
 */
export function isStopWord(word: string): boolean {
  return STOP_WORDS.has(word.toLowerCase());
}
