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
import QPAvatar from "../QPAvatar";

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
  /** Projector mode — scales every medallion + name way up (with an extra
   *  min-[1700px] tier) so a class reading the waiting room from the back of
   *  the room can make out who's joined. Defaults off for compact use. */
  large?: boolean;
}

export default function LobbyRoster({
  players,
  countLabel,
  emptyLabel,
  accent = "from-fuchsia-500 to-pink-600",
  className = "",
  large = false,
}: LobbyRosterProps) {
  const empty = players.length === 0;

  // Projector vs compact sizing for each medallion. The min-[1700px] tier
  // only kicks in on true projector resolutions, so a laptop control view is
  // unaffected.
  const cell = large ? "w-24 sm:w-28 min-[1700px]:w-40" : "w-[68px] sm:w-20";
  const ring = large
    ? "w-20 h-20 sm:w-24 sm:h-24 min-[1700px]:w-32 min-[1700px]:h-32"
    : "w-12 h-12 sm:w-16 sm:h-16";
  const inner = large
    ? "w-[60px] h-[60px] sm:w-[76px] sm:h-[76px] min-[1700px]:w-[104px] min-[1700px]:h-[104px]"
    : "w-[42px] h-[42px] sm:w-[54px] sm:h-[54px]";
  const nameCls = large
    ? "text-base sm:text-xl min-[1700px]:text-3xl"
    : "text-[11px] sm:text-xs";

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Live count header — a pulsing dot signals "room is open". */}
      <div className="flex items-center gap-2 mb-4">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
        </span>
        <span className="text-sm sm:text-base font-black uppercase tracking-widest text-stone-500">
          {countLabel(players.length)}
        </span>
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
        <div className={`flex flex-wrap ${large ? "gap-4 sm:gap-6" : "gap-3 sm:gap-4"}`}>
          <AnimatePresence mode="popLayout">
            {players.map((p) => (
              <motion.div
                key={p.clientId}
                layout
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
                className={`flex flex-col items-center gap-1 ${cell}`}
              >
                <div
                  className={`flex items-center justify-center ${ring} rounded-full bg-gradient-to-br ${p.team ? TEAM_ACCENT[p.team] : accent} text-white shadow-md`}
                >
                  <span className={`flex items-center justify-center ${inner} rounded-full bg-white/90`}>
                    <QPAvatar value={p.avatar} iconSize={large ? 44 : 26} className="text-fuchsia-600" />
                  </span>
                </div>
                <span className={`max-w-full truncate font-black text-stone-600 ${nameCls}`}>
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
