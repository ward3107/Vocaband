/**
 * LobbyRoster — the "waiting room" centrepiece for the live games. While
 * the teacher waits for the class to join, this shows the joined students
 * as avatar medallions that POP in (and fade out if someone drops),
 * turning the dead pre-game moment into "watch the room fill up".
 *
 * Data-only and game-agnostic: callers pass the live roster from
 * useQuickPlaySocket (clientId/nickname/avatar) plus their own localized
 * count/empty strings and hue, so every live game can reuse it. No socket
 * or backend coupling — purely a presentation of data already on screen.
 */
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import QPAvatar from "../QPAvatar";
import type { GameTheme } from "../../constants/gameThemes";

export interface LobbyPlayer {
  clientId: string;
  nickname: string;
  avatar: string;
  /** Team mode: tints the medallion red/blue when present. */
  team?: "red" | "blue";
}

/** Per-team medallion gradient — used instead of `accent` in team mode. */
const TEAM_ACCENT: Record<"red" | "blue", string> = {
  red: "from-rose-500 to-red-600",
  blue: "from-sky-500 to-blue-600",
};

interface LobbyRosterProps {
  players: LobbyPlayer[];
  /** Localized "{n} in the room" — caller owns the i18n. */
  countLabel: (n: number) => string;
  /** Shown (with a gentle bounce) until the first student joins. */
  emptyLabel: string;
  /** Per-game medallion ring hue, as a Tailwind gradient pair,
   *  e.g. "from-fuchsia-500 to-pink-600". */
  accent?: string;
  className?: string;
  /** When set, each medallion shows a "remove" badge that calls this with
   *  the student's clientId + nickname (guarded by a confirm modal in the
   *  host). Available in both the Controls and the live/projected view. */
  onKick?: (clientId: string, nickname: string) => void;
  /** Projector mode — scales every medallion + name way up (with an extra
   *  min-[1280px] tier) so a class reading the waiting room from the back of
   *  the room can make out who's joined. Defaults off for compact use. */
  large?: boolean;
  /** Live-game skin. Re-colours the name + count text; defaults to the stone
   *  palette when omitted. */
  theme?: GameTheme;
}

