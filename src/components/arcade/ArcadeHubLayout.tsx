/**
 * ArcadeHubLayout — full-bleed wrapper for the Brawl-Stars-flavoured
 * student hub.  Provides the deep-violet gradient background, a subtle
 * starfield overlay, and a vertical slot grid the dashboard fills with
 * (top → bottom):
 *
 *   1. statsBar       — ArcadeStatsBar with XP / streak / level pills.
 *   2. trophyRoad     — TrophyRoadStrip (horizontal milestone scroller).
 *   3. character      — CharacterStage (pet / avatar centerpiece).
 *   4. playButton     — BigPlayButton (the hero CTA).
 *   5. children       — legacy dashboard panels re-skinned, scrolled.
 *
 * The starfield is rendered with a single CSS `radial-gradient` stack
 * rather than `motion.div`-animated dots — Reduced-motion friendly and
 * costs zero per-frame work.  Keep this wrapper visual-only; data lives
 * one level up in StudentDashboardView so the arcade flag flip is
 * a pure render swap.
 */
import type { ReactNode } from "react";
import { useLanguage } from "../../hooks/useLanguage";
import { ARCADE_BG } from "./theme";

interface ArcadeHubLayoutProps {
  statsBar?: ReactNode;
  trophyRoad?: ReactNode;
  character?: ReactNode;
  playButton?: ReactNode;
  children?: ReactNode;
}

export default function ArcadeHubLayout({
  statsBar,
  trophyRoad,
  character,
  playButton,
  children,
}: ArcadeHubLayoutProps) {
  const { dir } = useLanguage();

  return (
    <div
      dir={dir}
      className={`min-h-screen ${ARCADE_BG} relative overflow-hidden`}
    >
      {/* Starfield — pure CSS, GPU-friendly, no JS animation loop. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: [
            "radial-gradient(circle at 15% 12%, rgba(255,255,255,0.6) 0 1px, transparent 2px)",
            "radial-gradient(circle at 78% 22%, rgba(255,255,255,0.5) 0 1px, transparent 2px)",
            "radial-gradient(circle at 42% 58%, rgba(255,255,255,0.45) 0 1px, transparent 2px)",
            "radial-gradient(circle at 88% 75%, rgba(255,255,255,0.5) 0 1px, transparent 2px)",
            "radial-gradient(circle at 25% 90%, rgba(255,255,255,0.55) 0 1px, transparent 2px)",
          ].join(","),
        }}
      />

      {/* Top glow — gives the hub a "spotlight on stage" feel without
          paying for a continuously-animating layer. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[120%] -translate-x-1/2 rounded-full bg-cyan-400/30 blur-3xl"
      />

      <div className="relative z-10 mx-auto max-w-3xl space-y-4 p-4 sm:space-y-6 sm:p-6">
        {statsBar}
        {trophyRoad}
        <div className="flex flex-col items-center justify-center gap-2 py-2 sm:gap-4 sm:py-4">
          {character}
          {playButton}
        </div>
        {children}
      </div>
    </div>
  );
}
