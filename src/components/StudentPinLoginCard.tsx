import type { FC } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, KeyRound, Search, AlertTriangle, Sparkles } from "lucide-react";
import { supabase } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import { studentPinLoginT } from "../locales/student/student-pin-login";

interface RosterEntry {
  id: string;
  displayName: string;
  email: string;
  avatar: string;
}

interface Props {
  classCode: string;
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

const StudentPinLoginCard: FC<Props> = ({ classCode, prefilledStudentId, onSuccess, onTier2Login }) => {
  const { language, dir, isRTL } = useLanguage();
  const t = studentPinLoginT[language];
  const [step, setStep] = useState<"pick" | "pin">("pick");
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<RosterEntry | null>(null);
  const [pin, setPin] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  // Per-session wrong-PIN counter.  After 3 fails we swap to the
  // "ask your teacher to reset" copy — purely a UX softening, not a
  // security limit (state is in-memory + resets on refresh).  Real
  // brute-force protection lives in GoTrue's per-IP defaults.
  const [wrongPinCount, setWrongPinCount] = useState(0);
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
      const { data, error } = await supabase.rpc("class_roster_for_login", {
        p_class_code: classCode,
      });
      if (error) throw error;
      const mapped: RosterEntry[] = (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        displayName: r.display_name as string,
        email: r.email as string,
        avatar: (r.avatar as string) || "🦊",
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

  // Teacher-invite-link prefill: once the roster has loaded, if the
  // URL carried a ?s=<student_profile_id> and it matches a row, jump
  // straight to the PIN step.  Only fires once per page-load by
  // tracking whether we've already consumed the prefilled id.  If the
  // student taps "Not me" we don't re-arm — they're already in the
  // picker by then and re-prefilling would feel haunted.
  const consumedPrefillRef = useRef(false);
  useEffect(() => {
    if (consumedPrefillRef.current) return;
    if (!prefilledStudentId) return;
    if (rosterLoading || roster.length === 0) return;
    const match = roster.find(r => r.id.toLowerCase() === prefilledStudentId.toLowerCase());
    if (!match) {
      // Stale or wrong id — silently fall through to the normal
      // picker instead of confusing the student with an error.
      consumedPrefillRef.current = true;
      return;
    }
    consumedPrefillRef.current = true;
    setSelected(match);
    setPin("");
    setPinError(null);
    setStep("pin");
  }, [prefilledStudentId, roster, rosterLoading]);

  // Auto-focus the PIN input when the student moves to the PIN step.
  // On mobile this cues the soft keyboard, on desktop their first
  // keystroke lands in the right place.
  useEffect(() => {
    if (step !== "pin") return;
    const id = window.setTimeout(() => pinInputRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [step]);

  const handlePick = (s: RosterEntry) => {
    setSelected(s);
    setPin("");
    setPinError(null);
    // Different student selected → start the wrong-PIN counter fresh.
    setWrongPinCount(0);
    setStep("pin");
  };

  // Phone back-button trap for the pick → pin sub-steps.
  //
  // These steps are component state, not router views, so without this the
  // hardware/edge back button on the PIN screen bubbles to the global
  // back-trap and jumps the student all the way out to the landing page
  // instead of back to the name list. Push a marker history entry when
  // entering the PIN step and intercept popstate in the capture phase to
  // walk back to "pick". The "pick" step is left alone, so back there
  // still falls through to the global trap (→ landing) as before.
  const pinMarkerRef = useRef(false);
  const suppressPinPopRef = useRef(false);
  useEffect(() => {
    if (step !== "pin") return;
    window.history.pushState({ studentLoginStep: "pin" }, "");
    pinMarkerRef.current = true;
  }, [step]);
  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      // Swallow the synthetic pop fired by handleBack()'s history.back().
      if (suppressPinPopRef.current) {
        suppressPinPopRef.current = false;
        e.stopImmediatePropagation();
        return;
      }
      if (step !== "pin") return; // let the global trap handle "pick"
      e.stopImmediatePropagation();
      pinMarkerRef.current = false; // the back press consumed the marker
      setStep("pick");
      setPin("");
      setPinError(null);
    };
    window.addEventListener("popstate", handler, { capture: true });
    return () => window.removeEventListener("popstate", handler, { capture: true });
  }, [step]);

  const handleBack = () => {
    setStep("pick");
    setPin("");
    setPinError(null);
    // Consume the marker we pushed on entering the PIN step so a later
    // hardware-back isn't wasted re-popping a stale entry.
    if (pinMarkerRef.current) {
      pinMarkerRef.current = false;
      suppressPinPopRef.current = true;
      window.history.back();
    }
  };

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
          void supabase.rpc("student_touch_last_login");
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
      void supabase.rpc("student_touch_last_login");
      onSuccess();
    } catch (e) {
      setPinError(e instanceof Error ? e.message : t.genericSignInError);
    } finally {
      setSigningIn(false);
    }
  };

  const filtered = filter.trim()
    ? roster.filter(r => r.displayName.toLowerCase().includes(filter.trim().toLowerCase()))
    : roster;

  // Coded classes (anonymous codes like "07-5-2-14") are far less scannable
  // than names, so always show the filter and ask the student to type their
  // code rather than hunt the grid.
  const isCoded = roster.length > 0 && roster.every(r => /^\d/.test(r.displayName));
  const showFilter = roster.length > 8 || isCoded;

  // -------- Render: PIN step --------
  if (step === "pin" && selected) {
    return (
      <motion.div
        key="pin-step"
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -12 }}
        className="space-y-4"
        dir={dir}
      >
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 px-2 py-1 rounded-md hover:bg-stone-100 transition-colors"
          style={{ touchAction: "manipulation" }}
        >
          <ArrowLeft size={12} className={isRTL ? "rotate-180" : ""} /> {t.notMe}
        </button>

        <div className="flex items-center gap-3 bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-4">
          <span className="text-3xl">{selected.avatar}</span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">{t.signingInAs}</p>
            <p className="text-lg font-black text-stone-900 truncate">{selected.displayName}</p>
          </div>
        </div>

        <div>
          <label htmlFor="student-pin-input" className="block text-[11px] font-black uppercase tracking-[0.2em] text-stone-500 mb-2 text-center">
            {t.typeYourPin}
          </label>
          <input
            ref={pinInputRef}
            id="student-pin-input"
            name="pin"
            type="text"
            inputMode="text"
            autoComplete="one-time-code"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={PIN_LENGTH}
            value={pin}
            onChange={e => {
              const next = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, PIN_LENGTH);
              setPin(next);
              if (pinError) setPinError(null);
            }}
            onKeyDown={e => {
              if (e.key === "Enter" && pin.length === PIN_LENGTH) handleSubmit();
            }}
            placeholder="• • • • • •"
            className="w-full text-center text-3xl font-black tracking-[0.4em] font-mono py-4 rounded-xl border-2 border-stone-200 focus:border-indigo-500 outline-none text-stone-900 placeholder:text-stone-300"
            aria-describedby={pinError ? "pin-error" : undefined}
          />
        </div>

        {pinError && (
          <motion.div
            id="pin-error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg text-sm font-bold flex items-start gap-2"
            role="alert"
          >
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{pinError}</span>
          </motion.div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={pin.length !== PIN_LENGTH || signingIn}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-600 text-white font-black text-base shadow-lg shadow-violet-500/30 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
          style={{ touchAction: "manipulation" }}
        >
          {signingIn ? t.signingIn : (<><Sparkles size={18} /> {t.letsGo}</>)}
        </button>
      </motion.div>
    );
  }

  // -------- Render: roster picker --------
  return (
    <motion.div
      key="pick-step"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
      dir={dir}
    >
      <div className="flex items-center gap-2 text-stone-900">
        <KeyRound size={18} className="text-indigo-600" />
        <p className="font-black text-sm">{t.pickYourName}</p>
      </div>

      {rosterLoading ? (
        <p className="text-center text-sm text-stone-500 py-8">{t.loading}</p>
      ) : rosterError ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg text-sm font-bold flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{rosterError}</span>
        </div>
      ) : roster.length === 0 ? (
        <div className="text-center py-6 px-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-3xl mb-2">🦊</p>
          <p className="text-sm font-bold text-amber-900">{t.emptyRosterTitle}</p>
          <p className="text-xs text-amber-800 mt-1">
            {t.emptyRosterBody}
          </p>
        </div>
      ) : (
        <>
          {showFilter && (
            <div className="relative">
              <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder={isCoded ? t.findYourCode : t.findYourName}
                className="w-full ps-9 pe-3 py-2 rounded-lg border-2 border-stone-200 focus:border-indigo-500 outline-none text-sm font-medium"
              />
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pe-1">
            <AnimatePresence initial={false}>
              {filtered.map(s => (
                <motion.button
                  layout
                  key={s.id}
                  type="button"
                  onClick={() => handlePick(s)}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-stone-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-start"
                  style={{ touchAction: "manipulation" }}
                >
                  <span className="text-2xl shrink-0">{s.avatar}</span>
                  <span className="font-bold text-sm text-stone-900 truncate flex-1">{s.displayName}</span>
                </motion.button>
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <p className="col-span-full text-center text-xs text-stone-500 py-4">
                {t.noMatches(filter)}
              </p>
            )}
          </div>
        </>
      )}

    </motion.div>
  );
};

export default StudentPinLoginCard;
