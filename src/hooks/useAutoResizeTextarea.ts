// Sizes a <textarea> to its content so teachers can see everything they
// paste in one glance — no inner scrollbar, no clipped tails.  Used by
// the assignment-setup form (instructions + custom-sentence inputs)
// and the paste-and-analyze paper in WordInputStep2026.
//
// Why a hook and not a wrapper component: the textareas in the rest of
// the app already carry a lot of bespoke props (className, dir, onPaste,
// translations, refs forwarded to parent autoscroll logic) and a
// wrapper would force every site to re-thread them.  A hook just
// attaches a measurement ref.
import { useLayoutEffect, type RefObject } from 'react';

export function useAutoResizeTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  opts?: { min?: number; max?: number },
): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const min = opts?.min ?? 0;
    // No default cap: callers that want one pass `max` explicitly. The
    // previous 60vh default clipped pasted content silently because the
    // call sites also set `overflow-hidden`, so the tail was unreachable.
    const measured = Math.max(min, el.scrollHeight);
    el.style.height = `${opts?.max != null ? Math.min(measured, opts.max) : measured}px`;
  }, [ref, value, opts?.min, opts?.max]);
}
