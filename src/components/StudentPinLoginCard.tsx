import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, KeyRound, Search, AlertTriangle, RotateCw } from 'lucide-react';
import { supabase } from '../core/supabase';
import { useLanguage } from '../hooks/useLanguage';
import { useBackLayer } from '../hooks/useBackLayer';
import { classEntryT } from '../locales/class-entry';
import { studentPinLoginT } from '../locales/student/student-pin-login';

interface RosterEntry {
  id: string;
  displayName: string;
  email: string;
  avatar: string;
}

interface Props {
  classCode: string;
  onStepChange?: (step: 'name' | 'pin') => void;
  onBusyChange?: (busy: boolean) => void;
  /** Optional student_profiles.id from `?s=` on the teacher invite link.
   *  When provided AND it matches a row in the loaded roster, we skip
   *  the pick-your-name step and land directly on the PIN entry.  The
   *  student can still tap "Not me" to back out, and a stale / wrong
   *  id silently falls through to the normal picker. */
  prefilledStudentId?: string | null;
  /** Called after successful signInWithPassword.  App.tsx's auth listener
   *  then hydrates the AppUser from public.users. */
  onSuccess: () => void;
  /** Tier-2 fast login (build-flag gated in App). When provided, the card
   *  tries the single-round-trip /api/student/login first; App handles
   *  setSession + dashboard hydration on 'ok'. 'invalid' → wrong-PIN UX;
   *  'fallback' → run the existing direct signInWithPassword below.
   *  Undefined = feature off → direct path only. */
  onTier2Login?: (email: string, pin: string) => Promise<'ok' | 'invalid' | 'fallback'>;
}

const PIN_LENGTH = 6;
// Mirror the server-side regex in 20260513_student_roster_pins.sql
// (no I/L/O, no 0/1).
const PIN_REGEX = /^[A-HJ-KM-NP-Z2-9]{6}$/;

