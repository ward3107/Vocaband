import { STUDENT_ACCENTS, type StudentAccent } from "./constants";

interface StudentAvatarProps {
  emoji: string;
  accent?: StudentAccent;
  size?: number;
}

/**
 * Pastel-tinted avatar circle for a student. `accent` chooses the
 * background gradient — falls back to the warm-peach default.
 */
export default function StudentAvatar({ emoji, accent = "default", size = 44 }: StudentAvatarProps) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: STUDENT_ACCENTS[accent],
        fontSize: size * 0.5,
        lineHeight: 1,
      }}
    >
      <span>{emoji}</span>
    </div>
  );
}

/**
 * Larger rounded-square emoji tile used in the screen header — same
 * pastel accent system as StudentAvatar so the header harmonises
 * with the avatars below it.
 */
export function ClassTile({
  emoji,
  accent = "default",
  size = 56,
}: {
  emoji: string;
  accent?: StudentAccent;
  size?: number;
}) {
  return (
    <div
      className="grid shrink-0 place-items-center"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: STUDENT_ACCENTS[accent],
        fontSize: size * 0.5,
        lineHeight: 1,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.7), 0 6px 18px -8px rgba(60,40,120,0.18)",
      }}
    >
      <span>{emoji}</span>
    </div>
  );
}
