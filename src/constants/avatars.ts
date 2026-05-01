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
// Kept as a flat-array export for legacy callers; the picker now uses
// QUICK_PLAY_AVATAR_GROUPS below for the tabbed UI.
export const QUICK_PLAY_AVATARS = ['🦊', '🐸', '🦁', '🐼', '🐨', '🦋', '🐙', '🦄', '🐳', '🐰', '🦈', '🐯', '🦉', '🐺', '🦜', '🐹'] as const;

// Quick Play avatar pool grouped by theme.  Bigger pool + tabbed UI
// = more identity choice for the kid AND less collision when 30+
// students join the same session.
//
// The "Geometric" tab uses lucide-react icon NAMES (string literals
// matching exports from lucide-react) prefixed with "lucide:" so the
// QPAvatar render helper can discriminate from emoji at render time.
// Keeps the data model a plain string (compatible with everything
// already storing the avatar in localStorage / progress rows /
// socket payloads) but unlocks vector icons for kids who'd rather
// not pick a cartoon emoji.
export const QUICK_PLAY_AVATAR_GROUPS: Record<string, readonly string[]> = {
  Animals: [
    "🦊", "🐸", "🦁", "🐼", "🐨", "🐵", "🦄", "🐻", "🐰", "🦋",
    "🐙", "🦜", "🐶", "🐱", "🦈", "🐬", "🦅", "🐝", "🦉", "🐯",
    "🐳", "🐺", "🐹", "🦒", "🦘", "🦔", "🐢", "🦦", "🦩", "🐧",
  ],
  Faces: [
    "😎", "🤓", "🥳", "😊", "🤩", "🥹", "😜", "🤗", "🥰", "😇",
    "🧐", "🤠", "😈", "🤡", "👻", "🤖", "👽", "💀", "🥷", "🧙",
    "🦸", "🦹", "🧚", "🎃", "👸", "🤴", "🧞", "🧟", "🧜", "🧝",
  ],
  Food: [
    "🍕", "🍔", "🍟", "🌭", "🍿", "🧁", "🥨", "🍦", "🍩", "🍪",
    "🎂", "🍰", "🍉", "🍇", "🥑", "🌮", "🍣", "🍜", "🧋", "🍫",
    "🍎", "🍌", "🍓", "🍊", "🥝", "🍍", "🥥", "🌽", "🥕", "🍒",
  ],
  Sports: [
    "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸",
    "🥊", "⛳", "🏊", "🚴", "🏄", "🏆", "🥇", "🥈", "🥉", "🏅",
    "🎯", "⛸️", "🎽", "🥋", "🤸", "🏹", "🎳", "🛹", "⛷️", "🏇",
  ],
  Space: [
    "🚀", "🛸", "🌙", "⭐", "🌟", "💫", "✨", "☄️", "🪐", "🌍",
    "🌑", "🌕", "🌌", "🛰️", "👨‍🚀", "👩‍🚀", "🌠", "🌎", "🌏", "👽",
    "🌞", "🌚", "🪨", "🔭", "🌃", "🌉", "🌅", "🌄", "🌇", "🌆",
  ],
  Vehicles: [
    "🚗", "🚕", "🏎️", "🚓", "🚑", "🚒", "✈️", "🛶", "🚲", "🛵",
    "🚌", "🚎", "🚐", "🚜", "🏍️", "🚔", "🚖", "🚙", "🚚", "🚛",
    "🚞", "🚟", "🚠", "🛻", "🚝", "🚄", "🚅", "🚆", "🚇", "🚈",
  ],
  // Geometric / vector tab.  Each entry is "lucide:<IconName>" where
  // IconName is the exact PascalCase export from lucide-react.  Add
  // a new icon here AND in the LUCIDE_AVATAR_MAP in QPAvatar.tsx in
  // the same commit.
  Geometric: [
    "lucide:Crown", "lucide:Star", "lucide:Heart", "lucide:Rocket",
    "lucide:Bolt", "lucide:Shield", "lucide:Trophy", "lucide:Sparkles",
    "lucide:Flame", "lucide:Sun", "lucide:Moon", "lucide:Cloud",
    "lucide:Snowflake", "lucide:Leaf", "lucide:Anchor", "lucide:Compass",
    "lucide:Diamond", "lucide:Gem", "lucide:Key", "lucide:Lock",
    "lucide:Music", "lucide:Headphones", "lucide:Gamepad2", "lucide:Dice5",
    "lucide:Smile", "lucide:Ghost", "lucide:Bug", "lucide:Bird",
    "lucide:Cat", "lucide:Dog",
  ],
} as const;

export type QuickPlayAvatarGroup = keyof typeof QUICK_PLAY_AVATAR_GROUPS;
