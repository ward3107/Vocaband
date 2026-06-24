/**
 * QrScannerModal — full-screen in-app QR scanner so a student who is
 * ALREADY logged into Vocaband can join the teacher's live game without
 * leaving the app to use their phone's native camera.  Reuses the same
 * in-tab getUserMedia pattern as InPageCamera (which exists precisely so
 * low-RAM Android phones don't evict the Vocaband tab when the OS camera
 * intent launches), but instead of a shutter it runs a scan loop over the
 * live frames with the native BarcodeDetector API.
 *
 * BarcodeDetector ships on Chrome/Android (the bulk of Israeli school
 * devices) but NOT on iOS Safari.  Rather than pull in a heavy JS decoder,
 * we degrade gracefully: when the API is missing we surface onUnsupported
 * so the caller can fall back to the always-available "type the code"
 * path.  That keeps scan as the fast lane and type-the-code as the safety
 * net every device can use.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { X, AlertTriangle, Keyboard, ScanLine } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";

// BarcodeDetector isn't in lib.dom's typings yet — declare the slice we use.
interface DetectedBarcode { rawValue: string }
interface BarcodeDetectorLike { detect(source: CanvasImageSource): Promise<DetectedBarcode[]> }
interface BarcodeDetectorCtor {
  new (opts?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
}

export interface QrScannerModalProps {
  /** Called with the raw decoded QR text (a URL or bare code). The caller
   *  is responsible for extracting + validating the session code. */
  onDetect: (rawValue: string) => void;
  /** Dismissed without scanning. */
  onCancel: () => void;
  /** Fired when the browser can't scan (no BarcodeDetector / no camera /
   *  permission denied) so the caller can route to the type-code path. */
  onUnsupported: () => void;
}

export default function QrScannerModal({ onDetect, onCancel, onUnsupported }: QrScannerModalProps) {
  const { language } = useLanguage();
  const L = (en: string, he: string, ar: string): string =>
    language === "he" ? he : language === "ar" ? ar : en;

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  // Latch so a barcode found across consecutive frames only fires once.
  const doneRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    // No native scanner (iOS Safari, older browsers) → hand back to caller
    // so the type-the-code field takes over. Nothing to clean up yet.
    if (!Ctor || !navigator.mediaDevices?.getUserMedia) {
      onUnsupported();
      return;
    }

    let cancelled = false;
    const detector = new Ctor({ formats: ["qr_code"] });

    const scanFrame = async () => {
      if (cancelled || doneRef.current) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        try {
          const codes = await detector.detect(video);
          const hit = codes.find((c) => c.rawValue);
          if (hit && !doneRef.current) {
            doneRef.current = true;
            stop();
            onDetect(hit.rawValue);
            return;
          }
        } catch {
          // Transient decode error on a frame — keep scanning.
        }
      }
      rafRef.current = requestAnimationFrame(scanFrame);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setReady(true);
        rafRef.current = requestAnimationFrame(scanFrame);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        // Denied / no camera → let the caller fall back to typing rather
        // than dead-ending the student on an error screen.
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError" || err.name === "NotFoundError") {
          onUnsupported();
          return;
        }
        setError(`${err.name}: ${err.message}`);
      });

    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] bg-black flex flex-col"
      role="dialog"
      aria-label={L("Scan QR code", "סריקת קוד QR", "مسح رمز QR")}
    >
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
        <button
          type="button"
          onClick={() => { stop(); onCancel(); }}
          aria-label={L("Close", "סגור", "إغلاق")}
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
        >
          <X className="w-6 h-6" />
        </button>
        <span className="text-white/90 text-sm font-bold">
          {ready
            ? L("Point at the QR code", "כוונו אל קוד ה-QR", "وجّه نحو رمز QR")
            : error
              ? L("Camera unavailable", "המצלמה לא זמינה", "الكاميرا غير متاحة")
              : L("Starting camera…", "מפעיל מצלמה…", "يتم تشغيل الكاميرا…")}
        </span>
        <span className="w-10" />
      </div>

      {!error && (
        <video ref={videoRef} autoPlay playsInline muted className="flex-1 w-full h-full object-cover" />
      )}

      {/* Aiming reticle — a centred square so kids know where to point. */}
      {ready && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative w-64 h-64 max-w-[70vw] max-h-[70vw]">
            <span className="absolute inset-0 rounded-3xl border-2 border-white/70" />
            <ScanLine className="absolute left-1/2 top-1/2 w-10 h-10 -translate-x-1/2 -translate-y-1/2 text-white/80" />
          </div>
        </div>
      )}

      {error && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-sm text-center text-white">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-rose-400" />
            </div>
            <p className="text-sm text-white/80 mb-6 leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={() => { stop(); onUnsupported(); }}
              className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as never }}
            >
              <Keyboard className="w-5 h-5" />
              {L("Type the code instead", "הקלידו את הקוד במקום", "اكتب الرمز بدلاً من ذلك")}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
