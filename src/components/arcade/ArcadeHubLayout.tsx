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

interface ArcadeHubLayoutProps {
  /** Thin top row (e.g. logout) pinned above the stats bar. */
  topBar?: ReactNode;
  statsBar?: ReactNode;
  trophyRoad?: ReactNode;
  character?: ReactNode;
  playButton?: ReactNode;
  children?: ReactNode;
}

export default function ArcadeHubLayout({
  topBar,
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
      // iOS flatten: the home hub sits on the grouped-light background.
      className="vb-page relative"
    >
      {/* Bottom padding clears the fixed overlays (FloatingButtons +
          PetCompanion) and the iOS safe area so the last card stays
          fully visible above them. */}
      {topBar}
      <div className="vb-content relative space-y-5 pt-6 pb-[calc(env(safe-area-inset-bottom)+7rem)] sm:space-y-7 sm:pt-8">
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
