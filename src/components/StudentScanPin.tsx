import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Language } from '../hooks/useLanguage';
import { useBackLayer } from '../hooks/useBackLayer';
import { supabase } from '../core/supabase';
import { scanPinError, scanPinT } from '../locales/student/scan-pin';
import { buildPinVerificationQr } from '../utils/classJoin';

export type DeliveredPin = {
  id: string;
  displayName: string;
  email: string;
  avatar: string;
  pin: string;
};
type PinWindow = { id: string; can_add: boolean };
type Availability =
  | { status: 'checking' | 'closed' | 'unavailable'; window: null }
  | { status: 'open'; window: PinWindow };

export function useScanWindow(code: string, waiting: boolean) {
  const [availability, setAvailability] = useState<Availability>({
    status: 'checking',
    window: null,
  });
  const retry = useRef<() => void>(() => {});
  useEffect(() => {
    let current = true;
    let checking = false;
    let timer: ReturnType<typeof setTimeout>;
    let isOpen = false;
    async function update() {
      if (!current || checking || document.visibilityState === 'hidden') return;
      checking = true;
      clearTimeout(timer);
      try {
        const { data, error } = await supabase.rpc('class_pin_availability', { p_class: code });
        if (!current) return;
        if (error) throw error;
        isOpen = Boolean(data?.id);
        setAvailability(
          data?.id ? { status: 'open', window: data } : { status: 'closed', window: null }
        );
      } catch {
        if (current) setAvailability({ status: 'unavailable', window: null });
      } finally {
        checking = false;
        if (current) timer = setTimeout(update, waiting && !isOpen ? 5000 : 15000);
      }
    }
    const refresh = () => void update();
    retry.current = refresh;
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('online', refresh);
    void update();
    return () => {
      current = false;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [code, waiting]);
  return { ...availability, refresh: () => retry.current() };
}
type Claim = { id: string; pin: string | null; challenge: string | null };
export default function StudentScanPin({
  code,
  availability,
  profile,
  language,
  onRetryWindow,
  onReady,
  onBack,
  onUsePin,
}: {
  code: string;
  availability: Availability;
  profile: string | null;
  language: Language;
  onRetryWindow: () => void;
  onReady: (data: DeliveredPin) => void;
  onBack: () => void;
  onUsePin?: () => void;
}) {
  const t = scanPinT[language];
  const windowId = availability.window?.id;
  const canRequest = Boolean(windowId && (profile || availability.window?.can_add));
  const [alias, setAlias] = useState('');
  const [claim, setClaim] = useState<Claim | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [end, setEnd] = useState<'declined' | 'expired' | null>(null);
  const [device] = useState(() => crypto.randomUUID());
  const active = useRef(true);
  const inFlight = useRef(false);
  const ready = useRef(onReady);
  ready.current = onReady;
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function request() {
    if (!windowId || !canRequest || inFlight.current) return;
    inFlight.current = true;
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
        if (result.error?.message.includes('window_expired')) onRetryWindow();
        return;
      }
      setClaim(result.data);
    } catch {
      if (active.current) setError(t.error);
    } finally {
      inFlight.current = false;
      if (active.current) setBusy(false);
    }
  }
  const start = useRef(request);
  start.current = request;
  const automaticallyStarted = useRef<string | null>(null);
  useEffect(() => {
    if (
      profile &&
      windowId &&
      !claim &&
      !end &&
      !busy &&
      automaticallyStarted.current !== windowId
    ) {
      automaticallyStarted.current = windowId;
      void start.current();
    }
  }, [profile, windowId, claim, end, busy]);
  useEffect(() => {
    if (!claim || end) return;
    const requestId = claim.id;
    let current = true;
    let timer: ReturnType<typeof setTimeout>;
    async function check() {
      try {
        const { data, error } = await supabase.rpc('read_class_pin_request', {
          p_id: requestId,
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
              p_id: requestId,
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
  const leave = (destination: () => void): void | false => {
    if (inFlight.current) return false;
    if (claim && !end)
      void Promise.resolve(
        supabase.rpc('read_class_pin_request', { p_id: claim.id, p_device: device, p_ack: true })
      ).catch(() => {});
    destination();
  };
  useBackLayer(() => leave(onBack), { priority: 25, escape: false });
  const primary =
    'mt-3 min-h-12 w-full rounded-xl bg-violet-700 px-4 font-bold text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700';
  const waitText =
    availability.status === 'checking'
      ? t.checking
      : availability.status === 'unavailable'
        ? t.unavailable
        : availability.status === 'open'
          ? t.coded
          : t.waitForTeacher;
  return (
    <section className="space-y-3 text-slate-900">
      {!claim && !end && !canRequest && (
        <div role="status" className="rounded-xl bg-slate-50 p-4 text-base">
          <p>{waitText}</p>
          {availability.status !== 'checking' && availability.status !== 'open' && (
            <button type="button" onClick={onRetryWindow} className={primary}>
              {t.checkAgain}
            </button>
          )}
        </div>
      )}
      {!claim && !end && canRequest && (
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
                minLength={2}
                maxLength={30}
                required
                disabled={busy}
                autoComplete="off"
                value={alias}
                className="mt-2 block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg"
                onChange={(e) => setAlias(e.target.value)}
              />
            </label>
          )}
          {profile && !error && <p role="status">{t.requesting}</p>}
          {(!profile || error) && (
            <button
              type="submit"
              className={primary}
              disabled={busy || (!profile && alias.trim().length < 2)}
            >
              {busy ? t.requesting : profile ? t.again : t.request}
            </button>
          )}
        </form>
      )}
      {claim && !end && (
        <>
          <div className="rounded-2xl bg-violet-50 p-4 text-center" data-sentry-block>
            {claim.challenge && (
              <>
                <p className="mb-2 font-bold">{t.verify}</p>
                <QRCodeSVG
                  value={buildPinVerificationQr(claim.id, claim.challenge)}
                  size={176}
                  marginSize={4}
                  role="img"
                  aria-label={t.scanVerification}
                  className="mx-auto mb-2 h-auto max-w-full rounded-lg"
                />
              </>
            )}
            <span className="block text-sm font-semibold text-slate-700">
              {claim.pin ? t.pin : t.verifyLabel}
            </span>
            <bdi dir="ltr" className="select-all font-mono text-4xl font-black tracking-widest">
              {claim.pin ?? claim.challenge}
            </bdi>
            {claim.pin && <p className="text-sm text-slate-700">{t.newWait}</p>}
          </div>
          <p role="status" className="text-center text-sm font-semibold text-slate-700">
            {t.pending}
          </p>
        </>
      )}
      {end && <p role="status">{t[end]}</p>}
      {error && canRequest && (
        <p role="alert" className="text-sm text-rose-800">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-2">
        <button
          type="button"
          className="min-h-11 px-2 text-sm font-bold text-violet-800 underline"
          disabled={busy}
          onClick={() => leave(onBack)}
        >
          {t.cancel}
        </button>
        {onUsePin && (
          <button
            type="button"
            className="min-h-11 px-2 text-sm font-bold text-violet-800 underline"
            disabled={busy}
            onClick={() => leave(onUsePin)}
          >
            {t.havePin}
          </button>
        )}
      </div>
    </section>
  );
}
