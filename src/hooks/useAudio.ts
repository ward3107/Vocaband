// Audio hook for playing word pronunciation (motivational sounds removed)
import { Howl } from 'howler'

const MAX_WORD_CACHE_SIZE = 100
const wordCache: Record<number, Howl> = {}
const wordCacheOrder: number[] = [] // LRU tracking
const motivationalCache: Record<string, Howl> = {}
const failedWordIds = new Set<number>() // Track words that failed to load

// Motivational sounds removed - these are now no-ops
let currentMotivational: Howl | null = null
const onMotivationalEndListeners: Array<() => void> = []

// ── Voice Selection for High-Quality TTS ──────────────────────────────────────
// Cache the selected voice so the same voice is used consistently
let cachedVoice: SpeechSynthesisVoice | null = null

const getHighQualityEnglishVoice = (): SpeechSynthesisVoice | null => {
  if (cachedVoice) return cachedVoice;

  if (!('speechSynthesis' in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // Prefer high-quality voices in order: Google US English, Samantha, Natural, Neural
  const picked =
    voices.find(v => v.name.includes('Google US English') && v.lang === 'en-US') ||
    voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google'))) ||
    voices.find(v => v.lang.startsWith('en') && (v.name.includes('Samantha'))) ||
    voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural'))) ||
    voices.find(v => v.lang.startsWith('en') && (v.name.includes('Neural'))) ||
    voices.find(v => v.lang === 'en-US') ||
    voices.find(v => v.lang.startsWith('en'));

  if (picked) cachedVoice = picked;
  return picked ?? null;
};

// Initialize voice listener - voices load asynchronously in some browsers
if ('speechSynthesis' in window) {
  const onVoicesChanged = () => {
    cachedVoice = null;
    getHighQualityEnglishVoice();
  };
  window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
  // Initial voice loading
  getHighQualityEnglishVoice();
}

// Speak text using high-quality TTS voice with enhanced pronunciation
const speakWithTTS = (text: string): void => {
  if (!('speechSynthesis' in window)) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  let speakText = text;

  // Clean up the text for better pronunciation if enabled
  if (ttsSettings.cleanText) {
    speakText = text
      // Remove "(n)", "(v)", "(adj)" grammatical markers - pronounce naturally
      .replace(/\s*\([nva]\)\s*/gi, ' ')
      // Remove extra parentheses content that might confuse TTS
      .replace(/\s*\([^)]*?\)\s*/g, ' ')
      // Remove leading quotes
      .replace(/^['"]+|['"]+$/g, '')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  const voice = getHighQualityEnglishVoice();

  // Speak the whole phrase smoothly (no word-by-word pauses)
  const utterance = new SpeechSynthesisUtterance(speakText);
  utterance.lang = 'en-US';
  utterance.rate = ttsSettings.rate;  // Slower rate (0.7) makes it clear naturally
  utterance.pitch = ttsSettings.pitch;
  utterance.volume = ttsSettings.volume;
  if (voice) utterance.voice = voice;

  window.speechSynthesis.speak(utterance);
};

const getAudioUrl = (wordId: number): string => {
  const base = import.meta.env.VITE_SUPABASE_URL
  return `${base}/storage/v1/object/public/sound/${wordId}.mp3`
}

const getMotivationalUrl = (key: string): string => {
  // Use Cloudflare CDN for motivational audio (better caching)
  const cloudflareUrl = import.meta.env.VITE_CLOUDFRONT_URL || import.meta.env.VITE_CLOUDFLARE_URL
  if (cloudflareUrl) {
    return `${cloudflareUrl}/motivational/${key}.mp3`
  }
  // Fallback to Supabase if Cloudflare URL not configured
  const base = import.meta.env.VITE_SUPABASE_URL
  return `${base}/storage/v1/object/public/motivational/${key}.mp3`
}

// All motivational phrase keys (must match generated audio files).
// Keep in sync with MOTIVATIONAL_PHRASES in scripts/generate-motivational.ts.
const PHRASES = [
  "great-job","well-done","awesome","keep-it-up","nailed-it","brilliant",
  "youre-on-fire","fantastic","way-to-go","superstar","amazing","perfect",
  "excellent","outstanding","incredible","wonderful","spectacular","terrific",
  "superb","magnificent","you-got-it","thats-right","correct","spot-on",
  "exactly-right","you-rock","keep-going","dont-stop","youre-amazing",
  "good-thinking","nice-work","good-work","you-did-it","first-try","like-a-pro",
  "you-are-a-champion","unstoppable","on-point","crushing-it","legend","genius",
  "word-master","vocab-hero","language-champion","english-star","you-smashed-it",
  "top-of-the-class","gold-star","hat-trick","level-up","new-high-score","on-a-roll",
  "keep-the-streak","nothing-can-stop-you","youre-growing","brain-power",
  "sharp-as-a-tack","quick-learner","smart-cookie","you-inspire-me",
  "proud-of-you","you-should-be-proud","hard-work-pays-off","practice-makes-perfect",
  "every-word-counts","building-your-future","knowledge-is-power",
  "youre-becoming-fluent","english-unlocked","new-word-learned","vocabulary-growing",
  "one-step-closer","making-progress","moving-forward","never-give-up",
  "believe-in-yourself","you-can-do-it","sky-is-the-limit","dream-big",
  "full-marks","ten-out-of-ten","hundred-percent","flawless","impeccable",
  "immaculate","marvelous","exceptional","elite","top-tier","first-class",
  "above-and-beyond","blowing-my-mind","impressed","wow","unbelievable",
  "speechless","mic-drop","that-was-beautiful","pure-talent"
]

let preloadedMotivational = false

const pick = () => PHRASES[Math.floor(Math.random() * PHRASES.length)]

// Human-readable label for each phrase key (used for on-screen text)
const PHRASE_LABELS: Record<string, string> = {
  "great-job": "Great Job! 🎉",
  "well-done": "Well Done! 👏",
  "awesome": "Awesome! 🌟",
  "keep-it-up": "Keep It Up! 💪",
  "nailed-it": "Nailed It! 🎯",
  "brilliant": "Brilliant! ✨",
  "youre-on-fire": "You're On Fire! 🔥",
  "fantastic": "Fantastic! 🎊",
  "way-to-go": "Way To Go! 🚀",
  "superstar": "Superstar! ⭐",
  "amazing": "Amazing! 💫",
  "perfect": "Perfect! 💯",
  "excellent": "Excellent! 🏆",
  "outstanding": "Outstanding! 🌈",
  "incredible": "Incredible! 🎭",
  "wonderful": "Wonderful! 🦋",
  "spectacular": "Spectacular! 🎪",
  "terrific": "Terrific! 🎨",
  "superb": "Superb! 🎵",
  "magnificent": "Magnificent! 👑",
  "you-got-it": "You Got It! ✅",
  "thats-right": "That's Right! 🎯",
  "correct": "Correct! ✔️",
  "spot-on": "Spot On! 📍",
  "exactly-right": "Exactly Right! 💎",
  "you-rock": "You Rock! 🎸",
  "keep-going": "Keep Going! 🏃",
  "dont-stop": "Don't Stop! 🚀",
  "youre-amazing": "You're Amazing! 💖",
  "good-thinking": "Good Thinking! 🧠",
  "nice-work": "Nice Work! 👍",
  "good-work": "Good Work! 🙌",
  "you-did-it": "You Did It! 🎊",
  "first-try": "First Try! 🥇",
  "like-a-pro": "Like A Pro! 🎓",
  "you-are-a-champion": "Champion! 🏅",
  "unstoppable": "Unstoppable! ⚡",
  "on-point": "On Point! 🎯",
  "crushing-it": "Crushing It! 💥",
  "legend": "Legend! 🦸",
  "genius": "Genius! 🧪",
  "word-master": "Word Master! 📚",
  "vocab-hero": "Vocab Hero! 🦸‍♂️",
  "language-champion": "Language Champion! 🏆",
  "english-star": "English Star! ⭐",
  "you-smashed-it": "You Smashed It! 💥",
  "top-of-the-class": "Top of the Class! 📖",
  "gold-star": "Gold Star! ⭐",
  "level-up": "Level Up! 🎮",
  "new-high-score": "New High Score! 🏆",
  "on-a-roll": "On A Roll! 🎲",
  "nothing-can-stop-you": "Nothing Can Stop You! 🚀",
  "brain-power": "Brain Power! 🧠",
  "quick-learner": "Quick Learner! ⚡",
  "smart-cookie": "Smart Cookie! 🍪",
  "proud-of-you": "Proud Of You! 💖",
  "hard-work-pays-off": "Hard Work Pays Off! 💪",
  "knowledge-is-power": "Knowledge Is Power! 📚",
  "english-unlocked": "English Unlocked! 🔓",
  "new-word-learned": "New Word Learned! 📝",
  "one-step-closer": "One Step Closer! 🎯",
  "making-progress": "Making Progress! 📈",
  "never-give-up": "Never Give Up! 💪",
  "you-can-do-it": "You Can Do It! 🌟",
  "full-marks": "Full Marks! 💯",
  "ten-out-of-ten": "10/10! 🔟",
  "flawless": "Flawless! 💎",
  "exceptional": "Exceptional! 🌟",
  "elite": "Elite! 👑",
  "top-tier": "Top Tier! 🏆",
  "first-class": "First Class! 🥇",
  "wow": "Wow! 😮",
  "unbelievable": "Unbelievable! 🤯",
  "mic-drop": "Mic Drop! 🎤",
  "pure-talent": "Pure Talent! 🎨",
  // Added to match the full 99-phrase generator set.
  "hat-trick": "Hat Trick! 🎩",
  "keep-the-streak": "Keep the Streak! 🔥",
  "youre-growing": "You're Growing! 🌱",
  "sharp-as-a-tack": "Sharp as a Tack! 📌",
  "you-inspire-me": "You Inspire Me! ✨",
  "you-should-be-proud": "You Should Be Proud! 🏆",
  "practice-makes-perfect": "Practice Makes Perfect! 💪",
  "every-word-counts": "Every Word Counts! 📖",
  "building-your-future": "Building Your Future! 🏗️",
  "youre-becoming-fluent": "You're Becoming Fluent! 🗣️",
  "vocabulary-growing": "Vocabulary Growing! 📚",
  "moving-forward": "Moving Forward! ➡️",
  "believe-in-yourself": "Believe in Yourself! 💫",
  "sky-is-the-limit": "The Sky's the Limit! ☁️",
  "dream-big": "Dream Big! 🌟",
  "hundred-percent": "100%! 💯",
  "impeccable": "Impeccable! 💎",
  "immaculate": "Immaculate! ✨",
  "marvelous": "Marvelous! 🌈",
  "above-and-beyond": "Above and Beyond! 🚀",
  "blowing-my-mind": "Blowing My Mind! 🤯",
  "impressed": "I'm Impressed! 😲",
  "speechless": "Speechless! 😶",
  "that-was-beautiful": "That Was Beautiful! 🌺",
};

// Global flag to force TTS for all words (for testing or if MP3 files have issues)
// Use a window property to ensure the toggle can access it
// Set to true to use TTS by default instead of MP3 files
if (typeof window !== 'undefined') {
  (window as any).__forceTTSMode = false;
}

let forceTTSMode = false;

export const setForceTTSMode = (force: boolean) => {
  forceTTSMode = force;
  if (typeof window !== 'undefined') {
    (window as any).__forceTTSMode = force;
  }
};

// Export getter to read current state
export const getForceTTSMode = () => forceTTSMode;

export const useAudio = () => {

  const preload = (wordId: number) => {
    // Guard against undefined wordId
    if (wordId === undefined || wordId === null) {
      return
    }

    // Skip preloading if this word failed before
    if (failedWordIds.has(wordId)) {
      return
    }

    if (!wordCache[wordId]) {
      // Evict oldest entry if cache is full
      if (wordCacheOrder.length >= MAX_WORD_CACHE_SIZE) {
        const evictId = wordCacheOrder.shift()!
        wordCache[evictId]?.unload()
        delete wordCache[evictId]
      }
      wordCache[wordId] = new Howl({
        src: [getAudioUrl(wordId)],
        preload: true,
        onloaderror: () => {
          console.warn(`Audio load failed for wordId ${wordId}`)
          failedWordIds.add(wordId)
          // Clean up the failed cache entry
          delete wordCache[wordId]
          const idx = wordCacheOrder.indexOf(wordId)
          if (idx > -1) {
            wordCacheOrder.splice(idx, 1)
          }
        },
        onplayerror: () => {
          console.warn(`Audio playback failed for wordId ${wordId}`)
          failedWordIds.add(wordId)
        }
      })
      wordCacheOrder.push(wordId)
    }
  }

  const speak = (wordId: number, fallbackText?: string) => {
    // Guard against undefined wordId
    if (wordId === undefined || wordId === null) {
      console.warn('speak() called with undefined wordId')
      return
    }

    // Check both the local variable and window object (for console commands)
    const currentForceTTSMode = forceTTSMode || (typeof window !== 'undefined' && (window as any).__forceTTSMode);

    // Debug: Show current TTS mode state
    // Force TTS mode - use text-to-speech for all words
    if (currentForceTTSMode) {
      if (fallbackText) {
        speakWithTTS(fallbackText)
      }
      return
    }

    // Motivational sounds removed - skip waiting logic
    // Stop any currently playing audio first
    Object.values(wordCache).forEach(h => h.stop())
    window.speechSynthesis?.cancel()

    // If this word failed to load before, use TTS immediately
    if (failedWordIds.has(wordId)) {
      if (fallbackText) {
        speakWithTTS(fallbackText)
      }
      return
    }

    // Custom words (negative IDs or large positive ones from Date.now()) used
    // to fall straight to browser TTS. Now they have real MP3s at sound/{id}.mp3
    // generated by /api/tts/custom-words. If the file doesn't exist yet (race
    // with the teacher's generation call), the onloaderror handler will add
    // this id to failedWordIds and future calls use TTS fallback automatically.
    preload(wordId)

    // Play immediately if already loaded, otherwise wait for load
    const sound = wordCache[wordId]
    if (!sound) {
      // Should not happen, but fallback to TTS just in case
      console.warn(`[Audio] No sound found for wordId ${wordId}, using TTS fallback:`, fallbackText)
      if (fallbackText) {
        speakWithTTS(fallbackText)
      }
      return
    }

    // Remove old event handlers before adding new ones (prevents duplicates)
    sound.off('playerror')
    sound.off('play')
    sound.off('loaderror')

    // Add error handler for playback failures - fall back to TTS
    const handleAudioError = () => {
      console.warn(`[Audio] Playback failed for wordId ${wordId}, using TTS fallback:`, fallbackText)
      if (fallbackText) {
        speakWithTTS(fallbackText)
      }
    }

    // Log successful audio playback for debugging (MP3 files don't use TTS voices)
    const handleAudioPlay = () => {
    }

    sound.on('playerror', handleAudioError)
    sound.on('play', handleAudioPlay)
    // If the MP3 404s (common for freshly-created custom words whose audio the
    // backend is still generating), play browser TTS immediately so the student
    // isn't left with silence on their first tap.
    sound.on('loaderror', handleAudioError)

    if (sound.state() === 'loaded') {
      sound.play()
    } else {
      sound.once('load', () => sound.play())
      sound.load()
    }
  }

  const preloadMany = (wordIds: number[]) => {
    wordIds.filter(id => id > 0).forEach(preload)
  }

  // Preload motivational phrases - NO-OP (feature removed)
  const preloadMotivational = () => {
    // Motivational sounds removed - do nothing
  }

  // Play motivational sound - NO-OP (feature removed)
  const playMotivational = (): string => {
    // Motivational sounds removed - return empty key
    return ''
  }

  const getMotivationalLabel = (key: string): string => {
    return PHRASE_LABELS[key] || key.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
  }

  const playWrong = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'square'
      osc.frequency.setValueAtTime(200, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.2)
      setTimeout(() => ctx.close(), 300)
    } catch { /* silent fail on unsupported browsers */ }
  }

  const stopAll = () => {
    Object.values(wordCache).forEach(h => h.stop())
    Object.values(motivationalCache).forEach(h => h.stop())
    window.speechSynthesis?.cancel()
  }

  return { speak, preloadMany, preloadMotivational, playMotivational, getMotivationalLabel, playWrong, stopAll, setForceTTSMode }
}

// ── TTS Settings (adjustable via console) ───────────────────────────────────
let ttsSettings = {
  rate: 0.7,           // Slower for clarity (0.5 = very slow, 1.0 = normal)
  pitch: 1.0,          // Pitch (0 to 2, 1 = normal)
  volume: 1.0,         // Volume (0 to 1)
  cleanText: true,     // Remove grammatical markers like (n), (v)
};

// Add to window for easy console access during development/debugging
if (typeof window !== 'undefined') {
  // Store the state on window object for cross-module access
  (window as any).__forceTTSMode = false;
  (window as any).__ttsSettings = ttsSettings;

  (window as any).togglePronunciationMode = () => {
    const newValue = !(window as any).__forceTTSMode;
    (window as any).__forceTTSMode = newValue;
    forceTTSMode = newValue;
    return newValue;
  };

  (window as any).forceTTS = () => {
    (window as any).__forceTTSMode = true;
    forceTTSMode = true;
  };

  (window as any).useMP3 = () => {
    (window as any).__forceTTSMode = false;
    forceTTSMode = false;
  };

  // TTS Settings controls
  (window as any).ttsSettings = (newSettings?: Partial<typeof ttsSettings>) => {
    if (newSettings) {
      Object.assign(ttsSettings, newSettings);
    } else {
    }
    return ttsSettings;
  };

  // Convenience functions for common settings
  (window as any).ttsSlow = () => ttsSettings({ rate: 0.5 });
  (window as any).ttsNormal = () => ttsSettings({ rate: 0.7 });
  (window as any).ttsFast = () => ttsSettings({ rate: 1.0 });
  (window as any).ttsDeep = () => ttsSettings({ pitch: 0.85 });
  (window as any).ttsHigh = () => ttsSettings({ pitch: 1.15 });

  // TTS debug commands available via browser console:
  // forceTTS(), useMP3(), togglePronunciationMode(), ttsSlow(), ttsNormal(), ttsFast()
}
