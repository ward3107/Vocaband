import type { FC } from "react";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { supabase } from "../core/supabase";

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
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [allRevealed, setAllRevealed] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

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
      setError(e instanceof Error ? e.message : "Failed to load roster");
    } finally {
      setLoading(false);
    }
  }, [classCode]);

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
      const msg = e instanceof Error ? e.message : "Failed to add student";
      // Postgres unique-violation surfaces as "duplicate key" — translate.
      if (/duplicate key/i.test(msg)) {
        setError(`There's already a student named "${trimmed}" in this class. Add a last initial to distinguish them (e.g. "Yossi K", "Yossi M").`);
      } else {
        setError(msg);
      }
    } finally {
      setAdding(false);
    }
  };

  const handleResetPin = async (s: RosterStudent) => {
    if (!window.confirm(`Generate a new PIN for ${s.displayName}? Their old PIN will stop working immediately.`)) return;
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
      setError(e instanceof Error ? e.message : "Failed to reset PIN");
    }
  };

  const handleDelete = async (s: RosterStudent) => {
    if (!window.confirm(`Remove ${s.displayName} from the class? Their progress and XP will be permanently deleted.`)) return;
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc("teacher_delete_roster_student", {
        p_profile_id: s.id,
      });
      if (rpcError) throw rpcError;
      setStudents(prev => prev.filter(r => r.id !== s.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete student");
    }
  };

  const handleCopyAll = async () => {
    const withPins = students.filter(s => s.pin);
    if (withPins.length === 0) {
      setError("No PINs to copy.");
      return;
    }
    const lines = [
      `Vocaband — ${className} (${classCode})`,
      `Class join: https://www.vocaband.com/student?class=${classCode}`,
      "",
      "Name\tPIN",
      ...withPins.map(s => `${s.displayName}\t${s.pin}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      setError("Clipboard not available in this browser.");
    }
  };

  const handlePrint = () => {
    const withPins = students.filter(s => s.pin);
    if (withPins.length === 0) {
      setError("Add students first.");
      return;
    }
    const win = window.open("", "_blank", "noopener,width=800,height=900");
    if (!win) {
      setError("Pop-up blocked — allow pop-ups for vocaband.com.");
      return;
    }
    const rows = withPins
      .map(
        s =>
          `<tr><td>${escapeHtml(s.displayName)}</td><td class="pin">${escapeHtml(s.pin || "")}</td></tr>`,
      )
      .join("");
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(className)} — Roster</title>
      <style>
        body { font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; margin: 32px; color: #1c1917; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        .meta { color: #57534e; font-size: 13px; margin-bottom: 16px; }
        .code { font-family: ui-monospace, Menlo, monospace; font-weight: 700; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #e7e5e4; padding: 10px 14px; text-align: left; }
        th { background: #fafaf9; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #57534e; }
        td.pin { font-family: ui-monospace, Menlo, monospace; font-weight: 700; letter-spacing: 0.1em; font-size: 15px; }
        .footer { margin-top: 18px; color: #78716c; font-size: 11px; }
        @media print { body { margin: 16mm; } }
      </style>
    </head><body>
      <h1>${escapeHtml(className)} — Class roster</h1>
      <p class="meta">Class code <span class="code">${escapeHtml(classCode)}</span> · vocaband.com/student?class=${escapeHtml(classCode)}</p>
      <table><thead><tr><th>Student</th><th>PIN</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="footer">Each student logs in at vocaband.com with the class code, picks their name, and types their PIN. Keep this sheet safe.</p>
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
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-stone-200">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
                  <Users size={24} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-stone-900 truncate">Class roster</h2>
                  <p className="text-xs font-bold text-stone-500 mt-0.5 truncate">
                    {className} · <span className="font-mono tracking-wider">{classCode}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                type="button"
                aria-label="Close"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-500 hover:bg-stone-100 transition-colors shrink-0"
                style={{ touchAction: "manipulation" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Add student */}
            <div className="p-6 pb-3">
              <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-stone-500 mb-2">
                Add student
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleAdd();
                  }}
                  placeholder='e.g. "Yossi K" (first name + last initial)'
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
                  Add
                </button>
              </div>
              <p className="text-xs text-stone-500 mt-2">
                A 6-character PIN is generated automatically. The student logs in with the class code + their name + this PIN.
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
                <p className="text-center text-sm text-stone-500 py-8">Loading roster…</p>
              ) : students.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-4xl mb-2">🦊</p>
                  <p className="text-sm font-bold text-stone-700">No students yet</p>
                  <p className="text-xs text-stone-500 mt-1">Add your first student above.</p>
                </div>
              ) : (
                <>
                  {students.length > 1 && (
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={toggleAllReveal}
                        type="button"
                        className="text-xs font-bold text-stone-500 hover:text-stone-900 inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-stone-100 transition-colors"
                        style={{ touchAction: "manipulation" }}
                      >
                        {allRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                        {allRevealed ? "Hide all PINs" : "Show all PINs"}
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
                                ? `Last seen ${new Date(s.lastLoginAt).toLocaleDateString()}`
                                : "Hasn't logged in yet"}
                              {s.xp ? ` · ${s.xp} XP` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
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
                                  Show PIN
                                </button>
                              )
                            ) : (
                              <span className="text-xs text-stone-400 px-3 py-1.5">—</span>
                            )}
                            <button
                              onClick={() => handleResetPin(s)}
                              type="button"
                              title="Reset PIN"
                              aria-label={`Reset PIN for ${s.displayName}`}
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-stone-500 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                              style={{ touchAction: "manipulation" }}
                            >
                              <RefreshCw size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(s)}
                              type="button"
                              title="Remove student"
                              aria-label={`Remove ${s.displayName}`}
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

            {/* Footer */}
            <div className="p-4 border-t border-stone-200 bg-stone-50 rounded-b-3xl flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-stone-500">
                {students.length} {students.length === 1 ? "student" : "students"}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyAll}
                  type="button"
                  disabled={students.length === 0}
                  className="px-3.5 py-2 rounded-lg bg-white border border-stone-200 text-stone-700 text-sm font-bold hover:bg-stone-100 active:scale-95 transition-all inline-flex items-center gap-2 disabled:opacity-40"
                  style={{ touchAction: "manipulation" }}
                  title="Copy roster + PINs to clipboard"
                >
                  {copiedAll ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                  {copiedAll ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={handlePrint}
                  type="button"
                  disabled={students.length === 0}
                  className="px-3.5 py-2 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-sm font-bold hover:opacity-90 active:scale-95 transition-all inline-flex items-center gap-2 disabled:opacity-50"
                  style={{ touchAction: "manipulation" }}
                >
                  <Printer size={15} />
                  Print roster
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
