import { Howl } from 'howler'

const wordCache: Record<number, Howl> = {}
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

export const useAudio = () => {

  const preload = (wordId: number) => {
    if (!wordCache[wordId]) {
      wordCache[wordId] = new Howl({
        src: [getAudioUrl(wordId)],
        preload: true,
        onloaderror: () => {}
      })
    }
  }

  const speak = (wordId: number) => {
    // Stop any currently playing audio first
    Object.values(wordCache).forEach(h => h.stop())
    window.speechSynthesis?.cancel()

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
    wordIds.forEach(preload)
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
          onloaderror: () => {}
        })
      }
    })
  }

  const playMotivational = () => {
    // Stop any currently playing motivational audio
    Object.values(motivationalCache).forEach(h => h.stop())

    const key = pick()

    // Create if doesn't exist (fallback)
    if (!motivationalCache[key]) {
      motivationalCache[key] = new Howl({
        src: [getMotivationalUrl(key)],
        preload: true,
        volume: 0.8,
        onloaderror: () => {}
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
  }

  const stopAll = () => {
    Object.values(wordCache).forEach(h => h.stop())
    Object.values(motivationalCache).forEach(h => h.stop())
    window.speechSynthesis?.cancel()
  }

  return { speak, preloadMany, preloadMotivational, playMotivational, stopAll }
}
