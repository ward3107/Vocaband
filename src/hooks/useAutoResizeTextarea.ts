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
    const max = opts?.max ?? Math.round(window.innerHeight * 0.6);
    el.style.height = `${Math.max(min, Math.min(el.scrollHeight, max))}px`;
  }, [ref, value, opts?.min, opts?.max]);
}
