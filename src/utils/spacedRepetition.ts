/**
 * Spaced Repetition System for Vocaband
 *
 * Tracks per-word accuracy per class using SM-2 algorithm
 * Provides worst-performing word suggestions for teachers
 */

// ========================================
// TYPES
// ========================================

export interface SpacedRepetitionData {
  version: "1.0";
  lastUpdated: string;
  classPerformance: Record<string, ClassPerformance>;
  studentHistory: Record<string, StudentHistory>;
}

export interface ClassPerformance {
  classId: string;
  className: string;
  totalSessions: number;
  wordStats: Record<number, WordStats>;
  lastUpdated: string;
}

export interface WordStats {
  wordId: number;
  attempts: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  easeFactor: number;
  interval: number;
  nextReview: string;
  lastReviewed: string;
  streak: number;
  longestStreak: number;
  recentAttempts: Attempt[];
}

export interface Attempt {
  timestamp: string;
  correct: boolean;
  mode: string;
  studentId?: string;
  timeTaken?: number;
}

export interface StudentHistory {
  studentId: string;
  studentName: string;
  classId: string;
  attempts: Attempt[];
  wordSummary: Record<number, {
    attempts: number;
    correct: number;
    accuracy: number;
    lastAttempt: string;
  }>;
}

export interface GameResult {
  wordId: number;
  correct: boolean;
  mode: string;
  studentId?: string;
  timeTaken?: number;
}

export interface WordSuggestion {
  wordId: number;
  accuracy: number;
  attempts: number;
  priority: number;
}

// ========================================
// CONSTANTS
// ========================================

const STORAGE_KEY = 'vocaband_spaced_repetition';
const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const MAX_RECENT_ATTEMPTS = 10;

// ========================================
// STORAGE HELPERS
// ========================================

export function loadSpacedRepetitionData(): SpacedRepetitionData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyData();
    const data = JSON.parse(raw) as SpacedRepetitionData;
    if (data.version !== "1.0") {
      console.warn('[SpacedRep] Version mismatch, resetting');
      return createEmptyData();
    }
    return data;
  } catch (e) {
    console.error('[SpacedRep] Load error:', e);
    return createEmptyData();
  }
}

function saveSpacedRepetitionData(data: SpacedRepetitionData): void {
  try {
    data.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('[SpacedRep] Save error:', e);
  }
}

function createEmptyData(): SpacedRepetitionData {
  return {
    version: "1.0",
    lastUpdated: new Date().toISOString(),
    classPerformance: {},
    studentHistory: {},
  };
}

// ========================================
// UPDATE FUNCTIONS
// ========================================

/**
 * Update spaced repetition data after a game session
 */
export function updateFromGameResults(
  classId: string,
  className: string,
  results: GameResult[]
): void {
  const data = loadSpacedRepetitionData();

  if (!data.classPerformance[classId]) {
    data.classPerformance[classId] = {
      classId,
      className,
      totalSessions: 0,
      wordStats: {},
      lastUpdated: new Date().toISOString(),
    };
  }

  const classPerf = data.classPerformance[classId];
  classPerf.totalSessions += 1;

  for (const result of results) {
    updateWordStats(classPerf, result);
  }

  classPerf.lastUpdated = new Date().toISOString();
  saveSpacedRepetitionData(data);
}

function updateWordStats(classPerf: ClassPerformance, result: GameResult): void {
  const { wordId, correct, mode, studentId, timeTaken } = result;

  if (!classPerf.wordStats[wordId]) {
    classPerf.wordStats[wordId] = createInitialWordStats(wordId);
  }

  const stats = classPerf.wordStats[wordId];

  stats.attempts++;
  if (correct) {
    stats.correct++;
    stats.streak++;
    stats.longestStreak = Math.max(stats.longestStreak, stats.streak);
  } else {
    stats.incorrect++;
    stats.streak = 0;
  }

  stats.accuracy = stats.correct / stats.attempts;
  stats.lastReviewed = new Date().toISOString();

  stats.recentAttempts.push({
    timestamp: new Date().toISOString(),
    correct,
    mode,
    studentId,
    timeTaken,
  });

  if (stats.recentAttempts.length > MAX_RECENT_ATTEMPTS) {
    stats.recentAttempts.shift();
  }

  updateSRSMetrics(stats, correct);
}

