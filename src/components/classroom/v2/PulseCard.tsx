import { PULSE_AVATAR_LIMIT, PULSE_STYLES } from "./constants";
import type { ClassroomStudent, PulseBucket } from "./types";

interface PulseCardProps {
  bucket: PulseBucket;
  /** Headline glyph (✓ / ! / ◐). */
  glyph: string;
  count: number;
  label: string;
  desc: string;
  /** Roster surfaced as small avatars. Only the first
   *  PULSE_AVATAR_LIMIT are shown; extras collapse to "+N". */
  students?: ClassroomStudent[];
  /** Hide the roster strip — used on mobile. */
  hideRoster?: boolean;
  onClick?: () => void;
}

/**
 * One of the three triage cards (On track / Needs attention / Not playing).
 * Click target is the whole card — call `onClick` to drill into the
 * filtered roster view.
 */
export default function PulseCard({
  bucket,
  glyph,
  count,
  label,
  desc,
  students = [],
  hideRoster = false,
  onClick,
}: PulseCardProps) {
  const style = PULSE_STYLES[bucket];
  const visible = students.slice(0, PULSE_AVATAR_LIMIT);
  const extra = students.length - visible.length;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        background: style.background,
        boxShadow: style.glow,
      }}
      className="relative flex min-h-[130px] flex-col overflow-hidden rounded-[24px] border-0 px-[20px] sm:px-[22px] py-5 text-start text-white"
    >
      <div className="flex items-center gap-3">
        <div
          className="grid place-items-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: "rgba(255,255,255,0.22)",
            border: "1px solid rgba(255,255,255,0.28)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            fontSize: 18,
          }}
        >
          {glyph}
        </div>
        <div className="text-[36px] sm:text-[42px] font-black leading-none tracking-[-0.03em]">
          {count}
        </div>
      </div>

      <div className="mt-auto pt-3">
        <div className="text-[15px] font-bold leading-tight tracking-[-0.01em]">
          {label}
        </div>
        <div className="mt-0.5 text-[12px] opacity-85">{desc}</div>
      </div>

      {!hideRoster && students.length > 0 && (
        <div className="mt-1.5 flex">
          {visible.map((s, i) => (
            <span
              key={s.id}
              className="grid h-6 w-6 place-items-center rounded-full bg-white/70 text-[12px]"
              style={{
                marginInlineStart: i === 0 ? 0 : -6,
                border: "1.5px solid rgba(255,255,255,0.5)",
              }}
              aria-label={s.name ?? s.id}
            >
              {s.emoji}
            </span>
          ))}
          {extra > 0 && (
            <span
              className="grid h-6 min-w-6 place-items-center rounded-full bg-white/70 px-1.5 text-[10px] font-extrabold text-[#4A3B7A]"
              style={{
                marginInlineStart: -6,
                border: "1.5px solid rgba(255,255,255,0.5)",
              }}
            >
              +{extra}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
