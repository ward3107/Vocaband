import { useContext, useEffect, useRef } from 'react';
import { modalBackStack } from '../utils/modalBackStack';
import { BackLayerContext } from './BackLayerContext';

/** Close the visible layer first, regardless of React's child-first effect order. */
export function useBackLayer(
  onBack: () => void | false,
  { enabled = true, priority = 50, escape = true } = {}
) {
  const parentPriority = useContext(BackLayerContext);
  const effectivePriority = Math.max(priority, parentPriority + 1);
  const callback = useRef(onBack);
  useEffect(() => {
    callback.current = onBack;
  }, [onBack]);
  useEffect(() => {
    if (!enabled) return;
    const close = () => callback.current();
    modalBackStack.push(close, effectivePriority);
    const onKey = (event: KeyboardEvent) => {
      if (!escape || event.key !== 'Escape' || !modalBackStack.isTop(close)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      modalBackStack.closeTop();
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => {
      window.removeEventListener('keydown', onKey, { capture: true });
      modalBackStack.remove(close);
    };
  }, [enabled, effectivePriority, escape]);
  return effectivePriority;
}
