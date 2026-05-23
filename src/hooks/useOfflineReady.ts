import { useEffect, useState } from 'react';

// True when the service worker is registered AND controlling this page,
// which is the minimum requirement for the SPA shell, vocabulary, and
// any cached audio to be served from cache when Wi-Fi drops mid-lesson.
//
// We intentionally don't probe the size of the audio cache — the SW's
// CacheFirst rule fills it lazily as words are played or precached, so
// "ready" here means "the offline plumbing is wired", not "every word
// audio file is on this device".
export function useOfflineReady(): boolean {
  const [ready, setReady] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return false;
    if (!('serviceWorker' in navigator)) return false;
    return navigator.serviceWorker.controller != null;
  });

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    // On a first visit the page boots before the SW takes control; flip
    // ready to true the moment it does so the badge appears without a
    // reload.
    const handler = () => setReady(navigator.serviceWorker.controller != null);
    navigator.serviceWorker.addEventListener('controllerchange', handler);

    // Some browsers fire 'controllerchange' before `controller` is set on
    // the next tick; recheck after the registration resolves.
    void navigator.serviceWorker.ready.then(() => {
      setReady(navigator.serviceWorker.controller != null);
    }).catch(() => {
      /* registration failed — leave ready as-is */
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handler);
    };
  }, []);

  return ready;
}
