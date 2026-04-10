/**
 * Game Debugging Utility
 *
 * Provides comprehensive logging for the game flow to diagnose issues with:
 * - Game initialization
 * - Sound/pronunciation
 * - Button clicks
 * - Auto-skip functionality
 */

type GameState = {
  view: string;
  gameMode: string;
  showModeSelection: boolean;
  showModeIntro: boolean;
  currentIndex: number;
  isFinished: boolean;
  feedback: string | null;
  isProcessing: boolean;
  currentWord?: { id: number; english: string };
};

class GameDebugger {
  private enabled = false; // Disabled in production — set to true for local debugging
  private sessionId: string;
  private startTime: number;

  constructor() {
    const arr = new Uint8Array(5);
    crypto.getRandomValues(arr);
    const rand = Array.from(arr, b => b.toString(36)).join('').slice(0, 7);
    this.sessionId = `debug-${Date.now()}-${rand}`;
    this.startTime = Date.now();
    this.log('GameDebugger initialized', { sessionId: this.sessionId });
  }

  private getElapsedTime(): string {
    return `${((Date.now() - this.startTime) / 1000).toFixed(2)}s`;
  }

  private log(category: string, data: any, level: 'info' | 'warn' | 'error' = 'info') {
    if (!this.enabled) return;

    const prefix = `[GAME_DEBUG ${this.getElapsedTime()}] [${category}]`;
    const message = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

    switch (level) {
      case 'error':
        console.error(prefix, message);
        break;
      case 'warn':
        console.warn(prefix, message);
        break;
      default:
        console.log(prefix, message);
    }
  }

  // Track complete game state
  logState(state: GameState, context?: string) {
    this.log('STATE', {
      context: context || 'current',
      ...state,
      timestamp: Date.now(),
    });
  }

  // Track game initialization
  logGameInit(data: { wordsCount: number; modesCount: number; userId?: string }) {
    this.log('GAME_INIT', data);
  }

  // Track mode selection
  logModeSelect(data: { mode: string; from: string }) {
    this.log('MODE_SELECT', data);
  }

  // Track mode intro completion (Let's Go button)
  logModeIntroComplete(data: { mode: string }) {
    this.log('MODE_INTRO_COMPLETE', data);
  }

  // Track word changes
  logWordChange(data: { fromIndex: number; toIndex: number; word?: { id: number; english: string } }) {
    this.log('WORD_CHANGE', data);
  }

  // Track pronunciation attempts
  logPronunciation(data: { wordId: number; word: string; method: 'audio' | 'tts'; success: boolean }) {
    this.log('PRONUNCIATION', data);
  }

  // Track button clicks
  logButtonClick(data: { button: string; gameMode: string; wordId: number; disabled?: boolean; feedback?: string | null }) {
    this.log('BUTTON_CLICK', data);
  }

  // Track answer handling
  logAnswer(data: {
    gameMode: string;
    wordId: number;
    userAnswer: any;
    correctAnswer: any;
    isCorrect: boolean;
    willAutoSkip: boolean;
  }) {
    this.log('ANSWER', data);
  }

  // Track auto-skip events
  logAutoSkip(data: { triggered: boolean; delay: number; reason: string }) {
    this.log('AUTO_SKIP', data);
  }

  // Track feedback state changes
  logFeedback(data: { from: string | null; to: string | null; reason: string }) {
    this.log('FEEDBACK', data);
  }

  // Track processing state changes
  logProcessing(data: { isProcessing: boolean; reason: string }) {
    this.log('PROCESSING', data);
  }

  // Track errors
  logError(data: { error: string; context?: string; details?: any }) {
    this.log('ERROR', data, 'error');
  }

  // Track audio issues
  logAudioIssue(data: { issue: string; wordId?: number; fallbackUsed?: boolean }) {
    this.log('AUDIO_ISSUE', data, 'warn');
  }

  // Enable/disable debugging
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.log('CONFIG', { enabled: this.enabled });
  }

  // Get diagnostic summary
  getSummary(): string {
    return `Game Debug Session ${this.sessionId} - Duration: ${this.getElapsedTime()}`;
  }
}

// Global singleton instance
let debuggerInstance: GameDebugger | null = null;

export const getGameDebugger = () => {
  if (!debuggerInstance) {
    debuggerInstance = new GameDebugger();
  }
  return debuggerInstance;
};

export { GameDebugger };
