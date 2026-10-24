import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../core/supabase';
import { getMyLiveClassEntry, type ClassLiveSession } from '../utils/classLiveSession';

/** Discover membership on the server, then keep one visible class subscription. */
export function useClassLiveSession(uid: string) {
  const [live, setLive] = useState<ClassLiveSession | null>(null);
  const [className, setClassName] = useState<string>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    let disposed = false;
    let generation = 0;
    let request: AbortController | undefined;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let subscribedClass: string | undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- discard the previous account before its next asynchronous lookup
    setLive(null);
    setClassName(undefined);
    setStatus('loading');

    const unsubscribe = () => {
      const old = channel;
      channel = undefined;
      subscribedClass = undefined;
      if (old) void supabase.removeChannel(old);
    };
    const subscribe = (classId: string) => {
      if (channel && subscribedClass === classId) return;
      unsubscribe();
      const activeChannel = supabase.channel(`class-live:${uid}:${classId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'class_live_sessions', filter: `class_id=eq.${classId}` }, () => { void refresh(); });
      channel = activeChannel;
      subscribedClass = classId;
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
    const refresh = async () => {
      if (disposed || document.visibilityState === 'hidden') return;
      const current = ++generation;
      request?.abort();
      request = new AbortController();
      clearTimeout(deadline);
      const pending = request;
      deadline = setTimeout(() => pending.abort(), 12_000);
      try {
        const entry = await getMyLiveClassEntry(request.signal);
        if (disposed || current !== generation) return;
        setLive(entry?.live ?? null);
        setClassName(entry?.className);
        setStatus('ready');
        clearTimeout(expiry);
        if (entry) {
          subscribe(entry.classId);
          if (entry.live) expiry = setTimeout(() => { setLive(null); void refresh(); }, Math.max(0, Date.parse(entry.live.expires_at) - Date.now()));
        } else unsubscribe();
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
      unsubscribe();
    };
    const resume = () => { pause(); void refresh(); };
    const visibility = () => document.visibilityState === 'hidden' ? pause() : resume();
    refreshRef.current = resume;
    resume();
    window.addEventListener('online', resume);
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      disposed = true;
      pause();
      window.removeEventListener('online', resume);
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [uid]);
  return { live, className, status, refresh: useCallback(() => refreshRef.current(), []) };
}
