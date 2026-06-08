import { useCallback, useEffect, useState } from "react";
import {
  Search, ChevronRight, Users, FileText, Pencil, KeyRound,
  ArrowLeftRight, Trash2, Check, X, Building2, Clock,
} from "lucide-react";
import {
  callAdminRpc, callAdminRpcCached, invalidateAdminRpcCache,
  type DevClass, type DevUserSearchResult,
} from "./devShared";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

/**
 * Classes tab — the admin CRUD surface for classes that the dashboard never had.
 * Search, then per-class: rename, reset the join code (carries the roster),
 * transfer to another teacher, or hard-delete (cascades assignments/progress).
 * Every mutation runs through an audited admin_* RPC.
 */
export default function DevClassesPanel({ showToast }: Props) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [classes, setClasses] = useState<DevClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Inline rename + transfer field state (per expanded row).
  const [editName, setEditName] = useState<string | null>(null);
  const [transferEmail, setTransferEmail] = useState("");

  // Modal targets.
  const [resetTarget, setResetTarget] = useState<DevClass | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DevClass | null>(null);

  // Bulk selection.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const toggleSelect = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const search = useCallback(async (q: string, force = false) => {
    setLoading(true);
    const res = await callAdminRpcCached<DevClass[]>(
      "admin_list_classes",
      { p_query: q.trim() || null, p_limit: 50 },
      showToast,
      { force },
    );
    setLoading(false);
    setClasses(res ?? []);
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch
    void search(debounced);
  }, [debounced, search]);

  // After any mutation: bust the list + overview KPIs and re-read fresh.
  const afterMutation = useCallback(async () => {
    invalidateAdminRpcCache("admin_list_classes");
    invalidateAdminRpcCache("admin_dashboard_overview");
    await search(debounced, true);
  }, [debounced, search]);

  const rename = useCallback(async (c: DevClass, name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === c.name) { setEditName(null); return; }
    setBusyId(c.id);
    const res = await callAdminRpc<{ success?: boolean }>(
      "admin_rename_class", { p_class_id: c.id, p_name: trimmed }, showToast,
    );
    setBusyId(null);
    if (res?.success) { showToast("Class renamed", "success"); setEditName(null); await afterMutation(); }
  }, [afterMutation, showToast]);

  const resetCode = useCallback(async (c: DevClass) => {
    setBusyId(c.id);
    const res = await callAdminRpc<{ success?: boolean; code?: string; students_moved?: number }>(
      "admin_reset_class_code", { p_class_id: c.id }, showToast,
    );
    setBusyId(null);
    setResetTarget(null);
    if (res?.success) {
      showToast(`New code ${res.code} (${res.students_moved ?? 0} students moved)`, "success");
      await afterMutation();
    }
  }, [afterMutation, showToast]);

  const transfer = useCallback(async (c: DevClass, email: string) => {
    const e = email.trim();
    if (!e) return;
    setBusyId(c.id);
    // Resolve the email to a uid, then transfer. The RPC rejects non-teachers.
    const matches = await callAdminRpc<DevUserSearchResult[]>(
      "admin_search_users", { p_query: e, p_limit: 5 }, showToast,
    );
    const target = (matches ?? []).find((m) => m.role === "teacher" || m.role === "admin");
    if (!target) {
      setBusyId(null);
      showToast("No teacher found for that email", "error");
      return;
    }
    const res = await callAdminRpc<{ success?: boolean }>(
      "admin_transfer_class", { p_class_id: c.id, p_new_teacher_uid: target.uid }, showToast,
    );
    setBusyId(null);
    if (res?.success) {
      showToast(`Transferred to ${target.email ?? target.uid}`, "success");
      setTransferEmail("");
      invalidateAdminRpcCache("admin_search_users");
      await afterMutation();
    }
  }, [afterMutation, showToast]);

  const del = useCallback(async (c: DevClass, reason: string) => {
    setBusyId(c.id);
    const res = await callAdminRpc<{ success?: boolean }>(
      "admin_delete_class", { p_class_id: c.id, p_reason: reason || null }, showToast,
    );
    setBusyId(null);
    setDeleteTarget(null);
    if (res?.success) {
      showToast(`Deleted "${c.name}"`, "success");
      setClasses((prev) => prev.filter((x) => x.id !== c.id));
      invalidateAdminRpcCache("admin_list_classes");
      invalidateAdminRpcCache("admin_dashboard_overview");
    }
  }, [showToast]);

  // Bulk delete — one audited admin_delete_class per selected class.
  const bulkDelete = useCallback(async (reason: string) => {
    const ids = [...selected];
    setBulkBusy(true);
    let ok = 0, fail = 0;
    for (const id of ids) {
      const res = await callAdminRpc<{ success?: boolean }>(
        "admin_delete_class", { p_class_id: id, p_reason: reason || null }, showToast,
      );
      if (res?.success) ok += 1; else fail += 1;
    }
    setBulkBusy(false);
    setBulkOpen(false);
    setSelected(new Set());
    showToast(fail ? `Deleted ${ok}, ${fail} failed` : `Deleted ${ok} class${ok === 1 ? "" : "es"}`, fail ? "error" : "success");
    invalidateAdminRpcCache("admin_list_classes");
    invalidateAdminRpcCache("admin_dashboard_overview");
    await search(debounced, true);
  }, [selected, debounced, search, showToast]);

  const selectedCount = selected.size;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white/5 border border-white/10 p-2 flex items-center gap-2">
        <Search className="w-5 h-5 text-white/40 ml-2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search classes by name, 6-char code, or teacher…"
          className="flex-1 px-2 py-2 bg-transparent text-white placeholder-white/30 text-base focus:outline-none"
        />
        {loading && <span className="text-white/40 text-sm pr-2">loading…</span>}
      </div>

      {!loading && classes.length === 0 && (
        <p className="text-white/40 text-sm">{query.trim() ? "No matching classes." : "No classes yet."}</p>
      )}

      {selectedCount > 0 && (
        <div className="sticky top-2 z-10 flex items-center gap-3 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/30 px-4 py-2.5">
          <span className="text-white font-black text-base">{selectedCount} selected</span>
          <button type="button" onClick={() => setSelected(new Set())} className="text-white/80 hover:text-white text-sm font-bold">Clear</button>
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-white font-black text-base"
          >
            <Trash2 className="w-4 h-4" /> Delete {selectedCount}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {classes.map((c) => {
          const isOpen = expanded === c.id;
          const busy = busyId === c.id;
          const owner = c.teacher_name || c.teacher_email || (c.pending_teacher_email ? null : "unclaimed");
          return (
            <div key={c.id} className={`rounded-2xl bg-white/5 border overflow-hidden ${selected.has(c.id) ? "border-indigo-400/60" : "border-white/10"}`}>
              <div className="flex items-center">
              <label className="pl-4 pr-1 self-stretch flex items-center cursor-pointer" style={{ touchAction: "manipulation" }}>
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggleSelect(c.id)}
                  className="w-4 h-4 rounded border-white/20 bg-white/10 accent-indigo-500"
                  aria-label={`Select ${c.name}`}
                />
              </label>
              <button
                type="button"
                onClick={() => { setExpanded(isOpen ? null : c.id); setEditName(null); setTransferEmail(""); }}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className="flex-1 min-w-0 pl-1 pr-5 py-3 flex items-center gap-3 hover:bg-white/5 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold text-base truncate">{c.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-black font-mono tracking-wider bg-indigo-500/20 text-indigo-200">
                      {c.code}
                    </span>
                  </div>
                  <div className="text-white/50 text-sm mt-0.5 flex items-center gap-3 flex-wrap">
                    {owner
                      ? <span className="truncate">{owner}</span>
                      : <span className="inline-flex items-center gap-1 text-amber-300/80"><Clock className="w-3.5 h-3.5" /> pending {c.pending_teacher_email}</span>}
                    <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {c.student_count}</span>
                    <span className="inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {c.assignment_count}</span>
                    {c.school_name && <span className="inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {c.school_name}</span>}
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-white/30 transition-transform ${isOpen ? "rotate-90" : ""}`} />
              </button>
              </div>

              {isOpen && (
                <div className="border-t border-white/5 px-5 py-4 space-y-4">
                  {/* Rename */}
                  {editName !== null ? (
                    <div className="flex gap-2">
                      <input
                        value={editName}
                        autoFocus
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") void rename(c, editName); if (e.key === "Escape") setEditName(null); }}
                        className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-base focus:outline-none focus:border-indigo-400"
                      />
                      <button type="button" disabled={busy} onClick={() => void rename(c, editName)}
                        className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50" aria-label="Save name">
                        <Check className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setEditName(null)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60" aria-label="Cancel rename">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setEditName(c.name)} disabled={busy}
                        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-sm font-bold flex items-center gap-1.5 disabled:opacity-50">
                        <Pencil className="w-3.5 h-3.5" /> Rename
                      </button>
                      <button type="button" onClick={() => setResetTarget(c)} disabled={busy}
                        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                        className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 text-sm font-bold flex items-center gap-1.5 disabled:opacity-50">
                        <KeyRound className="w-3.5 h-3.5" /> Reset code
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(c)} disabled={busy}
                        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                        className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 text-sm font-bold flex items-center gap-1.5 ml-auto disabled:opacity-50">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  )}

                  {/* Transfer to another teacher */}
                  <div>
                    <div className="text-white/50 text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5" /> Transfer to teacher
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={transferEmail}
                        onChange={(e) => setTransferEmail(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") void transfer(c, transferEmail); }}
                        placeholder="new-teacher@school.edu"
                        className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-base focus:outline-none focus:border-indigo-400"
                      />
                      <button type="button" disabled={busy || !transferEmail.trim()} onClick={() => void transfer(c, transferEmail)}
                        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base disabled:opacity-40">
                        Transfer
                      </button>
                    </div>
                  </div>

                  <div className="text-white/30 text-xs font-mono truncate">id: {c.id}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reset-code confirm — warns that the old code stops working. */}
      <ConfirmDialog
        open={!!resetTarget}
        tone="warning"
        title="Reset class code?"
        body={resetTarget && (
          <>The current code <strong className="text-white font-mono">{resetTarget.code}</strong> stops working immediately.
          The {resetTarget.student_count} roster student(s) are carried to the new code, but anyone who saved the old one
          will need the new code to join.</>
        )}
        confirmLabel="Reset code"
        busy={!!resetTarget && busyId === resetTarget.id}
        onConfirm={() => resetTarget && void resetCode(resetTarget)}
        onCancel={() => setResetTarget(null)}
      />

      {/* Delete confirm — typed-code guard + audited reason. */}
      <ConfirmDialog
        open={!!deleteTarget}
        tone="danger"
        title="Delete this class?"
        body={deleteTarget && (
          <>Permanently deletes <strong className="text-white">{deleteTarget.name}</strong> along with its{" "}
          <strong className="text-white">{deleteTarget.assignment_count}</strong> assignment(s), all their gradebook progress,
          and detaches its <strong className="text-white">{deleteTarget.student_count}</strong> student(s). This cannot be undone.</>
        )}
        confirmPhrase={deleteTarget?.code}
        reason={{ placeholder: "Reason (ticket #, duplicate, test class…) — audit-logged", required: false }}
        confirmLabel="Delete class"
        busy={!!deleteTarget && busyId === deleteTarget.id}
        onConfirm={(reason) => deleteTarget && void del(deleteTarget, reason)}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Bulk delete — typed DELETE guard since it spans many classes. */}
      <ConfirmDialog
        open={bulkOpen}
        tone="danger"
        title={`Delete ${selectedCount} classes?`}
        body={(() => {
          const sel = classes.filter((c) => selected.has(c.id));
          const students = sel.reduce((s, c) => s + c.student_count, 0);
          const assignments = sel.reduce((s, c) => s + c.assignment_count, 0);
          return <>Permanently deletes <strong className="text-white">{selectedCount}</strong> classes,
          their <strong className="text-white">{assignments}</strong> assignment(s) + gradebook progress, and detaches{" "}
          <strong className="text-white">{students}</strong> student(s). This cannot be undone.</>;
        })()}
        confirmPhrase="DELETE"
        reason={{ placeholder: "Reason (cleanup, test classes…) — audit-logged on each", required: false }}
        confirmLabel={`Delete ${selectedCount}`}
        busy={bulkBusy}
        onConfirm={(reason) => void bulkDelete(reason)}
        onCancel={() => setBulkOpen(false)}
      />
    </div>
  );
}
