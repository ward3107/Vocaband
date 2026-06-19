// Single source of truth for the live-game background-music pool.
//
// Every track here is an instrumental loop living in public/game-music/ as
// bgm-<file>.mp3. Adding a new track to this array makes it appear in the
// shuffle pool of EVERY live game at once (Quick Play monitor + the shared
// DraggableMusicPlayer used by Speed Round, Hot Seat, Live Challenge, Wheel
// and Class Show) — there is no per-game list to keep in sync anymore.
export interface MusicTrack {
  name: string;
  icon: string;
  /** basename inside public/game-music/, without the .mp3 extension */
  file: string;
}

export const MUSIC_TRACKS: MusicTrack[] = [
  { name: 'Steady Focus', icon: '🎯', file: 'bgm-steady-focus' },
  { name: 'Upbeat Energy', icon: '⚡', file: 'bgm-upbeat-energy' },
  { name: 'Chill Vibes', icon: '🌊', file: 'bgm-chill-vibes' },
  { name: 'Adventure Quest', icon: '🗺️', file: 'bgm-adventure-quest' },
  { name: 'Funky Groove', icon: '🎸', file: 'bgm-funky-groove' },
  { name: 'Space Explorer', icon: '🚀', file: 'bgm-space-explorer' },
  { name: 'Victory March', icon: '🏆', file: 'bgm-victory-march' },
  { name: 'Steady Gains', icon: '📈', file: 'bgm-steady-gains' },
  { name: 'Clear The Lane', icon: '🏀', file: 'bgm-clear-the-lane' },
  { name: 'Watch It Ignite', icon: '🔥', file: 'bgm-watch-it-ignite' },
  { name: 'Victory Lap', icon: '🏁', file: 'bgm-victory-lap' },
  { name: 'Kinetic Lock', icon: '🔒', file: 'bgm-kinetic-lock' },
];

// Always serve from the same-origin /game-music/ path. The Cloudflare Worker
// serves these files directly — they are NOT in the R2/CDN buckets (sound/,
// sound-hebrew/, motivational/), so we deliberately bypass VITE_CLOUDFLARE_URL
// here to avoid 404s.
export const getMusicUrl = (file: string): string => `/game-music/${file}.mp3`;
