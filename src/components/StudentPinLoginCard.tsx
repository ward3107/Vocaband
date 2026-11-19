import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, KeyRound, Search, AlertTriangle, RotateCw } from 'lucide-react';
import { supabase } from '../core/supabase';
import { useLanguage } from '../hooks/useLanguage';
import { useBackLayer } from '../hooks/useBackLayer';
import { classEntryT } from '../locales/class-entry';
import StudentScanPin, { useScanWindow } from './StudentScanPin';
import { scanPinT } from '../locales/student/scan-pin';
import { studentPinLoginT } from '../locales/student/student-pin-login';

interface RosterEntry {
  id: string;
  displayName: string;
  email: string;
  avatar: string;
}

interface Props {
  classCode: string;
  guidedJoin?: boolean;
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
  guidedJoin = false,
  prefilledStudentId,
  onSuccess,
  onTier2Login,
  onStepChange,
  onBusyChange,
}) => {
  const { language, dir, isRTL } = useLanguage();
  const t = studentPinLoginT[language];
  const scanCopy = scanPinT[language];
  const [scan, setScan] = useState<{ profile: string | null } | null>(null);
  const availability = useScanWindow(classCode, Boolean(scan));
  const [showRoster, setShowRoster] = useState(!guidedJoin);
  const [delivered, setDelivered] = useState<string | null>(null);
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

  // Shared invites need the class list only once a returning student chooses it.
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
    if (showRoster) void loadRoster();
  }, [loadRoster, showRoster]);

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
  const enterRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!selected || scan) return;
    const id = window.setTimeout(() => {
      if (delivered === selected.id) enterRef.current?.focus();
      else pinInputRef.current?.focus();
      pinPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
    return () => window.clearTimeout(id);
  }, [selected, delivered, scan]);

  const handlePick = (s: RosterEntry) => {
    setDelivered(null);
    setSelected(s);
    setPin('');
    setPinError(null);
    // Different student selected → start the wrong-PIN counter fresh.
    setWrongPinCount(0);
    if (guidedJoin) setScan({ profile: s.id });
  };

  // "Not me" / change — clear the selection to collapse the PIN panel
  // and return focus to the name list.
  const clearSelection = (): void | false => {
    if (signingIn) return false;
    setDelivered(null);
    setSelected(null);
    setPin('');
    setPinError(null);
    setWrongPinCount(0);
    requestAnimationFrame(() => nameListRef.current?.focus());
  };
  useBackLayer(clearSelection, { enabled: Boolean(selected), priority: 20, escape: false });
  const returnToChoices = () => {
    setShowRoster(false);
    setFilter('');
  };
  useBackLayer(returnToChoices, {
    enabled: guidedJoin && showRoster && !selected,
    priority: 15,
    escape: false,
  });

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
          setDelivered(null);
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
          setDelivered(null);
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
  const canOfferNewPin = availability.window?.can_add !== false;
  const deliveredPin = selected !== null && delivered === selected.id;
  const newStudentButton = (
    <button
      type="button"
      className="min-h-12 w-full rounded-xl bg-violet-700 px-4 py-3 text-base font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
      onClick={() => setScan({ profile: null })}
    >
      {scanCopy.newStudent}
    </button>
  );

  if (scan)
    return (
      <StudentScanPin
        code={classCode}
        availability={availability}
        profile={scan.profile}
        language={language}
        onRetryWindow={availability.refresh}
        onBack={() => {
          if (guidedJoin && scan.profile) clearSelection();
          setScan(null);
        }}
        onUsePin={scan.profile ? () => setScan(null) : undefined}
        onReady={(row) => {
          consumedPrefillRef.current = true;
          setSelected({
            id: row.id,
            displayName: row.displayName,
            email: row.email,
            avatar: row.avatar || '🦊',
          });
          setPin(row.pin);
          setDelivered(row.id);
          setPinError(null);
          setScan(null);
        }}
      />
    );
  return (
    <div className="space-y-4 text-[#1d2940]" dir={dir}>
      {!selected && !showRoster && (
        <div className="grid gap-3">
          {canOfferNewPin && newStudentButton}
          <button
            type="button"
            className="min-h-12 w-full rounded-xl border border-violet-200 px-4 py-3 text-base font-bold text-violet-800 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
            onClick={() => setShowRoster(true)}
          >
            {scanCopy.returning}
          </button>
        </div>
      )}
      {!selected && showRoster && (
        <div ref={nameListRef} tabIndex={-1} className="outline-none">
          {!guidedJoin && availability.window?.can_add && (
            <div className="mb-4">{newStudentButton}</div>
          )}
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <KeyRound size={20} className="text-violet-600" aria-hidden="true" />
            {isCoded ? t.findYourCode : t.pickYourName}
          </h2>
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
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="font-bold">{t.emptyRosterTitle}</p>
              <p className="mt-1 text-sm text-slate-700">{t.emptyRosterBody}</p>
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
              <div className="grid max-h-[45dvh] gap-2 overflow-y-auto p-1 sm:grid-cols-2">
                {filtered.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handlePick(student)}
                    className="flex min-h-12 min-w-0 touch-manipulation items-center gap-2 rounded-xl border border-[#dfe2e9] bg-white px-3 py-2 text-start hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-600"
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-xl"
                    >
                      {student.avatar}
                    </span>
                    <span className="min-w-0 break-words text-base font-bold">
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
          {guidedJoin && (
            <button
              type="button"
              className="mt-1 min-h-11 px-2 text-sm font-bold text-violet-800 underline"
              onClick={returnToChoices}
            >
              {scanCopy.cancel}
            </button>
          )}
        </div>
      )}
      {selected && (
        <div ref={pinPanelRef} className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-xl"
              aria-hidden="true"
            >
              {selected.avatar}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#606b7e]">{t.signingInAs}</p>
              <p className="mt-0.5 break-words text-base font-bold">{selected.displayName}</p>
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
          {deliveredPin ? (
            <div className="rounded-2xl bg-violet-50 p-4 text-center" data-sentry-block>
              <p className="text-sm font-semibold text-slate-700">{scanCopy.pin}</p>
              <bdi dir="ltr" className="select-all font-mono text-4xl font-black tracking-widest">
                {pin}
              </bdi>
              <p className="text-sm text-slate-700">{scanCopy.delivered}</p>
            </div>
          ) : (
            <div>
              <label htmlFor="student-pin-input" className="mb-2 block text-base font-bold">
                {t.typeYourPin}
              </label>
              <input
                ref={pinInputRef}
                id="student-pin-input"
                data-sentry-block
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
          )}
          {!deliveredPin && (
            <button
              type="button"
              className="min-h-11 px-2 font-bold text-violet-700 underline"
              disabled={signingIn}
              onClick={() => setScan({ profile: selected.id })}
            >
              {scanCopy.existing}
            </button>
          )}
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
            ref={enterRef}
            onClick={handleSubmit}
            disabled={pin.length !== PIN_LENGTH || signingIn}
            className="flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-lg font-bold text-white hover:bg-violet-800 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
          >
            {signingIn ? t.signingIn : deliveredPin ? scanCopy.enterClass : t.letsGo}
            <ArrowRight size={18} aria-hidden="true" className="rtl:rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentPinLoginCard;
