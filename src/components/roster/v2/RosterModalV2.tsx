/**
 * RosterModalV2 — redesigned replacement for ClassRosterModal.
 *
 * Visually rebuilt around the v2 design language (pastel avatars,
 * frosted code chip, brand-gradient CTAs) while preserving every
 * Supabase RPC call and feature of the legacy modal: view, add,
 * reset PIN, delete, reveal-all toggle, copy-all PINs, print sheet,
 * and per-student PIN reveal.  English path only — the dashboard
 * still mounts the legacy ClassRosterModal for Hebrew classes.
 *
 * Modal frame: fixed full-screen (z-[60]) over the dashboard so it
 * sits above the class card portals; on mobile it fills the screen
 * naturally, on desktop the content is centred with a max-width.
 */
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "../../../core/supabase";
import { logAudit } from "../../../utils/audit";
import { useLanguage } from "../../../hooks/useLanguage";
import { useIsMobile } from "../../../hooks/useIsMobile";
import { classRosterT } from "../../../locales/teacher/roster";
import AddStudentRow, { TipCard } from "./AddStudentRow";
import RosterHeader from "./RosterHeader";
import StudentCard, { type RosterStudentV2 } from "./StudentCard";
import { accentForStudent } from "./constants";

interface Props {
  open: boolean;
  onClose: () => void;
  classCode: string;
  className: string;
  classEmoji?: string;
}

// 32-char alphabet — excludes I/L/O/0/1 to stay legible on paper and
// keep 4th-graders from confusing letters with digits. Lifted from
// ClassRosterModal so the new modal generates PINs that look the
// same to the teacher.
const PIN_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generatePin(): string {
  const cryptoObj = typeof window !== "undefined" ? window.crypto : undefined;
  if (cryptoObj?.getRandomValues) {
    const buf = new Uint32Array(6);
    cryptoObj.getRandomValues(buf);
    return Array.from(buf, (n) => PIN_ALPHABET[n % PIN_ALPHABET.length]).join("");
  }
  let out = "";
  for (let i = 0; i < 6; i++) out += PIN_ALPHABET[Math.floor(Math.random() * PIN_ALPHABET.length)];
  return out;
}