const StudentPinLoginCard: FC<Props> = ({
  classCode,
  prefilledStudentId,
  onSuccess,
  onTier2Login,
  onStepChange,
  onBusyChange,
}) => {
  const { language, dir, isRTL } = useLanguage();
  const t = studentPinLoginT[language];
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<RosterEntry | null>(null);
  const [pin, setPin] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  // Per-session wrong-PIN counter.  After 3 fails we swap to the
  // "ask your teacher to reset" copy — purely a UX softening, not a
  // security limit (state is in-memory + resets on refresh).  Real
  // brute-force protection lives in GoTrue's per-IP defaults.
  const [wrongPinCount, setWrongPinCount] = useState(0);
  useEffect(() => {
    onStepChange?.(selected ? 'pin' : 'name');
  }, [selected, onStepChange]);
  useEffect(() => {
    onBusyChange?.(signingIn);
  }, [signingIn, onBusyChange]);
  const nameListRef = useRef<HTMLDivElement>(null);
  const pinInputRef = useRef<HTMLInputElement | null>(null);

  // Load the class roster on mount (or when classCode changes).
  const loadRoster = useCallback(async () => {
    if (!classCode || classCode.length < 3) {
      setRoster([]);
      setRosterLoading(false);
      return;
    }
    setRosterLoading(true);
    setRosterError(null);
    try {
      const { data, error } = await supabase.rpc('class_roster_for_login', {
        p_class_code: classCode,
      });
      if (error) throw error;
      const mapped: RosterEntry[] = (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        displayName: r.display_name as string,
        email: r.email as string,
        avatar: (r.avatar as string) || '🦊',
      }));
      setRoster(mapped);
    } catch (e) {
      setRosterError(e instanceof Error ? e.message : t.loadFailed);
    } finally {
      setRosterLoading(false);
    }
  }, [classCode, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRoster();
  }, [loadRoster]);

  // Teacher-invite-link prefill: once the roster has loaded, if the URL
  // carried a ?s=<student_profile_id> and it matches a row, pre-select
  // that student so the inline PIN field opens straightaway. Only fires
  // once per page-load.
  const consumedPrefillRef = useRef(false);
  useEffect(() => {
    if (consumedPrefillRef.current) return;
    if (!prefilledStudentId) return;
    if (rosterLoading || roster.length === 0) return;
    const match = roster.find((r) => r.id.toLowerCase() === prefilledStudentId.toLowerCase());
    if (!match) {
      // Stale or wrong id — silently fall through to the normal picker.
      consumedPrefillRef.current = true;
      return;
    }
    consumedPrefillRef.current = true;
    setSelected(match);
    setPin('');
    setPinError(null);
  }, [prefilledStudentId, roster, rosterLoading]);

  // When a name is picked, focus the inline PIN field and scroll its
  // panel into view — on mobile this cues the keyboard and makes sure the
  // freshly-revealed field isn't below the fold.
  const pinPanelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!selected) return;
    const id = window.setTimeout(() => {
      pinInputRef.current?.focus();
      pinPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
    return () => window.clearTimeout(id);
  }, [selected]);

  const handlePick = (s: RosterEntry) => {
    setSelected(s);
    setPin('');
    setPinError(null);
    // Different student selected → start the wrong-PIN counter fresh.
    setWrongPinCount(0);
  };

  // "Not me" / change — clear the selection to collapse the PIN panel
  // and return focus to the name list.
  const clearSelection = (): void | false => {
    if (signingIn) return false;
    setSelected(null);
    setPin('');
    setPinError(null);
    setWrongPinCount(0);
    requestAnimationFrame(() => nameListRef.current?.focus());
  };
  useBackLayer(clearSelection, { enabled: Boolean(selected), priority: 20, escape: false });

  const handleSubmit = async () => {
    if (!selected || signingIn) return;
    const cleanPin = pin.trim().toUpperCase();
    if (!PIN_REGEX.test(cleanPin)) {
      setPinError(t.invalidPinFormat);
      return;
    }
    setSigningIn(true);
    setPinError(null);
    try {
      // Tier-2 fast path: one round-trip to the nearby edge instead of
      // 3-4 to Frankfurt. App handles setSession + dashboard hydration on
      // 'ok'; 'fallback' drops through to the direct path below.
      if (onTier2Login) {
        const outcome = await onTier2Login(selected.email, cleanPin);
        if (outcome === 'ok') {
          void supabase.rpc('student_touch_last_login');
          onSuccess();
          return;
        }
        if (outcome === 'invalid') {
          const nextCount = wrongPinCount + 1;
          setWrongPinCount(nextCount);
          setPinError(nextCount >= 3 ? t.wrongPinPersistent : t.wrongPin);
          return;
        }
        // 'fallback' → continue to the direct signInWithPassword below.
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: selected.email,
        password: cleanPin,
      });
      if (error) {
        if (/invalid login/i.test(error.message)) {
          const nextCount = wrongPinCount + 1;
          setWrongPinCount(nextCount);
          setPinError(nextCount >= 3 ? t.wrongPinPersistent : t.wrongPin);
        } else {
          setPinError(error.message);
        }
        return;
      }
      // Best-effort last-login bookkeeping — don't block on it.
      void supabase.rpc('student_touch_last_login');
      onSuccess();
    } catch (e) {
      setPinError(e instanceof Error ? e.message : t.genericSignInError);
    } finally {
      setSigningIn(false);
    }
  };

  const filtered = filter.trim()
    ? roster.filter((r) => r.displayName.toLowerCase().includes(filter.trim().toLowerCase()))
    : roster;

  // Coded classes (anonymous codes like "07-5-2-14") are far less scannable
  // than names, so always show the filter and ask the student to type their
  // code rather than hunt the grid.
  const isCoded = roster.length > 0 && roster.every((r) => /^\d/.test(r.displayName));
  const showFilter = roster.length > 8 || isCoded;

  return (
    <div className="space-y-4 text-[#1d2940]" dir={dir}>
      {!selected && (
        <div ref={nameListRef} tabIndex={-1} className="outline-none">
          <h3 className="mb-4 flex items-center gap-2 text-xl font-extrabold">
            <KeyRound size={20} className="text-violet-600" aria-hidden="true" />
            {t.pickYourName}
          </h3>
          {rosterLoading ? (
            <p role="status" className="py-8 text-center text-sm text-[#606b7e]">
              {t.loading}
            </p>
          ) : rosterError ? (
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
            >
              <p className="flex items-start gap-2">
                <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />
                {rosterError}
              </p>
              <button
                type="button"
                onClick={loadRoster}
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 font-bold"
              >
                <RotateCw size={16} aria-hidden="true" />
                {classEntryT[language].retry}
              </button>
            </div>
          ) : roster.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-center">
              <p className="mb-2 text-4xl" aria-hidden="true">
                🦊
              </p>
              <p className="font-bold text-amber-900">{t.emptyRosterTitle}</p>
              <p className="mt-2 text-sm text-amber-800">{t.emptyRosterBody}</p>
            </div>
          ) : (
            <>
              {showFilter && (
                <div className="relative mb-4">
                  <Search
                    size={18}
                    className="absolute start-4 top-1/2 -translate-y-1/2 text-[#606b7e]"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    aria-label={isCoded ? t.findYourCode : t.findYourName}
                    placeholder={isCoded ? t.findYourCode : t.findYourName}
                    className="min-h-12 w-full rounded-2xl border border-[#dfe2e9] bg-[#f8f9fc] pe-3 ps-11 text-base focus:outline-2 focus:outline-violet-600"
                  />
                </div>
              )}
              <div className="grid max-h-[40dvh] grid-cols-2 gap-3 overflow-y-auto p-1">
                {filtered.map((student, i) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handlePick(student)}
                    className="group flex min-h-24 touch-manipulation flex-col items-center justify-center gap-2 rounded-2xl border border-[#dfe2e9] bg-white px-2 py-3 text-center transition-colors hover:border-violet-500 hover:bg-[#f8f5ff] focus-visible:outline-2 focus-visible:outline-violet-600"
                  >
                    <span
                      aria-hidden="true"
                      className={`grid h-12 w-12 place-items-center rounded-2xl text-3xl ${['bg-[#eef4db]', 'bg-[#ebe5ff]', 'bg-[#fff0d3]', 'bg-[#ffebe1]'][i % 4]}`}
                    >
                      {student.avatar}
                    </span>
                    <span className="break-words text-base font-extrabold">
                      {student.displayName}
                    </span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="col-span-full py-4 text-center text-sm text-[#606b7e]">
                    {t.noMatches(filter)}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
      {selected && (
        <div ref={pinPanelRef} className="space-y-5">
          <div className="flex items-center gap-3 rounded-2xl bg-[#f2f5e9] p-4">
            <span
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-4xl"
              aria-hidden="true"
            >
              {selected.avatar}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#606b7e]">{t.signingInAs}</p>
              <p className="mt-0.5 break-words text-xl font-extrabold">{selected.displayName}</p>
            </div>
            <button
              type="button"
              disabled={signingIn}
              onClick={clearSelection}
              className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-2 text-sm font-bold text-violet-700 underline underline-offset-4 disabled:opacity-40"
            >
              <ArrowLeft size={16} aria-hidden="true" className={isRTL ? 'rotate-180' : ''} />
              {t.notMe}
            </button>
          </div>
          <div>
            <label htmlFor="student-pin-input" className="mb-2 block text-base font-bold">
              {t.typeYourPin}
            </label>
            <input
              ref={pinInputRef}
              id="student-pin-input"
              name="pin"
              type="text"
              dir="ltr"
              inputMode="text"
              autoComplete="one-time-code"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={PIN_LENGTH}
              disabled={signingIn}
              value={pin}
              onChange={(e) => {
                setPin(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, '')
                    .slice(0, PIN_LENGTH)
                );
                if (pinError) setPinError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pin.length === PIN_LENGTH) handleSubmit();
              }}
              placeholder="••••••"
              className="min-h-16 w-full rounded-2xl border-2 border-[#cdd1db] bg-[#f8f9fc] px-3 py-4 text-center font-mono text-3xl font-black tracking-[.25em] text-[#1d2940] placeholder:text-[#adb4c2] focus:border-violet-600 focus:outline-2 focus:outline-violet-200"
              aria-invalid={Boolean(pinError)}
              aria-describedby={pinError ? 'pin-error' : undefined}
            />
          </div>
          {pinError && (
            <div
              id="pin-error"
              role="alert"
              className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800"
            >
              <AlertTriangle size={18} aria-hidden="true" className="shrink-0" />
              {pinError}
            </div>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pin.length !== PIN_LENGTH || signingIn}
            className="flex min-h-14 w-full touch-manipulation items-center justify-between gap-3 rounded-2xl bg-[#1d2940] p-3 ps-5 text-lg font-extrabold text-white hover:bg-[#303f5b] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
          >
            {signingIn ? t.signingIn : t.letsGo}
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d8f36a] text-[#1d2940]">
              <ArrowRight size={20} aria-hidden="true" className="rtl:rotate-180" />
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentPinLoginCard;
