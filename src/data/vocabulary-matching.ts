// vocabulary-matching.ts
// Enhanced word matching with fuzzy search, multi-language support, and filtering

import type { Word } from './vocabulary';

// ============================================================================
// TEXT NORMALIZATION
// ============================================================================

/**
 * Normalize text for comparison - removes diacritics, extra spaces, etc.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Remove common punctuation
    .replace(/[.,!?;:'"(){}\[\]<>]/g, '')
    // Remove niqqud (Hebrew vowel points)
    .replace(/[\u05B0-\u05BD\u05C1\u05C2\u05C4\u05C5\u05C7]/g, '')
    // Remove Arabic diacritics (harakat)
    .replace(/[\u064B-\u065F\u0670]/g, '');
}

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Check if two strings are similar enough (fuzzy match)
 * @param str1 First string
 * @param str2 Second string
 * @param threshold Maximum allowed distance (0.3 = 30% difference)
 */
export function isFuzzyMatch(str1: string, str2: string, threshold: number = 0.3): boolean {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return true;

  const distance = levenshteinDistance(str1, str2);
  const ratio = distance / maxLen;

  return ratio <= threshold;
}

// ============================================================================
// WORD FAMILY DETECTION
// ============================================================================

/**
 * Common English suffixes for word family detection
 */
const WORD_SUFFIXES = [
  'ing', 'ed', 'er', 'est', 'ly', 'ness', 'ment', 'tion', 'sion',
  'ity', 'ance', 'ence', 'dom', 'ness', 'ship', 'ward', 'wise',
  'ful', 'less', 'able', 'ible', 'ive', 'ous', 'ent', 'ant',
  'ate', 'ize', 'ify', 'fy', 'ise', 'en', 'ise'
];

/**
 * Extract the root word by removing common suffixes
 */
export function extractRootWord(word: string): string {
  const lower = word.toLowerCase();

  for (const suffix of WORD_SUFFIXES) {
    if (lower.endsWith(suffix) && lower.length > suffix.length + 2) {
      return lower.slice(0, -suffix.length);
    }
  }

  return lower;
}

/**
 * Find word family members (words sharing the same root)
 */
export function findWordFamily(word: string, allWords: Word[]): Word[] {
  const root = extractRootWord(word);
  const family: Word[] = [];

  for (const w of allWords) {
    const wordRoot = extractRootWord(w.english);
    if (wordRoot === root && wordRoot.length > 2) {
      family.push(w);
    }
  }

  return family;
}

// ============================================================================
// MULTI-LANGUAGE SEARCH
// ============================================================================

export interface SearchMatch {
  word: Word;
  matchField: 'english' | 'hebrew' | 'arabic';
  matchType: 'exact' | 'partial' | 'fuzzy';
  confidence: number;
}

/**
 * Search for words across English, Hebrew, and Arabic
 */
export function searchWords(
  query: string,
  allWords: Word[],
  options: {
    fuzzy?: boolean;
    includeWordFamilies?: boolean;
    maxResults?: number;
  } = {}
): SearchMatch[] {
  const {
    fuzzy = true,
    includeWordFamilies = true,
    maxResults = 50
  } = options;

  const normalizedQuery = normalizeText(query);
  const matches: SearchMatch[] = [];

  for (const word of allWords) {
    let matchFound = false;

    // English search
    const normalizedEnglish = normalizeText(word.english);

    // Exact match
    if (normalizedEnglish === normalizedQuery) {
      matches.push({
        word,
        matchField: 'english',
        matchType: 'exact',
        confidence: 1.0
      });
      matchFound = true;
      continue;
    }

    // Partial match
    if (normalizedEnglish.includes(normalizedQuery) || normalizedQuery.includes(normalizedEnglish)) {
      matches.push({
        word,
        matchField: 'english',
        matchType: 'partial',
        confidence: 0.8
      });
      matchFound = true;
      continue;
    }

    // Hebrew search
    if (word.hebrew) {
      const normalizedHebrew = normalizeText(word.hebrew);
      if (normalizedHebrew.includes(normalizedQuery) || normalizedQuery.includes(normalizedHebrew)) {
        matches.push({
          word,
          matchField: 'hebrew',
          matchType: 'partial',
          confidence: 0.8
        });
        matchFound = true;
        continue;
      }
    }

    // Arabic search
    if (word.arabic) {
      const normalizedArabic = normalizeText(word.arabic);
      if (normalizedArabic.includes(normalizedQuery) || normalizedQuery.includes(normalizedArabic)) {
        matches.push({
          word,
          matchField: 'arabic',
          matchType: 'partial',
          confidence: 0.8
        });
        matchFound = true;
        continue;
      }
    }

    // Fuzzy match (English only, for typos)
    if (fuzzy && !matchFound) {
      if (isFuzzyMatch(normalizedQuery, normalizedEnglish, 0.3)) {
        matches.push({
          word,
          matchField: 'english',
          matchType: 'fuzzy',
          confidence: 0.6
        });
      }
    }
  }

  // Sort by confidence and limit results
  matches.sort((a, b) => b.confidence - a.confidence);

  // Word family expansion (if enabled)
  if (includeWordFamilies && matches.length > 0 && matches.length < maxResults) {
    const families = findWordFamily(query, allWords);
    for (const familyWord of families) {
      if (!matches.find(m => m.word.id === familyWord.id)) {
        matches.push({
          word: familyWord,
          matchField: 'english',
          matchType: 'partial',
          confidence: 0.5
        });
      }
    }
  }

  return matches.slice(0, maxResults);
}