export default function LobbyRoster({
  players,
  countLabel,
  emptyLabel,
  accent = "from-fuchsia-500 to-pink-600",
  className = "",
  large = false,
  onKick,
}: LobbyRosterProps) {
  const empty = players.length === 0;

  // Density tiers. In projector (`large`) mode the medallions shrink as the
  // room fills so a whole class fits on the screen at once instead of
  // wrapping past the fold — teachers reported having to scroll to see
  // everyone when 20-30 students joined. The compact preview (control panel)
  // keeps its small fixed size. Each tier still scales up on wide/projector
  // screens via the min-[1280px] breakpoint.
  type RosterTier = "compact" | "sm" | "md" | "lg" | "xl";
  const SIZES: Record<RosterTier, {
    cell: string; ring: string; inner: string; name: string; gap: string; icon: number; kick: string; kickIcon: number;
  }> = {
    compact: {
      cell: "w-[68px] sm:w-20",
      ring: "w-12 h-12 sm:w-16 sm:h-16",
      inner: "w-[42px] h-[42px] sm:w-[54px] sm:h-[54px]",
      name: "text-[11px] sm:text-xs",
      gap: "gap-3 sm:gap-4", icon: 26, kick: "w-5 h-5", kickIcon: 12,
    },
    sm: {
      cell: "w-16 sm:w-20 min-[1280px]:w-24",
      ring: "w-14 h-14 sm:w-16 sm:h-16 min-[1280px]:w-20 min-[1280px]:h-20",
      inner: "w-[44px] h-[44px] sm:w-[52px] sm:h-[52px] min-[1280px]:w-[64px] min-[1280px]:h-[64px]",
      name: "text-xs sm:text-sm min-[1280px]:text-lg",
      gap: "gap-2 sm:gap-3", icon: 30, kick: "w-5 h-5", kickIcon: 12,
    },
    md: {
      cell: "w-20 sm:w-24 min-[1280px]:w-28",
      ring: "w-16 h-16 sm:w-20 sm:h-20 min-[1280px]:w-24 min-[1280px]:h-24",
      inner: "w-[52px] h-[52px] sm:w-[64px] sm:h-[64px] min-[1280px]:w-[76px] min-[1280px]:h-[76px]",
      name: "text-sm sm:text-base min-[1280px]:text-2xl",
      gap: "gap-3 sm:gap-4", icon: 40, kick: "w-6 h-6", kickIcon: 14,
    },
    lg: {
      cell: "w-24 sm:w-28 min-[1280px]:w-36",
      ring: "w-20 h-20 sm:w-24 sm:h-24 min-[1280px]:w-28 min-[1280px]:h-28",
      inner: "w-[64px] h-[64px] sm:w-[76px] sm:h-[76px] min-[1280px]:w-[92px] min-[1280px]:h-[92px]",
      name: "text-lg sm:text-xl min-[1280px]:text-3xl",
      gap: "gap-4 sm:gap-6", icon: 52, kick: "w-7 h-7", kickIcon: 16,
    },
    xl: {
      cell: "w-28 sm:w-32 min-[1280px]:w-44",
      ring: "w-24 h-24 sm:w-28 sm:h-28 min-[1280px]:w-36 min-[1280px]:h-36",
      inner: "w-[76px] h-[76px] sm:w-[88px] sm:h-[88px] min-[1280px]:w-[116px] min-[1280px]:h-[116px]",
      name: "text-xl sm:text-2xl min-[1280px]:text-4xl",
      gap: "gap-4 sm:gap-6", icon: 60, kick: "w-7 h-7", kickIcon: 16,
    },
  };
  const tier: RosterTier = !large
    ? "compact"
    : players.length <= 12 ? "xl"
    : players.length <= 22 ? "lg"
    : players.length <= 34 ? "md"
    : "sm";
  const s = SIZES[tier];

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Live count — a bold, high-contrast gradient pill that reads across
          the room on a projector, with a pulsing "room is open" dot. */}
      <div className={`flex ${large ? "justify-center mb-6" : "items-center mb-4"}`}>
        <div className={`inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r ${accent} text-white shadow-lg ${large ? "px-6 py-2.5 min-[1280px]:px-9 min-[1280px]:py-4" : "px-4 py-1.5"}`}>
          <span className={`relative flex ${large ? "h-3.5 w-3.5 min-[1280px]:h-4 min-[1280px]:w-4" : "h-3 w-3"}`}>
            <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-70 animate-ping" />
            <span className="relative inline-flex h-full w-full rounded-full bg-white" />
          </span>
          <span className={`font-black uppercase tracking-wide ${large ? "text-lg sm:text-2xl min-[1280px]:text-4xl" : "text-sm"}`}>
            {countLabel(players.length)}
          </span>
        </div>
      </div>

      {empty ? (
        // Friendly placeholder so the room never looks broken before anyone
        // joins — three dots bouncing in sequence read as "live & waiting".
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-3 w-3 rounded-full bg-stone-300"
                animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.18, ease: "easeInOut" }}
              />
            ))}
          </div>
          <p className="text-base font-bold text-stone-400">{emptyLabel}</p>
        </div>
      ) : (
        <div className={`flex flex-wrap justify-center ${s.gap}`}>
          <AnimatePresence mode="popLayout">
            {players.map((p) => (
              <motion.div
                key={p.clientId}
                layout
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
                className={`relative flex flex-col items-center gap-1 ${s.cell}`}
              >
                <div
                  className={`flex items-center justify-center ${s.ring} rounded-full bg-gradient-to-br ${p.team ? TEAM_ACCENT[p.team] : accent} text-white shadow-lg ring-2 ring-white/40 ${large ? "min-[1280px]:ring-4" : ""}`}
                >
                  <span className={`flex items-center justify-center ${s.inner} rounded-full bg-white/90`}>
                    <QPAvatar value={p.avatar} iconSize={s.icon} className="text-fuchsia-600" />
                  </span>
                </div>
                {onKick && (
                  <button
                    type="button"
                    onClick={() => onKick(p.clientId, p.nickname)}
                    style={{ touchAction: "manipulation" }}
                    className={`absolute -top-1 end-0 inline-flex items-center justify-center rounded-full bg-rose-500 text-white shadow-md ring-2 ring-white opacity-80 hover:opacity-100 transition active:scale-90 ${s.kick}`}
                    aria-label={`Remove ${p.nickname}`}
                    title={`Remove ${p.nickname}`}
                  >
                    <X size={s.kickIcon} strokeWidth={3} />
                  </button>
                )}
                {/* Name-tag chip — white on any themed background so it stays
                    readable from the back of the class. */}
                <span
                  dir="auto"
                  className={`max-w-full truncate rounded-full bg-white/90 font-black text-stone-900 shadow-sm ${s.name} ${large ? "px-3 py-0.5 min-[1280px]:px-4 min-[1280px]:py-1" : "px-2"}`}
                >
                  {p.nickname}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
