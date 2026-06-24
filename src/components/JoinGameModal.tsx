/**
 * JoinGameModal — lets a logged-in student join the teacher's live Quick
 * Play game from INSIDE the app.  Before this, the only join path was
 * scanning the teacher's QR with the phone's native camera, which meant
 * leaving Vocaband entirely.  Now the student taps "Join" on their
 * dashboard and either:
 *   1. types the 6-char code the teacher is showing (works on every
 *      device — the primary, always-available path), or
 *   2. scans the QR with the in-app camera (QrScannerModal; the fast lane
 *      on browsers with BarcodeDetector, silently falling back to #1).
 *
 * Both paths resolve to the same thing: navigate to /?session=CODE, which
 * the existing Quick Play URL bootstrap (useQuickPlayUrlBootstrap) already
 * knows how to turn into a joined session.  We deliberately reuse that
 * battle-tested entry point rather than re-implement session loading here.
 */
import { useState } from "react";
import { motion } from "motion/react";
import { X, ScanLine, ArrowRight } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import QrScannerModal from "./QrScannerModal";

interface JoinGameModalProps {
  onClose: () => void;
}

/** Session codes are exactly 6 chars from the ambiguity-free alphabet
 *  generate_session_code() uses (A-H, J-N, P-Z, 2-9). A scanned QR carries
 *  a full URL (…/?session=ABC123); a typed entry is the bare code. Pull the
 *  first valid 6-char run out of either so a slightly mangled value (the
 *  whole link re-appended, stray spaces) still joins. Mirrors the sanitiser
 *  in useQuickPlayUrlBootstrap so behaviour matches the QR-scan path. */
function extractSessionCode(raw: string): string | null {
  if (!raw) return null;
  const paramMatch = raw.match(/session=([A-Za-z0-9]+)/i);
  const candidate = (paramMatch ? paramMatch[1] : raw).toUpperCase();
  const m = candidate.match(/[A-HJ-NP-Z2-9]{6}/);
  return m ? m[0] : null;
}

export default function JoinGameModal({ onClose }: JoinGameModalProps) {
  const { language, dir, isRTL } = useLanguage();
  const L = (en: string, he: string, ar: string): string =>
    language === "he" ? he : language === "ar" ? ar : en;

  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Both join paths converge here: a full-page navigation to /?session=CODE
  // lets the on-mount Quick Play bootstrap own session loading + auth.
  const join = (raw: string) => {
    const sessionCode = extractSessionCode(raw);
    if (!sessionCode) {
      setError(L("That code doesn't look right. Check it and try again.",
        "הקוד לא נראה תקין. בדקו ונסו שוב.",
        "هذا الرمز غير صحيح. تحقق وحاول مرة أخرى."));
      return;
    }
    window.location.assign(`${window.location.origin}/?session=${sessionCode}`);
  };

  // Strip to the allowed alphabet as the student types so the field can't
  // hold a value the session lookup would reject.
  const onChangeCode = (v: string) => {
    setError(null);
    setCode(v.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, "").slice(0, 6));
  };

  const canJoin = code.length === 6;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        dir={dir}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="relative w-full max-w-sm rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 shadow-2xl shadow-fuchsia-500/30"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={L("Close", "סגור", "إغلاق")}
            className={`absolute top-4 ${isRTL ? "left-4" : "right-4"} flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/20 transition-transform active:scale-95`}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
          >
            <X size={18} />
          </button>

          <div className="mb-1 text-center text-4xl">🎮</div>
          <h2 className="text-center text-xl font-extrabold text-white">
            {L("Join a game", "הצטרפו למשחק", "انضم إلى لعبة")}
          </h2>
          <p className="mt-1 text-center text-sm text-white/80">
            {L("Enter the code your teacher is showing.",
              "הזינו את הקוד שהמורה מציג/ה.",
              "أدخل الرمز الذي يعرضه معلمك.")}
          </p>

          <input
            value={code}
            onChange={(e) => onChangeCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && canJoin) join(code); }}
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={6}
            placeholder="ABC123"
            aria-label={L("Game code", "קוד משחק", "رمز اللعبة")}
            className="mt-5 w-full rounded-2xl bg-white/95 px-4 py-4 text-center font-mono text-3xl font-extrabold uppercase tracking-[0.3em] text-indigo-900 placeholder:text-indigo-300 focus:outline-none focus:ring-4 focus:ring-amber-300"
          />

          {error && (
            <p className="mt-2 text-center text-sm font-semibold text-amber-200">{error}</p>
          )}

          <button
            type="button"
            onClick={() => join(code)}
            disabled={!canJoin}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-4 text-lg font-extrabold text-white shadow-lg shadow-orange-500/30 transition-transform active:scale-95 disabled:opacity-40 disabled:active:scale-100"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
          >
            {L("Join", "הצטרפו", "انضم")}
            <ArrowRight className={`h-5 w-5 ${isRTL ? "rotate-180" : ""}`} />
          </button>

          {/* Divider */}
          <div className="my-4 flex items-center gap-3 text-white/60">
            <span className="h-px flex-1 bg-white/25" />
            <span className="text-xs font-bold uppercase">{L("or", "או", "أو")}</span>
            <span className="h-px flex-1 bg-white/25" />
          </div>

          <button
            type="button"
            onClick={() => { setError(null); setScanning(true); }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/15 px-6 py-3.5 text-base font-bold text-white ring-1 ring-white/25 transition-transform active:scale-95"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
          >
            <ScanLine className="h-5 w-5" />
            {L("Scan QR code", "סרקו קוד QR", "امسح رمز QR")}
          </button>
        </motion.div>
      </motion.div>

      {scanning && (
        <QrScannerModal
          onDetect={(raw) => { setScanning(false); join(raw); }}
          onCancel={() => setScanning(false)}
          // Browser can't scan (iOS Safari / denied / no camera) — drop back
          // to the type-the-code field, which always works.
          onUnsupported={() => {
            setScanning(false);
            setError(L("Scanning isn't available here — type the code above.",
              "סריקה לא זמינה כאן — הקלידו את הקוד למעלה.",
              "المسح غير متاح هنا — اكتب الرمز بالأعلى."));
          }}
        />
      )}
    </>
  );
}
