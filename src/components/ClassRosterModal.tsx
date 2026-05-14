import type { FC } from "react";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { supabase } from "../core/supabase";
import { useLanguage } from "../hooks/useLanguage";
import { classRosterT } from "../locales/teacher/roster";

// 32-char alphabet, chosen to be easy to read on paper and easy for a
// 4th-grader to type on a phone. Excludes I/L/O (look like 1) and 0/1.
const PIN_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generatePin(): string {
  const cryptoObj = typeof window !== "undefined" ? window.crypto : undefined;
  if (cryptoObj?.getRandomValues) {
    const buf = new Uint32Array(6);
    cryptoObj.getRandomValues(buf);
    return Array.from(buf, n => PIN_ALPHABET[n % PIN_ALPHABET.length]).join("");
  }
  let out = "";
  for (let i = 0; i < 6; i++) out += PIN_ALPHABET[Math.floor(Math.random() * PIN_ALPHABET.length)];
  return out;
}

interface RosterStudent {
  id: string;
  displayName: string;
  avatar: string;
  xp: number;
  pin: string | null;
  lastLoginAt: string | null;
  lastPinResetAt: string | null;
  joinedAt: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  classCode: string;
  className: string;
}

const ClassRosterModal: FC<Props> = ({ open, onClose, classCode, className }) => {
  const { language, dir, isRTL } = useLanguage();
  const t = classRosterT[language];
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [allRevealed, setAllRevealed] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  // Set when the per-row Share button copied to the clipboard (because
  // navigator.share was unavailable or the user dismissed it).  Drives
  // the brief "Copied — paste it into a message" toast.
  const [shareCopied, setShareCopied] = useState(false);

  const loadRoster = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("teacher_view_roster", {
        p_class_code: classCode,
      });
      if (rpcError) throw rpcError;
      const mapped: RosterStudent[] = (data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        displayName: r.display_name as string,
        avatar: (r.avatar as string) || "🦊",
        xp: (r.xp as number) || 0,
        pin: (r.roster_pin as string | null) ?? null,
        lastLoginAt: (r.last_login_at as string | null) ?? null,
        lastPinResetAt: (r.last_pin_reset_at as string | null) ?? null,
        joinedAt: (r.joined_at as string | null) ?? null,
      }));
      setStudents(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errorLoadFailed);
    } finally {
      setLoading(false);
    }
  }, [classCode, t]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRoster();
    setRevealedIds(new Set());
    setAllRevealed(false);
    setNewName("");
    setError(null);
  }, [open, loadRoster]);

  // Esc-to-close — matches the rest of the dashboard modals.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    setError(null);
    const pin = generatePin();
    try {
      const { data, error: rpcError } = await supabase.rpc("teacher_create_roster_student", {
        p_class_code: classCode,
        p_display_name: trimmed,
        p_pin: pin,
      });
      if (rpcError) throw rpcError;
      const created = Array.isArray(data) ? data[0] : data;
      const newRow: RosterStudent = {
        id: created.id,
        displayName: created.display_name,
        avatar: "🦊",
        xp: 0,
        pin,
        lastLoginAt: null,
        lastPinResetAt: null,
        joinedAt: new Date().toISOString(),
      };
      setStudents(prev =>
        [...prev, newRow].sort((a, b) => a.displayName.localeCompare(b.displayName)),
      );
      setRevealedIds(prev => new Set(prev).add(newRow.id));
      setNewName("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : t.errorAddFailed;
      // Postgres unique-violation surfaces as "duplicate key" — translate.
      if (/duplicate key/i.test(msg)) {
        setError(t.errorDuplicateName(trimmed));
      } else {
        setError(msg);
      }
    } finally {
      setAdding(false);
    }
  };

  const handleResetPin = async (s: RosterStudent) => {
    if (!window.confirm(t.confirmResetPin(s.displayName))) return;
    const pin = generatePin();
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc("teacher_reset_student_pin", {
        p_profile_id: s.id,
        p_new_pin: pin,
      });
      if (rpcError) throw rpcError;
      setStudents(prev =>
        prev.map(row =>
          row.id === s.id
            ? { ...row, pin, lastPinResetAt: new Date().toISOString() }
            : row,
        ),
      );
      setRevealedIds(prev => new Set(prev).add(s.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errorResetFailed);
    }
  };

  const handleDelete = async (s: RosterStudent) => {
    if (!window.confirm(t.confirmDelete(s.displayName))) return;
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc("teacher_delete_roster_student", {
        p_profile_id: s.id,
      });
      if (rpcError) throw rpcError;
      setStudents(prev => prev.filter(r => r.id !== s.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errorDeleteFailed);
    }
  };

  // Build the per-student invite URL that lands on the student-login
  // page with the class code pre-filled AND the roster picker pre-
  // selected.  `?class=` is read by StudentAccountLoginView; `?s=` is
  // read by StudentPinLoginCard.  Bare `vocaband.com` matches the
  // existing print template at the bottom of this file.
  const buildInviteUrl = (studentId: string) =>
    `https://vocaband.com/student?class=${classCode}&s=${studentId}`;

  // Try the native share sheet first.  Returns true when the browser
  // handled the share (including the user-cancelled case — that's not
  // a failure, just a different user choice), false when share isn't
  // available or threw a non-Abort error so we should fall back to
  // copying.
  const tryShare = async (data: { title: string; text: string; url?: string }): Promise<boolean> => {
    if (typeof navigator.share !== "function") return false;
    try {
      await navigator.share(data);
      return true;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return true;
      return false;
    }
  };

  const flashCopied = () => {
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  };

  // Channel-separation primary path: invite URL without the PIN.
  const handleShareLink = async (s: RosterStudent) => {
    const url = buildInviteUrl(s.id);
    const text = t.inviteShareMessage(s.displayName, className, url);
    const title = t.inviteShareTitle(className);
    setError(null);
    if (await tryShare({ title, text, url })) return;
    try {
      await navigator.clipboard.writeText(text);
      flashCopied();
    } catch {
      setError(t.shareFailedToast);
    }
  };

  // Channel-separation secondary path: the PIN alone, intended for a
  // different chat than the invite link.  Disabled when the row has no
  // PIN (shouldn't happen for roster students, but guard anyway).
  const handleSharePin = async (s: RosterStudent) => {
    if (!s.pin) return;
    const text = t.pinShareMessage(s.pin, className, classCode);
    const title = t.pinShareTitle(s.displayName);
    setError(null);
    if (await tryShare({ title, text })) return;
    try {
      await navigator.clipboard.writeText(text);
      flashCopied();
    } catch {
      setError(t.shareFailedToast);
    }
  };

  const handleCopyAll = async () => {
    const withPins = students.filter(s => s.pin);
    if (withPins.length === 0) {
      setError(t.errorNoPins);
      return;
    }
    const lines = [
      t.copyHeader(className, classCode),
      t.copyJoinLink(classCode),
      "",
      `${t.copyNameHeader}\t${t.copyPinHeader}`,
      ...withPins.map(s => `${s.displayName}\t${s.pin}`),
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
    const withPins = students.filter(s => s.pin);
    if (withPins.length === 0) {
      setError(t.errorAddStudentsFirst);
      return;
    }
    const win = window.open("", "_blank", "noopener,width=800,height=900");
    if (!win) {
      setError(t.errorPopupBlocked);
      return;
    }
    const rows = withPins
      .map(
        s =>
          `<tr><td>${escapeHtml(s.displayName)}</td><td class="pin">${escapeHtml(s.pin || "")}</td></tr>`,
      )
      .join("");
    // RTL-aware print sheet — direction follows the teacher's UI
    // language so Hebrew/Arabic rosters print right-to-left with the
    // PIN column on the correct side.
    const docDir = isRTL ? "rtl" : "ltr";
    const align = isRTL ? "right" : "left";
    win.document.write(`<!doctype html><html lang="${language}" dir="${docDir}"><head><meta charset="utf-8"><title>${escapeHtml(t.printTitle(className))}</title>
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
      <p class="meta">${escapeHtml(t.printClassCodeLabel)} <span class="code">${escapeHtml(classCode)}</span> · vocaband.com/student?class=${escapeHtml(classCode)}</p>
      <table><thead><tr><th>${escapeHtml(t.copyNameHeader)}</th><th>${escapeHtml(t.copyPinHeader)}</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="footer">${escapeHtml(t.printInstructions)}</p>
      <script>window.addEventListener('load', () => setTimeout(() => window.print(), 200));</script>
    </body></html>`);
    win.document.close();
  };

  const toggleReveal = (id: string) => {
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllReveal = () => {
    setAllRevealed(v => !v);
    if (allRevealed) {
      setRevealedIds(new Set());
    } else {
      setRevealedIds(new Set(students.map(s => s.id)));
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            onClick={e => e.stopPropagation()}
            dir={dir}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-stone-200">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
                  <Users size={24} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-stone-900 truncate">{t.title}</h2>
                  <p className="text-xs font-bold text-stone-500 mt-0.5 truncate">
                    {className} · <span className="font-mono tracking-wider">{classCode}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                type="button"
                aria-label={t.closeAria}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-100 transition-colors shrink-0"
                style={{ touchAction: "manipulation" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Add student */}
            <div className="p-6 pb-3">
              <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-stone-500 mb-2">
                {t.addStudentLabel}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleAdd();
                  }}
                  placeholder={t.addStudentPlaceholder}
                  maxLength={60}
                  disabled={adding}
                  className="flex-1 px-4 py-2.5 rounded-xl border-2 border-stone-200 focus:border-indigo-500 outline-none text-sm font-medium disabled:opacity-60"
                />
                <button
                  onClick={handleAdd}
                  type="button"
                  disabled={adding || !newName.trim()}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-sm shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 inline-flex items-center gap-2"
                  style={{ touchAction: "manipulation" }}
                >
                  <Plus size={16} />
                  {t.addButton}
                </button>
              </div>
              <p className="text-xs text-stone-500 mt-2">
                {t.addHelp}
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-6 mt-1 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold flex items-start gap-2"
              >
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Roster list */}
            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[180px]">
              {loading ? (
                <p className="text-center text-sm text-stone-500 py-8">{t.loading}</p>
              ) : students.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-4xl mb-2">🦊</p>
                  <p className="text-sm font-bold text-stone-700">{t.emptyTitle}</p>
                  <p className="text-xs text-stone-500 mt-1">{t.emptyBody}</p>
                </div>
              ) : (
                <>
                  {students.length > 1 && (
                    <div className={`flex mb-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                      <button
                        onClick={toggleAllReveal}
                        type="button"
                        className="text-xs font-bold text-stone-500 hover:text-stone-900 inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-stone-100 transition-colors"
                        style={{ touchAction: "manipulation" }}
                      >
                        {allRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                        {allRevealed ? t.hideAllPins : t.showAllPins}
                      </button>
                    </div>
                  )}
                  <div className="space-y-2">
                    {students.map(s => {
                      const isRevealed = revealedIds.has(s.id) && !!s.pin;
                      return (
                        <div
                          key={s.id}
                          className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 hover:border-stone-300 transition-colors"
                        >
                          <span className="text-2xl shrink-0">{s.avatar}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-stone-900 truncate">{s.displayName}</p>
                            <p className="text-xs text-stone-500 truncate">
                              {s.lastLoginAt
                                ? t.lastSeen(new Date(s.lastLoginAt).toLocaleDateString())
                                : t.neverLoggedIn}
                              {s.xp ? t.xpSuffix(s.xp) : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                            {s.pin ? (
                              isRevealed ? (
                                <span className="font-mono font-black text-base text-indigo-700 tracking-[0.15em] px-3 py-1.5 bg-indigo-50 rounded-lg select-all">
                                  {s.pin}
                                </span>
                              ) : (
                                <button
                                  onClick={() => toggleReveal(s.id)}
                                  type="button"
                                  className="px-3 py-1.5 text-xs font-bold text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200 inline-flex items-center gap-1.5 transition-colors"
                                  style={{ touchAction: "manipulation" }}
                                >
                                  <Eye size={12} />
                                  {t.showPin}
                                </button>
                              )
                            ) : (
                              <span className="text-xs text-stone-400 px-3 py-1.5">—</span>
                            )}
                            {/* Channel-separation share buttons.  Distinct colours
                                (indigo / fuchsia) so a teacher can't tap the wrong
                                one and leak the PIN through the link channel. */}
                            <button
                              onClick={() => handleShareLink(s)}
                              type="button"
                              title={t.shareLinkTitle}
                              aria-label={t.shareLinkAria(s.displayName)}
                              className="h-9 px-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 hover:bg-indigo-100 inline-flex items-center gap-1.5 transition-colors"
                              style={{ touchAction: "manipulation" }}
                            >
                              <Link2 size={13} />
                              {t.shareLinkButton}
                            </button>
                            <button
                              onClick={() => handleSharePin(s)}
                              type="button"
                              disabled={!s.pin}
                              title={t.sharePinTitle}
                              aria-label={t.sharePinAria(s.displayName)}
                              className="h-9 px-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100 inline-flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              style={{ touchAction: "manipulation" }}
                            >
                              <KeyRound size={13} />
                              {t.sharePinButton}
                            </button>
                            <button
                              onClick={() => handleResetPin(s)}
                              type="button"
                              title={t.resetPinTitle}
                              aria-label={t.resetPinAria(s.displayName)}
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-500 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                              style={{ touchAction: "manipulation" }}
                            >
                              <RefreshCw size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(s)}
                              type="button"
                              title={t.removeTitle}
                              aria-label={t.removeAria(s.displayName)}
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              style={{ touchAction: "manipulation" }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Share-copied toast — only appears when the clipboard
                fallback fired (no native share sheet was available).  The
                native share sheet provides its own feedback so we stay
                silent on that path. */}
            <AnimatePresence>
              {shareCopied && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mx-6 mb-2 px-3 py-2 rounded-lg bg-stone-900 text-white text-xs font-bold inline-flex items-center gap-2 self-center shadow-lg"
                  role="status"
                >
                  <Check size={14} className="text-emerald-400" />
                  {t.shareCopiedToast}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <div className="p-4 border-t border-stone-200 bg-stone-50 rounded-b-3xl flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-stone-500">
                {t.studentCount(students.length)}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyAll}
                  type="button"
                  disabled={students.length === 0}
                  className="px-3.5 py-2 rounded-lg bg-white border border-stone-200 text-stone-700 text-sm font-bold hover:bg-stone-100 active:scale-95 transition-all inline-flex items-center gap-2 disabled:opacity-40"
                  style={{ touchAction: "manipulation" }}
                  title={t.copyTitle}
                >
                  {copiedAll ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                  {copiedAll ? t.copiedButton : t.copyButton}
                </button>
                <button
                  onClick={handlePrint}
                  type="button"
                  disabled={students.length === 0}
                  className="px-3.5 py-2 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-sm font-bold hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-2 disabled:opacity-50"
                  style={{ touchAction: "manipulation" }}
                >
                  <Printer size={15} />
                  {t.printButton}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default ClassRosterModal;
