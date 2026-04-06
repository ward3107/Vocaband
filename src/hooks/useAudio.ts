import { Howl } from 'howler'

const MAX_WORD_CACHE_SIZE = 100
const wordCache: Record<number, Howl> = {}
const wordCacheOrder: number[] = [] // LRU tracking
const motivationalCache: Record<string, Howl> = {}

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

// All motivational phrase keys (must match generated audio files)
const PHRASES = [
  "great-job","well-done","awesome","keep-it-up","nailed-it","brilliant",
  "youre-on-fire","fantastic","way-to-go","superstar","amazing","perfect",
  "excellent","outstanding","incredible","wonderful","spectacular","terrific",
  "superb","magnificent","you-got-it","thats-right","correct","spot-on",
  "exactly-right","you-rock","keep-going","dont-stop","youre-amazing",
  "good-thinking","nice-work","good-work","you-did-it","first-try","like-a-pro",
  "you-are-a-champion","unstoppable","on-point","crushing-it","legend","genius",
  "word-master","vocab-hero","language-champion","english-star","you-smashed-it",
  "top-of-the-class","gold-star","level-up","new-high-score","on-a-roll",
  "nothing-can-stop-you","brain-power","quick-learner","smart-cookie",
  "proud-of-you","hard-work-pays-off","knowledge-is-power","english-unlocked",
  "new-word-learned","one-step-closer","making-progress","never-give-up",
  "you-can-do-it","full-marks","ten-out-of-ten","flawless","exceptional",
  "elite","top-tier","first-class","wow","unbelievable","mic-drop","pure-talent"
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
};

export const useAudio = () => {

  const preload = (wordId: number) => {
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
        onloaderror: () => { console.warn(`Audio load failed for wordId ${wordId}`) }
      })
      wordCacheOrder.push(wordId)
    }
  }

  const speak = (wordId: number, fallbackText?: string) => {
    // Stop any currently playing audio first
    Object.values(wordCache).forEach(h => h.stop())
    window.speechSynthesis?.cancel()

    // Custom words (negative IDs) don't have audio files — use browser TTS
    if (wordId < 0) {
      if (fallbackText && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(fallbackText)
        utterance.lang = 'en-US'
        utterance.rate = 0.95
        window.speechSynthesis.speak(utterance)
      }
      return
    }

    preload(wordId)

    // Play immediately if already loaded, otherwise wait for load
    const sound = wordCache[wordId]
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

  // Preload a small batch of motivational phrases (avoids Audio pool exhaustion)
  const preloadMotivational = () => {
    if (preloadedMotivational) return
    preloadedMotivational = true

    // Preload only a random subset to avoid creating 72 Howl instances at once
    const batch = [...PHRASES].sort(() => Math.random() - 0.5).slice(0, 8)
    batch.forEach(key => {
      if (!motivationalCache[key]) {
        motivationalCache[key] = new Howl({
          src: [getMotivationalUrl(key)],
          preload: true,
          volume: 0.8,
          onloaderror: () => { console.warn('Motivational audio load failed') }
        })
      }
    })
  }

  const playMotivational = (): string => {
    // Stop any currently playing motivational audio
    Object.values(motivationalCache).forEach(h => h.stop())

    const key = pick()

    // Create if doesn't exist (fallback)
    if (!motivationalCache[key]) {
      motivationalCache[key] = new Howl({
        src: [getMotivationalUrl(key)],
        preload: true,
        volume: 0.8,
        onloaderror: () => { console.warn('Motivational audio load failed') }
      })
    }

    const sound = motivationalCache[key]

    // Play immediately if loaded, otherwise wait
    if (sound.state() === 'loaded') {
      sound.play()
    } else {
      sound.once('load', () => sound.play())
      sound.load()
    }

    return key
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

  return { speak, preloadMany, preloadMotivational, playMotivational, getMotivationalLabel, playWrong, stopAll }
}
