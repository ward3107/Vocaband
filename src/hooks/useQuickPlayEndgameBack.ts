import { useCallback, useEffect, useRef } from 'react';

/** Keeps a Quick Play guest inside the active session after finishing a game. */
export function useQuickPlayEndgameBack(
  enabled: boolean,
  onBackToModes: () => void,
): () => void {
  const onBackToModesRef = useRef(onBackToModes);
  useEffect(() => { onBackToModesRef.current = onBackToModes; }, [onBackToModes]);

  const returnToModes = useCallback(() => {
    window.history.replaceState(
      { view: 'game', quickPlayStage: 'modes' },
      '',
    );
    onBackToModesRef.current();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    window.history.pushState(
      { view: 'game', quickPlayStage: 'finished' },
      '',
    );

    const handlePopState = (event: PopStateEvent) => {
      event.stopImmediatePropagation();
      returnToModes();
    };

    window.addEventListener('popstate', handlePopState, { capture: true });
    return () => window.removeEventListener('popstate', handlePopState, { capture: true });
  }, [enabled, returnToModes]);

  return returnToModes;
}
