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
  const px = SCALE_TO_PX[scale];
  // Set on documentElement (html) with !important so it beats any
  // late-loading Tailwind/UA reset that re-anchors `html { font-size:
  // 16px }`.  Using setProperty + 'important' instead of
  // `.style.fontSize = ...` because the latter doesn't accept the
  // priority flag and a normal-priority inline style still loses to
  // an !important rule from a stylesheet.
  document.documentElement.style.setProperty('font-size', `${px}px`, 'important');
  // Also write the CSS custom property declared in index.css so any
  // stylesheet that reads var(--a11y-font-size) picks the new value
  // up automatically.
  document.documentElement.style.setProperty('--a11y-font-size', `${px}px`);
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
