/**
 * useUiScale — teacher-side accessibility zoom.
 *
 * Sets the document root font-size, which Tailwind's rem-based sizing
 * (text-sm, p-4, gap-3, etc.) scales off proportionally.  Bumping root
 * from 16 px to 19 px gives the entire dashboard a ~19% bump without
 * needing per-element overrides — same as `body { zoom: 1.19 }` but
 * works in Firefox + Safari and doesn't fight the layout viewport.
 *
 * Persists per-device in localStorage.  Default is "normal" (16 px,
 * the Tailwind baseline) so an unset teacher sees exactly today's UI.
 */
import { useCallback, useEffect, useState } from 'react';

export type UiScale = 'normal' | 'large' | 'xlarge';

const SCALE_TO_PX: Record<UiScale, number> = {
  normal: 16,   // Tailwind default
  large:  19,   // ~119% — comfortable for most "I'd like things bigger"
  xlarge: 22,   // ~138% — for 50+ year-old teachers / projector use
};

const STORAGE_KEY = 'vocaband_ui_scale';

function read(): UiScale {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'large' || v === 'xlarge' || v === 'normal') return v;
  } catch {
    /* private mode / quota — fall through */
  }
  return 'normal';
}

function applyToDocument(scale: UiScale) {
  if (typeof document === 'undefined') return;
  // Set on documentElement (html) so EVERY rem unit picks it up,
  // including portals / modals that mount at <body> level.
  document.documentElement.style.fontSize = `${SCALE_TO_PX[scale]}px`;
}

export function useUiScale(): {
  scale: UiScale;
  setScale: (s: UiScale) => void;
} {
  const [scale, setScaleState] = useState<UiScale>(() => read());

  // Apply on mount (in case localStorage was stale and document
  // hadn't been touched) and on every change.
  useEffect(() => {
    applyToDocument(scale);
  }, [scale]);

  const setScale = useCallback((s: UiScale) => {
    setScaleState(s);
    try { localStorage.setItem(STORAGE_KEY, s); } catch { /* silent */ }
    applyToDocument(s);
  }, []);

  return { scale, setScale };
}
