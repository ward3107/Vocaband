/**
 * InPageCamera — full-screen camera modal that runs the live preview
 * INSIDE the Vocaband tab via getUserMedia.  Replaces the previous
 * <input type="file" capture="environment"> approach which launched the
 * OS Camera app and caused Android Chrome on memory-constrained phones
 * (Samsung Galaxy A series, low-RAM Xiaomis) to evict the Vocaband tab
 * to free RAM for the camera.  When the teacher returned from the
 * camera intent, Chrome reloaded the page and the wizard with all its
 * state was gone — OCR words landed in a dead React tree.
 *
 * In-page camera sidesteps that entirely: the camera stream is a
 * MediaStream attached to a <video> element in the same document, so
 * Chrome has no reason to kill the tab.  When the user taps Capture,
 * we draw the current video frame to a hidden <canvas>, convert to a
 * JPEG Blob, wrap it in a File, and hand it back via onCapture(file)
 * — exactly the same shape the gallery <input type="file"> path
 * already produces, so downstream OCR code (handleOcrUpload) doesn't
 * change.
 *
 * Permissions: getUserMedia requires HTTPS and a user gesture.  Both
 * conditions are met (vocaband.com is HTTPS; the modal is opened from
 * a button tap).  Browser will prompt for camera permission on first
 * use and remember the choice for the origin.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Camera, X, AlertTriangle, RefreshCw, Image as ImageIcon } from "lucide-react";

export interface InPageCameraProps {
  /** Called with a JPEG File when the user captures a frame. */
  onCapture: (file: File) => void;
  /** Called when the user dismisses the camera without capturing. */
  onCancel: () => void;
  /** Optional fallback — if camera permission is denied or the stream
   *  fails to start, show a "Pick from gallery instead" button that
   *  invokes this callback.  Caller is responsible for opening the
   *  gallery file picker; we just close the camera modal first. */
  onUseGallery?: () => void;
}

export default function InPageCamera({ onCapture, onCancel, onUseGallery }: InPageCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  // Acquire the stream on mount.  Re-runs when facingMode flips so the
  // teacher can swap between rear (default, for documents) and front
  // cameras if their device only has a front camera or they want a
  // selfie-style framing for some reason.
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);

    // Stop any prior stream before grabbing a new one.
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "This browser doesn't support in-page camera access. Use the Gallery option instead — take a photo with your phone's Camera app first, then come back and choose it from your gallery."
      );
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setReady(true);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        // NotAllowedError → permission denied; NotFoundError → no
        // camera; OverconstrainedError → no rear camera; etc.
        const name = err.name || "Error";
        const msg = err.message || "Camera access failed.";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setError("Camera permission denied. Tap the lock icon in your browser's address bar and allow Camera, then try again.");
        } else if (name === "NotFoundError") {
          setError("No camera found on this device.");
        } else {
          setError(`${name}: ${msg}`);
        }
      });

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !ready || capturing) return;
    setCapturing(true);

    // Snapshot the current frame at the video's native resolution so
    // OCR has the most detail to work with.  videoWidth/Height reflect
    // the actual stream resolution, not the on-screen rendered size.
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w === 0 || h === 0) {
      setCapturing(false);
      return;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCapturing(false);
      return;
    }
    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob(
      (blob) => {
        setCapturing(false);
        if (!blob) return;
        const file = new File([blob], `ocr-capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        onCapture(file);
      },
      "image/jpeg",
      0.9, // High quality for OCR — the server compresses anyway if needed
    );
  }, [ready, capturing, onCapture]);

  const handleSwitchCamera = useCallback(() => {
    setFacingMode((m) => (m === "environment" ? "user" : "environment"));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] bg-black flex flex-col"
      role="dialog"
      aria-label="Camera"
    >
      {/* Top bar — close button */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close camera"
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as any }}
        >
          <X className="w-6 h-6" />
        </button>
        <span className="text-white/90 text-sm font-bold">
          {ready ? "Position the words inside the frame" : error ? "Camera unavailable" : "Starting camera…"}
        </span>
        <button
          type="button"
          onClick={handleSwitchCamera}
          aria-label="Switch camera"
          disabled={!ready}
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white disabled:opacity-40"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as any }}
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Live preview — fills viewport, object-cover so framing reads
          correctly even if video aspect ratio differs from screen. */}
      {!error && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="flex-1 w-full h-full object-cover"
        />
      )}

      {/* Error state — gives clear next step instead of a silent black
          screen if the browser refuses to start the camera. */}
      {error && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-sm text-center text-white">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-rose-400" />
            </div>
            <p className="text-base font-semibold mb-3">Couldn't open the camera</p>
            <p className="text-sm text-white/80 mb-6 leading-relaxed">{error}</p>
            {/* Gallery fallback — when camera is blocked, the teacher
                shouldn't have to back out of the modal and tap Gallery
                themselves.  Surface it inline so the path stays
                "tap → pick photo → done" with no detour. */}
            {onUseGallery && (
              <button
                type="button"
                onClick={() => {
                  onCancel();      // close the camera modal first
                  onUseGallery();  // then open the gallery picker
                }}
                className="w-full px-6 py-3 mb-3 rounded-xl bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as any }}
              >
                <ImageIcon className="w-5 h-5" />
                Pick from gallery instead
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 rounded-xl bg-white/10 text-white font-bold text-sm border border-white/20"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as any }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Bottom shutter — only when stream is ready */}
      {ready && !error && (
        <div className="absolute bottom-0 inset-x-0 z-10 px-6 pb-8 pt-12 bg-gradient-to-t from-black/70 to-transparent">
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleCapture}
              disabled={capturing}
              aria-label="Capture photo"
              className="relative w-20 h-20 rounded-full bg-[var(--vb-surface)] border-4 border-white/40 active:scale-95 transition-transform disabled:opacity-60"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" as any }}
            >
              <span className="absolute inset-2 rounded-full bg-[var(--vb-surface)]" />
              <span className="absolute inset-0 flex items-center justify-center">
                <Camera className="w-7 h-7 text-[var(--vb-text-primary)] relative z-10" />
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Hidden capture surface */}
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}
