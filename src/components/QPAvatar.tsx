import {
  Crown, Star, Heart, Rocket, Bolt, Shield, Trophy, Sparkles,
  Flame, Sun, Moon, Cloud, Snowflake, Leaf, Anchor, Compass,
  Diamond, Gem, Key, Lock, Music, Headphones, Gamepad2, Dice5,
  Smile, Ghost, Bug, Bird, Cat, Dog,
  type LucideIcon,
} from "lucide-react";

// Map of lucide icon NAME (PascalCase, matches the lucide-react export
// name) -> component.  Drives the "Geometric" Quick Play avatar tab.
//
// When adding a new geometric avatar:
//   1. Add the lucide:<Name> string to QUICK_PLAY_AVATAR_GROUPS.Geometric
//      in src/constants/avatars.ts
//   2. Import the matching component above and add it to this map
//   3. Both lists must stay in sync — if a name is in the constants
//      but missing from this map, QPAvatar falls back to the Star
//      icon (visible debug tell).
const LUCIDE_AVATAR_MAP: Record<string, LucideIcon> = {
  Crown, Star, Heart, Rocket, Bolt, Shield, Trophy, Sparkles,
  Flame, Sun, Moon, Cloud, Snowflake, Leaf, Anchor, Compass,
  Diamond, Gem, Key, Lock, Music, Headphones, Gamepad2, Dice5,
  Smile, Ghost, Bug, Bird, Cat, Dog,
};

interface QPAvatarProps {
  /** Either an emoji ("🦊") or a lucide token ("lucide:Crown"). */
  value: string;
  /** Lucide-icon size in px when rendering vector.  Ignored for emoji. */
  iconSize?: number;
  /** Tailwind class for the surrounding span (controls emoji font-size,
   *  alignment, color of the lucide stroke via text-*). */
  className?: string;
}

/**
 * Renders a Quick Play avatar — emoji string or lucide-react icon.
 *
 * Discriminates on the "lucide:" prefix.  Everything else is treated as
 * raw text (emoji).  Lucide icons inherit the surrounding text color
 * via `currentColor` so callers can theme them with text-* classes.
 */
export default function QPAvatar({ value, iconSize = 24, className = "" }: QPAvatarProps) {
  if (value && value.startsWith("lucide:")) {
    const name = value.slice("lucide:".length);
    const Icon = LUCIDE_AVATAR_MAP[name] ?? Star;
    return (
      <span className={`inline-flex items-center justify-center ${className}`}>
        <Icon size={iconSize} strokeWidth={2.25} />
      </span>
    );
  }
  return <span className={className}>{value}</span>;
}
