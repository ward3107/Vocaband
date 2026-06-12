import { useCallback, useEffect, useState } from "react";
import { Search, Download, AlertTriangle, ShieldCheck, Trash2 } from "lucide-react";
import { callAdminRpc, callAdminRpcCached, invalidateAdminRpcCache, type DevUserSearchResult } from "./devShared";

interface Props {
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-rose-500/20 text-rose-200",
  manager: "bg-sky-500/20 text-sky-200",
  teacher: "bg-violet-500/20 text-violet-200",
  student: "bg-emerald-500/20 text-emerald-200",
};

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function DevDataRequestsPanel({ showToast }: Props) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<DevUserSearchResult[]>([]);
  const [selected, setSelected] = useState<DevUserSearchResult | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetch
    if (debounced.trim().length < 2) {
      setResults([]);
      return;
    }
    void callAdminRpcCached<DevUserSearchResult[]>(
      "admin_search_users",
      { p_query: debounced.trim(), p_limit: 20 },
      showToast,
    ).then((res) => setResults(res ?? []));
  }, [debounced, showToast]);

  const onExport = useCallback(async () => {
    if (!selected) return;
    setBusy(true);
    const res = await callAdminRpc<unknown>("admin_export_user_data", { p_uid: selected.uid }, showToast);
    setBusy(false);
    if (res) {
      const safeEmail = (selected.email ?? selected.uid).replace(/[^a-z0-9.@_-]/gi, "_");
      downloadJson(`vocaband-export-${safeEmail}-${Date.now()}.json`, res);
      showToast(`Exported data for ${selected.email ?? selected.uid}`, "success");
      invalidateAdminRpcCache("admin_list_audit_log");
    }
  }, [selected, showToast]);

  const onDelete = useCallback(async () => {
    if (!selected) return;
    setBusy(true);
    const res = await callAdminRpc<{ success?: boolean }>(
      "admin_delete_user_account",
      { p_uid: selected.uid, p_reason: deleteReason.trim() || null },
      showToast,
    );
    setBusy(false);
    if (res) {
      showToast(`Deleted ${selected.email ?? selected.uid}`, "success");
      setSelected(null);
      setConfirmDelete(false);
      setDeleteReason("");
      setResults((prev) => prev.filter((r) => r.uid !== selected.uid));
      invalidateAdminRpcCache("admin_search_users");
      invalidateAdminRpcCache("admin_list_audit_log");
      invalidateAdminRpcCache("admin_dashboard_overview");
    }
  }, [selected, deleteReason, showToast]);

  const canDelete = selected && selected.role !== "admin" && selected.role !== "manager";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5 bg-gradient-to-br from-sky-500/20 via-cyan-500/15 to-teal-500/20 border border-white/10">
        <div className="flex items-center gap-2 text-white font-black text-base mb-2">
          <ShieldCheck className="w-5 h-5 text-sky-300" /> Privacy requests (GDPR Art. 15 + 17)
        </div>
        <p className="text-white/70 text-sm leading-relaxed">
          Find the data subject below, then export (downloads a JSON file) or delete (hard erasure, audit-logged).
          Admin and manager accounts cannot be deleted from here — change role first.
        </p>
      </div>

      <div className="rounded-2xl bg-white/5 border border-white/10 p-2 flex items-center gap-2">
        <Search className="w-5 h-5 text-white/40 ml-2" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setConfirmDelete(false);
          }}
          placeholder="Search by email, name, or uid…"
          className="flex-1 px-2 py-2 bg-transparent text-white placeholder-white/30 text-base focus:outline-none"
        />
      </div>

      {!selected && results.length > 0 && (
        <div className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5">
          {results.map((r) => (
            <button
              key={r.uid}
              type="button"
              onClick={() => setSelected(r)}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className="w-full px-5 py-3 flex items-center gap-3 hover:bg-white/5 text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-bold text-base truncate">{r.display_name || r.email || r.uid}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase ${ROLE_BADGE[r.role] ?? "bg-white/10"}`}>
                    {r.role}
                  </span>
                </div>
                <div className="text-white/50 text-sm truncate">{r.email ?? "—"}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-white font-black text-lg">{selected.display_name || selected.email || selected.uid}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase ${ROLE_BADGE[selected.role] ?? "bg-white/10"}`}>
                {selected.role}
              </span>
            </div>
            <div className="text-white/50 text-sm">{selected.email ?? "—"}</div>
            <div className="text-white/30 text-sm font-mono mt-1">{selected.uid}</div>
            {selected.classes.length > 0 && (
              <div className="text-white/50 text-sm mt-2">
                Owns {selected.classes.length} class{selected.classes.length === 1 ? "" : "es"} · combined{" "}
                {selected.classes.reduce((s, c) => s + c.student_count, 0)} students
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => void onExport()}
              disabled={busy}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className="px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-base flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Export data (JSON)
            </button>

            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setConfirmDelete(false);
                setDeleteReason("");
              }}
              disabled={busy}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-bold text-base"
            >
              Clear
            </button>

            {canDelete && !confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                className="px-5 py-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 font-bold text-base flex items-center gap-2 ml-auto"
              >
                <Trash2 className="w-4 h-4" /> Delete account
              </button>
            )}
          </div>

          {confirmDelete && canDelete && (
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 space-y-3">
              <div className="flex items-start gap-2 text-rose-100">
                <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                <div className="text-base font-bold">
                  Hard erasure — irreversible. Progress, classes, profile, and auth identity will be deleted.
                  Audit log entries are retained 730 days under GDPR Art. 17(3) legal-claims exemption.
                </div>
              </div>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Reason (parent request ticket #, etc.) — recorded in audit log"
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-base focus:outline-none focus:border-rose-400"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDelete(false);
                    setDeleteReason("");
                  }}
                  disabled={busy}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-bold text-base"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete()}
                  disabled={busy}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black text-base flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Confirm delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
