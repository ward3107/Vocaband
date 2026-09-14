import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, X } from "lucide-react";

/**
 * Styled confirm modal for the admin dashboard — replaces raw window.confirm()
 * so destructive actions match the app's card/motion convention, stay
 * keyboard-dismissible, and can demand a typed phrase before a hard delete.
 *
 * Controlled: render it always and flip `open`. `onConfirm` receives the
 * (trimmed) reason so callers can forward it to an audited RPC.
 */
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning" | "default";
  /** Show a reason textarea; the value is passed to onConfirm. */
  reason?: { placeholder?: string; required?: boolean };
  /** Gate confirm behind typing this exact string (e.g. a class code). */
  confirmPhrase?: string;
  busy?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

const TONES = {
  danger:  { ring: "border-rose-500/30",   accent: "text-rose-300",   btn: "bg-rose-600 hover:bg-rose-500",       chip: "bg-rose-500/15" },
  warning: { ring: "border-amber-500/30",  accent: "text-amber-300",  btn: "bg-amber-600 hover:bg-amber-500",     chip: "bg-amber-500/15" },
  default: { ring: "border-teal-500/30", accent: "text-teal-300", btn: "bg-teal-600 hover:bg-teal-500",   chip: "bg-teal-500/15" },
} as const;

export default function ConfirmDialog({
  open, title, body, confirmLabel = "Confirm", cancelLabel = "Cancel",
  tone = "default", reason, confirmPhrase, busy = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  const [reasonText, setReasonText] = useState("");
  const [phrase, setPhrase] = useState("");
  const t = TONES[tone];
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const phraseId = useId();

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const targets = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
      ));
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
        event.preventDefault(); first.focus();
      }
    };
    dialog.addEventListener("keydown", trapFocus);
    return () => {
      dialog.removeEventListener("keydown", trapFocus);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  // Reset the typed fields each time the dialog opens so a previous action's
  // text never carries into the next confirm. Resetting on the open→close edge
  // too would miss Escape/backdrop closes, so we key off `open` going true.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset of local field state when the dialog (re)opens
    if (open) { setReasonText(""); setPhrase(""); }
  }, [open]);

  // Esc to cancel (ignored mid-flight so a delete can't be half-dismissed).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  const reasonOk = !reason?.required || reasonText.trim().length > 0;
  const phraseOk = !confirmPhrase || phrase.trim() === confirmPhrase;
  const canConfirm = !busy && reasonOk && phraseOk;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close"
            tabIndex={-1}
            disabled={busy}
            onClick={() => !busy && onCancel()}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={body ? bodyId : undefined}
            aria-busy={busy}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className={`relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl bg-slate-900 border ${t.ring} shadow-2xl p-6`}
          >
            <div className="flex items-start gap-3">
              <div className={`rounded-2xl ${t.chip} p-2.5 shrink-0`}>
                <AlertTriangle className={`w-5 h-5 ${t.accent}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 id={titleId} className="text-white font-black text-lg leading-tight">{title}</h2>
                {body && <div id={bodyId} className="text-white/60 text-sm mt-1.5 leading-relaxed">{body}</div>}
              </div>
              <button
                type="button"
                onClick={() => !busy && onCancel()}
                aria-label="Close"
                disabled={busy}
                className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 shrink-0 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reason && (
              <textarea
                aria-label={reason.placeholder ?? "Reason (recorded in the audit log)"}
                aria-required={reason.required}
                disabled={busy}
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder={reason.placeholder ?? "Reason (recorded in the audit log)"}
                rows={2}
                className="mt-4 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-base focus:outline-none focus:border-white/30"
              />
            )}

            {confirmPhrase && (
              <div className="mt-4">
                <label htmlFor={phraseId} className="text-white/70 text-sm font-bold">
                  Type <code className={`px-1.5 py-0.5 rounded ${t.chip} ${t.accent} font-mono`}>{confirmPhrase}</code> to confirm
                </label>
                <input
                  id={phraseId}
                  disabled={busy}
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  spellCheck={false}
                  className="mt-1.5 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-base font-mono tracking-wider focus:outline-none focus:border-white/30"
                />
              </div>
            )}

            <div className="mt-6 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => !busy && onCancel()}
                disabled={busy}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-bold text-base disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => canConfirm && onConfirm(reasonText.trim())}
                disabled={!canConfirm}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className={`px-5 py-2.5 rounded-xl ${t.btn} text-white font-black text-base disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {busy ? "Working…" : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