// ============================================================================
// FILTERING
// ============================================================================

export interface WordFilters {
  core?: ('Core I' | 'Core II')[];
  level?: ('Set 1' | 'Set 2' | 'Set 3' | 'Custom')[];
  pos?: string[];
  recProd?: ('Rec' | 'Prod' | 'Rec/Prod')[];
  searchQuery?: string;
}

/**
 * Filter words by multiple criteria
 */
export function filterWords(allWords: Word[], filters: WordFilters): Word[] {
  let filtered = [...allWords];

  // Filter by Level (Set 1, Set 2, Set 3, Custom)
  if (filters.level && filters.level.length > 0) {
    filtered = filtered.filter(w => w.level && filters.level.includes(w.level));
  }

  // Filter by Core
  if (filters.core && filters.core.length > 0) {
    filtered = filtered.filter(w => w.core && filters.core.includes(w.core));
  }

  // Filter by Part of Speech
  if (filters.pos && filters.pos.length > 0) {
    filtered = filtered.filter(w => {
      if (!w.pos) return false;
      const wordPos = w.pos.split(/[,\s]/).map(p => p.trim());
      return filters.pos.some(p => wordPos.includes(p));
    });
  }

  // Filter by Rec/Prod
  if (filters.recProd && filters.recProd.length > 0) {
    filtered = filtered.filter(w => w.recProd && filters.recProd.includes(w.recProd));
  }

  // Search query (multi-language)
  if (filters.searchQuery) {
    const searchResults = searchWords(filters.searchQuery, filtered, {
      fuzzy: true,
      includeWordFamilies: false,
      maxResults: 1000
    });
    filtered = searchResults.map(m => m.word);
  }

  return filtered;
}

// ============================================================================
// SMART MATCHING FOR PASTE/OCR
// ============================================================================

export interface MatchResult {
  word: Word;
  matchType: 'exact' | 'partial' | 'fuzzy' | 'family';
  confidence: number;
}

/**
 * Enhanced matching for paste/OCR with fuzzy matching and word family detection
 */
export function findMatchesEnhanced(
  searchWords: string[],
  allWords: Word[],
  options: {
    enableFuzzy?: boolean;
    enableWordFamilies?: boolean;
    fuzzyThreshold?: number;
  } = {}
): { matched: MatchResult[]; unmatched: string[] } {
  const {
    enableFuzzy = true,
    enableWordFamilies = true,
    fuzzyThreshold = 0.3
  } = options;

  const matched: MatchResult[] = [];
  const unmatched: string[] = [];
  const processedWordIds = new Set<number>();

  for (const searchWord of searchWords) {
    const normalizedSearch = normalizeText(searchWord);
    let found = false;

    // First try: Exact match
    for (const word of allWords) {
      if (processedWordIds.has(word.id)) continue;

      const normalizedEnglish = normalizeText(word.english);

      if (normalizedEnglish === normalizedSearch) {
        matched.push({
          word,
          matchType: 'exact',
          confidence: 1.0
        });
        processedWordIds.add(word.id);
        found = true;
        break;
      }
    }

    if (found) continue;

    // Second try: Partial match
    for (const word of allWords) {
      if (processedWordIds.has(word.id)) continue;

      const normalizedEnglish = normalizeText(word.english);

      if (normalizedEnglish.includes(normalizedSearch) ||
          normalizedSearch.includes(normalizedEnglish)) {
        matched.push({
          word,
          matchType: 'partial',
          confidence: 0.8
        });
        processedWordIds.add(word.id);
        found = true;
        break;
      }
    }

    if (found) continue;

    // Third try: Hebrew/Arabic match
    for (const word of allWords) {
      if (processedWordIds.has(word.id)) continue;

      if (word.hebrew && normalizeText(word.hebrew) === normalizedSearch) {
        matched.push({
          word,
          matchType: 'exact',
          confidence: 1.0
        });
        processedWordIds.add(word.id);
        found = true;
        break;
      }

      if (word.arabic && normalizeText(word.arabic) === normalizedSearch) {
        matched.push({
          word,
          matchType: 'exact',
          confidence: 1.0
        });
        processedWordIds.add(word.id);
        found = true;
        break;
      }
    }

    if (found) continue;

    // Fourth try: Fuzzy match (for typos)
    if (enableFuzzy) {
      for (const word of allWords) {
        if (processedWordIds.has(word.id)) continue;

        const normalizedEnglish = normalizeText(word.english);

        if (isFuzzyMatch(normalizedSearch, normalizedEnglish, fuzzyThreshold)) {
          matched.push({
            word,
            matchType: 'fuzzy',
            confidence: 0.6
          });
          processedWordIds.add(word.id);
          found = true;
          break;
        }
      }
    }

    if (found) continue;

    // Fifth try: Word family match
    if (enableWordFamilies) {
      const root = extractRootWord(normalizedSearch);
      if (root.length > 2) {
        for (const word of allWords) {
          if (processedWordIds.has(word.id)) continue;

          const wordRoot = extractRootWord(word.english);
          if (wordRoot === root) {
            matched.push({
              word,
              matchType: 'family',
              confidence: 0.5
            });
            processedWordIds.add(word.id);
            found = true;
            break;
          }
        }
      }
    }

    if (!found) {
      unmatched.push(searchWord);
    }
  }

  return { matched, unmatched };
}
