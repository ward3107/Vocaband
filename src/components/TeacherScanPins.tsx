import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ScanLine } from 'lucide-react';
import { supabase } from '../core/supabase';
import { scanPinT, scanPinError } from '../locales/student/scan-pin';
import { parsePinVerificationQr } from '../utils/classJoin';
import type { Language } from '../hooks/useLanguage';
import QrScannerModal from './QrScannerModal';

type Window = { id: string; ends_at: string };
type Pending = { id: string; display_name: string; is_new: boolean };
export default function TeacherScanPins({
  code,
  language,
  onActive,
}: {
  code: string;
  language: Language;
  onActive: (active: boolean) => void;
}) {
  const t = scanPinT[language];
  const [status, setStatus] = useState<'opening' | 'ready' | 'failed'>('opening');
  const [pending, setPending] = useState<Pending[]>([]);
  const [verification, setVerification] = useState<{
    id: string;
    code: string;
    scanned: boolean;
  } | null>(null);
  const [scanTarget, setScanTarget] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const resolved = useRef(new Set<string>());
  const retry = useRef<() => void>(() => {});
  useEffect(() => {
    let current = true;
    let loading = false;
    let timer: ReturnType<typeof setTimeout>;
    let w: Window | null = null;
    async function update() {
      if (!current || loading || document.visibilityState === 'hidden') return;
      loading = true;
      clearTimeout(timer);
      try {
        if (!w || Date.parse(w.ends_at) <= Date.now()) {
          const { data, error } = await supabase.rpc('teacher_open_pin_window', { p_class: code });
          if (!current) return;
          if (error || !data?.id || !(Date.parse(data.ends_at) > Date.now())) {
            w = null;
            onActive(false);
            setPending([]);
            throw error ?? new Error('No active class invitation');
          }
          w = { id: data.id, ends_at: data.ends_at };
          resolved.current.clear();
          onActive(true);
        }
        const { data, error } = await supabase.rpc('teacher_pending_pin_requests', {
          p_window: w.id,
        });
        if (!current) return;
        if (error || !Array.isArray(data)) throw error ?? new Error('No class invitation requests');
        setPending(data.filter((row: Pending) => !resolved.current.has(row.id)));
        setStatus('ready');
      } catch {
        if (current) setStatus('failed');
      } finally {
        loading = false;
        if (current) timer = setTimeout(update, w ? 4500 : 12000);
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
  }, [code, onActive]);
  async function decide(row: Pending, allow: boolean) {
    const challenge = verification?.id === row.id ? verification.code : null;
    if (busy || (allow && !row.is_new && !/^\d{6}$/.test(challenge ?? ''))) return;
    setBusy(row.id);
    setError('');
    try {
      const result = await supabase.rpc('teacher_decide_pin_request', {
        p_id: row.id,
        p_approve: allow,
        p_challenge: allow && !row.is_new ? challenge : null,
      });
      if (result.error) {
        setError(scanPinError(result.error.message, t));
        if (result.error.message.includes('wrong_challenge')) setVerification(null);
        return;
      }
      resolved.current.add(row.id);
      setPending((prev) => prev.filter((v) => v.id !== row.id));
      setVerification((prev) => (prev?.id === row.id ? null : prev));
    } catch {
      setError(t.error);
    } finally {
      setBusy('');
    }
  }
  const showManual = (id: string) => {
    setError('');
    setScanTarget(null);
    setVerification({ id, code: '', scanned: false });
  };
  const verifyQr = (raw: string) => {
    setScanTarget(null);
    const proof = parsePinVerificationQr(raw);
    if (!proof || proof.requestId !== scanTarget) {
      setError(t.wrongQr);
      return;
    }
    setVerification({ id: proof.requestId, code: proof.challenge, scanned: true });
  };
  const approveStyle =
    'min-h-11 rounded-xl bg-violet-700 px-4 font-bold text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700';
  return (
    <section className="my-4 space-y-2 text-slate-900" aria-label={t.requests}>
      {status === 'failed' ? (
        <button
          type="button"
          onClick={() => retry.current()}
          className="min-h-11 rounded-xl bg-rose-50 px-3 text-start font-semibold text-rose-800 underline"
        >
          {t.openFailed}
        </button>
      ) : pending.length === 0 ? (
        <p role="status" className="rounded-xl bg-violet-50 px-3 py-2 text-sm font-semibold">
          {status === 'ready' ? t.scanReady : t.opening}
        </p>
      ) : null}
      {pending.length > 0 && (
        <div className="space-y-2 rounded-2xl bg-violet-50 p-3">
          <h3 className="text-base font-bold">{t.requests}</h3>
          {pending.map((row) => {
            const proof = verification?.id === row.id ? verification : null;
            return (
              <div key={row.id} className="rounded-xl bg-white p-3">
                <strong className="break-words">{row.display_name}</strong>
                {proof?.scanned && (
                  <p role="status" className="mt-2 font-semibold text-slate-700">
                    {t.verifyScanned}
                  </p>
                )}
                {proof && !proof.scanned && (
                  <label className="mt-2 block text-sm font-semibold">
                    {t.verifyInput}
                    <input
                      aria-label={t.verifyInput + ' · ' + row.display_name}
                      data-sentry-block
                      dir="ltr"
                      autoComplete="off"
                      inputMode="numeric"
                      maxLength={6}
                      className="mt-1 block min-h-11 w-36 rounded-lg border px-3 font-mono text-lg tracking-widest"
                      value={proof.code}
                      onChange={(e) =>
                        setVerification({
                          id: row.id,
                          scanned: false,
                          code: e.target.value
                            .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660))
                            .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0))
                            .replace(/[^0-9]/g, '')
                            .slice(0, 6),
                        })
                      }
                    />
                  </label>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {row.is_new || proof ? (
                    <button
                      type="button"
                      className={approveStyle}
                      disabled={!!busy || (!row.is_new && proof?.code.length !== 6)}
                      autoFocus={proof?.scanned}
                      onClick={() => void decide(row, true)}
                    >
                      {row.is_new ? t.approve : t.verifyAction}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`${approveStyle} inline-flex items-center gap-2`}
                      disabled={!!busy}
                      onClick={() => {
                        setError('');
                        setScanTarget(row.id);
                      }}
                    >
                      <ScanLine size={18} aria-hidden="true" />
                      {t.scanVerification}
                    </button>
                  )}
                  {!row.is_new && (!proof || proof.scanned) && (
                    <button
                      type="button"
                      className="min-h-11 px-2 text-violet-800 underline"
                      disabled={!!busy}
                      onClick={() => showManual(row.id)}
                    >
                      {t.enterVerification}
                    </button>
                  )}
                  <button
                    type="button"
                    className="min-h-11 px-2 underline"
                    disabled={!!busy}
                    onClick={() => void decide(row, false)}
                  >
                    {t.decline}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {error && (
        <p role="alert" className="text-rose-800">
          {error}
        </p>
      )}
      {scanTarget &&
        createPortal(
          <QrScannerModal
            onDetect={verifyQr}
            onCancel={() => setScanTarget(null)}
            onUnsupported={() => showManual(scanTarget)}
          />,
          document.body
        )}
    </section>
  );
}
