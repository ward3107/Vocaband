import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { View } from '../core/views';
import { pathForView, viewForPath } from '../utils/routes';
import { PUBLIC_PAGE_VIEW } from '../utils/publicNavigation';
import { modalBackStack } from '../utils/modalBackStack';

const publicViews = new Set<string>([
  ...Object.values(PUBLIC_PAGE_VIEW),
  'public-interactive-worksheet',
]);
export const isPublicBackView = (view: View) => publicViews.has(view);

/** Public routes own history without loading the authenticated app/client. */
export function usePublicBackNavigation(
  view: View,
  setView: Dispatch<SetStateAction<View>>,
  enabled: boolean
) {
  const current = useRef(view);
  const url = useRef(window.location.href);
  const popped = useRef(false);
  const sentinel = useRef(false);
  useEffect(() => {
    current.current = view;
  }, [view]);

  useEffect(() => {
    if (!enabled) return;
    const original = window.location.href;
    if (view !== 'public-landing') {
      window.history.replaceState({ view: 'public-landing' }, '', '/');
      window.history.pushState({ view }, '', original);
    } else {
      window.history.replaceState({ view }, '');
    }
    // Runs once while this shell owns navigation; handoff disables it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (popped.current) {
      popped.current = false;
    } else if (window.history.state?.view !== view) {
      const next = { view };
      if (window.history.state?._publicLayer)
        window.history.replaceState(next, '', pathForView(view) ?? '/');
      else window.history.pushState(next, '', pathForView(view) ?? '/');
      sentinel.current = false;
    }
    url.current = window.location.href;
    window.dispatchEvent(new CustomEvent('vocaband-view-change', { detail: view }));
  }, [view, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const ensureLayerEntry = () => {
      if (!modalBackStack.size || sentinel.current) return;
      url.current = window.location.href;
      window.history.pushState({ view: current.current, _publicLayer: true }, '', url.current);
      sentinel.current = true;
    };
    const unsubscribe = modalBackStack.subscribe(ensureLayerEntry);
    ensureLayerEntry();
    const onPop = (event: PopStateEvent) => {
      if (modalBackStack.size) {
        // Restore before closing: a close action may hand off to login.
        window.history.pushState({ view: current.current, _publicLayer: true }, '', url.current);
        sentinel.current = true;
        modalBackStack.closeTop();
        return;
      }
      const hadSentinel = sentinel.current;
      sentinel.current = false;
      const destination = event.state?.view ?? viewForPath(window.location.pathname);
      // An X/Done close leaves an inert sentinel. Skip it so the next
      // gesture still performs one real navigation, without a Back loop.
      if (hadSentinel && destination === current.current) {
        window.history.back();
        return;
      }
      if (destination === current.current) {
        url.current = window.location.href;
        return;
      }
      if (destination && publicViews.has(destination)) {
        popped.current = true;
        setView(destination as View);
        url.current = window.location.href;
      }
    };
    window.addEventListener('popstate', onPop);
    return () => {
      unsubscribe();
      window.removeEventListener('popstate', onPop);
    };
  }, [enabled, setView]);
}
