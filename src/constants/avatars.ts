// Shared avatar categories used by the student login avatar picker and the
// shop view's "Avatar Collections" section.
export const AVATAR_CATEGORIES = {
  Animals: ["🦊", "🦁", "🐯", "🐨", "🐼", "🐸", "🐵", "🦄", "🐻", "🐰", "🦋", "🐙", "🦜", "🐶", "🐱", "🦈", "🐬", "🦅", "🐝", "🦉"],
  Faces: ["😎", "🤓", "🥳", "😊", "🤩", "🥹", "😜", "🤗", "🥰", "😇", "🧐", "🤠", "😈", "🤡", "👻", "🤖", "👽", "💀"],
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
