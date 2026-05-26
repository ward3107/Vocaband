import { useState } from "react";
import { Copy, Key, MessageCircle, MoreVertical, RefreshCw, Trash2, Eye, EyeOff } from "lucide-react";
import StudentAvatar from "./StudentAvatar";
import type { StudentAccent } from "./constants";

export interface RosterStudentV2 {
  id: string;
  name: string;
  emoji: string;
  accent: StudentAccent;
  status: "active" | "idle" | "never";
  /** Pre-formatted single-line status, rendered as-is. */
  statusLabel: string;
  /** 6-char PIN; revealed when the teacher taps the PIN chip. */
  pin?: string | null;
}

interface StudentCardProps {
  student: RosterStudentV2;
  mobile?: boolean;
  /** Whether the PIN is visible right now (controlled externally so a
   *  "reveal all" toggle higher up can flip everyone at once). */
  pinRevealed: boolean;
  onTogglePin: () => void;
  /** Per-student actions — bubbled to the modal parent.  All optional;
   *  buttons hide when the caller hasn't wired the callback. */
  onResetPin?: () => void;
  onDelete?: () => void;
  onCopyLink?: () => void;
  /** Copy ONLY the 6-char PIN to clipboard.  Top-row affordance so the
   *  most common teacher action (paste the PIN for a student) is one
   *  tap.  Teachers reported the previous behaviour — where the only
   *  copy button wrote a multi-line invite message — pasted the wrong
   *  thing into the student-side PIN input. */
  onCopyPin?: () => void;
  /** Open WhatsApp with JUST the PIN as the message text — no class
   *  name, no surrounding instructions.  Teachers asked for this so
   *  they can send the secret PIN alone on a different channel than
   *  the class invite link. */
  onSharePinWhatsApp?: () => void;
  /** Localised labels for the small kebab-menu actions and PIN chip. */
  labels: {
    pin: string;
    copyLinkAria: string;
    copyLinkLabel: string;
    copyPinAria: string;
    copyPinTitle: string;
    resetPinAria: string;
    resetPinLabel: string;
    deleteAria: string;
    deleteLabel: string;
    moreAria: string;
    sharePinAria: string;
  };
}

/**
 * Single student row in the roster grid.  Pastel avatar, name +
 * status, status dot (green = active, slate = idle/never-logged-in),
 * and a compact action cluster on the trailing edge.
 *
 * PIN chip swaps its label for the actual PIN when revealed.  A small
 * overflow kebab houses the destructive actions (Reset PIN, Remove)
 * — kept out of the primary row so the destructive trash isn't one
 * fat-finger away from "show PIN".
 */
export default function StudentCard({
  student,
  mobile = false,
  pinRevealed,
  onTogglePin,
  onResetPin,
  onDelete,
  onCopyLink,
  onCopyPin,
  onSharePinWhatsApp,
  labels,
}: StudentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = student.status === "active";
  const dotClass = isActive ? "bg-[#4DBA8A]" : "bg-[#8B85AB]";
  const statusColor = isActive ? "text-[#2E8E60]" : "text-[#8B85AB]";

  return (
    // Card uses flex-col so the action cluster always sits below the
    // name+status row.  Old layout was a single inline row that broke
    // on narrow card widths (≤280px) — the action buttons overlapped
    // the student name because the actions were `shrink-0` while the
    // title section had nothing to fall back to.  Stacking is the
    // only layout that's robust at every grid-cell width.
    <article
      className="relative flex flex-col gap-3 rounded-[22px] border border-indigo-500/[0.10] bg-white px-4 sm:px-[18px] py-3.5 sm:py-4"
      style={{
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.7) inset, 0 10px 24px -22px rgba(60,40,120,0.18)",
      }}
    >
      {/* Top row — avatar + name + status. */}
      <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
        <StudentAvatar emoji={student.emoji} accent={student.accent} size={mobile ? 40 : 44} />

        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold text-[#1F1147]">
            {student.name}
          </div>
          <div className={`mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold ${statusColor}`}>
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass} shrink-0`} />
            <span className="truncate">{student.statusLabel}</span>
          </div>
        </div>
      </div>

      {/* Action row — sits on its own line below so 4 buttons can fit
          at any card width without overlapping the name. */}
      <div className="flex items-center justify-end gap-1 flex-wrap">
        {student.pin && (
          <button
            type="button"
            onClick={onTogglePin}
            aria-label={labels.pin}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="inline-flex items-center gap-1.5 h-8 rounded-[10px] border-0 bg-indigo-500/[0.06] px-2.5 text-[11px] font-bold text-[#4A3B7A] hover:bg-indigo-500/[0.12]"
          >
            {pinRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
            {pinRevealed ? student.pin : labels.pin}
          </button>
        )}
        {student.pin && onSharePinWhatsApp && (
          <button
            type="button"
            onClick={onSharePinWhatsApp}
            aria-label={labels.sharePinAria}
            title={labels.sharePinAria}
            style={{
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
              background: "#25D366",
              boxShadow: "0 6px 14px -8px rgba(37,211,102,0.55)",
            }}
            className="grid h-8 w-8 place-items-center rounded-[10px] border-0 text-white transition-transform active:scale-95"
          >
            <MessageCircle size={14} />
          </button>
        )}
        {student.pin && onCopyPin && (
          <button
            type="button"
            onClick={onCopyPin}
            aria-label={labels.copyPinAria}
            title={labels.copyPinTitle}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="grid h-8 w-8 place-items-center rounded-[10px] border-0 bg-indigo-500/[0.06] text-[#4A3B7A] hover:bg-indigo-500/[0.12]"
          >
            <Key size={14} />
          </button>
        )}
        {(onResetPin || onDelete || onCopyLink) && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={labels.moreAria}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className="grid h-8 w-8 place-items-center rounded-[10px] border-0 bg-indigo-500/[0.06] text-[#4A3B7A] hover:bg-indigo-500/[0.12]"
            >
              <MoreVertical size={14} />
            </button>
            {menuOpen && (
              <>
                {/* Click-catcher closes the menu on outside tap. */}
                <button
                  type="button"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden
                />
                <div
                  className="absolute end-0 top-9 z-20 min-w-[180px] rounded-xl border border-indigo-500/[0.10] bg-white py-1 text-[13px] font-semibold text-[#1F1147] shadow-lg"
                  style={{ boxShadow: "0 18px 40px -22px rgba(60,40,120,0.35)" }}
                >
                  {onResetPin && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onResetPin();
                      }}
                      aria-label={labels.resetPinAria}
                      className="flex w-full items-center gap-2 px-3 py-2 text-start hover:bg-indigo-500/[0.06]"
                    >
                      <RefreshCw size={14} className="text-[#8B5CF6]" />
                      {labels.resetPinLabel}
                    </button>
                  )}
                  {onCopyLink && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onCopyLink();
                      }}
                      aria-label={labels.copyLinkAria}
                      className="flex w-full items-center gap-2 px-3 py-2 text-start hover:bg-indigo-500/[0.06]"
                    >
                      <Copy size={14} className="text-[#8B5CF6]" />
                      {labels.copyLinkLabel}
                    </button>
                  )}
                  {onDelete && (
                    <>
                      <div className="my-1 mx-2 h-px bg-indigo-500/[0.10]" />
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onDelete();
                        }}
                        aria-label={labels.deleteAria}
                        className="flex w-full items-center gap-2 px-3 py-2 text-start text-rose-700 hover:bg-rose-500/[0.08]"
                      >
                        <Trash2 size={14} />
                        {labels.deleteLabel}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