interface RawRosterRow {
  id: string;
  displayName: string;
  avatar: string;
  xp: number;
  pin: string | null;
  lastLoginAt: string | null;
  lastPinResetAt: string | null;
  joinedAt: string | null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function RosterModalV2({
  open,
  onClose,
  classCode,
  className,
  classEmoji = "🎓",
}: Props) {
  const { language, dir, isRTL } = useLanguage();
  const isMobile = useIsMobile();
  const t = classRosterT[language];

  const [rows, setRows] = useState<RawRosterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [allRevealed, setAllRevealed] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Esc-to-close — matches the legacy modal's behaviour.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const loadRoster = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("teacher_view_roster", {
        p_class_code: classCode,
      });
      if (rpcError) throw rpcError;
      const mapped: RawRosterRow[] = (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        displayName: r.display_name as string,
        avatar: (r.avatar as string) || "🦊",
        xp: (r.xp as number) || 0,
        pin: (r.roster_pin as string | null) ?? null,
        lastLoginAt: (r.last_login_at as string | null) ?? null,
        lastPinResetAt: (r.last_pin_reset_at as string | null) ?? null,
        joinedAt: (r.joined_at as string | null) ?? null,
      }));
      setRows(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errorLoadFailed);
    } finally {
      setLoading(false);
    }
  }, [classCode, t]);

  useEffect(() => {
    if (!open) return;
    void loadRoster();
    setRevealedIds(new Set());
    setAllRevealed(false);
    setError(null);
  }, [open, loadRoster]);

  // ── Adapter: raw RPC row → new design's RosterStudentV2 shape ──
  // Status comes from `lastLoginAt` (active in 7d / idle / never).
  // Accent + status label are derived locally so the screen can
  // render purely from the rows we already fetched.
  const students: RosterStudentV2[] = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return rows.map((r) => {
      let status: "active" | "idle" | "never" = "never";
      let statusLabel: string = t.neverLoggedIn;
      if (r.lastLoginAt) {
        const ts = new Date(r.lastLoginAt).getTime();
        status = ts >= sevenDaysAgo ? "active" : "idle";
        statusLabel = t.lastSeen(new Date(ts).toLocaleDateString());
      }
      if (r.xp > 0) statusLabel += t.xpSuffix(r.xp);
      return {
        id: r.id,
        name: r.displayName,
        emoji: r.avatar || "🦊",
        accent: accentForStudent(r.id),
        status,
        statusLabel,
        pin: r.pin,
      };
    });
  }, [rows, t]);

  // ── Actions (mirror ClassRosterModal one-for-one) ──

  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const handleAdd = async (name: string): Promise<boolean> => {
    if (adding) return false;
    setAdding(true);
    setError(null);
    const pin = generatePin();
    try {
      const { data, error: rpcError } = await supabase.rpc("teacher_create_roster_student", {
        p_class_code: classCode,
        p_display_name: name,
        p_pin: pin,
      });
      if (rpcError) throw rpcError;
      const created = Array.isArray(data) ? data[0] : data;
      const newRow: RawRosterRow = {
        id: created.id,
        displayName: created.display_name,
        avatar: "🦊",
        xp: 0,
        pin,
        lastLoginAt: null,
        lastPinResetAt: null,
        joinedAt: new Date().toISOString(),
      };
      setRows((prev) =>
        [...prev, newRow].sort((a, b) => a.displayName.localeCompare(b.displayName)),
      );
      setRevealedIds((prev) => new Set(prev).add(newRow.id));
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : t.errorAddFailed;
      if (/duplicate key/i.test(msg)) setError(t.errorDuplicateName(name));
      else setError(msg);
      return false;
    } finally {
      setAdding(false);
    }
  };

  const handleResetPin = async (s: RosterStudentV2) => {
    if (!window.confirm(t.confirmResetPin(s.name))) return;
    const pin = generatePin();
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc("teacher_reset_student_pin", {
        p_profile_id: s.id,
        p_new_pin: pin,
      });
      if (rpcError) throw rpcError;
      setRows((prev) =>
        prev.map((row) =>
          row.id === s.id
            ? { ...row, pin, lastPinResetAt: new Date().toISOString() }
            : row,
        ),
      );
      setRevealedIds((prev) => new Set(prev).add(s.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errorResetFailed);
    }
  };

  const handleDelete = async (s: RosterStudentV2) => {
    if (!window.confirm(t.confirmDelete(s.name))) return;
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc("teacher_delete_roster_student", {
        p_profile_id: s.id,
      });
      if (rpcError) throw rpcError;
      void logAudit("remove_student", "users", {
        metadata: { profile_id: s.id, class_code: classCode },
      });
      setRows((prev) => prev.filter((r) => r.id !== s.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errorDeleteFailed);
    }
  };

  const handleCopyLink = async (s: RosterStudentV2) => {
    const url = `https://vocaband.com/student?class=${classCode}&s=${s.id}`;
    const text = t.inviteShareMessage(s.name, className, url);
    try {
      await navigator.clipboard.writeText(text);
      flashToast(t.shareCopiedToast);
    } catch {
      setError(t.shareFailedToast);
    }
  };

  // WhatsApp prefill for JUST the PIN — no class name, no instructions,
  // no surrounding chrome.  Teachers asked for this so they can send
  // the secret PIN alone on a separate channel from the class invite
  // link (channel-separation pattern).  Falls back gracefully when
  // the row has no PIN (button is hidden in that case anyway).
  const handleSharePinWhatsApp = (s: RosterStudentV2) => {
    if (!s.pin) return;
    const url = `https://wa.me/?text=${encodeURIComponent(s.pin)}`;
    window.open(url, "_blank", "noopener");
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(classCode);
      flashToast(t.copiedButton);
    } catch {
      setError(t.errorClipboardUnavailable);
    }
  };

  const handleCopyAll = async () => {
    const withPins = students.filter((s) => s.pin);
    if (withPins.length === 0) {
      setError(t.errorNoPins);
      return;
    }
    const lines = [
      t.copyHeader(className, classCode),
      t.copyJoinLink(classCode),
      "",
      `${t.copyNameHeader}\t${t.copyPinHeader}`,
      ...withPins.map((s) => `${s.name}\t${s.pin}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      setError(t.errorClipboardUnavailable);
    }
  };

  const handlePrint = () => {
    const withPins = students.filter((s) => s.pin);
    if (withPins.length === 0) {
      setError(t.errorAddStudentsFirst);
      return;
    }
    const rowsHtml = withPins
      .map(
        (s) =>
          `<tr><td>${escapeHtml(s.name)}</td><td class="pin">${escapeHtml(s.pin || "")}</td></tr>`,
      )
      .join("");
    const docDir = isRTL ? "rtl" : "ltr";
    const align = isRTL ? "right" : "left";
    const html = `<!doctype html><html lang="${language}" dir="${docDir}"><head><meta charset="utf-8"><title>${escapeHtml(t.printTitle(className))}</title>
      <style>
        body { font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; margin: 32px; color: #1c1917; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        .meta { color: #57534e; font-size: 13px; margin-bottom: 16px; }
        .code { font-family: ui-monospace, Menlo, monospace; font-weight: 700; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #e7e5e4; padding: 10px 14px; text-align: ${align}; }
        th { background: #fafaf9; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #57534e; }
        td.pin { font-family: ui-monospace, Menlo, monospace; font-weight: 700; letter-spacing: 0.1em; font-size: 15px; }
        .footer { margin-top: 18px; color: #78716c; font-size: 11px; }
        @media print { body { margin: 16mm; } }
      </style>
    </head><body>
      <h1>${escapeHtml(t.printTitle(className))}</h1>
      <p class="meta">${escapeHtml(t.printClassCodeLabel)}: <span class="code">${escapeHtml(classCode)}</span></p>
      <table>
        <thead><tr><th>${escapeHtml(t.copyNameHeader)}</th><th>${escapeHtml(t.copyPinHeader)}</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <p class="footer">${escapeHtml(t.printInstructions)}</p>
      <script>setTimeout(() => window.print(), 50);</script>
    </body></html>`;
    const w = window.open("", "_blank");
    if (!w) {
      setError(t.errorPopupBlocked);
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const togglePin = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allRevealed) {
      setRevealedIds(new Set());
      setAllRevealed(false);
    } else {
      setRevealedIds(new Set(students.map((s) => s.id)));
      setAllRevealed(true);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          dir={dir}
          className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm flex items-stretch sm:items-start justify-center overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:my-6 sm:mx-4 sm:max-w-5xl bg-white sm:rounded-[28px] shadow-2xl overflow-hidden"
            style={{
              background:
                "radial-gradient(140% 100% at 100% 0%, #F3EBFF 0%, #F6F4FF 40%, #FAF7FF 100%)",
            }}
          >
            {/* Close button — floats top-end so it doesn't interfere
                with the section label / h1.  z-10 keeps it above the
                page background. */}
            <button
              type="button"
              onClick={onClose}
              aria-label={t.closeAria}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className="absolute end-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full border border-indigo-500/[0.10] bg-white/80 text-[#4A3B7A] backdrop-blur-sm transition-transform active:scale-95"
            >
              <X size={18} />
            </button>

            <div className="px-5 sm:px-10 pt-8 sm:pt-10 pb-12">
              <RosterHeader
                mobile={isMobile}
                className={className}
                classCode={classCode}
                classEmoji={classEmoji}
                classAccent="default"
                studentCountLabel={t.studentCount(students.length)}
                classLabel={t.sectionLabelPrefix}
                title={t.title}
                printLabel={t.printButton}
                addStudentLabel={t.addStudentLabel}
                ariaCopyCode={t.copyTitle}
                onCopyCode={handleCopyCode}
                onPrint={handlePrint}
                onAddStudent={() => {
                  // The header CTA just focuses the inline add field —
                  // we don't open a separate modal for this flow.
                  const input = document.querySelector<HTMLInputElement>(
                    'input[type="text"][placeholder]',
                  );
                  input?.focus();
                }}
              />

              <AddStudentRow
                mobile={isMobile}
                placeholder={t.addStudentPlaceholder}
                ctaLabel={t.addButton}
                helpText={t.addHelp}
                onAdd={handleAdd}
                busy={adding}
              />

              <TipCard strong="" body={t.privacyTip} />

              {/* Top action bar: reveal-all + copy-all PINs.  Lives
                  above the grid so a teacher with a long roster doesn't
                  have to scroll past every card to find these. */}
              {students.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleAll}
                    style={{ touchAction: "manipulation" }}
                    className="inline-flex items-center gap-2 rounded-full border border-indigo-500/[0.10] bg-white px-4 py-2 text-[12px] font-bold text-[#4A3B7A] hover:bg-indigo-500/[0.06]"
                  >
                    {allRevealed ? t.hideAllPins : t.showAllPins}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyAll}
                    style={{ touchAction: "manipulation" }}
                    className="inline-flex items-center gap-2 rounded-full border border-indigo-500/[0.10] bg-white px-4 py-2 text-[12px] font-bold text-[#4A3B7A] hover:bg-indigo-500/[0.06]"
                    title={t.copyTitle}
                  >
                    {copiedAll ? t.copiedButton : t.copyButton}
                  </button>
                </div>
              )}

              {error && (
                <div
                  className="mb-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-[13px] font-semibold text-rose-800"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {loading ? (
                <div className="rounded-[24px] border border-indigo-500/[0.10] bg-white/60 px-6 py-12 text-center text-[14px] font-semibold text-[#6B6388]">
                  {t.loading}
                </div>
              ) : students.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-indigo-500/30 bg-white/40 px-6 py-12 text-center">
                  <p className="text-[16px] font-bold text-[#1F1147]">{t.emptyTitle}</p>
                  <p className="mt-1 text-[13px] text-[#6B6388]">{t.emptyBody}</p>
                </div>
              ) : (
                <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
                  {students.map((s) => (
                    <StudentCard
                      key={s.id}
                      student={s}
                      mobile={isMobile}
                      pinRevealed={revealedIds.has(s.id)}
                      onTogglePin={() => togglePin(s.id)}
                      onResetPin={() => handleResetPin(s)}
                      onDelete={() => handleDelete(s)}
                      onCopyLink={() => handleCopyLink(s)}
                      onSharePinWhatsApp={() => handleSharePinWhatsApp(s)}
                      labels={{
                        pin: t.showPin,
                        copyLinkAria: t.copyLinkLabel,
                        resetPinAria: t.resetPinAria(s.name),
                        resetPinLabel: t.resetPinTitle,
                        deleteAria: t.removeAria(s.name),
                        deleteLabel: t.removeTitle,
                        moreAria: t.moreActionsAria,
                        sharePinAria: t.sharePinAria(s.name),
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Lightweight bottom toast — clipboard confirmations etc.
                Lives inside the modal so it doesn't fight the app's
                global toast stack for vertical real estate. */}
            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-[#1F1147] px-4 py-2 text-[12px] font-bold text-white"
                >
                  {toast}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
