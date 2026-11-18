import { useEffect, useRef, useState } from 'react';
import type { Language } from '../hooks/useLanguage';
import { useBackLayer } from '../hooks/useBackLayer';
import { supabase } from '../core/supabase';
import { scanPinError, scanPinT } from '../locales/student/scan-pin';

export type DeliveredPin = {
  id: string;
  displayName: string;
  email: string;
  avatar: string;
  pin: string;
};
export type PinWindow = { id: string; can_add: boolean };
export function useScanWindow(code: string) {
  const [window, setWindow] = useState<PinWindow | null>(null);
  useEffect(() => {
    let current = true;
    let timer: ReturnType<typeof setTimeout>;
    async function update() {
      try {
        if (document.visibilityState !== 'hidden') {
          const result = await supabase.rpc('class_pin_availability', { p_class: code });
          if (current && !result.error) setWindow(result.data?.id ? result.data : null);
        }
      } catch {
        /* Ordinary PIN login is always available. */
      } finally {
        if (current) timer = setTimeout(update, 15000);
      }
    }
    void update();
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [code]);
  return window;
}
type Claim = { id: string; pin: string | null; challenge: string | null };
export default function StudentScanPin({
  code,
  windowId,
  profile,
  language,
  onReady,
  onBack,
}: {
  code: string;
  windowId: string;
  profile: string | null;
  language: Language;
  onReady: (data: DeliveredPin) => void;
  onBack: () => void;
}) {
  const t = scanPinT[language];
  const [alias, setAlias] = useState('');
  const [claim, setClaim] = useState<Claim | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [end, setEnd] = useState<'declined' | 'expired' | null>(null);
  const [device] = useState(() => crypto.randomUUID());
  const active = useRef(true);
  const ready = useRef(onReady);
  ready.current = onReady;
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function request() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await supabase.rpc('start_class_pin_request', {
        p_class: code,
        p_window: windowId,
        p_student: profile,
        p_alias: profile ? null : alias,
        p_device: device,
      });
      if (!active.current) return;
      if (result.error || !result.data?.id) {
        setError(scanPinError(result.error?.message, t));
        return;
      }
      setClaim(result.data);
    } catch {
      if (active.current) setError(t.error);
    } finally {
      if (active.current) setBusy(false);
    }
  }
  const start = useRef(request);
  start.current = request;
  const automaticallyStarted = useRef(false);
  useEffect(() => {
    if (profile && !automaticallyStarted.current) {
      automaticallyStarted.current = true;
      void start.current();
    }
  }, [profile]);
  useEffect(() => {
    if (!claim || end) return;
    let current = true;
    let timer: ReturnType<typeof setTimeout>;
    async function check() {
      try {
        const { data, error } = await supabase.rpc('read_class_pin_request', {
          p_id: claim!.id,
          p_device: device,
          p_ack: false,
        });
        if (!current) return;
        if (error) throw error;
        if (data?.state === 'ready' && data.id && data.email && data.pin) {
          current = false;
          ready.current(data);
          // The app has received the PIN. Dispose of the grant even if the user
          // closes the sign-in screen. The PIN itself lives only in React state.
          void Promise.resolve(
            supabase.rpc('read_class_pin_request', {
              p_id: claim!.id,
              p_device: device,
              p_ack: true,
            })
          ).catch(() => {});
          return;
        }
        if (['declined', 'expired', 'done'].includes(data?.state)) {
          setEnd(data.state === 'declined' ? 'declined' : 'expired');
          return;
        }
        setError('');
      } catch {
        if (current) setError(t.error);
      }
      if (current) timer = setTimeout(check, 3500);
    }
    void check();
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [claim, device, end, t]);
  const back = (): void | false => {
    if (busy) return false;
    if (claim && !end)
      void Promise.resolve(
        supabase.rpc('read_class_pin_request', { p_id: claim.id, p_device: device, p_ack: true })
      ).catch(() => {});
    onBack();
  };
  useBackLayer(back, { enabled: true, priority: 25, escape: false });
  const primary =
    'mt-3 min-h-12 w-full rounded-xl bg-violet-700 px-4 font-bold text-white disabled:opacity-50';
  return (
    <section className="space-y-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-slate-900">
      {!claim && !end && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void request();
          }}
        >
          {!profile && (
            <label className="block text-lg font-extrabold">
              {t.alias}
              <input
                autoFocus
                minLength={2}
                maxLength={30}
                required
                autoComplete="off"
                value={alias}
                className="mt-2 block min-h-12 w-full rounded-xl border bg-white px-3 text-lg"
                onChange={(e) => setAlias(e.target.value)}
              />
            </label>
          )}
          {profile && <p>{t.verify}</p>}
          {(!profile || error) && (
            <button
              type="submit"
              className={primary}
              disabled={busy || (!profile && alias.trim().length < 2)}
            >
              {profile ? t.again : t.request}
            </button>
          )}
        </form>
      )}
      {claim && !end && (
        <>
          <p className="font-bold">{claim.pin ? t.newWait : t.verify}</p>
          <div className="rounded-xl bg-white p-3 text-center">
            <span className="block text-sm font-semibold">{claim.pin ? t.pin : t.verifyLabel}</span>
            <bdi
              dir="ltr"
              data-sentry-block
              className="select-all font-mono text-4xl font-black tracking-[.16em]"
            >
              {claim.pin ?? claim.challenge}
            </bdi>
          </div>
          <p role="status" className="text-sm">
            {t.pending}
          </p>
        </>
      )}
      {end && <p role="status">{t[end]}</p>}
      {error && <p role="alert">{error}</p>}
      <button
        type="button"
        className="min-h-11 px-2 font-bold text-violet-800 underline"
        disabled={busy}
        onClick={back}
      >
        {t.cancel}
      </button>
    </section>
  );
}
