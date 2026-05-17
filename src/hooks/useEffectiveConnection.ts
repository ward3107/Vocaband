import { useEffect, useState } from 'react';

// The Network Information API isn't in TS DOM lib yet.
interface NetworkInformation extends EventTarget {
  readonly effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  readonly saveData?: boolean;
  readonly downlink?: number;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

export interface EffectiveConnection {
  effectiveType: NetworkInformation['effectiveType'] | undefined;
  saveData: boolean;
  /** True when the connection is too slow to be worth fetching MP3 audio. */
  isSlow: boolean;
}

function readConnection(): EffectiveConnection {
  if (typeof navigator === 'undefined') {
    return { effectiveType: undefined, saveData: false, isSlow: false };
  }
  const nav = navigator as NavigatorWithConnection;
  const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
  const effectiveType = conn?.effectiveType;
  const saveData = conn?.saveData === true;
  const isSlow = saveData || effectiveType === 'slow-2g' || effectiveType === '2g';
  return { effectiveType, saveData, isSlow };
}

/**
 * Read-only snapshot of the Network Information API.
 *
 * Safari (desktop + iOS) doesn't expose `navigator.connection` at all, so
 * `isSlow` returns false there — no degradation for the majority of iPad
 * users in Israeli classrooms. Where the API exists (Chrome on Android,
 * the school-issued Chromebooks teachers use), we skip MP3 fetches on
 * 2G / data-saver and fall back to `speechSynthesis`.
 */
export function useEffectiveConnection(): EffectiveConnection {
  const [state, setState] = useState<EffectiveConnection>(readConnection);

  useEffect(() => {
    const nav = navigator as NavigatorWithConnection;
    const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
    if (!conn) return;
    const onChange = () => setState(readConnection());
    conn.addEventListener('change', onChange);
    return () => conn.removeEventListener('change', onChange);
  }, []);

  return state;
}

/**
 * Synchronous reader for non-React contexts (e.g. useAudio's `speak()`).
 * Faster than the React hook because it doesn't subscribe — callers that
 * just need a one-shot "is this user on 2G?" check shouldn't pay for the
 * subscription overhead.
 */
export function isSlowConnection(): boolean {
  return readConnection().isSlow;
}
