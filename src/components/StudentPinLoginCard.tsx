import type { FC } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, KeyRound, Search, AlertTriangle, Sparkles } from "lucide-react";
import { supabase } from "../core/supabase";

interface RosterEntry {
  id: string;
  displayName: string;
  email: string;
  avatar: string;
}

interface Props {
  classCode: string;
  /** Called after successful signInWithPassword.  App.tsx's auth listener
   *  then hydrates the AppUser from public.users. */
  onSuccess: () => void;
  /** Called when the student doesn't see their name and wants to fall
   *  back to Google/Microsoft/email-OTP. */
  onUseDifferentMethod: () => void;
}

const PIN_LENGTH = 6;
// Mirror the server-side regex in 20260513_student_roster_pins.sql
// (no I/L/O, no 0/1).
const PIN_REGEX = /^[A-HJ-KM-NP-Z2-9]{6}$/;

const StudentPinLoginCard: FC<Props> = ({ classCode, onSuccess, onUseDifferentMethod }) => {
  const [step, setStep] = useState<"pick" | "pin">("pick");
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<RosterEntry | null>(null);
  const [pin, setPin] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
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
      setRosterError(e instanceof Error ? e.message : "Could not load class list");
    } finally {
      setRosterLoading(false);
    }
  }, [classCode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRoster();
  }, [loadRoster]);

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
    setStep("pin");
  };

  const handleBack = () => {
    setStep("pick");
    setPin("");
    setPinError(null);
  };

  const handleSubmit = async () => {
    if (!selected || signingIn) return;
    const cleanPin = pin.trim().toUpperCase();
    if (!PIN_REGEX.test(cleanPin)) {
      setPinError("PIN must be 6 characters (letters A–Z and digits 2–9, no I/L/O/0/1).");
      return;
    }
    setSigningIn(true);
    setPinError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: selected.email,
        password: cleanPin,
      });
      if (error) {
        if (/invalid login/i.test(error.message)) {
          setPinError("That PIN doesn't match. Ask your teacher to check it, or to reset your PIN.");
        } else {
          setPinError(error.message);
        }
        return;
      }
      // Best-effort last-login bookkeeping — don't block on it.
      void supabase.rpc("student_touch_last_login");
      onSuccess();
    } catch (e) {
      setPinError(e instanceof Error ? e.message : "Sign-in failed. Try again.");
    } finally {
      setSigningIn(false);
    }
  };

  const filtered = filter.trim()
    ? roster.filter(r => r.displayName.toLowerCase().includes(filter.trim().toLowerCase()))
    : roster;

  // -------- Render: PIN step --------
  if (step === "pin" && selected) {
    return (
      <motion.div
        key="pin-step"
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -12 }}
        className="space-y-4"
      >
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 px-2 py-1 rounded-md hover:bg-stone-100 transition-colors"
          style={{ touchAction: "manipulation" }}
        >
          <ArrowLeft size={12} /> Not me
        </button>

        <div className="flex items-center gap-3 bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-4">
          <span className="text-3xl">{selected.avatar}</span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">Signing in as</p>
            <p className="text-lg font-black text-stone-900 truncate">{selected.displayName}</p>
          </div>
        </div>

        <div>
          <label htmlFor="student-pin-input" className="block text-[11px] font-black uppercase tracking-[0.2em] text-stone-500 mb-2 text-center">
            Type your PIN
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
            className="w-full text-center text-3xl font-black tracking-[0.4em] font-mono py-4 rounded-2xl border-2 border-stone-200 focus:border-indigo-500 outline-none text-stone-900 placeholder:text-stone-300"
            aria-describedby={pinError ? "pin-error" : undefined}
          />
        </div>

        {pinError && (
          <motion.div
            id="pin-error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-sm font-bold flex items-start gap-2"
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
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-600 text-white font-black text-base shadow-lg shadow-violet-500/30 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
          style={{ touchAction: "manipulation" }}
        >
          {signingIn ? "Signing in…" : (<><Sparkles size={18} /> Let's go</>)}
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
    >
      <div className="flex items-center gap-2 text-stone-900">
        <KeyRound size={18} className="text-indigo-600" />
        <p className="font-black text-sm">Pick your name</p>
      </div>

      {rosterLoading ? (
        <p className="text-center text-sm text-stone-500 py-8">Loading class list…</p>
      ) : rosterError ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-sm font-bold flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{rosterError}</span>
        </div>
      ) : roster.length === 0 ? (
        <div className="text-center py-6 px-3 bg-amber-50 border border-amber-200 rounded-2xl">
          <p className="text-3xl mb-2">🦊</p>
          <p className="text-sm font-bold text-amber-900">No students yet in this class</p>
          <p className="text-xs text-amber-800 mt-1">
            Ask your teacher to add you to the class roster, then come back. Or use a different sign-in method below.
          </p>
        </div>
      ) : (
        <>
          {roster.length > 8 && (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Find your name…"
                className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-stone-200 focus:border-indigo-500 outline-none text-sm font-medium"
              />
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
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
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-stone-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-left"
                  style={{ touchAction: "manipulation" }}
                >
                  <span className="text-2xl shrink-0">{s.avatar}</span>
                  <span className="font-bold text-sm text-stone-900 truncate flex-1">{s.displayName}</span>
                </motion.button>
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <p className="col-span-full text-center text-xs text-stone-500 py-4">
                No names match "{filter}".
              </p>
            )}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={onUseDifferentMethod}
        className="w-full text-xs font-bold text-stone-500 hover:text-stone-900 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-stone-100 transition-colors"
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as unknown as string }}
      >
        I don't see my name — use a different sign-in method
      </button>
    </motion.div>
  );
};

export default StudentPinLoginCard;
