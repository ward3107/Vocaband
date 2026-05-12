import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, X, Link2, MessageCircle } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { teacherDashboardT } from "../locales/teacher/dashboard";

interface ShareClassLinkModalProps {
  open: boolean;
  onClose: () => void;
  className: string;
  code: string;
  /** Optional WhatsApp share — if provided, surfaces a button alongside copy. */
  onWhatsApp?: () => void;
  /** When set, the share link deep-links the student straight into this
   *  assignment after they log in (URL gets `&assignment=<id>`). */
  assignmentId?: string;
  /** Title shown in the modal header when sharing a specific assignment. */
  assignmentTitle?: string;
}

/**
 * Build the canonical join URL for a class.  Lives at /student?class=
 * because /student is the dedicated student entry point — no marketing
 * detour, no public-landing CTAs to confuse a 4th-grader who scanned a
 * QR.  See docs/PUBLIC-PAGES-AUDIT-2026-04-28.md for the routing
 * rationale.
 *
 * When `assignmentId` is provided the URL also carries `&assignment=<id>`
 * so App.tsx can auto-open that assignment for the student once they
 * land on their dashboard.
 */
function buildJoinUrl(code: string, assignmentId?: string): string {
  // window.location.origin is fine on web; in SSR contexts (none today)
  // we'd fall back to the production domain.
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://www.vocaband.com";
  const base = `${origin}/student?class=${encodeURIComponent(code)}`;
  return assignmentId
    ? `${base}&assignment=${encodeURIComponent(assignmentId)}`
    : base;
}

const ShareClassLinkModal: React.FC<ShareClassLinkModalProps> = ({
  open,
  onClose,
  className,
  code,
  onWhatsApp,
  assignmentId,
  assignmentTitle,
}) => {
  const { language, dir } = useLanguage();
  const t = teacherDashboardT[language];
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const url = buildJoinUrl(code, assignmentId);
  const isAssignmentShare = Boolean(assignmentId);

  // Reset copy chips when the modal closes so a re-open shows the
  // default Copy icons rather than a stale checkmark.
  useEffect(() => {
    if (!open) {
      setCopiedLink(false);
      setCopiedCode(false);
    }
  }, [open]);

  // Esc-to-close mirrors the rest of the dashboard modals.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleCopy = async (value: string, kind: "link" | "code") => {
    try {
      await navigator.clipboard.writeText(value);
      if (kind === "link") {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 1800);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 1800);
      }
    } catch {
      // Older browsers / insecure contexts — fall through silently.
      // Teacher can still long-press the URL or read the code.
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="share-class-link-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          dir={dir}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: "var(--vb-surface)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 px-6 pt-6 pb-8 text-white relative">
              <button
                onClick={onClose}
                type="button"
                aria-label="Close"
                className="absolute top-4 end-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
                style={{ touchAction: "manipulation" }}
              >
                <X size={18} />
              </button>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-white/70">
                {isAssignmentShare ? "Share assignment" : t.shareClassLinkEyebrow}
              </p>
              <h2 className="mt-1 text-2xl font-black leading-tight">
                {isAssignmentShare ? assignmentTitle ?? className : className}
              </h2>
              <p className="mt-2 text-sm text-white/85 leading-relaxed">
                {isAssignmentShare
                  ? `Students who open this link join ${className} and go straight to this assignment.`
                  : t.shareClassLinkSubtitle}
              </p>
            </div>

            <div className="px-6 pt-6 pb-6 -mt-4">
              <div className="rounded-2xl bg-white p-5 shadow-lg shadow-indigo-500/10 border border-stone-200 flex flex-col items-center gap-4">
                <div className="rounded-xl bg-white p-3 ring-1 ring-stone-200">
                  <QRCodeSVG
                    value={url}
                    size={192}
                    level="M"
                    fgColor="#1F2937"
                    bgColor="#FFFFFF"
                    aria-label={`QR code for ${className}`}
                  />
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-black uppercase tracking-widest text-stone-500">
                    {t.shareClassLinkCodeLabel}
                  </p>
                  <p className="mt-1 font-mono font-black text-3xl tracking-[0.25em] text-stone-900">
                    {code}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-2xl border bg-[var(--vb-surface-alt)] px-3 py-2.5"
                   style={{ borderColor: "var(--vb-border)" }}>
                <Link2 size={16} className="shrink-0 text-indigo-500" />
                <span
                  className="flex-1 truncate text-xs font-semibold"
                  style={{ color: "var(--vb-text-secondary)" }}
                  title={url}
                >
                  {url.replace(/^https?:\/\//, "")}
                </span>
                <button
                  onClick={() => handleCopy(url, "link")}
                  type="button"
                  style={{ touchAction: "manipulation" }}
                  className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-500 text-white hover:bg-indigo-600 active:scale-[0.97] transition-all"
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  {copiedLink ? t.shareClassLinkCopied : t.shareClassLinkCopy}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCopy(code, "code")}
                  type="button"
                  style={{
                    touchAction: "manipulation",
                    backgroundColor: "var(--vb-surface-alt)",
                    color: "var(--vb-text-secondary)",
                  }}
                  className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 active:scale-[0.97] transition-all"
                >
                  {copiedCode ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                  {copiedCode ? t.shareClassLinkCopied : t.copyClassCode}
                </button>
                {onWhatsApp ? (
                  <button
                    onClick={() => {
                      onWhatsApp();
                      onClose();
                    }}
                    type="button"
                    style={{ touchAction: "manipulation" }}
                    className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.97] transition-all"
                  >
                    <MessageCircle size={15} />
                    {t.shareWhatsApp}
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    type="button"
                    style={{ touchAction: "manipulation" }}
                    className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm bg-indigo-500 text-white hover:bg-indigo-600 active:scale-[0.97] transition-all"
                  >
                    {t.shareClassLinkDone}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ShareClassLinkModal;
