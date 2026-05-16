import { useEffect, useState } from 'react';

// Track the browser's online/offline status.
//
// Used by OfflineIndicator (the amber dot at the top of the screen)
// and by the App.tsx queue-toast handler to decide whether a fresh
// enqueue is the result of a real outage vs a transient blip.
//
// `navigator.onLine` is famously imperfect — it only reports whether
// the OS thinks there's a network, not whether requests actually
// succeed.  We treat it as a hint, not a contract: even when it says
// "online" the read cache (R1) and save queue (saveQueue.ts) still
// have to tolerate failures.  The hook just powers UI affordances.
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine !== false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
