import { useEffect, useRef } from 'react';
import { modalBackStack } from '../utils/modalBackStack';

/** Close the visible layer first, regardless of React's child-first effect order. */
export function useBackLayer(
  onBack: () => void | false,
  { enabled = true, priority = 50, escape = true } = {}
) {
  const callback = useRef(onBack);
  useEffect(() => {
    callback.current = onBack;
  }, [onBack]);
  useEffect(() => {
    if (!enabled) return;
    const close = () => callback.current();
    modalBackStack.push(close, priority);
    const onKey = (event: KeyboardEvent) => {
      if (!escape || event.key !== 'Escape' || !modalBackStack.isTop(close)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      modalBackStack.closeTop();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      modalBackStack.remove(close);
    };
  }, [enabled, priority, escape]);
}
