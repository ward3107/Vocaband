/**
 * AppCelebrations — the LevelUpModal + AchievementToast pair that must
 * mount on every authenticated return path (student dashboard early
 * return AND the final game route).  They were duplicated verbatim in
 * both branches; bundling them here keeps the two modals' wiring in one
 * place so the pair can't drift between branches.
 *
 * Purely presentational: it forwards the already-resolved level-up tier
 * and achievement-toast queue (plus their dismiss callbacks) straight
 * into the two modals.  No hooks, so dropping it into a branch can't
 * change App's hook call order.
 */
import type { ReactNode } from 'react';
import LevelUpModal from '../arcade/LevelUpModal';
import AchievementToast from '../arcade/AchievementToast';
import type { AchievementToastItem } from '../../hooks/useAchievements';

export interface AppCelebrationsProps {
  /** Current pending level-up tier (null = modal renders nothing). */
  levelUpTier: { title: string; emoji: string; min: number } | null;
  onLevelUpClose: () => void;
  achievementToasts: AchievementToastItem[];
  onAchievementDismiss: (id: string) => void;
}

export function AppCelebrations({
  levelUpTier,
  onLevelUpClose,
  achievementToasts,
  onAchievementDismiss,
}: AppCelebrationsProps): ReactNode {
  return (
    <>
      <LevelUpModal tier={levelUpTier} onClose={onLevelUpClose} />
      <AchievementToast toasts={achievementToasts} onDismiss={onAchievementDismiss} />
    </>
  );
}
