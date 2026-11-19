import { useEffect, useState } from 'react';
import { supabase } from '../core/supabase';
import { scanPinT, scanPinError } from '../locales/student/scan-pin';
import type { Language } from '../hooks/useLanguage';

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
  const [pending, setPending] = useState<Pending[]>([]);
  const [digits, setDigits] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  useEffect(() => {
    let current = true;
    let timer: ReturnType<typeof setTimeout>;
    let w: Window | null = null;
    async function update() {
      try {
        if (document.visibilityState !== 'hidden') {
          if (!w || Date.parse(w.ends_at) <= Date.now()) {
            const result = await supabase.rpc('teacher_open_pin_window', { p_class: code });
            if (!current) return;
            w =
              result.data?.id && Date.parse(result.data.ends_at) > Date.now() ? result.data : null;
            onActive(!!w);
            if (!w) setPending([]);
          }
          if (w) {
            const result = await supabase.rpc('teacher_pending_pin_requests', { p_window: w.id });
            if (current && !result.error && Array.isArray(result.data)) setPending(result.data);
          }
        }
      } catch {
        /* An unavailable scan service preserves ordinary roster login. */
      } finally {
        if (current) timer = setTimeout(update, w ? 4500 : 12000);
      }
    }
    void update();
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [code, onActive]);
  async function decide(row: Pending, allow: boolean) {
    if (busy) return;
    setBusy(row.id);
    setError('');
    try {
      const result = await supabase.rpc('teacher_decide_pin_request', {
        p_id: row.id,
        p_approve: allow,
        p_challenge: row.is_new ? null : (digits[row.id] ?? ''),
      });
      if (result.error) {
        setError(scanPinError(result.error.message, t));
        return;
      }
      setPending((prev) => prev.filter((v) => v.id !== row.id));
      setDigits((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
    } catch {
      setError(t.error);
    } finally {
      setBusy('');
    }
  }
  if (!pending.length && !error) return null;
  return (
    <section
      className="my-4 space-y-3 rounded-2xl border border-violet-300 bg-violet-50 p-4 text-slate-900"
      aria-label={t.requests}
    >
      <h3 className="text-lg font-extrabold">{t.requests}</h3>
      {pending.map((row) => (
        <div key={row.id} className="rounded-xl bg-white p-3">
          <strong>{row.display_name}</strong>
          {!row.is_new && (
            <label className="mt-2 block text-sm font-semibold">
              {t.verifyInput}
              <input
                aria-label={t.verifyInput + ' · ' + row.display_name}
                dir="ltr"
                autoComplete="off"
                inputMode="numeric"
                maxLength={6}
                className="mt-1 block min-h-11 w-36 rounded-lg border px-3 font-mono text-lg tracking-widest"
                value={digits[row.id] ?? ''}
                onChange={(e) =>
                  setDigits((prev) => ({
                    ...prev,
                    [row.id]: e.target.value
                      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660))
                      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0))
                      .replace(/[^0-9]/g, '')
                      .slice(0, 6),
                  }))
                }
              />
            </label>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-11 rounded-xl bg-violet-700 px-4 font-bold text-white disabled:opacity-50"
              disabled={!!busy || (!row.is_new && digits[row.id]?.length !== 6)}
              onClick={() => void decide(row, true)}
            >
              {row.is_new ? t.approve : t.verifyAction}
            </button>
            <button
              type="button"
              className="min-h-11 rounded-xl px-3 underline"
              disabled={!!busy}
              onClick={() => void decide(row, false)}
            >
              {t.decline}
            </button>
          </div>
        </div>
      ))}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
