/**
 * Preloadable lazy chunks for the student join flow.
 *
 * Why this exists: CategoryRaceStudentView / QuickPlayStudentView are
 * React.lazy chunks that only START downloading when the router first
 * renders them — i.e. AFTER the join bootstrap resolves the session and
 * flips the view. On a fresh mobile QR scan over weak Wi-Fi that download
 * is the visible "Loading race…" wait (the join logic itself measured
 * ~0.3s; the gap was the chunk fetch). By exposing a `preload()` that
 * fires the SAME dynamic import, the bootstrap can kick the download off
 * the instant it knows which view is coming — in parallel with the
 * anon-auth + session lookup — so the chunk is already cached by the time
 * the view mounts and the screen appears immediately.
 *
 * import() is idempotent and runtime-cached, so preload() + the eventual
 * lazy render share one fetch. Safe to call preload() multiple times.
 */
import { lazyWithRetry } from "../utils/lazyWithRetry";

const categoryRaceFactory = () => import("./CategoryRaceStudentView");
const quickPlayFactory = () => import("./QuickPlayStudentView");
const speedRoundFactory = () => import("./SpeedRoundStudentView");
const arenaFactory = () => import("./ArenaStudentView");

export const CategoryRaceStudentViewLazy = lazyWithRetry(categoryRaceFactory);
export const QuickPlayStudentViewLazy = lazyWithRetry(quickPlayFactory);
export const SpeedRoundStudentViewLazy = lazyWithRetry(speedRoundFactory);
export const ArenaStudentViewLazy = lazyWithRetry(arenaFactory);

/** Start downloading the Category Race view chunk now (fire-and-forget). */
export function preloadCategoryRaceView(): void {
  void categoryRaceFactory().catch(() => {});
}

/** Start downloading the Quick Play view chunk now (fire-and-forget). */
export function preloadQuickPlayView(): void {
  void quickPlayFactory().catch(() => {});
}

/** Start downloading the Speed Round view chunk now (fire-and-forget). */
export function preloadSpeedRoundView(): void {
  void speedRoundFactory().catch(() => {});
}

/** Start downloading the Word Hunt Arena view chunk now (fire-and-forget). */
export function preloadArenaView(): void {
  void arenaFactory().catch(() => {});
}
