import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../core/supabase';
import { getMyLiveClassSession, type ClassLiveSession } from '../utils/classLiveSession';

/** One visible subscription, with explicit refresh/reconnect; no database polling. */
export function useClassLiveSession(uid: string, classId?: string) {
  const [live, setLive] = useState<ClassLiveSession | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    let disposed = false;
    let generation = 0;
    let request: AbortController | undefined;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- discard the previous account/class before its next asynchronous lookup
    setLive(null);
    setStatus(classId ? 'loading' : 'ready');

    const refresh = async () => {
      if (disposed || !classId || document.visibilityState === 'hidden') return;
      const current = ++generation;
      request?.abort();
      request = new AbortController();
      clearTimeout(deadline);
      const pending = request;
      deadline = setTimeout(() => pending.abort(), 12_000);
      try {
        const result = await getMyLiveClassSession(request.signal);
        if (disposed || current !== generation) return;
        // A changed membership must never display a stale class's lesson.
        const next = result?.class_id === classId ? result : null;
        setLive(next);
        setStatus('ready');
        clearTimeout(expiry);
        if (next) expiry = setTimeout(() => { setLive(null); void refresh(); }, Math.max(0, Date.parse(next.expires_at) - Date.now()));
      } catch {
        if (disposed || current !== generation) return;
        setLive(null);
        setStatus('error');
      } finally {
        if (current === generation) clearTimeout(deadline);
      }
    };
    const pause = () => {
      generation++;
      request?.abort();
      clearTimeout(expiry);
      clearTimeout(deadline);
      if (channel) { void supabase.removeChannel(channel); channel = undefined; }
    };
    const resume = () => {
      pause();
      if (disposed || !classId || document.visibilityState === 'hidden') return;
      void refresh();
      const activeChannel = supabase.channel(`class-live:${uid}:${classId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'class_live_sessions', filter: `class_id=eq.${classId}` }, () => { void refresh(); });
      channel = activeChannel;
      activeChannel.subscribe(state => {
        if (disposed || channel !== activeChannel) return;
        if (state === 'SUBSCRIBED') void refresh(); // close the fetch/subscribe race
        if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') {
          generation++;
          request?.abort();
          clearTimeout(deadline);
          setLive(null);
          setStatus('error');
        }
      });
    };
    const visibility = () => document.visibilityState === 'hidden' ? pause() : resume();
    const onFocus = () => { resume(); };
    refreshRef.current = () => { resume(); };
    resume();
    window.addEventListener('online', resume);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      disposed = true;
      pause();
      window.removeEventListener('online', resume);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [uid, classId]);
  return { live, status, refresh: useCallback(() => refreshRef.current(), []) };
}
