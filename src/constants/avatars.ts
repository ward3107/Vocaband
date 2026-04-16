// Shared avatar categories used by the student login avatar picker and the
// shop view's "Avatar Collections" section.
//
// Collections are ordered from free/default on top down to premium — the
// shop's XP-unlock ladder (see AVATAR_CATEGORY_UNLOCKS in constants/game.ts)
// keeps each subsequent pack tied to an XP threshold so students always
// have something new to aim for.
export const AVATAR_CATEGORIES = {
  Animals: ["🦊", "🦁", "🐯", "🐨", "🐼", "🐸", "🐵", "🦄", "🐻", "🐰", "🦋", "🐙", "🦜", "🐶", "🐱", "🦈", "🐬", "🦅", "🐝", "🦉"],
  Faces: ["😎", "🤓", "🥳", "😊", "🤩", "🥹", "😜", "🤗", "🥰", "😇", "🧐", "🤠", "😈", "🤡", "👻", "🤖", "👽", "💀"],
  // New 2026 packs — picked from the global + Israeli teen zeitgeist.
  GamerSquad: ["🎮", "🕹️", "👾", "🎯", "🎲", "🧩", "💻", "⌨️", "🖥️", "🎧", "🪩", "🏁"],
  FootballStars: ["⚽", "🏆", "🥇", "🥈", "🥉", "🏅", "🎽", "👟", "🥅", "🏟️", "📣", "🔥"],
  SpaceLegends: ["🚀", "🛸", "👽", "🪐", "🌌", "☄️", "🌠", "🛰️", "👨‍🚀", "👩‍🚀", "🌑", "🌕"],
  JurassicMode: ["🦕", "🦖", "🐉", "🐊", "🐍", "🦎", "🥚", "🌋", "🐚", "🏺"],
  LabRats: ["🧪", "🔬", "🧬", "⚗️", "🧫", "🔭", "🧲", "💊", "🩻", "🛠️", "💡", "🧠"],
  CreatorPack: ["🎨", "🎬", "📸", "🎤", "📺", "✏️", "🖌️", "🎭", "📹", "📀", "🎞️", "🪄"],
  WarriorPack: ["🥋", "🥷", "⚔️", "🛡️", "🏹", "🗡️", "⚜️", "🎌", "🐅", "🔱", "🏯"],
  SnackAttack: ["🍕", "🍔", "🍟", "🌭", "🍿", "🧁", "🥨", "🍦", "🍩", "🍪", "🎂", "🍰", "🍉", "🍇", "🥑", "🌮", "🍣", "🍜", "🧋", "🍫"],
  Fantasy: ["🧙", "🧛", "🧜", "🧚", "🦸", "🦹", "🧝", "👸", "🤴", "🥷", "🦖", "🐉", "🧞", "🧟", "🎃"],
  Sports: ["⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸", "🥊", "⛳", "🏊", "🚴", "🏄"],
  Food: ["🍕", "🍔", "🍟", "🌭", "🍿", "🧁", "🥨", "🍦", "🍩", "🍪", "🎂", "🍰", "🍉", "🍇", "🥑"],
  Objects: ["🎸", "🎹", "🎺", "🎷", "🪕", "🎻", "🎤", "🎧", "📷", "🎮", "🕹️", "💎", "🎨", "🔮", "🏆"],
  Vehicles: ["🚗", "🚕", "🏎️", "🚓", "🚑", "🚒", "✈️", "🚀", "🛶", "🚲", "🛸", "🚁", "🚂", "⛵", "🛵"],
  Nature: ["🌸", "🌺", "🌻", "🌷", "🌹", "🍀", "🌲", "🌳", "🌵", "🌴", "🍄", "🌾", "🌈", "❄️", "🌊"],
  Space: ["🚀", "🛸", "🌙", "⭐", "🌟", "💫", "✨", "☄️", "🪐", "🌍", "🔥", "💧", "🌕", "🌑", "🌌"],
} as const;

export type AvatarCategory = keyof typeof AVATAR_CATEGORIES;

// Smaller curated avatar set used by the Quick Play join screen (guest students).
export const QUICK_PLAY_AVATARS = ['🦊', '🐸', '🦁', '🐼', '🐨', '🦋', '🐙', '🦄', '🐳', '🐰', '🦈', '🐯', '🦉', '🐺', '🦜', '🐹'] as const;