function createInitialWordStats(wordId: number): WordStats {
  const now = new Date().toISOString();
  return {
    wordId,
    attempts: 0,
    correct: 0,
    incorrect: 0,
    accuracy: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    interval: 0,
    nextReview: now,
    lastReviewed: now,
    streak: 0,
    longestStreak: 0,
    recentAttempts: [],
  };
}

function updateSRSMetrics(stats: WordStats, correct: boolean): void {
  if (correct) {
    stats.interval = Math.max(1, Math.floor(stats.interval * stats.easeFactor));
    stats.easeFactor = Math.min(3.0, stats.easeFactor + 0.1);
  } else {
    stats.interval = 0;
    stats.easeFactor = Math.max(MIN_EASE_FACTOR, stats.easeFactor - 0.2);
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + stats.interval);
  stats.nextReview = nextDate.toISOString();
}

// ========================================
// QUERY FUNCTIONS
// ========================================

/**
 * Get worst-performing words for a class
 */
export function getWorstPerformingWords(
  classId: string,
  wordIds: number[],
  limit: number = 10
): WordSuggestion[] {
  const data = loadSpacedRepetitionData();
  const classPerf = data.classPerformance[classId];

  if (!classPerf) return [];

  return Object.values(classPerf.wordStats)
    .filter(ws => wordIds.includes(ws.wordId))
    .map(ws => ({
      wordId: ws.wordId,
      accuracy: ws.accuracy,
      attempts: ws.attempts,
      priority: calculatePriority(ws),
    }))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, limit);
}

/**
 * Get words that need review (due for spaced repetition)
 */
export function getWordsNeedingReview(
  classId: string,
  wordIds: number[],
  limit: number = 20
): number[] {
  const data = loadSpacedRepetitionData();
  const classPerf = data.classPerformance[classId];

  if (!classPerf) return [];

  const wordsWithStats = wordIds
    .map(id => ({ id, stats: classPerf.wordStats[id] }))
    .filter(w => w.stats !== undefined);

  return wordsWithStats
    .sort((a, b) => calculatePriority(a.stats) - calculatePriority(b.stats))
    .slice(0, limit)
    .map(w => w.id);
}

/**
 * Get performance summary for a word in a class
 */
export function getWordPerformance(classId: string, wordId: number): WordStats | null {
  const data = loadSpacedRepetitionData();
  const classPerf = data.classPerformance[classId];

  if (!classPerf) return null;
  return classPerf.wordStats[wordId] || null;
}

/**
 * Calculate review priority (lower = higher priority)
 */
function calculatePriority(stats: WordStats): number {
  const now = new Date();
  const nextReview = new Date(stats.nextReview);
  const daysUntilReview = (nextReview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  let priority = 0;

  // Overdue words get highest priority
  if (daysUntilReview < 0) {
    priority -= 1000 + Math.abs(daysUntilReview) * 100;
  }

  // Low accuracy gets priority
  priority += (1 - stats.accuracy) * 500;

  // Low ease factor gets priority
  priority += (3 - stats.easeFactor) * 200;

  // Fewer attempts gets priority (learn new words first)
  priority += Math.max(0, 50 - stats.attempts) * 10;

  return priority;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Clear all spaced repetition data (for testing/debugging)
 */
export function clearSpacedRepetitionData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('[SpacedRep] Clear error:', e);
  }
}

/**
 * Export spaced repetition data (for backup/analysis)
 */
export function exportSpacedRepetitionData(): string {
  const data = loadSpacedRepetitionData();
  return JSON.stringify(data, null, 2);
}

/**
 * Get class performance summary
 */
export function getClassPerformanceSummary(classId: string): {
  totalWords: number;
  totalAttempts: number;
  averageAccuracy: number;
  wordsNeedingReview: number;
} | null {
  const data = loadSpacedRepetitionData();
  const classPerf = data.classPerformance[classId];

  if (!classPerf) return null;

  const wordStatsArray = Object.values(classPerf.wordStats);
  const now = new Date();

  return {
    totalWords: wordStatsArray.length,
    totalAttempts: wordStatsArray.reduce((sum, ws) => sum + ws.attempts, 0),
    averageAccuracy: wordStatsArray.length > 0
      ? wordStatsArray.reduce((sum, ws) => sum + ws.accuracy, 0) / wordStatsArray.length
      : 0,
    wordsNeedingReview: wordStatsArray.filter(ws => new Date(ws.nextReview) <= now).length,
  };
}
