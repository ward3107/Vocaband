import { Howl } from 'howler'

const cache: Record<number, Howl> = {}

const getAudioUrl = (wordId: number): string => {
  const base = import.meta.env.VITE_SUPABASE_URL
  return `${base}/storage/v1/object/public/sound/${wordId}.mp3`
}

export const useAudio = () => {

  const preload = (wordId: number) => {
    if (!cache[wordId]) {
      cache[wordId] = new Howl({
        src: [getAudioUrl(wordId)],
        preload: true,
        html5: true
      })
    }
  }

  const speak = (wordId: number) => {
    preload(wordId)
    cache[wordId].play()
  }

  const preloadMany = (wordIds: number[]) => {
    wordIds.forEach(preload)
  }

  return { speak, preloadMany }
}